/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const normalizeRole = (role) => {
  if (!role) return 'CITIZEN';
  const upper = String(role).trim().toUpperCase();
  if (upper === 'CITIZEN') return 'CITIZEN';
  if (upper === 'OFFICER' || upper === 'MUNICIPAL_OFFICER') return 'MUNICIPAL_OFFICER';
  if (upper === 'FIELD_WORKER' || upper === 'WORKER') return 'FIELD_WORKER';
  if (upper === 'ADMIN' || upper === 'SYSTEM_ADMIN') return 'SYSTEM_ADMIN';
  if (upper === 'SUPER_ADMIN' || upper === 'SUPERADMIN') return 'SUPER_ADMIN';
  return 'CITIZEN';
};

export const getDashboardRoute = (role) => {
  const normalized = normalizeRole(role);
  const routes = {
    CITIZEN: '/citizen/dashboard',
    MUNICIPAL_OFFICER: '/officer/dashboard',
    FIELD_WORKER: '/field-worker/dashboard',
    SYSTEM_ADMIN: '/admin/dashboard',
    SUPER_ADMIN: '/super-admin/dashboard',
  };
  return routes[normalized] || '/citizen/dashboard';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || sessionStorage.getItem('token')
  );
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      const profile = { ...res.data, role: normalizeRole(res.data.role) };
      setUser(profile);
    } catch {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (identifier, password, rememberMe = false) => {
    // Clear any stale tokens from previous sessions before authenticating
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');

    const res = await authAPI.login({ identifier, email: identifier, password, rememberMe });
    const data = { ...res.data, role: normalizeRole(res.data.role) };

    if (data.token) {
      if (rememberMe) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }
      setToken(data.token);
    }

    setUser(data);
    return data;
  };

  // Public Citizen Registration — creates CITIZEN account in DB without auto-logging in,
  // allowing redirection to /login with confirmation message.
  const register = async (userData) => {
    const res = await authAPI.register(userData);
    return res.data;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore network error on logout cleanup
    }
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const role = normalizeRole(user?.role);
  const isAdmin = () => role === 'SYSTEM_ADMIN' || role === 'SUPER_ADMIN';
  const isSuperAdmin = () => role === 'SUPER_ADMIN';
  const isOfficer = () => role === 'MUNICIPAL_OFFICER';
  const isFieldWorker = () => role === 'FIELD_WORKER';
  const isCitizen = () => role === 'CITIZEN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAdmin,
        isSuperAdmin,
        isOfficer,
        isFieldWorker,
        isCitizen,
        fetchProfile,
        getDashboardRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
