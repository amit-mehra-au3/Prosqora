import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure Axios defaults to send cookies and attach Bearer token
axios.defaults.withCredentials = true;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('autolead_jwt_token') || null);
  const [loading, setLoading] = useState(true);

  // Set default auth header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('autolead_jwt_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('autolead_jwt_token');
    }
  }, [token]);

  // Check auth session on load
  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    setLoading(true);
    try {
      const storedToken = localStorage.getItem('autolead_jwt_token');
      if (storedToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await axios.get('/api/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, remember = true) => {
    const res = await axios.post('/api/auth/login', { email, password, remember });
    if (res.data.success) {
      setUser(res.data.user);
      setToken(res.data.token);
      return res.data;
    }
    throw new Error(res.data.error || 'Login failed');
  };

  const signup = async (formData) => {
    const res = await axios.post('/api/auth/signup', formData);
    if (res.data.success) {
      setUser(res.data.user);
      setToken(res.data.token);
      return res.data;
    }
    throw new Error(res.data.error || 'Signup failed');
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('autolead_jwt_token');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const updateProfile = async (profileData) => {
    const res = await axios.put('/api/auth/profile', profileData);
    if (res.data.success) {
      setUser(res.data.user);
      return res.data;
    }
    throw new Error(res.data.error || 'Profile update failed');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateProfile, checkAuthSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
