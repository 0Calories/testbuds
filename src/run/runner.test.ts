import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import type { Stagehand } from '@browserbasehq/stagehand';
import { executeRun, type ExecuteRunDeps } from './runner';
import { getPersona } from '../persona/library';

/**
 * The runner integrates Stagehand's agent — there is no clean DI seam to mock the
 * agent's internal LLM loop without re-engineering it. We unit-test the surrounding
 * wiring (auth -> navigate -> agent.execute -> step capture -> verdict synthesis)
 * with a tiny fake Stagehand that simulates a one-step run.
 */
function makeFakeStagehand() {
  const navigateCalls: string[] = [];
  const actCalls: string[] = [];
  const agentExecuteCalls: unknown[] = [];

  const fakePage = {
    url: () => 'https://product.example.com',
    goto: async (url: string) => {
      navigateCalls.push(url);
    },
  };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const fakeStagehand: any = {
    context: { activePage: () => fakePage },
    act: vi.fn(async (instruction: string) => {
      actCalls.push(instruction);
    }),
    agent: vi.fn((_config: unknown) => ({
      execute: async (options: any) => {
        agentExecuteCalls.push(options);
        // Simulate one step where the persona reacts and finishes in the same turn.
        await options.callbacks.onStepFinish({
          text: 'Took a quick look.',
          toolCalls: [
            {
              toolName: 'react',
              input: {
                bubble: 'Looks promising.',
                narration: 'Clean layout, pricing visible. Worth investigating further.',
                reaction: { emotion: 'pleased', intensity: 0.7 },
              },
            },
            {
              toolName: 'finish',
              input: { outcome: 'completed', reason: 'Decision reached.' },
            },
          ],
          toolResults: [],
        });
        return { success: true, message: 'done', actions: [], completed: true };
      },
    })),
    close: vi.fn(async () => {}),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return { stagehand: fakeStagehand as Stagehand, navigateCalls, actCalls, agentExecuteCalls };
}

function fakeAnthropic(): Anthropic {
  return {
    messages: {
      create: vi.fn(async () => ({
        content: [
          {
            type: 'tool_use',
            name: 'emit_verdict',
            input: {
              decision: 'would_investigate',
              confidence: 0.7,
              frictionList: [],
              summary: 'Promising.',
              highlight: 'Pricing was visible up front.',
            },
          },
        ],
      })),
    },
  } as unknown as Anthropic;
}

describe('executeRun', () => {
  it('runs auth + navigate + agent + verdict and returns a RunResult', async () => {
    const { stagehand, navigateCalls } = makeFakeStagehand();
    const deps: ExecuteRunDeps = {
      anthropic: fakeAnthropic(),
      createStagehand: async () => stagehand,
    };

    const result = await executeRun(
      {
        persona: getPersona('time-poor-evaluator')!,
        connection: { mode: 'public' },
        targetUrl: 'https://product.example.com',
        goal: 'Decide whether this looks worth a demo call.',
      },
      deps,
    );

    expect(navigateCalls).toContain('https://product.example.com');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.bubble).toBe('Looks promising.');
    expect(result.steps[0]!.reaction.emotion).toBe('pleased');
    expect(result.steps[0]!.action.kind).toBe('finish');
    expect(result.verdict.decision).toBe('would_investigate');
    expect(result.metadata.stepCount).toBe(1);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    expect((stagehand as any).close).toHaveBeenCalled();
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });

  it('closes Stagehand even if the agent throws', async () => {
    const { stagehand } = makeFakeStagehand();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    (stagehand as any).agent = vi.fn(() => ({
      execute: async () => {
        throw new Error('LLM down');
      },
    }));
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const deps: ExecuteRunDeps = {
      anthropic: fakeAnthropic(),
      createStagehand: async () => stagehand,
    };

    await expect(
      executeRun(
        {
          persona: getPersona('time-poor-evaluator')!,
          connection: { mode: 'public' },
          targetUrl: 'https://product.example.com',
          goal: 'g',
        },
        deps,
      ),
    ).rejects.toThrow('LLM down');
    /* eslint-disable @typescript-eslint/no-explicit-any */
    expect((stagehand as any).close).toHaveBeenCalled();
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });
});
