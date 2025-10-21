# IntraLink - Smart Internal Communication Platform

IntraLink is a comprehensive internal communication and alert system designed for organizations and industries. It features a powerful admin dashboard and a WhatsApp-style user interface for seamless team communication.

## 🚀 Features

### Admin Dashboard
- **User Management**: Add, edit, suspend, and delete employees
- **Role Management**: Admin, HR, and Staff roles with different permissions
- **Message Broadcasting**: Company-wide, department, or individual messaging
- **Emergency Alerts**: Instant alert system with acknowledgment tracking
- **Analytics Dashboard**: User activity statistics and engagement metrics
- **File Sharing**: Secure file upload and sharing capabilities

### User Interface
- **WhatsApp-style Chat**: Clean, intuitive messaging interface
- **Real-time Communication**: Instant messaging with typing indicators
- **Department Channels**: Organized communication by departments
- **Direct Messages**: Private conversations between users
- **Push Notifications**: Real-time alerts and message notifications
- **Mobile Responsive**: Optimized for all device sizes

## 🛠 Technology Stack

### Backend
- **Flask**: Python web framework
- **Flask-SocketIO**: Real-time bidirectional communication
- **Flask-SQLAlchemy**: Database ORM
- **Flask-JWT-Extended**: JWT authentication
- **Flask-CORS**: Cross-origin resource sharing
- **SQLite**: Database (PostgreSQL ready)

### Frontend
- **React**: UI library with TypeScript
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Modern component library
- **Framer Motion**: Animation library
- **Axios**: HTTP client with interceptors
- **Socket.IO Client**: Real-time communication

## 📁 Project Structure

```
IntraLink/
├── backend/                 # Flask API server
│   ├── app.py              # Main Flask application
│   ├── models/             # SQLAlchemy models
│   │   ├── user.py         # User model with roles and status
│   │   ├── department.py   # Department model
│   │   ├── message.py      # Message model with scopes
│   │   ├── alert.py        # Alert model with types
│   │   ├── notification.py # Notification model
│   │   └── log.py          # Activity logging model
│   ├── routes/             # API endpoints
│   │   ├── auth.py         # Authentication routes
│   │   ├── users.py        # User management routes
│   │   ├── departments.py  # Department routes
│   │   ├── messages.py     # Messaging routes
│   │   └── alerts.py       # Alert management routes
│   ├── socketio_events.py  # Real-time event handlers
│   ├── utils/              # Utility functions
│   │   └── seed_data.py    # Database seed data
│   └── requirements.txt    # Python dependencies
│
└── frontend/               # React application
    ├── src/
    │   ├── components/     # Reusable UI components
    │   ├── pages/          # Page components
    │   ├── context/        # React contexts
    │   │   ├── AuthContext.tsx    # Authentication state
    │   │   └── SocketContext.tsx  # Socket.IO connection
    │   ├── hooks/          # Custom React hooks
    │   ├── lib/            # Utility libraries
    │   │   ├── api.ts      # API client with interceptors
    │   │   └── utils.ts    # Helper functions
    │   ├── types/          # TypeScript type definitions
    │   └── index.css       # Global styles with Tailwind
    └── package.json        # Node.js dependencies
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application**:
   ```bash
   python app.py
   ```

The backend will start on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

The frontend will start on `http://localhost:5173`

## 🔐 Default Users

The system comes with pre-configured users for testing:

| Username | Password | Role | Department |
|----------|----------|------|------------|
| admin | admin123 | Admin | Administration |
| hr_manager | hr123 | HR | Human Resources |
| john_doe | staff123 | Staff | Engineering |
| jane_smith | staff123 | Staff | Marketing |
| mike_wilson | staff123 | Staff | Sales |
| emily_brown | staff123 | Staff | Engineering |

## 🎯 Key Features Implementation Status

- ✅ **Backend API Structure**: Complete Flask setup with all models and routes
- ✅ **Authentication System**: JWT-based auth with refresh tokens
- ✅ **Real-time Communication**: Socket.IO setup for live messaging
- ✅ **Database Models**: User, Department, Message, Alert, Notification, Log models
- ✅ **Frontend Foundation**: React + TypeScript + Tailwind + Context setup
- 🔄 **UI Components**: In progress - Basic components and pages
- 🔄 **Chat Interface**: In progress - WhatsApp-style messaging UI
- 🔄 **Admin Dashboard**: In progress - Management interface
- ⏳ **File Upload**: Planned - File sharing functionality
- ⏳ **Push Notifications**: Planned - Browser notification API

## 🛡 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Admin, HR, and Staff permission levels
- **Password Hashing**: Secure password storage with bcrypt
- **CORS Protection**: Configured for development and production
- **Activity Logging**: Comprehensive audit trail
- **Token Refresh**: Automatic token renewal for better UX

## 🔧 Development Guidelines

### Backend Development
- Follow Flask blueprints for route organization
- Use SQLAlchemy models with proper relationships
- Implement comprehensive error handling
- Add activity logging for security auditing
- Use JWT decorators for protected endpoints

### Frontend Development
- Use TypeScript for type safety
- Implement React Context for state management
- Create reusable components with shadcn/ui
- Follow Tailwind utility-first approach
- Add Framer Motion for smooth animations

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### User Management
- `GET /api/users` - Get all users (Admin/HR)
- `GET /api/users/{id}` - Get specific user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user (Admin/HR)

### Messaging
- `GET /api/messages` - Get messages with filtering
- `POST /api/messages` - Send new message
- `POST /api/messages/{id}/read` - Mark message as read
- `GET /api/messages/conversations` - Get user conversations

### Alerts
- `GET /api/alerts` - Get alerts
- `POST /api/alerts` - Create new alert (Admin/HR)
- `POST /api/alerts/{id}/send` - Send alert immediately
- `POST /api/alerts/{id}/acknowledge` - Acknowledge alert

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**IntraLink** - Connecting teams, enhancing productivity. 🚀