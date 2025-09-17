'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext<{ showToast: (msg: string) => void } | null>(null);

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
        <div style={{ position: 'fixed', right: 18, bottom: 18, background: 'var(--card)', padding: '8px 12px', borderRadius: 8, zIndex: 9999 }} role="status" aria-live="polite">
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
