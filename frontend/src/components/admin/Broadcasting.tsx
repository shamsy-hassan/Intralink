import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Building, 
  User, 
  Globe,
  AlertTriangle,
  Edit2,
  Trash2
} from 'lucide-react';
import { api } from '../../lib/api';

interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  type: 'broadcast' | 'department' | 'direct';
  scope: string;
  target_department_id?: number;
  target_user_id?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  scheduled_for?: string;
  status: 'draft' | 'sent' | 'scheduled';
  created_at: string;
  sender: {
    name: string;
  };
  department?: {
    name: string;
  };
  recipient?: {
    name: string;
  };
}

interface Department {
  id: number;
  name: string;
  description?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  department?: {
    name: string;
  };
}

const Broadcasting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'compose' | 'sent' | 'scheduled'>('compose');
  const [messageType, setMessageType] = useState<'broadcast' | 'department' | 'direct'>('broadcast');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [sentMessages, setSentMessages] = useState<BroadcastMessage[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<BroadcastMessage[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load departments, users, and messages in parallel
      const [deptResponse, usersResponse, messagesResponse] = await Promise.all([
        api.get('/messages/'),
        api.get('/departments/'),
        api.get('/users/')
      ]);

      setDepartments(deptResponse.data.departments || []);
      setUsers(usersResponse.data.users || []);
      
      const messages = messagesResponse.data.messages || [];
      // Separate sent and scheduled messages
      setSentMessages(messages.filter((msg: BroadcastMessage) => msg.status === 'sent'));
      setScheduledMessages(messages.filter((msg: BroadcastMessage) => msg.status === 'scheduled'));
      
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (messageType !== 'broadcast' && !selectedTarget) {
      alert('Please select a target');
      return;
    }

    try {
      setLoading(true);
      
      const messageData = {
        title: title.trim(),
        content: content.trim(),
        type: messageType === 'broadcast' ? 'announcement' : messageType === 'department' ? 'department' : 'direct',
        scope: messageType === 'broadcast' ? 'company' : messageType === 'department' ? 'department' : 'direct',
        priority,
        ...(messageType === 'department' && { department_id: parseInt(selectedTarget) }),
        ...(messageType === 'direct' && { recipient_id: parseInt(selectedTarget) }),
        ...(isScheduled && scheduledDate && scheduledTime && {
          scheduled_for: `${scheduledDate}T${scheduledTime}:00`
        })
      };

      await api.post('/messages/', messageData);
      
      // Reset form
      setTitle('');
      setContent('');
      setSelectedTarget('');
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('');
      
      // Refresh data
      await loadData();
      
      alert('Message sent successfully!');
      
    } catch (err: any) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTargetDisplay = (message: BroadcastMessage) => {
    if (message.type === 'broadcast') return 'All Employees';
    if (message.type === 'department') return message.department?.name || 'Unknown Department';
    if (message.type === 'direct') return message.recipient?.name || 'Unknown User';
    return 'Unknown';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcasting</h1>
          <p className="text-gray-600">Send messages to employees across the organization</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span>Quick Message</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['compose', 'sent', 'scheduled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'compose' | 'sent' | 'scheduled')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Compose Message</h2>
          
          {/* Message Type Selection */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { type: 'broadcast', icon: Globe, label: 'Company Wide', desc: 'Send to all employees' },
              { type: 'department', icon: Building, label: 'Department', desc: 'Send to specific department' },
              { type: 'direct', icon: User, label: 'Individual', desc: 'Send to specific person' }
            ].map(({ type, icon: Icon, label, desc }) => (
              <button
                key={type}
                onClick={() => setMessageType(type as 'broadcast' | 'department' | 'direct')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  messageType === type
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${
                  messageType === type ? 'text-emerald-600' : 'text-gray-600'
                }`} />
                <p className={`font-medium ${
                  messageType === type ? 'text-emerald-900' : 'text-gray-900'
                }`}>{label}</p>
                <p className="text-xs text-gray-500 mt-1">{desc}</p>
              </button>
            ))}
          </div>

          {/* Target Selection */}
          {messageType !== 'broadcast' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select {messageType === 'department' ? 'Department' : 'User'}
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Select {messageType === 'department' ? 'department' : 'user'}</option>
                {messageType === 'department' 
                  ? departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))
                  : users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))
                }
              </select>
            </div>
          )}

          {/* Priority Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { level: 'low', color: 'green', label: 'Low' },
                { level: 'medium', color: 'yellow', label: 'Medium' },
                { level: 'high', color: 'orange', label: 'High' },
                { level: 'urgent', color: 'red', label: 'Urgent' }
              ].map(({ level, color, label }) => (
                <button
                  key={level}
                  onClick={() => setPriority(level as 'low' | 'medium' | 'high' | 'urgent')}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                    priority === level
                      ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter message title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Content */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your message content..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Schedule Options */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Schedule for later</span>
              </label>
            </div>
            
            {isScheduled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              onClick={() => {
                setTitle('');
                setContent('');
                setSelectedTarget('');
                setIsScheduled(false);
                setScheduledDate('');
                setScheduledTime('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleSendMessage}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isScheduled ? 'Schedule' : 'Send'} Message</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Sent Messages Tab */}
      {activeTab === 'sent' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sent Messages</h2>
          
          <div className="space-y-4">
            {sentMessages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No messages sent yet</p>
            ) : (
              sentMessages.map((message) => (
                <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{message.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{message.content}</p>
                      <div className="flex items-center space-x-4 mt-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(message.priority)}`}>
                          {message.priority.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          To: {getTargetDisplay(message)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Scheduled Messages Tab */}
      {activeTab === 'scheduled' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Scheduled Messages</h2>
          
          <div className="space-y-4">
            {scheduledMessages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No scheduled messages</p>
            ) : (
              scheduledMessages.map((message) => (
                <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{message.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{message.content}</p>
                      <div className="flex items-center space-x-4 mt-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(message.priority)}`}>
                          {message.priority.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          To: {getTargetDisplay(message)}
                        </span>
                        <span className="text-sm text-gray-500">
                          Scheduled: {message.scheduled_for ? formatDate(message.scheduled_for) : 'Unknown'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-gray-400 hover:text-blue-500 p-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Broadcasting;