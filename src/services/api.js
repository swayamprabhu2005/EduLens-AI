import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: (credentials) => api.post('/auth/login', new URLSearchParams(credentials)),
  register: (userData) => api.post('/auth/register', userData),
};

export const sessions = {
  list: () => api.get('/sessions'),
  create: (sessionData) => api.post('/sessions', sessionData),
  goLive: (sessionId) => api.patch(`/sessions/${sessionId}/go_live`),
  endSession: (sessionId) => api.patch(`/sessions/${sessionId}/end`),
};

export const analytics = {
  getStudent: (sessionId) => api.get(`/analytics/student/${sessionId}`),
  getTeacher: (sessionId) => api.get(`/analytics/teacher/${sessionId}`),
};

export const reports = {
  export: (sessionId) => api.get(`/reports/${sessionId}/export`),
  uploadAudio: (sessionId, formData) => api.post(`/reports/${sessionId}/upload_audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAISummary: (sessionId) => api.get(`/reports/${sessionId}/ai_summary`),
  askAI: (sessionId, question) => api.post(`/reports/${sessionId}/ask`, { question }),
};

export default api;
