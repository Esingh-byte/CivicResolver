import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, normalizeRole, getDashboardRoute } from '../context/AuthContext';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = normalizeRole(user.role);

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedAllowed = new Set(allowedRoles.map(normalizeRole));
    if (normalizedAllowed.has('SYSTEM_ADMIN')) {
      normalizedAllowed.add('SUPER_ADMIN');
    }

    if (!normalizedAllowed.has(userRole)) {
      return <Navigate to={getDashboardRoute(userRole)} replace />;
    }
  }

  return children;
};

export default PrivateRoute;
