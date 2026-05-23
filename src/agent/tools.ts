import { tool } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { ReactionSchema } from './types';

/** Input schema for the persona's per-step `react` tool. */
export const REACT_TOOL_INPUT = z.object({
  bubble: z.string().min(1),
  narration: z.string().min(1),
  reaction: ReactionSchema,
});
export type ReactToolInput = z.infer<typeof REACT_TOOL_INPUT>;

/** Input schema for the persona's `finish` tool. */
export const FINISH_TOOL_INPUT = z.object({
  outcome: z.enum(['completed', 'gave_up']),
  reason: z.string().min(1),
});
export type FinishToolInput = z.infer<typeof FINISH_TOOL_INPUT>;

/**
 * Tool the persona MUST call at the start of every step.
 * Captures the in-character thinking that drives the avatar, narration feed, and verdict.
 */
export function makeReactTool(onReact: (input: ReactToolInput) => void) {
  return tool({
    description:
      'REQUIRED: at the START of every step, BEFORE any browser tool call, call this to share your in-character thoughts (bubble + narration) and current mood (emotion + intensity). Skipping this drops your thought from the demo.',
    inputSchema: REACT_TOOL_INPUT,
    execute: async (input) => {
      onReact(input as ReactToolInput);
      return { acknowledged: true };
    },
  });
}

/**
 * Tool the persona calls to end the run in character — either with a verdict or a give-up.
 * Triggers the AbortController wired up in the runner so the agent loop stops cleanly.
 */
export function makeFinishTool(onFinish: (input: FinishToolInput) => void) {
  return tool({
    description:
      'Call this when you have reached a clear yes/no decision OR your patience runs out. This ends the run. After calling this, do NOT continue exploring.',
    inputSchema: FINISH_TOOL_INPUT,
    execute: async (input) => {
      onFinish(input as FinishToolInput);
      return { stopped: true };
    },
  });
}
