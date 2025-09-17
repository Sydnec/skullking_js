'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetchWithAuth } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import RoomList from './components/RoomList';
import styles from './page.module.css';
import { roomsArraySchema, roomSchema } from '../lib/schemas';

export default function HomePage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router, user]);

  if (!ready) return <div>Redirection...</div>;

  async function createRoom() {
    try {
      const ownerId = user?.id || null;
      if (!ownerId) { alert('Utilisateur non identifié'); return; }

      const genCode = Math.random().toString(36).substring(2, 7).toUpperCase();
      const payload = { code: genCode, maxPlayers: 8, settings: {}, status: 'LOBBY' };
      const room = await apiFetchWithAuth('/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, token || undefined, roomSchema);
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
      const rooms = await apiFetchWithAuth('/rooms', undefined, token || undefined, roomsArraySchema);
      const found = rooms.find((r: any) => r.id === trim || (r.code && String(r.code).toLowerCase() === trim.toLowerCase()));
      if (!found) {
        try { router.replace('/'); } catch { /* ignore */ }
        return;
      }

      const playersCount = (found.players?.length || 0);
      const maxPlayers = found.maxPlayers || 0;
      if (maxPlayers > 0 && playersCount >= maxPlayers) {
        setJoinError('La table est complète.');
        return;
      }

      try {
        if (!user) { setJoinError('Utilisateur non identifié'); return; }

        const joinRes = await apiFetchWithAuth(`/rooms/${found.code}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }, token || undefined, undefined, { allowNotOk: true });

        // apiFetchWithAuth peut retourner soit la donnée parsée, soit un objet { ok:false, status, data }
        if (joinRes && typeof joinRes === 'object' && 'ok' in joinRes && joinRes.ok === false) {
          const data = joinRes.data;
          // Si l'API renvoie une payload ressemblant à un player malgré le status non-ok, considérer comme réussite
          if (data && typeof data === 'object' && (data.id || data.userId || data.player)) {
            router.push(`/${found.code}`);
            return;
          }

          const jErr = data || { error: 'Impossible de rejoindre la table' };
          setJoinError(jErr?.error || 'Impossible de rejoindre la table');
          return;
        }

        // succès (même si la réponse est `null`/vide)
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
            <button type="button" className={`btn btn-primary ${styles.createButton}`} onClick={createRoom}>Créer une table</button>

            <div className={styles.actionsGroup}>
              <div className={styles.inputWrapper}>
                <input className="input" placeholder="Code de la table" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinCode()} />
                {joinError && (<div className={styles.inputError}>{joinError}</div>)}
              </div>
              <button type="button" className={`btn btn-secondary ${styles.joinButton}`} onClick={() => joinCode()}>Rejoindre une table</button>
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
