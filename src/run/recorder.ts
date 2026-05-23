import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Stagehand } from '@browserbasehq/stagehand';
import type { eventWithTime } from '@rrweb/types';

const require_ = createRequire(import.meta.url);

const BINDING_NAME = '__testbudsRrwebEmit';

/**
 * Read the rrweb recorder bundle once, lazily. Injected verbatim into each
 * Playwright page via `addInitScript` so it runs before any page JS on every
 * navigation. The v2-alpha bundle exposes the recorder as `window.rrwebRecord`.
 */
let bundleCache: string | undefined;
function getRecorderBundle(): string {
  if (bundleCache) return bundleCache;
  const path = require_.resolve('rrweb/dist/record/rrweb-record.min.js');
  bundleCache = readFileSync(path, 'utf8');
  return bundleCache;
}

/**
 * The page-side init script. The recorder JSON-stringifies events and passes
 * them to a CDP `Runtime.addBinding` function, which surfaces them on the
 * Node-side CDP session as `Runtime.bindingCalled` events. The binding takes a
 * single string argument — that's a CDP constraint, hence the stringify dance.
 */
function buildInitScript(): string {
  return `
${getRecorderBundle()}
(function () {
  if (window.__testbudsRrwebStarted) return;
  window.__testbudsRrwebStarted = true;
  function start() {
    var emit = window['${BINDING_NAME}'];
    if (typeof emit !== 'function') {
      // Binding not installed yet on this session — try again on next tick.
      setTimeout(start, 30);
      return;
    }
    try {
      window.rrwebRecord({
        emit: function (e) {
          try { emit(JSON.stringify(e)); } catch (_) { /* host gone */ }
        },
        recordCanvas: true,
        collectFonts: true,
        checkoutEveryNms: 30000,
      });
    } catch (err) {
      // Recorder failed (CSP, exotic page, etc.) — swallow so we don't break the agent.
      // The viewer side will fall back to the Browserbase live view.
      console.warn('[testbuds] rrweb record() failed:', err && err.message);
    }
  }
  start();
})();
`;
}

/** Minimal shape we need from Stagehand v3's Page — typed loosely to avoid coupling to internals. */
interface CdpPageLike {
  mainFrameId: () => string;
  getSessionForFrame: (frameId: string) => CdpSessionLike;
  addInitScript: (script: { content: string }) => Promise<void>;
}
interface CdpSessionLike {
  send: <R = unknown>(method: string, params?: object) => Promise<R>;
  on: <P = unknown>(event: string, handler: (params: P) => void) => void;
}

export interface RecorderHandle {
  dispose: () => Promise<void>;
}

/**
 * Install the rrweb recorder on the Stagehand session's active page. Survives
 * in-page navigation (the addInitScript fires on every load + the Runtime
 * binding lives on the CDP session for the lifetime of the page target).
 *
 * Hackathon scope: covers the active top-level page only. New tabs opened by
 * the agent mid-run won't stream — they'd need a per-page binding install via
 * `context.on('page')`, which isn't surfaced on V3Context yet. Acceptable
 * because Stagehand typically drives the same tab end-to-end.
 */
export async function installRecorder(
  stagehand: Stagehand,
  onEvent: (event: eventWithTime) => void,
): Promise<RecorderHandle> {
  const page = stagehand.context?.activePage() as unknown as CdpPageLike | undefined;
  if (!page) throw new Error('installRecorder: no active page');

  const session = page.getSessionForFrame(page.mainFrameId());

  // 1. Enable the Runtime domain (probably already on, but cheap to ensure).
  await session.send('Runtime.enable');

  // 2. Install the page-side function. After this, the page can call
  // `window.__testbudsRrwebEmit(str)` and we'll receive Runtime.bindingCalled.
  await session.send('Runtime.addBinding', { name: BINDING_NAME });

  // 3. Subscribe to binding calls and route them to onEvent. Other bindings (or
  // other consumers using the same session) get ignored by the name filter.
  session.on<{ name: string; payload: string }>('Runtime.bindingCalled', (p) => {
    if (p?.name !== BINDING_NAME) return;
    let parsed: eventWithTime;
    try { parsed = JSON.parse(p.payload) as eventWithTime; } catch { return; }
    try { onEvent(parsed); } catch (_) { /* never let consumer error bubble back */ }
  });

  // 4. Inject the recorder for every page load. addInitScript persists across
  // navigations, so the recorder reappears after every goto/click that
  // triggers a navigation.
  await page.addInitScript({ content: buildInitScript() });

  // 5. The init script we just added applies to FUTURE loads. The page may
  // already be at about:blank (pre-goto) — that's fine, the next page.goto()
  // will trigger the init script. If the page is somehow already on a real URL,
  // we manually evaluate the script once so we don't miss the current document.
  try {
    await session.send('Runtime.evaluate', {
      expression: buildInitScript(),
      awaitPromise: false,
      returnByValue: false,
    });
  } catch {
    // Best-effort — if this fails the next navigation still installs.
  }

  return {
    dispose: async () => {
      // Stagehand.close() detaches the session, which implicitly removes the
      // binding and stops the recorder. Nothing else to clean up.
    },
  };
}
