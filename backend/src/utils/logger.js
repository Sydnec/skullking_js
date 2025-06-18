/**
 * Système de logging centralisé pour Skull King Backend
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const LOG_COLORS = {
  ERROR: '❌',
  WARN: '⚠️', 
  INFO: '📋',
  SUCCESS: '✅',
  DEBUG: '🔍',
  GAME: '🎮',
  SOCKET: '⚡',
  DATABASE: '🗄️'
};

class Logger {
  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
  }

  formatMessage(level, category, message, data = {}) {
    const timestamp = new Date().toISOString();
    const prefix = LOG_COLORS[category] || LOG_COLORS[level] || '📝';
    const dataStr = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
    
    return `${prefix} [${timestamp}] [${level}] ${message}${dataStr}`;
  }

  error(message, data = {}) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(this.formatMessage('ERROR', 'ERROR', message, data));
    }
  }

  warn(message, data = {}) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', 'WARN', message, data));
    }
  }

  info(message, data = {}) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', 'INFO', message, data));
    }
  }

  success(message, data = {}) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', 'SUCCESS', message, data));
    }
  }

  debug(message, data = {}) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', 'DEBUG', message, data));
    }
  }

  game(message, data = {}) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', 'GAME', message, data));
    }
  }

  socket(message, data = {}) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', 'SOCKET', message, data));
    }
  }

  database(message, data = {}) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', 'DATABASE', message, data));
    }
  }
}

export const logger = new Logger();
