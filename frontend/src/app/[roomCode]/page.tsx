'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetchWithAuth } from '../../lib/api';
import styles from './RoomPage.module.css';
import Chat from '../components/Chat';
import { useAuth } from '../../lib/useAuth';
import { useSocket } from '../../lib/useSocket';
import { logDev } from '../../lib/logger';
import { useRoom } from '../../lib/useRoom';
import { useRoomPlayers } from '../../lib/useRoomPlayers';
import { useDialog } from '../components/DialogProvider';
import RoomHeader from './components/RoomHeader';
import PlayersList from './components/PlayersList';
import Controls from './components/Controls';
import SettingsPanel from './components/SettingsPanel';
import { useToast } from '../components/ToastProvider';
import { useOwnerGuard } from '../hooks/useOwnerGuard';

export default function RoomPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState<'LOBBY'|'RUNNING'|'FINISHED'|'UNKNOWN'>('UNKNOWN');
  const [room, setRoom] = useState<any>(null);
  const userId = user?.id || null;
  const firstLoadRef = useRef<boolean>(true);
  const pathname = usePathname();
  const code = (pathname || window.location.pathname || '').replace('/', '');

  // useRoom hook centralizes fetching + mutations
  const { data: roomData, refetch: refetchRoom, startRoom, updateRoom } = useRoom(code);
  const { deletePlayer } = useRoomPlayers();
  const { showAlert, showConfirm } = useDialog();
  const { ensureOwner, confirmOwnerAction } = useOwnerGuard();

  // keep local room state but prefer react-query data when available
  useEffect(() => {
    // Si la room n'existe plus (useRoom renvoie null pour 404), rediriger
    // proprement vers la page d'accueil et prévenir l'utilisateur.
    if (roomData === null) {
      try { showToast('Le salon a été supprimé. Vous allez être redirigé.'); } catch { /* ignore */ }
      router.push('/');
      return;
    }

    if (roomData) {
      setRoom((prev: any) => ({ ...(roomData || {}), __presentUserIds: prev?.__presentUserIds || roomData?.__presentUserIds || [] }));
      setStatus((roomData && roomData.status) || 'UNKNOWN');
    }
  }, [roomData, router, showToast]);

  // UI helpers: toast
  // toasts are handled by ToastProvider via useToast

  // useDialog provides showAlert/showConfirm

  const fetchRoom = useCallback(async () => {
    try {
      // delegate to react-query refetch
      await refetchRoom();
    } catch (err) {
      logDev('fetchRoom failed (useRoom refetch)', err);
      setStatus('UNKNOWN');
    }
  }, [refetchRoom]);

  useEffect(() => {
    // initial load
    fetchRoom();

    setTimeout(() => { try { firstLoadRef.current = false; } catch (e) { logDev('firstLoadRef set failed', e); } }, 800);
  }, [fetchRoom, router, user]);

  // socket handlers (top-level hook call)
  useSocket({ code, userId }, {
    'room-updated': fetchRoom,
    'player-joined': fetchRoom,
    'room-list-updated': fetchRoom,
    'presence-updated': (payload: any) => { setRoom((r: any) => ({ ...(r || {}), __presentUserIds: payload?.presentUserIds || [] })); }
  });

  async function handleStart() {
    if (!room) return;
    if (!userId) { await showAlert('Utilisateur non identifié'); return; }

    if (!(await ensureOwner(room, userId))) return;

    try {
      // use react-query mutation
      await startRoom({ token: token || undefined });
      // after success, refetch to get latest room
      await refetchRoom();
      showToast('Partie démarrée');
    } catch (e:any) {
      const msg = (e?.message) || 'Erreur lors du démarrage';
      await showAlert(msg);
    }
  }

  async function handleLeaveOrDelete() {
    if (!room || !userId) { await showAlert("Impossible d'effectuer l'action - utilisateur non identifié"); return; }

    if (userId === room.ownerId) {
      const ok = await confirmOwnerAction(room, userId, "Voulez-vous vraiment supprimer ce salon ? Cette action est irréversible.");
      if (!ok) return;
      try {
        const res = await apiFetchWithAuth(`/rooms/${room.code}`, { method: 'DELETE' }, token || undefined);
        if (!res.ok) { await showAlert('Erreur lors de la suppression du salon'); return; }
        router.push('/');
      } catch { await showAlert('Erreur lors de la suppression'); }
      return;
    }

    const rp = (room.players || []).find((p: any) => (p.user?.id === userId || p.userId === userId));
    if (!rp) { await showAlert('Impossible de quitter : enregistrement joueur introuvable'); router.push('/'); return; }
    const ok = await showConfirm('Quitter la partie ?'); if (!ok) return;
    try {
      await deletePlayer({ id: rp.id, token: token || undefined });
      await refetchRoom();
      router.push('/');
    } catch { await showAlert('Erreur lors de la sortie'); }
  }

  async function updateSetting(key: string, value: any) {
    if (!room || !userId) return;
    if (userId !== room.ownerId) { await showAlert('Seul le propriétaire peut modifier les paramètres'); return; }
    const current = room?.settings || {};
    const next = { ...current, [key]: value };
    try {
      await updateRoom({ settings: next, maxPlayers: room.maxPlayers }, { token: token || undefined });
      setRoom((r: any) => ({ ...(r || {}), settings: next }));
      showToast('Paramètre mis à jour');
    } catch { await showAlert('Erreur lors de la mise à jour'); }
  }

  async function updateMaxPlayers(n: number) {
    if (!room || !userId) return;
    if (userId !== room.ownerId) { await showAlert('Seul le propriétaire peut modifier les paramètres'); return; }
    const nextMax = Math.max(2, Math.min(8, n));
    try {
      // use updateRoom mutation
      await updateRoom({ maxPlayers: nextMax }, { token: token || undefined });
      // Update local state optimistically
      setRoom((r: any) => ({ ...(r || {}), maxPlayers: nextMax }));
      showToast('Nombre maximal mis à jour');
    } catch (e:any) { await showAlert(String(e?.message || e)); }
  }

  async function handleKick(p: any) {
    const ok = await confirmOwnerAction(room, userId, `Expulser ${p.user?.name || p.userName || 'ce joueur'} ?`);
    if (!ok) return;
    try {
      await deletePlayer({ id: p.id, token: token || undefined });
      showToast('Joueur expulsé');
      await refetchRoom();
    } catch { await showAlert('Erreur lors de l’expulsion'); }
  }

  if (status === 'UNKNOWN') return <div className="card">Table inconnue ou erreur</div>;

  return (
    <div className={styles.container}>
      <div>
        <RoomHeader room={room} status={status} />
        <PlayersList room={room} userId={userId} onKick={handleKick} />
      </div>

      <div className={styles.rightColumn}>
        <Controls status={status} room={room} userId={userId} onStart={handleStart} onLeaveOrDelete={handleLeaveOrDelete} />
        <SettingsPanel room={room} userId={userId} onUpdateSetting={async (k,v) => updateSetting(k,v)} onUpdateMax={async (n) => updateMaxPlayers(n)} />
      </div>

      <Chat roomCode={room?.code} visible={!!userId && (room?.players || []).some((p: any) => p.user?.id === userId)} />

      {/* Toast UI provided by ToastProvider */}
    </div>
  );
}
