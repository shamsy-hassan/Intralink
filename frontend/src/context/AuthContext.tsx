import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'
import { authAPI, attemptSilentAuth } from '../lib/api'
import { getDeviceId, clearDeviceId } from '../lib/deviceFingerprint'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  deviceId: string
  login: (credentials: LoginCredentials) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
  checkAuthStatus: () => Promise<void>
}

interface LoginCredentials {
  username: string
  password: string
  remember_me?: boolean
}

interface RegisterData {
  username: string
  email: string
  password: string
  first_name: string
  last_name: string
  department_id?: number
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [deviceId] = useState(() => getDeviceId())

  const isAuthenticated = !!user

  // Auto-restore session on app startup
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      setIsLoading(true)
      
      // First check if we have a stored access token
      const storedToken = localStorage.getItem('access_token')
      
      if (storedToken) {
        // Try to verify current token first
        try {
          const response = await authAPI.getCurrentUser()
          setUser(response.data.user)
          console.log('✅ Restored session with existing token')
          setIsInitialized(true)
          return
        } catch (error) {
          // Token invalid, clear it and try refresh
          console.log('⚠️ Stored token invalid, clearing...')
          localStorage.removeItem('access_token')
        }
      }
      
      // Only attempt silent refresh if there's no valid token AND we have cookies
      // Check if we have cookies that might contain refresh token
      const hasCookies = document.cookie.includes('refresh_token') || document.cookie.includes('device_id')
      
      if (hasCookies) {
        console.log('🔄 Attempting silent refresh...')
        const silentAuthResult = await attemptSilentAuth()
        
        if (silentAuthResult.success) {
          setUser(silentAuthResult.user)
          console.log('✅ Session restored via silent refresh')
        } else {
          console.log('ℹ️ Silent refresh failed, user needs to login')
        }
      } else {
        console.log('ℹ️ No refresh cookies found, user needs to login')
      }
      
    } catch (error) {
      console.error('❌ Auth initialization failed:', error)
      // Clear potentially corrupted auth state
      localStorage.removeItem('access_token')
    } finally {
      setIsLoading(false)
      setIsInitialized(true)
    }
  }

  const checkAuthStatus = async () => {
    try {
      const response = await authAPI.getCurrentUser()
      setUser(response.data.user)
    } catch (error) {
      console.error('Auth status check failed:', error)
      setUser(null)
      localStorage.removeItem('access_token')
    }
  }

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      
      const response = await authAPI.login({
        ...credentials,
        remember_me: credentials.remember_me ?? true
      })
      
      const { access_token, user: userData } = response.data
      
      // Store access token
      localStorage.setItem('access_token', access_token)
      setUser(userData)
      
      console.log('✅ Login successful')
      
    } catch (error: any) {
      console.error('❌ Login failed:', error)
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Login failed'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true)
      
      await authAPI.register(userData)
      
      console.log('✅ Registration successful')
      
      // Auto-login after registration
      await login({
        username: userData.username,
        password: userData.password,
        remember_me: true
      })
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error)
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Registration failed'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      // Always clear local state regardless of API call success
      setUser(null)
      localStorage.removeItem('access_token')
      console.log('✅ Logged out')
    }
  }

  const logoutAll = async () => {
    try {
      await authAPI.logoutAll()
    } catch (error) {
      console.error('Logout all request failed:', error)
    } finally {
      // Always clear local state regardless of API call success
      setUser(null)
      localStorage.removeItem('access_token')
      clearDeviceId() // Clear device ID to force re-registration
      console.log('✅ Logged out from all devices')
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData })
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    deviceId,
    login,
    register,
    logout,
    logoutAll,
    updateUser,
    checkAuthStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}