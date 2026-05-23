import type { ReactNode } from 'react';
import Link from 'next/link';
import { Wordmark } from './Wordmark';

export type StatusKind = 'live' | 'done' | 'draft';

export interface AppHeaderProps {
  section?: string;
  title: string;
  status?: string;
  statusKind?: StatusKind;
  actions?: ReactNode;
}

const STATUS_COLORS: Record<StatusKind, { bg: string; fg: string; dot: string }> = {
  live: { bg: '#FCEFC8', fg: '#7A5810', dot: '#C99A1A' },
  done: { bg: 'var(--color-bud-cream)', fg: '#385B26', dot: 'var(--color-bud-deep)' },
  draft: { bg: 'var(--color-paper-deep)', fg: 'var(--color-ink-3)', dot: 'var(--color-ink-4)' },
};

export function AppHeader({ section, title, status, statusKind = 'done', actions }: AppHeaderProps) {
  const c = STATUS_COLORS[statusKind];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid var(--color-line)',
        background: 'var(--color-paper)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link href="/" style={{ display: 'block', textDecoration: 'none' }}>
          <Wordmark size={0.6} />
        </Link>
        {(section || title) && (
          <>
            <div style={{ width: 1, height: 22, background: 'var(--color-line)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-ink-3)', fontSize: 13 }}>
              {section && (
                <>
                  <span>{section}</span>
                  <span style={{ color: 'var(--color-ink-4)' }}>/</span>
                </>
              )}
              <span style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{title}</span>
            </div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {status && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              background: c.bg,
              color: c.fg,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: c.dot,
                animation: statusKind === 'live' ? 'pulse 1.4s infinite' : 'none',
              }}
            />
            {status}
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}
