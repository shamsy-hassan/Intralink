from flask import Blueprint, request, jsonify, session, g
from functools import wraps
from models.user import User, UserStatus
from models.log import Log, LogLevel, LogAction
from database import db
from datetime import datetime
import bcrypt

auth_bp = Blueprint('auth', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.before_app_request
def load_logged_in_user():
    user_id = session.get('user_id')
    if user_id is None:
        g.user = None
    else:
        g.user = User.query.get(user_id)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        user = User(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            department_id=data.get('department_id'),
            role=data.get('role', 'staff')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Log the registration
        Log.create_log(
            level=LogLevel.INFO,
            action=LogAction.CREATE,
            description=f"User {user.username} registered",
            user_id=user.id
        )
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.get_full_name(),
                'role': user.role.value
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login and create a user session"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if user is active
        if user.status != UserStatus.ACTIVE:
            return jsonify({'error': 'Account is not active'}), 401
        
        # Set user_id in session
        session['user_id'] = user.id
        session.permanent = True

        # Update user's last login
        user.last_seen = datetime.utcnow()
        db.session.commit()
        
        # Log the login
        Log.create_log(
            level=LogLevel.INFO,
            action=LogAction.LOGIN,
            description=f"User {user.username} logged in",
            user_id=user.id
        )
        
        # Create response
        response_data = {
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': user.get_full_name(),
                'role': user.role.value,
                'status': user.status.value,
                'department_id': user.department_id,
                'department_name': user.department.name if user.department else None,
                'last_seen': user.last_seen.isoformat() if user.last_seen else None,
                'is_online': True
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout and clear session"""
    try:
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        if user:
            Log.create_log(
                level=LogLevel.INFO,
                action=LogAction.LOGOUT,
                description=f"User {user.username} logged out",
                user_id=user.id
            )

        session.clear()
        
        return jsonify({'message': 'Logged out successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user_info():
    """Get current user information"""
    try:
        user = g.user
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': user.get_full_name(),
                'employee_id': user.employee_id,
                'role': user.role.value,
                'status': user.status.value,
                'department_id': user.department_id,
                'department_name': user.department.name if user.department else None,
                'profile_picture': user.profile_picture,
                'last_seen': user.last_seen.isoformat() if user.last_seen else None,
                'created_at': user.created_at.isoformat(),
                'is_online': True
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
