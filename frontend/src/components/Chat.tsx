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
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        return '--:--';
      }
      return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-full max-h-[600px] flex flex-col">
      {/* Header */}
      <h2 className="text-base font-semibold mb-2 text-gray-900 dark:text-white flex-shrink-0">Chat</h2>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-1 min-h-0 max-h-[400px] bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
        {messages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center text-xs">Aucun message pour le moment...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`${msg.type === 'SYSTEM' ? 'text-center' : ''}`}>
              {msg.type === 'SYSTEM' ? (
                <div className="text-xs text-gray-500 dark:text-gray-400 italic py-0.5">
                  {msg.message}
                </div>
              ) : (
                <div className={`${msg.userId === user.id ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-[85%] px-2 py-1 rounded-md text-xs ${
                    msg.userId === user.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white dark:bg-gray-600 border dark:border-gray-500 text-gray-900 dark:text-white'
                  }`}>
                    {msg.userId !== user.id && (
                      <div className="flex justify-between items-center text-xs mb-0.5">
                        <span className="font-medium text-gray-600 dark:text-gray-300 text-xs">
                          {msg.username}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className="text-xs leading-tight">{msg.message}</div>
                    {msg.userId === user.id && (
                      <div className="text-xs text-blue-100 text-right mt-0.5 opacity-75">
                        {formatTime(msg.timestamp)}
                      </div>
                    )}
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
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez votre message..."
            className="flex-1 min-w-0 px-3 py-2 border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors flex items-center justify-center"
          >
            📤
          </button>
        </div>
      </form>
    </div>
  );
}
