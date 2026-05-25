'use client';

import { use, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { Testbud, type Expression } from '@/components/Testbud';
import { btnGhost, btnPrimary } from '@/components/buttons';
import { getPersona } from '@/src/persona/library';
import type { Persona } from '@/src/persona/types';
import type { Step } from '@/src/agent/types';
import type {
  Verdict,
  FrictionItem,
  Severity,
  Impact,
  Effort,
} from '@/src/verdict/types';

// ── Run record (mirrors the server-side shape, kept local to avoid pulling in node:crypto) ──
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

const VERDICT_LABEL: Record<Verdict['decision'], string> = {
  would_buy: 'Would buy',
  would_investigate: 'Would investigate',
  would_bail: 'Would bail',
};

const VERDICT_TONE: Record<
  Verdict['decision'],
  { bg: string; fg: string; dot: string; expression: Expression }
> = {
  would_buy: {
    bg: 'var(--color-bud-cream)',
    fg: '#385B26',
    dot: 'var(--color-bud-deep)',
    expression: 'delighted',
  },
  would_investigate: {
    bg: '#FCEFC8',
    fg: '#7A5810',
    dot: '#C99A1A',
    expression: 'curious',
  },
  would_bail: {
    bg: '#F8DAD2',
    fg: '#7A2D22',
    dot: 'var(--color-coral)',
    expression: 'frustrated',
  },
};

const SEVERITY_PILL: Record<Severity, { bg: string; fg: string; dot: string; label: string }> = {
  high: { bg: '#F8DAD2', fg: '#7A2D22', dot: 'var(--color-coral)', label: 'High friction' },
  medium: { bg: '#FCEFC8', fg: '#7A5810', dot: '#C99A1A', label: 'Medium friction' },
  low: { bg: 'var(--color-bud-cream)', fg: '#385B26', dot: 'var(--color-bud-deep)', label: 'Low friction' },
};

const IMPACT_LABEL: Record<Impact, string> = { high: 'High', medium: 'Medium', low: 'Low' };
const EFFORT_LABEL: Record<Effort, string> = { small: 'Small', medium: 'Medium', large: 'Large' };

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url.slice(0, 40);
  }
}

function hostOnly(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function severityCounts(items: FrictionItem[]): { high: number; medium: number; low: number } {
  return items.reduce(
    (acc, it) => {
      acc[it.severity] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

function pluralize(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

// ── Small UI primitives ────────────────────────────────────────────────────

function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 11,
        color: 'var(--color-ink-3)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ children, suffix }: { children: ReactNode; suffix?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18 }}>
      <h2
        className="display"
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          margin: 0,
          color: 'var(--color-ink)',
          lineHeight: 1.1,
        }}
      >
        {children}
      </h2>
      {suffix && (
        <span
          className="mono"
          style={{
            fontSize: 11.5,
            color: 'var(--color-ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

function SeverityPill({ severity }: { severity: Severity }) {
  const sev = SEVERITY_PILL[severity];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 9px',
        background: sev.bg,
        color: sev.fg,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sev.dot }} />
      {sev.label}
    </span>
  );
}

function VerbTag({ children }: { children: ReactNode }) {
  return (
    <span
      className="mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        background: 'var(--color-ink)',
        color: 'var(--color-paper)',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

function Quote({
  children,
  size = 'md',
}: {
  children: ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <div
      style={{
        position: 'relative',
        paddingLeft: 16,
        borderLeft: '2px solid var(--color-bud-deep)',
        fontStyle: 'italic',
        color: 'var(--color-ink-2)',
        fontSize: size === 'lg' ? 17 : 14.5,
        lineHeight: size === 'lg' ? 1.6 : 1.55,
      }}
    >
      <span aria-hidden style={{ color: 'var(--color-bud-deep)', marginRight: 2 }}>“</span>
      {children}
      <span aria-hidden style={{ color: 'var(--color-bud-deep)', marginLeft: 2 }}>”</span>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span
        className="mono"
        style={{
          fontSize: 10.5,
          color: 'var(--color-ink-3)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ── Stat card (the 4-up row at the top) ────────────────────────────────────

function StatCard({
  label,
  value,
  subtext,
  accent,
}: {
  label: string;
  value: ReactNode;
  subtext: ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--color-line)',
        borderRadius: 14,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <Eyebrow>{label}</Eyebrow>
      <div
        className="display"
        style={{
          fontSize: 34,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: accent ?? 'var(--color-ink)',
          lineHeight: 1.05,
          marginTop: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--color-ink-3)', marginTop: 2 }}>{subtext}</div>
    </div>
  );
}

// ── Hero (top section) ─────────────────────────────────────────────────────

function Hero({
  persona,
  targetUrl,
  verdict,
  elapsed,
  steps,
}: {
  persona: Persona;
  targetUrl: string;
  verdict: Verdict;
  elapsed: string;
  steps: Step[];
}) {
  const tone = VERDICT_TONE[verdict.decision];
  const confidence10 = Math.max(0, Math.min(10, Math.round(verdict.confidence * 10)));
  const counts = severityCounts(verdict.frictionList);
  return (
    <section style={{ marginBottom: 56 }}>
      <Eyebrow>The bud&rsquo;s wrap-up</Eyebrow>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 240px',
          gap: 32,
          marginTop: 12,
          marginBottom: 28,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13.5,
              color: 'var(--color-ink-3)',
              marginBottom: 18,
            }}
          >
            <span style={{ color: 'var(--color-ink-2)', fontWeight: 500 }}>{persona.name}</span>
            <span style={{ color: 'var(--color-ink-4)' }}>·</span>
            <span className="mono" style={{ color: 'var(--color-ink-2)' }}>
              {hostOnly(targetUrl)}
            </span>
          </div>
          <h1
            className="display"
            style={{
              fontSize: 52,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              margin: 0,
              lineHeight: 1.05,
              color: 'var(--color-ink)',
            }}
          >
            {verdict.headline}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 22 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 13px',
                background: tone.bg,
                color: tone.fg,
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: tone.dot }} />
              {VERDICT_LABEL[verdict.decision]}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <Eyebrow style={{ letterSpacing: '0.08em' }}>Confidence</Eyebrow>
              <span
                className="display"
                style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-ink)' }}
              >
                {confidence10}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-ink-3)' }}>/ 10</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
          <Testbud
            expression={tone.expression}
            costume={persona.costume}
            size={220}
            animated
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
        }}
      >
        <StatCard
          label="Time on site"
          value={elapsed}
          subtext="active engagement"
        />
        <StatCard
          label="Pages explored"
          value={verdict.pagesExplored}
          subtext={
            verdict.pagesEstimatedTotal > 0
              ? `of ~${verdict.pagesEstimatedTotal} in nav`
              : `${steps.length} ${pluralize(steps.length, 'step', 'steps')} total`
          }
        />
        <StatCard
          label="Frictions"
          value={verdict.frictionList.length}
          subtext={`${counts.high} high · ${counts.medium} med · ${counts.low} low`}
        />
        <StatCard
          label="Wins"
          value={verdict.wins.length}
          subtext="keep doing this"
        />
      </div>
    </section>
  );
}

// ── "The one thing" callout ────────────────────────────────────────────────

function TheOneThing({ verdict }: { verdict: Verdict }) {
  const [copied, setCopied] = useState(false);
  const copyForSlack = () => {
    const text = `*The one thing* — ${verdict.theOneThing}`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <section style={{ marginBottom: 56 }}>
      <div
        style={{
          background: 'var(--color-bud-cream)',
          border: '1px solid var(--color-bud-soft)',
          borderRadius: 18,
          padding: '28px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Eyebrow style={{ color: 'var(--color-bud-deep)' }}>The one thing</Eyebrow>
          <button
            type="button"
            onClick={copyForSlack}
            style={{
              ...btnGhost(),
              background: 'rgba(255,255,255,0.6)',
              borderColor: 'var(--color-bud-deep)',
              color: 'var(--color-bud-deep)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {copied ? 'Copied' : 'Copy for Slack'}
            <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M 3 4 L 3 12 L 11 12 M 6 2 L 13 2 L 13 9"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div
          className="display"
          style={{
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '-0.015em',
            lineHeight: 1.4,
            color: 'var(--color-ink)',
          }}
        >
          {verdict.theOneThing}
        </div>
      </div>
    </section>
  );
}

// ── Action item card ───────────────────────────────────────────────────────

function ActionItemCard({ rank, item }: { rank: number; item: FrictionItem }) {
  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid var(--color-line)',
        borderRadius: 16,
        padding: '22px 24px 18px',
        display: 'flex',
        gap: 22,
      }}
    >
      <div
        className="display"
        style={{
          fontSize: 38,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--color-ink-4)',
          lineHeight: 1,
          minWidth: 48,
          paddingTop: 2,
        }}
      >
        {String(rank).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <VerbTag>{item.actionVerb}</VerbTag>
          <h3
            className="display"
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '-0.015em',
              color: 'var(--color-ink)',
              flex: 1,
              minWidth: 0,
              lineHeight: 1.25,
            }}
          >
            {item.title}
          </h3>
          <SeverityPill severity={item.severity} />
        </div>

        <Quote>{item.evidenceQuote}</Quote>

        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {item.recommendations.map((rec, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                fontSize: 13.5,
                color: 'var(--color-ink-2)',
                lineHeight: 1.5,
              }}
            >
              <span
                aria-hidden
                style={{
                  marginTop: 7,
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--color-ink-3)',
                  flexShrink: 0,
                }}
              />
              <span>{rec}</span>
            </li>
          ))}
        </ul>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            paddingTop: 14,
            borderTop: '1px solid var(--color-line-soft)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <MetaItem label="Impact" value={IMPACT_LABEL[item.impact]} />
            <MetaItem label="Effort" value={EFFORT_LABEL[item.effort]} />
            <MetaItem label="Owner" value={item.owner} />
          </div>
          <button
            type="button"
            style={{
              ...btnGhost(),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600,
            }}
            disabled
          >
            Send to Linear
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M 3 7 L 11 7 M 7 3 L 11 7 L 7 11"
                stroke="currentColor"
                strokeWidth="1.7"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}

function ActionList({ verdict }: { verdict: Verdict }) {
  const n = verdict.frictionList.length;
  if (n === 0) return null;
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionHeader suffix="ranked by impact ÷ effort">
        Do these <span style={{ color: 'var(--color-bud-deep)' }}>{n}</span>{' '}
        {pluralize(n, 'thing', 'things')}, in this order
      </SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {verdict.frictionList.map((item, i) => (
          <ActionItemCard key={i} rank={i + 1} item={item} />
        ))}
      </div>
    </section>
  );
}

// ── Wins ───────────────────────────────────────────────────────────────────

function Wins({ verdict }: { verdict: Verdict }) {
  if (verdict.wins.length === 0) return null;
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionHeader>What&rsquo;s already working</SectionHeader>
      <div
        style={{
          background: '#fff',
          border: '1px solid var(--color-line)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {verdict.wins.map((w, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 20,
              padding: '18px 22px',
              borderBottom:
                i === verdict.wins.length - 1 ? 'none' : '1px solid var(--color-line-soft)',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 13,
                color: 'var(--color-bud-deep)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                minWidth: 28,
                paddingTop: 2,
              }}
            >
              0{i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                  marginBottom: 4,
                }}
              >
                {w.title}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
                {w.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Parting note ───────────────────────────────────────────────────────────

function PartingNote({ verdict }: { verdict: Verdict }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
        <SectionHeader>Bud&rsquo;s parting note</SectionHeader>
        <span
          className="mono"
          style={{
            fontSize: 10.5,
            color: 'var(--color-ink-3)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            border: '1px solid var(--color-line)',
            borderRadius: 999,
            padding: '2px 8px',
            marginLeft: -4,
          }}
        >
          Verbatim
        </span>
      </div>
      <div
        style={{
          background: 'var(--color-paper-deep)',
          borderRadius: 18,
          padding: '32px 38px',
        }}
      >
        <Quote size="lg">{verdict.partingNote}</Quote>
      </div>
    </section>
  );
}

// ── Next step ──────────────────────────────────────────────────────────────

function NextStep({
  run,
  verdict,
  elapsed,
  onReplay,
  onQueueNext,
  queuing,
  queueError,
}: {
  run: RunRecord;
  verdict: Verdict;
  elapsed: string;
  onReplay: () => void;
  onQueueNext: () => void;
  queuing: boolean;
  queueError?: string;
}) {
  const nextPersona = getPersona(verdict.nextPersonaSuggestion.slug);
  return (
    <section style={{ marginBottom: 56 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 1px minmax(0, 1.2fr)',
          gap: 28,
          alignItems: 'stretch',
          background: '#fff',
          border: '1px solid var(--color-line)',
          borderRadius: 18,
          padding: '24px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
          <Testbud
            expression="pleased"
            costume={run.persona.costume}
            size={72}
          />
          <div style={{ minWidth: 0 }}>
            <div
              className="display"
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--color-ink)',
                lineHeight: 1.2,
              }}
            >
              {run.persona.name}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                color: 'var(--color-ink-3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              {PERSONA_TAG[run.persona.slug] ?? run.persona.segment}
              <span style={{ margin: '0 6px', color: 'var(--color-ink-4)' }}>·</span>
              run {elapsed}
            </div>
            <button
              type="button"
              onClick={onReplay}
              style={{
                marginTop: 10,
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: 'var(--color-ink-2)',
                fontFamily: 'inherit',
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 500,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'var(--color-ink)',
                  color: 'var(--color-paper)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                }}
              >
                ▶
              </span>
              Replay run
            </button>
          </div>
        </div>
        <div style={{ background: 'var(--color-line)', width: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <Eyebrow>Next step</Eyebrow>
          <div style={{ fontSize: 15, color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
            Run the{' '}
            <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
              {nextPersona?.name ?? verdict.nextPersonaSuggestion.slug}
            </span>{' '}
            against the same URL
            {verdict.nextPersonaSuggestion.reason ? ` — ${verdict.nextPersonaSuggestion.reason}` : '.'}
          </div>
          {queueError && (
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--color-coral)',
                background: 'var(--color-coral-soft)',
                padding: '6px 10px',
                borderRadius: 8,
              }}
            >
              {queueError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onQueueNext}
              disabled={queuing || !nextPersona}
              style={{
                ...btnPrimary(),
                padding: '9px 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                opacity: queuing || !nextPersona ? 0.6 : 1,
                cursor: queuing || !nextPersona ? 'not-allowed' : 'pointer',
              }}
            >
              {queuing ? 'Queueing…' : 'Queue run'}
              <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden>
                <path
                  d="M 3 7 L 11 7 M 7 3 L 11 7 L 7 11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 18,
          marginTop: 28,
          color: 'var(--color-ink-3)',
          fontSize: 13,
        }}
      >
        <button type="button" style={textLink()} disabled>
          Export PDF
        </button>
        <span style={{ color: 'var(--color-ink-4)' }}>·</span>
        <button type="button" style={textLink()} disabled>
          Share link
        </button>
        <span style={{ color: 'var(--color-ink-4)' }}>·</span>
        <Link
          href="/"
          style={{
            ...textLink(),
            color: 'var(--color-ink-2)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Run again
        </Link>
      </div>
    </section>
  );
}

function textLink(): CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    padding: 0,
    color: 'var(--color-ink-3)',
    fontFamily: 'inherit',
    fontSize: 13,
    cursor: 'pointer',
  };
}

// ── The page ───────────────────────────────────────────────────────────────

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

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
        <AppHeader section="Runs" title="Run not found" />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            color: 'var(--color-ink-3)',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 15, color: 'var(--color-ink-2)' }}>
            We couldn&rsquo;t find a run with id <code className="mono">{id}</code>.
          </div>
          <Link href="/" style={{ ...btnPrimary(), textDecoration: 'none', display: 'inline-block' }}>
            Start a new run
          </Link>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
        <AppHeader section="Runs" title="Loading…" />
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-ink-3)',
          }}
        >
          Loading wrap-up…
        </div>
      </div>
    );
  }

  if (run.status === 'failed') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
        <AppHeader section="Runs" title={`${run.persona.name} · ${truncateUrl(run.targetUrl)}`} />
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-ink-3)', padding: 24, textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <div
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-coral)',
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              Run failed
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-ink-2)' }}>{run.error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (run.status !== 'completed' || !run.verdict) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
        <AppHeader
          section="Runs"
          title={`${run.persona.name} · ${truncateUrl(run.targetUrl)}`}
          status="Run still in progress"
          statusKind="live"
        />
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 14, color: 'var(--color-ink-3)', padding: 24, textAlign: 'center',
          }}
        >
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
      </div>
    );
  }

  // Defensive — older completed runs may have been synthesized before these
  // fields existed. Surface a nudge to re-run rather than crash on the missing data.
  if (
    !run.verdict.headline ||
    !run.verdict.theOneThing ||
    !run.verdict.partingNote ||
    !run.verdict.nextPersonaSuggestion
  ) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
        <AppHeader
          section="Runs"
          title={`${run.persona.name} · ${truncateUrl(run.targetUrl)}`}
          status={`Completed · ${elapsed}`}
          statusKind="done"
        />
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 14, color: 'var(--color-ink-3)', padding: 24, textAlign: 'center', maxWidth: 520, margin: '0 auto',
          }}
        >
          <div style={{ fontSize: 15, color: 'var(--color-ink-2)' }}>
            This run finished before actionable insights were added. Re-run the bud to get the full wrap-up.
          </div>
          <Link
            href="/"
            style={{ ...btnPrimary(), textDecoration: 'none', display: 'inline-block' }}
          >
            Run again
          </Link>
        </div>
      </div>
    );
  }

  const verdict = run.verdict;
  const onReplay = () => { window.location.href = `/runs/${run.id}`; };
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
        minHeight: '100vh',
        background: 'var(--color-paper)',
        display: 'flex',
        flexDirection: 'column',
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
              href={`/runs/${run.id}`}
              style={{ ...btnGhost(), textDecoration: 'none', display: 'inline-block' }}
            >
              Replay run
            </Link>
            <Link
              href="/"
              style={{ ...btnPrimary(), textDecoration: 'none', display: 'inline-block' }}
            >
              Run again
            </Link>
          </>
        }
      />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div
          style={{
            maxWidth: 920,
            margin: '0 auto',
            padding: '48px 56px 72px',
          }}
        >
          <Hero
            persona={run.persona}
            targetUrl={run.targetUrl}
            verdict={verdict}
            elapsed={elapsed}
            steps={run.steps}
          />
          <TheOneThing verdict={verdict} />
          <ActionList verdict={verdict} />
          <Wins verdict={verdict} />
          <PartingNote verdict={verdict} />
          <NextStep
            run={run}
            verdict={verdict}
            elapsed={elapsed}
            onReplay={onReplay}
            onQueueNext={onQueueNext}
            queuing={queuing}
            queueError={queueError}
          />
        </div>
      </div>
    </div>
  );
}
