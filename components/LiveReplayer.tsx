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

    const resizer = new ResizeObserver(() => {
      const iframe = host.querySelector('iframe');
      if (!iframe) return;
      const recordedWidth = iframe.offsetWidth || 1280;
      const scale = host.clientWidth / recordedWidth;
      iframe.style.transform = `scale(${scale})`;
      iframe.style.transformOrigin = 'top left';
      host.style.height = `${iframe.offsetHeight * scale}px`;
      decorateForeignFrames();
    });
    resizer.observe(host);

    const decorator = setInterval(decorateForeignFrames, 1500);

    return () => {
      ws.close();
      resizer.disconnect();
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
