import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('epeddlers_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [peddler, setPeddler] = useState(() => {
    const saved = localStorage.getItem('epeddlers_peddler');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('epeddlers_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('epeddlers_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data) {
            setUser(res.data.user);
            setPeddler(res.data.peddler || null);
            localStorage.setItem('epeddlers_user', JSON.stringify(res.data.user));
            if (res.data.peddler) {
              localStorage.setItem('epeddlers_peddler', JSON.stringify(res.data.peddler));
            }
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const loginStaff = async (email, password) => {
    const res = await authApi.staffLogin({ email, password });
    if (res.success && res.data) {
      const { token: newToken, user: newUser } = res.data;
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('epeddlers_token', newToken);
      localStorage.setItem('epeddlers_user', JSON.stringify(newUser));
      return newUser;
    }
    throw new Error(res.message || 'Login failed.');
  };

  const loginPeddler = async (peddlerId) => {
    const res = await authApi.peddlerLogin({ peddler_id: peddlerId });
    if (res.success && res.data) {
      const { token: newToken, user: newUser, peddler: newPeddler } = res.data;
      setToken(newToken);
      setUser(newUser);
      setPeddler(newPeddler || null);
      localStorage.setItem('epeddlers_token', newToken);
      localStorage.setItem('epeddlers_user', JSON.stringify(newUser));
      if (newPeddler) {
        localStorage.setItem('epeddlers_peddler', JSON.stringify(newPeddler));
      }
      return newUser;
    }
    throw new Error(res.message || 'Peddler login failed.');
  };

  const requestPeddlerOtp = async (identifier) => {
    return await authApi.peddlerRequestOtp({ identifier });
  };

  const verifyPeddlerOtp = async (identifier, otpCode) => {
    const res = await authApi.peddlerVerifyOtp({ identifier, otp_code: otpCode });
    if (res.success && res.data) {
      const { token: newToken, user: newUser, peddler: newPeddler } = res.data;
      setToken(newToken);
      setUser(newUser);
      setPeddler(newPeddler || null);
      localStorage.setItem('epeddlers_token', newToken);
      localStorage.setItem('epeddlers_user', JSON.stringify(newUser));
      if (newPeddler) {
        localStorage.setItem('epeddlers_peddler', JSON.stringify(newPeddler));
      }
      return newUser;
    }
    throw new Error(res.message || 'OTP verification failed.');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPeddler(null);
    localStorage.removeItem('epeddlers_token');
    localStorage.removeItem('epeddlers_user');
    localStorage.removeItem('epeddlers_peddler');
  };

  const getDashboardRoute = () => {
    if (!user) return '/login';
    const role = user.role_name?.toLowerCase();
    if (role === 'admin') return '/admin';
    if (role === 'treasury') return '/treasury';
    if (role === 'peddler') return '/peddler';
    return '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        peddler,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        loginStaff,
        loginPeddler,
        requestPeddlerOtp,
        verifyPeddlerOtp,
        logout,
        getDashboardRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
