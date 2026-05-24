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
  liveViewUrl?: string;
  steps: Step[];
  verdict?: Verdict;
  error?: string;
  startedAt: number;
  completedAt?: number;
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
  const items: TrailItem[] = steps.map((s) => {
    const action = trailActionFor(s);
    const narration = s.narration && s.narration.length > 0 ? s.narration : undefined;
    // Headline = the persona's narration. Subtitle = the third-person action.
    // If there's no narration to lead with, fall back to the action as the headline.
    return {
      state: 'done' as const,
      label: narration ?? action ?? 'Thinking',
      action: narration ? action : undefined,
    };
  });
  if (running) {
    items.push({ state: 'active', label: 'Thinking…' });
  }
  return items;
}

/**
 * Third-person description of what the bud did this step. Rendered as the
 * trail subtitle under the persona's narration.
 */
function trailActionFor(step: Step): string | undefined {
  const a = step.action;
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

  // Poll the run state.
  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      try {
        const res = await fetch(`/api/runs/${id}`);
        if (!active) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as { run: RunRecord };
          setRun(data.run);
          if (data.run.status === 'completed' || data.run.status === 'failed') return;
        }
      } catch {
        // network blip — try again next tick
      }
      timeout = setTimeout(poll, 1000);
    }
    void poll();
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
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
  const currentThought = latestStep?.bubble;

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
          url={run.targetUrl}
          goal={run.goal}
          elapsed={elapsed}
          step={run.steps.length}
          totalSteps={25}
          trail={trail}
        />
        <Viewport url={run.targetUrl} liveViewUrl={run.liveViewUrl} recording={running} />
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
