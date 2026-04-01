import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export async function login(username: string, password: string) {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
}

export async function fetchLogs(params?: {
  serverId?: string;
  action?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get('/logs', { params });
  return response.data;
}

export async function fetchStats(serverId?: string) {
  const response = await api.get('/stats', { params: { serverId } });
  return response.data;
}

export async function updateConfig(data: any) {
  const response = await api.post('/config', data);
  return response.data;
}

export async function fetchConfig(serverId: string) {
  const response = await api.get(`/config/${serverId}`);
  return response.data;
}
