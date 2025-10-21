from database import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from enum import Enum

class UserRole(Enum):
    ADMIN = "admin"
    HR = "hr"
    STAFF = "staff"

class UserStatus(Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    employee_id = db.Column(db.String(50), unique=True, nullable=True, index=True)  # Work ID
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.STAFF)
    status = db.Column(db.Enum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    profile_picture = db.Column(db.String(255), nullable=True)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    is_online = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = db.relationship('Department', back_populates='users')
    sent_messages = db.relationship('Message', foreign_keys='Message.sender_id', back_populates='sender')
    notifications = db.relationship('Notification', back_populates='user')
    logs = db.relationship('Log', back_populates='user')
    
    def set_password(self, password):
        """Hash and set the user's password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches the hash"""
        return check_password_hash(self.password_hash, password)
    
    def get_full_name(self):
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}"
    
    def to_dict(self, include_sensitive=False):
        """Convert user to dictionary"""
        user_dict = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.get_full_name(),
            'employee_id': self.employee_id,
            'role': self.role.value,
            'status': self.status.value,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'profile_picture': self.profile_picture,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'is_online': self.is_online,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_sensitive:
            user_dict['updated_at'] = self.updated_at.isoformat() if self.updated_at else None
        
        return user_dict
    
    def __repr__(self):
        return f'<User {self.username}>'