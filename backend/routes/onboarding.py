from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token
from models.user import User, UserStatus, UserRole
from models.department import Department
from models.log import Log, LogLevel, LogAction
from database import db
from datetime import datetime, timedelta
import random
import string
import secrets

onboarding_bp = Blueprint('onboarding', __name__)

# Temporary storage for OTP codes (in production, use Redis or database)
otp_storage = {}

def generate_otp():
    """Generate a 6-digit OTP code"""
    # For demo purposes, always return the same code
    # In production, return random code: ''.join(random.choices(string.digits, k=6))
    return '123456'

def generate_username(first_name, last_name, work_id):
    """Generate a unique username"""
    base_username = f"{first_name.lower()}.{last_name.lower()}"
    
    # Check if username exists
    existing_user = User.query.filter_by(username=base_username).first()
    if not existing_user:
        return base_username
    
    # If exists, append work_id or number
    counter = 1
    while True:
        username = f"{base_username}{counter}"
        if not User.query.filter_by(username=username).first():
            return username
        counter += 1

@onboarding_bp.route('/verify-work-id', methods=['POST'])
def verify_work_id():
    """Verify work ID and initiate onboarding process"""
    data = request.get_json()
    
    if not data or not data.get('workId'):
        return jsonify({'message': 'Work ID is required'}), 400
    
    work_id = data['workId'].strip()
    
    # Check if user already exists with this work ID
    existing_user = User.query.filter_by(employee_id=work_id).first()
    
    # In a real application, you would verify against an HR database
    # For now, we'll accept any work ID that follows a pattern
    if len(work_id) < 3:
        return jsonify({'message': 'Invalid Work ID format'}), 400
    
    # Generate OTP
    otp_code = generate_otp()
    
    # Store OTP with expiration (5 minutes)
    otp_storage[work_id] = {
        'code': otp_code,
        'expires_at': datetime.now() + timedelta(minutes=5),
        'attempts': 0
    }
    
    # In production, send OTP via email/SMS
    # For demo purposes, we'll return it in the response (remove in production)
    
    # Log the verification attempt
    log = Log(
        action=LogAction.AUTH_LOGIN,
        level=LogLevel.INFO,
        description=f'Work ID verification requested: {work_id}',
        extra_data={'work_id': work_id}
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'message': 'Verification code sent',
        'workId': work_id,
        'contactMethod': 'email',  # or 'phone'
        'maskedContact': 'j***@company.com',  # In real app, get from HR system
        # Remove this line in production:
        'otp': otp_code  # For demo purposes only
    }), 200

@onboarding_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP code"""
    data = request.get_json()
    
    if not data or not data.get('workId') or not data.get('otp'):
        return jsonify({'message': 'Work ID and OTP are required'}), 400
    
    work_id = data['workId'].strip()
    otp_code = data['otp'].strip()
    
    # Check if OTP exists and is valid
    stored_otp = otp_storage.get(work_id)
    if not stored_otp:
        return jsonify({'message': 'No verification code found for this Work ID'}), 400
    
    # Check if OTP has expired
    if datetime.now() > stored_otp['expires_at']:
        del otp_storage[work_id]
        return jsonify({'message': 'Verification code has expired'}), 400
    
    # Check attempt limit
    if stored_otp['attempts'] >= 3:
        del otp_storage[work_id]
        return jsonify({'message': 'Too many failed attempts. Please request a new code.'}), 400
    
    # Verify OTP (accept both generated OTP and demo OTP)
    if stored_otp['code'] != otp_code and otp_code != '123456':
        stored_otp['attempts'] += 1
        return jsonify({'message': 'Invalid verification code'}), 400
    
    # OTP is valid - auto-create user account with predefined data
    try:
        # Check if user already exists
        existing_user = User.query.filter_by(employee_id=work_id).first()
        if existing_user:
            # User already exists, just log them in
            access_token = create_access_token(identity=str(existing_user.id))
            refresh_token = create_refresh_token(identity=str(existing_user.id))
            
            # Clean up OTP storage
            if work_id in otp_storage:
                del otp_storage[work_id]
                
            return jsonify({
                'message': 'Login successful',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': existing_user.to_dict(),
                'requires_profile': False
            }), 200
        
        # User doesn't exist - return indication that profile setup is needed
        # Clean up OTP storage
        if work_id in otp_storage:
            del otp_storage[work_id]
            
        return jsonify({
            'message': 'OTP verified - Profile setup required',
            'work_id': work_id,
            'requires_profile': True
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error during OTP verification: {str(e)}")
        return jsonify({'message': 'OTP verification failed', 'error': str(e)}), 500

@onboarding_bp.route('/complete-profile', methods=['POST'])
def complete_profile():
    """Complete user profile and create account"""
    data = request.get_json()
    
    required_fields = ['workId', 'firstName', 'lastName', 'departmentId']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'message': f'{field} is required'}), 400
    
    work_id = data['workId'].strip()
    
    # Check if user already exists
    existing_user = User.query.filter_by(employee_id=work_id).first()
    if existing_user:
        return jsonify({'message': 'User already exists'}), 409
    
    # Verify department exists
    department = Department.query.get(data['departmentId'])
    if not department:
        return jsonify({'message': 'Invalid department'}), 400
    
    try:
        # Generate username and temporary password
        username = generate_username(data['firstName'], data['lastName'], work_id)
        temp_password = secrets.token_urlsafe(12)  # Generate secure temporary password
        
        # Create user
        user = User(
            username=username,
            email=f"{username}@company.com",  # In real app, get from HR system
            first_name=data['firstName'],
            last_name=data['lastName'],
            employee_id=work_id,
            role=UserRole.STAFF,
            department_id=data['departmentId'],
            status=UserStatus.ACTIVE,
            profile_picture=data.get('profilePhoto'),
            last_seen=datetime.now()
        )
        
        # Set password using the model's method
        user.set_password(temp_password)
        
        db.session.add(user)
        db.session.commit()
        
        # Clean up OTP storage
        if work_id in otp_storage:
            del otp_storage[work_id]
        
        # Create access tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        # Log successful registration
        log = Log(
            action=LogAction.USER_REGISTERED,
            level=LogLevel.INFO,
            description=f'User onboarding completed: {username}',
            user_id=user.id,
            extra_data={'work_id': work_id, 'department': department.name}
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'message': 'Profile created successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict(),
            # In production, send this via secure channel
            'temp_password': temp_password  # For initial login setup
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Profile creation failed', 'error': str(e)}), 500

@onboarding_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    """Resend OTP code"""
    data = request.get_json()
    
    if not data or not data.get('workId'):
        return jsonify({'message': 'Work ID is required'}), 400
    
    work_id = data['workId'].strip()
    
    # Generate new OTP
    otp_code = generate_otp()
    
    # Update OTP storage
    otp_storage[work_id] = {
        'code': otp_code,
        'expires_at': datetime.now() + timedelta(minutes=5),
        'attempts': 0
    }
    
    # In production, send OTP via email/SMS
    
    return jsonify({
        'message': 'Verification code resent',
        # Remove this line in production:
        'otp': otp_code  # For demo purposes only
    }), 200

@onboarding_bp.route('/departments', methods=['GET'])
def get_departments():
    """Get list of departments for profile setup"""
    departments = Department.query.all()
    return jsonify({
        'departments': [dept.to_dict() for dept in departments]
    }), 200