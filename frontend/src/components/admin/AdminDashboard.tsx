import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  AlertTriangle, 
  LogOut, 
  Bell,
  Menu,
  X,
  Send,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Vote
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { EmergencyAlertsGuard, BroadcastingGuard } from '../common/FeatureGuard';
import DashboardOverview from './DashboardOverview';
import Broadcasting from './Broadcasting';
import EmergencyAlerts from './EmergencyAlerts';
import { VotingManagement } from './VotingManagement';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Enhanced sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifications] = useState(3); // Mock notification count

  const { user, logout } = useAuth();

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

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Additional role check for admin dashboard
  useEffect(() => {
    if (user && !['admin', 'hr'].includes(user.role)) {
      // User doesn't have admin access, redirect to appropriate page
      if (user.role === 'staff') {
        navigate('/user/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  // Update active tab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/broadcasting')) setActiveTab('broadcasting');
    else if (path.includes('/voting')) setActiveTab('voting');
    else if (path.includes('/alerts')) setActiveTab('alerts');
    else if (path.includes('/analytics')) setActiveTab('analytics');
    else setActiveTab('dashboard');
  }, [location.pathname]);

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

  // Role-based sidebar items
  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/admin/dashboard'
    },
    ...(user && ['admin', 'hr'].includes(user.role) ? [{
      id: 'broadcasting',
      label: 'Broadcasting',
      icon: <Send className="w-5 h-5" />,
      path: '/admin/broadcasting'
    }] : []),
    ...(user && ['admin', 'hr'].includes(user.role) ? [{
      id: 'voting',
      label: 'Voting & Polls',
      icon: <Vote className="w-5 h-5" />,
      path: '/admin/voting'
    }] : []),
    ...(user && user.role === 'admin' ? [{
      id: 'alerts',
      label: 'Emergency Alerts',
      icon: <AlertTriangle className="w-5 h-5" />,
      path: '/admin/alerts',
      badge: 2
    }] : []),
    {
      id: 'analytics',
      label: 'Communication Stats',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/admin/analytics'
    }
  ];  const handleLogout = () => {
    logout();
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Enhanced Sidebar */}
      <motion.div 
        initial={{ width: isCollapsed && !isMobile ? 80 : 280 }}
        animate={{ 
          width: isSidebarOpen ? 280 : (isMobile ? 0 : (isCollapsed ? 80 : 280))
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white shadow-xl border-r border-gray-200 flex flex-col relative z-30 overflow-hidden"
        style={{ minWidth: 0 }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <h2 className="text-lg font-bold text-gray-900">IntraLink</h2>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => navigate(item.path)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
              } py-3 rounded-xl transition-all duration-200 relative group ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                <span className="flex-shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <motion.span 
                    className="font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </div>
              
              {/* Badge */}
              {item.badge && !isCollapsed && (
                <motion.span 
                  className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === item.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-red-100 text-red-600'
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  {item.badge}
                </motion.span>
              )}

              {/* Collapsed tooltip */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  {item.label}
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </motion.button>
          ))}
        </nav>

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

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          {!isCollapsed ? (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                  </span>
                </div>
                <motion.div 
                  className="flex-1 min-w-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </motion.div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto group relative">
                <span className="text-white font-semibold text-sm">
                  {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
                </span>
                {/* User tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  {user?.first_name} {user?.last_name}
                  <br />
                  <span className="text-xs opacity-75 capitalize">{user?.role}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group relative"
              >
                <LogOut className="w-4 h-4" />
                {/* Logout tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  Sign Out
                </div>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Enhanced Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 capitalize">
                  {activeTab === 'dashboard' ? 'Communication Hub' : 
                   activeTab === 'broadcasting' ? 'Broadcasting' :
                   activeTab === 'alerts' ? 'Emergency Alerts' :
                   activeTab === 'analytics' ? 'Communication Analytics' : 
                   activeTab.replace('_', ' ')}
                </h1>
                <p className="text-sm text-gray-500">
                  Manage your organization's internal communication
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/admin/broadcasting')}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/admin/alerts')}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center space-x-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Emergency Alert</span>
                </motion.button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<DashboardOverview />} />
            <Route path="/dashboard" element={<DashboardOverview />} />
            <Route 
              path="/broadcasting" 
              element={
                <BroadcastingGuard>
                  <Broadcasting />
                </BroadcastingGuard>
              } 
            />
            <Route 
              path="/voting" 
              element={
                <BroadcastingGuard>
                  <VotingManagement />
                </BroadcastingGuard>
              } 
            />
            <Route 
              path="/alerts" 
              element={
                <EmergencyAlertsGuard>
                  <EmergencyAlerts />
                </EmergencyAlertsGuard>
              } 
            />
            <Route path="/analytics" element={<div className="text-center py-12"><p className="text-gray-500">Communication Analytics - Coming Soon</p></div>} />
          </Routes>
        </main>
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

export default AdminDashboard;