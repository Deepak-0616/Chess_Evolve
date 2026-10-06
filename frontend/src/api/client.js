import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000/api/v1"
    : "/api/v1");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Response interceptor for unified error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('chess_evolve_session');
      if (typeof window !== "undefined" && window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 429) {
      console.warn('[API] Rate limit exceeded. Please wait before retrying.');
    }
    return Promise.reject(error);
  }
);
