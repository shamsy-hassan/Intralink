from flask import session, request
from flask_socketio import emit, join_room, leave_room, disconnect
from models.user import User
from models.message import Message, MessageType, MessageScope
from models.notification import Notification, NotificationType
from app import db
from datetime import datetime
import json

# Store connected users
connected_users = {}

def register_socketio_events(socketio):
    """Register all SocketIO event handlers"""
    
    @socketio.on('connect')
    def on_connect():
        """Handle client connection"""
        try:
            if 'user_id' not in session:
                disconnect()
                return False
            
            user_id = session['user_id']
            
            # Get user from database
            user = User.query.get(user_id)
            if not user:
                disconnect()
                return False
            
            # Store connection
            session_id = request.sid
            connected_users[session_id] = user_id
            
            # Join user's personal room
            join_room(f'user_{user_id}')
            
            # Join department room if user has department
            if user.department_id:
                join_room(f'dept_{user.department_id}')
            
            # Update user's online status
            user.is_online = True
            user.last_seen = datetime.utcnow()
            db.session.commit()
            
            # Notify others about user coming online
            emit('user_status_changed', {
                'user_id': user_id,
                'username': user.username,
                'is_online': True,
                'last_seen': user.last_seen.isoformat()
            }, broadcast=True, include_self=False)
            
            print(f"User {user.username} connected")
            return True
            
        except Exception as e:
            print(f"Connection error: {str(e)}")
            disconnect()
            return False
    
    @socketio.on('disconnect')
    def on_disconnect():
        """Handle client disconnection"""
        try:
            session_id = request.sid
            user_id = connected_users.get(session_id)
            if user_id:
                # Remove from connected users
                del connected_users[session_id]
                
                # Update user's online status
                user = User.query.get(user_id)
                if user:
                    user.is_online = False
                    user.last_seen = datetime.utcnow()
                    db.session.commit()
                    
                    # Notify others about user going offline
                    emit('user_status_changed', {
                        'user_id': user_id,
                        'username': user.username,
                        'is_online': False,
                        'last_seen': user.last_seen.isoformat()
                    }, broadcast=True)
                    
                    print(f"User {user.username} disconnected")
        
        except Exception as e:
            print(f"Disconnection error: {str(e)}")
    
    # For now, let's simplify the other event handlers
    @socketio.on('get_online_users')
    def on_get_online_users():
        """Get list of online users"""
        try:
            online_users = User.query.filter_by(is_online=True).all()
            emit('online_users_list', {
                'users': [user.to_dict() for user in online_users]
            })
            
        except Exception as e:
            emit('error', {'message': str(e)})
