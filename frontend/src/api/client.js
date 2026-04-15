import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const savedLocation = localStorage.getItem('clientLocation');
  if (savedLocation) {
    try {
      const { latitude, longitude } = JSON.parse(savedLocation);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        config.headers['X-Client-Latitude'] = latitude;
        config.headers['X-Client-Longitude'] = longitude;
      }
    } catch {
      localStorage.removeItem('clientLocation');
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(err);
  }
);

export default api;
