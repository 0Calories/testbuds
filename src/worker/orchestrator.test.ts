import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from './store';
import { Orchestrator } from './orchestrator';

describe('Orchestrator subscribers', () => {
  let dir: string;
  let store: Store;
  let orch: Orchestrator;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'testbuds-orch-'));
    store = new Store({ dataDir: dir });
    orch = new Orchestrator({ store, runRunner: async () => ({
      decision: 'would_investigate',
      confidence: 0.5,
      frictionList: [],
      summary: 'stub',
      highlight: 'stub',
    }) });
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('fans out rrweb events to /live subscribers for that run', () => {
    const run = store.createRun({ personaSlug: 'x', targetUrl: 'u', goal: 'g', viewport: 'desktop' });
    const received: unknown[] = [];
    const off = orch.subscribeLive(run.id, (e) => received.push(e));
    orch.emitRrweb(run.id, { type: 2 });
    orch.emitRrweb(run.id, { type: 3 });
    expect(received).toEqual([{ type: 2 }, { type: 3 }]);
    off();
    orch.emitRrweb(run.id, { type: 4 });
    expect(received).toHaveLength(2);
  });

  it('fans out step events to /events subscribers', () => {
    const run = store.createRun({ personaSlug: 'x', targetUrl: 'u', goal: 'g', viewport: 'desktop' });
    const received: unknown[] = [];
    orch.subscribeEvents(run.id, (e) => received.push(e));
    orch.emitStep(run.id, { index: 0, url: 'u', bubble: 'b', narration: 'n',
      reaction: { emotion: 'neutral', intensity: 0.5 },
      action: { kind: 'act', instruction: 'i' }, actionResult: 'ok' });
    expect(received).toHaveLength(1);
    expect((received[0] as { type: string }).type).toBe('step');
  });

  it('does not cross-deliver events between runs', () => {
    const a = store.createRun({ personaSlug: 'x', targetUrl: 'u', goal: 'g', viewport: 'desktop' });
    const b = store.createRun({ personaSlug: 'x', targetUrl: 'u', goal: 'g', viewport: 'desktop' });
    const aReceived: unknown[] = [];
    orch.subscribeLive(a.id, (e) => aReceived.push(e));
    orch.emitRrweb(b.id, { type: 99 });
    expect(aReceived).toHaveLength(0);
  });
});
