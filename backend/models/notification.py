from database import db
from datetime import datetime
from enum import Enum

class NotificationType(Enum):
    MESSAGE = "message"
    ALERT = "alert"
    MENTION = "mention"
    SYSTEM = "system"

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.Enum(NotificationType), nullable=False)
    
    # Target user
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Source information
    source_id = db.Column(db.Integer, nullable=True)  # ID of the source (message_id, alert_id, etc.)
    source_type = db.Column(db.String(50), nullable=True)  # Type of source (message, alert, etc.)
    
    # Notification metadata
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = db.relationship('User', back_populates='notifications')
    
    def mark_as_read(self):
        """Mark notification as read"""
        self.is_read = True
        self.read_at = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self):
        """Convert notification to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'notification_type': self.notification_type.value,
            'user_id': self.user_id,
            'source_id': self.source_id,
            'source_type': self.source_type,
            'is_read': self.is_read,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Notification {self.id}: {self.title}>'