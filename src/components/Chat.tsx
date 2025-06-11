'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/api';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'USER' | 'SYSTEM';
}

interface ChatProps {
  user: User;
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
}

export default function Chat({ user, onSendMessage, messages }: ChatProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 h-full flex flex-col">
      {/* Header */}
      <h2 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white flex-shrink-0">Chat</h2>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-2 space-y-1 min-h-0 bg-gray-50 dark:bg-gray-700 rounded p-2">
        {messages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center text-sm">Aucun message pour le moment...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`${msg.type === 'SYSTEM' ? 'text-center' : ''}`}>
              {msg.type === 'SYSTEM' ? (
                <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                  {msg.message}
                </div>
              ) : (
                <div className={`${msg.userId === user.id ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-[85%] px-2 py-1 rounded text-xs ${
                    msg.userId === user.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white dark:bg-gray-600 border dark:border-gray-500 text-gray-900 dark:text-white'
                  }`}>
                    <div className="flex items-center gap-1">
                      {msg.userId !== user.id && (
                        <span className="font-semibold text-xs opacity-75">
                          {msg.username}:
                        </span>
                      )}
                      <span className="flex-1">{msg.message}</span>
                      <span className={`text-xs opacity-60 ml-1 ${
                        msg.userId === user.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0">
        <div className="flex gap-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez votre message..."
            className="flex-1 px-2 py-1 border dark:border-gray-600 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors"
          >
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}
