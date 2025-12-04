import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
})

// Auth API
export const authAPI = {
  login: (credentials: { 
    username: string
    password: string
  }) => api.post('/auth/login', credentials),
  
  register: (userData: {
    username: string
    email: string
    password: string
    first_name: string
    last_name: string
    department_id?: number
  }) => api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  getCurrentUser: () => api.get('/auth/me'),
}

// Silent auth check - tries to restore session without user interaction
export const attemptSilentAuth = async (): Promise<{
  success: boolean
  user?: any
}> => {
  try {
    const response = await api.get('/auth/me')
    const { user } = response.data
    
    if (user) {
      return { success: true, user }
    }
    
    return { success: false }
  } catch (error) {
    console.log('Silent auth failed (normal if no session):', error)
    return { success: false }
  }
}

// Users API
export const usersAPI = {
  getUsers: (params?: {
    page?: number
    per_page?: number
    department_id?: number
    role?: string
    status?: string
    search?: string
  }) => api.get('/users/', { params }),
  
  getUser: (userId: number) => api.get(`/users/${userId}`),
  
  createUser: (userData: {
    username: string
    email: string
    password: string
    first_name: string
    last_name: string
    department_id?: number
    role?: string
  }) => api.post('/users/', userData),
  
  updateUser: (userId: number, userData: Partial<{
    first_name: string
    last_name: string
    email: string
    department_id: number
    role: string
    status: string
    password: string
  }>) => api.put(`/users/${userId}`, userData),
  
  deleteUser: (userId: number) => api.delete(`/users/${userId}`),
  
  getOnlineUsers: () => api.get('/users/online'),
}

// Departments API
export const departmentsAPI = {
  getDepartments: () => api.get('/departments/'),
  
  createDepartment: (departmentData: {
    name: string
    description?: string
    color?: string
  }) => api.post('/departments/', departmentData),
  
  updateDepartment: (departmentId: number, departmentData: Partial<{
    name: string
    description: string
    color: string
    is_active: boolean
  }>) => api.put(`/departments/${departmentId}`, departmentData),
  
  deleteDepartment: (departmentId: number) => api.delete(`/departments/${departmentId}`),
  
  getDepartmentUsers: (departmentId: number) => api.get(`/departments/${departmentId}/users`),
}

// Messages API
export const messagesAPI = {
  getMessages: (params?: {
    page?: number
    per_page?: number
    scope?: string
    department_id?: number
    recipient_id?: number
  }) => api.get('/messages/', { params }),
  
  sendMessage: (messageData: {
    content: string
    message_type?: string
    scope: string
    recipient_id?: number
    department_id?: number
    file_url?: string
    file_name?: string
    file_size?: number
  }) => api.post('/messages/', messageData),
  
  markMessageRead: (messageId: number) => api.post(`/messages/${messageId}/read`),
  
  getConversations: () => api.get('/messages/conversations'),
}

// Alerts API
export const alertsAPI = {
  getAlerts: (params?: {
    page?: number
    per_page?: number
    type?: string
    status?: string
  }) => api.get('/alerts/', { params }),
  
  createAlert: (alertData: {
    title: string
    message: string
    alert_type?: string
    scope?: string
    department_id?: number
    target_user_ids?: number[]
    scheduled_at?: string
    expires_at?: string
    is_urgent?: boolean
    requires_acknowledgment?: boolean
    send_immediately?: boolean
  }) => api.post('/alerts/', alertData),
  
  sendAlert: (alertId: number) => api.post(`/alerts/${alertId}/send`),
  
  acknowledgeAlert: (alertId: number) => api.post(`/alerts/${alertId}/acknowledge`),
}

// Voting API
export const votingAPI = {
  getVotes: () => api.get('/votes/'),
  
  createVote: (voteData: {
    title: string
    description?: string
    vote_type: string
    status: string
    options: string[]
    allow_multiple_choices?: boolean
    show_results_before_voting?: boolean
    anonymous_voting?: boolean
    starts_at?: string
    ends_at?: string
    target_departments?: string[]
  }) => api.post('/votes/', voteData),
  
  getVote: (voteId: number) => api.get(`/votes/${voteId}`),
  
  updateVote: (voteId: number, voteData: any) => api.put(`/votes/${voteId}`, voteData),
  
  deleteVote: (voteId: number) => api.delete(`/votes/${voteId}`),
  
  castVote: (voteId: number, voteData: {
    selected_options: string[]
    comment?: string
  }) => api.post(`/votes/${voteId}/vote`, voteData),
  
  getVoteResults: (voteId: number) => api.get(`/votes/${voteId}/results`),
}

// Notifications API
export const notificationsAPI = {
  getNotifications: (params?: {
    page?: number
    per_page?: number
    is_read?: boolean
  }) => api.get('/notifications/', { params }),
  
  markNotificationRead: (notificationId: number) => 
    api.post(`/notifications/${notificationId}/read`),
  
  markAllNotificationsRead: () => api.post('/notifications/read-all'),
}

// Analytics API
export const analyticsAPI = {
  getCommunicationAnalytics: () => api.get('/analytics/communication'),
}