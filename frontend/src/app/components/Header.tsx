"use client"

import React, { useEffect, useState } from 'react';
import { logDev } from '../../lib/logger';
import styles from '../layout.module.css';
import UserMenu from './UserMenu';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  // Keep initial state deterministic (matches server render)
  const [theme, setTheme] = useState<'angel'|'demon'>('angel');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayFading, setOverlayFading] = useState(false);

  // After mount, read actual preference (localStorage or prefers-color-scheme)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (saved === 'angel' || saved === 'demon') {
      setTheme(saved as 'angel'|'demon');
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'demon' : 'angel');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // read previous background color and set it to --overlay-bg so the overlay keeps old color
    const prevBg = getComputedStyle(document.body).getPropertyValue('--bg') || '';
    try {
      document.documentElement.style.setProperty('--overlay-bg', prevBg.trim() || 'transparent');
    } catch (err) { logDev('header applyTheme error', err); }

    // show overlay (with previous color)
    setOverlayFading(false);
    setOverlayVisible(true);

    // small delay to ensure overlay is rendered with prev color, then swap theme underneath
    const applyThemeTimer = setTimeout(() => {
      document.body.classList.remove('theme-angel', 'theme-demon');
      if (theme === 'angel') document.body.classList.add('theme-angel');
      else document.body.classList.add('theme-demon');
      try { localStorage.setItem('theme', theme); } catch (err) { logDev('localStorage set theme failed', err); }

      // start fade out of overlay after a short pause
      const fadeTimer = setTimeout(() => setOverlayFading(true), 40);

      // remove overlay completely after CSS fade duration
      const removeTimer = setTimeout(() => {
        setOverlayVisible(false);
        setOverlayFading(false);
        try { document.documentElement.style.removeProperty('--overlay-bg'); } catch (err) { logDev('remove overlay-bg failed', err); }
      }, 440); // 40 + 360 transition

      // cleanup fade/remove timers when effect re-runs
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }, 20);

    return () => clearTimeout(applyThemeTimer);
  }, [theme]);

  return (
    <header className={`header ${styles.header}`}>
      {overlayVisible && <div className={`theme-overlay ${overlayFading ? 'fade-out' : ''}`} aria-hidden />}
      <div className="title">
        <div className="logo" aria-hidden>SK</div>
        <div className={styles.titleText}>
          <h1>SkullKing</h1>
          <div className="subtitle">édition PCR</div>
        </div>
      </div>
      <div className={styles.headerControls}>
        <ThemeToggle theme={theme} setTheme={setTheme} />
        <UserMenu />
      </div>
    </header>
  );
}
