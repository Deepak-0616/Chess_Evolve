import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5000/api/v1"
    : "/api/v1");

// In-memory client response cache for instantaneous page navigation (<1ms)
const clientCache = new Map();
const DEFAULT_TTL_MS = 20000; // 20 seconds TTL

export const invalidateClientCache = (pattern) => {
  if (!pattern) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.includes(pattern)) {
      clientCache.delete(key);
    }
  }
};

export const clearClientCache = () => clientCache.clear();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const setAuthToken = (token) => {
  clientCache.clear();
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Request interceptor ensuring token is attached and handling client-side caching
apiClient.interceptors.request.use((config) => {
  if (!config.headers['Authorization']) {
    try {
      const keys = Object.keys(localStorage);
      const supabaseKey = keys.find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (supabaseKey) {
        const item = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
        const token = item?.access_token || item?.currentSession?.access_token;
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch {}
  }

  const method = config.method?.toLowerCase();

  // Invalidate cache on mutations
  if (method === 'post' || method === 'patch' || method === 'put' || method === 'delete') {
    clientCache.clear();
  }

  // Fast cache hit for GET requests
  if (method === 'get' && !config.skipCache) {
    const authHeader = config.headers['Authorization'] || '';
    const cacheKey = `${config.url}_${JSON.stringify(config.params || {})}_${authHeader}`;
    const cached = clientCache.get(cacheKey);

    if (cached && Date.now() < cached.expiresAt) {
      config.adapter = () =>
        Promise.resolve({
          data: cached.data,
          status: cached.status,
          statusText: 'OK (Cache)',
          headers: cached.headers,
          config,
          request: {},
          fromCache: true,
        });
    }
  }

  return config;
});

// Response interceptor for caching and unified error handling
apiClient.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toLowerCase();
    if (method === 'get' && !response.config?.skipCache && !response.fromCache) {
      const authHeader = response.config?.headers?.['Authorization'] || '';
      const cacheKey = `${response.config.url}_${JSON.stringify(response.config.params || {})}_${authHeader}`;
      const ttl = response.config?.cacheTtl || DEFAULT_TTL_MS;
      clientCache.set(cacheKey, {
        data: response.data,
        status: response.status,
        headers: response.headers,
        expiresAt: Date.now() + ttl,
      });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clientCache.clear();
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
