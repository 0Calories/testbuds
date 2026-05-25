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
  headline: "I'd walk — pricing was nowhere to be found.",
  summary: 'I could not find pricing, so I left.',
  highlight: 'Gave up at step 0 when pricing was nowhere to be found.',
  theOneThing:
    "Skeptical bargain-hunters bail in the first 90 seconds because they can't see a number on the page — fix that and you'll keep the cheapest segment of qualified traffic.",
  frictionList: [
    {
      title: 'Surface pricing above the fold',
      stepIndex: 0,
      url: 'https://x.com',
      severity: 'high',
      evidenceQuote: 'No pricing visible.',
      actionVerb: 'Show',
      recommendations: [
        "Add a 'from $X/mo' line under the hero subhead",
        "Put a 'Pricing' link in the top nav",
      ],
      impact: 'high',
      effort: 'small',
      owner: 'Marketing',
    },
  ],
  wins: [
    { title: 'Clear value prop', description: 'I understood what it does within seconds.' },
  ],
  partingNote:
    "Honest read: the hero looked great, but I couldn't find a number anywhere. Put a price on the page or you'll keep losing buyers like me before they ever ask a question.",
  pagesExplored: 1,
  pagesEstimatedTotal: 6,
  nextPersonaSuggestion: {
    slug: 'roi-driven-buyer',
    reason: 'They will hit the same pricing wall and tell you what it costs you in finance terms.',
  },
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
    expect(verdict.frictionList[0]!.actionVerb).toBe('Show');
    expect(verdict.frictionList[0]!.recommendations).toHaveLength(2);
    expect(verdict.wins[0]!.title).toBe('Clear value prop');
    expect(verdict.nextPersonaSuggestion.slug).toBe('roi-driven-buyer');
    expect(verdict.pagesExplored).toBe(1);
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
