'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchWithAuth } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';
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
  const { user, token, logout } = useAuth();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const n = user?.name || user?.username || decodeJwtName(token) || null;
      setName(n);
    } catch {
      setName(null);
    }
    function onAuth() { try { const n = user?.name || user?.username || decodeJwtName(token) || null; setName(n); } catch { setName(null); } }
    window.addEventListener('auth:changed', onAuth);
    return () => window.removeEventListener('auth:changed', onAuth);
  }, [user, token]);

  if (!name) return null;

  async function doLogout() {
    try {
      // Attempt backend logout to clear httpOnly cookies if any
      await apiFetchWithAuth('/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, token || undefined).catch(() => null);
    } catch {}
    logout();
    router.replace('/login');
  }

  return (
    <div className={styles.userMenu}>
      <div className={styles.userName}><span className={styles.userLabel}>Pseudo&nbsp;:</span> {name}</div>
      <button type="button" className={`btn btn-secondary ${styles.logoutButton}`} onClick={doLogout} title="Se déconnecter">Se déconnecter</button>
    </div>
  );
}
