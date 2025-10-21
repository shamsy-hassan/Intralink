import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MoreVertical, 
  Bell, 
  ChevronUp, 
  Check, 
  X, 
  AlertTriangle, 
  Info, 
  MessageSquare,
  Menu,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { User } from '../../types';
import { api } from '../../lib/api';

interface ChatInterfaceProps {
  user: User;
}

interface Message {
  id: string | number;
  content: string;
  type: 'announcement' | 'order' | 'notification' | 'poll' | 'emergency';
  timestamp: string;
  sender: string;
  isRead: boolean;
  isAcknowledged?: boolean;
  poll?: {
    question: string;
    options: Array<{
      id: number;
      text: string;
      votes: number;
    }>;
    userVote?: number;
    totalVotes: number;
  };
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user }) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'announcements' | 'orders' | 'polls' | 'emergency'>('all');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Enhanced sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
        setIsCollapsed(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load messages and alerts from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load broadcast messages
        const messagesResponse = await api.get('/messages/?scope=broadcast');
        
        // Load department messages for user's department
        let departmentMessages = [];
        if (user.department_name) {
          try {
            const deptResponse = await api.get('/messages/?scope=department');
            departmentMessages = deptResponse.data.messages || [];
          } catch (error) {
            console.log('No department messages or error loading:', error);
          }
        }

        // Load emergency alerts
        let alerts = [];
        try {
          const alertsResponse = await api.get('/alerts/');
          alerts = alertsResponse.data.alerts || [];
          console.log('Loaded alerts from backend:', alerts);
        } catch (error) {
          console.error('Error loading alerts:', error);
        }

        // Convert messages to UI format
        const uiMessages: Message[] = [];
        
        // Process broadcast messages
        (messagesResponse.data.messages || []).forEach((msg: any) => {
          uiMessages.push({
            id: `msg_${msg.id}`,
            type: 'announcement',
            content: msg.content,
            timestamp: new Date(msg.sent_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            sender: `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim() || 'System',
            isRead: false,
            isAcknowledged: false
          });
        });

        // Process department messages
        departmentMessages.forEach((msg: any) => {
          uiMessages.push({
            id: `dept_${msg.id}`,
            type: 'order',
            content: msg.content,
            timestamp: new Date(msg.sent_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            sender: `${msg.sender?.first_name || ''} ${msg.sender?.last_name || ''}`.trim() || 'System',
            isRead: false,
            isAcknowledged: false
          });
        });

        // Process emergency alerts
        alerts.forEach((alert: any) => {
          uiMessages.push({
            id: `alert_${alert.id}`,
            type: 'emergency',
            content: alert.message,
            timestamp: new Date(alert.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            sender: `${alert.creator?.first_name || ''} ${alert.creator?.last_name || ''}`.trim() || 'Emergency System',
            isRead: false,
            isAcknowledged: false
          });
        });

        // Sort messages by timestamp (newest first)
        uiMessages.sort((a, b) => {
          // Convert time strings back to comparable format for sorting
          const timeA = new Date(`1970-01-01 ${a.timestamp}`);
          const timeB = new Date(`1970-01-01 ${b.timestamp}`);
          return timeB.getTime() - timeA.getTime();
        });

        setMessages(uiMessages);
        console.log('Final UI messages:', uiMessages);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // Auto-refresh removed as requested
    
  }, [user.department_name]);

  // Enhanced sidebar toggle functions
  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      if (isCollapsed) {
        setIsCollapsed(false);
        setIsSidebarOpen(true);
      } else {
        setIsCollapsed(!isCollapsed);
      }
    }
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleAcknowledge = (messageId: string | number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isAcknowledged: true, isRead: true } : msg
    ));
  };

  const handleVote = (messageId: string | number, optionId: number) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.poll) {
        const updatedPoll = {
          ...msg.poll,
          userVote: optionId,
          options: msg.poll.options.map(opt => 
            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
          ),
          totalVotes: msg.poll.totalVotes + 1
        };
        return { ...msg, poll: updatedPoll, isRead: true };
      }
      return msg;
    }));
  };

  // Filter messages based on selected filter
  const filteredMessages = messages.filter(message => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'announcements') return message.type === 'announcement';
    if (selectedFilter === 'orders') return message.type === 'order';
    if (selectedFilter === 'polls') return message.type === 'poll';
    if (selectedFilter === 'emergency') return message.type === 'emergency';
    return true;
  });

  const unreadCount = messages.filter(msg => !msg.isRead).length;

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Info className="w-5 h-5 text-blue-500" />;
      case 'order': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'poll': return <ChevronUp className="w-5 h-5 text-purple-500" />;
      case 'emergency': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <MessageSquare className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMessageBorderColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'border-l-blue-500';
      case 'order': return 'border-l-orange-500';
      case 'poll': return 'border-l-purple-500';
      case 'emergency': return 'border-l-red-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Enhanced Sidebar */}
      <motion.div 
        initial={{ width: isCollapsed && !isMobile ? 80 : 320 }}
        animate={{ 
          width: isSidebarOpen ? 320 : (isMobile ? 0 : (isCollapsed ? 80 : 320))
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white border-r border-gray-200 flex flex-col relative z-30 overflow-hidden"
        style={{ minWidth: 0 }}
      >
        {/* User Profile Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            {/* Profile Picture or Initials */}
            {user?.profile_picture ? (
              <img 
                src={user.profile_picture} 
                alt={user.full_name || `${user.first_name} ${user.last_name}`}
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-200 flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-emerald-200 flex-shrink-0">
                <span className="text-white font-semibold text-lg">
                  {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                </span>
              </div>
            )}
            {!isCollapsed && (
              <motion.div 
                className="flex-1 min-w-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <h2 className="font-semibold text-gray-900 truncate">
                  {user?.full_name || `${user?.first_name} ${user?.last_name}`}
                </h2>
                <div className="flex flex-col space-y-0.5">
                  {user?.employee_id && (
                    <p className="text-xs text-emerald-600 font-medium">ID: {user.employee_id}</p>
                  )}
                  <p className="text-xs text-gray-500 truncate">
                    {user?.department_name || 'No Department'}
                  </p>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${user?.is_online ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <span className="text-xs text-gray-500">
                      {user?.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Unread count */}
            {unreadCount > 0 && !isCollapsed && (
              <motion.div 
                className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[1.5rem] h-6 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                {unreadCount}
              </motion.div>
            )}
          </div>

          {/* Filter Tabs - Hidden when collapsed */}
          {!isCollapsed && (
            <motion.div 
              className="flex space-x-1 bg-gray-100 rounded-lg p-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              {[
                { key: 'all', label: 'All' },
                { key: 'announcements', label: 'News' },
                { key: 'orders', label: 'Orders' },
                { key: 'polls', label: 'Polls' },
                { key: 'emergency', label: 'Alert' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setSelectedFilter(filter.key as any)}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all duration-200 ${
                    selectedFilter === filter.key
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto">
          {!isCollapsed ? (
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-600">Loading messages...</span>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No messages to display</p>
                </div>
              ) : (
                filteredMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-lg border-l-4 ${getMessageBorderColor(message.type)} p-4 shadow-sm hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getMessageIcon(message.type)}
                        <span className="font-semibold text-gray-900 text-sm">{message.sender}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-3 leading-relaxed">{message.content}</p>
                    
                    {message.poll && (
                      <div className="space-y-2 mb-3">
                        <p className="font-medium text-sm text-gray-900">{message.poll.question}</p>
                        {message.poll.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleVote(message.id, option.id)}
                            disabled={message.poll?.userVote !== undefined}
                            className={`w-full text-left p-2 rounded border transition-colors ${
                              message.poll?.userVote === option.id
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm">{option.text}</span>
                              <span className="text-xs text-gray-500">{option.votes} votes</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {(message.type === 'emergency' || message.type === 'order') && (
                          <button
                            onClick={() => handleAcknowledge(message.id)}
                            disabled={message.isAcknowledged}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              message.isAcknowledged
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>{message.isAcknowledged ? 'Acknowledged' : 'Acknowledge'}</span>
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        {!message.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                        <span className="capitalize">{message.type}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            // Collapsed view - minimal message indicators
            <div className="p-2 space-y-2">
              {filteredMessages.slice(0, 5).map((message) => (
                <div
                  key={message.id}
                  className={`w-12 h-12 rounded-lg border-l-4 ${getMessageBorderColor(message.type)} bg-white flex items-center justify-center group relative`}
                >
                  {getMessageIcon(message.type)}
                  {!message.isRead && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}
                  {/* Message preview tooltip */}
                  <div className="absolute left-full ml-2 w-64 p-3 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="font-semibold mb-1">{message.sender}</div>
                    <div className="truncate">{message.content}</div>
                    <div className="text-gray-400 mt-1">{message.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collapse Toggle Button - Desktop Only */}
        {!isMobile && (
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full flex items-center justify-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Enhanced Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Button */}
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              {/* Desktop Sidebar Toggle */}
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden lg:block"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Company Communications</h1>
                <p className="text-sm text-gray-500">
                  Receive announcements, orders, and participate in polls
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Display */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages to show</h3>
              <p className="text-gray-500">Check back later for company announcements and updates</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl shadow-sm border-l-4 ${getMessageBorderColor(msg.type)} p-6 hover:shadow-md transition-shadow`}
                >
                  {/* Message Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getMessageIcon(msg.type)}
                      <div>
                        <h4 className="font-semibold text-gray-900">{msg.sender}</h4>
                        <p className="text-sm text-gray-500">{msg.timestamp}</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Message Content */}
                  <div className="mb-4">
                    <p className="text-gray-700 leading-relaxed">{msg.content}</p>
                  </div>

                  {/* Poll Content */}
                  {msg.poll && (
                    <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900">{msg.poll.question}</h5>
                      <div className="space-y-2">
                        {msg.poll.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleVote(msg.id, option.id)}
                            disabled={msg.poll?.userVote !== undefined}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              msg.poll?.userVote === option.id
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span>{option.text}</span>
                              <span className="text-sm text-gray-500">{option.votes} votes</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">Total votes: {msg.poll.totalVotes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-4">
                      {(msg.type === 'order' || msg.type === 'emergency') && (
                        <button
                          onClick={() => handleAcknowledge(msg.id)}
                          disabled={msg.isAcknowledged}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            msg.isAcknowledged
                              ? 'bg-green-100 text-green-800 cursor-not-allowed'
                              : 'bg-emerald-500 text-white hover:bg-emerald-600'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>{msg.isAcknowledged ? 'Acknowledged' : 'Acknowledge'}</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 capitalize">
                      {msg.type} • {msg.isRead ? 'Read' : 'Unread'}
                      {msg.isAcknowledged && ' • Acknowledged'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Mobile Sidebar Overlay */}
      {isSidebarOpen && isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSidebar}
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
        />
      )}
    </div>
  );
};

export default ChatInterface;