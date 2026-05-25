import { Stagehand } from '@browserbasehq/stagehand';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

// Stagehand v3 looks at CHROME_PATH to locate the Chromium binary. Playwright's
// own bundled Chromium discovery (via PLAYWRIGHT_BROWSERS_PATH) gives us the
// right answer in any environment — local dev, the Playwright Docker image,
// or a manual `playwright install` cache. Set it once at module load.
if (!process.env.CHROME_PATH) {
  try {
    process.env.CHROME_PATH = chromium.executablePath();
  } catch {
    // Playwright couldn't resolve a path — leave CHROME_PATH unset and let
    // Stagehand surface its own error.
  }
}

const RRWEB_JS = readFileSync('src/worker/vendor/rrweb.min.js', 'utf8');

/**
 * Recorder boot script. Note the console-sentinel pattern: rrweb emits events
 * via `console.log('__RRWEB__' + JSON.stringify(event))`, which the host listens
 * for via page.on('console', ...). This is the workaround for V3Context not
 * having Playwright's exposeBinding API (discovered in the Phase 0 spike).
 */
const RRWEB_BOOT = `
  window.rrweb.record({
    emit: (event) => console.log('__RRWEB__' + JSON.stringify(event)),
    recordCanvas: false,
    recordCrossOriginIframes: true,
    collectFonts: true,
    inlineStylesheet: true,
    // Belt-and-suspenders: rrweb already masks <input type="password"> by
    // default, but we set this explicitly so the privacy guarantee lives in
    // our code rather than relying on the upstream default.
    maskInputOptions: { password: true },
    sampling: { mousemove: false, scroll: 100, input: 'last' },
  });
`;

const RRWEB_SENTINEL = '__RRWEB__';

// V3Context / V3Page are not part of Stagehand's public type exports; derive
// them from the runtime getters so we don't have to reach into internal paths.
// (The Phase 0 spike confirms the surface we use: addInitScript / activePage /
// on('console', ...).)
type V3Context = Stagehand['context'];
type V3Page = NonNullable<ReturnType<V3Context['activePage']>>;

export interface StagehandHostInput {
  emitRrweb: (event: unknown) => void;
  viewport: 'desktop' | 'mobile';
  /** Optional Chromium profile dir for storage-state-equivalent persistence (used by Task 13). */
  userDataDir?: string;
}

export interface StagehandHostHandle {
  stagehand: Stagehand;
  /** The V3Page wrapper — Stagehand-specific, not a Playwright Page. */
  page: V3Page;
  close: () => Promise<void>;
}

export async function launchStagehandHost(input: StagehandHostInput): Promise<StagehandHostHandle> {
  const viewport = input.viewport === 'mobile'
    ? { width: 390, height: 844 }
    : { width: 1280, height: 800 };

  const stagehand = new Stagehand({
    env: 'LOCAL',
    experimental: true,
    disableAPI: true,
    model: {
      modelName: 'anthropic/claude-sonnet-4-6',
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    localBrowserLaunchOptions: {
      headless: true,
      viewport,
      ...(input.userDataDir
        ? { userDataDir: input.userDataDir, preserveUserDataDir: true }
        : {}),
    },
  });
  await stagehand.init();

  const context = stagehand.context;
  if (!context) throw new Error('Stagehand context unavailable after init');

  // Inject rrweb bundle + recorder boot on every page navigation in every frame.
  await context.addInitScript({ content: RRWEB_JS });
  await context.addInitScript({ content: RRWEB_BOOT });

  const page = context.activePage();
  if (!page) throw new Error('No active page after Stagehand init');

  // Subscribe to console messages — rrweb events arrive sentinel-tagged.
  // Note: this is per-page. New pages opened mid-run (e.g., popups) will run
  // the recorder via addInitScript but their events won't reach us until we
  // attach another listener. Known limitation for v1; document in CLAUDE.md later.
  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.startsWith(RRWEB_SENTINEL)) return;
    try {
      const event = JSON.parse(text.slice(RRWEB_SENTINEL.length));
      input.emitRrweb(event);
    } catch {
      // Malformed event — ignore.
    }
  });

  return {
    stagehand,
    page,
    close: async () => {
      try { await stagehand.close(); } catch { /* swallow */ }
    },
  };
}
