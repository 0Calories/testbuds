'use client';

import { use, useEffect, useState } from 'react';
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
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function classifyKind(step: Step): FeedKind {
  if (step.actionResult === 'failed') return 'friction';
  if (step.reaction.emotion === 'frustrated' || step.reaction.emotion === 'impatient') return 'friction';
  if (step.index === 0) return 'arrived';
  if (step.action.kind === 'navigate') return 'action';
  return 'thought';
}

function buildTrailItems(steps: Step[], running: boolean): TrailItem[] {
  const items: TrailItem[] = steps.map((s) => ({
    state: 'done' as const,
    label: s.bubble || shortLabelFor(s),
  }));
  if (running) {
    items.push({ state: 'active', label: 'Thinking…' });
  }
  return items;
}

function shortLabelFor(step: Step): string {
  if (step.action.kind === 'finish') return `Decided — ${step.action.outcome}`;
  if (step.action.kind === 'navigate' && step.action.url) return `Went to ${truncateUrl(step.action.url)}`;
  if (step.narration) return step.narration.slice(0, 60) + (step.narration.length > 60 ? '…' : '');
  return `Step ${step.index}`;
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
    const ws = new WebSocket(`${wsBase}/runs/${id}/events`);
    ws.onmessage = (msg) => {
      const event = JSON.parse(msg.data as string) as
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
    };

    return () => {
      active = false;
      ws.close();
    };
  }, [id]);

  // Tick once a second so elapsed time refreshes between polls.
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

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
  const elapsed = formatElapsed(Date.now() - run.startedAt);
  const status = statusLabel(run, elapsed);
  const latestExpression: Expression =
    run.steps.length > 0
      ? (run.steps[run.steps.length - 1]!.reaction.emotion as Expression)
      : 'neutral';

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
      <button type="button" style={btnGhost()} disabled>
        Share
      </button>
      {running ? (
        <button type="button" style={btnDanger()} disabled>
          Stop run
        </button>
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
          expression={latestExpression}
          url={run.targetUrl}
          goal={run.goal}
          elapsed={elapsed}
          step={run.steps.length}
          totalSteps={25}
          trail={trail}
        />
        <Viewport url={run.targetUrl} runId={run.id} recording={running} />
        {run.status === 'completed' && run.verdict ? (
          <VerdictPanel verdict={run.verdict} costume={run.persona.costume} />
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
          <NarrationFeed items={feedItems} streaming={running} />
        )}
      </div>
    </div>
  );
}
