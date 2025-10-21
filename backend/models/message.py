from database import db
from datetime import datetime
from enum import Enum

class MessageType(Enum):
    TEXT = "text"
    FILE = "file"
    IMAGE = "image"
    SYSTEM = "system"

class MessageScope(Enum):
    DIRECT = "direct"           # Direct message between users
    DEPARTMENT = "department"   # Department group message
    BROADCAST = "broadcast"     # Company-wide broadcast

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.Enum(MessageType), nullable=False, default=MessageType.TEXT)
    scope = db.Column(db.Enum(MessageScope), nullable=False, default=MessageScope.DIRECT)
    
    # Sender information
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Target information (based on scope)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # For direct messages
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)  # For department messages
    
    # File information (for file/image messages)
    file_url = db.Column(db.String(255), nullable=True)
    file_name = db.Column(db.String(255), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    
    # Message metadata
    is_edited = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    read_by = db.Column(db.JSON, default=list)  # List of user IDs who have read the message
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], back_populates='sent_messages')
    recipient = db.relationship('User', foreign_keys=[recipient_id])
    department = db.relationship('Department', back_populates='messages')
    
    def mark_as_read(self, user_id):
        """Mark message as read by a specific user"""
        if self.read_by is None:
            self.read_by = []
        
        if user_id not in self.read_by:
            self.read_by.append(user_id)
            db.session.commit()
    
    def is_read_by_user(self, user_id):
        """Check if message is read by a specific user"""
        return user_id in (self.read_by or [])
    
    def to_dict(self, current_user_id=None):
        """Convert message to dictionary"""
        message_dict = {
            'id': self.id,
            'content': self.content if not self.is_deleted else '[Message deleted]',
            'message_type': self.message_type.value,
            'scope': self.scope.value,
            'sender_id': self.sender_id,
            'sender': self.sender.to_dict() if self.sender else None,
            'recipient_id': self.recipient_id,
            'department_id': self.department_id,
            'file_url': self.file_url,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'is_edited': self.is_edited,
            'is_deleted': self.is_deleted,
            'read_count': len(self.read_by) if self.read_by else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if current_user_id:
            message_dict['is_read'] = self.is_read_by_user(current_user_id)
        
        return message_dict
    
    def __repr__(self):
        return f'<Message {self.id}: {self.content[:50]}...>'