'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';
import { logDev, warnDev } from './logger';

let singletonSocket: Socket | null = null;
let singletonUrl: string | null = null;

// Global registry of handlers by event name. Each useSocket() call will register
// its handlers here; a single central dispatcher attached to the socket will
// fan out incoming events to all registered callbacks. This prevents
// re-attaching socket event listeners per-component and avoids duplicate calls.
const globalHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();

export function getSocketSingleton(): Socket | null {
  return singletonSocket;
}

export function ensureSocket(url?: string): Socket {
  const resolved = url || (typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || window.location.origin) : (process.env.NEXT_PUBLIC_API_URL || ''));
  if (!singletonSocket || singletonUrl !== resolved) {
    try {
      // configure socket.io reconnection with sensible backoff parameters
      singletonSocket = io(resolved, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.5,
        transports: ['websocket', 'polling'],
      });
      singletonUrl = resolved;
      logDev('socket created', resolved);

      // Attach a single central onAny dispatcher which fans out to registered handlers
      try {
        singletonSocket.onAny((event: string, ...args: any[]) => {
          try {
            const set = globalHandlers.get(event);
            if (set) {
              // copy to array to avoid mutation during iteration
              Array.from(set).forEach((fn) => {
                try { fn(...args); } catch (e) { warnDev('socket handler error (fanout)', e); }
              });
            }
          } catch (e) { warnDev('onAny dispatcher error', e); }
        });
      } catch (e) { warnDev('attach onAny failed', e); }

      singletonSocket.on('connect', () => logDev('socket connected', singletonSocket?.id));
      singletonSocket.on('reconnect_attempt', (n) => logDev('socket reconnect attempt', n));
      singletonSocket.on('disconnect', (reason) => logDev('socket disconnected', reason));
    } catch (e) { warnDev('socket create failed', e); }
  }
  return singletonSocket as Socket;
}

export function closeSocket() {
  try {
    if (singletonSocket) {
      try { singletonSocket.offAny?.(() => {}); } catch {}
      singletonSocket.disconnect();
      singletonSocket = null;
      singletonUrl = null;
      globalHandlers.clear();
    }
  } catch (e) { warnDev('socket close failed', e); }
}

export function useSocket(join?: { code?: string; userId?: string | null }, handlers?: { [ev: string]: (...args:any[]) => void }) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = ensureSocket();

    // register handlers into the global registry
    if (handlersRef.current) {
      Object.entries(handlersRef.current).forEach(([ev, fn]) => {
        let set = globalHandlers.get(ev);
        if (!set) { set = new Set(); globalHandlers.set(ev, set); }
        set.add(fn as any);
      });
    }

    try {
      // emit join when connected
      if (join?.code) {
        if (socket.connected) {
          try { socket.emit('join-room', { code: join.code, userId: join.userId || null }); } catch (e) { warnDev('emit join-room failed (already connected)', e); }
        } else {
          // ensure we request join on next connect
          const onConnect = () => {
            try { socket.emit('join-room', { code: join.code, userId: join.userId || null }); } catch (e) { warnDev('emit join-room failed', e); }
          };
          socket.once('connect', onConnect);
        }
      }
    } catch (e) { warnDev('useSocket join emit failed', e); }

    return () => {
      // unregister handlers
      if (handlersRef.current) {
        Object.entries(handlersRef.current).forEach(([ev, fn]) => {
          const set = globalHandlers.get(ev);
          if (set) {
            set.delete(fn as any);
            if (set.size === 0) globalHandlers.delete(ev);
          }
        });
      }
    };
    // re-register only when join changes; handlers changes are handled via refs and global registry
  }, [join?.code, join?.userId]);
}
