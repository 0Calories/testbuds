import { createServer, type Server } from 'node:http';
import type { Store } from './store';
import type { Orchestrator } from './orchestrator';

export interface HttpDeps {
  port: number;
  store: Store;
  orchestrator: Orchestrator;
}

export function buildHttpServer(deps: HttpDeps): Server {
  const server = createServer(async (req, res) => {
    const url = req.url ?? '';

    if (req.method === 'GET' && url === '/health') {
      return json(res, 200, { ok: true });
    }

    // Routes implemented in Task 9. For now, only /health.
    json(res, 404, { error: 'Not found' });
  });

  server.listen(deps.port, () => {
    console.log(`[worker] HTTP listening on :${deps.port}`);
  });

  return server;
}

function json(res: import('node:http').ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
