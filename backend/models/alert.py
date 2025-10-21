from database import db
from datetime import datetime
from enum import Enum

class AlertType(Enum):
    EMERGENCY = "emergency"
    WARNING = "warning"
    INFO = "info"
    MAINTENANCE = "maintenance"

class AlertScope(Enum):
    GLOBAL = "global"           # Company-wide alert
    DEPARTMENT = "department"   # Department-specific alert
    INDIVIDUAL = "individual"   # Individual user alert

class AlertStatus(Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENT = "sent"
    CANCELLED = "cancelled"

class Alert(db.Model):
    __tablename__ = 'alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    alert_type = db.Column(db.Enum(AlertType), nullable=False, default=AlertType.INFO)
    scope = db.Column(db.Enum(AlertScope), nullable=False, default=AlertScope.GLOBAL)
    status = db.Column(db.Enum(AlertStatus), nullable=False, default=AlertStatus.DRAFT)
    
    # Sender information
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Target information (based on scope)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    target_user_ids = db.Column(db.JSON, nullable=True)  # For individual alerts
    
    # Scheduling
    scheduled_at = db.Column(db.DateTime, nullable=True)
    sent_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    # Alert metadata
    is_urgent = db.Column(db.Boolean, default=False)
    requires_acknowledgment = db.Column(db.Boolean, default=False)
    acknowledged_by = db.Column(db.JSON, default=list)  # User IDs who acknowledged
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id])
    department = db.relationship('Department', foreign_keys=[department_id])
    
    def acknowledge(self, user_id):
        """Mark alert as acknowledged by a user"""
        if self.acknowledged_by is None:
            self.acknowledged_by = []
        
        if user_id not in self.acknowledged_by:
            self.acknowledged_by.append(user_id)
            db.session.commit()
    
    def is_acknowledged_by_user(self, user_id):
        """Check if alert is acknowledged by a specific user"""
        return user_id in (self.acknowledged_by or [])
    
    def get_target_user_count(self):
        """Get the number of target users for this alert"""
        if self.scope == AlertScope.GLOBAL:
            from models.user import User
            return User.query.filter_by(status='active').count()
        elif self.scope == AlertScope.DEPARTMENT and self.department_id:
            from models.user import User
            return User.query.filter_by(department_id=self.department_id, status='active').count()
        elif self.scope == AlertScope.INDIVIDUAL and self.target_user_ids:
            return len(self.target_user_ids)
        return 0
    
    def to_dict(self, current_user_id=None):
        """Convert alert to dictionary"""
        alert_dict = {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'alert_type': self.alert_type.value,
            'scope': self.scope.value,
            'status': self.status.value,
            'sender_id': self.sender_id,
            'sender': self.sender.to_dict() if self.sender else None,
            'department_id': self.department_id,
            'target_user_ids': self.target_user_ids,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_urgent': self.is_urgent,
            'requires_acknowledgment': self.requires_acknowledgment,
            'acknowledgment_count': len(self.acknowledged_by) if self.acknowledged_by else 0,
            'target_user_count': self.get_target_user_count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if current_user_id:
            alert_dict['is_acknowledged'] = self.is_acknowledged_by_user(current_user_id)
        
        return alert_dict
    
    def __repr__(self):
        return f'<Alert {self.id}: {self.title}>'