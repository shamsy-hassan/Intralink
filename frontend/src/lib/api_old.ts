import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: {
    username: string
    email: string
    password: string
    first_name: string
    last_name: string
    department_id?: number
  }) => api.post('/auth/register', userData),
  
  refresh: () => api.post('/auth/refresh'),
  
  logout: () => api.post('/auth/logout'),
  
  getCurrentUser: () => api.get('/auth/me'),
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
  }) => api.get('/users', { params }),
  
  getUser: (userId: number) => api.get(`/users/${userId}`),
  
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
  getDepartments: () => api.get('/departments'),
  
  createDepartment: (departmentData: {
    name: string
    description?: string
    color?: string
  }) => api.post('/departments', departmentData),
  
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
  }) => api.get('/messages', { params }),
  
  sendMessage: (messageData: {
    content: string
    message_type?: string
    scope: string
    recipient_id?: number
    department_id?: number
    file_url?: string
    file_name?: string
    file_size?: number
  }) => api.post('/messages', messageData),
  
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
  }) => api.get('/alerts', { params }),
  
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
  }) => api.post('/alerts', alertData),
  
  sendAlert: (alertId: number) => api.post(`/alerts/${alertId}/send`),
  
  acknowledgeAlert: (alertId: number) => api.post(`/alerts/${alertId}/acknowledge`),
}

// Notifications API (placeholder - can be implemented later)
export const notificationsAPI = {
  getNotifications: (params?: {
    page?: number
    per_page?: number
    is_read?: boolean
  }) => api.get('/notifications', { params }),
  
  markNotificationRead: (notificationId: number) => 
    api.post(`/notifications/${notificationId}/read`),
  
  markAllNotificationsRead: () => api.post('/notifications/read-all'),
}