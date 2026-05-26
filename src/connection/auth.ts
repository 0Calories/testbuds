import type { Page } from 'playwright';
import type { Connection } from './types';

/**
 * Put the browser into an authenticated state before the agent loop starts.
 *
 * - `public`: no-op.
 * - `test-credential`: navigate to the login URL, fill email + password via
 *   Playwright `.fill()` (CDP keystroke events — never an LLM prompt),
 *   submit, and wait briefly for the post-login navigation.
 *
 * Failures are swallowed deliberately. The agent loop will start on whatever
 * page the browser ended up on, and the persona will react to it — a broken
 * login is friction data, not a crash.
 */
export async function establishAuth(page: Page, connection: Connection): Promise<void> {
  if (connection.mode === 'public') return;

  try {
    await page.goto(connection.loginUrl, { waitUntil: 'domcontentloaded' });

    const email = page.locator(
      'input[type="email"], input[autocomplete="username"], input[name*="email" i], input[name*="user" i]'
    ).first();
    const pwd = page.locator('input[type="password"]').first();
    // Stagehand v3's V3Page wrapper exposes `locator()` but not `getByRole()`,
    // so we stick to CSS-only selectors here. `button[type="submit"]` is the
    // load-bearing primary; the `:has-text(...)` variants are fallbacks for
    // forms that use a plain <button> without an explicit type attribute.
    const submit = page.locator(
      'button[type="submit"], input[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login"), button:has-text("Continue")'
    ).first();

    await email.fill(connection.username, { timeout: 5000 });
    await pwd.fill(connection.password, { timeout: 5000 });
    await submit.click({ timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      /* not all login redirects reach networkidle; agent loop tolerates this */
    });
  } catch (err) {
    // Do NOT include connection.password in the message. Defence-in-depth: the
    // structural guarantee is that the password is only passed to .fill(),
    // but if a regression ever logs the error object directly, prefer a static
    // string here so the leak surface is small.
    const code = err instanceof Error ? err.message.slice(0, 80) : 'unknown';
    console.warn(`[auth] sign-in interaction failed (${code}); persona will react to whatever loaded`);
  }
}
