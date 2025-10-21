import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import ChatInterface from './components/chat/ChatInterface';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminLogin from './components/admin/AdminLogin';
import { PublicRoute } from './components/common/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider } from './components/common/LoadingSystem';
import { ToastProvider } from './components/common/Toast';

const AppContent: React.FC = () => {
  const { user, isLoading, isInitialized, isAuthenticated, checkAuthStatus } = useAuth();

  useEffect(() => {
    // The AuthContext already handles automatic session restoration
    // This is just for any additional auth status checks if needed
  }, []);

  const handleOnboardingComplete = async (userData: any) => {
    try {
      console.log('Onboarding completed:', userData);
      // Refresh auth state - the user state update will trigger re-render
      await checkAuthStatus();
    } catch (error) {
      console.error('Onboarding failed:', error);
    }
  };

  // Show loading screen during auth initialization
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">IntraLink</h2>
          <p className="text-gray-600">
            {!isInitialized ? 'Initializing...' : 'Restoring your session...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Admin routes */}
        <Route
          path="/admin/login"
          element={
            <PublicRoute redirectTo="/admin/dashboard">
              <AdminLogin />
            </PublicRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            !isInitialized ? (
              <LoadingSpinner size="lg" className="mx-auto my-12" />
            ) : isAuthenticated ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        />
        {/* User routes */}
        <Route
          path="/user/onboarding"
          element={user ? <Navigate to="/" replace /> : <OnboardingFlow onComplete={handleOnboardingComplete} />}
        />
        <Route
          path="/user/dashboard"
          element={user ? <ChatInterface user={user} /> : <Navigate to="/user/onboarding" />}
        />
        <Route
          path="/chat"
          element={user ? <ChatInterface user={user} /> : <Navigate to="/user/onboarding" />}
        />
        {/* Root path - always shows onboarding/Work ID input */}
        <Route
          path="/"
          element={<OnboardingFlow onComplete={handleOnboardingComplete} />}
        />
        {/* Catch-all route */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <LoadingProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </LoadingProvider>
  );
}

export default App;
