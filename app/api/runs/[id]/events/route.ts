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
  let writeCount = 0;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
          writeCount++;
        } catch { closed = true; }
      };
      const sendEvent = (event: eventWithTime) => {
        const before = writeCount;
        write(`data: ${JSON.stringify({ kind: 'event', event })}\n\n`);
        if (before === 0) {
          log(`first event written to client for run=${id.slice(0, 8)} after ${Date.now() - openedAt}ms`);
        }
      };
      const sendEnd = () => {
        write(`data: ${JSON.stringify({ kind: 'end' })}\n\n`);
        try { controller.close(); } catch { /* already closed */ }
        closed = true;
      };

      // Hint to proxies/Nginx that this is a stream, not a buffered response.
      write(`retry: 2000\n\n`);

      const sub = subscribe(id, sendEvent, sendEnd);
      log(`opened run=${id.slice(0, 8)} snapshot=${!!sub.snapshot} backlog=${sub.backlog.length}`);
      if (sub.snapshot) sendEvent(sub.snapshot);
      for (const e of sub.backlog) sendEvent(e);
      if (sub.ended) sendEnd();

      const keepalive = setInterval(() => write(`: keepalive\n\n`), 15_000);

      const cleanup = () => {
        clearInterval(keepalive);
        sub.unsubscribe();
        closed = true;
        log(`closed run=${id.slice(0, 8)} total writes=${writeCount}`);
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
