import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  async function checkAuthState() {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      const userData = await SecureStore.getItemAsync('user');

      if (token && userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
      }
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (email: string, password: string, tenantSubdomain?: string) => {
    const result = await authApi.login(email, password);
    if (result.error) return { error: result.error };

    const data = result.data as any;
    if (data && data.accessToken) {
      await SecureStore.setItemAsync('accessToken', data.accessToken);
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(data.user));
      setUser(data.user);
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
        if (d.accessToken) await SecureStore.setItemAsync('accessToken', d.accessToken);
        if (d.refreshToken) await SecureStore.setItemAsync('refreshToken', d.refreshToken);
        if (d.user) {
          await SecureStore.setItemAsync('user', JSON.stringify(d.user));
          setUser(d.user);
        }
      }
      return {};
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {}
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const userData = await SecureStore.getItemAsync('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
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
