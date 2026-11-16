import axios from 'axios';

// ─── Centralized API Configuration ───────────────────────────
// Uses VITE_API_URL from environment or defaults to '/api' (proxied by Vite in dev).
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send and receive HttpOnly auth cookies
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor to attach Bearer token if stored in localStorage or sessionStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling expired sessions on protected calls
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const reqUrl = error.config?.url || '';
    const isAuthRoute =
      reqUrl.includes('/auth/login') ||
      reqUrl.includes('/auth/register') ||
      reqUrl.includes('/auth/profile') ||
      reqUrl.includes('/auth/invitations') ||
      reqUrl.includes('/auth/forgot-password') ||
      reqUrl.includes('/auth/reset-password');

    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/staff/login'
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth & Staff Onboarding APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
  createInvitation: (data) => api.post('/auth/invitations', data),
  getInvitations: () => api.get('/auth/invitations'),
  verifyInvitation: (token) => api.get(`/auth/invitations/verify/${token}`),
  activateInvitation: (data) => api.post('/auth/invitations/activate', data),
};

// Complaint APIs
export const complaintAPI = {
  getMeta: () => api.get('/complaints/meta'),
  create: (data) => api.post('/complaints', data),
  getAll: (params) => api.get('/complaints', { params }),
  getAllAdmin: (params) => api.get('/complaints/all', { params }),
  getById: (id) => api.get(`/complaints/${id}`),
  updateStatus: (id, data) => api.put(`/complaints/${id}/status`, data),
  upvote: (id) => api.put(`/complaints/${id}/upvote`),
  addFeedback: (id, data) => api.put(`/complaints/${id}/feedback`, data),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  verify: (id, data) => api.put(`/admin/verify/${id}`, data),
  assign: (id, data) => api.put(`/admin/assign/${id}`, data),
  getOfficers: () => api.get('/admin/officers'),
  getDepartments: () => api.get('/admin/departments'),
};

// Officer & Field Worker APIs
export const officerAPI = {
  getComplaints: (params) => api.get('/officer/complaints', { params }),
  getStats: () => api.get('/officer/stats'),
  getStaff: () => api.get('/officer/staff'),
  updateProgress: (id, data) => api.put(`/officer/progress/${id}`, data),
  resolve: (id, data) => api.put(`/officer/resolve/${id}`, data),
};

// Comment APIs
export const commentAPI = {
  add: (complaintId, data) => api.post(`/comments/${complaintId}`, data),
  getAll: (complaintId) => api.get(`/comments/${complaintId}`),
};

// Notification APIs
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export default api;
