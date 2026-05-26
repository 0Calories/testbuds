'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { BrowserFrame } from '@/components/BrowserFrame';
import { PhoneViewport } from '@/components/PhoneViewport';
import {
  NarrationFeed,
  type FeedItemData,
  type FeedKind,
} from '@/components/NarrationFeed';
import { VerdictPanel } from '@/components/VerdictPanel';
import { RunSidebar, type TrailItem } from '@/components/RunSidebar';
import { btnDanger, btnGhost, btnPrimary } from '@/components/buttons';
import type { Expression } from '@/components/Testbud';
import type { Persona } from '@/src/persona/types';
import type { Step } from '@/src/agent/types';
import type { Verdict } from '@/src/verdict/types';

function connectWithBackoff(url: string, onMessage: (data: string) => void, signal: { aborted: boolean }): { close: () => void } {
  let ws: WebSocket | undefined;
  let delay = 250;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const open = () => {
    if (closed || signal.aborted) return;
    ws = new WebSocket(url);
    ws.onmessage = (m) => onMessage(m.data as string);
    ws.onopen = () => { delay = 250; };
    ws.onclose = () => {
      if (closed || signal.aborted) return;
      timer = setTimeout(open, delay);
      delay = Math.min(delay * 2, 4000);
    };
    ws.onerror = () => { ws?.close(); };
  };
  open();

  return {
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    },
  };
}

// Mirror of the server-side RunRecord shape (kept here to avoid pulling in node:crypto).
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
  authedAs?: string;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function classifyKind(step: Step): FeedKind {
  if (step.action.kind === 'auth') return 'auth';
  if (step.actionResult === 'failed') return 'friction';
  if (step.reaction.emotion === 'frustrated' || step.reaction.emotion === 'impatient') return 'friction';
  if (step.index === 0) return 'arrived';
  if (step.action.kind === 'navigate') return 'action';
  return 'thought';
}

function buildTrailItems(steps: Step[], running: boolean): TrailItem[] {
  const items: TrailItem[] = steps.map((s) => ({
    state: 'done' as const,
    label: trailActionFor(s) ?? 'Thinking',
  }));
  if (running) {
    items.push({ state: 'active', label: 'Thinking…' });
  }
  return items;
}

/** Third-person description of what the bud did this step, for the trail. */
function trailActionFor(step: Step): string | undefined {
  const a = step.action;
  if (a.kind === 'auth' && a.username) return `Signed in as ${a.username}`;
  if (a.kind === 'navigate' && a.url) return `Going to ${truncateUrl(a.url)}`;
  if (a.kind === 'finish') {
    if (a.outcome === 'gave_up') return 'Giving up';
    if (a.outcome === 'completed') return 'Wrapping up';
    return 'Finishing';
  }
  const hasInstruction =
    a.instruction && a.instruction.length > 0 && a.instruction !== '(no browser action)';
  if (hasInstruction) {
    return a.instruction!.length > 70 ? a.instruction!.slice(0, 69) + '…' : a.instruction!;
  }
  return undefined;
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url.slice(0, 40);
  }
}

function statusLabel(run: RunRecord, elapsed: string): { label: string; kind: 'live' | 'done' | 'draft' } {
  if (run.status === 'completed') return { label: `Completed · ${elapsed}`, kind: 'done' };
  if (run.status === 'failed') return { label: `Failed · ${elapsed}`, kind: 'draft' };
  if (run.status === 'starting') return { label: `Starting…`, kind: 'live' };
  return { label: `Live · step ${run.steps.length}`, kind: 'live' };
}

export default function RunViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<RunRecord>();
  const [notFound, setNotFound] = useState(false);
  const [, setTick] = useState(0);

  // Initial state via REST + live updates via /events WS.
  useEffect(() => {
    let active = true;

    // Initial state via REST (also covers 404).
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

    // Live updates via /events WS.
    const wsBase = process.env.NEXT_PUBLIC_WORKER_WS ?? 'ws://localhost:5174';
    const signal = { aborted: false };
    const conn = connectWithBackoff(`${wsBase}/runs/${id}/events`, (data) => {
      const event = JSON.parse(data) as
        | { type: 'snapshot'; payload: { run: RunRecord; steps: Step[] } }
        | { type: 'step'; payload: Step }
        | { type: 'status'; payload: { status: RunRecord['status']; verdict?: Verdict; error?: string } };
      setRun((cur) => {
        if (event.type === 'snapshot') return { ...event.payload.run, steps: event.payload.steps };
        if (!cur) return cur;
        if (event.type === 'step') return { ...cur, steps: [...cur.steps, event.payload] };
        if (event.type === 'status')
          return {
            ...cur,
            status: event.payload.status,
            verdict: event.payload.verdict ?? cur.verdict,
            error: event.payload.error ?? cur.error,
          };
        return cur;
      });
    }, signal);

    return () => {
      active = false;
      signal.aborted = true;
      conn.close();
    };
  }, [id]);

  // Tick once a second so elapsed time refreshes between polls. Stop ticking
  // once the run reaches a terminal state — elapsed is then locked to
  // completedAt - startedAt and doesn't need refreshing.
  const terminal = run?.status === 'completed' || run?.status === 'failed';
  useEffect(() => {
    if (terminal) return;
    const i = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, [terminal]);

  if (notFound) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-paper)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
            We couldn’t find a run with id <code className="mono">{id}</code>.
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-ink-4)' }}>
            It may have expired (runs live in memory and don’t survive a server restart).
          </div>
          <button type="button" style={btnPrimary()} onClick={() => (window.location.href = '/')}>
            Start a new run
          </button>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-paper)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AppHeader section="Runs" title="Loading…" />
        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-3)' }}
        >
          Loading run…
        </div>
      </div>
    );
  }

  const running = run.status === 'starting' || run.status === 'running';
  const elapsed = formatElapsed((run.completedAt ?? Date.now()) - run.startedAt);
  const status = statusLabel(run, elapsed);
  const latestStep = run.steps.length > 0 ? run.steps[run.steps.length - 1]! : undefined;
  const latestExpression: Expression =
    (latestStep?.reaction.emotion as Expression | undefined) ?? 'neutral';
  // Carry over the most recent non-empty bubble so the thought persists across
  // observation-only steps where the agent didn't call `react`.
  let currentThought: string | undefined;
  for (let i = run.steps.length - 1; i >= 0; i--) {
    const b = run.steps[i]!.bubble;
    if (b && b.length > 0) {
      currentThought = b;
      break;
    }
  }

  const feedItems: FeedItemData[] = run.steps
    .filter((s) => s.narration && s.narration.length > 0)
    .map((s) => ({
      index: s.index,
      kind: classifyKind(s),
      expression: s.reaction.emotion as Expression,
      text: s.narration,
    }));

  const trail = buildTrailItems(run.steps, running);

  const actions = (
    <>
      {run.authedAs && (
        <span
          className="mono"
          aria-label={`Signed in as ${run.authedAs}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-3)',
            background: 'var(--color-paper-deep)',
            border: '1px solid var(--color-line)',
            borderRadius: 999,
            padding: '4px 10px',
            marginRight: 4,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M 3 5 L 4.5 6.5 L 7 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Signed in as {run.authedAs}
        </span>
      )}
      <button type="button" style={btnGhost()} disabled>
        Share
      </button>
      {running ? (
        <button type="button" style={btnDanger()} disabled>
          Stop run
        </button>
      ) : run.status === 'completed' ? (
        <>
          <button type="button" style={btnGhost()} onClick={() => (window.location.href = '/')}>
            New run
          </button>
          <Link
            href={`/runs/${run.id}/wrap-up`}
            style={{
              ...btnPrimary(),
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            See wrap-up
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
          </Link>
        </>
      ) : (
        <button type="button" style={btnPrimary()} onClick={() => (window.location.href = '/')}>
          New run
        </button>
      )}
    </>
  );

  const Viewport = run.viewport === 'mobile' ? PhoneViewport : BrowserFrame;

  return (
    <div style={{ height: '100vh', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader
        section="Runs"
        title={`${run.persona.name} · ${truncateUrl(run.targetUrl)}`}
        status={status.label}
        statusKind={status.kind}
        actions={actions}
      />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <RunSidebar
          personaName={run.persona.name}
          costume={run.persona.costume}
          url={run.targetUrl}
          goal={run.goal}
          elapsed={elapsed}
          step={run.steps.length}
          totalSteps={25}
          trail={trail}
        />
        <Viewport url={run.targetUrl} runId={run.id} recording={running} />
        {run.status === 'completed' && run.verdict ? (
          <VerdictPanel verdict={run.verdict} costume={run.persona.costume} runId={run.id} />
        ) : run.status === 'failed' ? (
          <div
            style={{
              width: 440,
              borderLeft: '1px solid var(--color-line)',
              padding: 24,
              background: 'var(--color-paper)',
              flexShrink: 0,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-coral)',
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              Run failed
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-ink-2)', lineHeight: 1.5 }}>{run.error}</div>
          </div>
        ) : (
          <NarrationFeed
            items={feedItems}
            streaming={running}
            costume={run.persona.costume}
            currentExpression={latestExpression}
            currentThought={currentThought}
          />
        )}
      </div>
    </div>
  );
}
