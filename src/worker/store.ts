import Database from 'better-sqlite3';
import { mkdirSync, appendFileSync, readFileSync, existsSync } from 'node:fs';
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
  completedAt?: number;
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
  completed_at  INTEGER,
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
          completed_at: number | null; verdict_json: string | null; error: string | null;
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
      completedAt: row.completed_at ?? undefined,
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
      UPDATE runs SET status = 'completed', verdict_json = ?, completed_at = ? WHERE id = ?
    `).run(JSON.stringify(verdict), Date.now(), id);
  }

  failRun(id: string, error: string): void {
    this.db.prepare(`
      UPDATE runs SET status = 'failed', error = ?, completed_at = ? WHERE id = ?
    `).run(error, Date.now(), id);
  }

  /**
   * Mark any runs that were 'starting' or 'running' as 'failed' — call once on
   * worker startup. Their Chromium + agent loop died with the previous worker
   * process; without this they'd appear stuck mid-run forever in the UI.
   */
  failInterruptedRuns(message: string): number {
    const result = this.db.prepare(`
      UPDATE runs SET status = 'failed', error = ?, completed_at = ?
      WHERE status IN ('starting', 'running')
    `).run(message, Date.now());
    return result.changes;
  }

  appendStep(runId: string, step: Step): void {
    this.db.prepare(`
      INSERT INTO steps (run_id, idx, url, bubble, narration, emotion, intensity,
                         action_kind, action_payload_json, action_result, action_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId,
      step.index,
      step.url,
      step.bubble,
      step.narration,
      step.reaction.emotion,
      step.reaction.intensity,
      step.action.kind,
      JSON.stringify(step.action),
      step.actionResult,
      step.actionError ?? null,
    );
  }

  getRunSteps(runId: string): Step[] {
    const rows = this.db.prepare(`
      SELECT * FROM steps WHERE run_id = ? ORDER BY idx ASC
    `).all(runId) as Array<{
      idx: number; url: string; bubble: string | null; narration: string | null;
      emotion: string; intensity: number; action_kind: string;
      action_payload_json: string; action_result: 'ok' | 'failed' | 'n/a'; action_error: string | null;
    }>;
    return rows.map((row) => ({
      index: row.idx,
      url: row.url,
      bubble: row.bubble ?? '',
      narration: row.narration ?? '',
      reaction: { emotion: row.emotion as Step['reaction']['emotion'], intensity: row.intensity },
      action: JSON.parse(row.action_payload_json) as Step['action'],
      actionResult: row.action_result,
      actionError: row.action_error ?? undefined,
    }));
  }

  private rrwebPath(runId: string): string {
    const dir = join(this.dataDir, 'runs', runId);
    mkdirSync(dir, { recursive: true });
    return join(dir, 'rrweb.ndjson');
  }

  appendRrwebEvent(runId: string, event: unknown): void {
    try {
      appendFileSync(this.rrwebPath(runId), JSON.stringify(event) + '\n');
    } catch (err) {
      console.error('[store] rrweb append failed:', err);
      // Per spec: never fail a run because the archive hiccuped.
    }
  }

  readRrwebArchive(runId: string): unknown[] {
    const path = this.rrwebPath(runId);
    if (!existsSync(path)) return [];
    return readFileSync(path, 'utf8')
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l));
  }

  close(): void {
    this.db.close();
  }
}
