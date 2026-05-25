import { Stagehand } from '@browserbasehq/stagehand';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
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

interface ChromiumHandle {
  cdpUrl: string;
  kill: () => void;
}

/**
 * Spawn Chromium as a child process with a fixed CDP debugging port and
 * resolve once `/json/version` on that port answers (Chromium is up and CDP
 * is reachable). The fixed-port + HTTP-probe approach is the most robust
 * across headless modes — file-based discovery (DevToolsActivePort) was
 * unreliable when spawned from Node in our Fly container.
 */
function spawnChromiumForCDP(viewport: { width: number; height: number }): Promise<ChromiumHandle> {
  const chromePath = process.env.CHROME_PATH;
  if (!chromePath) throw new Error('CHROME_PATH is not set');

  const userDataDir = mkdtempSync(join(tmpdir(), 'testbuds-chrome-'));
  // Random port in an unprivileged range to avoid collisions if multiple
  // runs happen to overlap (worker scale > 1 isn't supported today, but cheap).
  const port = 9333 + Math.floor(Math.random() * 600);

  const proc: ChildProcess = spawn(
    chromePath,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      // Chromium's --headless=new default window is ~800×600, which rrweb
      // captures into the Meta event before Stagehand's per-context viewport
      // setting takes effect. Pin the OS window to the requested viewport so
      // the recording dimensions match what the live view expects.
      `--window-size=${viewport.width},${viewport.height}`,
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  // Capture stderr (last 1KB) only as a diagnostic for the timeout error path.
  // Don't echo it line-by-line — chrome is extremely chatty.
  let stderr = '';
  proc.stderr?.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-2000);
  });

  return new Promise<ChromiumHandle>((resolve, reject) => {
    let resolved = false;
    let earlyExitCode: number | null = null;

    proc.on('exit', (code) => { earlyExitCode = code ?? -1; });
    proc.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      reject(err);
    });

    const start = Date.now();
    const poll = async () => {
      if (resolved) return;
      if (earlyExitCode !== null) {
        resolved = true;
        reject(new Error(`Chromium exited prematurely (code ${earlyExitCode}). stderr tail:\n${stderr.slice(-1000)}`));
        return;
      }
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
          signal: AbortSignal.timeout(500),
        });
        if (res.ok) {
          const data = (await res.json()) as { webSocketDebuggerUrl?: string };
          if (data.webSocketDebuggerUrl) {
            resolved = true;
            resolve({
              cdpUrl: data.webSocketDebuggerUrl,
              kill: () => { try { proc.kill('SIGKILL'); } catch { /* swallow */ } },
            });
            return;
          }
        }
      } catch { /* CDP not ready yet — try again */ }

      if (Date.now() - start > 45000) {
        resolved = true;
        try { proc.kill('SIGKILL'); } catch { /* swallow */ }
        reject(new Error(`Chromium CDP at :${port} not reachable within 45s. stderr tail:\n${stderr.slice(-1000)}`));
        return;
      }
      setTimeout(poll, 200);
    };
    poll();
  });
}

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

  // Spawn Chromium ourselves so we control every flag. Stagehand v3's internal
  // LOCAL launcher kept crashing in our Fly container with ECONNREFUSED on its
  // CDP port even with chromiumSandbox=false + args set — the cdpUrl path
  // (documented in the Phase 0 spike) sidesteps Stagehand's launcher entirely.
  const chrome = await spawnChromiumForCDP(viewport);
  const cdpUrl = chrome.cdpUrl;

  const stagehand = new Stagehand({
    env: 'LOCAL',
    experimental: true,
    disableAPI: true,
    model: {
      modelName: 'anthropic/claude-sonnet-4-6',
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    localBrowserLaunchOptions: {
      // Attach to the already-launched Chromium via CDP instead of spawning one.
      cdpUrl,
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
      chrome.kill();
    },
  };
}
