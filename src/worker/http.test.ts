import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from './store';
import { Orchestrator } from './orchestrator';
import { buildHttpServer } from './http';
import type { Connection } from '../connection/types';

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

describe('HTTP routes — credentials', () => {
  let dir: string;
  let store: Store;
  let orch: Orchestrator;
  let server: ReturnType<typeof buildHttpServer>;
  let base: string;
  let capturedConnection: Connection | undefined;
  let runnerCalled: Promise<void>;
  let resolveRunnerCalled: () => void;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'testbuds-http-creds-'));
    store = new Store({ dataDir: dir });
    capturedConnection = undefined;
    runnerCalled = new Promise<void>((r) => { resolveRunnerCalled = r; });
    orch = new Orchestrator({
      store,
      runRunner: async (input) => {
        capturedConnection = input.connection;
        resolveRunnerCalled();
        return { decision: 'would_buy', summary: '' } as never;
      },
    });
    // Use port 0 so the OS assigns a fresh, never-collided port per test.
    // Avoids keep-alive socket reuse across the same fixed port between tests.
    server = buildHttpServer({ port: 0, store, orchestrator: orch });
    await new Promise<void>((r) => server.once('listening', () => r()));
    const addr = server.address() as { port: number };
    base = `http://localhost:${addr.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('builds a test-credential Connection when all three credentials are provided', async () => {
    const res = await fetch(`${base}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personaSlug: 'skeptical-bargain-hunter',
        targetUrl: 'https://app.example.com',
        goal: 'evaluate',
        viewport: 'desktop',
        loginUrl: 'https://app.example.com/login',
        username: 'bud@testbuds.dev',
        password: 'pw123',
      }),
    });
    expect(res.status).toBe(200);
    await runnerCalled;
    expect(capturedConnection).toMatchObject({
      mode: 'test-credential',
      loginUrl: 'https://app.example.com/login',
      username: 'bud@testbuds.dev',
      password: 'pw123',
    });
  });

  it('rejects partial credentials with 400', async () => {
    const res = await fetch(`${base}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personaSlug: 'skeptical-bargain-hunter',
        targetUrl: 'https://app.example.com',
        goal: 'evaluate',
        viewport: 'desktop',
        loginUrl: 'https://app.example.com/login',
        // username + password omitted
      }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toMatch(/loginUrl.*username.*password/i);
  });

  it('rejects an empty-string field as missing', async () => {
    const res = await fetch(`${base}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personaSlug: 'skeptical-bargain-hunter',
        targetUrl: 'https://app.example.com',
        goal: 'evaluate',
        viewport: 'desktop',
        loginUrl: '',
        username: 'bud@testbuds.dev',
        password: 'pw123',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('omits Connection when no credentials are provided (existing behavior)', async () => {
    const res = await fetch(`${base}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personaSlug: 'skeptical-bargain-hunter',
        targetUrl: 'https://app.example.com',
        goal: 'evaluate',
        viewport: 'desktop',
      }),
    });
    expect(res.status).toBe(200);
    await runnerCalled;
    expect(capturedConnection).toBeUndefined();
  });

  it('exposes authedAs on the hydrated run while the run is in flight', async () => {
    // Use a fresh server with a never-resolving runRunner so the username stays in the map.
    const dir2 = mkdtempSync(join(tmpdir(), 'testbuds-http-creds-inflight-'));
    const store2 = new Store({ dataDir: dir2 });
    const orch2 = new Orchestrator({
      store: store2,
      runRunner: async () => new Promise(() => {}) /* never resolves */,
    });
    const server2 = buildHttpServer({ port: 0, store: store2, orchestrator: orch2 });
    await new Promise<void>((r) => server2.once('listening', () => r()));
    const addr2 = server2.address() as { port: number };
    const base2 = `http://localhost:${addr2.port}`;

    try {
      const start = await fetch(`${base2}/runs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          personaSlug: 'skeptical-bargain-hunter',
          targetUrl: 'https://app.example.com',
          goal: 'evaluate',
          viewport: 'desktop',
          loginUrl: 'https://app.example.com/login',
          username: 'bud@testbuds.dev',
          password: 'pw',
        }),
      });
      const { run } = (await start.json()) as { run: { id: string } };

      const detail = (await fetch(`${base2}/runs/${run.id}`).then((r) => r.json())) as {
        run: { authedAs?: string };
      };
      expect(detail.run.authedAs).toBe('bud@testbuds.dev');

      const list = (await fetch(`${base2}/runs`).then((r) => r.json())) as {
        runs: { id: string; authedAs?: string }[];
      };
      expect(list.runs.find((r) => r.id === run.id)?.authedAs).toBe('bud@testbuds.dev');

      orch2.stopRun(run.id);
    } finally {
      await new Promise<void>((r) => server2.close(() => r()));
      store2.close();
      rmSync(dir2, { recursive: true, force: true });
    }
  });

  it('lists runs without leaking credentials', async () => {
    // Use a fresh never-resolving server so the run stays in flight and the
    // hydrated response is taken mid-life.
    const dir2 = mkdtempSync(join(tmpdir(), 'testbuds-http-creds-list-'));
    const store2 = new Store({ dataDir: dir2 });
    const orch2 = new Orchestrator({
      store: store2,
      runRunner: async () => new Promise(() => {}),
    });
    const server2 = buildHttpServer({ port: 0, store: store2, orchestrator: orch2 });
    await new Promise<void>((r) => server2.once('listening', () => r()));
    const addr2 = server2.address() as { port: number };
    const base2 = `http://localhost:${addr2.port}`;
    try {
      const start = await fetch(`${base2}/runs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          personaSlug: 'skeptical-bargain-hunter',
          targetUrl: 'https://app.example.com',
          goal: 'evaluate',
          viewport: 'desktop',
          loginUrl: 'https://app.example.com/login',
          username: 'bud@testbuds.dev',
          password: 'CANARY-list-pw-9f3a',
        }),
      });
      const { run } = (await start.json()) as { run: { id: string } };

      const list = (await fetch(`${base2}/runs`).then((r) => r.json())) as {
        runs: Array<Record<string, unknown>>;
      };
      expect(list.runs.length).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(list.runs)).not.toContain('CANARY-list-pw-9f3a');

      const detail = await fetch(`${base2}/runs/${run.id}`).then((r) => r.json());
      expect(JSON.stringify(detail)).not.toContain('CANARY-list-pw-9f3a');

      orch2.stopRun(run.id);
    } finally {
      await new Promise<void>((r) => server2.close(() => r()));
      store2.close();
      rmSync(dir2, { recursive: true, force: true });
    }
  });
});
