from flask import Blueprint, request, jsonify, session, g
from functools import wraps
from models.user import User, UserStatus
from models.log import Log, LogLevel, LogAction
from database import db
from datetime import datetime
import bcrypt

auth_bp = Blueprint('auth_old', __name__, url_prefix='/api/auth_old')

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
            user_id=user.id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict(),
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and start a session"""
    try:
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == data['username']) | (User.email == data['username'])
        ).first()
        
        if not user or not user.check_password(data['password']):
            # Log failed login attempt
            Log.create_log(
                level=LogLevel.WARNING,
                action=LogAction.LOGIN,
                description=f"Failed login attempt for {data['username']}",
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if user.status != UserStatus.ACTIVE:
            return jsonify({'error': 'Account is suspended or inactive'}), 403
        
        # Update user's last seen and online status
        user.last_seen = datetime.utcnow()
        user.is_online = True
        db.session.commit()

        # Set user_id in session
        session['user_id'] = user.id
        session.permanent = True
        
        # Log successful login
        Log.create_log(
            level=LogLevel.INFO,
            action=LogAction.LOGIN,
            description=f"User {user.username} logged in",
            user_id=user.id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout user and clear session"""
    try:
        user_id = session.get('user_id')
        user = User.query.get(user_id)
        if user:
            user.is_online = False
            user.last_seen = datetime.utcnow()
            db.session.commit()
            
            # Log logout
            Log.create_log(
                level=LogLevel.INFO,
                action=LogAction.LOGOUT,
                description=f"User {user.username} logged out",
                user_id=user.id,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
        
        session.clear()
        
        return jsonify({'message': 'Logout successful'}), 200
        
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
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500