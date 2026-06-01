// mobile/src/services/api.js
import axios from 'axios';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'nyumba-store' });

// Change this to your backend URL
export const BASE_URL = __DEV__
  ? 'http://10.0.2.2:3000'   // Android emulator → localhost
  : 'https://nyumba-api.onrender.com';

// Generate device fingerprint stored persistently
let _deviceId = storage.getString('device_id');
if (!_deviceId) {
  _deviceId = 'DEV-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  storage.set('device_id', _deviceId);
}
export const DEVICE_ID = _deviceId;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Device-ID': DEVICE_ID,
  },
});

// Request interceptor — attach token
api.interceptors.request.use(config => {
  const token = storage.getString('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — refresh token on 401
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = storage.getString('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          storage.set('token', data.token);
          original.headers.Authorization = `Bearer ${data.token}`;
          return api(original);
        } catch {
          storage.delete('token');
          storage.delete('refreshToken');
          // Navigate to login — handled by auth store
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
