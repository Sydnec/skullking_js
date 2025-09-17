"use client";

import React, { useEffect, useState, useRef } from 'react';
import styles from './Chat.module.css';
import { apiFetchWithAuth } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';
import { useSocket } from '../../lib/useSocket';
import { Message as MessageType } from '../../lib/types';
import { logDev } from '../../lib/logger';

type Message = { id: string; userId: string; userName: string; text: string; createdAt: string };

export default function Chat({ roomCode, visible }: { roomCode?: string; visible?: boolean }) {
  // open state persisted in localStorage per room (key: chat_open_<roomCode|global>)
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const key = `chat_open_${roomCode || 'global'}`;
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null; // kept for backward compatibility, persisted per-user preference
      return raw === '1' || raw === 'true';
    } catch {
      return false;
    }
  });
  const openRef = React.useRef<boolean>(false);
  const [hasUnread, setHasUnread] = useState<boolean>(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [text, setText] = useState('');
  const { user, token } = useAuth();
  const currentUserId = user?.id || null;
  const listRef = useRef<HTMLDivElement | null>(null);

  // helper to normalize messages so both socket and send() can use it
  const mapMessage = (m: any): Message => ({
    id: m.id || String(Date.now()),
    userId: m.userId || m.user?.id,
    userName: m.userName || m.user?.name || m.user?.userName || 'Utilisateur',
    text: m.content || m.text || '',
    createdAt: m.createdAt || new Date().toISOString(),
  });

  // load persisted open state on mount or when roomCode changes
  // (initial value now read synchronously in useState initializer)
  useEffect(() => { try { openRef.current = open; } catch {} }, [open]);

  // persist open state when it changes
  useEffect(() => {
    try {
      const key = `chat_open_${roomCode || 'global'}`;
      localStorage.setItem(key, open ? '1' : '0');
    } catch {}
  }, [open, roomCode]);

  useEffect(()=>{
    // user comes from AuthContext

    // placeholder: fetch recent messages for room
    async function load() {
      if (!roomCode) return;
      try {
        const res = await apiFetchWithAuth(`/messages/room/${roomCode}`, undefined, token || undefined);
        if (res.ok) {
          const arr = await res.json();
          // normalize messages
          setMessages((arr || []).map((m: any) => ({ id: m.id, userId: m.userId || m.user?.id, userName: m.userName || m.user?.name || m.user?.userName || 'Utilisateur', text: m.content || m.text || '', createdAt: m.createdAt || new Date().toISOString() })));
        }
      } catch(e:any){ logDev('chat load failed', e); }
    }
    load();
  },[roomCode, user?.id, token]);

  // useSocket for real-time messages
  useSocket({ code: roomCode, userId: currentUserId }, {
    'message-created': (payload:any) => {
      try {
        const nm = {
          id: payload.id || String(Date.now()),
          userId: payload.userId || payload.user?.id || null,
          userName: payload.userName || payload.user?.name || 'Utilisateur',
          text: payload.content || payload.text || '',
          createdAt: payload.createdAt || new Date().toISOString(),
        };
        setMessages(prev => {
          if (prev.some(it => it.id === nm.id)) return prev;
          if (!open) setHasUnread(true);
          return [...prev, nm];
        });
      } catch (e:any) { logDev('socket message handler error', e); }
    }
  });

  // scroll automatiquement vers le bas quand des messages arrivent **si** le chat est ouvert
  useEffect(() => {
    if (!open) return;
    // essayer un raf pour laisser le DOM se mettre à jour
    const rafId = requestAnimationFrame(() => {
      try { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; } catch {}
    });
    // fallback au cas où : laisser le temps à l'animation CSS (max-height) de se terminer
    const fallback = setTimeout(() => {
      try { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; } catch {}
    }, 160);
    return () => { cancelAnimationFrame(rafId); clearTimeout(fallback); };
  }, [messages, open]);

  // quand on ouvre le chat, forcer le scroll vers le bas après l'animation d'ouverture
  useEffect(() => {
    if (!open) return;
    // la transition de max-height est ~340ms dans le CSS ; utiliser un délai un peu plus court ou égal
    const timer = setTimeout(() => {
      try { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; } catch {}
    }, 360);
    return () => clearTimeout(timer);
  }, [open]);

  async function send() {
    if (!text.trim() || !roomCode) return;
    try {
      const uid = currentUserId || 'local';
      const uname = user?.name || user?.username || 'Vous';

      // optimistic local message so sender sees it immediately
      const localMsg: Message = {
        id: `local_${Date.now()}`,
        userId: uid || 'local',
        userName: uname || 'Vous',
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, localMsg]);

      const body = { roomCode, content: text };
      // clear input immediately
      setText('');

      const res = await apiFetchWithAuth(`/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, token || undefined);
      if (!res.ok) return;

      // Try to append/replace with canonical message returned by API
      const created = await res.json().catch(() => null);
      if (created) {
        const payload = (created && (created.message || created)) || null;
        if (payload) {
          setMessages(prev => {
            const nm = mapMessage(payload);
            if (!nm.id) return prev;
            // if server id already present, keep existing
            if (prev.some(it => it.id === nm.id)) return prev;
            // try to find optimistic message and replace it
            const idx = prev.findIndex(it => String(it.id).startsWith('local_') && it.text === nm.text && it.userId === nm.userId);
            if (idx !== -1) {
              const copy = [...prev];
              copy[idx] = nm;
              return copy;
            }
            return [...prev, nm];
          });
        }
      }
    } catch(e:any){ logDev('chat send failed', e); }
  }

  // submit on Enter
  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // make header fully clickable and keyboard-accessible
  function toggleOpen() {
    try {
      setOpen(prev => { const next = !prev; if (next) setHasUnread(false); return next; });
    } catch {}
  }

  if (!visible) return null;

  return (
    // container fixed in bottom-right; different styles selon open/closed
    <div className={`${styles.chatContainer} ${open ? styles.expanded : styles.collapsed}`}>
      <div className={styles.chatWrap}>
        <div
          className={styles.chatHeader}
          role="button"
          tabIndex={0}
          aria-pressed={open}
          aria-label={open ? 'Fermer le chat' : 'Ouvrir le chat'}
          // s'assurer que le header occupe toute la largeur du parent afin que la zone cliquable soit large
          style={{ width: '100%' }}
          onClick={() => toggleOpen()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOpen(); } }}
        >
          {open ? '▼' : '▲'} Chat
          {/* unread dot when collapsed */}
          {!open && hasUnread && <span className={styles.unreadDot} aria-hidden />}
        </div>
        {open && (
          <div className={styles.chatBody}>
            <div className={styles.messages} ref={listRef}>
              {messages.map(m => {
                const mine = currentUserId && m.userId && currentUserId === m.userId;
                return (
                  <div key={m.id} className={`${styles.msgRow} ${mine ? styles.msgRowRight : styles.msgRowLeft}`}>
                    <div className={`${styles.bubble} ${mine ? styles.bubbleMine : styles.bubbleOther}`}>
                      <div className={styles.msgMeta}>
                        <strong className={mine ? styles.authorMine : styles.authorOther}>{m.userName}</strong>
                        <span className={styles.msgTime}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={styles.msgText}>{m.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={styles.chatInputRow}>
              <input className={styles.chatInput} value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={onInputKeyDown} placeholder="Message..." aria-label="Message" />
              <button type="button" className="btn btn-primary" onClick={send}>Envoyer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
