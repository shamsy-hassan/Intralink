import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '../types'
import { authAPI, attemptSilentAuth } from '../lib/api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
  checkAuthStatus: () => Promise<void>
}

interface LoginCredentials {
  username: string
  password: string
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

  const isAuthenticated = !!user

  // Auto-restore session on app startup
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      setIsLoading(true)
      const silentAuthResult = await attemptSilentAuth()
      
      if (silentAuthResult.success) {
        setUser(silentAuthResult.user)
        console.log('✅ Session restored via session cookie')
      } else {
        console.log('ℹ️ No active session found, user needs to login')
      }
      
    } catch (error) {
      console.error('❌ Auth initialization failed:', error)
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
    }
  }

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      
      const response = await authAPI.login(credentials)
      const { user: userData } = response.data
      
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
      console.log('✅ Logged out')
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
    login,
    register,
    logout,
    updateUser,
    checkAuthStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}