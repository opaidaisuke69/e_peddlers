import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'web',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('epeddlers_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor to handle session expiration or errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired
      const path = window.location.pathname;
      if (!path.includes('/login')) {
        localStorage.removeItem('epeddlers_token');
        localStorage.removeItem('epeddlers_user');
      }
    }
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  staffLogin: (data) => api.post('/auth/staff-login', data),
  peddlerLogin: (data) => api.post('/auth/peddler/login', data),
  peddlerRequestOtp: (data) => api.post('/auth/peddler/otp-request', data),
  peddlerVerifyOtp: (data) => api.post('/auth/peddler/otp-verify', data),
  getMe: () => api.get('/auth/me'),
  getUsers: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  updateUserStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
};

export const dashboardApi = {
  getMetrics: () => api.get('/dashboard'),
};

export const applicationApi = {
  list: (params) => api.get('/applications', { params }),
  track: (search) => api.get('/applications/track', { params: { search } }),
  get: (id) => api.get(`/applications/${id}`),
  create: (data) => api.post('/applications', data),
  resubmit: (id, data) => api.post(`/applications/${id}/resubmit`, data),
  delete: (id) => api.delete(`/applications/${id}`),
  getRenewalInfo: (identifier) => api.get('/applications/renewal-info', { params: identifier ? { identifier } : {} }),
  searchRenewal: (identifier) => api.get('/applications/renewal-search', { params: { identifier } }),
  uploadDocument: (formData) => api.post('/applications/upload-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const workflowApi = {
  adminDecision: (id, data) => api.post(`/applications/${id}/admin-decision`, data),
  inspectorDecision: (id, data) => api.post(`/applications/${id}/inspector-decision`, data),
  sanitaryDecision: (id, data) => api.post(`/applications/${id}/sanitary-decision`, data),
  releasePermit: (id) => api.post(`/applications/${id}/release-permit`),
  getPermitViewUrl: (id) => `${API_BASE_URL}/permits/${id}/view`,
  getQrCode: (peddlerId) => api.get(`/peddlers/${peddlerId}/qr-code`),
};

export const paymentApi = {
  getFeeBreakdown: (id) => api.get(`/applications/${id}/fee-breakdown`),
  createPayMongoQrPh: (id) => api.post(`/applications/${id}/paymongo-qrph`),
  simulatePayMongoPayment: (id) => api.post(`/applications/${id}/simulate-paymongo`),
  verifyOnlinePayment: (id, data) => api.post(`/applications/${id}/verify-online-payment`, data),
  recordCashPayment: (id, data) => api.post(`/applications/${id}/cash-payment`, data),
  rejectPayment: (id, data) => api.post(`/applications/${id}/reject-payment`, data),
};

export const arkabalaApi = {
  scan: (token) => api.get('/arkabala/scan', { params: { token } }),
  collect: (data) => api.post('/arkabala/collect', data),
  listWeeks: () => api.get('/arkabala/weeks'),
  listCollections: (params) => api.get('/arkabala/collections', { params }),
  reconcile: (ids) => api.post('/arkabala/reconcile', { collection_ids: ids }),
};

export const violationApi = {
  listTypes: () => api.get('/violations/types'),
  list: (params) => api.get('/violations', { params }),
  create: (data) => api.post('/violations', data),
  createPayMongoQrPh: (id) => api.post(`/violations/${id}/paymongo-qrph`),
  simulatePayMongo: (id) => api.post(`/violations/${id}/simulate-paymongo`),
  settle: (id, data) => api.post(`/violations/${id}/settle`, data),
};

export const feeApi = {
  list: () => api.get('/fees'),
  create: (data) => api.post('/fees', data),
  update: (id, data) => api.put(`/fees/${id}`, data),
  toggle: (id) => api.patch(`/fees/${id}/toggle`),
};

export const reportApi = {
  getCollections: (params) => api.get('/reports/collections', { params }),
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getApplications: (params) => api.get('/reports/applications', { params }),
  getMarketStalls: (params) => api.get('/reports/market-stalls', { params }),
  getPeddlers: (params) => api.get('/reports/peddlers', { params }),
  getActivityLogs: (params) => api.get('/reports/activity-logs', { params }),
  getExportUrl: (endpoint, format = 'csv', params = {}) => {
    const token = localStorage.getItem('epeddlers_token') || localStorage.getItem('token') || '';
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
    const q = new URLSearchParams({ ...cleanParams, format, token });
    return `${API_BASE_URL}/reports/${endpoint}?${q.toString()}`;
  },
  getCsvExportUrl: (params) => {
    const token = localStorage.getItem('epeddlers_token') || localStorage.getItem('token') || '';
    const q = new URLSearchParams({ ...params, format: 'csv', token });
    return `${API_BASE_URL}/reports/collections?${q.toString()}`;
  },
};

export const notificationApi = {
  list: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

export const activityLogApi = {
  list: (params) => api.get('/activity-logs', { params }),
};

export const vendorMapApi = {
  getSlots: () => api.get('/vendor-map/slots'),
  updateSlot: (id, data) => api.put(`/vendor-map/slots/${id}`, data),
  batchUpdate: (data) => api.post('/vendor-map/slots/batch', data),
  getPeddlers: () => api.get('/vendor-map/peddlers'),
};

export default api;
