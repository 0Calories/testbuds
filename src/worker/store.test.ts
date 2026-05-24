import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from './store';

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
