import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { executeRun } from './runner';
import { getPersona } from '../persona/library';
import { FakeBrowserSession } from '../agent/fake-browser';

/** Fake Anthropic: returns a finish step for emit_step, a verdict for emit_verdict. */
function fakeAnthropic(): Anthropic {
  const create = vi.fn(async (params: { tools?: { name: string }[] }) => {
    const toolName = params.tools?.[0]?.name;
    if (toolName === 'emit_step') {
      return {
        content: [{
          type: 'tool_use', name: 'emit_step',
          input: {
            bubble: 'Done.', narration: 'Goal met.',
            reaction: { emotion: 'pleased', intensity: 0.9 },
            action: { kind: 'finish', outcome: 'completed', reason: 'Found what I needed.' },
          },
        }],
      };
    }
    return {
      content: [{
        type: 'tool_use', name: 'emit_verdict',
        input: {
          decision: 'would_investigate', confidence: 0.7, frictionList: [],
          summary: 'Promising.', highlight: 'Convinced on the landing page.',
        },
      }],
    };
  });
  return { messages: { create } } as unknown as Anthropic;
}

describe('executeRun', () => {
  it('runs auth, loop, and verdict, returning a RunResult', async () => {
    const browser = new FakeBrowserSession();
    const result = await executeRun(
      {
        persona: getPersona('time-poor-evaluator')!,
        connection: { mode: 'public' },
        targetUrl: 'https://product.example.com',
        goal: 'Decide whether this is worth a demo.',
      },
      { anthropic: fakeAnthropic(), createBrowser: async () => browser },
    );

    expect(browser.navigateCalls).toContain('https://product.example.com');
    expect(result.steps.length).toBe(1);
    expect(result.verdict.decision).toBe('would_investigate');
    expect(result.metadata.stepCount).toBe(1);
    expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
    expect(browser.closed).toBe(true);
  });

  it('closes the browser even if the loop throws', async () => {
    const browser = new FakeBrowserSession();
    const throwingAnthropic = {
      messages: { create: vi.fn().mockRejectedValue(new Error('LLM down')) },
    } as unknown as Anthropic;

    await expect(
      executeRun(
        {
          persona: getPersona('time-poor-evaluator')!,
          connection: { mode: 'public' },
          targetUrl: 'https://product.example.com',
          goal: 'g',
        },
        { anthropic: throwingAnthropic, createBrowser: async () => browser },
      ),
    ).rejects.toThrow();
    expect(browser.closed).toBe(true);
  });
});
