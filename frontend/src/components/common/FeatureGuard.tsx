import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface FeatureGuardProps {
  children: React.ReactNode;
  requiredRoles: string[];
  fallback?: React.ReactNode;
  feature?: string;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  children,
  requiredRoles,
  fallback,
  feature
}) => {
  const { user } = useAuth();

  // Check if user has required role for this feature
  if (!user || !requiredRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="p-8 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600">
            {feature 
              ? `You don't have permission to access ${feature}.` 
              : "You don't have permission to access this feature."
            }
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Current role: <span className="font-medium capitalize">{user?.role}</span>
            <br />
            Required roles: <span className="font-medium">{requiredRoles.join(', ')}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Specific feature guards for common use cases
export const EmergencyAlertsGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureGuard requiredRoles={['admin']} feature="Emergency Alerts">
    {children}
  </FeatureGuard>
);

export const UserManagementGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureGuard requiredRoles={['admin', 'hr']} feature="User Management">
    {children}
  </FeatureGuard>
);

export const SystemSettingsGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureGuard requiredRoles={['admin']} feature="System Settings">
    {children}
  </FeatureGuard>
);

export const BroadcastingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureGuard requiredRoles={['admin', 'hr']} feature="Broadcasting">
    {children}
  </FeatureGuard>
);