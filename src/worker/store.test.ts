import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from './store';
import type { Step } from '../agent/types';

describe('Store', () => {
  let dir: string;
  let store: Store;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'testbuds-store-'));
    store = new Store({ dataDir: dir });
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates and reads back a run', () => {
    const run = store.createRun({
      personaSlug: 'skeptical-bargain-hunter',
      targetUrl: 'https://example.com',
      goal: 'Decide whether to sign up',
      viewport: 'desktop',
    });
    expect(run.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(run.status).toBe('starting');

    const fetched = store.getRun(run.id);
    expect(fetched?.targetUrl).toBe('https://example.com');
    expect(fetched?.status).toBe('starting');
  });

  it('lists runs newest-first', async () => {
    const a = store.createRun({ personaSlug: 'a', targetUrl: 'https://a.com', goal: 'g', viewport: 'desktop' });
    await new Promise((r) => setTimeout(r, 2));
    const b = store.createRun({ personaSlug: 'b', targetUrl: 'https://b.com', goal: 'g', viewport: 'desktop' });
    const list = store.listRuns();
    expect(list[0]?.id).toBe(b.id);
    expect(list[1]?.id).toBe(a.id);
  });

  it('updates run status', () => {
    const run = store.createRun({ personaSlug: 'x', targetUrl: 'https://x.com', goal: 'g', viewport: 'desktop' });
    store.markRunning(run.id);
    expect(store.getRun(run.id)?.status).toBe('running');
    store.completeRun(run.id, { decision: 'would_buy', summary: 'ok' } as never);
    const done = store.getRun(run.id);
    expect(done?.status).toBe('completed');
    expect(done?.verdict).toEqual({ decision: 'would_buy', summary: 'ok' });
  });
});

describe('Store — steps + archive', () => {
  let dir: string;
  let store: Store;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'testbuds-store-'));
    store = new Store({ dataDir: dir });
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('appends a step and reads it back via getRunSteps', () => {
    const run = store.createRun({ personaSlug: 'x', targetUrl: 'https://x.com', goal: 'g', viewport: 'desktop' });
    const step: Step = {
      index: 0,
      url: 'https://x.com',
      bubble: 'hi',
      narration: 'hello world',
      reaction: { emotion: 'curious', intensity: 0.5 },
      action: { kind: 'act', instruction: 'look around' },
      actionResult: 'ok',
    };
    store.appendStep(run.id, step);
    const steps = store.getRunSteps(run.id);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.narration).toBe('hello world');
    expect(steps[0]?.reaction.emotion).toBe('curious');
  });

  it('appends rrweb events to the archive', () => {
    const run = store.createRun({ personaSlug: 'x', targetUrl: 'https://x.com', goal: 'g', viewport: 'desktop' });
    store.appendRrwebEvent(run.id, { type: 2, data: { node: { type: 0 } }, timestamp: 1 } as never);
    store.appendRrwebEvent(run.id, { type: 3, data: { source: 0 }, timestamp: 2 } as never);
    const path = join(dir, 'runs', run.id, 'rrweb.ndjson');
    expect(existsSync(path)).toBe(true);
    const lines = readFileSync(path, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).type).toBe(2);
  });

  it('reads back rrweb events in order', () => {
    const run = store.createRun({ personaSlug: 'x', targetUrl: 'https://x.com', goal: 'g', viewport: 'desktop' });
    store.appendRrwebEvent(run.id, { type: 2, timestamp: 1 } as never);
    store.appendRrwebEvent(run.id, { type: 3, timestamp: 2 } as never);
    const events = store.readRrwebArchive(run.id);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: 2 });
  });
});
