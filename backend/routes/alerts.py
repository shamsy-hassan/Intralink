from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.alert import Alert, AlertType, AlertScope, AlertStatus
from models.user import User, UserRole
from models.log import Log, LogLevel, LogAction
from database import db
from datetime import datetime
from functools import wraps
from flask import current_app

alerts_bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        if not user or user.role not in [UserRole.ADMIN, UserRole.HR]:
            return jsonify({'error': 'Admin or HR access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@alerts_bp.route('/', methods=['GET'])
@jwt_required()
def get_alerts():
    """Get alerts for user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        alert_type = request.args.get('type')
        status = request.args.get('status')
        
        query = Alert.query
        
        # Filter alerts based on user access
        if user.role not in [UserRole.ADMIN, UserRole.HR]:
            # Regular users see global alerts, department alerts, and individual alerts
            query = query.filter(
                (Alert.scope == AlertScope.GLOBAL) |
                ((Alert.scope == AlertScope.DEPARTMENT) & (Alert.department_id == user.department_id)) |
                ((Alert.scope == AlertScope.INDIVIDUAL) & Alert.target_user_ids.contains([current_user_id]))
            )
        
        # Apply filters
        if alert_type:
            query = query.filter(Alert.alert_type == alert_type)
        if status:
            query = query.filter(Alert.status == status)
        else:
            # Default to sent alerts for regular users
            if user.role not in [UserRole.ADMIN, UserRole.HR]:
                query = query.filter(Alert.status == AlertStatus.SENT)
        
        # Order by creation time
        query = query.order_by(Alert.created_at.desc())
        
        # Paginate
        alerts = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'alerts': [alert.to_dict(current_user_id) for alert in alerts.items],
            'total': alerts.total,
            'pages': alerts.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required
def create_alert():
    """Create and optionally send alert"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('title') or not data.get('message'):
            return jsonify({'error': 'Title and message are required'}), 400
        
        alert = Alert(
            title=data['title'],
            message=data['message'],
            alert_type=AlertType(data.get('alert_type', 'info')),
            scope=AlertScope(data.get('scope', 'global')),
            sender_id=current_user_id,
            department_id=data.get('department_id'),
            target_user_ids=data.get('target_user_ids'),
            scheduled_at=datetime.fromisoformat(data['scheduled_at']) if data.get('scheduled_at') else None,
            expires_at=datetime.fromisoformat(data['expires_at']) if data.get('expires_at') else None,
            is_urgent=data.get('is_urgent', False),
            requires_acknowledgment=data.get('requires_acknowledgment', False)
        )
        
        # Validate scope requirements
        if alert.scope == AlertScope.DEPARTMENT and not alert.department_id:
            return jsonify({'error': 'Department is required for department alerts'}), 400
        
        if alert.scope == AlertScope.INDIVIDUAL and not alert.target_user_ids:
            return jsonify({'error': 'Target users are required for individual alerts'}), 400
        
        # Set status based on scheduling
        if data.get('send_immediately', False) and not alert.scheduled_at:
            alert.status = AlertStatus.SENT
            alert.sent_at = datetime.utcnow()
        elif alert.scheduled_at:
            alert.status = AlertStatus.SCHEDULED
        else:
            alert.status = AlertStatus.DRAFT
        
        db.session.add(alert)
        db.session.commit()
        
        # Log the alert creation
        Log.create_log(
            level=LogLevel.INFO,
            action=LogAction.SEND_ALERT,
            description=f"Alert '{alert.title}' created",
            user_id=current_user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            extra_data={'alert_id': alert.id}
        )
        
        # Send alert immediately if requested
        if alert.status == AlertStatus.SENT:
            _send_alert_realtime(alert)
        
        return jsonify({
            'message': 'Alert created successfully',
            'alert': alert.to_dict(current_user_id)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/<int:alert_id>/send', methods=['POST'])
@jwt_required()
@admin_required
def send_alert(alert_id):
    """Send a draft alert immediately"""
    try:
        current_user_id = get_jwt_identity()
        alert = Alert.query.get(alert_id)
        
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404
        
        if alert.status != AlertStatus.DRAFT:
            return jsonify({'error': 'Only draft alerts can be sent'}), 400
        
        alert.status = AlertStatus.SENT
        alert.sent_at = datetime.utcnow()
        db.session.commit()
        
        # Send real-time alert
        _send_alert_realtime(alert)
        
        # Log the alert sending
        Log.create_log(
            level=LogLevel.INFO,
            action=LogAction.SEND_ALERT,
            description=f"Alert '{alert.title}' sent",
            user_id=current_user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            extra_data={'alert_id': alert.id}
        )
        
        return jsonify({
            'message': 'Alert sent successfully',
            'alert': alert.to_dict(current_user_id)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/<int:alert_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_alert(alert_id):
    """Acknowledge an alert"""
    try:
        current_user_id = get_jwt_identity()
        alert = Alert.query.get(alert_id)
        
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404
        
        if not alert.requires_acknowledgment:
            return jsonify({'error': 'Alert does not require acknowledgment'}), 400
        
        alert.acknowledge(current_user_id)
        
        return jsonify({'message': 'Alert acknowledged'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _send_alert_realtime(alert):
    """Send alert via SocketIO"""
    alert_data = alert.to_dict()
    
    if alert.scope == AlertScope.GLOBAL:
        current_app.extensions['socketio'].emit('new_alert', alert_data)
    elif alert.scope == AlertScope.DEPARTMENT:
        current_app.extensions['socketio'].emit('new_alert', alert_data, room=f'dept_{alert.department_id}')
    elif alert.scope == AlertScope.INDIVIDUAL:
        for user_id in alert.target_user_ids:
            current_app.extensions['socketio'].emit('new_alert', alert_data, room=f'user_{user_id}')