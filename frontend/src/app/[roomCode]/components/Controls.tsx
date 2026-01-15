'use client'

import React from 'react';
import styles from './Controls.module.css';

export default function Controls({ status, room, userId, onStart, onLeaveOrDelete }: { status: string; room: any; userId: string | null; onStart: () => Promise<void>; onLeaveOrDelete: () => Promise<void>; }) {
  return (
    <div className={styles.card}>
      <div className={styles.actions}>
        {status === 'LOBBY' && room?.owner?.id && userId === room.owner.id && (
          <button type="button" className="btn btn-primary" onClick={onStart}>Démarrer la partie</button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onLeaveOrDelete}>
          {userId === room.ownerId ? 'Supprimer le salon' : 'Quitter la partie'}
        </button>
      </div>
    </div>
  );
}
