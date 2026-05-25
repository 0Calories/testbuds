'use client';

import { use, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { Testbud, type Expression } from '@/components/Testbud';
import { btnGhost, btnPrimary } from '@/components/buttons';
import { getPersona } from '@/src/persona/library';
import type { Persona } from '@/src/persona/types';
import type { Step } from '@/src/agent/types';
import type { Verdict, FrictionItem, Severity, Impact, Effort } from '@/src/verdict/types';

// ── Local mirror of the server-side RunRecord shape ────────────────────────
interface RunRecord {
  id: string;
  status: 'starting' | 'running' | 'completed' | 'failed';
  persona: Persona;
  targetUrl: string;
  goal: string;
  viewport: 'desktop' | 'mobile';
  steps: Step[];
  verdict?: Verdict;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

// ── Maps ───────────────────────────────────────────────────────────────────

const VERDICT_PILL: Record<
  Verdict['decision'],
  { bg: string; fg: string; dot: string; label: string; expression: Expression }
> = {
  would_buy: {
    bg: 'var(--color-bud-cream)', fg: '#385B26',
    dot: 'var(--color-bud-deep)', label: 'Would buy', expression: 'delighted',
  },
  would_investigate: {
    bg: '#FCEFC8', fg: '#7A5810',
    dot: '#C99A1A', label: 'Would investigate', expression: 'pleased',
  },
  would_bail: {
    bg: '#F8DAD2', fg: '#7A2D22',
    dot: 'var(--color-coral)', label: 'Would bail', expression: 'frustrated',
  },
};

const SEVERITY: Record<
  Severity,
  { accent: string; bg: string; fg: string; label: string }
> = {
  high: { accent: 'var(--color-coral)', bg: '#F8DAD2', fg: '#7A2D22', label: 'High friction' },
  medium: { accent: '#C99A1A', bg: '#FCEFC8', fg: '#7A5810', label: 'Medium friction' },
  low: { accent: 'var(--color-bud-deep)', bg: 'var(--color-bud-cream)', fg: '#385B26', label: 'Low friction' },
};

const IMPACT_ACCENT: Record<Impact, string> = {
  high: 'var(--color-bud-deep)',
  medium: '#C99A1A',
  low: 'var(--color-ink-3)',
};

const IMPACT_LABEL: Record<Impact, string> = { high: 'High', medium: 'Medium', low: 'Low' };
const EFFORT_LABEL: Record<Effort, string> = { small: 'Small', medium: 'Medium', large: 'Large' };

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

// ── Utils ──────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function hostOnly(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url.slice(0, 40);
  }
}

function severityCounts(items: FrictionItem[]): { high: number; medium: number; low: number } {
  return items.reduce(
    (acc, it) => { acc[it.severity] += 1; return acc; },
    { high: 0, medium: 0, low: 0 },
  );
}

// ── Hero band ──────────────────────────────────────────────────────────────

function VerdictPill({ decision }: { decision: Verdict['decision'] }) {
  const m = VERDICT_PILL[decision];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 12px 5px 10px',
        background: m.bg,
        color: m.fg,
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: m.dot,
          boxShadow: '0 0 0 3px rgba(255,255,255,0.55)',
        }}
      />
      {m.label}
    </span>
  );
}

function ConfidenceDots({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: i < value ? '#C99A1A' : 'rgba(28,26,20,0.10)',
          }}
        />
      ))}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  color = 'var(--color-ink)',
}: {
  label: string;
  value: ReactNode;
  hint: ReactNode;
  color?: string;
}) {
  return (
    <div style={{ minWidth: 124 }}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--color-ink-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        className="display"
        style={{
          fontSize: 24,
          fontWeight: 600,
          color,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--color-ink-4)', marginTop: 3 }}>
        {hint}
      </div>
    </div>
  );
}

function HeroBand({
  persona,
  url,
  elapsed,
  verdict,
}: {
  persona: Persona;
  url: string;
  elapsed: string;
  verdict: Verdict;
}) {
  const confidence10 = Math.max(0, Math.min(10, Math.round(verdict.confidence * 10)));
  const counts = severityCounts(verdict.frictionList);
  return (
    <div
      style={{
        background: 'var(--color-paper-deep)',
        borderRadius: 18,
        padding: '22px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        border: '1px solid var(--color-line-soft)',
        flexShrink: 0,
      }}
    >
      {/* bud */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 'auto -8px -10px auto',
            width: 120,
            height: 14,
            background: 'rgba(28,26,20,0.08)',
            borderRadius: '50%',
            filter: 'blur(8px)',
          }}
        />
        <Testbud
          expression={VERDICT_PILL[verdict.decision].expression}
          costume={persona.costume}
          size={150}
        />
      </div>

      {/* headline */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--color-ink-3)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            The bud&rsquo;s wrap-up
          </span>
          <span
            style={{ width: 3, height: 3, background: 'var(--color-ink-4)', borderRadius: '50%' }}
          />
          <span className="mono" style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
            {persona.name} · {hostOnly(url)}
          </span>
        </div>
        <div
          className="display"
          style={{
            fontSize: 42,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            lineHeight: 1.02,
            color: 'var(--color-ink)',
            maxWidth: 680,
          }}
        >
          {verdict.headline}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <VerdictPill decision={verdict.decision} />
          <span className="mono" style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
            confidence
          </span>
          <ConfidenceDots value={confidence10} />
          <span className="mono" style={{ fontSize: 11, color: 'var(--color-ink)' }}>
            {confidence10} / 10
          </span>
        </div>
      </div>

      {/* stats */}
      <div
        style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 14,
          paddingLeft: 24,
          borderLeft: '1px solid var(--color-line)',
        }}
      >
        <StatTile label="Time on site" value={elapsed} hint="active engagement" />
        <StatTile
          label="Pages explored"
          value={verdict.pagesExplored}
          hint={verdict.pagesEstimatedTotal > 0 ? `of ~${verdict.pagesEstimatedTotal} in nav` : '—'}
        />
        <StatTile
          label="Frictions"
          value={verdict.frictionList.length}
          hint={`${counts.high} high · ${counts.medium} med · ${counts.low} low`}
          color="var(--color-coral)"
        />
        <StatTile
          label="Wins"
          value={verdict.wins.length}
          hint="keep doing this"
          color="var(--color-bud-deep)"
        />
      </div>
    </div>
  );
}

// ── Headline insight card ──────────────────────────────────────────────────

function HeadlineCard({ text }: { text: string }) {
  return (
    <div
      style={{
        background: 'var(--color-ink)',
        color: 'var(--color-paper)',
        borderRadius: 14,
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(244,238,226,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M 9 2 L 11 7 L 16 7.5 L 12 11 L 13.2 16 L 9 13.4 L 4.8 16 L 6 11 L 2 7.5 L 7 7 Z"
            fill="var(--color-butter)"
          />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--color-butter)',
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          The one thing
        </div>
        <div
          style={{
            fontSize: 16,
            lineHeight: 1.45,
            color: 'var(--color-paper)',
            fontWeight: 400,
            maxWidth: 1100,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

// ── Action card + Actions column ───────────────────────────────────────────

function MetaPill({
  k,
  v,
  accent = 'var(--color-ink-3)',
}: {
  k: string;
  v: ReactNode;
  accent?: string;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--color-ink-4)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {k}
      </span>
      <span style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{v}</span>
    </div>
  );
}

function ActionCard({ rank, item }: { rank: number; item: FrictionItem }) {
  const sev = SEVERITY[item.severity];
  return (
    <div
      style={{
        background: '#FBF6EA',
        border: '1px solid var(--color-line-soft)',
        borderRadius: 14,
        padding: '16px 18px 14px',
        display: 'flex',
        gap: 16,
      }}
    >
      {/* rank gutter */}
      <div
        style={{
          flexShrink: 0,
          width: 38,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          className="display"
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: 'var(--color-ink-4)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {String(rank).padStart(2, '0')}
        </div>
        <div
          style={{
            width: 2,
            flex: 1,
            background: sev.accent,
            borderRadius: 1,
            opacity: 0.4,
          }}
        />
      </div>

      {/* body */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: sev.accent,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginRight: 8,
              }}
            >
              {item.actionVerb}
            </span>
            <span
              className="display"
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--color-ink)',
                letterSpacing: '-0.01em',
              }}
            >
              {item.title}
            </span>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              background: sev.bg,
              color: sev.fg,
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.03em',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sev.accent }} />
            {sev.label}
          </span>
        </div>

        <div
          className="mono"
          style={{
            fontSize: 12.5,
            color: 'var(--color-ink-3)',
            lineHeight: 1.5,
            paddingLeft: 11,
            borderLeft: `2px solid ${sev.accent}`,
            fontStyle: 'italic',
          }}
        >
          &ldquo;{item.evidenceQuote}&rdquo;
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {item.recommendations.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 9,
                alignItems: 'flex-start',
                fontSize: 13.5,
                color: 'var(--color-ink-2)',
                lineHeight: 1.4,
              }}
            >
              <span
                aria-hidden
                style={{
                  flexShrink: 0,
                  marginTop: 6,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--color-ink)',
                }}
              />
              <span>{s}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 2,
            paddingTop: 8,
            borderTop: '1px dashed var(--color-line)',
          }}
        >
          <MetaPill k="Impact" v={IMPACT_LABEL[item.impact]} accent={IMPACT_ACCENT[item.impact]} />
          <MetaPill k="Effort" v={EFFORT_LABEL[item.effort]} />
          <MetaPill k="Owner" v={item.owner} />
          <div style={{ flex: 1 }} />
          <button
            type="button"
            disabled
            style={{
              padding: '5px 11px',
              background: 'transparent',
              color: 'var(--color-ink-3)',
              border: '1px solid var(--color-line)',
              borderRadius: 7,
              fontSize: 11.5,
              fontFamily: 'inherit',
              cursor: 'not-allowed',
            }}
          >
            Send to Linear
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionsColumn({ actions }: { actions: FrictionItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          padding: '0 4px',
        }}
      >
        <div
          className="display"
          style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}
        >
          Do these {actions.length} things, in this order
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>
          ranked by impact ÷ effort
        </span>
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflow: 'auto',
          paddingRight: 2,
        }}
      >
        {actions.length === 0 ? (
          <div
            style={{
              padding: '32px 18px',
              background: '#FBF6EA',
              borderRadius: 14,
              border: '1px solid var(--color-line-soft)',
              color: 'var(--color-ink-3)',
              fontSize: 13.5,
              textAlign: 'center',
            }}
          >
            No friction recorded.
          </div>
        ) : (
          actions.map((a, i) => <ActionCard key={i} rank={i + 1} item={a} />)
        )}
      </div>
    </div>
  );
}

// ── Side column: wins + parting note ───────────────────────────────────────

function WinsBox({ wins }: { wins: Verdict['wins'] }) {
  return (
    <div
      style={{
        background: 'var(--color-bud-cream)',
        borderRadius: 14,
        padding: '16px 18px',
        border: '1px solid #C9DAB1',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--color-bud-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M 3 6 L 5 8 L 9 4"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="display" style={{ fontSize: 16, fontWeight: 600, color: '#2A4A1A' }}>
          What&rsquo;s already working
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {wins.length === 0 ? (
          <div
            className="mono"
            style={{ fontSize: 12, color: '#4F6B33', fontStyle: 'italic' }}
          >
            Nothing the bud called out as a clear win.
          </div>
        ) : (
          wins.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              <span
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--color-bud-deep)',
                  fontWeight: 600,
                  minWidth: 14,
                }}
              >
                0{i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: '#2A4A1A',
                    lineHeight: 1.25,
                  }}
                >
                  {w.title}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11.5,
                    color: '#4F6B33',
                    lineHeight: 1.4,
                    marginTop: 2,
                  }}
                >
                  {w.description}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PartingNote({
  run,
  verdict,
  elapsed,
}: {
  run: RunRecord;
  verdict: Verdict;
  elapsed: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: 'var(--color-paper-deep)',
        borderRadius: 14,
        padding: '16px 18px',
        border: '1px solid var(--color-line-soft)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>
          Bud&rsquo;s parting note
        </div>
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--color-ink-3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Verbatim
        </span>
      </div>
      <div
        className="mono"
        style={{
          flex: 1,
          fontSize: 13,
          color: 'var(--color-ink-2)',
          lineHeight: 1.55,
          fontStyle: 'italic',
          overflow: 'auto',
        }}
      >
        &ldquo;{verdict.partingNote}&rdquo;
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--color-line)',
        }}
      >
        <Testbud expression="pleased" costume={run.persona.costume} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-ink)',
              lineHeight: 1.1,
            }}
          >
            {run.persona.name}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10.5,
              color: 'var(--color-ink-3)',
              letterSpacing: '0.06em',
              marginTop: 1,
            }}
          >
            {PERSONA_TAG[run.persona.slug] ?? run.persona.segment} · run {elapsed}
          </div>
        </div>
        <Link
          href={`/runs/${run.id}`}
          style={{
            padding: '5px 10px',
            background: 'transparent',
            color: 'var(--color-ink-3)',
            border: '1px solid var(--color-line)',
            borderRadius: 7,
            fontSize: 11,
            fontFamily: 'inherit',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span aria-hidden>▶</span>
          Replay run
        </Link>
      </div>
    </div>
  );
}

function SideColumn({
  run,
  verdict,
  elapsed,
}: {
  run: RunRecord;
  verdict: Verdict;
  elapsed: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <WinsBox wins={verdict.wins} />
      <PartingNote run={run} verdict={verdict} elapsed={elapsed} />
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function WrapUpFooter({
  verdict,
  onQueueNext,
  queuing,
  queueError,
}: {
  verdict: Verdict;
  onQueueNext: () => void;
  queuing: boolean;
  queueError?: string;
}) {
  const nextPersona = getPersona(verdict.nextPersonaSuggestion.slug);
  return (
    <div
      style={{
        padding: '14px 28px',
        borderTop: '1px solid var(--color-line)',
        background: 'var(--color-paper)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 14,
          minWidth: 0,
          flexWrap: 'wrap',
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--color-ink-3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Next step
        </span>
        <span style={{ fontSize: 13.5, color: 'var(--color-ink-2)', flex: 1, minWidth: 0 }}>
          Run the{' '}
          <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
            {nextPersona?.name ?? verdict.nextPersonaSuggestion.slug}
          </span>{' '}
          against the same URL
          {verdict.nextPersonaSuggestion.reason ? ` — ${verdict.nextPersonaSuggestion.reason}` : '.'}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'flex-end',
        }}
      >
        {queueError && (
          <span style={{ fontSize: 12, color: 'var(--color-coral)' }}>{queueError}</span>
        )}
        <button
          type="button"
          onClick={onQueueNext}
          disabled={queuing || !nextPersona}
          style={{
            padding: '5px 11px',
            background: 'var(--color-paper-deep)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-line)',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: queuing || !nextPersona ? 'not-allowed' : 'pointer',
            opacity: queuing || !nextPersona ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {queuing ? 'Queueing…' : 'Queue run →'}
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function WrapUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<RunRecord>();
  const [notFound, setNotFound] = useState(false);
  const [queuing, setQueuing] = useState(false);
  const [queueError, setQueueError] = useState<string | undefined>();

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`/api/runs/${id}`);
      if (!active) return;
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { run: RunRecord; steps?: Step[] };
        setRun({ ...data.run, steps: data.steps ?? data.run.steps ?? [] });
      }
    })();
    return () => { active = false; };
  }, [id]);

  const elapsed = useMemo(() => {
    if (!run) return '00:00';
    return formatElapsed((run.completedAt ?? Date.now()) - run.startedAt);
  }, [run]);

  // ── Non-happy states ──────────────────────────────────────────────────
  if (notFound) {
    return (
      <Shell title="Run not found">
        <div style={emptyStyle}>
          <div style={{ fontSize: 15, color: 'var(--color-ink-2)' }}>
            We couldn&rsquo;t find a run with id <code className="mono">{id}</code>.
          </div>
          <Link href="/" style={{ ...btnPrimary(), textDecoration: 'none', display: 'inline-block' }}>
            Start a new run
          </Link>
        </div>
      </Shell>
    );
  }

  if (!run) {
    return (
      <Shell title="Loading…">
        <div style={emptyStyle}>Loading wrap-up…</div>
      </Shell>
    );
  }

  if (run.status === 'failed') {
    return (
      <Shell title={`${run.persona.name} · ${truncateUrl(run.targetUrl)}`}>
        <div style={emptyStyle}>
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-coral)',
              fontWeight: 600,
            }}
          >
            Run failed
          </div>
          <div style={{ fontSize: 14, color: 'var(--color-ink-2)', maxWidth: 480 }}>{run.error}</div>
        </div>
      </Shell>
    );
  }

  if (run.status !== 'completed' || !run.verdict) {
    return (
      <Shell
        title={`${run.persona.name} · ${truncateUrl(run.targetUrl)}`}
        status="Run still in progress"
        statusKind="live"
      >
        <div style={emptyStyle}>
          <div style={{ fontSize: 15, color: 'var(--color-ink-2)' }}>
            The wrap-up is ready once the bud finishes their run.
          </div>
          <Link
            href={`/runs/${run.id}`}
            style={{ ...btnPrimary(), textDecoration: 'none', display: 'inline-block' }}
          >
            Watch live
          </Link>
        </div>
      </Shell>
    );
  }

  // Defensive — runs completed before this change lack the new fields.
  if (
    !run.verdict.headline ||
    !run.verdict.theOneThing ||
    !run.verdict.partingNote ||
    !run.verdict.nextPersonaSuggestion
  ) {
    return (
      <Shell
        title={`${run.persona.name} · ${truncateUrl(run.targetUrl)}`}
        status={`Completed · ${elapsed}`}
        statusKind="done"
      >
        <div style={emptyStyle}>
          <div style={{ fontSize: 15, color: 'var(--color-ink-2)', maxWidth: 520 }}>
            This run finished before actionable insights were added. Re-run the bud to get the full wrap-up.
          </div>
          <Link href="/" style={{ ...btnPrimary(), textDecoration: 'none', display: 'inline-block' }}>
            Run again
          </Link>
        </div>
      </Shell>
    );
  }

  const verdict = run.verdict;

  const onQueueNext = async () => {
    setQueuing(true);
    setQueueError(undefined);
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaSlug: verdict.nextPersonaSuggestion.slug,
          targetUrl: run.targetUrl,
          goal: run.goal,
          viewport: run.viewport,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to queue run');
      window.location.href = `/runs/${data.runId}`;
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : String(err));
      setQueuing(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        background: 'var(--color-paper)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: 'var(--color-ink)',
      }}
    >
      <AppHeader
        section="Runs"
        title={`${run.persona.name} · ${truncateUrl(run.targetUrl)}`}
        status={`Wrap-up · ${elapsed}`}
        statusKind="done"
        actions={
          <>
            <button type="button" style={btnGhost()} disabled>
              Share
            </button>
            <Link
              href="/"
              style={{ ...btnPrimary(), textDecoration: 'none', display: 'inline-block' }}
            >
              Run again
            </Link>
            <button type="button" style={{ ...btnGhost(), padding: '7px 10px' }} disabled>
              ⋯
            </button>
          </>
        }
      />

      <div
        style={{
          flex: 1,
          padding: '22px 28px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <HeroBand
          persona={run.persona}
          url={run.targetUrl}
          elapsed={elapsed}
          verdict={verdict}
        />
        <HeadlineCard text={verdict.theOneThing} />
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gap: 16,
            minHeight: 0,
          }}
        >
          <ActionsColumn actions={verdict.frictionList} />
          <SideColumn run={run} verdict={verdict} elapsed={elapsed} />
        </div>
      </div>

      <WrapUpFooter
        verdict={verdict}
        onQueueNext={onQueueNext}
        queuing={queuing}
        queueError={queueError}
      />
    </div>
  );
}

// ── Tiny shell for non-happy states ───────────────────────────────────────

const emptyStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  color: 'var(--color-ink-3)',
  padding: 24,
  textAlign: 'center',
};

function Shell({
  title,
  status,
  statusKind = 'done',
  children,
}: {
  title: string;
  status?: string;
  statusKind?: 'live' | 'done' | 'draft';
  children: ReactNode;
}) {
  return (
    <div
      style={{
        height: '100vh',
        background: 'var(--color-paper)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppHeader section="Runs" title={title} status={status} statusKind={statusKind} />
      {children}
    </div>
  );
}
