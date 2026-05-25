import type Anthropic from '@anthropic-ai/sdk';
import type { Persona } from '../persona/types';
import type { Step } from '../agent/types';
import { personaLibrary } from '../persona/library';
import { VerdictSchema, type Verdict } from './types';

export interface SynthesizeVerdictInput {
  persona: Persona;
  goal: string;
  steps: Step[];
}

export interface SynthesizeVerdictDeps {
  anthropic: Anthropic;
  model?: string;
}

const EMIT_VERDICT_TOOL = {
  name: 'emit_verdict',
  description:
    'Report the customer verdict, friction list, wins, and the actionable wrap-up the team can act on tomorrow morning.',
  input_schema: {
    type: 'object' as const,
    properties: {
      decision: { type: 'string', enum: ['would_buy', 'would_investigate', 'would_bail'] },
      confidence: { type: 'number', description: 'Confidence in the decision, from 0 to 1.' },
      headline: {
        type: 'string',
        description:
          "A single first-person sentence in the persona's voice that captures the wrap-up. e.g. \"I'd take the demo — but I'd fix three things first.\" Keep it under 110 characters.",
      },
      summary: { type: 'string', description: "A short summary in the persona's own voice." },
      highlight: { type: 'string', description: 'The single decisive moment the persona converted or bailed.' },
      theOneThing: {
        type: 'string',
        description:
          'The one insight, written as a business case sentence: the WHO, the WHY, and the COMMERCIAL CONSEQUENCE of fixing it. Should read like the opening of an executive memo.',
      },
      frictionList: {
        type: 'array',
        description:
          'Friction points, ordered most to least valuable to fix (impact ÷ effort, not raw severity). Each item is a fully scoped action the team can ship.',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Concise action title — what should ship, not what is broken. e.g. "Surface the Team plan price above the fold".',
            },
            stepIndex: { type: 'number', description: 'The step index where the friction occurred.' },
            url: { type: 'string', description: 'The page URL where it occurred.' },
            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
            evidenceQuote: {
              type: 'string',
              description:
                "A direct, in-character quote from the persona's narration explaining why this is friction. Should be 1–2 sentences and read like the persona is speaking.",
            },
            actionVerb: {
              type: 'string',
              description:
                'Single imperative verb to label the change ("Show", "Replace", "Add", "Trim", "Move", "Reframe", "Fix"). Max 12 chars.',
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Two concrete bullet recommendations the team could ship. Each one should be specific enough to put in a Linear ticket.',
            },
            impact: { type: 'string', enum: ['high', 'medium', 'low'] },
            effort: { type: 'string', enum: ['small', 'medium', 'large'] },
            owner: {
              type: 'string',
              description:
                'Team or role best placed to own this change (e.g. "Marketing", "Pricing", "Customer marketing", "Web", "Eng").',
            },
          },
          required: [
            'title', 'stepIndex', 'url', 'severity', 'evidenceQuote',
            'actionVerb', 'recommendations', 'impact', 'effort', 'owner',
          ],
        },
      },
      wins: {
        type: 'array',
        description:
          'What is already working — 2–4 things the team should keep doing. Each one cited from something the persona genuinely appreciated during the run.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short noun-phrase name for the win (e.g. "Recognizable logo strip").' },
            description: {
              type: 'string',
              description: "One in-character sentence explaining why the persona liked it.",
            },
          },
          required: ['title', 'description'],
        },
      },
      partingNote: {
        type: 'string',
        description:
          "An honest, in-character closing paragraph (60–120 words) the persona would write if they were leaving the team a note. Should sound like a real person, name something specific they liked, and be unambiguous about what they want changed.",
      },
      pagesExplored: {
        type: 'number',
        description: 'The number of distinct pages/URLs the persona meaningfully visited during the run.',
      },
      pagesEstimatedTotal: {
        type: 'number',
        description:
          "The persona's rough estimate of how many pages the site's navigation advertised in total (counting nav links, footer links, etc.).",
      },
      nextPersonaSuggestion: {
        type: 'object',
        description:
          'Another persona worth pointing at the same URL next, chosen because they would stress-test a different surface of the product.',
        properties: {
          slug: { type: 'string', description: 'Slug of the suggested persona (must be one of the available slugs).' },
          reason: {
            type: 'string',
            description: "One sentence in the bud's voice on why that persona is the right next test.",
          },
        },
        required: ['slug', 'reason'],
      },
    },
    required: [
      'decision', 'confidence', 'headline', 'summary', 'highlight', 'theOneThing',
      'frictionList', 'wins', 'partingNote',
      'pagesExplored', 'pagesEstimatedTotal', 'nextPersonaSuggestion',
    ],
  },
} satisfies Anthropic.Tool;

function buildTranscript(steps: Step[]): string {
  return steps
    .map((s) => {
      const action =
        s.action.kind === 'finish'
          ? `finish (${s.action.outcome ?? ''}): ${s.action.reason ?? ''}`
          : s.action.kind === 'navigate'
            ? `navigate: ${s.action.url ?? ''}`
            : `act: ${s.action.instruction ?? ''}`;
      const failure = s.actionResult === 'failed' ? ` [ACTION FAILED: ${s.actionError ?? ''}]` : '';
      return `Step ${s.index} @ ${s.url}\n  felt: ${s.reaction.emotion} (${s.reaction.intensity})\n  thought: ${s.narration}\n  did: ${action}${failure}`;
    })
    .join('\n\n');
}

function otherPersonaSlugs(currentSlug: string): string[] {
  return personaLibrary.map((p) => p.slug).filter((s) => s !== currentSlug);
}

export async function synthesizeVerdict(
  input: SynthesizeVerdictInput,
  deps: SynthesizeVerdictDeps,
): Promise<Verdict> {
  const model = deps.model ?? 'claude-opus-4-7';
  const otherSlugs = otherPersonaSlugs(input.persona.slug);
  const userText = [
    `Persona: ${input.persona.name} — ${input.persona.identity.role}`,
    `Goal for the run: ${input.goal}`,
    '',
    'Full run transcript:',
    buildTranscript(input.steps),
    '',
    'Other personas available to run next (pick one for nextPersonaSuggestion.slug):',
    otherSlugs.map((s) => `  - ${s}`).join('\n'),
    '',
    'Produce the customer verdict and actionable wrap-up via the emit_verdict tool.',
    'Order frictionList by impact ÷ effort (most valuable to fix first), not raw severity.',
    "Keep every voiced quote and the parting note in the persona's voice — first person, specific, honest.",
  ].join('\n');

  const response = await deps.anthropic.messages.create({
    model,
    max_tokens: 4096,
    tools: [EMIT_VERDICT_TOOL],
    tool_choice: { type: 'tool', name: 'emit_verdict' },
    messages: [{ role: 'user', content: userText }],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Model did not return an emit_verdict tool call');
  }
  const parsed = VerdictSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`emit_verdict output failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
