"use client"

import React from 'react';
import Image from 'next/image';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle({ theme, setTheme }: { theme: 'angel'|'demon', setTheme: React.Dispatch<React.SetStateAction<'angel'|'demon'>> }) {
  function toggle() {
    setTheme(prev => (prev === 'angel' ? 'demon' : 'angel'));
  }

  const stateClass = theme === 'angel' ? styles.angel : styles.demon;

  return (
    <button
      className={`${styles.themeToggle} ${stateClass}`}
      onClick={toggle}
      aria-pressed={theme === 'demon'}
      aria-label={theme === 'angel' ? 'Thème Paradis' : 'Thème Enfer'}
      title={theme === 'angel' ? 'Paradis' : 'Enfer'}
    >
      <div className={styles.toggleTrack} aria-hidden>
        <div className={styles.toggleKnob}>
          <Image src={theme === 'angel' ? '/angel.png' : '/devil.png'} alt="" width={24} height={24} className={styles.toggleIcon} />
        </div>
      </div>
    </button>
  );
}
