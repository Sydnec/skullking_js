'use client'

import React from 'react';
import styles from './RoomHeader.module.css';
import { useDialog } from '../../components/DialogProvider';

export default function RoomHeader({ room, status, showToast }: { room: any; status: string; showToast?: (msg: string) => void }) {
  const { showAlert } = useDialog();

  async function writeText(text: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback
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
    } catch {
      return false;
    }
  }

  async function handleCopyCode() {
    const ok = await writeText(room?.code || '');
    if (ok) showToast?.('Code copié'); else await showAlert("Impossible de copier le code");
  }

  async function handleCopyUrl() {
    const ok = await writeText(window.location.href);
    if (ok) showToast?.('URL copiée'); else await showAlert("Impossible de copier l'URL");
  }

  return (
    <div className={styles.headerCard}>
      <div className={styles.roomInfo}>
        <div>
          <div className={styles.headerTitle}>{`Table de ${room?.owner?.name || '—'}`}</div>
          <div className={styles.smallMuted}>{room?.name || ''}</div>
        </div>
      </div>
      <div className={styles.headerRight}>
        <div className={styles.codeBox} onClick={handleCopyCode} role="button" title="Cliquer pour copier le code" aria-label="Copier le code" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCopyCode(); }}>{room?.code || '---'}</div>
        <button type="button" className="btn btn-secondary" onClick={handleCopyUrl} aria-label="Copier l'URL">Copier l'URL</button>
        {status !== 'LOBBY' && (
          <div className={`${styles.statusBadge} ${status === 'RUNNING' ? styles.statusRunning : styles.statusFinished}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
