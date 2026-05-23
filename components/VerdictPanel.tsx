import { Testbud, type Expression } from './Testbud';
import { btnGhost, btnPrimary } from './buttons';
import type { Costume } from '@/src/persona/types';
import type { Verdict, FrictionItem as FrictionItemData } from '@/src/verdict/types';

const VERDICT_MAP: Record<
  Verdict['decision'],
  { bg: string; accent: string; label: string; emoji: Expression }
> = {
  would_buy: { bg: 'var(--color-bud-cream)', accent: 'var(--color-bud-deep)', label: 'Would buy', emoji: 'delighted' },
  would_investigate: { bg: '#FCEFC8', accent: '#C99A1A', label: 'Would investigate', emoji: 'curious' },
  would_bail: { bg: '#F8DAD2', accent: 'var(--color-coral)', label: 'Would bail', emoji: 'frustrated' },
};

const SEVERITY_MAP: Record<
  FrictionItemData['severity'],
  { bg: string; fg: string; dot: string; label: string }
> = {
  high: { bg: '#F8DAD2', fg: '#7A2D22', dot: 'var(--color-coral)', label: 'High' },
  medium: { bg: '#FCEFC8', fg: '#7A5810', dot: '#C99A1A', label: 'Medium' },
  low: { bg: 'var(--color-bud-cream)', fg: '#385B26', dot: 'var(--color-bud-deep)', label: 'Low' },
};

function FrictionItem({ rank, item }: { rank: number; item: FrictionItemData }) {
  const sev = SEVERITY_MAP[item.severity];
  return (
    <div
      style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--color-line-soft)',
        display: 'flex',
        gap: 14,
      }}
    >
      <div
        className="mono"
        style={{ fontSize: 13, color: 'var(--color-ink-4)', fontWeight: 500, minWidth: 18 }}
      >
        {String(rank).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              background: sev.bg,
              color: sev.fg,
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sev.dot }} />
            {sev.label}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{item.title}</span>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 12,
            color: 'var(--color-ink-3)',
            lineHeight: 1.45,
            fontStyle: 'italic',
            paddingLeft: 10,
            borderLeft: '2px solid var(--color-line)',
          }}
        >
          “{item.evidenceQuote}”
        </div>
      </div>
    </div>
  );
}

function ConfidenceBar({ value, accent }: { value: number; accent: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', gap: 3 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 18,
            borderRadius: 2,
            background: i < value ? accent : 'rgba(0,0,0,0.06)',
          }}
        />
      ))}
    </div>
  );
}

export interface VerdictPanelProps {
  verdict: Verdict;
  costume: Costume;
  highlight?: string;
}

export function VerdictPanel({ verdict, costume }: VerdictPanelProps) {
  const v = VERDICT_MAP[verdict.decision];
  const confidence10 = Math.max(0, Math.min(10, Math.round(verdict.confidence * 10)));
  return (
    <div
      style={{
        width: 440,
        borderLeft: '1px solid var(--color-line)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-paper)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: '22px 22px 20px',
          background: v.bg,
          borderBottom: `1px solid ${v.accent}33`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -12, right: -18, opacity: 0.85 }}>
          <Testbud expression={v.emoji} costume={costume} size={130} />
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: v.accent,
            fontWeight: 600,
          }}
        >
          Verdict
        </div>
        <div
          className="display"
          style={{
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: '-0.025em',
            marginTop: 6,
            color: 'var(--color-ink)',
            lineHeight: 1,
          }}
        >
          {v.label}
        </div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--color-ink-3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Confidence
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
              <span className="display" style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-ink)' }}>
                {confidence10}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-ink-3)' }}>/ 10</span>
            </div>
          </div>
          <ConfidenceBar value={confidence10} accent={v.accent} />
        </div>
        <div style={{ marginTop: 18, fontSize: 13.5, color: 'var(--color-ink-2)', lineHeight: 1.5, maxWidth: '78%' }}>
          {verdict.highlight && (
            <div style={{ fontWeight: 500, color: 'var(--color-ink)', marginBottom: 6 }}>{verdict.highlight}</div>
          )}
          {verdict.summary}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--color-line-soft)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
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
            Friction · {verdict.frictionList.length} found
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
            ranked by severity
          </span>
        </div>
        {verdict.frictionList.length === 0 ? (
          <div style={{ padding: '18px', fontSize: 13, color: 'var(--color-ink-4)' }}>
            No friction recorded.
          </div>
        ) : (
          verdict.frictionList.map((f, i) => <FrictionItem key={i} rank={i + 1} item={f} />)
        )}
      </div>
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--color-line)',
          display: 'flex',
          gap: 8,
        }}
      >
        <button type="button" style={{ ...btnPrimary(), flex: 1 }} disabled>
          Export report
        </button>
        <button type="button" style={btnGhost()} disabled>
          Share with team
        </button>
      </div>
    </div>
  );
}
