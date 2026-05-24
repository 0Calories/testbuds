'use client';

import { useEffect, useRef } from 'react';
import { Replayer } from '@rrweb/replay';
import '@rrweb/replay/dist/style.css';

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
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (msg) => {
      try { replayer.addEvent(JSON.parse(msg.data as string)); } catch { /* ignore */ }
    };

    // Scale the rrweb iframe to fit the host container.
    const resizer = new ResizeObserver(() => {
      const iframe = host.querySelector('iframe');
      if (!iframe) return;
      const recordedWidth = iframe.offsetWidth || 1280;
      const scale = host.clientWidth / recordedWidth;
      iframe.style.transform = `scale(${scale})`;
      iframe.style.transformOrigin = 'top left';
      host.style.height = `${iframe.offsetHeight * scale}px`;
    });
    resizer.observe(host);

    return () => {
      ws.close();
      resizer.disconnect();
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
