import React from 'react';
import { useAuth } from '../../context/AuthContext';

const AuthDebug: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">Loading auth status...</div>;
  }

  return (
    <div className="fixed top-4 right-4 p-4 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-w-sm">
      <h3 className="font-bold text-lg mb-2">Auth Debug Info</h3>
      <div className="space-y-2 text-sm">
        <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        {user ? (
          <>
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Role:</strong> {user.role}</p>
            <p><strong>Department ID:</strong> {user.department_id || 'None'}</p>
            <p><strong>Full Name:</strong> {user.full_name}</p>
            <p><strong>Status:</strong> {user.status}</p>
          </>
        ) : (
          <p className="text-red-600">No user data available</p>
        )}
        <div className="mt-2 pt-2 border-t">
          <p><strong>Token exists:</strong> {localStorage.getItem('access_token') ? 'Yes' : 'No'}</p>
          <p><strong>Refresh token:</strong> {localStorage.getItem('refresh_token') ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
};

export default AuthDebug;