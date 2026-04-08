import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('firewatch_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('firewatch_token');
      localStorage.removeItem('firewatch_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const register = (data: any) => api.post('/auth/register', data);
export const login = (data: any) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateSettings = (data: any) => api.put('/auth/settings', data);

// Detection
export const analyzeImage = (formData: FormData) =>
  api.post('/detect/analyze', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getAlerts = (params?: any) => api.get('/detect/alerts', { params });
export const acknowledgeAlert = (id: string, data?: any) => api.post(`/detect/alert/acknowledge/${id}`, data || {});
export const getDetectionStats = () => api.get('/detect/stats');

// Cameras
export const getCameras = () => api.get('/cameras/');
export const createCamera = (data: any) => api.post('/cameras/', data);
export const getCamera = (id: string) => api.get(`/cameras/${id}`);
export const updateCamera = (id: string, data: any) => api.put(`/cameras/${id}`, data);
export const deleteCamera = (id: string) => api.delete(`/cameras/${id}`);

export default api;
