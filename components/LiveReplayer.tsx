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

    // Apply scaling so the recorded viewport fits the host container.
    // Called from three sources: ResizeObserver (window/host resize), MutationObserver
    // (rrweb appends/replaces its iframe), and an iframe-level ResizeObserver once
    // the iframe exists (the iframe grows as the snapshot is hydrated).
    let scaledIframe: HTMLIFrameElement | null = null;
    const iframeResizer = new ResizeObserver(() => applyScale());

    const applyScale = () => {
      const iframe = host.querySelector('iframe');
      if (!iframe) return;
      if (iframe !== scaledIframe) {
        if (scaledIframe) iframeResizer.unobserve(scaledIframe);
        iframeResizer.observe(iframe);
        scaledIframe = iframe;
      }
      const recordedWidth = iframe.offsetWidth;
      if (recordedWidth <= 0) return; // iframe not yet hydrated; skip until it has size
      const scale = host.clientWidth / recordedWidth;
      iframe.style.transform = `scale(${scale})`;
      iframe.style.transformOrigin = 'top left';
      // Only set host height when the iframe has content — otherwise we collapse to 0.
      if (iframe.offsetHeight > 0) {
        host.style.height = `${iframe.offsetHeight * scale}px`;
      }
      decorateForeignFrames();
    };

    const hostResizer = new ResizeObserver(() => applyScale());
    hostResizer.observe(host);

    // rrweb appends its iframe lazily (after the first event arrives) — watch for it.
    const mutationObserver = new MutationObserver(() => applyScale());
    mutationObserver.observe(host, { childList: true, subtree: false });

    const decorator = setInterval(decorateForeignFrames, 1500);

    return () => {
      signal.aborted = true;
      conn.close();
      hostResizer.disconnect();
      iframeResizer.disconnect();
      mutationObserver.disconnect();
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
