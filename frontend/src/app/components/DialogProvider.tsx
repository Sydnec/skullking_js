'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import styles from './DialogProvider.module.css';

type DialogState =
  | null
  | { type: 'alert'; title?: string; message: string; resolve?: () => void }
  | { type: 'confirm'; title?: string; message: string; resolve?: (v: boolean) => void };

const DialogContext = createContext<{
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
} | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const resolveRef = useRef<((v?: any) => void) | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (dialog) {
      // save focused element
      previousActive.current = document.activeElement as HTMLElement | null;
      // focus trap: focus container
      try { containerRef.current?.focus(); } catch {}
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          // cancel
          if (dialog.type === 'confirm') {
            dialog.resolve?.(false);
          } else {
            dialog.resolve?.();
          }
          setDialog(null);
        }
      };
      document.addEventListener('keydown', onKey);
      return () => { document.removeEventListener('keydown', onKey); try { previousActive.current?.focus(); } catch {} };
    }
  }, [dialog]);

  function showAlert(message: string, title?: string) {
    return new Promise<void>((resolve) => {
      setDialog({ type: 'alert', title, message, resolve });
      resolveRef.current = resolve;
    });
  }

  function showConfirm(message: string, title?: string) {
    return new Promise<boolean>((resolve) => {
      setDialog({ type: 'confirm', title, message, resolve });
      resolveRef.current = resolve as any;
    });
  }

  async function onOk() {
    if (!dialog) return;
    if (dialog.type === 'confirm') {
      (dialog.resolve as any)?.(true);
    } else {
      (dialog.resolve as any)?.();
    }
    setDialog(null);
  }

  async function onCancel() {
    if (!dialog) return;
    if (dialog.type === 'confirm') {
      (dialog.resolve as any)?.(false);
    } else {
      (dialog.resolve as any)?.();
    }
    setDialog(null);
  }

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialog && (
        <div className={styles.overlay} aria-hidden={false}>
          <div className={styles.backdrop} onClick={() => onCancel()} />
          <div ref={containerRef} tabIndex={-1} role="dialog" aria-modal="true" className={styles.dialog}>
            <div className={styles.dialogTitle}>{dialog.title || ''}</div>
            <div className={styles.dialogMessage}>{dialog.message}</div>
            <div className={styles.dialogActions}>
              {dialog.type === 'confirm' ? (
                <>
                  <button type="button" className="btn btn-plain" onClick={() => onCancel()}>Annuler</button>
                  <button type="button" className="btn btn-primary" onClick={() => onOk()}>Confirmer</button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => onOk()}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}
