import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type { SocketEvents, Message, Alert, Notification, User } from '../types'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  onlineUsers: User[]
  typingUsers: { [key: string]: string }
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string }>({})
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
      const accessToken = localStorage.getItem('access_token')
      
      const newSocket = io(socketURL, {
        auth: {
          token: accessToken,
        },
        transports: ['websocket'],
      })

      // Connection events
      newSocket.on('connect', () => {
        console.log('Connected to server')
        setIsConnected(true)
        
        // Request online users list
        newSocket.emit('get_online_users')
      })

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server')
        setIsConnected(false)
      })

      // User status events
      newSocket.on('user_status_changed', (data: {
        user_id: number
        username: string
        is_online: boolean
        last_seen: string
      }) => {
        setOnlineUsers(prev => {
          if (data.is_online) {
            // Add user to online list if not already there
            if (!prev.find(u => u.id === data.user_id)) {
              const newUser: User = {
                id: data.user_id,
                username: data.username,
                is_online: true,
                last_seen: data.last_seen,
                // Add other required User properties with defaults
                email: '',
                first_name: '',
                last_name: '',
                full_name: data.username,
                role: 'staff',
                status: 'active',
                created_at: new Date().toISOString(),
              }
              return [...prev, newUser]
            }
            return prev
          } else {
            // Remove user from online list
            return prev.filter(u => u.id !== data.user_id)
          }
        })
      })

      newSocket.on('online_users_list', (data: { users: User[] }) => {
        setOnlineUsers(data.users)
      })

      // Typing events
      newSocket.on('user_typing', (data: {
        user_id: number
        username: string
        typing: boolean
      }) => {
        setTypingUsers(prev => {
          const newTypingUsers = { ...prev }
          if (data.typing) {
            newTypingUsers[data.user_id] = data.username
          } else {
            delete newTypingUsers[data.user_id]
          }
          return newTypingUsers
        })
      })

      // Message events
      newSocket.on('new_message', (message: Message) => {
        // Emit custom event for components to listen to
        window.dispatchEvent(new CustomEvent('new_message', { detail: message }))
      })

      newSocket.on('message_read_status', (data: {
        message_id: number
        read_by: number
      }) => {
        // Emit custom event for components to listen to
        window.dispatchEvent(new CustomEvent('message_read_status', { detail: data }))
      })

      // Alert events
      newSocket.on('new_alert', (alert: Alert) => {
        // Emit custom event for components to listen to
        window.dispatchEvent(new CustomEvent('new_alert', { detail: alert }))
      })

      // Notification events
      newSocket.on('new_notification', (notification: Notification) => {
        // Emit custom event for components to listen to
        window.dispatchEvent(new CustomEvent('new_notification', { detail: notification }))
      })

      // Error events
      newSocket.on('error', (data: { message: string }) => {
        console.error('Socket error:', data.message)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
        setSocket(null)
        setIsConnected(false)
        setOnlineUsers([])
        setTypingUsers({})
      }
    } else {
      // User not authenticated, clean up
      if (socket) {
        socket.close()
        setSocket(null)
        setIsConnected(false)
        setOnlineUsers([])
        setTypingUsers({})
      }
    }
  }, [isAuthenticated, user])

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

// Custom hooks for specific socket events
export const useSocketEvent = (event: string, handler: (data: any) => void) => {
  const { socket } = useSocket()

  useEffect(() => {
    if (socket) {
      socket.on(event, handler)
      return () => {
        socket.off(event, handler)
      }
    }
  }, [socket, event, handler])
}

export const useTypingIndicator = (conversationType: 'direct' | 'department', targetId: number) => {
  const { socket } = useSocket()

  const startTyping = () => {
    if (socket) {
      socket.emit('typing_start', {
        type: conversationType,
        target_id: targetId,
      })
    }
  }

  const stopTyping = () => {
    if (socket) {
      socket.emit('typing_stop', {
        type: conversationType,
        target_id: targetId,
      })
    }
  }

  return { startTyping, stopTyping }
}