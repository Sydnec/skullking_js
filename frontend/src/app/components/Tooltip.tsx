"use client";

import React from 'react';
import styles from './Tooltip.module.css';

export default function Tooltip({ children, title }: { children: React.ReactNode; title?: React.ReactNode }) {
  // support string or JSX for title (e.g. vertical list)
  return (
    <span className={styles.tooltipWrap} aria-label={typeof title === 'string' ? title : undefined} title={typeof title === 'string' ? title : ''}>
      {children}
      {title && <span className={styles.tooltip}>{title}</span>}
    </span>
  );
}
