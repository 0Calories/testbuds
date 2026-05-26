import { EventEmitter } from 'node:events';
import type { Store, RunRecord, ViewportMode } from './store';
import type { Step } from '../agent/types';
import type { Verdict } from '../verdict/types';
import type { Connection } from '../connection/types';

export interface RunRunnerInput {
  run: RunRecord;
  connection?: Connection;
  emitRrweb: (event: unknown) => void;
  emitStep: (step: Step) => void;
  abortSignal: AbortSignal;
}

export type RunRunner = (input: RunRunnerInput) => Promise<Verdict>;

export interface OrchestratorDeps {
  store: Store;
  runRunner: RunRunner;
}

export type LiveListener = (event: unknown) => void;
export type EventListener = (event: { type: string; payload: unknown }) => void;

export class Orchestrator {
  private deps: OrchestratorDeps;
  private liveEmitters = new Map<string, EventEmitter>();
  private eventEmitters = new Map<string, EventEmitter>();
  private abortControllers = new Map<string, AbortController>();

  constructor(deps: OrchestratorDeps) {
    this.deps = deps;
  }

  private liveBus(runId: string): EventEmitter {
    let e = this.liveEmitters.get(runId);
    if (!e) { e = new EventEmitter(); e.setMaxListeners(0); this.liveEmitters.set(runId, e); }
    return e;
  }

  private eventBus(runId: string): EventEmitter {
    let e = this.eventEmitters.get(runId);
    if (!e) { e = new EventEmitter(); e.setMaxListeners(0); this.eventEmitters.set(runId, e); }
    return e;
  }

  subscribeLive(runId: string, listener: LiveListener): () => void {
    const bus = this.liveBus(runId);
    bus.on('rrweb', listener);
    return () => bus.off('rrweb', listener);
  }

  subscribeEvents(runId: string, listener: EventListener): () => void {
    const bus = this.eventBus(runId);
    bus.on('event', listener);
    return () => bus.off('event', listener);
  }

  emitRrweb(runId: string, event: unknown): void {
    this.deps.store.appendRrwebEvent(runId, event);
    this.liveBus(runId).emit('rrweb', event);
  }

  emitStep(runId: string, step: Step): void {
    this.deps.store.appendStep(runId, step);
    this.eventBus(runId).emit('event', { type: 'step', payload: step });
  }

  emitStatus(runId: string, status: { status: RunRecord['status']; verdict?: Verdict; error?: string }): void {
    this.eventBus(runId).emit('event', { type: 'status', payload: status });
  }

  startRun(input: { personaSlug: string; targetUrl: string; goal: string; viewport: ViewportMode; connection?: Connection }): RunRecord {
    const run = this.deps.store.createRun({
      personaSlug: input.personaSlug,
      targetUrl: input.targetUrl,
      goal: input.goal,
      viewport: input.viewport,
    });
    const abort = new AbortController();
    this.abortControllers.set(run.id, abort);

    // Fire-and-forget; the run loop reports state via emit*.
    void this.runLoop(run, input.connection, abort.signal).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[orchestrator] run ${run.id} crashed:`, err);
      this.deps.store.failRun(run.id, msg);
      this.emitStatus(run.id, { status: 'failed', error: msg });
    });

    return run;
  }

  private async runLoop(run: RunRecord, connection: Connection | undefined, signal: AbortSignal): Promise<void> {
    this.deps.store.markRunning(run.id);
    this.emitStatus(run.id, { status: 'running' });

    const verdict = await this.deps.runRunner({
      run,
      connection,
      emitRrweb: (e) => this.emitRrweb(run.id, e),
      emitStep: (s) => this.emitStep(run.id, s),
      abortSignal: signal,
    });

    this.deps.store.completeRun(run.id, verdict);
    this.emitStatus(run.id, { status: 'completed', verdict });
  }

  stopRun(runId: string): void {
    this.abortControllers.get(runId)?.abort();
  }
}
