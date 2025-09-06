'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io as ioClient, Socket } from 'socket.io-client';
import styles from './RoomPage.module.css';
import Dropdown from '../components/Dropdown';
import Tooltip from '../components/Tooltip';
import scoreMethods from './options/scoreMethods';
import gameFormats from './options/gameFormats';
import ToggleSwitch from '../components/ToggleSwitch';
import Chat from '../components/Chat';

type DialogState =
  | null
  | { type: 'alert'; title?: string; message: string }
  | { type: 'confirm'; title?: string; message: string; resolve: (v: boolean) => void };

export default function RoomPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'LOBBY'|'RUNNING'|'FINISHED'|'UNKNOWN'>('UNKNOWN');
  const [room, setRoom] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const firstLoadRef = useRef<boolean>(true);

  // central helper to apply room data while preserving local presence cache
  function applyRoomData(data: any) {
    setRoom((prev: any) => ({ ...(data || {}), __presentUserIds: prev?.__presentUserIds || data?.__presentUserIds || [] }));
    setStatus((data && data.status) || 'UNKNOWN');
  }

  // UI helpers: dialog + toast
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  }

  function showAlert(message: string) {
    return new Promise<void>((resolve) => {
      setDialog({ type: 'alert', message });
      const unmount = () => { setDialog(null); resolve(); };
      (window as any).__dialog_ok = unmount;
    });
  }

  function showConfirm(message: string) {
    return new Promise<boolean>((resolve) => {
      setDialog({ type: 'confirm', message, resolve });
    });
  }

  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (!auth) {
      // remember intended path so login can redirect back
      try { localStorage.setItem('afterLoginRedirect', window.location.pathname); } catch (e) {}
      router.replace('/login');
      return;
    }
    const path = window.location.pathname;
    const code = path.replace('/', '');
    try {
      const parsed = JSON.parse(auth);
      const id = parsed?.user?.id || parsed?.id || parsed?.userId || parsed?.sub || null;
      setUserId(id || null);
    } catch (e) {
      setUserId(null);
    }
    // firstLoadRef est déclaré en haut du composant; auto-join est toujours activé

    async function fetchRoom() {
      try {
        const res = await fetch(`/api/v1/rooms/${code}`);
        if (res.status === 404) {
          // salle introuvable -> rediriger vers l'accueil
          try { router.replace('/'); } catch (e) {}
          return;
        }
        const data = await res.json();
        applyRoomData(data);

        // ensure membership only on first load (we don't auto-rejoin after being kicked)
        try {
          // if we have a user id and we're not present in players, attempt to join (only initial load)
          const uid = (localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth') || '{}')?.user?.id : null);
          const already = (data?.players || []).some((p: any) => (p.user?.id || p.userId) === uid);
          if (!already) {
            if (uid && firstLoadRef.current) {
              // attempt to auto-join if there's room
              const maxPlayers = data?.maxPlayers || 8;
              const currentCount = (data?.players || []).length;
              if (currentCount >= maxPlayers) {
                await showAlert('La table est complète, impossible de rejoindre.');
                try { router.replace('/'); } catch (e) {}
              } else {
                try {
                  // Use the same join endpoint as the room list / home page to ensure server-side checks
                  const raw = localStorage.getItem('auth');
                  const token = raw ? (JSON.parse(raw)?.token || null) : null;
                  const joinRes = await fetch(`/api/v1/rooms/${code}/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({})
                  });
                  if (!joinRes.ok) {
                    const err = await joinRes.json().catch(() => ({}));
                    await showAlert('Impossible de rejoindre la table : ' + (err?.error || err?.message || 'Erreur serveur'));
                    try { router.replace('/'); } catch (e) {}
                  } else {
                    // refresh room data from server after successful join
                    const r2 = await fetch(`/api/v1/rooms/${code}`);
                    if (r2.ok) {
                      const fetched = await r2.json();
                      setRoom((prev:any) => ({ ...(fetched || {}), __presentUserIds: prev?.__presentUserIds || fetched?.__presentUserIds || [] }));
                    }
                  }
                } catch (e) {
                  await showAlert('Erreur lors de la tentative de rejoindre la table.');
                  try { router.replace('/'); } catch (e) {}
                }
              }
            } else {
              // not initial load and not present -> user probably kicked, redirect
              if (!firstLoadRef.current && uid) {
                await showAlert('Vous avez été retiré de la table.');
                try { router.replace('/'); } catch (e) {}
              }
            }
          }
        } catch (e) { /* ignore */ }

      } catch (e) {
        setStatus('UNKNOWN');
      }
    }
    fetchRoom();

    // after initial fetch, flip firstLoadRef to false so subsequent socket-triggered fetches don't auto-join
    setTimeout(() => { try { firstLoadRef.current = false; } catch (e) {} }, 800);

    let socket: Socket | null = null;
    try {
      const url = (typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_WS_URL || window.location.origin)) || undefined;
      socket = ioClient(url);
      socket.on('connect', () => {
        socket?.emit('join-room', { code, userId: (localStorage.getItem('auth') ? JSON.parse(localStorage.getItem('auth') || '{}')?.user?.id : null) });
      });
      socket.on('room-updated', (payload: any) => { fetchRoom(); });
      socket.on('player-joined', (payload: any) => { fetchRoom(); });
      socket.on('room-list-updated', () => { fetchRoom(); });
      socket.on('presence-updated', (payload: any) => {
        setRoom((r: any) => ({ ...(r || {}), __presentUserIds: payload?.presentUserIds || [] }));
      });
    } catch (e) {}

    return () => {
      if (socket) {
        try { socket.off('room-updated'); socket.off('player-joined'); socket.off('room-list-updated'); socket.disconnect(); } catch (e) { }
      }
    };
  }, [router]);

  async function handleStart() {
    if (!room) return;
    let id = userId;
    if (!id) {
      const raw = localStorage.getItem('auth');
      if (raw) {
        try { const parsed = JSON.parse(raw); id = parsed?.user?.id || parsed?.id || parsed?.userId || parsed?.sub || null; } catch (e) { }
      }
    }
    if (!id) { await showAlert('Utilisateur non identifié'); return; }

    if (room.owner?.id !== id) { await showAlert('Seul le propriétaire peut démarrer la partie'); return; }

    try {
      const raw = localStorage.getItem('auth');
      const token = raw ? (JSON.parse(raw)?.token || null) : null;
      const res = await fetch(`/api/v1/rooms/${room.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        await showAlert('Impossible de démarrer : ' + (err?.error || err?.message || 'Erreur serveur'));
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.room) { applyRoomData(data.room); }
      showToast('Partie démarrée');
    } catch (e) {
      await showAlert('Erreur lors du démarrage');
    }
  }

  async function handleLeaveOrDelete() {
    if (!room || !userId) { await showAlert("Impossible d'effectuer l'action - utilisateur non identifié"); return; }

    if (userId === room.ownerId) {
      const ok = await showConfirm("Voulez-vous vraiment supprimer ce salon ? Cette action est irréversible.");
      if (!ok) return;
      try {
        const raw = localStorage.getItem('auth');
        const token = raw ? (JSON.parse(raw)?.token || null) : null;
        const res = await fetch(`/api/v1/rooms/${room.code}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (!res.ok) { await showAlert('Erreur lors de la suppression du salon'); return; }
        router.push('/');
      } catch (e) { await showAlert('Erreur lors de la suppression'); }
      return;
    }

    const rp = (room.players || []).find((p: any) => (p.user?.id === userId || p.userId === userId));
    if (!rp) { await showAlert('Impossible de quitter : enregistrement joueur introuvable'); router.push('/'); return; }
    const ok = await showConfirm('Quitter la partie ?'); if (!ok) return;
    try {
      const raw = localStorage.getItem('auth');
      const token = raw ? (JSON.parse(raw)?.token || null) : null;
      const res = await fetch(`/api/v1/roomplayers/${rp.id}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) { await showAlert('Erreur lors de la sortie de la table'); return; }
      router.push('/');
    } catch (e) { await showAlert('Erreur lors de la sortie'); }
  }

  async function toggleSetting(key: string) {
    if (!room || !userId) return;
    if (userId !== room.ownerId) { await showAlert('Seul le propriétaire peut modifier les paramètres'); return; }
    const current = room?.settings || {};
    const next = { ...current, [key]: !current[key] };
    try {
      const raw = localStorage.getItem('auth');
      const token = raw ? (JSON.parse(raw)?.token || null) : null;
      const res = await fetch(`/api/v1/rooms/${room.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ settings: next })
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); await showAlert('Erreur mise à jour paramètres: ' + (err?.error || err?.message || 'Erreur')); return; }
      setRoom((r: any) => ({ ...(r || {}), settings: next }));
      showToast('Paramètres mis à jour');
    } catch (e) { await showAlert('Erreur lors de la mise à jour'); }
  }

  async function updateSetting(key: string, value: any) {
    if (!room || !userId) return;
    if (userId !== room.ownerId) { await showAlert('Seul le propriétaire peut modifier les paramètres'); return; }
    const current = room?.settings || {};
    const next = { ...current, [key]: value };
    try {
      const raw = localStorage.getItem('auth');
      const token = raw ? (JSON.parse(raw)?.token || null) : null;
      const res = await fetch(`/api/v1/rooms/${room.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ settings: next, maxPlayers: room.maxPlayers })
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); await showAlert('Erreur mise à jour paramètres: ' + (err?.error || err?.message || 'Erreur')); return; }
      setRoom((r: any) => ({ ...(r || {}), settings: next }));
      showToast('Paramètre mis à jour');
    } catch (e) { await showAlert('Erreur lors de la mise à jour'); }
  }

  async function updateMaxPlayers(n: number) {
    if (!room || !userId) return;
    if (userId !== room.ownerId) { await showAlert('Seul le propriétaire peut modifier les paramètres'); return; }
    const nextMax = Math.max(2, Math.min(8, n));
    try {
      const raw = localStorage.getItem('auth');
      const token = raw ? (JSON.parse(raw)?.token || null) : null;
      const res = await fetch(`/api/v1/rooms/${room.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ maxPlayers: nextMax })
      });
      if (!res.ok) { await showAlert('Erreur mise à jour maxPlayers'); return; }
      setRoom((r: any) => ({ ...(r || {}), maxPlayers: nextMax }));
      showToast('Nombre maximal mis à jour');
    } catch (e) { await showAlert('Erreur lors de la mise à jour'); }
  }

  async function copyCode() {
    const ok = await writeText(room?.code || '');
    if (ok) showToast('Code copié'); else await showAlert("Impossible de copier le code");
  }

  async function copyUrl() {
    const ok = await writeText(window.location.href);
    if (ok) showToast('URL copiée'); else await showAlert("Impossible de copier l'URL");
  }

  // robuste: tente clipboard API puis fallback execCommand
  async function writeText(text: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      // ignore and fallback
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const res = document.execCommand('copy');
      document.body.removeChild(textarea);
      return !!res;
    } catch (e) {
      return false;
    }
  }

  if (status === 'UNKNOWN') return <div className="card">Table inconnue ou erreur</div>;

  return (
    <div className={styles.container}>
      <div>
        <div className={styles.headerCard}>
          <div className={styles.roomInfo}>
            <div>
              <div className={styles.headerTitle}>{`Table de ${room?.owner?.name || '—'}`}</div>
              <div className={styles.smallMuted}>{room?.name || ''}</div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.codeBox} onClick={copyCode} role="button" title="Cliquer pour copier le code" aria-label="Copier le code">{room?.code || '---'}</div>
            <button className="btn btn-secondary" onClick={copyUrl} aria-label="Copier l'URL">Copier l'URL</button>
            {status !== 'LOBBY' && (
              <div className={`${styles.statusBadge} ${status === 'RUNNING' ? styles.statusRunning : styles.statusFinished}`}>
                {status}
              </div>
            )}
          </div>
        </div>

        <div className={styles.card} style={{ marginTop: 12 }}>
          <h4>Joueurs</h4>
          <div className={styles.playersGrid} style={{ marginTop: 10 }} aria-label="Liste des joueurs">
            {room?.players && room.players.length ? room.players.map((p: any) => (
              <div key={p.id} className={styles.playerCard}>
                <div className={styles.playerInner}>
                  <span className={`${styles.presenceDot} ${((room?.__presentUserIds || []).includes(p.user?.id) ? styles.present : styles.absent)}`} aria-hidden />
                  <div>
                    <div className={styles.playerName}>{p.user?.name || p.userName || 'Utilisateur'}</div>
                  </div>
                  {room?.owner?.id && userId === room.owner.id && p.user?.id !== userId && (
                    <button aria-label={`Expulser ${p.user?.name || p.userName || 'joueur'}`} className={styles.kickBtn} onClick={async () => {
                      const ok = await showConfirm(`Expulser ${p.user?.name || p.userName || 'ce joueur'} ?`);
                      if (!ok) return;
                      try {
                        const raw = localStorage.getItem('auth');
                        const token = raw ? (JSON.parse(raw)?.token || null) : null;
                        const res = await fetch(`/api/v1/roomplayers/${p.id}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                        if (!res.ok) { await showAlert('Erreur lors de l’expulsion'); return; }
                        showToast('Joueur expulsé');
                        // actualiser en préservant les présences locales
                        const path = window.location.pathname; const code = path.replace('/', '');
                        const r = await fetch(`/api/v1/rooms/${code}`);
                        if (r.ok) {
                          const fetched = await r.json();
                          setRoom((prev: any) => ({ ...(fetched || {}), __presentUserIds: prev?.__presentUserIds || fetched?.__presentUserIds || [] }));
                        }
                      } catch (e) { await showAlert('Erreur lors de l’expulsion'); }
                    }}>✖</button>
                  )}
                </div>
              </div>
            )) : (
              <div>Aucun joueur pour le moment.</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.rightColumn}>
        <div className={styles.card}>
          <div className={styles.actions}>
            {status === 'LOBBY' && room?.owner?.id && userId === room.owner.id && (
              <button className="btn btn-primary" onClick={handleStart}>Démarrer la partie</button>
            )}
            <button className="btn btn-secondary" onClick={handleLeaveOrDelete}>
              {userId === room.ownerId ? 'Supprimer le salon' : 'Quitter la partie'}
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <h4>Paramètres de la partie</h4>
          {(() => {
            const s = room?.settings || {};
            const kraken = !!s.kraken;
            const whale = !!s.whale;
            const loot = !!s.loot;
            const piratePowers = !!s.piratePowers;
            const scoreMethod = s.scoreMethod || 'SKULLKING';
            const gameFormat = s.gameFormat || 'CLASSIC';
            const maxPlayers = room?.maxPlayers || 8;
            return (
              <div style={{ display: 'grid', gap: 10 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className={styles.smallMuted}>Nombre maximal de joueurs</div>
                  <div>
                    {userId === room.ownerId ? (
                      <Dropdown
                        ariaLabel="Nombre maximal de joueurs"
                        value={String(maxPlayers)}
                        options={Array.from({ length: 7 }, (_, i) => ({ value: String(2 + i), label: `${2 + i} joueurs`, description: `Autorise jusqu'à ${2 + i} joueurs` }))}
                        onChange={async (v: string) => {
                          const n = parseInt(v || '2');
                          const currentCount = (room?.players || []).length;
                          if (n < currentCount) { await showAlert(`Impossible : maxPlayers (${n}) inférieur au nombre actuel de joueurs (${currentCount})`); return; }
                          updateMaxPlayers(n);
                        }}
                        className={styles.selectSmall}
                      />
                    ) : (
                      <Tooltip title={room?.settings?.maxPlayersDescription || ''}><strong style={{ color: 'var(--fg)' }}>{maxPlayers}</strong></Tooltip>
                    )}
                  </div>
                </div>

                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className={styles.smallMuted}>Score selon</div>
                  <div>
                    {userId === room.ownerId ? (
                      <Dropdown
                        ariaLabel="Score selon"
                        value={String(scoreMethod)}
                        options={scoreMethods}
                        onChange={(v: string) => updateSetting('scoreMethod', v)}
                        className={styles.selectSmall}
                      />
                    ) : (
                      <Tooltip title={(scoreMethods.find(s=>s.value===scoreMethod)?.description) || ''}><strong style={{ color: 'var(--fg)' }}>{scoreMethods.find(s=>s.value===scoreMethod)?.label}</strong></Tooltip>
                    )}
                  </div>
                </div>

                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className={styles.smallMuted}>Format de la partie</div>
                  <div>
                    {userId === room.ownerId ? (
                      <Dropdown
                        ariaLabel="Format de la partie"
                        value={String(gameFormat)}
                        options={gameFormats}
                        onChange={(v: string) => updateSetting('gameFormat', v)}
                        className={styles.selectSmall}
                      />
                    ) : (
                      <Tooltip title={(gameFormats.find(s=>s.value===gameFormat)?.description) || ''}><strong style={{ color: 'var(--fg)' }}>{gameFormats.find(s=>s.value===gameFormat)?.label}</strong></Tooltip>
                    )}
                  </div>
                </div>

                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className={styles.smallMuted}>Activer les pouvoirs des pirates</div>
                  <div>
                    {userId === room.ownerId ? (
                      <ToggleSwitch checked={piratePowers} onChange={() => toggleSetting('piratePowers')} ariaLabel="Activer les pouvoirs des pirates" />
                    ) : (
                      <strong style={{ color: 'var(--fg)' }}>{piratePowers ? 'Oui' : 'Non'}</strong>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Cartes additionnelles</div>

                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <div className={styles.smallMuted}>Kraken</div>
                    <div>
                      {userId === room.ownerId ? (
                        <ToggleSwitch checked={kraken} onChange={() => toggleSetting('kraken')} ariaLabel="Activer la carte Kraken" />
                      ) : (
                        <strong style={{ color: 'var(--fg)' }}>{kraken ? 'Oui' : 'Non'}</strong>
                      )}
                    </div>
                  </div>

                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <div className={styles.smallMuted}>Baleine Blanche</div>
                    <div>
                      {userId === room.ownerId ? (
                        <ToggleSwitch checked={whale} onChange={() => toggleSetting('whale')} ariaLabel="Activer la carte Baleine Blanche" />
                      ) : (
                        <strong style={{ color: 'var(--fg)' }}>{whale ? 'Oui' : 'Non'}</strong>
                      )}
                    </div>
                  </div>

                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div className={styles.smallMuted}>Butins</div>
                    <div>
                      {userId === room.ownerId ? (
                        <ToggleSwitch checked={loot} onChange={() => toggleSetting('loot')} ariaLabel="Activer la carte Butin" />
                      ) : (
                        <strong style={{ color: 'var(--fg)' }}>{loot ? 'Oui' : 'Non'}</strong>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}
        </div>
      </div>

      <Chat roomCode={room?.code} visible={!!userId && (room?.players || []).some((p: any) => p.user?.id === userId)} />

      {dialog && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', zIndex: 9999 }}>
          <div style={{ background: 'rgba(0,0,0,0.5)', position: 'absolute', inset: 0 }} onClick={() => setDialog(null)} />
          <div style={{ background: 'var(--card)', padding: 18, borderRadius: 10, minWidth: 280, zIndex: 10000 }}>
            <div style={{ marginBottom: 12, fontWeight: 700 }}>{dialog.title || ''}</div>
            <div style={{ marginBottom: 12 }}>{dialog.message}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {dialog.type === 'confirm' ? (
                <>
                  <button className="btn btn-plain" onClick={() => { (dialog as any).resolve(false); setDialog(null); }}>Annuler</button>
                  <button className="btn btn-primary" onClick={() => { (dialog as any).resolve(true); setDialog(null); }}>Confirmer</button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={() => { setDialog(null); const cb = (window as any).__dialog_ok; if (cb) { cb(); delete (window as any).__dialog_ok; } }}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', right: 18, bottom: 18, background: 'var(--card)', padding: '8px 12px', borderRadius: 8, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
