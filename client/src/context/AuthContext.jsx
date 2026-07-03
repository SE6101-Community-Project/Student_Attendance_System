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