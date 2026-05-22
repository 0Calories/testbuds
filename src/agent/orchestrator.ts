import type { BrowserSession } from './browser';
import type { ReasonStepInput, Observation } from './reason';
import type { Step, StepOutput } from './types';

export type ReasonFn = (input: ReasonStepInput) => Promise<StepOutput>;

export interface RunLoopInput {
  goal: string;
  browser: BrowserSession;
  reasonFn: ReasonFn;
  maxSteps?: number;
  onStep?: (step: Step) => void;
}

function actionSignature(output: StepOutput): string {
  const a = output.action;
  return `${a.kind}:${a.instruction ?? a.url ?? ''}`;
}

/** True when the last three steps repeated the identical action. */
function isStuck(history: Step[]): boolean {
  if (history.length < 3) return false;
  const [a, b, c] = history.slice(-3).map(actionSignature);
  return a === b && b === c;
}

/**
 * Run the observe -> reason -> act loop until the agent finishes, the step cap is
 * reached, or the agent gets stuck repeating itself.
 */
export async function runLoop(input: RunLoopInput): Promise<Step[]> {
  const { goal, browser, reasonFn, maxSteps = 25, onStep } = input;
  const history: Step[] = [];

  for (let index = 0; index < maxSteps; index++) {
    const observation: Observation = {
      url: browser.currentUrl(),
      elements: await browser.observe(),
      screenshotBase64: await browser.screenshot(),
    };

    const output = await reasonFn({ goal, history, observation });

    let actionResult: Step['actionResult'] = 'n/a';
    let actionError: string | undefined;

    if (output.action.kind === 'act') {
      const result = await browser.act(output.action.instruction ?? '');
      actionResult = result.success ? 'ok' : 'failed';
      actionError = result.error;
    } else if (output.action.kind === 'navigate') {
      try {
        await browser.navigate(output.action.url ?? '');
        actionResult = 'ok';
      } catch (err) {
        actionResult = 'failed';
        actionError = err instanceof Error ? err.message : String(err);
      }
    }

    const step: Step = { index, url: observation.url, ...output, actionResult, actionError };
    history.push(step);
    onStep?.(step);

    if (output.action.kind === 'finish') break;
    if (isStuck(history)) break;
  }

  return history;
}
