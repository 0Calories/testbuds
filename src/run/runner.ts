import type Anthropic from '@anthropic-ai/sdk';
import type { Persona } from '../persona/types';
import { compilePersona } from '../persona/compiler';
import type { BrowserSession } from '../agent/browser';
import { runLoop, type ReasonFn } from '../agent/orchestrator';
import { reason } from '../agent/reason';
import type { Step } from '../agent/types';
import type { Connection } from '../connection/types';
import { establishAuth } from '../connection/auth';
import { synthesizeVerdict } from '../verdict/synthesizer';
import type { Verdict } from '../verdict/types';

export interface ExecuteRunInput {
  persona: Persona;
  connection: Connection;
  targetUrl: string;
  goal: string;
  maxSteps?: number;
  onStep?: (step: Step) => void;
}

export interface ExecuteRunDeps {
  anthropic: Anthropic;
  createBrowser: () => Promise<BrowserSession>;
}

export interface RunResult {
  steps: Step[];
  verdict: Verdict;
  metadata: { durationMs: number; stepCount: number };
}

/** Execute one full synthetic-customer run: auth -> agent loop -> verdict. */
export async function executeRun(input: ExecuteRunInput, deps: ExecuteRunDeps): Promise<RunResult> {
  const startedAt = Date.now();
  const browser = await deps.createBrowser();

  try {
    await establishAuth(browser, input.connection);
    await browser.navigate(input.targetUrl);

    const systemPrompt = compilePersona(input.persona);
    const reasonFn: ReasonFn = (stepInput) =>
      reason({ ...stepInput, systemPrompt }, { anthropic: deps.anthropic });

    const steps = await runLoop({
      goal: input.goal,
      browser,
      reasonFn,
      maxSteps: input.maxSteps,
      onStep: input.onStep,
    });

    const verdict = await synthesizeVerdict(
      { persona: input.persona, goal: input.goal, steps },
      { anthropic: deps.anthropic },
    );

    return {
      steps,
      verdict,
      metadata: { durationMs: Date.now() - startedAt, stepCount: steps.length },
    };
  } finally {
    await browser.close();
  }
}
