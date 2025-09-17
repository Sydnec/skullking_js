'use client'

import React from 'react';
import { apiFetchWithAuth } from '../../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styles from './RoomList.module.css';
import Tooltip from './Tooltip';
import { useAuth } from '../../lib/useAuth';
import { useSocket } from '../../lib/useSocket';
import { Room } from '../../lib/types';

export default function RoomList({ onJoin }: { onJoin?: (id: string) => void }) {
  const queryClient = useQueryClient();
  const { data: rooms = [] as Room[], isLoading: loading, isError, error } = useQuery<Room[], Error>(['rooms'], async () => {
    const res = await apiFetchWithAuth('/rooms', undefined, undefined);
    if (!res.ok) throw new Error('Erreur fetch rooms');
    const d = await res.json();
    return d || [];
  }, { refetchOnWindowFocus: false });

  const { user } = useAuth();
  const userId = user?.id || null;

  // socket: invalidate rooms query on relevant events
  useSocket(undefined, {
    'room-created': () => queryClient.invalidateQueries(['rooms']),
    'room-list-updated': () => queryClient.invalidateQueries(['rooms']),
    'player-joined': () => queryClient.invalidateQueries(['rooms']),
  });

  if (loading) return <div className={styles.container}>Chargement des tables…</div>;
  if (isError) return <div className={styles.container}>Erreur: {String((error as Error)?.message || error)}</div>;
  if (!rooms.length) return <div className={styles.container}>Aucune table trouvée</div>;

  function isMemberOf(r: Room) {
    // considère propriétaire ou joueur listé comme membre
    const ownerId = r?.owner?.id || r?.ownerId || null;
    if (userId && (ownerId === userId)) return true;
    const players = r.players || [];
    if (userId && players.some((p: any) => p.user?.id === userId || p.userId === userId || p.id === userId)) return true;
    return false;
  }

  const myTables = (rooms || []).filter((r: Room) => isMemberOf(r));
  const publicTables = (rooms || []).filter((r: Room) => !isMemberOf(r));

  function handleJoin(r: Room) {
    if (onJoin) onJoin(r.code);
  }

  function handleObserve(r: Room) {
    // pass a query suffix so the caller can navigate in observe mode
    if (onJoin) onJoin(r.code + '?mode=observe');
  }

  // Start control removed from RoomList — moved into individual room view

  function statusLabel(r: Room) {
    if (r.status === 'RUNNING') return 'Partie en cours';
    if (r.status === 'FINISHED') return 'Partie terminée';
    const playersCount = (r.players?.length || 0);
    const maxPlayers = r.maxPlayers || 0;
    if (playersCount >= maxPlayers) return 'Salle pleine';
    return 'Disponible';
  }

  function renderList(items: Room[]) {
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

          const ownerName = r?.owner?.name || (r?.ownerId ? 'Utilisateur' : '—');

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
                    } catch { return r.code; }
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
                <button type="button" className="btn btn-primary" onClick={() => handleJoin(r)}>Rejoindre</button>
                <button type="button" className="btn btn-secondary" onClick={() => handleObserve(r)}>Observer</button>
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
