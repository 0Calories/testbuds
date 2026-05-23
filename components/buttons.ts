import type { CSSProperties } from 'react';

export function btnPrimary(): CSSProperties {
  return {
    padding: '7px 14px',
    background: 'var(--color-ink)',
    color: 'var(--color-paper)',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

export function btnGhost(): CSSProperties {
  return {
    padding: '7px 12px',
    background: 'transparent',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-line)',
    borderRadius: 8,
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}

export function btnDanger(): CSSProperties {
  return {
    padding: '7px 14px',
    background: '#fff',
    color: 'var(--color-coral)',
    border: '1px solid var(--color-coral-soft)',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
  };
}
