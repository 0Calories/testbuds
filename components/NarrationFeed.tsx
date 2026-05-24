import { Testbud, type Expression } from './Testbud';

export type FeedKind = 'thought' | 'action' | 'observation' | 'friction' | 'arrived';

export interface FeedItemData {
  index: number;
  kind: FeedKind;
  expression: Expression;
  text: string;
}

const KIND_META: Record<FeedKind, { tag: string; color: string }> = {
  thought: { tag: 'thought', color: 'var(--color-ink-3)' },
  action: { tag: 'action', color: 'var(--color-sky)' },
  observation: { tag: 'sees', color: 'var(--color-bud-deep)' },
  friction: { tag: 'friction', color: 'var(--color-coral)' },
  arrived: { tag: 'arrived', color: 'var(--color-ink-3)' },
};

function FeedItem({ kind, expression, text }: FeedItemData) {
  const meta = KIND_META[kind];
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 18px',
        borderBottom: '1px solid var(--color-line-soft)',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 42,
          height: 42,
          background: 'var(--color-paper-deep)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Testbud expression={expression} size={48} style={{ transform: 'translateY(4px)' }} animated />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: meta.color,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {meta.tag}
          </span>
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--color-ink-2)', lineHeight: 1.45 }}>{text}</div>
      </div>
    </div>
  );
}

export interface NarrationFeedProps {
  items: FeedItemData[];
  streaming?: boolean;
}

export function NarrationFeed({ items, streaming = false }: NarrationFeedProps) {
  return (
    <div
      style={{
        width: 380,
        borderLeft: '1px solid var(--color-line)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-paper)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--color-line-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-3)',
          }}
        >
          Live narration
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {items.length === 0 && !streaming && (
          <div
            style={{
              padding: '24px 18px',
              color: 'var(--color-ink-4)',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            Waiting for the first thought…
          </div>
        )}
        {items.map((it) => (
          <FeedItem key={it.index} {...it} />
        ))}
        {streaming && (
          <div
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'var(--color-ink-3)',
              fontSize: 13,
              fontStyle: 'italic',
            }}
          >
            <span style={{ display: 'inline-flex', gap: 3 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--color-ink-4)',
                  animation: 'bounce 1s infinite',
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--color-ink-4)',
                  animation: 'bounce 1s infinite 0.15s',
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--color-ink-4)',
                  animation: 'bounce 1s infinite 0.3s',
                }}
              />
            </span>
            the bud is thinking
          </div>
        )}
      </div>
    </div>
  );
}
