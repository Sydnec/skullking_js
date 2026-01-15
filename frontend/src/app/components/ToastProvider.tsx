'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext<{ showToast: (msg: string) => void } | null>(null);

import styles from './ToastProvider.module.css';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setTimeout(() => setToast(null), 200);
    }, 2500) as unknown as number;
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
