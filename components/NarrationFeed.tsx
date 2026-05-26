import { useEffect, useRef } from 'react';
import { Testbud, type Expression } from './Testbud';
import type { Costume } from '@/src/persona/types';

export type FeedKind = 'thought' | 'action' | 'observation' | 'friction' | 'arrived' | 'auth';

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
  auth: { tag: 'signed in', color: 'var(--color-ink-3)' },
};

function FeedItem({ kind, expression, text }: FeedItemData) {
  if (kind === 'auth') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderBottom: '1px solid var(--color-line-soft)',
          color: 'var(--color-ink-3)',
          fontStyle: 'italic',
          fontSize: 12,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden style={{ flexShrink: 0 }}>
          <circle cx="5.5" cy="5.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M 3.3 5.5 L 4.9 7.1 L 7.7 4.4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{text}</span>
      </div>
    );
  }
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
const BUD_HORIZONTAL_INSET = 22;
// Push the bud-thought section up off the bottom of the viewport so it
// doesn't sit flush against the page edge. The transcript above (flex:1)
// absorbs the lost vertical space.
const BUD_BOTTOM_INSET = 40;
// Bud-mascot SVG (viewBox 200×220) renders meet-fitted inside a square box, so
// its body center sits BUD_SIZE/2 from each side. The sprout/head sits ~6px
// left of that geometric center — that's where the tail dots should land.
const BUD_HEAD_CENTER_OFFSET = 6;

// Three-dot tail descending from the bubble toward the sprout. Each dot's
// RIGHT edge sits `leftOffset` px to the LEFT of the sprout, and its bottom
// edge sits `bottomOffset` px below the bud's top edge (negative = down into
// the head).
const TAIL_DOTS = [
  { size: 13, leftOffset: 38, bottomOffset: -20 },
  { size: 8, leftOffset: 16, bottomOffset: -38 },
  { size: 5, leftOffset: 0, bottomOffset: -56 },
];

function CurrentBud({ costume, expression, thought }: CurrentBudProps) {
  const hasThought = thought && thought.length > 0;
  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        padding: `22px ${BUD_HORIZONTAL_INSET}px ${BUD_BOTTOM_INSET}px`,
        borderTop: '1px solid var(--color-line-soft)',
        background: 'var(--color-paper-deep)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          alignSelf: 'stretch',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
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
      {TAIL_DOTS.map(({ size, leftOffset, bottomOffset }, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            left: `calc(50% - ${BUD_HEAD_CENTER_OFFSET + leftOffset + size}px)`,
            bottom: BUD_BOTTOM_INSET + BUD_SIZE + bottomOffset,
            width: size,
            height: size,
            background: 'var(--color-paper)',
            border: '1.5px solid var(--color-line)',
            borderRadius: '50%',
          }}
        />
      ))}
      <div style={{ marginTop: 26 }}>
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

// Treat the user as "stuck to the bottom" while within this many pixels of it.
// Wide enough to forgive the few-pixel jitter that browsers introduce when the
// container resizes between polls.
const STICK_THRESHOLD = 48;

export function NarrationFeed({
  items,
  streaming = false,
  costume,
  currentExpression = 'neutral',
  currentThought,
}: NarrationFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Defaults to true so the first batch of items pins the user to the bottom;
  // flips to false once they scroll up to read history, and flips back when
  // they scroll back down within STICK_THRESHOLD of the bottom.
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom <= STICK_THRESHOLD;
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [items.length]);

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
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
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
