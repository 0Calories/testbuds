import { Testbud, type Expression } from './Testbud';
import type { Costume } from '@/src/persona/types';

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
        <Testbud expression={expression} size={48} style={{ transform: 'translateY(4px)' }} />
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

function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, verticalAlign: 'middle' }}>
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
  );
}

interface CurrentBudProps {
  costume?: Costume;
  expression: Expression;
  thought?: string;
  streaming: boolean;
}

function CurrentBud({ costume, expression, thought, streaming }: CurrentBudProps) {
  const hasThought = thought && thought.length > 0;
  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        padding: '18px 18px 14px',
        borderTop: '1px solid var(--color-line-soft)',
        background: 'var(--color-paper-deep)',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        minHeight: 156,
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          paddingBottom: 18,
        }}
      >
        <div
          style={{
            position: 'relative',
            background: 'var(--color-paper)',
            border: '1.5px solid var(--color-line)',
            borderRadius: 18,
            padding: '12px 14px',
            fontSize: 13.5,
            lineHeight: 1.4,
            color: hasThought ? 'var(--color-ink-2)' : 'var(--color-ink-3)',
            fontStyle: hasThought ? 'normal' : 'italic',
            boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
          }}
        >
          {hasThought ? (
            thought
          ) : streaming ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <ThinkingDots /> warming up…
            </span>
          ) : (
            'Just arrived. Looking around…'
          )}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: -7,
              bottom: 14,
              width: 10,
              height: 10,
              background: 'var(--color-paper)',
              border: '1.5px solid var(--color-line)',
              borderLeft: 'none',
              borderTop: 'none',
              borderRadius: '0 0 3px 0',
              transform: 'rotate(-45deg)',
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: -14,
              bottom: 4,
              width: 6,
              height: 6,
              background: 'var(--color-paper)',
              border: '1.5px solid var(--color-line)',
              borderRadius: '50%',
            }}
          />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: -22,
              bottom: -2,
              width: 4,
              height: 4,
              background: 'var(--color-paper)',
              border: '1.5px solid var(--color-line)',
              borderRadius: '50%',
            }}
          />
        </div>
        {streaming && hasThought && (
          <div style={{ marginTop: 8, paddingLeft: 4 }}>
            <ThinkingDots />
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, alignSelf: 'flex-end' }}>
        <Testbud expression={expression} costume={costume} size={120} animated />
      </div>
    </div>
  );
}

export interface NarrationFeedProps {
  items: FeedItemData[];
  streaming?: boolean;
  costume?: Costume;
  currentExpression?: Expression;
  currentThought?: string;
}

export function NarrationFeed({
  items,
  streaming = false,
  costume,
  currentExpression = 'neutral',
  currentThought,
}: NarrationFeedProps) {
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
      </div>
      {streaming && (
        <CurrentBud
          costume={costume}
          expression={currentExpression}
          thought={currentThought}
          streaming={streaming}
        />
      )}
    </div>
  );
}
