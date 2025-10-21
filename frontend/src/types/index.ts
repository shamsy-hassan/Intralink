// User types
export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  employee_id?: string
  role: 'admin' | 'hr' | 'staff'
  status: 'active' | 'suspended' | 'inactive'
  department_id?: number
  department_name?: string
  profile_picture?: string
  last_seen?: string
  is_online: boolean
  created_at: string
}

// Department types
export interface Department {
  id: number
  name: string
  description?: string
  color: string
  is_active: boolean
  user_count: number
  created_at: string
  updated_at: string
}

// Message types
export interface Message {
  id: number
  content: string
  message_type: 'text' | 'file' | 'image' | 'system'
  scope: 'direct' | 'department' | 'broadcast'
  sender_id: number
  sender: User
  recipient_id?: number
  department_id?: number
  file_url?: string
  file_name?: string
  file_size?: number
  is_edited: boolean
  is_deleted: boolean
  read_count: number
  is_read?: boolean
  created_at: string
  updated_at: string
}

// Alert types
export interface Alert {
  id: number
  title: string
  message: string
  alert_type: 'emergency' | 'warning' | 'info' | 'maintenance'
  scope: 'global' | 'department' | 'individual'
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled'
  sender_id: number
  sender: User
  department_id?: number
  target_user_ids?: number[]
  scheduled_at?: string
  sent_at?: string
  expires_at?: string
  is_urgent: boolean
  requires_acknowledgment: boolean
  acknowledgment_count: number
  target_user_count: number
  is_acknowledged?: boolean
  created_at: string
  updated_at: string
}

// Notification types
export interface Notification {
  id: number
  title: string
  message: string
  notification_type: 'message' | 'alert' | 'mention' | 'system'
  user_id: number
  source_id?: number
  source_type?: string
  is_read: boolean
  read_at?: string
  created_at: string
}

// Conversation types
export interface Conversation {
  partner: User
  last_message: Message
  unread_count: number
}

// API Response types
export interface PaginatedResponse<T> {
  items?: T[]
  total: number
  pages: number
  current_page: number
  per_page: number
}

export interface ApiResponse<T = any> {
  message?: string
  data?: T
  error?: string
  [key: string]: any
}

// Auth types
export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  department_id?: number
}

export interface AuthResponse {
  message: string
  user: User
  access_token: string
  refresh_token: string
}

// Socket.IO event types
export interface SocketEvents {
  // Connection events
  connect: () => void
  disconnect: () => void
  
  // User events
  user_status_changed: (data: {
    user_id: number
    username: string
    is_online: boolean
    last_seen: string
  }) => void
  
  // Message events
  new_message: (message: Message) => void
  user_typing: (data: {
    user_id: number
    username: string
    typing: boolean
  }) => void
  message_read_status: (data: {
    message_id: number
    read_by: number
  }) => void
  
  // Alert events
  new_alert: (alert: Alert) => void
  
  // Notification events
  new_notification: (notification: Notification) => void
  
  // Room events
  joined_conversation: (data: { room: string }) => void
  left_conversation: (data: { room: string }) => void
  
  // Online users
  online_users_list: (data: { users: User[] }) => void
  
  // Error events
  error: (data: { message: string }) => void
}

// Component prop types
export interface ChatBubbleProps {
  message: Message
  isOwnMessage: boolean
  showAvatar?: boolean
  showTimestamp?: boolean
}

export interface UserAvatarProps {
  user: User
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
  className?: string
}

export interface AlertBadgeProps {
  alert: Alert
  onClick?: () => void
  className?: string
}

// Form types
export interface MessageFormData {
  content: string
  recipient_id?: number
  department_id?: number
  scope: 'direct' | 'department' | 'broadcast'
}

export interface AlertFormData {
  title: string
  message: string
  alert_type: 'emergency' | 'warning' | 'info' | 'maintenance'
  scope: 'global' | 'department' | 'individual'
  department_id?: number
  target_user_ids?: number[]
  scheduled_at?: string
  expires_at?: string
  is_urgent: boolean
  requires_acknowledgment: boolean
  send_immediately: boolean
}

// Voting types
export interface Vote {
  id: number
  title: string
  description?: string
  vote_type: 'poll' | 'issue' | 'feedback'
  status: 'active' | 'closed' | 'draft'
  options: string[]
  allow_multiple_choices: boolean
  show_results_before_voting: boolean
  anonymous_voting: boolean
  starts_at?: string
  ends_at?: string
  target_departments?: string[] | null
  created_by: number
  creator_name: string
  created_at: string
  updated_at: string
  vote_counts: Record<string, number>
  total_votes: number
  results: {
    total_voters: number
    total_selections: number
    breakdown: Record<string, number>
  }
  user_vote?: UserVote | null
  can_vote?: boolean
}

export interface UserVote {
  id: number
  user_id: number
  vote_id: number
  selected_options: string[]
  comment?: string
  voted_at: string
  voter_name: string
}

export interface VoteFormData {
  title: string
  description?: string
  vote_type: 'poll' | 'issue' | 'feedback'
  status: 'active' | 'closed' | 'draft'
  options: string[]
  allow_multiple_choices: boolean
  show_results_before_voting: boolean
  anonymous_voting: boolean
  starts_at?: string
  ends_at?: string
  target_departments?: string[] | null
}

export interface VoteResults {
  total_voters: number
  options: Record<string, number>
  votes_by_department: Record<string, number>
  timeline: Array<{
    voted_at: string
    voter: string
    department?: string
    options: string[]
  }>
}