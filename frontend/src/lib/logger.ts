export function logDev(...args: any[]) {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    console.log('[DEV]', ...args);
  }
}

export function warnDev(...args: any[]) {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    console.warn('[DEV]', ...args);
  }
}

export function errorDev(...args: any[]) {
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    console.error('[DEV]', ...args);
  }
}
