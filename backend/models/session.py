from database import db
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import secrets
import hmac

class SessionStatus(Enum):
    ACTIVE = 'active'
    REVOKED = 'revoked'
    EXPIRED = 'expired'

class DeviceType(Enum):
    DESKTOP = 'desktop'
    MOBILE = 'mobile'
    TABLET = 'tablet'
    UNKNOWN = 'unknown'

class UserSession(db.Model):
    __tablename__ = 'user_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Device identification
    device_id = db.Column(db.String(64), nullable=False, index=True)  # Unique device fingerprint
    device_name = db.Column(db.String(200), nullable=True)  # User-friendly device name
    device_type = db.Column(db.Enum(DeviceType), nullable=False, default=DeviceType.UNKNOWN)
    
    # Browser/Client info
    user_agent = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)  # Support IPv6
    location = db.Column(db.String(100), nullable=True)  # City, Country (optional)
    
    # Security
    refresh_token_hash = db.Column(db.String(128), nullable=False, index=True)
    session_secret = db.Column(db.String(64), nullable=False)  # Additional security layer
    status = db.Column(db.Enum(SessionStatus), nullable=False, default=SessionStatus.ACTIVE)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref='sessions')
    
    # Composite index for efficient lookups
    __table_args__ = (
        db.Index('idx_device_user', 'device_id', 'user_id'),
        db.Index('idx_token_active', 'refresh_token_hash', 'status'),
    )
    
    @classmethod
    def create_session(cls, user_id, device_id, device_info=None, ip_address=None, 
                      user_agent=None, expires_days=30):
        """Create a new user session with secure refresh token"""
        # Generate secure refresh token
        refresh_token = secrets.token_urlsafe(64)
        session_secret = secrets.token_hex(32)
        
        # Hash the refresh token for storage
        token_hash = cls._hash_refresh_token(refresh_token, session_secret)
        
        # Determine device type from user agent
        device_type = cls._detect_device_type(user_agent)
        
        # Set expiration
        expires_at = datetime.utcnow() + timedelta(days=expires_days)
        
        session = cls(
            user_id=user_id,
            device_id=device_id,
            device_name=device_info.get('name') if device_info else None,
            device_type=device_type,
            user_agent=user_agent,
            ip_address=ip_address,
            location=device_info.get('location') if device_info else None,
            refresh_token_hash=token_hash,
            session_secret=session_secret,
            expires_at=expires_at
        )
        
        db.session.add(session)
        db.session.commit()
        
        return session, refresh_token
    
    @classmethod
    def verify_refresh_token(cls, refresh_token, device_id):
        """Verify refresh token and return associated session"""
        if not refresh_token or not device_id:
            return None
            
        # Find active sessions for this device
        sessions = cls.query.filter_by(
            device_id=device_id,
            status=SessionStatus.ACTIVE
        ).filter(
            cls.expires_at > datetime.utcnow()
        ).all()
        
        # Check each session to find matching token
        for session in sessions:
            if cls._verify_refresh_token(refresh_token, session.refresh_token_hash, session.session_secret):
                # Update last used timestamp
                session.last_used_at = datetime.utcnow()
                db.session.commit()
                return session
                
        return None
    
    @classmethod
    def revoke_session(cls, session_id, user_id=None):
        """Revoke a specific session"""
        query = cls.query.filter_by(id=session_id)
        if user_id:
            query = query.filter_by(user_id=user_id)
            
        session = query.first()
        if session:
            session.status = SessionStatus.REVOKED
            session.revoked_at = datetime.utcnow()
            db.session.commit()
            return True
        return False
    
    @classmethod
    def revoke_all_user_sessions(cls, user_id, except_session_id=None):
        """Revoke all sessions for a user, optionally except one"""
        query = cls.query.filter_by(user_id=user_id, status=SessionStatus.ACTIVE)
        if except_session_id:
            query = query.filter(cls.id != except_session_id)
            
        sessions = query.all()
        for session in sessions:
            session.status = SessionStatus.REVOKED
            session.revoked_at = datetime.utcnow()
            
        db.session.commit()
        return len(sessions)
    
    @classmethod
    def cleanup_expired_sessions(cls):
        """Clean up expired sessions (run as background task)"""
        expired_sessions = cls.query.filter(
            cls.expires_at < datetime.utcnow(),
            cls.status == SessionStatus.ACTIVE
        ).all()
        
        for session in expired_sessions:
            session.status = SessionStatus.EXPIRED
            
        db.session.commit()
        return len(expired_sessions)
    
    @classmethod
    def _hash_refresh_token(cls, refresh_token, session_secret):
        """Create secure hash of refresh token with session secret"""
        combined = f"{refresh_token}:{session_secret}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    @classmethod
    def _verify_refresh_token(cls, refresh_token, stored_hash, session_secret):
        """Verify refresh token against stored hash"""
        computed_hash = cls._hash_refresh_token(refresh_token, session_secret)
        return hmac.compare_digest(computed_hash, stored_hash)
    
    @classmethod
    def _detect_device_type(cls, user_agent):
        """Detect device type from user agent string"""
        if not user_agent:
            return DeviceType.UNKNOWN
            
        user_agent_lower = user_agent.lower()
        
        # Mobile devices
        mobile_indicators = ['mobile', 'android', 'iphone', 'ipod', 'blackberry', 'windows phone']
        if any(indicator in user_agent_lower for indicator in mobile_indicators):
            return DeviceType.MOBILE
            
        # Tablets
        tablet_indicators = ['tablet', 'ipad']
        if any(indicator in user_agent_lower for indicator in tablet_indicators):
            return DeviceType.TABLET
            
        # Default to desktop
        return DeviceType.DESKTOP
    
    def update_activity(self, ip_address=None):
        """Update session activity"""
        self.last_used_at = datetime.utcnow()
        if ip_address:
            self.ip_address = ip_address
        db.session.commit()
    
    def is_valid(self):
        """Check if session is valid and not expired"""
        return (
            self.status == SessionStatus.ACTIVE and
            self.expires_at > datetime.utcnow()
        )
    
    def extend_expiration(self, days=30):
        """Extend session expiration"""
        if self.is_valid():
            self.expires_at = datetime.utcnow() + timedelta(days=days)
            db.session.commit()
            return True
        return False
    
    def to_dict(self, include_sensitive=False):
        """Convert session to dictionary"""
        data = {
            'id': self.id,
            'device_id': self.device_id,
            'device_name': self.device_name,
            'device_type': self.device_type.value,
            'ip_address': self.ip_address,
            'location': self.location,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'last_used_at': self.last_used_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'is_current': False,  # To be set by caller
            'is_valid': self.is_valid()
        }
        
        if include_sensitive:
            data.update({
                'user_agent': self.user_agent,
                'session_secret': self.session_secret
            })
            
        return data