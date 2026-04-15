import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (token && saved) {
      try {
        const u = JSON.parse(saved);
        setUser(u);
        api.get('/auth/me').then(({ data }) => {
          if (data.success) {
            setUser(data.user);
            setProfile(data.profile || null);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }).catch(() => {
          setUser(null);
          setProfile(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }).finally(() => setLoading(false));
      } catch {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onLogout = () => {
      setUser(null);
      setProfile(null);
    };
    window.addEventListener('auth-logout', onLogout);
    return () => window.removeEventListener('auth-logout', onLogout);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        localStorage.setItem(
          'clientLocation',
          JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        );
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setProfile(null);
  };

  const setProfileData = (data) => setProfile(data);
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, setProfileData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
