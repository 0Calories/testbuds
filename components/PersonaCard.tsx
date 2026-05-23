import type { Persona } from '@/src/persona/types';
import { Testbud, type Expression } from './Testbud';

export type Verdict = 'buy' | 'investigate' | 'bail';

export interface PersonaCardProps {
  persona: Persona;
  /** Most-common verdict shown as a small signal in the corner. */
  mostCommonVerdict?: Verdict;
  /** Expression to render the persona's bud with. */
  expression?: Expression;
  /** Mock metric for the demo. */
  runsCount?: number;
  /** Featured cards take a 2×2 slot in the gallery. */
  featured?: boolean;
}

const VERDICT_COLOR: Record<Verdict, string> = {
  buy: 'var(--color-bud-deep)',
  investigate: '#C99A1A',
  bail: 'var(--color-coral)',
};

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

export function PersonaCard({
  persona,
  mostCommonVerdict,
  expression = 'neutral',
  runsCount,
  featured = false,
}: PersonaCardProps) {
  const verdictColor = mostCommonVerdict ? VERDICT_COLOR[mostCommonVerdict] : null;
  const tag = PERSONA_TAG[persona.slug] ?? `${persona.segment} · ${persona.identity.role}`;
  return (
    <div
      style={{
        background: 'var(--color-paper-deep)',
        borderRadius: featured ? 20 : 16,
        padding: featured ? '28px 24px 22px' : '22px 18px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        gridColumn: featured ? 'span 2' : 'span 1',
        gridRow: featured ? 'span 2' : 'span 1',
        border: '1px solid var(--color-line-soft)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          className="mono"
          style={{
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 999,
            background: persona.segment === 'B2B' ? 'var(--color-bud-cream)' : '#F3E3D0',
            color: persona.segment === 'B2B' ? '#385B26' : '#7A4F22',
            fontWeight: 600,
            letterSpacing: '0.08em',
          }}
        >
          {persona.segment}
        </span>
        {verdictColor && mostCommonVerdict && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: verdictColor }} />
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--color-ink-3)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              most-common · {mostCommonVerdict}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: featured ? '12px 0 8px' : '4px 0',
          minHeight: featured ? 260 : 150,
        }}
      >
        <Testbud expression={expression} costume={persona.costume} size={featured ? 240 : 150} />
      </div>

      <div>
        <div
          className="display"
          style={{
            fontSize: featured ? 26 : 17,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {persona.name}
        </div>
        <div
          className="mono"
          style={{
            fontSize: featured ? 11 : 9.5,
            color: 'var(--color-ink-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: 3,
          }}
        >
          {tag}
        </div>
      </div>

      <div
        style={{
          fontSize: featured ? 14 : 12.5,
          color: 'var(--color-ink-3)',
          lineHeight: 1.45,
        }}
      >
        {persona.identity.context}
      </div>

      <div
        style={{
          marginTop: 'auto',
          paddingTop: 10,
          borderTop: '1px solid var(--color-line-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {typeof runsCount === 'number' && (
          <span className="mono" style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
            {runsCount} runs
          </span>
        )}
        <span
          style={{
            fontSize: 12,
            color: 'var(--color-ink)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginLeft: 'auto',
          }}
        >
          Send this bud
          <svg width="11" height="11" viewBox="0 0 14 14">
            <path
              d="M 3 7 L 11 7 M 7 3 L 11 7 L 7 11"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
