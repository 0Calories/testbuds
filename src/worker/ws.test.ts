import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import WebSocket from 'ws';
import { Store } from './store';
import { Orchestrator } from './orchestrator';
import { attachWsServer } from './ws';

const PORT = 5180 + Math.floor(Math.random() * 100);

describe('WS server', () => {
  let dir: string;
  let store: Store;
  let orch: Orchestrator;
  let httpServer: ReturnType<typeof createServer>;

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), 'testbuds-ws-'));
    store = new Store({ dataDir: dir });
    orch = new Orchestrator({ store, runRunner: async () => ({ decision: 'would_buy', summary: '' } as never) });
    httpServer = createServer();
    attachWsServer(httpServer, { orchestrator: orch, store });
    await new Promise<void>((r) => httpServer.listen(PORT, r));
  });

  afterEach(async () => {
    await new Promise<void>((r) => httpServer.close(() => r()));
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('streams archived rrweb events on /live, then live ones', async () => {
    const run = store.createRun({ personaSlug: 'x', targetUrl: 'u', goal: 'g', viewport: 'desktop' });
    store.appendRrwebEvent(run.id, { type: 1, ts: 'a' });
    store.appendRrwebEvent(run.id, { type: 2, ts: 'b' });

    const ws = new WebSocket(`ws://localhost:${PORT}/runs/${run.id}/live`);
    const received: unknown[] = [];
    ws.on('message', (data) => received.push(JSON.parse(data.toString())));

    await new Promise<void>((r) => ws.once('open', () => r()));
    // Give it a tick to flush archive
    await new Promise((r) => setTimeout(r, 50));
    orch.emitRrweb(run.id, { type: 3, ts: 'c' });
    await new Promise((r) => setTimeout(r, 50));

    expect(received.length).toBeGreaterThanOrEqual(3);
    expect((received[0] as { type: number }).type).toBe(1);
    expect((received[2] as { type: number }).type).toBe(3);

    ws.close();
  });

  it('rejects unknown paths with code 1008', async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}/nope`);
    const result = await new Promise<number | string>((r) => {
      ws.once('close', (c) => r(c));
      ws.once('error', () => r('error'));
    });
    // Either a close with code 1008, or connection rejected with error (400 response)
    expect([1008, 'error']).toContain(result);
  });

  it('streams step + status events on /events', async () => {
    const run = store.createRun({ personaSlug: 'x', targetUrl: 'u', goal: 'g', viewport: 'desktop' });
    const ws = new WebSocket(`ws://localhost:${PORT}/runs/${run.id}/events`);
    const received: unknown[] = [];
    ws.on('message', (m) => received.push(JSON.parse(m.toString())));
    await new Promise<void>((r) => ws.once('open', () => r()));
    await new Promise((r) => setTimeout(r, 30));
    orch.emitStatus(run.id, { status: 'running' });
    await new Promise((r) => setTimeout(r, 30));
    expect(received.some((e) => (e as { type: string }).type === 'snapshot')).toBe(true);
    expect(received.some((e) => (e as { type: string }).type === 'status')).toBe(true);
    ws.close();
  });
});
