from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.message import Message, MessageType, MessageScope
from models.user import User
from models.department import Department
from models.log import Log, LogLevel, LogAction
from database import db
from datetime import datetime

messages_bp = Blueprint('messages', __name__, url_prefix='/api/messages')

@messages_bp.route('/', methods=['GET'])
@jwt_required()
def get_messages():
    """Get messages with filtering"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        scope = request.args.get('scope')  # direct, department, broadcast
        department_id = request.args.get('department_id', type=int)
        recipient_id = request.args.get('recipient_id', type=int)
        
        query = Message.query.filter(Message.is_deleted == False)
        
        # Filter based on user's access
        if scope == 'direct':
            # Direct messages where user is sender or recipient
            query = query.filter(
                Message.scope == MessageScope.DIRECT,
                ((Message.sender_id == current_user_id) | (Message.recipient_id == current_user_id))
            )
            if recipient_id:
                query = query.filter(
                    ((Message.sender_id == current_user_id) & (Message.recipient_id == recipient_id)) |
                    ((Message.sender_id == recipient_id) & (Message.recipient_id == current_user_id))
                )
        
        elif scope == 'department':
            # Department messages for user's department or specified department
            user = User.query.get(current_user_id)
            target_dept_id = department_id if department_id else user.department_id
            query = query.filter(
                Message.scope == MessageScope.DEPARTMENT,
                Message.department_id == target_dept_id
            )
        
        elif scope == 'broadcast':
            # Broadcast messages (everyone can see)
            query = query.filter(Message.scope == MessageScope.BROADCAST)
        
        else:
            # All messages user has access to
            user = User.query.get(current_user_id)
            query = query.filter(
                (Message.scope == MessageScope.BROADCAST) |
                ((Message.scope == MessageScope.DEPARTMENT) & (Message.department_id == user.department_id)) |
                ((Message.scope == MessageScope.DIRECT) & 
                 ((Message.sender_id == current_user_id) | (Message.recipient_id == current_user_id)))
            )
        
        # Order by creation time
        query = query.order_by(Message.created_at.desc())
        
        # Paginate
        messages = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'messages': [msg.to_dict(current_user_id) for msg in messages.items],
            'total': messages.total,
            'pages': messages.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/', methods=['POST'])
@jwt_required()
def send_message():
    """Send a new message"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'error': 'Message content is required'}), 400
        
        message = Message(
            content=data['content'],
            message_type=MessageType(data.get('message_type', 'text')),
            scope=MessageScope(data.get('scope', 'direct')),
            sender_id=current_user_id,
            recipient_id=data.get('recipient_id'),
            department_id=data.get('department_id'),
            file_url=data.get('file_url'),
            file_name=data.get('file_name'),
            file_size=data.get('file_size')
        )
        
        # Validate scope requirements
        if message.scope == MessageScope.DIRECT and not message.recipient_id:
            return jsonify({'error': 'Recipient is required for direct messages'}), 400
        
        if message.scope == MessageScope.DEPARTMENT and not message.department_id:
            return jsonify({'error': 'Department is required for department messages'}), 400
        
        db.session.add(message)
        db.session.commit()
        
        # Log the message
        Log.create_log(
            level=LogLevel.INFO,
            action=LogAction.SEND_MESSAGE,
            description=f"Message sent to {message.scope.value}",
            user_id=current_user_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            extra_data={'message_id': message.id}
        )
        
        # Emit real-time event
        message_data = message.to_dict(current_user_id)
        # Note: SocketIO events will be handled separately in the frontend
        # if message.scope == MessageScope.DIRECT:
        #     socketio.emit('new_message', message_data, room=f'user_{message.recipient_id}')
        # elif message.scope == MessageScope.DEPARTMENT:
        #     socketio.emit('new_message', message_data, room=f'dept_{message.department_id}')
        # elif message.scope == MessageScope.BROADCAST:
        #     socketio.emit('new_message', message_data, broadcast=True)
        
        return jsonify({
            'message': 'Message sent successfully',
            'data': message_data
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/<int:message_id>/read', methods=['POST'])
@jwt_required()
def mark_message_read(message_id):
    """Mark message as read"""
    try:
        current_user_id = get_jwt_identity()
        message = Message.query.get(message_id)
        
        if not message:
            return jsonify({'error': 'Message not found'}), 404
        
        message.mark_as_read(current_user_id)
        
        return jsonify({'message': 'Message marked as read'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messages_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get user's conversations"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get direct message conversations
        direct_conversations = db.session.query(Message).filter(
            Message.scope == MessageScope.DIRECT,
            ((Message.sender_id == current_user_id) | (Message.recipient_id == current_user_id)),
            Message.is_deleted == False
        ).order_by(Message.created_at.desc()).all()
        
        # Group by conversation partner
        conversations = {}
        for msg in direct_conversations:
            partner_id = msg.recipient_id if msg.sender_id == current_user_id else msg.sender_id
            if partner_id not in conversations:
                conversations[partner_id] = {
                    'partner': User.query.get(partner_id).to_dict(),
                    'last_message': msg.to_dict(current_user_id),
                    'unread_count': 0
                }
            
            # Count unread messages
            if not msg.is_read_by_user(current_user_id):
                conversations[partner_id]['unread_count'] += 1
        
        return jsonify({
            'conversations': list(conversations.values())
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500