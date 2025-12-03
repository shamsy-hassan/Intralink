from flask import Blueprint, request, jsonify, g
from routes.auth import login_required
from models.department import Department
from models.user import User, UserRole
from models.log import Log, LogLevel, LogAction
from database import db
from functools import wraps

departments_bp = Blueprint('departments', __name__, url_prefix='/api/departments')

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = g.user
        if not user or user.role not in [UserRole.ADMIN, UserRole.HR]:
            return jsonify({'error': 'Admin or HR access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@departments_bp.route('/', methods=['GET'])
@login_required
def get_departments():
    """Get all departments"""
    try:
        departments = Department.query.filter_by(is_active=True).all()
        return jsonify({
            'departments': [dept.to_dict() for dept in departments]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@departments_bp.route('/', methods=['POST'])
@login_required
@admin_required
def create_department():
    """Create new department"""
    try:
        current_user_id = g.user.id
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Department name is required'}), 400
        
        # Check if department already exists
        if Department.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'Department already exists'}), 400
        
        department = Department(
            name=data['name'],
            description=data.get('description', ''),
            color=data.get('color', '#3B82F6')
        )
        
        db.session.add(department)
        db.session.commit()
        
        # Log the creation
        Log.create_log(
            level=LogLevel.INFO,
            action=LogAction.CREATE,
            description=f"Department {department.name} created",
            user_id=current_user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'message': 'Department created successfully',
            'department': department.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@departments_bp.route('/<int:department_id>', methods=['PUT'])
@login_required
@admin_required
def update_department(department_id):
    """Update department"""
    try:
        current_user_id = g.user.id
        department = Department.query.get(department_id)
        
        if not department:
            return jsonify({'error': 'Department not found'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            department.name = data['name']
        if 'description' in data:
            department.description = data['description']
        if 'color' in data:
            department.color = data['color']
        if 'is_active' in data:
            department.is_active = data['is_active']
        
        db.session.commit()
        
        # Log the update
        Log.create_log(
            level=LogLevel.INFO,
            action=LogAction.UPDATE,
            description=f"Department {department.name} updated",
            user_id=current_user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({
            'message': 'Department updated successfully',
            'department': department.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@departments_bp.route('/<int:department_id>', methods=['DELETE'])
@login_required
@admin_required
def delete_department(department_id):
    """Delete department"""
    try:
        current_user_id = g.user.id
        department = Department.query.get(department_id)
        
        if not department:
            return jsonify({'error': 'Department not found'}), 404
        
        # Check if department has users
        if department.users:
            return jsonify({'error': 'Cannot delete department with users'}), 400
        
        department_name = department.name
        db.session.delete(department)
        db.session.commit()
        
        # Log the deletion
        Log.create_log(
            level=LogLevel.WARNING,
            action=LogAction.DELETE,
            description=f"Department {department_name} deleted",
            user_id=current_user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        return jsonify({'message': 'Department deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@departments_bp.route('/<int:department_id>/users', methods=['GET'])
@login_required
def get_department_users(department_id):
    """Get users in a department"""
    try:
        department = Department.query.get(department_id)
        if not department:
            return jsonify({'error': 'Department not found'}), 404
        
        users = User.query.filter_by(department_id=department_id).all()
        return jsonify({
            'users': [user.to_dict() for user in users]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500