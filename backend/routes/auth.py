from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import (
    jwt_required, create_access_token, get_jwt_identity, get_jwt,
    verify_jwt_in_request, get_current_user
)
from models.user import User, UserStatus, UserRole
from models.session import UserSession, SessionStatus
from models.log import Log, LogLevel, LogAction
from utils.device_fingerprint import (
    generate_device_fingerprint, get_device_info, get_client_ip
)
from database import db
from datetime import datetime, timedelta
import bcrypt
import json

auth_bp = Blueprint('auth', __name__)

# Store blacklisted tokens (in production, use Redis)
blacklisted_tokens = set()

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
    """Login with persistent device session"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        remember_me = data.get('remember_me', True)  # Default to persistent login
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(username=username).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if user is active
        if user.status != UserStatus.ACTIVE:
            return jsonify({'error': 'Account is not active'}), 401
        
        # Generate device fingerprint
        device_fingerprint_data = data.get('device_fingerprint', {})
        device_id, fingerprint_info = generate_device_fingerprint(
            user_agent=request.headers.get('User-Agent'),
            accept_language=request.headers.get('Accept-Language'),
            additional_data=device_fingerprint_data
        )
        
        # Get device info for display
        device_info = get_device_info(
            user_agent=request.headers.get('User-Agent'),
            ip_address=get_client_ip()
        )
        
        # Create access token (short-lived)
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(hours=1)
        )
        
        # Create or update device session
        session = None
        refresh_token = None
        
        if remember_me:
            # Check if device already has an active session
            existing_session = UserSession.query.filter_by(
                user_id=user.id,
                device_id=device_id,
                status=SessionStatus.ACTIVE
            ).filter(
                UserSession.expires_at > datetime.utcnow()
            ).first()
            
            if existing_session:
                # Extend existing session
                existing_session.extend_expiration(days=30)
                existing_session.update_activity(ip_address=get_client_ip())
                session = existing_session
                # Create new refresh token for security
                session, refresh_token = UserSession.create_session(
                    user_id=user.id,
                    device_id=device_id,
                    device_info=device_info,
                    ip_address=get_client_ip(),
                    user_agent=request.headers.get('User-Agent'),
                    expires_days=30
                )
                # Revoke old session
                existing_session.status = SessionStatus.REVOKED
                existing_session.revoked_at = datetime.utcnow()
            else:
                # Create new session
                session, refresh_token = UserSession.create_session(
                    user_id=user.id,
                    device_id=device_id,
                    device_info=device_info,
                    ip_address=get_client_ip(),
                    user_agent=request.headers.get('User-Agent'),
                    expires_days=30
                )
        
        # Update user's last login
        user.last_seen = datetime.utcnow()
        db.session.commit()
        
        # Log the login
        Log.create_log(
            level=LogLevel.INFO,
            action=LogAction.LOGIN,
            description=f"User {user.username} logged in from {device_info['name']}",
            user_id=user.id
        )
        
        # Create response
        response_data = {
            'message': 'Login successful',
            'access_token': access_token,
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
            },
            'device': {
                'id': device_id,
                'info': device_info
            },
            'session': {
                'expires_at': session.expires_at.isoformat() if session else None,
                'remember_me': remember_me
            }
        }
        
        # Create response with httpOnly cookie for refresh token
        response = make_response(jsonify(response_data))
        
        if remember_me and refresh_token:
            # Set httpOnly cookie for refresh token
            response.set_cookie(
                'refresh_token',
                refresh_token,
                max_age=30 * 24 * 60 * 60,  # 30 days
                httponly=True,
                secure=True,  # Only over HTTPS in production
                samesite='Lax',
                path='/api/auth'  # Only send to auth endpoints
            )
            # Also set device ID cookie for verification
            response.set_cookie(
                'device_id',
                device_id,
                max_age=365 * 24 * 60 * 60,  # 1 year
                httponly=False,  # Accessible to JS for device verification
                secure=True,
                samesite='Lax'
            )
        
        return response
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """Refresh access token using httpOnly cookie"""
    try:
        # Get refresh token from httpOnly cookie
        refresh_token = request.cookies.get('refresh_token')
        device_id = request.cookies.get('device_id')
        
        if not refresh_token or not device_id:
            return jsonify({'error': 'No refresh token or device ID found'}), 401
        
        # Verify refresh token and get session
        session = UserSession.verify_refresh_token(refresh_token, device_id)
        
        if not session or not session.is_valid():
            # Clear invalid cookies
            response = make_response(jsonify({'error': 'Invalid or expired refresh token'}), 401)
            response.set_cookie('refresh_token', '', expires=0, path='/api/auth')
            response.set_cookie('device_id', '', expires=0)
            return response
        
        # Get user
        user = User.query.get(session.user_id)
        if not user or user.status != UserStatus.ACTIVE:
            return jsonify({'error': 'User not found or inactive'}), 401
        
        # Create new access token
        access_token = create_access_token(
            identity=str(user.id),
            expires_delta=timedelta(hours=1)
        )
        
        # Update session activity
        session.update_activity(ip_address=get_client_ip())
        
        # Update user's last seen
        user.last_seen = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'access_token': access_token,
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
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout and revoke current session"""
    try:
        current_user_id = get_jwt_identity()
        device_id = request.cookies.get('device_id')
        
        # Revoke current session if device_id is available
        if device_id:
            session = UserSession.query.filter_by(
                user_id=current_user_id,
                device_id=device_id,
                status=SessionStatus.ACTIVE
            ).first()
            
            if session:
                session.status = SessionStatus.REVOKED
                session.revoked_at = datetime.utcnow()
                db.session.commit()
        
        # Add current token to blacklist
        jti = get_jwt()['jti']
        blacklisted_tokens.add(jti)
        
        # Log the logout
        user = User.query.get(current_user_id)
        if user:
            Log.create_log(
                level=LogLevel.INFO,
                action=LogAction.LOGOUT,
                description=f"User {user.username} logged out",
                user_id=user.id
            )
        
        # Clear cookies
        response = make_response(jsonify({'message': 'Logged out successfully'}))
        response.set_cookie('refresh_token', '', expires=0, path='/api/auth')
        response.set_cookie('device_id', '', expires=0)
        
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout-all', methods=['POST'])
@jwt_required()
def logout_all():
    """Logout from all devices"""
    try:
        current_user_id = get_jwt_identity()
        device_id = request.cookies.get('device_id')
        
        # Get current session to keep it or revoke it too
        current_session = None
        if device_id:
            current_session = UserSession.query.filter_by(
                user_id=current_user_id,
                device_id=device_id,
                status=SessionStatus.ACTIVE
            ).first()
        
        # Revoke all sessions for user
        revoked_count = UserSession.revoke_all_user_sessions(
            user_id=current_user_id,
            except_session_id=None  # Revoke all including current
        )
        
        # Add current token to blacklist
        jti = get_jwt()['jti']
        blacklisted_tokens.add(jti)
        
        # Log the logout
        user = User.query.get(current_user_id)
        if user:
            Log.create_log(
                level=LogLevel.INFO,
                action=LogAction.LOGOUT,
                description=f"User {user.username} logged out from all devices ({revoked_count} sessions)",
                user_id=user.id
            )
        
        # Clear cookies
        response = make_response(jsonify({
            'message': f'Logged out from all devices ({revoked_count} sessions)',
            'revoked_sessions': revoked_count
        }))
        response.set_cookie('refresh_token', '', expires=0, path='/api/auth')
        response.set_cookie('device_id', '', expires=0)
        
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
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

@auth_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_user_sessions():
    """Get all active sessions for current user"""
    try:
        current_user_id = get_jwt_identity()
        current_device_id = request.cookies.get('device_id')
        
        sessions = UserSession.query.filter_by(
            user_id=current_user_id,
            status=SessionStatus.ACTIVE
        ).filter(
            UserSession.expires_at > datetime.utcnow()
        ).order_by(UserSession.last_used_at.desc()).all()
        
        session_list = []
        for session in sessions:
            session_data = session.to_dict()
            session_data['is_current'] = (session.device_id == current_device_id)
            session_list.append(session_data)
        
        return jsonify({
            'sessions': session_list,
            'total': len(session_list)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
def revoke_session(session_id):
    """Revoke a specific session"""
    try:
        current_user_id = get_jwt_identity()
        
        success = UserSession.revoke_session(session_id, current_user_id)
        
        if success:
            return jsonify({'message': 'Session revoked successfully'}), 200
        else:
            return jsonify({'error': 'Session not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/device-fingerprint', methods=['GET'])
def get_device_fingerprint_script():
    """Get JavaScript code for device fingerprinting"""
    from utils.device_fingerprint import generate_frontend_fingerprint_script
    
    script = generate_frontend_fingerprint_script()
    
    response = make_response(script)
    response.headers['Content-Type'] = 'application/javascript'
    return response

# JWT token blacklist checker
def check_if_token_revoked(jwt_header, jwt_payload):
    """Check if JWT token is blacklisted"""
    jti = jwt_payload['jti']
    return jti in blacklisted_tokens