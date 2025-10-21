import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireAdmin = false,
  allowedRoles = [],
  redirectTo
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo || "/user/onboarding"} state={{ from: location }} replace />;
  }

  // If user is authenticated but route doesn't require auth (like login pages)
  if (!requireAuth && isAuthenticated) {
    return <Navigate to={redirectTo || "/"} replace />;
  }

  // If admin access is required
  if (requireAdmin && (!user || !['admin', 'hr'].includes(user.role))) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // If specific roles are required
  if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
    const defaultRedirect = user ? "/" : "/user/onboarding";
    return <Navigate to={redirectTo || defaultRedirect} state={{ from: location }} replace />;
  }

  // If all checks pass, render the protected content
  return <>{children}</>;
};

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  return (
    <ProtectedRoute requireAuth={true} requireAdmin={true} redirectTo="/admin/login">
      {children}
    </ProtectedRoute>
  );
};

interface UserRouteProps {
  children: React.ReactNode;
}

export const UserRoute: React.FC<UserRouteProps> = ({ children }) => {
  return (
    <ProtectedRoute requireAuth={true} allowedRoles={['admin', 'hr', 'staff']} redirectTo="/user/onboarding">
      {children}
    </ProtectedRoute>
  );
};

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children, redirectTo }) => {
  return (
    <ProtectedRoute requireAuth={false} redirectTo={redirectTo}>
      {children}
    </ProtectedRoute>
  );
};