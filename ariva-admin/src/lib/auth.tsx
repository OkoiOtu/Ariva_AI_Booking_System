'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getPB } from './pb';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  token: string;
}

interface AuthCtx {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = 'ariva_admin_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(KEY);
      if (stored) {
        const u: AuthUser = JSON.parse(stored);
        if (u.role === 'author' && u.token) {
          getPB().authStore.save(u.token, { id: u.id, email: u.email });
          setUser(u);
        }
      }
    } catch {}
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const pb   = getPB();
    const auth = await pb.collection('users').authWithPassword(email, password);
    if (auth.record['role'] !== 'author') {
      pb.authStore.clear();
      throw new Error('Access denied. This dashboard is for Ariva platform administrators only.');
    }
    const u: AuthUser = {
      id:        auth.record.id,
      email:     auth.record['email'] as string,
      full_name: (auth.record['full_name'] as string) || '',
      role:      auth.record['role'] as string,
      token:     auth.token,
    };
    setUser(u);
    sessionStorage.setItem(KEY, JSON.stringify(u));
  }

  function logout() {
    getPB().authStore.clear();
    sessionStorage.removeItem(KEY);
    setUser(null);
    window.location.href = '/login';
  }

  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
