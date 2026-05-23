'use client';

import { useEffect, useRef, useState } from 'react';
import type { eventWithTime } from '@rrweb/types';

export interface RrwebFrameProps {
  runId: string;
  /** Called once the replayer has bootstrapped (first FullSnapshot rendered). */
  onReady?: () => void;
  /** Called if the SSE stream errors or no snapshot arrives before timeout. */
  onUnavailable?: () => void;
  /** ms to wait for the first FullSnapshot before declaring unavailable. */
  bootstrapTimeoutMs?: number;
}

/**
 * Live rrweb replayer for a single run. Subscribes to /api/runs/[id]/events,
 * buffers events until enough arrive to instantiate `Replayer`, then streams
 * subsequent events into it via `addEvent`. Renders the replay inside a
 * sandboxed iframe (rrweb creates that iframe itself; we just give it a host
 * div).
 *
 * Why dynamic-import `rrweb`: it's a chunky package with browser-only code that
 * Next.js will try to evaluate during SSR if we import it at the module top.
 * Pulling it in inside `useEffect` keeps it client-only.
 */
export function RrwebFrame({
  runId,
  onReady,
  onUnavailable,
  // Generous timeout: agent startup (Browserbase session boot + auth +
  // page.goto) can take 20–30s on slow sites before the recorder has a real
  // document to snapshot. We'd rather wait quietly than prematurely fall back.
  bootstrapTimeoutMs = 60000,
}: RrwebFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootstrapFailed, setBootstrapFailed] = useState(false);

  // Hold the latest callbacks in a ref so the SSE effect doesn't re-fire when
  // a parent passes inline arrow functions (which would otherwise reconnect
  // and lose the buffered replay state on every parent render).
  const onReadyRef = useRef(onReady);
  const onUnavailableRef = useRef(onUnavailable);
  onReadyRef.current = onReady;
  onUnavailableRef.current = onUnavailable;

  useEffect(() => {
    const host: HTMLDivElement | null = hostRef.current;
    if (!host) return;
    // Narrowed local so closures inside async paths don't widen back to null.
    const hostEl: HTMLDivElement = host;

    let cancelled = false;
    // Buffer events until we've called Replayer with the initial set.
    let pending: eventWithTime[] = [];
    let replayer: { addEvent: (e: eventWithTime) => void; pause: () => void } | undefined;
    let bootstrapTimer: ReturnType<typeof setTimeout> | undefined;
    let cleanupSource: (() => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;

    // rrweb Replayer needs at least one event (typically a FullSnapshot, type 2)
    // to construct. We wait for the snapshot to arrive, then bootstrap and flush
    // everything else through addEvent.
    function maybeBootstrap(rrweb: typeof import('rrweb')) {
      if (cancelled || replayer) return;
      const hasSnapshot = pending.some((e) => e.type === 2);
      if (!hasSnapshot) return;
      const r = new rrweb.Replayer(pending, {
        root: hostEl,
        liveMode: true,
        showWarning: false,
        // Mouse tail is the trailing red line behind the cursor — distracting for our use.
        mouseTail: false,
        UNSAFE_replayCanvas: true,
        // Skip nothing — agents have plenty of "thinking" pauses we still want to render.
        skipInactive: false,
      });
      // startLive begins applying events as they arrive relative to wall-clock.
      r.startLive(pending[0]?.timestamp);
      // Bare Replayer doesn't render UI chrome; the replay iframe is now in `host`.
      replayer = r;
      console.log(`[testbuds/rrweb-client] Replayer bootstrapped with ${pending.length} events`);
      pending = [];
      if (bootstrapTimer) clearTimeout(bootstrapTimer);
      installFitToHost();
      setBootstrapped(true);
      onReadyRef.current?.();
    }

    // rrweb mounts a `.replayer-wrapper` sized to the recorded viewport. We
    // scale it with a CSS transform so it fills our host regardless of the
    // agent viewport (1280×720 desktop, 390×844 mobile, etc.).
    function installFitToHost() {
      const wrapper = hostEl.querySelector<HTMLElement>('.replayer-wrapper');
      if (!wrapper) return;
      wrapper.style.transformOrigin = '0 0';
      wrapper.style.position = 'absolute';
      wrapper.style.top = '0';
      wrapper.style.left = '0';
      const fit = () => {
        const wrapW = wrapper.offsetWidth || 1;
        const wrapH = wrapper.offsetHeight || 1;
        const scale = Math.min(hostEl.clientWidth / wrapW, hostEl.clientHeight / wrapH);
        wrapper.style.transform = `scale(${scale})`;
        const scaledW = wrapW * scale;
        const offsetX = Math.max(0, (hostEl.clientWidth - scaledW) / 2);
        wrapper.style.left = `${offsetX}px`;
      };
      fit();
      resizeObserver = new ResizeObserver(fit);
      resizeObserver.observe(hostEl);
      // The recorded page can also resize mid-run (responsive layouts) — observe
      // the wrapper too so we re-fit whenever the recorded viewport changes.
      resizeObserver.observe(wrapper);
    }

    (async () => {
      // Dynamic import — see comment above.
      const rrweb = await import('rrweb');
      if (cancelled) return;
      console.log('[testbuds/rrweb-client] opening SSE for run', runId);
      const source = new EventSource(`/api/runs/${runId}/events`);
      let receivedAny = false;

      bootstrapTimer = setTimeout(() => {
        if (replayer || cancelled) return;
        console.warn(`[testbuds/rrweb-client] bootstrap timeout after ${bootstrapTimeoutMs}ms (receivedAny=${receivedAny}, pending=${pending.length})`);
        setBootstrapFailed(true);
        onUnavailableRef.current?.();
      }, bootstrapTimeoutMs);

      source.onmessage = (m) => {
        if (!receivedAny) {
          receivedAny = true;
          console.log('[testbuds/rrweb-client] first SSE message arrived');
        }
        let parsed: { kind: 'event'; event: eventWithTime } | { kind: 'end' };
        try {
          parsed = JSON.parse(m.data);
        } catch {
          return;
        }
        if (parsed.kind === 'end') {
          console.log('[testbuds/rrweb-client] stream ended');
          // Freeze on the last frame: tear down the EventSource but leave the
          // replayer alone so its rendered DOM stays on screen.
          source.close();
          return;
        }
        if (replayer) {
          try { replayer.addEvent(parsed.event); } catch (err) {
            console.warn('[testbuds/rrweb-client] addEvent failed:', err);
          }
        } else {
          pending.push(parsed.event);
          maybeBootstrap(rrweb);
        }
      };

      source.onerror = () => {
        // EventSource auto-retries, so onerror fires on transient blips too.
        // Only mark unavailable if we never bootstrapped.
        if (!replayer && source.readyState === EventSource.CLOSED) {
          setBootstrapFailed(true);
          onUnavailableRef.current?.();
        }
      };

      // Stash for cleanup
      cleanupSource = () => source.close();
    })();

    return () => {
      cancelled = true;
      if (bootstrapTimer) clearTimeout(bootstrapTimer);
      cleanupSource?.();
      resizeObserver?.disconnect();
      try { replayer?.pause(); } catch { /* ignore */ }
      // rrweb mounts an iframe inside `host`; clear it so a remount starts fresh.
      while (hostEl.firstChild) hostEl.removeChild(hostEl.firstChild);
    };
    // Intentionally NOT including the callbacks in deps — they're read via ref
    // so callers can pass inline arrows without thrashing the SSE connection.
  }, [runId, bootstrapTimeoutMs]);

  if (bootstrapFailed) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-ink-4)',
          fontSize: 13,
          padding: 20,
          textAlign: 'center',
        }}
      >
        Replay stream unavailable. Falling back to the raw browser view.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={hostRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#fff',
          overflow: 'hidden',
          position: 'relative',
        }}
      />
      {!bootstrapped && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: 'var(--color-paper-deep)',
            color: 'var(--color-ink-3)',
            fontSize: 13,
            pointerEvents: 'none',
          }}
        >
          <span style={{ display: 'inline-flex', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-ink-4)', animation: 'bounce 1s infinite' }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-ink-4)', animation: 'bounce 1s infinite 0.15s' }} />
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-ink-4)', animation: 'bounce 1s infinite 0.3s' }} />
          </span>
          <span className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-ink-4)' }}>
            Connecting the bud
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-ink-4)' }}>
            The agent is starting its browser session…
          </span>
        </div>
      )}
    </div>
  );
}
