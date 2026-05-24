import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'node:http';
import type { Orchestrator } from './orchestrator';
import type { Store, RunRecord } from './store';

export interface AttachWsDeps {
  orchestrator: Orchestrator;
  store: Store;
}

const LIVE = /^\/runs\/([0-9a-f-]{36})\/live$/;
const EVENTS = /^\/runs\/([0-9a-f-]{36})\/events$/;

export function attachWsServer(server: Server, deps: AttachWsDeps): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = req.url ?? '';
    const live = url.match(LIVE);
    const events = url.match(EVENTS);
    if (!live && !events) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const runId = (live ?? events)![1]!;
      if (live) handleLive(ws, runId, deps);
      else handleEvents(ws, runId, deps);
    });
  });

  // Reject anything that doesn't match a known route after upgrade.
  wss.on('connection', (ws) => {
    // If we get here without an attached handler, close politely.
    if (!(ws as unknown as { _handled?: boolean })._handled) {
      ws.close(1008, 'Unknown route');
    }
  });

  return wss;
}

function handleLive(ws: WebSocket, runId: string, { orchestrator, store }: AttachWsDeps): void {
  (ws as unknown as { _handled: boolean })._handled = true;

  if (!store.getRun(runId)) {
    ws.close(1008, 'Unknown run');
    return;
  }

  // 1. Flush the archive (history).
  for (const event of store.readRrwebArchive(runId)) {
    ws.send(JSON.stringify(event));
  }

  // 2. Subscribe to live events.
  const off = orchestrator.subscribeLive(runId, (event) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(event));
  });

  ws.on('close', off);
  ws.on('error', off);
}

function handleEvents(ws: WebSocket, runId: string, { orchestrator, store }: AttachWsDeps): void {
  (ws as unknown as { _handled: boolean })._handled = true;

  const run = store.getRun(runId);
  if (!run) {
    ws.close(1008, 'Unknown run');
    return;
  }

  // 1. Send the current snapshot so a late-joiner sees current state.
  ws.send(JSON.stringify({ type: 'snapshot', payload: snapshotFor(run, store) }));

  // 2. Subscribe.
  const off = orchestrator.subscribeEvents(runId, (event) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(event));
  });

  ws.on('close', off);
  ws.on('error', off);
}

function snapshotFor(run: RunRecord, store: Store) {
  return {
    run,
    steps: store.getRunSteps(run.id),
  };
}
