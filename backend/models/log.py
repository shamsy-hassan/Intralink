from database import db
from datetime import datetime
from enum import Enum

class LogLevel(Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class LogAction(Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    SEND_MESSAGE = "send_message"
    SEND_ALERT = "send_alert"
    VIEW = "view"
    DOWNLOAD = "download"
    AUTH_LOGIN = "auth_login"
    USER_REGISTERED = "user_registered"

class Log(db.Model):
    __tablename__ = 'logs'
    
    id = db.Column(db.Integer, primary_key=True)
    level = db.Column(db.Enum(LogLevel), nullable=False, default=LogLevel.INFO)
    action = db.Column(db.Enum(LogAction), nullable=False)
    description = db.Column(db.Text, nullable=False)
    
    # User information
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Request information
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 support
    user_agent = db.Column(db.Text, nullable=True)
    
    # Additional metadata
    extra_data = db.Column(db.JSON, nullable=True)  # Additional context data
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = db.relationship('User', back_populates='logs')
    
    def to_dict(self):
        """Convert log to dictionary"""
        return {
            'id': self.id,
            'level': self.level.value,
            'action': self.action.value,
            'description': self.description,
            'user_id': self.user_id,
            'user': self.user.to_dict() if self.user else None,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'extra_data': self.extra_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def create_log(level, action, description, user_id=None, ip_address=None, user_agent=None, extra_data=None):
        """Create a new log entry"""
        log = Log(
            level=level,
            action=action,
            description=description,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data
        )
        db.session.add(log)
        db.session.commit()
        return log
    
    def __repr__(self):
        return f'<Log {self.id}: {self.action.value} - {self.description[:50]}...>'