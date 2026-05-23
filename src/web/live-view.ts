import Browserbase from '@browserbasehq/sdk';

/**
 * Fetch the embeddable Live View URL for a Browserbase session so the UI can
 * show the agent's browser live in an iframe. Returns undefined if unresolved.
 */
export async function getLiveViewUrl(sessionId: string): Promise<string | undefined> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) return undefined;
  try {
    const bb = new Browserbase({ apiKey });
    const debug = await bb.sessions.debug(sessionId);
    return debug.debuggerFullscreenUrl;
  } catch {
    return undefined;
  }
}
