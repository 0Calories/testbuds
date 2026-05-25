'use client';

import { useEffect, useRef } from 'react';
import { Replayer } from '@rrweb/replay';
import '@rrweb/replay/dist/style.css';

function connectWithBackoff(url: string, onMessage: (data: string) => void, signal: { aborted: boolean }): { close: () => void } {
  let ws: WebSocket | undefined;
  let delay = 250;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const open = () => {
    if (closed || signal.aborted) return;
    ws = new WebSocket(url);
    ws.onmessage = (m) => onMessage(m.data as string);
    ws.onopen = () => { delay = 250; };
    ws.onclose = () => {
      if (closed || signal.aborted) return;
      timer = setTimeout(open, delay);
      delay = Math.min(delay * 2, 4000);
    };
    ws.onerror = () => { ws?.close(); };
  };
  open();

  return {
    close: () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    },
  };
}

export interface LiveReplayerProps {
  runId: string;
  /** Override the default ws://localhost:5174 (for tests / dev). */
  wsBase?: string;
}

export function LiveReplayer({ runId, wsBase }: LiveReplayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const replayer = new Replayer([], {
      root: host,
      liveMode: true,
      mouseTail: false,
      showWarning: false,
      skipInactive: false,
    });
    replayer.startLive(Date.now() - 1000);

    const wsUrl = `${wsBase ?? process.env.NEXT_PUBLIC_WORKER_WS ?? 'ws://localhost:5174'}/runs/${runId}/live`;
    const signal = { aborted: false };
    const conn = connectWithBackoff(wsUrl, (data) => {
      try { replayer.addEvent(JSON.parse(data)); } catch { /* ignore */ }
    }, signal);

    // Scale the rrweb iframe to fit the host container.
    const findInnerDoc = (): Document | null => host.querySelector('iframe')?.contentDocument ?? null;

    const decorateForeignFrames = () => {
      const doc = findInnerDoc();
      if (!doc) return;
      const frames = doc.querySelectorAll('iframe');
      frames.forEach((f) => {
        // Cannot read cross-origin contentDocument; safe to assume blank.
        let blank = false;
        try {
          blank = !f.contentDocument || f.contentDocument.body.childElementCount === 0;
        } catch {
          blank = true;
        }
        if (!blank) return;
        if (f.dataset.testbudsBadged === '1') return;
        f.dataset.testbudsBadged = '1';
        const tag = doc.createElement('div');
        tag.textContent = '3rd-party widget (live view unavailable)';
        tag.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:repeating-linear-gradient(45deg,#f5f1e6,#f5f1e6 10px,#ece6d5 10px,#ece6d5 20px);color:#a39786;font:11px ui-monospace,monospace;pointer-events:none;';
        const wrap = doc.createElement('div');
        wrap.style.cssText = 'position:relative';
        f.parentNode?.insertBefore(wrap, f);
        wrap.appendChild(f);
        wrap.appendChild(tag);
      });
    };

    // Recorded viewport dimensions, supplied by rrweb's 'resize' event whenever
    // it processes a Meta event or a viewport-resize incremental snapshot.
    // These are authoritative — far more reliable than reading iframe.offsetWidth,
    // which transitions through display:none → sized as rrweb hydrates and was
    // the source of the live-view zoom-in bug.
    let recordedWidth = 0;
    let recordedHeight = 0;

    const applyScale = () => {
      if (!recordedWidth || !recordedHeight) return;
      const iframe = host.querySelector('iframe');
      if (!iframe) return;
      const scale = host.clientWidth / recordedWidth;
      iframe.style.transform = `scale(${scale})`;
      iframe.style.transformOrigin = 'top left';
      host.style.height = `${recordedHeight * scale}px`;
      decorateForeignFrames();
    };

    // Fires after rrweb's own handleResize has shown the iframe and set its
    // width/height attributes, so by the time we apply scale the iframe is sized.
    replayer.on('resize', (payload) => {
      const { width, height } = payload as { width: number; height: number };
      recordedWidth = width;
      recordedHeight = height;
      applyScale();
    });

    const hostResizer = new ResizeObserver(applyScale);
    hostResizer.observe(host);

    const decorator = setInterval(decorateForeignFrames, 1500);

    return () => {
      signal.aborted = true;
      conn.close();
      hostResizer.disconnect();
      clearInterval(decorator);
      replayer.destroy();
    };
  }, [runId, wsBase]);

  return (
    <div
      ref={hostRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        background: '#fff',
      }}
    />
  );
}
