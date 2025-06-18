'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType } from './Toast';

interface ToastData {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string, duration?: number) => void;
  showError: (message: string, title?: string, duration?: number) => void;
  showWarning: (message: string, title?: string, duration?: number) => void;
  showInfo: (message: string, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((
    type: ToastType,
    message: string,
    title?: string,
    duration: number = 5000
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastData = {
      id,
      type,
      title,
      message,
      duration
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const showSuccess = useCallback((message: string, title?: string, duration?: number) => {
    showToast('success', message, title, duration);
  }, [showToast]);

  const showError = useCallback((message: string, title?: string, duration?: number) => {
    showToast('error', message, title, duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string, duration?: number) => {
    showToast('warning', message, title, duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string, duration?: number) => {
    showToast('info', message, title, duration);
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo
      }}
    >
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-h-screen overflow-hidden">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
