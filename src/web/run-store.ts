import { randomUUID } from 'node:crypto';
import type { Persona } from '../persona/types';
import type { Step } from '../agent/types';
import type { Verdict } from '../verdict/types';

export type RunStatus = 'starting' | 'running' | 'completed' | 'failed';
export type ViewportMode = 'desktop' | 'mobile';

export interface RunRecord {
  id: string;
  status: RunStatus;
  persona: Persona;
  targetUrl: string;
  goal: string;
  viewport: ViewportMode;
  liveViewUrl?: string;
  steps: Step[];
  verdict?: Verdict;
  error?: string;
  startedAt: number;
}

export interface CreateRunInput {
  persona: Persona;
  targetUrl: string;
  goal: string;
  viewport?: ViewportMode;
}

// Module-level singleton — fine for a single-process demo.
const runs = new Map<string, RunRecord>();

export function createRun(input: CreateRunInput): RunRecord {
  const record: RunRecord = {
    id: randomUUID(),
    status: 'starting',
    persona: input.persona,
    targetUrl: input.targetUrl,
    goal: input.goal,
    viewport: input.viewport ?? 'desktop',
    steps: [],
    startedAt: Date.now(),
  };
  runs.set(record.id, record);
  return record;
}

export function getRun(id: string): RunRecord | undefined {
  return runs.get(id);
}

export function listRuns(): RunRecord[] {
  return [...runs.values()].sort((a, b) => b.startedAt - a.startedAt);
}

function patch(id: string, changes: Partial<RunRecord>): void {
  const record = runs.get(id);
  if (record) runs.set(id, { ...record, ...changes });
}

export function setLiveViewUrl(id: string, liveViewUrl: string): void {
  patch(id, { liveViewUrl });
}

export function appendStep(id: string, step: Step): void {
  const record = runs.get(id);
  if (record) runs.set(id, { ...record, status: 'running', steps: [...record.steps, step] });
}

export function completeRun(id: string, verdict: Verdict): void {
  patch(id, { status: 'completed', verdict });
}

export function failRun(id: string, error: string): void {
  patch(id, { status: 'failed', error });
}
