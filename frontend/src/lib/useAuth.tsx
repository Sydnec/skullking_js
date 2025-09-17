'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { logDev, warnDev } from './logger';

type AuthShape = { user?: any; token?: string | null; refreshToken?: string | null } | null;

type AuthContextValue = {
  auth: AuthShape;
  user: any | null;
  token: string | null;
  setAuth: (a: AuthShape) => void;
  logout: () => void;
  loginFromPayload: (payload: any) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuthState] = useState<AuthShape>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { logDev('auth parse failed', e); return null; }
  });

  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem('auth');
        const parsed = raw ? JSON.parse(raw) : null;
        setAuthState(parsed);
      } catch (e) { warnDev('auth change parse failed', e); setAuthState(null); }
    };
    window.addEventListener('auth:changed', handler);
    return () => window.removeEventListener('auth:changed', handler);
  }, []);

  function setAuth(a: AuthShape) {
    try { if (a) localStorage.setItem('auth', JSON.stringify(a)); else localStorage.removeItem('auth'); } catch (e) { warnDev('localStorage setAuth failed', e); }
    setAuthState(a);
    try { window.dispatchEvent(new Event('auth:changed')); } catch (e) { warnDev('dispatch auth changed failed', e); }
  }

  function logout() {
    try { localStorage.removeItem('auth'); } catch (e) { warnDev('localStorage remove failed', e); }
    setAuthState(null);
    try { window.dispatchEvent(new Event('auth:changed')); } catch (e) { warnDev('dispatch auth changed failed', e); }
  }

  function normalize(payload: any) {
    const user = payload?.user || (payload?.id || payload?.name ? { id: payload?.id, name: payload?.name } : null);
    const token = payload?.token || payload?.accessToken || payload?.access_token || null;
    const refreshToken = payload?.refreshToken || payload?.refresh_token || payload?.refresh || null;
    return { user, token, refreshToken };
  }

  function loginFromPayload(payload: any) {
    const norm = normalize(payload);
    setAuth(norm);
  }

  const value: AuthContextValue = {
    auth,
    user: auth?.user || null,
    token: auth?.token || null,
    setAuth,
    logout,
    loginFromPayload,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
