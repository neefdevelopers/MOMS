'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from './api';

export type UserRole =
  | 'MEDIA_MANAGER'
  | 'TECHNICAL_MANAGER'
  | 'STAFF'
  | 'SOCIAL_MEDIA_MANAGER'
  | 'MARKETING_MANAGER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'SALES_MANAGER'
  | 'CLIENT_COORDINATOR'
  | 'ADMINISTRATOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  employeeProfile?: {
    designation: string;
    department?: { name: string };
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  quickSwitchUser: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Synchronously initialize state from localStorage to eliminate any async loading state
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem('moms_user');
        return savedUser ? JSON.parse(savedUser) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('moms_token');
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedToken = localStorage.getItem('moms_token');
        const savedUser = localStorage.getItem('moms_user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.error('Auth context sync error:', err);
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem('moms_token', res.accessToken);
    localStorage.setItem('moms_user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('moms_token');
    localStorage.removeItem('moms_user');
    setToken(null);
    setUser(null);
  };

  const quickSwitchUser = async (email: string) => {
    await login(email, 'Password123!');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, quickSwitchUser }}>
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
