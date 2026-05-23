import { EventEmitter } from 'node:events';
import type { eventWithTime } from '@rrweb/types';

/**
 * Per-run rrweb event buffer. Holds the latest FullSnapshot plus the
 * IncrementalSnapshot events since it, and fans events out to any number of
 * live SSE subscribers via a Node EventEmitter.
 *
 * Memory is bounded: when a fresh FullSnapshot arrives (the recorder is
 * configured to emit one every 30s), we discard old increments. So a run holds
 * at most ~one snapshot worth + 30s of mutations.
 */

interface RunBuffer {
  /** Most recent FullSnapshot (rrweb event type 2). Required to bootstrap a viewer. */
  snapshot: eventWithTime | null;
  /** Incremental events since `snapshot`. Replayed to new subscribers after the snapshot. */
  events: eventWithTime[];
  /** Live event fan-out. */
  emitter: EventEmitter;
  /** Set once `markEnded(runId)` is called — used so late subscribers immediately get a final sentinel. */
  ended: boolean;
}

// Park on globalThis so Next.js dev HMR doesn't wipe buffers between the runner's
// emit calls and the SSE route handler's subscribe calls.
const globalForBuf = globalThis as unknown as {
  __testbudsRrwebBuffers?: Map<string, RunBuffer>;
};
const buffers: Map<string, RunBuffer> = globalForBuf.__testbudsRrwebBuffers ?? new Map();
globalForBuf.__testbudsRrwebBuffers = buffers;

/** rrweb event type for FullSnapshot. See @rrweb/types EventType. */
const FULL_SNAPSHOT = 2;

const log = (...args: unknown[]) => console.log('[testbuds/rrweb-buffer]', ...args);

function getOrCreate(runId: string): RunBuffer {
  let buf = buffers.get(runId);
  if (!buf) {
    // Generous fan-out so we don't trip MaxListenersExceededWarning if multiple
    // tabs view the same run during a demo.
    const emitter = new EventEmitter();
    emitter.setMaxListeners(50);
    buf = { snapshot: null, events: [], emitter, ended: false };
    buffers.set(runId, buf);
  }
  return buf;
}

/** Push one rrweb event into the buffer and notify live subscribers. */
export function pushEvent(runId: string, event: eventWithTime): void {
  const buf = getOrCreate(runId);
  const wasEmpty = !buf.snapshot && buf.events.length === 0;
  if (event.type === FULL_SNAPSHOT) {
    buf.snapshot = event;
    buf.events = [];
    log(`run ${runId.slice(0, 8)} got FullSnapshot (events emitter listeners=${buf.emitter.listenerCount('event')})`);
  } else {
    buf.events.push(event);
    if (wasEmpty) log(`run ${runId.slice(0, 8)} first event arrived (type=${event.type})`);
  }
  buf.emitter.emit('event', event);
}

/**
 * Mark a run's stream as terminated (Stagehand closed). Subscribers receive an
 * `end` event so they can freeze on the last frame instead of waiting forever.
 */
export function markEnded(runId: string): void {
  const buf = getOrCreate(runId);
  buf.ended = true;
  buf.emitter.emit('end');
}

/** Drop a run's buffer entirely. Call when the run record itself is being cleaned up. */
export function clearRun(runId: string): void {
  const buf = buffers.get(runId);
  if (buf) buf.emitter.removeAllListeners();
  buffers.delete(runId);
}

export interface Subscription {
  /** FullSnapshot at the time of subscription, or null if none yet. */
  snapshot: eventWithTime | null;
  /** Increments since the snapshot, at the time of subscription. */
  backlog: eventWithTime[];
  /** Whether the run has already ended (subscriber should not wait for live events). */
  ended: boolean;
  /** Stop receiving live events. */
  unsubscribe: () => void;
}

/**
 * Subscribe to a run's live event stream. The caller receives a snapshot of
 * any buffered state immediately and can install `onEvent` / `onEnd` handlers
 * for future emissions.
 */
export function subscribe(
  runId: string,
  onEvent: (event: eventWithTime) => void,
  onEnd: () => void,
): Subscription {
  const buf = getOrCreate(runId);
  buf.emitter.on('event', onEvent);
  buf.emitter.on('end', onEnd);
  log(
    `subscribe run=${runId.slice(0, 8)} snapshot=${!!buf.snapshot} backlog=${buf.events.length} ended=${buf.ended}`,
  );
  return {
    snapshot: buf.snapshot,
    backlog: [...buf.events],
    ended: buf.ended,
    unsubscribe: () => {
      buf.emitter.off('event', onEvent);
      buf.emitter.off('end', onEnd);
    },
  };
}
