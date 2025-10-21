import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  AlertTriangle, 
  Users,
  TrendingUp,
  Clock,
  Send,
  CheckCircle,
  Eye
} from 'lucide-react';
import { api } from '../../lib/api';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  todayMessages: number;
  totalDepartments: number;
  pendingAcknowledgments: number;
  emergencyAlerts: number;
  activePolls: number;
}

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    todayMessages: 0,
    totalDepartments: 0,
    pendingAcknowledgments: 0,
    emergencyAlerts: 0,
    activePolls: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch users statistics
      const usersResponse = await api.get('/users/');
      const users = usersResponse.data.users || [];
      
      // Fetch departments
      const departmentsResponse = await api.get('/departments/');
      const departments = departmentsResponse.data.departments || [];
      
      // Fetch messages
      const messagesResponse = await api.get('/messages/');
      const messages = messagesResponse.data.messages || [];
      
      // Fetch alerts
      const alertsResponse = await api.get('/alerts/');
      const alerts = alertsResponse.data.alerts || [];

      // Calculate statistics
      const today = new Date().toISOString().split('T')[0];
      const todayMessages = messages.filter((msg: any) => 
        msg.created_at?.startsWith(today)
      ).length;

      const activeUsers = users.filter((user: any) => 
        user.status === 'active'
      ).length;

      const pendingAcknowledgments = messages.filter((msg: any) => 
        (msg.type === 'emergency' || msg.type === 'order') && !msg.is_acknowledged
      ).length;

      const emergencyAlerts = alerts.filter((alert: any) => 
        alert.type === 'emergency' && alert.is_active
      ).length;

      const activePolls = messages.filter((msg: any) => 
        msg.type === 'poll' && msg.poll?.is_active
      ).length;

      setStats({
        totalUsers: users.length,
        activeUsers,
        totalMessages: messages.length,
        todayMessages,
        totalDepartments: departments.length,
        pendingAcknowledgments,
        emergencyAlerts,
        activePolls
      });
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Messages Sent Today',
      value: stats.todayMessages.toString(),
      change: `+${Math.max(0, stats.todayMessages - 10)}`,
      changeType: 'increase' as const,
      icon: <Send className="w-6 h-6" />,
      color: 'bg-emerald-500'
    },
    {
      title: 'Active Employees',
      value: stats.activeUsers.toString(),
      change: `${stats.totalUsers - stats.activeUsers} inactive`,
      changeType: 'neutral' as const,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-500'
    },
    {
      title: 'Pending Acknowledgments',
      value: stats.pendingAcknowledgments.toString(),
      change: stats.pendingAcknowledgments > 5 ? 'High' : 'Normal',
      changeType: stats.pendingAcknowledgments > 5 ? 'increase' as const : 'decrease' as const,
      icon: <Clock className="w-6 h-6" />,
      color: 'bg-orange-500'
    },
    {
      title: 'Active Polls',
      value: stats.activePolls.toString(),
      change: '+1',
      changeType: 'increase' as const,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-purple-500'
    },
    {
      title: 'Emergency Alerts',
      value: stats.emergencyAlerts.toString(),
      change: stats.emergencyAlerts > 0 ? 'Active' : 'None',
      changeType: stats.emergencyAlerts > 0 ? 'increase' as const : 'neutral' as const,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'bg-red-500'
    },
    {
      title: 'Total Departments',
      value: stats.totalDepartments.toString(),
      change: 'Active',
      changeType: 'neutral' as const,
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'bg-indigo-500'
    }
  ];

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
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardStats}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const recentActivity = [
    {
      id: 1,
      type: 'message',
      message: 'New announcement sent to all departments',
      timestamp: '5 minutes ago',
      icon: <Send className="w-4 h-4 text-emerald-500" />
    },
    {
      id: 2,
      type: 'alert',
      message: 'Emergency alert sent to Engineering department',
      timestamp: '2 hours ago',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />
    },
    {
      id: 3,
      type: 'poll',
      message: 'New poll created: "Preferred lunch time"',
      timestamp: '4 hours ago',
      icon: <TrendingUp className="w-4 h-4 text-purple-500" />
    },
    {
      id: 4,
      type: 'acknowledgment',
      message: '15 employees acknowledged safety training completion',
      timestamp: '6 hours ago',
      icon: <CheckCircle className="w-4 h-4 text-green-500" />
    }
  ];

  const departmentStats = [
    { name: 'Engineering', users: 45, unreadMessages: 8, activePolls: 2 },
    { name: 'Sales', users: 32, unreadMessages: 3, activePolls: 1 },
    { name: 'HR', users: 12, unreadMessages: 1, activePolls: 0 },
    { name: 'Marketing', users: 28, unreadMessages: 5, activePolls: 1 },
    { name: 'Finance', users: 18, unreadMessages: 2, activePolls: 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 
                    stat.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">from yesterday</span>
                </div>
              </div>
              <div className={`${stat.color} rounded-lg p-3 text-white`}>
                {stat.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Communication Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Department Communication Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Communication Overview</h3>
          <div className="space-y-4">
            {departmentStats.map((dept) => (
              <div key={dept.name} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{dept.name}</p>
                  <p className="text-xs text-gray-500">{dept.users} employees</p>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{dept.unreadMessages}</p>
                    <p className="text-xs text-gray-500">Unread</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-900">{dept.activePolls}</p>
                    <p className="text-xs text-gray-500">Polls</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/admin/broadcasting')}
            className="p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-left group"
          >
            <Send className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-gray-900">Send Announcement</p>
            <p className="text-xs text-gray-500">Broadcast to all employees</p>
          </button>
          <button 
            onClick={() => navigate('/admin/broadcasting')}
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left group"
          >
            <TrendingUp className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-gray-900">Create Poll</p>
            <p className="text-xs text-gray-500">Gather employee feedback</p>
          </button>
          <button 
            onClick={() => navigate('/admin/alerts')}
            className="p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-left group"
          >
            <AlertTriangle className="w-6 h-6 text-red-600 mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-gray-900">Emergency Alert</p>
            <p className="text-xs text-gray-500">Send urgent notification</p>
          </button>
          <button 
            onClick={() => navigate('/admin/analytics')}
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left group"
          >
            <Eye className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-gray-900">View Analytics</p>
            <p className="text-xs text-gray-500">Communication metrics</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardOverview;
