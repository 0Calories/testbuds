import { describe, it, expect } from 'vitest';
import {
  createRun,
  getRun,
  appendStep,
  completeRun,
  failRun,
  setLiveViewUrl,
  listRuns,
} from './run-store';
import { getPersona } from '../persona/library';
import type { Step } from '../agent/types';
import type { Verdict } from '../verdict/types';

const persona = getPersona('time-poor-evaluator')!;
const newRun = () => createRun({ persona, targetUrl: 'https://x.com', goal: 'Decide.' });

const step: Step = {
  index: 0,
  url: 'https://x.com',
  bubble: 'b',
  narration: 'Looking around.',
  reaction: { emotion: 'curious', intensity: 0.3 },
  action: { kind: 'act', instruction: 'click' },
  actionResult: 'ok',
};

const verdict: Verdict = {
  decision: 'would_investigate',
  confidence: 0.7,
  frictionList: [],
  summary: 's',
  highlight: 'h',
};

describe('run-store', () => {
  it('creates a run in the starting state with desktop viewport default', () => {
    const run = newRun();
    expect(run.status).toBe('starting');
    expect(run.viewport).toBe('desktop');
    expect(getRun(run.id)?.targetUrl).toBe('https://x.com');
  });

  it('honors a mobile viewport request', () => {
    const run = createRun({ persona, targetUrl: 'https://x.com', goal: 'g', viewport: 'mobile' });
    expect(getRun(run.id)?.viewport).toBe('mobile');
  });

  it('appendStep accumulates steps and moves to running', () => {
    const run = newRun();
    appendStep(run.id, step);
    expect(getRun(run.id)?.status).toBe('running');
    expect(getRun(run.id)?.steps).toHaveLength(1);
  });

  it('setLiveViewUrl stores the url', () => {
    const run = newRun();
    setLiveViewUrl(run.id, 'https://live.example.com');
    expect(getRun(run.id)?.liveViewUrl).toBe('https://live.example.com');
  });

  it('completeRun stores the verdict and completed status', () => {
    const run = newRun();
    completeRun(run.id, verdict);
    expect(getRun(run.id)?.status).toBe('completed');
    expect(getRun(run.id)?.verdict?.decision).toBe('would_investigate');
  });

  it('failRun stores the error and failed status', () => {
    const run = newRun();
    failRun(run.id, 'browser crashed');
    expect(getRun(run.id)?.status).toBe('failed');
    expect(getRun(run.id)?.error).toBe('browser crashed');
  });

  it('listRuns returns the newest run first', async () => {
    const a = newRun();
    // Ensure b's startedAt is strictly later than a's (Date.now() can repeat).
    await new Promise((resolve) => setTimeout(resolve, 2));
    const b = newRun();
    const ids = listRuns().map((r) => r.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
  });
});
