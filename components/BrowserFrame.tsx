import type { ReactNode } from 'react';
import { LiveReplayer } from './LiveReplayer';

export interface BrowserFrameProps {
  url: string;
  recording?: boolean;
  /** Run id used to subscribe to the worker's /live WS. */
  runId?: string;
  /** Optional content to render inside the frame instead of the live view (for tests / fallback). */
  children?: ReactNode;
}

/**
 * Desktop browser chrome that wraps a live rrweb replayer of the agent's session.
 * Renders traffic-light dots + a fake address bar + an optional REC pill.
 */
export function BrowserFrame({ url, recording = true, runId, children }: BrowserFrameProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-paper-deep)',
        padding: 18,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 12px 40px rgba(28,26,20,0.10), 0 0 0 1px rgba(28,26,20,0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 14px',
            borderBottom: '1px solid #E8E5DC',
            background: '#FAF7F0',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#E07A6C' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#F0C557' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#9CC182' }} />
          </div>
          <div
            style={{
              flex: 1,
              background: '#fff',
              border: '1px solid #E8E5DC',
              borderRadius: 7,
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M 5 7 L 5 4 A 2 2 0 0 1 9 4 L 9 7" stroke="var(--color-bud-deep)" strokeWidth="1.4" />
              <rect x="3.5" y="7" width="7" height="5" rx="1" fill="var(--color-bud-deep)" />
            </svg>
            <span
              className="mono"
              style={{
                fontSize: 12,
                color: 'var(--color-ink-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {url}
            </span>
          </div>
          {recording && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 9px',
                background: '#FBEEEC',
                color: 'var(--color-coral)',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--color-coral)',
                  animation: 'pulse 1.2s infinite',
                }}
              />
              REC
            </div>
          )}
        </div>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#fff' }}>
          {runId && recording ? (
            <LiveReplayer runId={runId} />
          ) : !recording ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 8,
                color: 'var(--color-ink-3)',
                fontSize: 14,
                textAlign: 'center',
                padding: 24,
              }}
            >
              <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-4)' }}>
                Session ended
              </div>
              <div style={{ color: 'var(--color-ink-3)' }}>The bud has finished its run.</div>
            </div>
          ) : (
            children ?? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--color-ink-4)',
                  fontSize: 14,
                }}
              >
                Connecting the bud…
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
