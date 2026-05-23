import type { Persona } from '@/src/persona/types';
import { Testbud } from './Testbud';

const PERSONA_TAG: Record<string, string> = {
  'skeptical-bargain-hunter': 'B2C · Shopper',
  'overwhelmed-switcher': 'B2C · Comparing',
  'goal-driven-self-improver': 'B2C · Habits',
  'distracted-mobile-browser': 'B2C · Mobile',
  'time-poor-evaluator': 'B2B · Eng Lead',
  'technical-gatekeeper-cto': 'B2B · CTO',
  'roi-driven-buyer': 'B2B · Finance',
  'internal-champion': 'B2B · IC',
};

export interface PersonaPickCardProps {
  persona: Persona;
  selected: boolean;
  onSelect: () => void;
}

export function PersonaPickCard({ persona, selected, onSelect }: PersonaPickCardProps) {
  const tag = PERSONA_TAG[persona.slug] ?? `${persona.segment} · ${persona.identity.role}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        padding: '18px 16px 16px',
        borderRadius: 14,
        background: selected ? 'var(--color-bud-cream)' : 'var(--color-paper-deep)',
        border: `1.5px solid ${selected ? 'var(--color-bud-deep)' : 'transparent'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        position: 'relative',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'center',
        width: '100%',
      }}
    >
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--color-bud-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 14 14">
            <path
              d="M 3 7 L 6 10 L 11 4"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      <div style={{ height: 118, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Testbud expression={selected ? 'delighted' : 'neutral'} costume={persona.costume} size={130} />
      </div>
      <div className="display" style={{ fontSize: 15, fontWeight: 600, textAlign: 'center', lineHeight: 1.15 }}>
        {persona.name}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 9.5,
          color: 'var(--color-ink-3)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {tag}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: 'var(--color-ink-3)',
          textAlign: 'center',
          lineHeight: 1.4,
          marginTop: 4,
        }}
      >
        {persona.identity.context}
      </div>
    </button>
  );
}
