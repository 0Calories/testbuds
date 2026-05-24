import type { ReactNode } from 'react';
import { Testbud, type Expression } from './Testbud';
import type { Costume } from '@/src/persona/types';

const PERSONA_TAG: Record<string, string> = {
  hardhat: 'B2B · CTO',
  bags: 'B2C · Shopper',
  clipboard: 'B2B · Finance',
  coffee: 'B2B · Eng Lead',
  megaphone: 'B2B · IC',
  cards: 'B2C · Switcher',
  sweatband: 'B2C · Goals',
  phone: 'B2C · Mobile',
};

export type TrailState = 'done' | 'active' | 'idle';
export interface TrailItem {
  state: TrailState;
  label: string;
}

export interface RunSidebarProps {
  personaName: string;
  costume: Costume;
  expression: Expression;
  url: string;
  goal: string;
  elapsed: string;
  step: number;
  totalSteps: number;
  trail: TrailItem[];
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--color-ink-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function DotCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="6" fill="var(--color-bud-deep)" />
      <path d="M 4 7 L 6 9 L 10 5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotActive() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="6" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" />
      <circle cx="7" cy="7" r="3" fill="var(--color-ink)">
        <animate attributeName="r" values="2.5;3.5;2.5" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function DotIdle() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="3" fill="none" stroke="var(--color-ink-4)" strokeWidth="1.4" />
    </svg>
  );
}

function TrailStep({ state, label }: TrailItem) {
  const color =
    state === 'done' ? 'var(--color-bud-deep)' : state === 'active' ? 'var(--color-ink)' : 'var(--color-ink-4)';
  const dot = state === 'done' ? <DotCheck /> : state === 'active' ? <DotActive /> : <DotIdle />;
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', position: 'relative' }}>
      <div style={{ width: 18, display: 'flex', justifyContent: 'center', paddingTop: 3 }}>{dot}</div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, color, fontWeight: state === 'active' ? 500 : 400 }}>{label}</span>
      </div>
    </div>
  );
}

export function RunSidebar({
  personaName,
  costume,
  expression,
  url,
  goal,
  elapsed,
  step,
  totalSteps,
  trail,
}: RunSidebarProps) {
  const tag = PERSONA_TAG[costume] ?? '';
  return (
    <div
      style={{
        width: 288,
        borderRight: '1px solid var(--color-line)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-paper)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: '22px 22px 18px',
          borderBottom: '1px solid var(--color-line-soft)',
          textAlign: 'center',
          background: 'var(--color-paper-deep)',
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Testbud expression={expression} costume={costume} size={140} animated />
          <div
            className="mono"
            style={{
              position: 'absolute',
              bottom: -2,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--color-ink)',
              color: 'var(--color-paper)',
              padding: '4px 9px',
              borderRadius: 999,
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {expression}
          </div>
        </div>
        <div className="display" style={{ fontSize: 18, fontWeight: 600, marginTop: 18, lineHeight: 1.15 }}>
          {personaName}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--color-ink-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: 4,
          }}
        >
          {tag}
        </div>
      </div>

      <div
        style={{
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          borderBottom: '1px solid var(--color-line-soft)',
        }}
      >
        <Meta label="Target">
          <div className="mono" style={{ fontSize: 12, color: 'var(--color-ink)', wordBreak: 'break-all' }}>
            {url}
          </div>
        </Meta>
        <Meta label="Goal">
          <div style={{ fontSize: 13, color: 'var(--color-ink-2)', lineHeight: 1.4 }}>{goal}</div>
        </Meta>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Meta label="Elapsed">
            <div className="mono" style={{ fontSize: 15, color: 'var(--color-ink)', fontWeight: 500 }}>
              {elapsed}
            </div>
          </Meta>
          <Meta label="Step">
            <div className="mono" style={{ fontSize: 15, color: 'var(--color-ink)', fontWeight: 500 }}>
              {step}
              <span style={{ color: 'var(--color-ink-4)' }}> / ~{totalSteps}</span>
            </div>
          </Meta>
        </div>
      </div>

      <div style={{ padding: '18px 22px', flex: 1, overflow: 'auto' }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--color-ink-3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Trail
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {trail.map((t, i) => (
            <TrailStep key={i} {...t} />
          ))}
          {trail.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--color-ink-4)' }}>Waiting for the first step…</div>
          )}
        </div>
      </div>
    </div>
  );
}
