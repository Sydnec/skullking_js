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

const COLOR_CODES = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  MAGENTA: '\x1b[35m',
  WHITE: '\x1b[37m',
  GRAY: '\x1b[90m',
};

const LEVEL_COLORS = {
  ERROR: COLOR_CODES.RED,
  WARN: COLOR_CODES.YELLOW,
  INFO: COLOR_CODES.CYAN,
  SUCCESS: COLOR_CODES.GREEN,
  DEBUG: COLOR_CODES.GRAY,
  GAME: COLOR_CODES.MAGENTA,
  SOCKET: COLOR_CODES.BLUE,
  DATABASE: COLOR_CODES.WHITE,
};

class Logger {
  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
  }

  formatMessage(level, category, message, data = {}) {
    const prefix = LOG_COLORS[category] || LOG_COLORS[level] || '📝';
    const color = LEVEL_COLORS[category] || LEVEL_COLORS[level] || COLOR_CODES.WHITE;
    const dataStr = Object.keys(data).length > 0 ? ` ${JSON.stringify(data)}` : '';
    return `${color}${prefix} [${level}] ${message}${dataStr}${COLOR_CODES.RESET}`;
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
