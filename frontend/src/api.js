const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const IMG_BASE = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:5000';

const getToken = () => localStorage.getItem('au_token');

const req = async (method, path, body, isForm = false) => {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  return res.json();
};

export const api = {
  // Auth
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  register: (formData) => req('POST', '/auth/register', formData, true),
  me: () => req('GET', '/auth/me'),
  verifyEmail: (token, email) => req('GET', `/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`),
  resendVerify: (email) => req('POST', '/auth/resend-verify', { email }),

  // Users
  getExperts: () => req('GET', '/experts'),
  getSeekers: () => req('GET', '/users'),
  updateUser: (id, formData) => req('PUT', `/users/${id}`, formData, true),

  // Consultations
  getConsultations: () => req('GET', '/consultations'),
  getPublicMatches: () => req('GET', '/consultations/public'),
  createConsultation: (data) => req('POST', '/consultations', data),
  acceptConsultation: (id) => req('PATCH', `/consultations/${id}/accept`),
  rejectConsultation: (id) => req('PATCH', `/consultations/${id}/reject`),
  evaluateConsultation: (id, data) => req('PATCH', `/consultations/${id}/evaluate`, data),
  sendConsultationMessage: (id, data) => req('POST', `/consultations/${id}/messages`, data),
  scheduleConsultation: (id, data) => req('PATCH', `/consultations/${id}/schedule`, data),
  uploadReportFile: (id, formData) => req('POST', `/consultations/${id}/report-file`, formData, true),

  // Stats
  getStats: () => req('GET', '/main/stats'),
  getLiveFeeds: () => req('GET', '/main/live-feeds'),

  // Admin
  adminLogin: (password) => req('POST', '/admin/login', { password }),
  adminStats: () => adminReq('GET', '/admin/stats'),
  adminGetUsers: () => adminReq('GET', '/admin/users'),
  adminCreateUser: (data) => adminReq('POST', '/admin/users', data),
  adminUpdateUser: (id, data) => adminReq('PUT', `/admin/users/${id}`, data),
  adminDeleteUser: (id) => adminReq('DELETE', `/admin/users/${id}`),
  adminGetConsultations: () => adminReq('GET', '/admin/consultations'),
  adminDeleteConsultation: (id) => adminReq('DELETE', `/admin/consultations/${id}`),
};

const getAdminToken = () => localStorage.getItem('admin_token');
const adminReq = async (method, path, body) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAdminToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
};
