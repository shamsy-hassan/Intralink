from models.user import User, UserRole, UserStatus
from models.department import Department
from models.message import Message, MessageType, MessageScope
from models.alert import Alert, AlertType, AlertScope, AlertStatus
from app import db
from datetime import datetime, timedelta

def create_seed_data():
    """Create initial seed data for development"""
    
    # Check if data already exists
    if User.query.first():
        return
    
    print("Creating seed data...")
    
    # Create departments
    departments = [
        Department(
            name="Administration",
            description="Administrative and management team",
            color="#3B82F6"
        ),
        Department(
            name="Human Resources",
            description="HR and employee relations",
            color="#10B981"
        ),
        Department(
            name="Engineering",
            description="Software development and technical team",
            color="#8B5CF6"
        ),
        Department(
            name="Marketing",
            description="Marketing and communications",
            color="#F59E0B"
        ),
        Department(
            name="Sales",
            description="Sales and business development",
            color="#EF4444"
        )
    ]
    
    for dept in departments:
        db.session.add(dept)
    
    db.session.commit()
    
    # Create users
    admin_dept = Department.query.filter_by(name="Administration").first()
    hr_dept = Department.query.filter_by(name="Human Resources").first()
    eng_dept = Department.query.filter_by(name="Engineering").first()
    marketing_dept = Department.query.filter_by(name="Marketing").first()
    sales_dept = Department.query.filter_by(name="Sales").first()
    
    users = [
        {
            'username': 'admin',
            'email': 'admin@intralink.com',
            'password': 'admin123',
            'first_name': 'System',
            'last_name': 'Administrator',
            'employee_id': 'ADM001',
            'role': UserRole.ADMIN,
            'department_id': admin_dept.id,
            'status': UserStatus.ACTIVE
        },
        {
            'username': 'hr_manager',
            'email': 'hr@intralink.com',
            'password': 'hr123',
            'first_name': 'Sarah',
            'last_name': 'Johnson',
            'employee_id': 'HR001',
            'role': UserRole.HR,
            'department_id': hr_dept.id,
            'status': UserStatus.ACTIVE
        },
        {
            'username': 'john_doe',
            'email': 'john.doe@intralink.com',
            'password': 'staff123',
            'first_name': 'John',
            'last_name': 'Doe',
            'employee_id': 'ENG001',
            'role': UserRole.STAFF,
            'department_id': eng_dept.id,
            'status': UserStatus.ACTIVE
        },
        {
            'username': 'jane_smith',
            'email': 'jane.smith@intralink.com',
            'password': 'staff123',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'employee_id': 'MKT001',
            'role': UserRole.STAFF,
            'department_id': marketing_dept.id,
            'status': UserStatus.ACTIVE
        },
        {
            'username': 'mike_wilson',
            'email': 'mike.wilson@intralink.com',
            'password': 'staff123',
            'first_name': 'Mike',
            'last_name': 'Wilson',
            'employee_id': 'SAL001',
            'role': UserRole.STAFF,
            'department_id': sales_dept.id,
            'status': UserStatus.ACTIVE
        },
        {
            'username': 'emily_brown',
            'email': 'emily.brown@intralink.com',
            'password': 'staff123',
            'first_name': 'Emily',
            'last_name': 'Brown',
            'employee_id': 'ENG002',
            'role': UserRole.STAFF,
            'department_id': eng_dept.id,
            'status': UserStatus.ACTIVE
        }
    ]
    
    user_objects = []
    for user_data in users:
        user = User(
            username=user_data['username'],
            email=user_data['email'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            employee_id=user_data['employee_id'],
            role=user_data['role'],
            department_id=user_data['department_id'],
            status=user_data['status']
        )
        user.set_password(user_data['password'])
        user_objects.append(user)
        db.session.add(user)
    
    db.session.commit()
    
    # Create sample messages
    admin_user = User.query.filter_by(username='admin').first()
    hr_user = User.query.filter_by(username='hr_manager').first()
    john_user = User.query.filter_by(username='john_doe').first()
    jane_user = User.query.filter_by(username='jane_smith').first()
    
    messages = [
        # Broadcast message
        Message(
            content="Welcome to IntraLink! This is your new internal communication platform.",
            message_type=MessageType.TEXT,
            scope=MessageScope.BROADCAST,
            sender_id=admin_user.id,
            created_at=datetime.utcnow() - timedelta(days=2)
        ),
        # Department message
        Message(
            content="Engineering team meeting scheduled for tomorrow at 2 PM.",
            message_type=MessageType.TEXT,
            scope=MessageScope.DEPARTMENT,
            sender_id=john_user.id,
            department_id=eng_dept.id,
            created_at=datetime.utcnow() - timedelta(hours=12)
        ),
        # Direct message
        Message(
            content="Hi! How are you settling into the new role?",
            message_type=MessageType.TEXT,
            scope=MessageScope.DIRECT,
            sender_id=hr_user.id,
            recipient_id=jane_user.id,
            created_at=datetime.utcnow() - timedelta(hours=6)
        ),
        Message(
            content="Great, thanks for asking! The team has been very welcoming.",
            message_type=MessageType.TEXT,
            scope=MessageScope.DIRECT,
            sender_id=jane_user.id,
            recipient_id=hr_user.id,
            created_at=datetime.utcnow() - timedelta(hours=5)
        )
    ]
    
    for message in messages:
        db.session.add(message)
    
    # Create sample alerts
    alerts = [
        Alert(
            title="System Maintenance Notice",
            message="The system will undergo maintenance this weekend from 2 AM to 6 AM. Please save your work before logging out on Friday.",
            alert_type=AlertType.MAINTENANCE,
            scope=AlertScope.GLOBAL,
            status=AlertStatus.SENT,
            sender_id=admin_user.id,
            sent_at=datetime.utcnow() - timedelta(days=1),
            expires_at=datetime.utcnow() + timedelta(days=2),
            requires_acknowledgment=True
        ),
        Alert(
            title="New Employee Orientation",
            message="Please join us in welcoming our new team members this Friday at 10 AM in the conference room.",
            alert_type=AlertType.INFO,
            scope=AlertScope.DEPARTMENT,
            status=AlertStatus.SENT,
            sender_id=hr_user.id,
            department_id=hr_dept.id,
            sent_at=datetime.utcnow() - timedelta(hours=8),
            expires_at=datetime.utcnow() + timedelta(days=1)
        )
    ]
    
    for alert in alerts:
        db.session.add(alert)
    
    db.session.commit()
    
    print("Seed data created successfully!")
    print("Default users:")
    print("- Admin: admin / admin123")
    print("- HR Manager: hr_manager / hr123")
    print("- Staff: john_doe / staff123")
    print("- Staff: jane_smith / staff123")
    print("- Staff: mike_wilson / staff123")
    print("- Staff: emily_brown / staff123")