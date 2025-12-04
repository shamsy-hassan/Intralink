from flask import Blueprint, jsonify
from routes.auth import login_required
from models.message import Message
from models.department import Department
from database import db
from sqlalchemy import func
from datetime import datetime, timedelta

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/communication', methods=['GET'])
@login_required
def communication_analytics():
    """Get communication analytics"""
    try:
        # Message volume over the last 7 months
        seven_months_ago = datetime.utcnow() - timedelta(days=30*7)
        message_volume = db.session.query(
            func.strftime('%Y-%m', Message.created_at).label('month'),
            func.count(Message.id).label('count')
        ).filter(Message.created_at >= seven_months_ago).group_by('month').order_by('month').all()

        message_volume_data = [{'name': row.month, 'sent': row.count} for row in message_volume]

        # Messages by department
        messages_by_department = db.session.query(
            Department.name,
            func.count(Message.id).label('count')
        ).join(Message, Message.department_id == Department.id).group_by(Department.name).all()

        department_data = [{'name': row[0], 'value': row[1]} for row in messages_by_department]

        return jsonify({
            'message_volume': message_volume_data,
            'messages_by_department': department_data
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
