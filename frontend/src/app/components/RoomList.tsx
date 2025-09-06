'use client'

import React, { useEffect, useState } from 'react';
import styles from './RoomList.module.css';
import Tooltip from './Tooltip';
import { io as ioClient, Socket } from 'socket.io-client';

export default function RoomList({ onJoin }: { onJoin?: (id: string) => void }) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // lire l'utilisateur courant (forme normalisée stockée dans localStorage)
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        const id = parsed?.user?.id || parsed?.id || parsed?.userId || parsed?.sub || null;
        setUserId(id || null);
      }
    } catch (e) {
      setUserId(null);
    }

    // fetch initial rooms
    fetchRooms();

    // Init socket connection to listen for room updates
    let socket: Socket | null = null;
    try {
      const url = (typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_WS_URL || window.location.origin)) || undefined;
      socket = ioClient(url);

      socket.on('connect', () => {
        // socket connected
      });

      socket.on('room-created', () => {
        fetchRooms();
      });

      socket.on('room-list-updated', () => {
        fetchRooms();
      });

      socket.on('player-joined', () => {
        fetchRooms();
      });
    } catch (socketErr) {
      // ignore socket errors silently
    }

    return () => {
      if (socket) {
        socket.off('room-created');
        socket.off('room-list-updated');
        socket.off('player-joined');
        try { socket.disconnect(); } catch (e) { /* ignore */ }
      }
    };
  }, []);

  async function fetchRooms() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/v1/rooms');
      if (!res.ok) throw new Error('Erreur fetch rooms');
      const data = await res.json();
      setRooms(data || []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className={styles.container}>Chargement des tables…</div>;
  if (err) return <div className={styles.container}>Erreur: {err}</div>;
  if (!rooms.length) return <div className={styles.container}>Aucune table trouvée</div>;

  function isMemberOf(r: any) {
    // considère propriétaire ou joueur listé comme membre
    const ownerId = r?.owner?.id || r?.ownerId || r?.ownerName || null;
    if (userId && (ownerId === userId)) return true;
    const players = r.players || [];
    if (userId && players.some((p: any) => p.user?.id === userId || p.userId === userId || p.id === userId)) return true;
    return false;
  }

  const myTables = rooms.filter(r => isMemberOf(r));
  const publicTables = rooms.filter(r => !isMemberOf(r));

  function handleJoin(r: any) {
    if (onJoin) onJoin(r.code);
  }

  function handleObserve(r: any) {
    // pass a query suffix so the caller can navigate in observe mode
    if (onJoin) onJoin(r.code + '?mode=observe');
  }

  // Start control removed from RoomList — moved into individual room view

  function statusLabel(r: any) {
    if (r.status === 'RUNNING') return 'Partie en cours';
    if (r.status === 'FINISHED') return 'Partie terminée';
    const playersCount = (r.players?.length || 0);
    const maxPlayers = r.maxPlayers || 0;
    if (playersCount >= maxPlayers) return 'Salle pleine';
    return 'Disponible';
  }

  function renderList(items: any[]) {
    if (!items.length) return <div className={styles.container}>Aucune table</div>;
    return (
      <ul className={styles.list}>
        {items.map(r => {
          const playersCount = (r.players?.length || 0);
          const maxPlayers = r.maxPlayers || 0;
          let pillClass = styles.green;
          if (r.status === 'FINISHED') pillClass = styles.blue;
          if (r.status === 'RUNNING') pillClass = styles.red;
          else if (playersCount >= maxPlayers) pillClass = styles.orange;

          const ownerName = r?.owner?.name || r?.ownerName || r?.owner?.username || (r?.ownerId ? 'Utilisateur' : '—');

          return (
            <li key={r.id} className={styles.item}>

              <div className={styles.left}>
                <div className={styles.statusWrapper}>
                  <Tooltip title={statusLabel(r)}>
                    <div className={`${styles.status} ${pillClass}`} aria-hidden />
                  </Tooltip>
                </div>

                <div>
                  {/* Tooltip showing key room settings when hovering the code */}
                  <Tooltip title={(() => {
                    try {
                      const s = r.settings || {};
                      return (
                        <ul style={{ margin: 0, padding: '4px 8px', listStyle: 'none'}}>
                          {s.gameFormat ? <li><strong>Format :</strong> {s.gameFormat}</li> : <li><strong>Format :</strong> Classique</li>}
                          {s.scoreMethod ? <li><strong>Score :</strong> {s.scoreMethod}</li> : <li><strong>Score :</strong> Skull King</li>}
                          <li><strong>Pouvoirs :</strong> {s.piratePowers ? 'Oui' : 'Non'}</li>
                          <li><strong>Kraken :</strong> {s.kraken ? 'Oui' : 'Non'}</li>
                          <li><strong>Baleine :</strong> {s.whale ? 'Oui' : 'Non'}</li>
                          <li><strong>Butin :</strong> {s.loot ? 'Oui' : 'Non'}</li>
                        </ul>
                      );
                    } catch (e) { return r.code; }
                  })()}>
                    <div className={styles.code}>{r.code}</div>
                  </Tooltip>
                  <div className={styles.owner}>Table de {ownerName}</div>
                </div>

              </div>

              <div className={styles.center}>
                <Tooltip title={r.players && r.players.length ? (
                  <ul style={{ margin: 0, padding: '6px 8px'}}>
                    {r.players.map((p: any) => (
                      <li key={p.id}>{p.user?.name || p.userName || p.userId || 'Utilisateur'}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ padding: '6px 8px' }}>Aucun joueur</div>
                )}>
                  <div className={styles.playerCount}>{playersCount}/{maxPlayers}</div>
                </Tooltip>
              </div>

              <div className={styles.right}>
                <button className="btn btn-primary" onClick={() => handleJoin(r)}>Rejoindre</button>
                <button className="btn btn-secondary" onClick={() => handleObserve(r)}>Observer</button>
                {/* Start button removed from list view; control moved into room page */}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className={styles.container} aria-label="Liste des tables de jeu">
      <div style={{ marginBottom: 12 }}>
        <h3>Vos tables :</h3>
        {renderList(myTables)}
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Tables publiques :</h3>
        {renderList(publicTables)}
      </div>
    </div>
  );
}
