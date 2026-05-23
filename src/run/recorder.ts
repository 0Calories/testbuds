import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Stagehand } from '@browserbasehq/stagehand';
import type { eventWithTime } from '@rrweb/types';

const require_ = createRequire(import.meta.url);
const log = (...args: unknown[]) => console.log('[testbuds/recorder]', ...args);

const BINDING_NAME = '__testbudsRrwebEmit';

/**
 * Read the rrweb recorder bundle once, lazily. Injected into every new
 * document via CDP `Page.addScriptToEvaluateOnNewDocument` (main world, so
 * the binding installed by `Runtime.addBinding` is on the same `window`).
 */
let bundleCache: string | undefined;
function getRecorderBundle(): string {
  if (bundleCache) return bundleCache;
  const path = require_.resolve('rrweb/dist/record/rrweb-record.min.js');
  bundleCache = readFileSync(path, 'utf8');
  return bundleCache;
}

/**
 * The page-side init script. Recorder JSON-stringifies events and passes them
 * to the binding (CDP bindings only accept string args), which fires
 * `Runtime.bindingCalled` on the Node-side session.
 */
function buildInitScript(): string {
  return `
${getRecorderBundle()}
(function () {
  if (window.__testbudsRrwebStarted) return;
  window.__testbudsRrwebStarted = true;
  console.log('[testbuds] init script running, binding present=' + (typeof window['${BINDING_NAME}'] === 'function'));
  function start() {
    var emit = window['${BINDING_NAME}'];
    if (typeof emit !== 'function') {
      setTimeout(start, 30);
      return;
    }
    try {
      window.rrwebRecord({
        emit: function (e) {
          try { emit(JSON.stringify(e)); } catch (err) { console.warn('[testbuds] emit failed:', err && err.message); }
        },
        recordCanvas: true,
        collectFonts: true,
        checkoutEveryNms: 30000,
      });
      console.log('[testbuds] rrweb.record() started');
    } catch (err) {
      console.warn('[testbuds] rrweb record() threw:', err && err.message);
    }
  }
  start();
})();
`;
}

/** Loose shape we read from Stagehand v3's Page — typed loosely so we don't depend on private internals. */
interface CdpPageLike {
  mainFrameId: () => string;
  getSessionForFrame: (frameId: string) => CdpSessionLike;
}
interface CdpSessionLike {
  send: <R = unknown>(method: string, params?: object) => Promise<R>;
  on: <P = unknown>(event: string, handler: (params: P) => void) => void;
}

export interface RecorderHandle {
  dispose: () => Promise<void>;
}

/**
 * Install the rrweb recorder via CDP directly (skipping Stagehand's
 * addInitScript wrapper, which doesn't surface the world parameter we need).
 *
 * Sequence:
 *   1. Runtime.enable + Page.enable
 *   2. Subscribe to Runtime.bindingCalled (BEFORE the binding can fire)
 *   3. Subscribe to Runtime.consoleAPICalled so page console.log lands in our server logs
 *   4. Runtime.addBinding (visible in ALL execution contexts — main + isolated)
 *   5. Page.addScriptToEvaluateOnNewDocument (main world; runs on every navigation)
 *   6. Runtime.evaluate the same script once, in case the page already has a document
 */
export async function installRecorder(
  stagehand: Stagehand,
  onEvent: (event: eventWithTime) => void,
): Promise<RecorderHandle> {
  log('install starting');
  const page = stagehand.context?.activePage() as unknown as CdpPageLike | undefined;
  if (!page) throw new Error('installRecorder: no active page');

  const frameId = page.mainFrameId();
  log('main frame id:', frameId);
  const session = page.getSessionForFrame(frameId);

  // 1. Enable the domains we depend on.
  await session.send('Runtime.enable');
  await session.send('Page.enable');
  log('Runtime.enable + Page.enable done');

  // 2. Subscribe FIRST so we don't miss any binding calls.
  let eventCount = 0;
  session.on<{ name?: string; payload?: string; executionContextId?: number }>('Runtime.bindingCalled', (p) => {
    if (p?.name !== BINDING_NAME || typeof p.payload !== 'string') return;
    eventCount++;
    if (eventCount === 1 || eventCount === 10 || eventCount % 100 === 0) {
      log(`event #${eventCount} (executionContextId=${p.executionContextId})`);
    }
    let parsed: eventWithTime;
    try { parsed = JSON.parse(p.payload) as eventWithTime; } catch (err) {
      log('JSON.parse of payload failed:', err);
      return;
    }
    try { onEvent(parsed); } catch (_) { /* never let consumer error bubble back */ }
  });

  // 3. Forward page console messages so we can see whether the init script runs.
  session.on<{ type?: string; args?: Array<{ value?: unknown }> }>('Runtime.consoleAPICalled', (p) => {
    const text = (p?.args ?? [])
      .map((a) => (typeof a?.value === 'string' ? a.value : JSON.stringify(a?.value)))
      .join(' ');
    if (text.includes('[testbuds]')) {
      log(`(page console.${p?.type ?? 'log'})`, text);
    }
  });
  log('listeners attached');

  // 4. Install the binding. With no executionContextName specified, the function
  //    is exposed in every execution context (main world + every isolated world).
  await session.send('Runtime.addBinding', { name: BINDING_NAME });
  log('Runtime.addBinding done');

  // 5. Register init script for every future document. worldName undefined ==
  //    main world; the script and binding live on the same `window`.
  const script = buildInitScript();
  const { identifier } = await session.send<{ identifier: string }>(
    'Page.addScriptToEvaluateOnNewDocument',
    { source: script, runImmediately: false },
  );
  log('addScriptToEvaluateOnNewDocument registered, id:', identifier);

  // 6. Best-effort one-shot evaluate for the current document. If the page is
  //    at about:blank with no real context this is a no-op.
  try {
    await session.send('Runtime.evaluate', {
      expression: script,
      awaitPromise: false,
      returnByValue: false,
    });
    log('one-shot evaluate done');
  } catch (err) {
    log('one-shot evaluate failed (expected if at about:blank):', (err as Error)?.message);
  }

  return {
    dispose: async () => {
      // Stagehand.close() tears down the session; no per-session cleanup needed.
    },
  };
}
