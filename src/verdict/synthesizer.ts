import type Anthropic from '@anthropic-ai/sdk';
import type { Persona } from '../persona/types';
import type { Step } from '../agent/types';
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
  description: 'Report the customer verdict and the friction encountered during the run.',
  input_schema: {
    type: 'object' as const,
    properties: {
      decision: { type: 'string', enum: ['would_buy', 'would_investigate', 'would_bail'] },
      confidence: { type: 'number', description: 'Confidence in the decision, from 0 to 1.' },
      frictionList: {
        type: 'array',
        description: 'Friction points, ordered most to least severe.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short name for the friction point.' },
            stepIndex: { type: 'number', description: 'The step index where it occurred.' },
            url: { type: 'string', description: 'The page URL where it occurred.' },
            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
            evidenceQuote: { type: 'string', description: "A direct quote from the persona's narration." },
          },
          required: ['title', 'stepIndex', 'url', 'severity', 'evidenceQuote'],
        },
      },
      summary: { type: 'string', description: "A short summary in the persona's own voice." },
      highlight: { type: 'string', description: 'The single decisive moment the persona converted or bailed.' },
    },
    required: ['decision', 'confidence', 'frictionList', 'summary', 'highlight'],
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

export async function synthesizeVerdict(
  input: SynthesizeVerdictInput,
  deps: SynthesizeVerdictDeps,
): Promise<Verdict> {
  const model = deps.model ?? 'claude-opus-4-7';
  const userText = [
    `Persona: ${input.persona.identity.name} — ${input.persona.identity.role}`,
    `Goal for the run: ${input.goal}`,
    '',
    'Full run transcript:',
    buildTranscript(input.steps),
    '',
    'Based only on this transcript, produce the customer verdict via the emit_verdict tool.',
  ].join('\n');

  const response = await deps.anthropic.messages.create({
    model,
    max_tokens: 2048,
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
