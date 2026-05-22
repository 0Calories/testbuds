import type { BrowserSession } from '../agent/browser';
import type { Connection } from './types';

/**
 * Put the browser into an authenticated state before the run loop starts.
 * - public: nothing to do.
 * - test-credential: drive the login form with the supplied credentials.
 */
export async function establishAuth(browser: BrowserSession, connection: Connection): Promise<void> {
  if (connection.mode === 'public') return;

  await browser.navigate(connection.loginUrl);
  await browser.act(`type "${connection.username}" into the email or username field`);
  await browser.act(`type "${connection.password}" into the password field`);
  await browser.act('click the log in or sign in button');
}
