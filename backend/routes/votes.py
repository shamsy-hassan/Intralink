from flask import Blueprint, request, jsonify, g
from routes.auth import login_required
from database import db
from models.vote import Vote, UserVote, VoteStatus, VoteType
from models.user import User, UserRole
from models.department import Department
from datetime import datetime
import json

votes_bp = Blueprint('votes', __name__)

def admin_required(f):
    """Decorator to require admin role"""
    def decorated_function(*args, **kwargs):
        user = g.user
        if not user or user.role != UserRole.ADMIN:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def admin_or_hr_required(f):
    """Decorator to require admin or HR role"""
    def decorated_function(*args, **kwargs):
        user = g.user
        if not user or user.role not in [UserRole.ADMIN, UserRole.HR]:
            return jsonify({'error': 'Admin or HR access required'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@votes_bp.route('/', methods=['GET'])
@login_required
def get_votes():
    """Get all votes (admin/HR see all, users see active votes they can participate in)"""
    try:
        user = g.user
        current_user_id = user.id
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Admin and HR can see all votes
        if user.role in [UserRole.ADMIN, UserRole.HR]:
            votes = Vote.query.order_by(Vote.created_at.desc()).all()
        else:
            # Regular users only see active votes they can participate in
            votes = Vote.query.filter(
                Vote.status == VoteStatus.ACTIVE,
                db.or_(
                    Vote.target_departments.is_(None),  # Global votes
                    Vote.target_departments.contains([user.department.name])  # Their department
                )
            ).order_by(Vote.created_at.desc()).all()
            
        return jsonify({
            'votes': [vote.to_dict() for vote in votes],
            'total': len(votes)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@votes_bp.route('/', methods=['POST'])
@login_required
@admin_or_hr_required
def create_vote():
    """Create a new vote/poll"""
    try:
        current_user_id = g.user.id
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'options']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400
                
        # Validate options
        options = data['options']
        if not isinstance(options, list) or len(options) < 2:
            return jsonify({'error': 'At least 2 options are required'}), 400
            
        # Parse dates
        starts_at = None
        ends_at = None
        if data.get('starts_at'):
            try:
                starts_at = datetime.fromisoformat(data['starts_at'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid starts_at date format'}), 400
                
        if data.get('ends_at'):
            try:
                ends_at = datetime.fromisoformat(data['ends_at'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid ends_at date format'}), 400
                
        # Validate date logic
        if starts_at and ends_at and starts_at >= ends_at:
            return jsonify({'error': 'End date must be after start date'}), 400
            
        # Create vote
        vote = Vote(
            title=data['title'],
            description=data.get('description', ''),
            vote_type=VoteType(data.get('vote_type', 'poll')),
            status=VoteStatus(data.get('status', 'draft')),
            options=options,
            allow_multiple_choices=data.get('allow_multiple_choices', False),
            show_results_before_voting=data.get('show_results_before_voting', False),
            anonymous_voting=data.get('anonymous_voting', False),
            starts_at=starts_at,
            ends_at=ends_at,
            target_departments=data.get('target_departments'),
            created_by=current_user_id
        )
        
        db.session.add(vote)
        db.session.commit()
        
        return jsonify({
            'message': 'Vote created successfully',
            'vote': vote.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'Invalid enum value: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@votes_bp.route('/<int:vote_id>', methods=['GET'])
@login_required
def get_vote(vote_id):
    """Get a specific vote with details"""
    try:
        user = g.user
        current_user_id = user.id
        
        vote = Vote.query.get(vote_id)
        if not vote:
            return jsonify({'error': 'Vote not found'}), 404
            
        # Check permissions
        if user.role not in [UserRole.ADMIN, UserRole.HR]:
            # Regular users can only see votes they can participate in
            if vote.status != VoteStatus.ACTIVE:
                return jsonify({'error': 'Vote not accessible'}), 403
            if vote.target_departments and user.department.name not in vote.target_departments:
                return jsonify({'error': 'Vote not accessible'}), 403
                
        # Get user's vote if exists
        user_vote = UserVote.query.filter_by(user_id=current_user_id, vote_id=vote_id).first()
        
        vote_data = vote.to_dict()
        vote_data['user_vote'] = user_vote.to_dict() if user_vote else None
        vote_data['can_vote'] = (
            vote.status == VoteStatus.ACTIVE and
            (not vote.target_departments or user.department.name in vote.target_departments) and
            not user_vote  # Haven't voted yet
        )
        
        return jsonify({'vote': vote_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@votes_bp.route('/<int:vote_id>', methods=['PUT'])
@login_required
@admin_or_hr_required
def update_vote(vote_id):
    """Update a vote"""
    try:
        current_user_id = g.user.id
        data = request.get_json()
        
        vote = Vote.query.get(vote_id)
        if not vote:
            return jsonify({'error': 'Vote not found'}), 404
            
        # Only creator or admin can edit
        user = g.user
        if user.role != UserRole.ADMIN and vote.created_by != current_user_id:
            return jsonify({'error': 'Permission denied'}), 403
            
        # Update fields
        if 'title' in data:
            vote.title = data['title']
        if 'description' in data:
            vote.description = data['description']
        if 'status' in data:
            vote.status = VoteStatus(data['status'])
        if 'options' in data:
            vote.options = data['options']
        if 'allow_multiple_choices' in data:
            vote.allow_multiple_choices = data['allow_multiple_choices']
        if 'show_results_before_voting' in data:
            vote.show_results_before_voting = data['show_results_before_voting']
        if 'anonymous_voting' in data:
            vote.anonymous_voting = data['anonymous_voting']
        if 'target_departments' in data:
            vote.target_departments = data['target_departments']
            
        # Update dates
        if 'starts_at' in data:
            if data['starts_at']:
                vote.starts_at = datetime.fromisoformat(data['starts_at'].replace('Z', '+00:00'))
            else:
                vote.starts_at = None
                
        if 'ends_at' in data:
            if data['ends_at']:
                vote.ends_at = datetime.fromisoformat(data['ends_at'].replace('Z', '+00:00'))
            else:
                vote.ends_at = None
                
        vote.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Vote updated successfully',
            'vote': vote.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'error': f'Invalid value: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@votes_bp.route('/<int:vote_id>', methods=['DELETE'])
@login_required
@admin_or_hr_required
def delete_vote(vote_id):
    """Delete a vote"""
    try:
        current_user_id = g.user.id
        
        vote = Vote.query.get(vote_id)
        if not vote:
            return jsonify({'error': 'Vote not found'}), 404
            
        # Only creator or admin can delete
        user = g.user
        if user.role != UserRole.ADMIN and vote.created_by != current_user_id:
            return jsonify({'error': 'Permission denied'}), 403
            
        db.session.delete(vote)
        db.session.commit()
        
        return jsonify({'message': 'Vote deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@votes_bp.route('/<int:vote_id>/vote', methods=['POST'])
@login_required
def cast_vote(vote_id):
    """Cast a vote"""
    try:
        current_user_id = g.user.id
        data = request.get_json()
        
        vote = Vote.query.get(vote_id)
        if not vote:
            return jsonify({'error': 'Vote not found'}), 404
            
        # Check if vote is active
        if vote.status != VoteStatus.ACTIVE:
            return jsonify({'error': 'Vote is not active'}), 400
            
        # Check timing
        now = datetime.utcnow()
        if vote.starts_at and now < vote.starts_at:
            return jsonify({'error': 'Voting has not started yet'}), 400
        if vote.ends_at and now > vote.ends_at:
            return jsonify({'error': 'Voting has ended'}), 400
            
        # Check if user is in target departments
        user = g.user
        if vote.target_departments and user.department.name not in vote.target_departments:
            return jsonify({'error': 'You are not eligible to vote on this'}), 403
            
        # Check if already voted
        existing_vote = UserVote.query.filter_by(user_id=current_user_id, vote_id=vote_id).first()
        if existing_vote:
            return jsonify({'error': 'You have already voted'}), 400
            
        # Validate selected options
        selected_options = data.get('selected_options', [])
        if not selected_options:
            return jsonify({'error': 'At least one option must be selected'}), 400
            
        # Validate options exist
        for option in selected_options:
            if option not in vote.options:
                return jsonify({'error': f'Invalid option: {option}'}), 400
                
        # Check multiple choice setting
        if not vote.allow_multiple_choices and len(selected_options) > 1:
            return jsonify({'error': 'Multiple choices not allowed for this vote'}), 400
            
        # Create user vote
        user_vote = UserVote(
            user_id=current_user_id,
            vote_id=vote_id,
            selected_options=selected_options,
            comment=data.get('comment', '')
        )
        
        db.session.add(user_vote)
        db.session.commit()
        
        return jsonify({
            'message': 'Vote cast successfully',
            'user_vote': user_vote.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@votes_bp.route('/<int:vote_id>/results', methods=['GET'])
@login_required
def get_vote_results(vote_id):
    """Get detailed vote results"""
    try:
        current_user_id = g.user.id
        user = g.user
        
        vote = Vote.query.get(vote_id)
        if not vote:
            return jsonify({'error': 'Vote not found'}), 404
            
        # Check permissions to view results
        if user.role not in [UserRole.ADMIN, UserRole.HR]:
            if vote.status == VoteStatus.DRAFT:
                return jsonify({'error': 'Results not available'}), 403
            if not vote.show_results_before_voting:
                # Check if user has voted
                user_vote = UserVote.query.filter_by(user_id=current_user_id, vote_id=vote_id).first()
                if not user_vote:
                    return jsonify({'error': 'Vote first to see results'}), 403
                    
        # Get all votes for this poll
        user_votes = UserVote.query.filter_by(vote_id=vote_id).all()
        
        # Calculate detailed results
        results = {
            'total_voters': len(user_votes),
            'options': {},
            'votes_by_department': {},
            'timeline': []
        }
        
        # Count votes by option
        for option in vote.options:
            results['options'][option] = 0
            
        for user_vote in user_votes:
            for option in user_vote.selected_options:
                results['options'][option] += 1
                
            # Department breakdown (if not anonymous)
            if not vote.anonymous_voting:
                dept_name = user_vote.user.department.name
                if dept_name not in results['votes_by_department']:
                    results['votes_by_department'][dept_name] = 0
                results['votes_by_department'][dept_name] += 1
                
                # Timeline
                results['timeline'].append({
                    'voted_at': user_vote.voted_at.isoformat(),
                    'voter': f"{user_vote.user.first_name} {user_vote.user.last_name}",
                    'department': dept_name,
                    'options': user_vote.selected_options
                })
            else:
                results['timeline'].append({
                    'voted_at': user_vote.voted_at.isoformat(),
                    'voter': 'Anonymous',
                    'options': user_vote.selected_options
                })
                
        # Sort timeline by date
        results['timeline'].sort(key=lambda x: x['voted_at'])
        
        return jsonify({
            'vote': vote.to_dict(),
            'results': results
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500