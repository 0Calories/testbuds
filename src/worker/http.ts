import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Store, RunRecord } from './store';
import type { Orchestrator } from './orchestrator';
import { getPersona } from '../persona/library';
import type { Connection } from '../connection/types';

/** Attach the full Persona object so the web UI can read `run.persona.{name,costume}`. */
function hydrateRun(run: RunRecord): RunRecord & { persona: ReturnType<typeof getPersona> } {
  return { ...run, persona: getPersona(run.personaSlug) };
}

export interface HttpDeps {
  port: number;
  store: Store;
  orchestrator: Orchestrator;
}

const RUN_ID = /^\/runs\/([0-9a-f-]{36})$/;
const RUN_ID_STOP = /^\/runs\/([0-9a-f-]{36})\/stop$/;

export function buildHttpServer(deps: HttpDeps): Server {
  const server = createServer((req, res) => {
    handle(req, res, deps).catch((err) => {
      console.error('[http] handler crashed:', err);
      json(res, 500, { error: err instanceof Error ? err.message : String(err) });
    });
  });
  server.listen(deps.port, () => {
    console.log(`[worker] HTTP listening on :${deps.port}`);
  });
  return server;
}

async function handle(req: IncomingMessage, res: ServerResponse, deps: HttpDeps): Promise<void> {
  const url = req.url ?? '';
  const method = req.method ?? 'GET';

  if (method === 'GET' && url === '/health') return json(res, 200, { ok: true });

  if (method === 'POST' && url === '/runs') {
    const body = await readJson(req) as Record<string, unknown> | null;
    if (!body || typeof body.personaSlug !== 'string' || typeof body.targetUrl !== 'string' || typeof body.goal !== 'string') {
      return json(res, 400, { error: 'personaSlug, targetUrl, goal required' });
    }
    const hasAnyCred = body.loginUrl !== undefined || body.username !== undefined || body.password !== undefined;
    const hasAllCreds =
      typeof body.loginUrl === 'string' && body.loginUrl.length > 0 &&
      typeof body.username === 'string' && body.username.length > 0 &&
      typeof body.password === 'string' && body.password.length > 0;
    if (hasAnyCred && !hasAllCreds) {
      return json(res, 400, { error: 'loginUrl, username, and password must all be provided together' });
    }
    const connection: Connection | undefined = hasAllCreds
      ? {
          mode: 'test-credential',
          loginUrl: body.loginUrl as string,
          username: body.username as string,
          password: body.password as string,
        }
      : undefined;
    const viewport = body.viewport === 'mobile' ? 'mobile' : 'desktop';
    const run = deps.orchestrator.startRun({
      personaSlug: body.personaSlug,
      targetUrl: body.targetUrl,
      goal: body.goal,
      viewport,
      connection,
    });
    return json(res, 200, { run: { ...run, status: 'running' } });
  }

  if (method === 'GET' && url === '/runs') {
    return json(res, 200, { runs: deps.store.listRuns().map(hydrateRun) });
  }

  const stopMatch = url.match(RUN_ID_STOP);
  if (method === 'POST' && stopMatch) {
    const id = stopMatch[1]!;
    if (!deps.store.getRun(id)) return json(res, 404, { error: 'Run not found' });
    deps.orchestrator.stopRun(id);
    return json(res, 200, { ok: true });
  }

  const runMatch = url.match(RUN_ID);
  if (method === 'GET' && runMatch) {
    const id = runMatch[1]!;
    const run = deps.store.getRun(id);
    if (!run) return json(res, 404, { error: 'Run not found' });
    return json(res, 200, { run: hydrateRun(run), steps: deps.store.getRunSteps(id) });
  }

  json(res, 404, { error: 'Not found' });
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'connection': 'close' });
  res.end(JSON.stringify(body));
}
