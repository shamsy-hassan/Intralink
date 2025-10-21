import axios, { AxiosError } from 'axios'
import { generateDeviceFingerprint } from './deviceFingerprint'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
})

// Track if we're currently refreshing token to avoid multiple refresh calls
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  
  failedQueue = []
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('🔑 Adding auth header to request:', config.url, token.substring(0, 20) + '...')
    } else {
      console.log('⚠️ No access token found for request:', config.url)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle authentication errors and auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    // Only attempt auto-refresh for 401s that aren't from auth endpoints
    if (error.response?.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/auth/refresh') &&
        !originalRequest.url?.includes('/auth/login')) {
      
      if (isRefreshing) {
        // Token refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => {
          const token = localStorage.getItem('access_token')
          if (token) {
            originalRequest.headers.Authorization = `Bearer ${token}`
          }
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      // Check if we have refresh cookies before attempting refresh
      const hasRefreshCookie = document.cookie.includes('refresh_token')
      if (!hasRefreshCookie) {
        // No refresh token available, don't attempt refresh
        localStorage.removeItem('access_token')
        return Promise.reject(error)
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Try to refresh token using httpOnly cookie
        const response = await api.post('/auth/refresh')
        const { access_token } = response.data
        
        // Update stored token
        localStorage.setItem('access_token', access_token)
        
        // Update authorization header for original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        
        // Process queued requests
        processQueue(null, access_token)
        
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed, redirect to login
        processQueue(refreshError, null)
        localStorage.removeItem('access_token')
        
        // Only redirect if we're not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// Auth API with persistent login support
export const authAPI = {
  login: (credentials: { 
    username: string
    password: string
    remember_me?: boolean
  }) => {
    // Add device fingerprint to login request
    const deviceFingerprint = generateDeviceFingerprint()
    return api.post('/auth/login', {
      ...credentials,
      device_fingerprint: deviceFingerprint,
      remember_me: credentials.remember_me ?? true // Default to persistent login
    })
  },
  
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
  
  logoutAll: () => api.post('/auth/logout-all'),
  
  getCurrentUser: () => api.get('/auth/me'),
  
  getSessions: () => api.get('/auth/sessions'),
  
  revokeSession: (sessionId: number) => api.delete(`/auth/sessions/${sessionId}`),
}

// Silent auth check - tries to restore session without user interaction
export const attemptSilentAuth = async (): Promise<{
  success: boolean
  user?: any
  access_token?: string
}> => {
  try {
    // Check if we have refresh cookies before attempting
    const hasRefreshCookie = document.cookie.includes('refresh_token')
    if (!hasRefreshCookie) {
      console.log('No refresh token cookie found')
      return { success: false }
    }

    const response = await api.post('/auth/refresh')
    const { access_token, user } = response.data
    
    if (access_token) {
      localStorage.setItem('access_token', access_token)
      return { success: true, user, access_token }
    }
    
    return { success: false }
  } catch (error) {
    // Silent auth failed - this is normal if no valid session exists
    console.log('Silent auth failed (normal if no session):', error)
    localStorage.removeItem('access_token')
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