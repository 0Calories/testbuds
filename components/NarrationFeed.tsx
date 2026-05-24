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
        gap: 10,
        padding: '8px 16px',
        borderBottom: '1px solid var(--color-line-soft)',
        opacity: 0.92,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 28,
          height: 28,
          background: 'var(--color-paper-deep)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Testbud expression={expression} size={32} style={{ transform: 'translateY(3px)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span
            className="mono"
            style={{
              fontSize: 9.5,
              color: meta.color,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {meta.tag}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--color-ink-3)', lineHeight: 1.4 }}>{text}</div>
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
}

const BUD_SIZE = 168;
const BUD_RIGHT_INSET = 22;
// Bud-mascot SVG (viewBox 200×220) renders meet-fitted inside a square box, so
// its body center sits BUD_SIZE/2 from each side. Sprout/head sits slightly
// left of that center, which is where the tail dots should land.
const BUD_HEAD_OFFSET_FROM_RIGHT = BUD_RIGHT_INSET + BUD_SIZE / 2 + 6;

function CurrentBud({ costume, expression, thought }: CurrentBudProps) {
  const hasThought = thought && thought.length > 0;
  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        padding: `22px ${BUD_RIGHT_INSET}px 14px`,
        borderTop: '1px solid var(--color-line-soft)',
        background: 'var(--color-paper-deep)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: 'var(--color-paper)',
          border: '1.5px solid var(--color-line)',
          borderRadius: 22,
          padding: '16px 18px',
          fontSize: 15,
          lineHeight: 1.45,
          color: hasThought ? 'var(--color-ink-2)' : 'var(--color-ink-3)',
          fontStyle: hasThought ? 'normal' : 'italic',
          boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
          minHeight: 56,
          // Leave a wedge on the right so the tail can descend diagonally
          // toward the bud's head without overlapping the bubble.
          marginRight: 24,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {hasThought ? (
          thought
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            thinking <ThinkingDots />
          </span>
        )}
      </div>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: BUD_HEAD_OFFSET_FROM_RIGHT + 38,
          bottom: BUD_SIZE - 6,
          width: 13,
          height: 13,
          background: 'var(--color-paper)',
          border: '1.5px solid var(--color-line)',
          borderRadius: '50%',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: BUD_HEAD_OFFSET_FROM_RIGHT + 16,
          bottom: BUD_SIZE - 24,
          width: 8,
          height: 8,
          background: 'var(--color-paper)',
          border: '1.5px solid var(--color-line)',
          borderRadius: '50%',
        }}
      />
      <div style={{ alignSelf: 'flex-end', marginTop: 26 }}>
        <Testbud expression={expression} costume={costume} size={BUD_SIZE} animated />
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
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-line-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-4)',
          }}
        >
          Transcript
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {items.length === 0 && !streaming && (
          <div
            style={{
              padding: '24px 18px',
              color: 'var(--color-ink-4)',
              fontSize: 12.5,
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
        <CurrentBud costume={costume} expression={currentExpression} thought={currentThought} />
      )}
    </div>
  );
}
