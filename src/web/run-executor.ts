import Anthropic from '@anthropic-ai/sdk';
import { Stagehand } from '@browserbasehq/stagehand';
import type { Persona } from '../persona/types';
import type { Connection } from '../connection/types';
import { executeRun } from '../run/runner';
import { getLiveViewUrl } from './live-view';
import {
  createRun,
  setLiveViewUrl,
  appendStep,
  completeRun,
  failRun,
  type ViewportMode,
} from './run-store';

/** Build a fresh Stagehand session for one run. */
async function createStagehand(): Promise<Stagehand> {
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    // Required to enable agent custom tools + callbacks + abort signal.
    experimental: true,
    disableAPI: true,
    model: {
      modelName: 'anthropic/claude-sonnet-4-6',
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
  });
  await stagehand.init();
  return stagehand;
}

export interface StartRunInput {
  persona: Persona;
  connection: Connection;
  targetUrl: string;
  goal: string;
  viewport?: ViewportMode;
}

/**
 * Create a run record and execute the run in the background. Returns the run id
 * immediately; progress is written into the run store as it happens.
 */
export function startRun(input: StartRunInput): string {
  const record = createRun({
    persona: input.persona,
    targetUrl: input.targetUrl,
    goal: input.goal,
    viewport: input.viewport,
  });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  void executeRun(
    {
      persona: input.persona,
      connection: input.connection,
      targetUrl: input.targetUrl,
      goal: input.goal,
      viewport: input.viewport,
      onBrowserReady: async ({ sessionId }) => {
        if (!sessionId) return;
        const url = await getLiveViewUrl(sessionId);
        if (url) setLiveViewUrl(record.id, url);
      },
      onStep: (step) => appendStep(record.id, step),
    },
    { anthropic, createStagehand },
  )
    .then((result) => completeRun(record.id, result.verdict))
    .catch((err) => failRun(record.id, err instanceof Error ? err.message : String(err)));

  return record.id;
}
