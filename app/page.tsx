'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { PersonaPickCard } from '@/components/PersonaPickCard';
import { Testbud } from '@/components/Testbud';
import { btnGhost, btnPrimary } from '@/components/buttons';
import { personaLibrary } from '@/src/persona/library';
import type { Persona } from '@/src/persona/types';

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

const noticesByPersona: Record<string, string[]> = {
  'skeptical-bargain-hunter': [
    'Pricing buried below the fold',
    'Marketing claims without proof',
    'Discounts not visible up front',
  ],
  'overwhelmed-switcher': [
    'No comparison against competitors',
    'Migration friction unaddressed',
    'Pricing parity unclear',
  ],
  'goal-driven-self-improver': [
    'Vague positioning that fits no goal',
    'Long setup before any first win',
    'Missing proof of real outcomes',
  ],
  'distracted-mobile-browser': [
    'Heavy popups that block content',
    'Hero unclear in the first screen',
    'Layout shifts on load',
  ],
  'time-poor-evaluator': [
    'Demo-call gating with no preview',
    'Vague positioning, unclear ICP',
    'No fast path to try the product',
  ],
  'technical-gatekeeper-cto': [
    'Missing security / SOC 2 page',
    'No real documentation links',
    'Hand-wavy technical claims',
  ],
  'roi-driven-buyer': [
    'Pricing pages hidden behind "contact sales"',
    'Case studies without numbers',
    'Demo CTAs that repeat above the fold',
  ],
  'internal-champion': [
    'No forwardable artifacts',
    'No case studies matching their industry',
    'Pricing locked behind a demo call',
  ],
};

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span
        className="mono"
        style={{
          fontSize: 10.5,
          color: 'var(--color-ink-2)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {children}
      </span>
      {hint && <span style={{ fontSize: 11.5, color: 'var(--color-ink-3)' }}>{hint}</span>}
    </div>
  );
}

function Field({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 10,
        border: '1px solid var(--color-line)',
        padding: '12px 14px',
      }}
    >
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#fff',
        borderRadius: 10,
        border: '1px solid var(--color-line)',
        padding: '10px 14px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--color-ink-2)' }}>{label}</span>
      <span
        style={{
          width: 32,
          height: 18,
          borderRadius: 999,
          background: on ? 'var(--color-bud-deep)' : 'var(--color-line)',
          position: 'relative',
          transition: 'background 0.15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.15s',
          }}
        />
      </span>
    </button>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <svg width="14" height="14" viewBox="0 0 14 14" style={{ marginTop: 3, flexShrink: 0 }}>
        <circle cx="7" cy="7" r="6" fill="var(--color-bud-cream)" stroke="var(--color-bud-deep)" strokeWidth="1" />
        <path d="M 4 7 L 6 9 L 10 5" stroke="var(--color-bud-deep)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ lineHeight: 1.4 }}>{children}</span>
    </li>
  );
}

function StepPill({
  index,
  label,
  active,
  clickable,
  onClick,
}: {
  index: number;
  label: string;
  active: boolean;
  clickable: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 12px 4px 4px',
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        cursor: clickable ? 'pointer' : 'default',
        fontFamily: 'inherit',
        color: active ? 'var(--color-bud-deep)' : 'var(--color-ink-3)',
      }}
    >
      <span
        className="mono"
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          background: active ? 'var(--color-bud-deep)' : 'var(--color-paper-deep)',
          color: active ? '#fff' : 'var(--color-ink-3)',
          border: active ? 'none' : '1px solid var(--color-line)',
        }}
      >
        {index}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </button>
  );
}

function Stepper({
  step,
  onJumpToStep1,
}: {
  step: 1 | 2;
  onJumpToStep1: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
      <StepPill
        index={1}
        label="Pick a bud"
        active={step === 1}
        clickable={step === 2}
        onClick={step === 2 ? onJumpToStep1 : undefined}
      />
      <div style={{ width: 36, height: 1, background: 'var(--color-line)' }} />
      <StepPill index={2} label="Brief" active={step === 2} clickable={false} />
    </div>
  );
}

function SegmentSection({
  label,
  personas,
  selectedSlug,
  onSelect,
}: {
  label: string;
  personas: Persona[];
  selectedSlug: string | undefined;
  onSelect: (slug: string) => void;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        className="mono"
        style={{
          fontSize: 10.5,
          color: 'var(--color-ink-2)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {personas.map((p) => (
          <PersonaPickCard
            key={p.slug}
            persona={p}
            selected={p.slug === selectedSlug}
            onSelect={() => onSelect(p.slug)}
          />
        ))}
      </div>
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        fontSize: 13,
        padding: '8px 0',
        borderBottom: '1px solid var(--color-line)',
      }}
    >
      <span
        className="mono"
        style={{
          color: 'var(--color-ink-3)',
          fontSize: 10.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          flexShrink: 0,
          paddingTop: 2,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: 'var(--color-ink)',
          textAlign: 'right',
          minWidth: 0,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PlanSummary({
  targetUrl,
  goal,
  mobile,
  username,
}: {
  targetUrl: string;
  goal: string;
  mobile: boolean;
  username: string;
}) {
  const truncatedGoal = goal.length > 80 ? `${goal.slice(0, 80).trimEnd()}…` : goal;
  const placeholder = (text: string) => (
    <span style={{ color: 'var(--color-ink-4)', fontStyle: 'italic' }}>{text}</span>
  );
  return (
    <div style={{ marginTop: 24 }}>
      <div
        className="mono"
        style={{
          fontSize: 11,
          color: 'var(--color-ink-3)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Plan
      </div>
      <PlanRow label="URL" value={targetUrl ? targetUrl : placeholder('Not set')} />
      <PlanRow label="Goal" value={goal ? truncatedGoal : placeholder('Not set')} />
      <PlanRow label="Viewport" value={mobile ? 'Mobile' : 'Desktop'} />
      <PlanRow label="Login" value={username ? username : placeholder('—')} />
    </div>
  );
}

export default function NewRunPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [personaSlug, setPersonaSlug] = useState<string | undefined>(undefined);
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [goal, setGoal] = useState<string>('');
  const [loginUrl, setLoginUrl] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [mobile, setMobile] = useState<boolean>(false);
  const [blockTrackers, setBlockTrackers] = useState<boolean>(true);
  const [recordVideo, setRecordVideo] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const persona = personaSlug ? personaLibrary.find((p) => p.slug === personaSlug) : undefined;
  const notices = persona ? (noticesByPersona[persona.slug] ?? []) : [];
  const b2cPersonas = personaLibrary.filter((p) => p.segment === 'B2C');
  const b2bPersonas = personaLibrary.filter((p) => p.segment === 'B2B');

  const canAdvance = personaSlug !== undefined;
  const canSubmit = canAdvance && targetUrl.trim().length > 0 && goal.trim().length > 0 && !submitting;

  async function submit() {
    if (!persona) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const body: Record<string, unknown> = {
        personaSlug: persona.slug,
        targetUrl: targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`,
        goal,
        viewport: mobile ? 'mobile' : 'desktop',
      };
      if (loginUrl && username && password) {
        body.loginUrl = loginUrl;
        body.username = username;
        body.password = password;
      }
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start run');
      router.push(`/runs/${data.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader title="New run" status="Draft" statusKind="draft" />
      <div style={{ flex: 1, display: 'flex', overflow: 'auto' }}>
        {/* Main column */}
        <div style={{ flex: 1, padding: '40px 56px 56px' }}>
          <div style={{ maxWidth: 920, margin: '0 auto' }}>
            <Stepper step={step} onJumpToStep1={() => setStep(1)} />

            {step === 1 ? (
              <>
                <h1
                  className="display"
                  style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.03em', margin: '4px 0 32px', lineHeight: 1 }}
                >
                  Pick a bud.
                </h1>

                <SegmentSection
                  label="B2C"
                  personas={b2cPersonas}
                  selectedSlug={personaSlug}
                  onSelect={setPersonaSlug}
                />
                <SegmentSection
                  label="B2B"
                  personas={b2bPersonas}
                  selectedSlug={personaSlug}
                  onSelect={setPersonaSlug}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    borderTop: '1px solid var(--color-line)',
                    paddingTop: 20,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => canAdvance && setStep(2)}
                    disabled={!canAdvance}
                    style={{
                      ...btnPrimary(),
                      padding: '12px 22px',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      opacity: canAdvance ? 1 : 0.5,
                      cursor: canAdvance ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Next
                    <svg width="14" height="14" viewBox="0 0 14 14">
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
              </>
            ) : (
              <>
                <h1
                  className="display"
                  style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.03em', margin: '4px 0 32px', lineHeight: 1 }}
                >
                  Brief the bud.
                </h1>

                <FieldLabel hint="Required">Target URL</FieldLabel>
                <Field>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--color-ink-4)' }}>
                      https://
                    </span>
                    <input
                      className="mono"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="your-product.com"
                      style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        fontSize: 15,
                        color: 'var(--color-ink)',
                        background: 'transparent',
                      }}
                    />
                  </div>
                </Field>
                <div style={{ height: 24 }} />

                <FieldLabel hint="Plain language · what should the bud try to do?">Goal</FieldLabel>
                <Field>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Decide whether this is worth signing up for. Be skeptical about hidden costs and require concrete proof."
                    rows={3}
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontFamily: 'inherit',
                      fontSize: 14.5,
                      color: 'var(--color-ink)',
                      resize: 'none',
                      lineHeight: 1.5,
                      minHeight: 64,
                    }}
                  />
                </Field>
                <div style={{ height: 24 }} />

                <FieldLabel hint="Optional · stored only for this run">Test-account credentials</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Field>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--color-ink-3)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Login URL
                    </div>
                    <input
                      className="mono"
                      value={loginUrl}
                      onChange={(e) => setLoginUrl(e.target.value)}
                      placeholder="https://app.example.com/login"
                      style={inputBare()}
                    />
                  </Field>
                  <Field>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--color-ink-3)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Email
                    </div>
                    <input
                      className="mono"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="bud@testbuds.dev"
                      style={inputBare()}
                    />
                  </Field>
                  <Field>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--color-ink-3)',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Password
                    </div>
                    <input
                      type="password"
                      className="mono"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={inputBare()}
                    />
                  </Field>
                </div>
                <div style={{ height: 24 }} />

                <FieldLabel>Advanced</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
                  <ToggleRow label="Block third-party trackers" on={blockTrackers} onToggle={() => setBlockTrackers((v) => !v)} />
                  <ToggleRow label="Run on mobile viewport" on={mobile} onToggle={() => setMobile((v) => !v)} />
                  <ToggleRow label="Record session video" on={recordVideo} onToggle={() => setRecordVideo((v) => !v)} />
                </div>

                {error && (
                  <p
                    style={{
                      color: 'var(--color-coral)',
                      background: 'var(--color-coral-soft)',
                      padding: '10px 14px',
                      borderRadius: 10,
                      marginBottom: 16,
                      fontSize: 13.5,
                    }}
                  >
                    {error}
                  </p>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--color-line)',
                    paddingTop: 20,
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--color-ink-3)' }}>
                    The bud will browse for up to{' '}
                    <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>8 minutes</span>,
                    then deliver a verdict.
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => setStep(1)} style={btnGhost()}>
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={!canSubmit}
                      style={{
                        ...btnPrimary(),
                        padding: '12px 22px',
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        opacity: canSubmit ? 1 : 0.5,
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {submitting ? 'Starting…' : 'Send the bud in'}
                      <svg width="14" height="14" viewBox="0 0 14 14">
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
              </>
            )}
          </div>
        </div>

        {/* Right preview rail */}
        <div
          style={{
            width: 360,
            borderLeft: '1px solid var(--color-line)',
            background: 'var(--color-paper-deep)',
            padding: '40px 28px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--color-ink-3)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Your bud
          </div>
          {persona ? (
            <div
              style={{
                background: 'var(--color-paper)',
                borderRadius: 18,
                padding: '24px 18px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Testbud expression="pleased" costume={persona.costume} size={200} animated />
              <div className="display" style={{ fontSize: 22, fontWeight: 600, marginTop: 14, textAlign: 'center' }}>
                {persona.name}
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
                {PERSONA_TAG[persona.slug]}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-ink-3)',
                  textAlign: 'center',
                  lineHeight: 1.5,
                  marginTop: 14,
                }}
              >
                {persona.identity.context}
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--color-paper)',
                borderRadius: 18,
                padding: '40px 18px',
                textAlign: 'center',
                color: 'var(--color-ink-3)',
                fontSize: 13,
                lineHeight: 1.5,
                border: '1px dashed var(--color-line)',
              }}
            >
              Pick a bud to see them here.
            </div>
          )}

          {step === 1 && notices.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--color-ink-3)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                What this bud notices
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--color-ink-2)',
                }}
              >
                {notices.map((n) => (
                  <Notice key={n}>{n}</Notice>
                ))}
              </ul>
            </div>
          )}

          {step === 2 && (
            <PlanSummary targetUrl={targetUrl} goal={goal} mobile={mobile} username={username} />
          )}

          <div
            style={{
              marginTop: 'auto',
              paddingTop: 20,
              fontSize: 12,
              color: 'var(--color-ink-3)',
              lineHeight: 1.5,
              borderTop: '1px solid var(--color-line)',
            }}
          >
            Buds run in a sandboxed Chromium on Browserbase. Nothing the bud sees leaves your workspace.
          </div>
        </div>
      </div>
    </div>
  );
}

function inputBare(): CSSProperties {
  return {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 14,
    color: 'var(--color-ink)',
    fontFamily: 'inherit',
  };
}
