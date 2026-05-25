import 'dotenv/config';
import { execSync } from 'node:child_process';
import { Store } from './store';
import { Orchestrator } from './orchestrator';
import { buildHttpServer } from './http';
import { attachWsServer } from './ws';
import { makeWorkerRunner } from './runner';

const PORT = Number(process.env.WORKER_PORT ?? 5174);
const DATA_DIR = process.env.DATA_DIR ?? './data';

// Kill any chrome processes left behind by a previous worker crash. Safe to
// run at boot — no other run can be in flight yet. Suppresses pkill's exit
// status when no matches are found.
try {
  execSync("pkill -9 -f 'chrome-linux64/chrome' || true", { stdio: 'ignore' });
} catch {
  // pkill not installed in some environments — non-fatal.
}

const store = new Store({ dataDir: DATA_DIR });

// Any runs still marked starting/running in the DB are from a previous worker
// process that died — their Chromium + agent loop is gone. Mark them failed
// so the UI doesn't show them stuck mid-run forever.
const interrupted = store.failInterruptedRuns('worker restarted mid-run');
if (interrupted > 0) {
  console.log(`[worker] marked ${interrupted} interrupted run(s) as failed`);
}

const orchestrator = new Orchestrator({ store, runRunner: makeWorkerRunner() });

const httpServer = buildHttpServer({ port: PORT, store, orchestrator });
attachWsServer(httpServer, { orchestrator, store });

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
