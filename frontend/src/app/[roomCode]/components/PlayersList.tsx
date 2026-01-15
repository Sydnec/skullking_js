'use client'

import React from 'react';
import styles from './PlayersList.module.css';

export default function PlayersList({ room, userId, onKick }: { room: any; userId: string | null; onKick: (p: any) => Promise<void>; }) {
  return (
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
                <button type="button" aria-label={`Expulser ${p.user?.name || p.userName || 'joueur'}`} className={styles.kickBtn} onClick={async () => { await onKick(p); }}>✖</button>
              )}
            </div>
          </div>
        )) : (
          <div>Aucun joueur pour le moment.</div>
        )}
      </div>
    </div>
  );
}
