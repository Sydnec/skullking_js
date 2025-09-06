'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const router = useRouter();

  function normalizeAuthPayload(data: any) {
    // backend may return different shapes; normalize to { user: {id,name}, token, refreshToken }
    const user = data?.user || (data?.id || data?.name ? { id: data?.id, name: data?.name } : null);
    const token = data?.token || data?.accessToken || data?.access_token || null;
    const refreshToken = data?.refreshToken || data?.refresh_token || data?.refresh || null;
    return { user, token, refreshToken };
  }

  function formatErrorMessage(input: any, res?: Response) {
    // Normalize many possible error shapes into a short, user-friendly string
    if (!input && !res) return 'Une erreur est survenue.';
    if (typeof input === 'string') return input;
    if (input instanceof Error) return input.message || 'Une erreur est survenue.';

    const extractFromObject = (obj: any): string | null => {
      if (!obj) return null;
      if (typeof obj === 'string') return obj;
      if (obj.message) return String(obj.message);
      if (obj.error) return typeof obj.error === 'string' ? obj.error : JSON.stringify(obj.error);
      if (obj.detail) return String(obj.detail);
      if (obj.title) return String(obj.title);
      if (obj.errors) {
        // common validation shape: { errors: [{ msg: '...' }, ...] } or { errors: { field: ['...'] } }
        if (Array.isArray(obj.errors)) return obj.errors.map((e: any) => e?.msg || e?.message || JSON.stringify(e)).join(' ; ');
        if (typeof obj.errors === 'object') return Object.values(obj.errors).flat().map((v: any) => Array.isArray(v) ? v.join(', ') : String(v)).join(' ; ');
      }
      return null;
    };

    const byInput = extractFromObject(input) || extractFromObject(input?.data) || extractFromObject(input?.response);
    if (byInput) return byInput;

    if (res) {
      // try to provide a readable status fallback
      const statusText = res.statusText ? ` ${res.statusText}` : '';
      return `Erreur ${res.status}${statusText}`.trim();
    }

    try {
      return JSON.stringify(input).slice(0, 300);
    } catch (e) {
      return 'Une erreur inconnue est survenue.';
    }
  }

  async function handleAuthResponse(res: Response) {
    const data = await res.json().catch(() => ({}));
    const norm = normalizeAuthPayload(data);
    if (norm.token) {
      // always store normalized shape
      localStorage.setItem('auth', JSON.stringify(norm));
      try { window.dispatchEvent(new Event('auth:changed')); } catch (_) {}
      // if there's a redirect destination saved before login, use it
      try {
        const dest = localStorage.getItem('afterLoginRedirect');
        if (dest) {
          localStorage.removeItem('afterLoginRedirect');
          router.push(dest);
          return true;
        }
      } catch (e) {}
      router.push('/');
      return true;
    }
    setMsg(formatErrorMessage(data, res));
    return false;
  }

  async function login() {
    setMsg('');
    try {
      const res = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, password }) });
      await handleAuthResponse(res);
    } catch (e: any) {
      setMsg(formatErrorMessage(e));
    }
  }

  async function register() {
    setMsg('');
    try {
      const res = await fetch('/api/v1/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, password }) });
      await handleAuthResponse(res);
    } catch (e: any) {
      setMsg(formatErrorMessage(e));
    }
  }

  return (
    <div className={`${styles.container} container`}>
      <div className={`card ${styles.card}`}>
        {/* 1) titre */}
        <h1 className={`${styles.title ?? ''}`}>Bienvenue sur SkullKing</h1>

        {/* 2) inputs - conteneur central qui prend l'espace disponible */}
        <div className={`form-row ${styles['form-row'] ?? ''} ${styles.inputs ?? ''}`}>
          <input className="input" placeholder="Pseudo" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
          <input className="input" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} type="password" onKeyDown={e => e.key === 'Enter' && login()} />

          {msg ? <div className={`${styles.msg ?? ''} ${msg ? styles.error : ''}`}>{msg}</div> : null}
        </div>

        {/* 3) actions - deux boutons de même largeur */}
        <div className={`${styles.actions ?? ''} actions`}>
          <button type="button" className={`btn btn-primary ${styles['btn-primary'] ?? ''}`} onClick={login}>Se connecter</button>
          <button type="button" className={`btn btn-secondary ${styles['btn-secondary'] ?? ''}`} onClick={register}>S'inscrire</button>
        </div>
      </div>
    </div>
  );
}
