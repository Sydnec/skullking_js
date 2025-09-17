'use client'

import { useDialog } from '../components/DialogProvider';

export function useOwnerGuard() {
  const { showAlert, showConfirm } = useDialog();

  async function ensureOwner(room: any, userId: string | null) {
    if (!room || !userId) {
      await showAlert("Impossible d'effectuer l'action - utilisateur non identifié");
      return false;
    }
    if (room.owner?.id !== userId) {
      await showAlert('Seul le propriétaire peut effectuer cette action');
      return false;
    }
    return true;
  }

  async function confirmOwnerAction(room: any, userId: string | null, message: string) {
    const okOwner = await ensureOwner(room, userId);
    if (!okOwner) return false;
    return await showConfirm(message);
  }

  return { ensureOwner, confirmOwnerAction, showAlert, showConfirm };
}
