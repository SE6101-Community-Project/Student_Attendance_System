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

   // ── Register Face ──
  const registerFace = async (imageBase64) => {
    setLoading(true);
    try {
      const response = await api.post('/student/register-face', {
        imageBase64,
      });

      if (response.data.success) {
        const updatedUser = { ...user, faceDataRegistered: true };
        setUser(updatedUser);
        await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
      }

      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Face registration failed',
      };
    } finally {
      setLoading(false);
    }
  };

  // ── Verify Face ──
  const verifyFace = async (imageBase64) => {
    try {
      const response = await api.post('/student/verify-face', {
        imageBase64,
      });

      return {
        success: response.data.success,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Face verification failed',
      };
    }
  };

  // ── Logout ──
  const logout = async () => {
    setToken(null);
    setUser(null);
    setRole(null);
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('role');
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        initialLoading,
        loginStudent,
        loginLecturer,
        registerStudent,
        registerFace,
        verifyFace,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error('useAuth must be used within AuthProvider');
  return context;
};