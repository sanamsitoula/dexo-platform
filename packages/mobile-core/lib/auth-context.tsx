import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from './storage';
import { authApi } from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  isPlatformAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantSubdomain?: string) => Promise<{ error?: string; data?: any }>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantSubdomain?: string;
  }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      const token = await storage.getItem('accessToken');
      const userData = await storage.getItem('user');

      if (token && userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        setToken(token);
      }
    } catch {
      await storage.removeItem('accessToken');
      await storage.removeItem('refreshToken');
      await storage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (email: string, password: string, tenantSubdomain?: string) => {
    const result = await authApi.login(email, password, tenantSubdomain);
    if (result.error) return { error: result.error };

    const data = result.data as any;
    if (data && data.accessToken) {
      await storage.setItem('accessToken', data.accessToken);
      await storage.setItem('refreshToken', data.refreshToken);
      await storage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setToken(data.accessToken);
      return { data };
    }
    return {};
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; firstName: string; lastName: string; tenantSubdomain?: string }) => {
      const result = await authApi.register(data);
      if (result.error) return { error: result.error };

      const d = result.data as any;
      if (d) {
        if (d.accessToken) await storage.setItem('accessToken', d.accessToken);
        if (d.refreshToken) await storage.setItem('refreshToken', d.refreshToken);
        if (d.user) {
          await storage.setItem('user', JSON.stringify(d.user));
          setUser(d.user);
        }
        if (d.accessToken) setToken(d.accessToken);
      }
      return {};
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}
    await storage.removeItem('accessToken');
    await storage.removeItem('refreshToken');
    await storage.removeItem('user');
    setUser(null);
    setToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const userData = await storage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
