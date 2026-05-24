import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Verdict } from '../verdict/types';
import type { Step } from '../agent/types';

export type RunStatus = 'starting' | 'running' | 'completed' | 'failed';
export type ViewportMode = 'desktop' | 'mobile';

export interface RunRecord {
  id: string;
  personaSlug: string;
  targetUrl: string;
  goal: string;
  viewport: ViewportMode;
  status: RunStatus;
  startedAt: number;
  endedAt?: number;
  verdict?: Verdict;
  error?: string;
}

export interface CreateRunInput {
  personaSlug: string;
  targetUrl: string;
  goal: string;
  viewport: ViewportMode;
}

export interface StoreDeps {
  dataDir: string;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (
  id            TEXT PRIMARY KEY,
  persona_slug  TEXT NOT NULL,
  target_url    TEXT NOT NULL,
  goal          TEXT NOT NULL,
  viewport      TEXT NOT NULL CHECK (viewport IN ('desktop','mobile')),
  status        TEXT NOT NULL CHECK (status IN ('starting','running','completed','failed')),
  started_at    INTEGER NOT NULL,
  ended_at      INTEGER,
  verdict_json  TEXT,
  error         TEXT
);
CREATE INDEX IF NOT EXISTS runs_started_at ON runs(started_at DESC);

CREATE TABLE IF NOT EXISTS steps (
  run_id              TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  idx                 INTEGER NOT NULL,
  url                 TEXT NOT NULL,
  bubble              TEXT,
  narration           TEXT,
  emotion             TEXT,
  intensity           REAL,
  action_kind         TEXT,
  action_payload_json TEXT,
  action_result       TEXT CHECK (action_result IN ('ok','failed','n/a')),
  action_error        TEXT,
  PRIMARY KEY (run_id, idx)
);
`;

export class Store {
  private db: Database.Database;
  readonly dataDir: string;

  constructor(deps: StoreDeps) {
    this.dataDir = deps.dataDir;
    mkdirSync(this.dataDir, { recursive: true });
    mkdirSync(join(this.dataDir, 'runs'), { recursive: true });
    mkdirSync(join(this.dataDir, 'auth'), { recursive: true });
    this.db = new Database(join(this.dataDir, 'testbuds.db'));
    this.db.pragma('journal_mode = WAL');
    this.db.exec(SCHEMA);
  }

  createRun(input: CreateRunInput): RunRecord {
    const id = randomUUID();
    const startedAt = Date.now();
    this.db.prepare(`
      INSERT INTO runs (id, persona_slug, target_url, goal, viewport, status, started_at)
      VALUES (?, ?, ?, ?, ?, 'starting', ?)
    `).run(id, input.personaSlug, input.targetUrl, input.goal, input.viewport, startedAt);
    return {
      id,
      personaSlug: input.personaSlug,
      targetUrl: input.targetUrl,
      goal: input.goal,
      viewport: input.viewport,
      status: 'starting',
      startedAt,
    };
  }

  getRun(id: string): RunRecord | undefined {
    const row = this.db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as
      | {
          id: string; persona_slug: string; target_url: string; goal: string;
          viewport: ViewportMode; status: RunStatus; started_at: number;
          ended_at: number | null; verdict_json: string | null; error: string | null;
        }
      | undefined;
    if (!row) return undefined;
    return {
      id: row.id,
      personaSlug: row.persona_slug,
      targetUrl: row.target_url,
      goal: row.goal,
      viewport: row.viewport,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at ?? undefined,
      verdict: row.verdict_json ? (JSON.parse(row.verdict_json) as Verdict) : undefined,
      error: row.error ?? undefined,
    };
  }

  listRuns(): RunRecord[] {
    const rows = this.db.prepare('SELECT id FROM runs ORDER BY started_at DESC').all() as { id: string }[];
    return rows.map((r) => this.getRun(r.id)!).filter(Boolean);
  }

  markRunning(id: string): void {
    this.db.prepare(`UPDATE runs SET status = 'running' WHERE id = ?`).run(id);
  }

  completeRun(id: string, verdict: Verdict): void {
    this.db.prepare(`
      UPDATE runs SET status = 'completed', verdict_json = ?, ended_at = ? WHERE id = ?
    `).run(JSON.stringify(verdict), Date.now(), id);
  }

  failRun(id: string, error: string): void {
    this.db.prepare(`
      UPDATE runs SET status = 'failed', error = ?, ended_at = ? WHERE id = ?
    `).run(error, Date.now(), id);
  }

  appendStep(_runId: string, _step: Step): void {
    // Implemented in Task 5.
    throw new Error('appendStep: not implemented yet');
  }

  close(): void {
    this.db.close();
  }
}
