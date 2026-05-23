import type { Stagehand } from '@browserbasehq/stagehand';
import type { Connection } from './types';

/**
 * Minimal interface needed to drive a login form during connection auth.
 * Stagehand instances satisfy this via `makeAuthDriver`; tests can supply a mock.
 */
export interface AuthDriver {
  navigateTo(url: string): Promise<void>;
  act(instruction: string): Promise<unknown>;
}

/** Adapter from a Stagehand instance to the AuthDriver interface. */
export function makeAuthDriver(stagehand: Stagehand): AuthDriver {
  return {
    async navigateTo(url) {
      const page = stagehand.context?.activePage();
      if (!page) throw new Error('No active page');
      await page.goto(url);
    },
    async act(instruction) {
      return stagehand.act(instruction);
    },
  };
}

/**
 * Put the browser into an authenticated state before the agent runs.
 * - public: nothing to do.
 * - test-credential: drive the login form with the supplied credentials.
 */
export async function establishAuth(
  driver: AuthDriver,
  connection: Connection,
): Promise<void> {
  if (connection.mode === 'public') return;

  await driver.navigateTo(connection.loginUrl);
  await driver.act(`type "${connection.username}" into the email or username field`);
  await driver.act(`type "${connection.password}" into the password field`);
  await driver.act('click the log in or sign in button');
}
