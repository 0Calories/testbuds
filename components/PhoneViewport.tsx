import type { ReactNode } from 'react';

export interface PhoneViewportProps {
  url: string;
  recording?: boolean;
  liveViewUrl?: string;
  children?: ReactNode;
  device?: string;
}

/**
 * Phone-bezel viewport that wraps a Browserbase Live View iframe at 390×844.
 * Device/network meta sit in the corners; the chrome around it is dark
 * (so the phone reads as the focus).
 */
export function PhoneViewport({
  url,
  recording = true,
  liveViewUrl,
  children,
  device = 'iPhone 14 Pro',
}: PhoneViewportProps) {
  return (
    <div
      style={{
        flex: 1,
        background: 'var(--color-ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 18, left: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-3)',
          }}
        >
          Device
        </div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--color-paper-deep)' }}>
          {device}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--color-ink-4)' }}>
          390 × 844
        </div>
      </div>

      {recording && (
        <div
          style={{
            position: 'absolute',
            bottom: 22,
            left: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '5px 10px',
            background: 'rgba(220,107,90,0.18)',
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
          REC · screen
        </div>
      )}

      <div
        style={{
          width: 386,
          height: 786,
          background: '#0B0908',
          borderRadius: 52,
          padding: 10,
          boxShadow: '0 36px 80px rgba(0,0,0,0.6), inset 0 0 0 2px #2A271F, inset 0 0 0 8px #0B0908',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 42,
            overflow: 'hidden',
            background: '#fff',
            position: 'relative',
          }}
        >
          {/* dynamic island */}
          <div
            style={{
              position: 'absolute',
              top: 9,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 104,
              height: 30,
              background: '#0B0908',
              borderRadius: 18,
              zIndex: 11,
              pointerEvents: 'none',
            }}
          />
          {/* address bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '10px 14px 8px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F4F2EE',
              zIndex: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 50,
            }}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: 9,
                padding: '5px 10px',
                marginTop: 22,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M 5 7 L 5 4 A 2 2 0 0 1 9 4 L 9 7" stroke="var(--color-bud-deep)" strokeWidth="1.4" />
                <rect x="3.5" y="7" width="7" height="5" rx="1" fill="var(--color-bud-deep)" />
              </svg>
              <span
                className="mono"
                style={{
                  fontSize: 11.5,
                  color: 'var(--color-ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 240,
                }}
              >
                {url}
              </span>
            </div>
          </div>
          {/* viewport (iframe) */}
          <div style={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 0, overflow: 'hidden', background: '#fff' }}>
            {liveViewUrl && recording ? (
              <iframe
                src={liveViewUrl}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                title="Live agent browser (mobile)"
                sandbox="allow-same-origin allow-scripts"
                allow="clipboard-read; clipboard-write"
              />
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
                  fontSize: 13,
                  padding: 20,
                  textAlign: 'center',
                }}
              >
                <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-4)' }}>
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
                    fontSize: 13,
                    padding: 20,
                    textAlign: 'center',
                  }}
                >
                  Connecting the bud…
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
