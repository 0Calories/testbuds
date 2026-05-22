import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { reason, buildUserText } from './reason';
import type { Step } from './types';

const stepOutput = {
  bubble: 'Looking for pricing.',
  narration: 'I need the price first.',
  reaction: { emotion: 'curious', intensity: 0.3 },
  action: { kind: 'act', instruction: 'click Pricing' },
};

function fakeAnthropic(toolInput: unknown) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'tool_use', name: 'emit_step', input: toolInput }],
      }),
    },
  } as unknown as Anthropic;
}

describe('reason', () => {
  it('parses the model tool call into a StepOutput', async () => {
    const anthropic = fakeAnthropic(stepOutput);
    const result = await reason(
      {
        systemPrompt: 'You are a persona.',
        goal: 'Decide whether to buy.',
        history: [],
        observation: { url: 'https://x.com', elements: ['Pricing link'], screenshotBase64: 'abc' },
      },
      { anthropic },
    );
    expect(result.action.instruction).toBe('click Pricing');
    expect(result.reaction.emotion).toBe('curious');
  });

  it('throws when the model returns no tool call', async () => {
    const anthropic = {
      messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'hi' }] }) },
    } as unknown as Anthropic;
    await expect(
      reason(
        { systemPrompt: 's', goal: 'g', history: [], observation: { url: 'u', elements: [], screenshotBase64: '' } },
        { anthropic },
      ),
    ).rejects.toThrow();
  });

  it('throws when the tool input fails schema validation', async () => {
    const malformed = {
      bubble: 'b', narration: 'n',
      reaction: { emotion: 'angry', intensity: 0.5 },
      action: { kind: 'act', instruction: 'click' },
    };
    const anthropic = fakeAnthropic(malformed);
    await expect(
      reason(
        { systemPrompt: 's', goal: 'g', history: [], observation: { url: 'u', elements: [], screenshotBase64: '' } },
        { anthropic },
      ),
    ).rejects.toThrow();
  });
});

describe('buildUserText', () => {
  it('returns first-step notice when history is empty', () => {
    const text = buildUserText({
      goal: 'g', history: [],
      observation: { url: 'u', elements: [], screenshotBase64: '' },
    });
    expect(text).toContain('(This is your first step.)');
  });

  it('summarises prior steps including failures', () => {
    const history: Step[] = [
      {
        index: 0, url: 'https://x.com', bubble: 'b', narration: 'Tried the menu.',
        reaction: { emotion: 'neutral', intensity: 0.1 },
        action: { kind: 'act', instruction: 'open menu' }, actionResult: 'failed', actionError: 'no menu',
      },
    ];
    const text = buildUserText({
      goal: 'Buy it', history,
      observation: { url: 'https://x.com', elements: ['a button'], screenshotBase64: '' },
    });
    expect(text).toContain('Buy it');
    expect(text).toContain('Tried the menu.');
    expect(text).toContain('FAILED');
    expect(text).toContain('a button');
  });
});
