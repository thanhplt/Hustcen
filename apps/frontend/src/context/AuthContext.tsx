'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (emailOrPhone: string, password?: string) => Promise<void>;
  quickLoginDemo: (role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER') => Promise<void>;
  register: (dto: { email: string; fullName: string; phone?: string; password?: string }) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('hustcine_token');
    if (savedToken) {
      setToken(savedToken);
      api
        .getMe()
        .then((res) => {
          if (res?.user) setUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem('hustcine_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (emailOrPhone: string, password?: string) => {
    const res = await api.login({ emailOrPhone, password });
    const token = res?.tokens?.accessToken || res?.accessToken;
    if (token) {
      localStorage.setItem('hustcine_token', token);
      setToken(token);
      setUser(res.user);
    }
  };

  const quickLoginDemo = async (role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER') => {
    const demos: Record<string, { email: string; pass: string }> = {
      ADMIN: { email: 'admin@hustcine.edu.vn', pass: 'Admin@123' },
      MANAGER: { email: 'manager@hustcine.edu.vn', pass: 'Manager@123' },
      STAFF: { email: 'staff@hustcine.edu.vn', pass: 'Staff@123' },
      CUSTOMER: { email: 'customer@hust.edu.vn', pass: 'Customer@123' },
    };
    const target = demos[role];
    if (target) {
      await login(target.email, target.pass);
    }
  };

  const register = async (dto: { email: string; fullName: string; phone?: string; password?: string }) => {
    const res = await api.register(dto);
    const token = res?.tokens?.accessToken || res?.accessToken;
    if (token) {
      localStorage.setItem('hustcine_token', token);
      setToken(token);
      setUser(res.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('hustcine_token');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF' || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        quickLoginDemo,
        register,
        logout,
        isAdmin,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
