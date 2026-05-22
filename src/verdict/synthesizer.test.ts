import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { synthesizeVerdict } from './synthesizer';
import { getPersona } from '../persona/library';
import type { Step } from '../agent/types';

const steps: Step[] = [
  {
    index: 0, url: 'https://x.com', bubble: 'b', narration: 'No pricing visible.',
    reaction: { emotion: 'frustrated', intensity: 0.7 },
    action: { kind: 'finish', outcome: 'gave_up', reason: 'Could not find pricing.' },
    actionResult: 'n/a',
  },
];

const verdictInput = {
  decision: 'would_bail',
  confidence: 0.8,
  frictionList: [
    { title: 'Pricing not discoverable', stepIndex: 0, url: 'https://x.com', severity: 'high', evidenceQuote: 'No pricing visible.' },
  ],
  summary: 'I could not find pricing, so I left.',
  highlight: 'Gave up at step 0 when pricing was nowhere to be found.',
};

function fakeAnthropic(toolInput: unknown) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'tool_use', name: 'emit_verdict', input: toolInput }],
      }),
    },
  } as unknown as Anthropic;
}

describe('synthesizeVerdict', () => {
  it('parses the model tool call into a Verdict', async () => {
    const verdict = await synthesizeVerdict(
      { persona: getPersona('skeptical-bargain-hunter')!, goal: 'Decide whether to buy.', steps },
      { anthropic: fakeAnthropic(verdictInput) },
    );
    expect(verdict.decision).toBe('would_bail');
    expect(verdict.frictionList[0]!.severity).toBe('high');
  });

  it('throws when the model returns no tool call', async () => {
    const anthropic = {
      messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'hi' }] }) },
    } as unknown as Anthropic;
    await expect(
      synthesizeVerdict(
        { persona: getPersona('skeptical-bargain-hunter')!, goal: 'g', steps },
        { anthropic },
      ),
    ).rejects.toThrow();
  });

  it('throws when the tool input fails schema validation', async () => {
    const malformed = { decision: 'maybe', confidence: 0.5, frictionList: [], summary: 's', highlight: 'h' };
    await expect(
      synthesizeVerdict(
        { persona: getPersona('skeptical-bargain-hunter')!, goal: 'g', steps },
        { anthropic: fakeAnthropic(malformed) },
      ),
    ).rejects.toThrow();
  });
});
