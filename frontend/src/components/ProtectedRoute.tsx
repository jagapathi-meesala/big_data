import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-6">
        <div className="text-center p-8 bg-white dark:bg-slate-800 shadow-xl rounded-xl max-w-md w-full border border-gray-150 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You do not have the required permissions to view this resource.
          </p>
          <a
            href="/dashboard"
            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
