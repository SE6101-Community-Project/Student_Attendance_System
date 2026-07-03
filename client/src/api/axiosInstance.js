import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { API_URL } from '../constants/config';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('[api] Token retrieval error:', error.message);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isHandling401 = false;

api.interceptors.response.use(
  // ── Success ──
  (response) => response,

  // ── Error ──
  async (error) => {
    const status = error.response?.status;

    // ── 401 Unauthorized — token expired or invalid ──────────────────────────
    if (status === 401 && !isHandling401) {
      isHandling401 = true;

      try {
        // Clear all stored session data
        await Promise.all([
          SecureStore.deleteItemAsync('token'),
          SecureStore.deleteItemAsync('user'),
          SecureStore.deleteItemAsync('role'),
        ]);

        // Redirect to login
        router.replace('/(auth)/login');
      } catch (clearError) {
        console.warn('[api] Failed to clear session on 401:', clearError.message);
      } finally {
        // Reset flag after a short delay so future 401s are handled
        setTimeout(() => {
          isHandling401 = false;
        }, 3000);
      }
    }

    if (status === 403) {
      try {
        await Promise.all([
          SecureStore.deleteItemAsync('token'),
          SecureStore.deleteItemAsync('user'),
          SecureStore.deleteItemAsync('role'),
        ]);
        router.replace('/(auth)/login');
      } catch (clearError) {
        console.warn('[api] Failed to clear session on 403:', clearError.message);
      }
    }

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        // Request timed out
        return Promise.reject({
          ...error,
          response: {
            data: {
              success: false,
              message: 'Request timed out. Please check your connection.',
            },
          },
        });
      }

      return Promise.reject({
        ...error,
        response: {
          data: {
            success: false,
            message: 'Network error. Please check your internet connection.',
          },
        },
      });
    }

    if (status >= 500) {
      console.error(
        '[api] Server error:',
        status,
        error.response?.data?.message,
      );
    }

    return Promise.reject(error);
  },
);

export default api;