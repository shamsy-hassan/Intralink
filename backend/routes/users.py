from flask import Blueprint, request, jsonify, g
from routes.auth import login_required
from models.user import User, UserRole, UserStatus
from models.log import Log, LogLevel, LogAction
from database import db
from functools import wraps

users_bp = Blueprint('users', __name__, url_prefix='/api/users')

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = g.user
        if not user or user.role not in [UserRole.ADMIN, UserRole.HR]:
            return jsonify({'error': 'Admin or HR access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@users_bp.route('/', methods=['GET'])
@login_required
@admin_required
def get_users():
    """Get all users with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        department_id = request.args.get('department_id', type=int)
        role = request.args.get('role')
        status = request.args.get('status')
        search = request.args.get('search', '')
        
        query = User.query
        
        # Apply filters
        if department_id:
            query = query.filter(User.department_id == department_id)
        if role:
            query = query.filter(User.role == role)
        if status:
            query = query.filter(User.status == status)
        if search:
            query = query.filter(
                (User.first_name.contains(search)) |
                (User.last_name.contains(search)) |
                (User.username.contains(search)) |
                (User.email.contains(search))
            )
        
        # Paginate
        users = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'users': [user.to_dict() for user in users.items],
            'total': users.total,
            'pages': users.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<int:user_id>', methods=['GET'])
@login_required
def get_user(user_id):
    """Get specific user by ID"""
    try:
        current_user = g.user
        
        # Users can view their own profile, admins can view any profile
        if current_user.id != user_id and current_user.role not in [UserRole.ADMIN, UserRole.HR]:
            return jsonify({'error': 'Access denied'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    """Update user information"""
    try:
        current_user = g.user
        
        # Users can update their own profile, admins can update any profile
        if current_user.id != user_id and current_user.role not in [UserRole.ADMIN, UserRole.HR]:
            return jsonify({'error': 'Access denied'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update allowed fields
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            user.email = data['email']
        if 'department_id' in data:
            user.department_id = data['department_id']
        
        # Only admins can update role and status
        if current_user.role in [UserRole.ADMIN, UserRole.HR]:
            if 'role' in data:
                user.role = UserRole(data['role'])
            if 'status' in data:
                user.status = UserStatus(data['status'])
        
        # Update password if provided
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        db.session.commit()
        
        # Log the update
        Log.create_log(
            level=LogLevel.INFO,
            action=LogAction.UPDATE,
            description=f"User {user.username} updated",
            user_id=current_user.id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            extra_data={'updated_user_id': user_id}
        )
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_user(user_id):
    """Delete user (admin only)"""
    try:
        current_user_id = g.user.id
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        username = user.username
        db.session.delete(user)
        db.session.commit()
        
        # Log the deletion
        Log.create_log(
            level=LogLevel.WARNING,
            action=LogAction.DELETE,
            description=f"User {username} deleted",
            user_id=current_user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            extra_data={'deleted_user_id': user_id}
        )
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@users_bp.route('/online', methods=['GET'])
@login_required
def get_online_users():
    """Get list of online users"""
    try:
        online_users = User.query.filter_by(is_online=True).all()
        return jsonify({
            'online_users': [user.to_dict() for user in online_users]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500