import { AppHeader } from '@/components/AppHeader';
import { PersonaCard, type Verdict } from '@/components/PersonaCard';
import { personaLibrary } from '@/src/persona/library';
import type { Expression } from '@/components/Testbud';

interface DisplayMeta {
  expression: Expression;
  mostCommonVerdict: Verdict;
  runsCount: number;
  featured?: boolean;
}

// Hand-picked display data per persona — keeps the gallery interesting at first glance.
const DISPLAY_META: Record<string, DisplayMeta> = {
  'roi-driven-buyer': { expression: 'neutral', mostCommonVerdict: 'investigate', runsCount: 318, featured: true },
  'technical-gatekeeper-cto': { expression: 'curious', mostCommonVerdict: 'investigate', runsCount: 142 },
  'time-poor-evaluator': { expression: 'impatient', mostCommonVerdict: 'bail', runsCount: 207 },
  'internal-champion': { expression: 'delighted', mostCommonVerdict: 'buy', runsCount: 96 },
  'skeptical-bargain-hunter': { expression: 'frustrated', mostCommonVerdict: 'bail', runsCount: 421 },
  'overwhelmed-switcher': { expression: 'confused', mostCommonVerdict: 'investigate', runsCount: 188 },
  'goal-driven-self-improver': { expression: 'pleased', mostCommonVerdict: 'buy', runsCount: 154 },
  'distracted-mobile-browser': { expression: 'impatient', mostCommonVerdict: 'bail', runsCount: 263 },
};

function FilterRow({ label, count, active }: { label: string; count: number; active?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 10px',
        borderRadius: 8,
        background: active ? 'var(--color-paper-deep)' : 'transparent',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 13.5, color: active ? 'var(--color-ink)' : 'var(--color-ink-2)', fontWeight: active ? 600 : 400 }}>
        {label}
      </span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
        {count}
      </span>
    </div>
  );
}

export default function PersonaLibraryPage() {
  // Sort: featured first, then by segment, preserving library order otherwise.
  const sorted = [...personaLibrary].sort((a, b) => {
    const fa = DISPLAY_META[a.slug]?.featured ? 0 : 1;
    const fb = DISPLAY_META[b.slug]?.featured ? 0 : 1;
    return fa - fb;
  });
  const b2bCount = personaLibrary.filter((p) => p.segment === 'B2B').length;
  const b2cCount = personaLibrary.filter((p) => p.segment === 'B2C').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader title="Persona library" status={`${personaLibrary.length} buds`} statusKind="done" />
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Filter rail (visual only for the demo) */}
        <div
          style={{
            width: 240,
            borderRight: '1px solid var(--color-line)',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--color-ink-3)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Audience
            </div>
            <FilterRow label="All buds" count={personaLibrary.length} active />
            <FilterRow label="B2B" count={b2bCount} />
            <FilterRow label="B2C" count={b2cCount} />
          </div>
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--color-ink-3)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Disposition
            </div>
            <FilterRow label="Skeptical" count={3} />
            <FilterRow label="Enthusiastic" count={2} />
            <FilterRow label="Pragmatic" count={3} />
          </div>
        </div>

        {/* Gallery */}
        <div style={{ flex: 1, padding: '30px 36px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--color-ink-3)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Persona library
              </div>
              <h1
                className="display"
                style={{
                  margin: '4px 0 0',
                  fontSize: 40,
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                Pick a bud, send a bud.
              </h1>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {sorted.map((persona) => {
              const meta = DISPLAY_META[persona.slug] ?? {
                expression: 'neutral' as Expression,
                mostCommonVerdict: 'investigate' as Verdict,
                runsCount: 0,
              };
              return (
                <PersonaCard
                  key={persona.slug}
                  persona={persona}
                  expression={meta.expression}
                  mostCommonVerdict={meta.mostCommonVerdict}
                  runsCount={meta.runsCount}
                  featured={meta.featured}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
