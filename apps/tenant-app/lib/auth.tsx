'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { authApi, getToken, setToken, clearToken } from './api';

interface User { id: string; email: string; firstName?: string; lastName?: string; tenantId?: string; avatarUrl?: string }

interface AuthCtx {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => Promise<{ error?: string }>;
  logout: () => void;
  /** Merges into the stored user (localStorage + context) — used after a
   * profile/avatar update so the rest of the app reflects it immediately. */
  updateUser: (patch: Partial<User>) => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);
const USER_KEY = 'dexo_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    const u = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    if (t && u) { try { setUser(JSON.parse(u)); } catch {} }
    setLoading(false);
  }, []);

  const persist = (accessToken: string, u: User) => {
    setToken(accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (res.error) return { error: res.error };
    if (res.data?.accessToken) persist(res.data.accessToken, res.data.user);
    return {};
  }, []);

  const register = useCallback(async (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => {
    const res = await authApi.register(data);
    if (res.error) return { error: res.error };
    if (res.data?.accessToken) persist(res.data.accessToken, res.data.user);
    return {};
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, isAuthenticated: !!user, login, register, logout, updateUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
}
