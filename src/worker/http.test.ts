import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from './store';
import { Orchestrator } from './orchestrator';
import { buildHttpServer } from './http';

const PORT = 5280 + Math.floor(Math.random() * 100);
const BASE = `http://localhost:${PORT}`;

describe('HTTP routes', () => {
  let dir: string;
  let store: Store;
  let orch: Orchestrator;
  let server: ReturnType<typeof buildHttpServer>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'testbuds-http-'));
    store = new Store({ dataDir: dir });
    orch = new Orchestrator({ store, runRunner: async () => ({ decision: 'would_buy', summary: '' } as never) });
    server = buildHttpServer({ port: PORT, store, orchestrator: orch });
  });

  afterEach(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('POST /runs creates a run', async () => {
    const res = await fetch(`${BASE}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personaSlug: 'skeptical-bargain-hunter',
        targetUrl: 'https://example.com',
        goal: 'See about signing up',
        viewport: 'desktop',
      }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { run: { id: string; status: string } };
    expect(json.run.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(json.run.status).toBe('running');
  });

  it('POST /runs validates required fields', async () => {
    const res = await fetch(`${BASE}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ personaSlug: 'x', targetUrl: 'u' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /runs/:id returns 404 for unknown ids', async () => {
    const res = await fetch(`${BASE}/runs/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });

  it('GET /runs lists runs', async () => {
    await fetch(`${BASE}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ personaSlug: 's', targetUrl: 'u', goal: 'g', viewport: 'desktop' }),
    });
    const res = await fetch(`${BASE}/runs`);
    const json = (await res.json()) as { runs: unknown[] };
    expect(json.runs.length).toBeGreaterThanOrEqual(1);
  });
});
