import { subscribe } from '@/src/web/rrweb-buffer';
import type { eventWithTime } from '@rrweb/types';

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

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const write = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(chunk)); } catch { closed = true; }
      };
      const sendEvent = (event: eventWithTime) =>
        write(`data: ${JSON.stringify({ kind: 'event', event })}\n\n`);
      const sendEnd = () => {
        write(`data: ${JSON.stringify({ kind: 'end' })}\n\n`);
        try { controller.close(); } catch { /* already closed */ }
        closed = true;
      };

      // Hint to proxies/Nginx that this is a stream, not a buffered response.
      write(`retry: 2000\n\n`);

      const sub = subscribe(id, sendEvent, sendEnd);
      if (sub.snapshot) sendEvent(sub.snapshot);
      for (const e of sub.backlog) sendEvent(e);
      if (sub.ended) sendEnd();

      const keepalive = setInterval(() => write(`: keepalive\n\n`), 15_000);

      const cleanup = () => {
        clearInterval(keepalive);
        sub.unsubscribe();
        closed = true;
      };

      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      'x-accel-buffering': 'no', // disables nginx buffering if present
    },
  });
}
