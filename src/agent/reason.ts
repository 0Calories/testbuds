import type Anthropic from '@anthropic-ai/sdk';
import { StepOutputSchema, type StepOutput, type Step } from './types';

export interface Observation {
  url: string;
  elements: string[];
  screenshotBase64: string;
}

export interface ReasonStepInput {
  goal: string;
  history: Step[];
  observation: Observation;
}

export interface ReasonInput extends ReasonStepInput {
  systemPrompt: string;
}

export interface ReasonDeps {
  anthropic: Anthropic;
  model?: string;
}

const EMIT_STEP_TOOL = {
  name: 'emit_step',
  description: 'Report your in-character thoughts and your single next action.',
  input_schema: {
    type: 'object' as const,
    properties: {
      bubble: { type: 'string', description: 'One short first-person sentence — a speech-bubble line.' },
      narration: { type: 'string', description: '1-3 first-person sentences explaining your thinking right now.' },
      reaction: {
        type: 'object',
        properties: {
          emotion: {
            type: 'string',
            enum: ['neutral', 'curious', 'pleased', 'delighted', 'confused', 'frustrated', 'impatient'],
          },
          intensity: { type: 'number', description: 'How strong the emotion is, from 0 to 1.' },
        },
        required: ['emotion', 'intensity'],
      },
      action: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['act', 'navigate', 'finish'] },
          instruction: { type: 'string', description: "For kind 'act': plain-language instruction, e.g. \"click the Sign Up button\"." },
          url: { type: 'string', description: "For kind 'navigate': the URL to open." },
          outcome: { type: 'string', enum: ['completed', 'gave_up'], description: "For kind 'finish': how the run ended." },
          reason: { type: 'string', description: "For kind 'finish': why you are stopping." },
        },
        required: ['kind'],
      },
    },
    required: ['bubble', 'narration', 'reaction', 'action'],
  },
} satisfies Anthropic.Tool;

export function buildUserText(input: ReasonStepInput): string {
  const historyText =
    input.history.length === 0
      ? '(This is your first step.)'
      : input.history
          .map((s) => {
            const act =
              s.action.kind === 'act'
                ? `act: ${s.action.instruction ?? ''}`
                : s.action.kind === 'navigate'
                  ? `navigate: ${s.action.url ?? ''}`
                  : `finish: ${s.action.outcome ?? ''}`;
            const failure = s.actionResult === 'failed' ? ` [FAILED: ${s.actionError ?? 'unknown error'}]` : '';
            return `Step ${s.index}: "${s.narration}" -> ${act}${failure}`;
          })
          .join('\n');

  const elements =
    input.observation.elements.length === 0
      ? '(No interactive elements detected.)'
      : input.observation.elements.map((e) => `- ${e}`).join('\n');

  return [
    `Your goal: ${input.goal}`,
    '',
    'What you have done so far:',
    historyText,
    '',
    `You are now on this page: ${input.observation.url}`,
    'Interactive elements on the page:',
    elements,
    '',
    'A screenshot of the current page is attached. Decide your single next step, in character.',
  ].join('\n');
}

export async function reason(input: ReasonInput, deps: ReasonDeps): Promise<StepOutput> {
  const model = deps.model ?? 'claude-sonnet-4-6';
  const response = await deps.anthropic.messages.create({
    model,
    max_tokens: 1024,
    system: [{ type: 'text', text: input.systemPrompt, cache_control: { type: 'ephemeral' } }],
    tools: [EMIT_STEP_TOOL],
    tool_choice: { type: 'tool', name: 'emit_step' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildUserText(input) },
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: input.observation.screenshotBase64 },
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Model did not return an emit_step tool call');
  }
  const parsed = StepOutputSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`emit_step output failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
