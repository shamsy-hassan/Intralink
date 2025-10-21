from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_migrate import Migrate
from database import db
import os
from datetime import timedelta

# Initialize Flask extensions
jwt = JWTManager()
socketio = SocketIO()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///intralink.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    app.config['JWT_CSRF_IN_COOKIES'] = False  # Disable CSRF protection for API
    app.config['JWT_CSRF_CHECK_FORM'] = False
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_COOKIE_CSRF_PROTECT'] = False
    
    # Initialize extensions with app
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
           from flask import request
           print(f"[JWT] Invalid token: {error}")
           print(f"[JWT] Authorization header: {request.headers.get('Authorization')}")
           return jsonify({'error': 'Invalid token'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
           from flask import request
           print(f"[JWT] Unauthorized: {error}")
           print(f"[JWT] Authorization header: {request.headers.get('Authorization')}")
           return jsonify({'error': 'Authorization token is required'}), 401
    
    @jwt.needs_fresh_token_loader
    def token_not_fresh_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Fresh token required'}), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has been revoked'}), 401
    
    # Token blacklist checker
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from routes.auth import blacklisted_tokens
        jti = jwt_payload['jti']
        return jti in blacklisted_tokens
    
    # Configure CORS
    CORS(app,
         origins=['http://localhost:5173'],
         supports_credentials=True,
         allow_headers=["*"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
    
    # Initialize SocketIO with CORS
    socketio.init_app(app, cors_allowed_origins="http://localhost:5173")
    
    # Import models to register them with SQLAlchemy
    from models import user, department, message, alert, notification, log, vote, session
    
        # Register blueprints
    from routes.auth import auth_bp
    from routes.users import users_bp
    from routes.messages import messages_bp
    from routes.alerts import alerts_bp
    from routes.departments import departments_bp
    from routes.notifications import notifications_bp
    from routes.health import health_bp
    from routes.onboarding import onboarding_bp
    from routes.votes import votes_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(alerts_bp, url_prefix='/api/alerts')
    app.register_blueprint(departments_bp, url_prefix='/api/departments')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(onboarding_bp, url_prefix='/api/onboarding')
    app.register_blueprint(votes_bp, url_prefix='/api/votes')
    
    # Register SocketIO events
    from socketio_events import register_socketio_events
    register_socketio_events(socketio)
    
    # Create tables
    with app.app_context():
        db.create_all()
        
        # Create seed data
        from utils.seed_data import create_seed_data
        create_seed_data()
    
    return app

if __name__ == '__main__':
    app = create_app()
    socketio = app.extensions['socketio']
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, debug=True, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)