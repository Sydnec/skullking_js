"use client";

import React from 'react';
import styles from './Dropdown.module.css';

type Option = { value: string; label: string; description?: string };

type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
};

export default function Dropdown({ value, options, onChange, ariaLabel, className }: Props) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${styles.select} ${className || ''}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} title={o.description || ''}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
