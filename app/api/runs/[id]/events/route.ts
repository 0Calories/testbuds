import { subscribe } from '@/src/web/rrweb-buffer';
import type { eventWithTime } from '@rrweb/types';

const log = (...args: unknown[]) => console.log('[testbuds/sse]', ...args);

/**
 * Server-Sent Events stream of rrweb events for one run.
 *
 * Wire format:
 *   data: {"kind":"event","event":<rrweb event JSON>}\n\n   ← per recorded event
 *   data: {"kind":"end"}\n\n                                ← stream terminated
 *   : keepalive\n\n                                         ← every 15s, ignored by EventSource
 *
 * On connect, the client receives:
 *   1. The most recent FullSnapshot (if any) — required to bootstrap the replayer.
 *   2. All buffered increments since that snapshot — fast-forwards to current state.
 *   3. Live events as they arrive.
 *   4. An `end` frame when the run terminates.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const encoder = new TextEncoder();
  const openedAt = Date.now();
  let bytesWritten = 0;
  let eventsWritten = 0;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          const bytes = encoder.encode(chunk);
          controller.enqueue(bytes);
          bytesWritten += bytes.length;
        } catch { closed = true; }
      };
      const sendEvent = (event: eventWithTime) => {
        write(`data: ${JSON.stringify({ kind: 'event', event })}\n\n`);
        eventsWritten++;
        if (eventsWritten === 1) {
          log(`first event written for run=${id.slice(0, 8)} after ${Date.now() - openedAt}ms (bytes=${bytesWritten})`);
        } else if (eventsWritten === 10 || eventsWritten === 100 || eventsWritten % 500 === 0) {
          log(`wrote event #${eventsWritten} at T+${Date.now() - openedAt}ms (total bytes=${bytesWritten})`);
        }
      };
      const sendEnd = () => {
        write(`data: ${JSON.stringify({ kind: 'end' })}\n\n`);
        try { controller.close(); } catch { /* already closed */ }
        closed = true;
      };

      // 2KB padding comment FIRST — pushes past Node HTTP write coalescing and
      // any intermediate proxy that holds back until a small-write threshold is
      // crossed. Classic SSE flush-priming trick.
      write(`: ${'.'.repeat(2048)}\n\n`);
      write(`retry: 2000\n\n`);

      const sub = subscribe(id, sendEvent, sendEnd);
      log(`opened run=${id.slice(0, 8)} snapshot=${!!sub.snapshot} backlog=${sub.backlog.length}`);
      if (sub.snapshot) sendEvent(sub.snapshot);
      for (const e of sub.backlog) sendEvent(e);
      if (sub.ended) sendEnd();

      // Aggressive keepalive while we're debugging buffering — every 2s instead
      // of 15s. Keeps a steady stream of small writes flowing so we can spot
      // any "messages stuck until next write" pattern in the wire.
      const keepalive = setInterval(() => write(`: keepalive ${Date.now()}\n\n`), 2000);

      const cleanup = () => {
        clearInterval(keepalive);
        sub.unsubscribe();
        closed = true;
        log(`closed run=${id.slice(0, 8)} events=${eventsWritten} bytes=${bytesWritten}`);
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      // Explicitly identity-encoded so no compression layer (Next compress,
      // nginx, CDN) can buffer the stream waiting for a flush window.
      'content-encoding': 'identity',
      'x-accel-buffering': 'no',
    },
  });
}
