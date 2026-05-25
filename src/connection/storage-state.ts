import { createHash } from 'node:crypto';
import { join } from 'node:path';

export interface AuthIdentity {
  loginUrl: string;
  username: string;
}

/**
 * Compute the on-disk path for a per-identity Chromium user-data directory.
 *
 * Stagehand v3 in LOCAL mode persists cookies / localStorage / session via
 * Playwright's `userDataDir` mechanism (passed through
 * `localBrowserLaunchOptions.userDataDir`). Once a one-time login has populated
 * the directory, subsequent runs with the same path are already authenticated.
 *
 * NOTE: this helper is currently unused — credential entry UI is deferred. It
 * exists so the future credential flow has a stable, content-addressed path
 * already designed.
 */
export function userDataDirFor(identity: AuthIdentity, dataDir: string): string {
  const hash = createHash('sha256')
    .update(`${identity.loginUrl} ${identity.username}`)
    .digest('hex');
  return join(dataDir, 'auth', hash);
}
