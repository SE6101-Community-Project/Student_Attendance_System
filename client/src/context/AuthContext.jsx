import { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import api from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const savedToken = await SecureStore.getItemAsync('token');
      const savedUser = await SecureStore.getItemAsync('user');
      const savedRole = await SecureStore.getItemAsync('role');

      if (savedToken && savedUser && savedRole) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setRole(savedRole);
      }
    } catch (error) {
      console.log('Session load error:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  // ── Student Login ──
  const loginStudent = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/student/login', { email, password });

      if (response.data.success) {
        const { token: newToken, data } = response.data;
        
        // Check if email is verified
        if (!data.isVerified) {
          return {
            success: false,
            notVerified: true,
            email: data.email,
            message: 'Please verify your email before logging in.',
          };
        }

        // Verified — save session
        setToken(newToken);
        setUser(data);

        setRole('student');

        await SecureStore.setItemAsync('token', newToken);
        await SecureStore.setItemAsync('user', JSON.stringify(data));
        await SecureStore.setItemAsync('role', 'student');

        router.replace('/(student)/(tabs)/dashboard');
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    } finally {
      setLoading(false);
    }
  };

  // ── Lecturer Login ──
  const loginLecturer = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/lecturer/login', { email, password });

      if (response.data.success) {
        const { token: newToken, data } = response.data;

        setToken(newToken);
        setUser(data);
        setRole('lecturer');

        await SecureStore.setItemAsync('token', newToken);
        await SecureStore.setItemAsync('user', JSON.stringify(data));
        await SecureStore.setItemAsync('role', 'lecturer');

        router.replace('/(lecturer)/(tabs)/dashboard');
        return { success: true, message: response.data.message };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    } finally {
      setLoading(false);
    }
  };

  // ── Register Student ──
  const registerStudent = async (registrationData) => {
    setLoading(true);
    try {
      const response = await api.post('/student/register', registrationData);

      if (response.data.success) {
        const { token: newToken, data } = response.data;

        setToken(newToken);
        setUser(data);
        setRole('student');

        await SecureStore.setItemAsync('token', newToken);
        await SecureStore.setItemAsync('user', JSON.stringify(data));
        await SecureStore.setItemAsync('role', 'student');

        return { success: true, data };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
        step: error.response?.data?.step,
      };
    } finally {
      setLoading(false);
    }
  };