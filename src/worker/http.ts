import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

export interface HttpDeps {
  port: number;
}

export function startHttpServer(deps: HttpDeps): ReturnType<typeof createServer> {
  const server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(deps.port, () => {
    console.log(`[worker] HTTP listening on :${deps.port}`);
  });

  return server;
}
