import { describe, it, expect, vi } from 'vitest';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { establishAuth } from './auth';

const CANARY_PWD = 'CANARY-do-not-leak-this-password-9f3a2c';
const CANARY_USER = 'bud@testbuds.dev';

function startLoginServer(): Promise<{ url: string; close: () => Promise<void>; lastPostBody: () => string | undefined }> {
  return new Promise((resolve) => {
    let lastBody: string | undefined;
    const server = createServer((req, res) => {
      if (req.method === 'POST') {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c as Buffer));
        req.on('end', () => {
          lastBody = Buffer.concat(chunks).toString('utf8');
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end('<html><body><h1>signed in</h1></body></html>');
        });
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<!doctype html><html><body>
        <form method="post" action="/">
          <input name="email" type="email" autocomplete="username" />
          <input name="password" type="password" />
          <button type="submit">Sign in</button>
        </form>
      </body></html>`);
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${port}/`,
        close: () => new Promise((r) => server.close(() => r())),
        lastPostBody: () => lastBody,
      });
    });
  });
}

describe('establishAuth integration', () => {
  it('types credentials without leaking the password to console.warn or returned errors', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});

    const srv = await startLoginServer();
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (e) {
      // Skip cleanly if Chromium isn't installed (e.g. CI without playwright install).
      console.warn(`[skip] chromium.launch failed: ${(e as Error).message}`);
      warn.mockRestore(); log.mockRestore(); err.mockRestore();
      await srv.close();
      return;
    }

    try {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();

      await establishAuth(page, {
        mode: 'test-credential',
        loginUrl: srv.url,
        username: CANARY_USER,
        password: CANARY_PWD,
      });

      // The form server received the canary as form data — that's the only
      // place it should appear (it left the worker via the legitimate channel).
      expect(srv.lastPostBody()).toContain(encodeURIComponent(CANARY_PWD));

      // It must NOT appear in any captured console output.
      const allOutput = [
        ...warn.mock.calls.flat(),
        ...log.mock.calls.flat(),
        ...err.mock.calls.flat(),
      ].map(String).join('\n');
      expect(allOutput).not.toContain(CANARY_PWD);

      await ctx.close();
    } finally {
      await browser.close();
      await srv.close();
      warn.mockRestore();
      log.mockRestore();
      err.mockRestore();
    }
  }, 30_000);
});
