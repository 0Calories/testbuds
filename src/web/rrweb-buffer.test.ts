import { describe, expect, it, beforeEach } from 'vitest';
import type { eventWithTime } from '@rrweb/types';
import { pushEvent, markEnded, clearRun, subscribe } from './rrweb-buffer';

// rrweb event types we care about for the buffer logic.
const FULL_SNAPSHOT = 2 as const;
const INCREMENTAL = 3 as const;

function makeEvent(type: 2 | 3, timestamp: number, marker = ''): eventWithTime {
  return { type, timestamp, data: { marker } } as unknown as eventWithTime;
}

describe('rrweb-buffer', () => {
  beforeEach(() => {
    // Each test owns its own runId, but globalThis state lingers across tests.
    // Clear any leftovers from prior runs to keep tests isolated.
    clearRun('test-run');
  });

  it('subscribers receive the latest FullSnapshot and any buffered increments', () => {
    const snap = makeEvent(FULL_SNAPSHOT, 100, 'snap-1');
    const inc1 = makeEvent(INCREMENTAL, 110, 'inc-1');
    const inc2 = makeEvent(INCREMENTAL, 120, 'inc-2');

    pushEvent('test-run', snap);
    pushEvent('test-run', inc1);
    pushEvent('test-run', inc2);

    const sub = subscribe('test-run', () => {}, () => {});
    try {
      expect(sub.snapshot).toBe(snap);
      expect(sub.backlog).toEqual([inc1, inc2]);
      expect(sub.ended).toBe(false);
    } finally {
      sub.unsubscribe();
    }
  });

  it('discards old increments when a fresh FullSnapshot arrives', () => {
    pushEvent('test-run', makeEvent(FULL_SNAPSHOT, 100, 'snap-1'));
    pushEvent('test-run', makeEvent(INCREMENTAL, 110, 'inc-a'));

    const snap2 = makeEvent(FULL_SNAPSHOT, 200, 'snap-2');
    const inc2 = makeEvent(INCREMENTAL, 210, 'inc-b');
    pushEvent('test-run', snap2);
    pushEvent('test-run', inc2);

    const sub = subscribe('test-run', () => {}, () => {});
    try {
      expect(sub.snapshot).toBe(snap2);
      expect(sub.backlog).toEqual([inc2]);
    } finally {
      sub.unsubscribe();
    }
  });

  it('live subscribers receive events as they arrive', () => {
    const received: eventWithTime[] = [];
    const sub = subscribe('test-run', (e) => received.push(e), () => {});
    try {
      const snap = makeEvent(FULL_SNAPSHOT, 100);
      const inc = makeEvent(INCREMENTAL, 110);
      pushEvent('test-run', snap);
      pushEvent('test-run', inc);
      expect(received).toEqual([snap, inc]);
    } finally {
      sub.unsubscribe();
    }
  });

  it('unsubscribing stops further event delivery', () => {
    const received: eventWithTime[] = [];
    const sub = subscribe('test-run', (e) => received.push(e), () => {});
    pushEvent('test-run', makeEvent(INCREMENTAL, 100));
    sub.unsubscribe();
    pushEvent('test-run', makeEvent(INCREMENTAL, 200));
    expect(received).toHaveLength(1);
  });

  it('markEnded fires the end handler and marks subsequent subscribers as ended', () => {
    let ended = false;
    const sub = subscribe('test-run', () => {}, () => { ended = true; });
    markEnded('test-run');
    expect(ended).toBe(true);
    sub.unsubscribe();

    const sub2 = subscribe('test-run', () => {}, () => {});
    try {
      expect(sub2.ended).toBe(true);
    } finally {
      sub2.unsubscribe();
    }
  });

  it('clearRun removes the buffer and detaches listeners', () => {
    let ended = false;
    const sub = subscribe('test-run', () => {}, () => { ended = true; });
    clearRun('test-run');
    // After clearRun the buffer is gone — pushing creates a fresh one, the old
    // listener is gone with it.
    pushEvent('test-run', makeEvent(INCREMENTAL, 100));
    expect(ended).toBe(false);
    sub.unsubscribe();
  });
});
