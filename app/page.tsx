'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { PersonaPickCard } from '@/components/PersonaPickCard';
import { Testbud } from '@/components/Testbud';
import { btnGhost, btnPrimary } from '@/components/buttons';
import { personaLibrary } from '@/src/persona/library';

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

export default function NewRunPage() {
  const router = useRouter();
  const [personaSlug, setPersonaSlug] = useState<string>('roi-driven-buyer');
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

  const persona = personaLibrary.find((p) => p.slug === personaSlug) ?? personaLibrary[0]!;
  const notices = noticesByPersona[persona.slug] ?? [];

  async function submit() {
    setSubmitting(true);
    setError(undefined);
    try {
      const body: Record<string, unknown> = {
        personaSlug,
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

  const canSubmit = targetUrl.trim().length > 0 && goal.trim().length > 0 && !submitting;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader title="New run" status="Draft" statusKind="draft" />
      <div style={{ flex: 1, display: 'flex', overflow: 'auto' }}>
        {/* Main column */}
        <div style={{ flex: 1, padding: '40px 56px 56px' }}>
          <div style={{ maxWidth: 920, margin: '0 auto' }}>
            <div
              style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--color-ink-3)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Step 1 · Configure
              </div>
            </div>
            <h1
              className="display"
              style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.03em', margin: '4px 0 32px', lineHeight: 1 }}
            >
              Send a bud in.
            </h1>

            <FieldLabel hint="Required · the bud's costume and brief">Persona</FieldLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
              {personaLibrary.map((p) => (
                <PersonaPickCard
                  key={p.slug}
                  persona={p}
                  selected={p.slug === personaSlug}
                  onSelect={() => setPersonaSlug(p.slug)}
                />
              ))}
            </div>

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
                <button type="button" style={btnGhost()} disabled>
                  Save as template
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
            <Testbud expression="pleased" costume={persona.costume} size={200} />
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
          {notices.length > 0 && (
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

