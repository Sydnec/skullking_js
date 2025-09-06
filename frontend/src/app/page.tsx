'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoomList from './components/RoomList';
import styles from './page.module.css';

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('auth');
    if (!raw) {
      router.replace('/login');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.token) {
        router.replace('/login');
        return;
      }
    } catch (e) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return <div>Redirection...</div>;

  async function createRoom() {
    try {
      const raw = localStorage.getItem('auth');
      if (!raw) { router.replace('/login'); return; }
      const parsed = JSON.parse(raw);
      const ownerId = parsed?.user?.id || parsed?.id || parsed?.userId || null;
      if (!ownerId) { alert('Utilisateur non identifié'); return; }

      const genCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      const payload = { code: genCode, maxPlayers: 8, settings: {}, status: 'LOBBY' };
      const token = parsed?.token || null;
      const res = await fetch('/api/v1/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const txt = await res.text();
        alert('Erreur création table: ' + txt);
        return;
      }
      const room = await res.json();
      // navigate to the public room code (e.g. /W3I0L) instead of internal UUID
      router.push(`/${room.code}`);
    } catch (e: any) {
      alert(String(e?.message || e));
    }
  }

  async function verifyAndJoin(input: string) {
    setJoinError(null);
    const trim = (input || '').trim();
    if (!trim) return;
    try {
      const res = await fetch('/api/v1/rooms');
      if (!res.ok) { setJoinError('Erreur serveur lors de la vérification'); return; }
      const rooms = await res.json();
      const found = rooms.find((r: any) => r.id === trim || (r.code && String(r.code).toLowerCase() === trim.toLowerCase()));
      if (!found) {
        // salle introuvable -> rediriger vers l'accueil
        try { router.replace('/'); } catch (e) {}
        return;
      }

      // If room is already full, refuse join (same behavior as room page auto-join)
      const playersCount = (found.players?.length || 0);
      const maxPlayers = found.maxPlayers || 0;
      if (maxPlayers > 0 && playersCount >= maxPlayers) {
        setJoinError('La table est complète.');
        return;
      }

      // Attempt to join via API
      try {
        const raw = localStorage.getItem('auth');
        if (!raw) { setJoinError('Utilisateur non identifié'); return; }
        const parsed = JSON.parse(raw);
        const userId = parsed?.user?.id || parsed?.id || parsed?.userId || null;
        const token = parsed?.token || null;
        if (!userId) { setJoinError('Utilisateur non identifié'); return; }

        const joinRes = await fetch(`/api/v1/rooms/${found.code}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({})
        });

        if (!joinRes.ok) {
          const jErr = await joinRes.json().catch(() => ({ error: 'Impossible de rejoindre la table' }));
          setJoinError(jErr?.error || 'Impossible de rejoindre la table');
          return;
        }

        // Success — navigate to room page using its public code
        router.push(`/${found.code}`);
      } catch (joinErr: any) {
        setJoinError(String(joinErr?.message || joinErr));
      }
    } catch (e: any) {
      setJoinError(String(e?.message || e));
    }
  }

  function joinCode() {
    if (!code) return;
    verifyAndJoin(code);
  }

  return (
    <div>
      <div className="card">
        <div className={styles.cardRow}>
          <div className={`${styles.formRowInline} ${styles.actionsContainer}`}>
            <button className={`btn btn-primary ${styles.createButton}`} onClick={createRoom}>Créer une table</button>

            <div className={styles.actionsGroup}>
              <div className={styles.inputWrapper}>
                <input className="input" placeholder="Code de la table" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinCode()} />
                {joinError && (<div className={styles.inputError}>{joinError}</div>)}
              </div>
              <button className={`btn btn-secondary ${styles.joinButton}`} onClick={() => joinCode()}>Rejoindre une table</button>
            </div>
          </div>
        </div>

        <div className={styles.roomListSection}>
          <RoomList onJoin={(id: string) => verifyAndJoin(id)} />
        </div>
      </div>
    </div>
  );
}
