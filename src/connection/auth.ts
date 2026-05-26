import type { Page } from 'playwright';
import type { Connection } from './types';

/**
 * Put the browser into an authenticated state before the agent loop starts.
 *
 * - `public`: no-op, returns `false` (nothing was attempted).
 * - `test-credential`: navigate to the login URL, fill email + password via
 *   Playwright `.fill()` (CDP keystroke events — never an LLM prompt),
 *   submit, and wait briefly for the post-login navigation.
 *
 * Returns `true` only if the sign-in flow completed AND the browser left the
 * login page (URL no longer starts with loginUrl). Returns `false` on any
 * interaction failure (selector miss, timeout) OR if the URL didn't change
 * (credentials rejected with an inline error, submit handler swallowed the
 * click, etc). The caller uses this signal to decide whether to navigate
 * away from the post-login destination.
 *
 * Failures are swallowed deliberately. The agent loop will start on whatever
 * page the browser ended up on, and the persona will react to it — a broken
 * login is friction data, not a crash.
 */
export async function establishAuth(page: Page, connection: Connection): Promise<boolean> {
  if (connection.mode === 'public') return false;

  try {
    await page.goto(connection.loginUrl, { waitUntil: 'domcontentloaded' });

    const email = page.locator(
      'input[type="email"], input[autocomplete="username"], input[name*="email" i], input[name*="user" i]'
    ).first();
    const pwd = page.locator('input[type="password"]').first();
    const submit = page.getByRole('button', { name: /sign in|log in|login|continue/i }).first();

    await email.fill(connection.username, { timeout: 5000 });
    await pwd.fill(connection.password, { timeout: 5000 });
    await submit.click({ timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      /* not all login redirects reach networkidle; agent loop tolerates this */
    });

    // Heuristic success check: if the URL still starts with loginUrl, the
    // form didn't navigate away — either credentials were rejected with an
    // inline error or the submit handler didn't fire. Treat as failure so
    // the runner falls back to navigating targetUrl.
    if (page.url().startsWith(connection.loginUrl)) {
      console.warn('[auth] still on login URL after submit — sign-in did not complete');
      return false;
    }
    return true;
  } catch (err) {
    // Do NOT include connection.password in the message. Defence-in-depth: the
    // structural guarantee is that the password is only passed to .fill(),
    // but if a regression ever logs the error object directly, prefer a static
    // string here so the leak surface is small.
    const code = err instanceof Error ? err.message.slice(0, 80) : 'unknown';
    console.warn(`[auth] sign-in interaction failed (${code}); persona will react to whatever loaded`);
    return false;
  }
}
