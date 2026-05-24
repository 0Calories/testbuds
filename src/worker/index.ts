import 'dotenv/config';
import { Store } from './store';
import { Orchestrator } from './orchestrator';
import { buildHttpServer } from './http';
import { attachWsServer } from './ws';

const PORT = Number(process.env.WORKER_PORT ?? 5174);
const DATA_DIR = process.env.DATA_DIR ?? './data';

const store = new Store({ dataDir: DATA_DIR });
const orchestrator = new Orchestrator({
  store,
  runRunner: async () => {
    // Stubbed until Task 11 plugs in the real Stagehand runner.
    throw new Error('runRunner not wired yet — Task 11');
  },
});

const httpServer = buildHttpServer({ port: PORT, store, orchestrator });
attachWsServer(httpServer, { orchestrator, store });

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
