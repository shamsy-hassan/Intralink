# IntraLink Development Guide for AI Agents

## Project Overview
IntraLink is a real-time internal communication platform with dual interfaces: Admin Dashboard for management and WhatsApp-style User Interface for employees. Core features include role-based access (Admin/HR/Staff), department messaging, emergency alerts, and real-time notifications.

## Architecture & Key Patterns

### Development Workflow
- **Backend**: `cd backend && python app.py` (Flask :5000)
- **Frontend**: `cd frontend && npm run dev` (Vite :5173)
- **Database**: SQLite with auto-creation and seed data via `utils/seed_data.py`
- **Demo Credentials**: See `DEMO_CREDENTIALS.md` for test accounts

### Authentication Flow
- **JWT Tokens**: Access (1hr) + Refresh (30d) stored in localStorage
- **Auto-refresh**: `api.ts` interceptor handles 401s with refresh token retry
- **Socket Auth**: Pass `auth: {token}` object to Socket.IO connection
- **Role Protection**: Use Flask `@jwt_required()` + role-specific route decorators

```python
# Backend pattern for protected routes
@users_bp.route('/', methods=['GET'])
@jwt_required()
@admin_required  # Custom decorator in routes
def get_users():
```

### Database Models & Relationships
- **Enums**: Use Python Enum for UserRole, UserStatus, MessageType, etc.
- **Foreign Keys**: Department ↔ User, Message → User/Department
- **Audit Trail**: Log model tracks all admin actions with timestamps
- **Auto-timestamps**: created_at/updated_at with SQLAlchemy defaults

```python
# Model pattern with relationships
class User(db.Model):
    department = db.relationship('Department', back_populates='users')
    sent_messages = db.relationship('Message', foreign_keys='Message.sender_id')
```

### API Structure
- **Blueprints**: Organized by feature (`auth`, `users`, `messages`, `alerts`, `departments`)
- **URL Prefixes**: All APIs use `/api/{blueprint}` pattern
- **Error Handling**: JWT decorators return consistent 401/403 JSON responses
- **CORS**: Configured for `localhost:5173` with credentials support

### Socket.IO Patterns
- **Authentication**: Decode JWT in connect handler, store user mapping
- **Room Management**: Auto-join users to department rooms
- **Event Structure**: Use typed events with proper error handling
- **User Tracking**: `connected_users` dict tracks online status

```python
# SocketIO event pattern
@socketio.on('send_message')
def handle_message(data):
    # Validate user, emit to rooms, save to DB
```

### Frontend Patterns
- **Context Architecture**: AuthContext + SocketContext for global state
- **API Layer**: Single `api.ts` instance with interceptors for all HTTP calls
- **Types**: Comprehensive TypeScript interfaces in `types/index.ts` match backend models
- **Components**: Feature-based organization (`admin/`, `chat/`, `onboarding/`)

```tsx
// Component pattern with hooks
const Component = () => {
  const { user } = useAuth()
  const [data, setData] = useState()
  
  // API calls with error handling
  useEffect(() => {
    api.get('/endpoint').then(setData).catch(console.error)
  }, [])
```

### Styling Conventions
- **Tailwind**: Utility-first with custom color scheme
- **Framer Motion**: Page transitions and component animations
- **Responsive**: Mobile-first design with sidebar collapse patterns
- **Icons**: Lucide React for consistent iconography

### Real-time Features
- **Message Broadcasting**: Department-wide, direct messages, admin broadcasts
- **Typing Indicators**: Socket events for real-time typing status
- **Online Status**: User presence tracking via Socket.IO connection/disconnect
- **Emergency Alerts**: High-priority notifications with acknowledgment tracking

## Critical Implementation Notes
- **Token Blacklisting**: Currently in-memory set (use Redis in production)
- **File Uploads**: Not yet implemented, prepare for multipart form handling
- **Environment Variables**: Use python-dotenv for Flask, VITE_ prefix for React
- **Database Migrations**: Flask-Migrate configured but not heavily used yet
- **Error Boundaries**: Add React error boundaries for production reliability

## Quick Reference
- **Admin Routes**: `/admin/*` for dashboard, `/` for user interface
- **API Base**: `http://localhost:5000/api/` (configurable via VITE_API_URL)
- **Socket Events**: connect, disconnect, send_message, typing, join_room
- **Seed Users**: admin/admin123, hr_manager/hr123, staff users available