"use client";

import React from 'react';
import styles from './ToggleSwitch.module.css';

type Props = {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
};

export default function ToggleSwitch({ checked, onChange, ariaLabel, disabled, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${styles.toggle} ${checked ? styles.on : styles.off} ${className || ''}`}
      onClick={() => { if (!disabled) onChange(); }}
    >
      <div className={styles.track} aria-hidden>
        <div className={styles.knob} />
      </div>
    </button>
  );
}
