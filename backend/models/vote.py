from database import db
from datetime import datetime
from enum import Enum

class VoteStatus(Enum):
    ACTIVE = 'active'
    CLOSED = 'closed'
    DRAFT = 'draft'

class VoteType(Enum):
    POLL = 'poll'           # Simple question with multiple choice
    ISSUE = 'issue'         # Issue that needs voting/approval
    FEEDBACK = 'feedback'   # Feedback collection

class Vote(db.Model):
    __tablename__ = 'votes'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    vote_type = db.Column(db.Enum(VoteType), nullable=False, default=VoteType.POLL)
    status = db.Column(db.Enum(VoteStatus), nullable=False, default=VoteStatus.DRAFT)
    
    # Options stored as JSON array of strings
    options = db.Column(db.JSON, nullable=False)  # e.g., ["Yes", "No"] or ["Option A", "Option B", "Option C"]
    
    # Voting settings
    allow_multiple_choices = db.Column(db.Boolean, default=False)
    show_results_before_voting = db.Column(db.Boolean, default=False)
    anonymous_voting = db.Column(db.Boolean, default=False)
    
    # Timing
    starts_at = db.Column(db.DateTime, nullable=True)
    ends_at = db.Column(db.DateTime, nullable=True)
    
    # Targeting
    target_departments = db.Column(db.JSON, nullable=True)  # null means all users
    
    # Metadata
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = db.relationship('User', backref='created_votes')
    user_votes = db.relationship('UserVote', back_populates='vote', cascade='all, delete-orphan')
    
    def to_dict(self):
        # Calculate vote counts
        vote_counts = {}
        total_votes = 0
        
        for user_vote in self.user_votes:
            for option in user_vote.selected_options:
                vote_counts[option] = vote_counts.get(option, 0) + 1
                total_votes += 1
        
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'vote_type': self.vote_type.value,
            'status': self.status.value,
            'options': self.options,
            'allow_multiple_choices': self.allow_multiple_choices,
            'show_results_before_voting': self.show_results_before_voting,
            'anonymous_voting': self.anonymous_voting,
            'starts_at': self.starts_at.isoformat() if self.starts_at else None,
            'ends_at': self.ends_at.isoformat() if self.ends_at else None,
            'target_departments': self.target_departments,
            'created_by': self.created_by,
            'creator_name': f"{self.creator.first_name} {self.creator.last_name}",
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'vote_counts': vote_counts,
            'total_votes': len(self.user_votes),  # Count unique voters, not total selections
            'results': {
                'total_voters': len(self.user_votes),
                'total_selections': total_votes,
                'breakdown': vote_counts
            }
        }

class UserVote(db.Model):
    __tablename__ = 'user_votes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vote_id = db.Column(db.Integer, db.ForeignKey('votes.id'), nullable=False)
    
    # Store selected options as JSON array to support multiple choice
    selected_options = db.Column(db.JSON, nullable=False)  # e.g., ["Yes"] or ["Option A", "Option C"]
    
    # Optional comment/feedback
    comment = db.Column(db.Text, nullable=True)
    
    # Metadata
    voted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='votes_cast')
    vote = db.relationship('Vote', back_populates='user_votes')
    
    # Ensure one vote per user per poll
    __table_args__ = (db.UniqueConstraint('user_id', 'vote_id', name='unique_user_vote'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'vote_id': self.vote_id,
            'selected_options': self.selected_options,
            'comment': self.comment,
            'voted_at': self.voted_at.isoformat(),
            'voter_name': f"{self.user.first_name} {self.user.last_name}" if not self.vote.anonymous_voting else "Anonymous"
        }