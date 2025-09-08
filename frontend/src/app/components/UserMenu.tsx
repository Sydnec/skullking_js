'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import styles from './UserMenu.module.css';

function decodeJwtName(token?: string | null) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    // base64url -> base64
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // pad
    while (payload.length % 4) payload += '=';
    const json = typeof window !== 'undefined' ? window.atob(payload) : Buffer.from(payload, 'base64').toString('utf8');
    const obj = JSON.parse(json);
    return obj?.name || obj?.username || null;
  } catch {
    return null;
  }
}

export default function UserMenu() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  function readName() {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem('auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw || '{}');
      // Prefer normalized shape
      if (parsed?.user?.name) return parsed.user.name;
      if (parsed?.user?.username) return parsed.user.username;
      if (parsed?.name) return parsed.name;
      // fallback: try decode token
      const token = parsed?.token || parsed?.accessToken || parsed?.access_token || null;
      return decodeJwtName(token);
    } catch {
      return null;
    }
  }

  useEffect(() => {
    setName(readName());
    function onAuth() { setName(readName()); }
    window.addEventListener('auth:changed', onAuth);
    return () => window.removeEventListener('auth:changed', onAuth);
  }, []);

  if (!name) return null;

  async function logout() {
    try {
      const raw = localStorage.getItem('auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        const refreshToken = parsed?.refreshToken;
        if (refreshToken) {
          try {
            await apiFetch('/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
          } catch {}
        }
      }
    } catch {}
    localStorage.removeItem('auth');
    window.dispatchEvent(new Event('auth:changed'));
    router.replace('/login');
  }

  return (
    <div className={styles.userMenu}>
      <div className={styles.userName}><span className={styles.userLabel}>Pseudo&nbsp;:</span> {name}</div>
      <button className={`btn btn-secondary ${styles.logoutButton}`} onClick={logout} title="Se déconnecter">Se déconnecter</button>
    </div>
  );
}
