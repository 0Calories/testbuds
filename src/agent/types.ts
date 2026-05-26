import { z } from 'zod';

export const EmotionSchema = z.enum([
  'neutral', 'curious', 'pleased', 'delighted', 'confused', 'frustrated', 'impatient',
]);
export type Emotion = z.infer<typeof EmotionSchema>;

export const ReactionSchema = z.object({
  emotion: EmotionSchema,
  intensity: z.number().min(0).max(1),
});
export type Reaction = z.infer<typeof ReactionSchema>;

// Deliberately a flat object, NOT a discriminated union. This schema parses LLM
// tool output: lenient parsing + downstream code that switches on `kind` and
// tolerates missing optionals degrades gracefully, where a strict union would
// throw and crash a whole multi-step run over one slightly-off field. It also
// mirrors the flat JSON Schema of the `emit_step` Anthropic tool (see reason.ts).
// Per-`kind` field usage: `act` -> instruction, `navigate` -> url,
// `finish` -> outcome/reason, `auth` -> username (synthetic step emitted by the
// runner after pre-auth; never an LLM tool call).
export const ActionSchema = z.object({
  kind: z.enum(['act', 'navigate', 'finish', 'auth']),
  instruction: z.string().optional(),
  url: z.string().optional(),
  outcome: z.enum(['completed', 'gave_up']).optional(),
  reason: z.string().optional(),
  username: z.string().optional(),
});
export type Action = z.infer<typeof ActionSchema>;

export const StepOutputSchema = z.object({
  bubble: z.string().min(1),
  narration: z.string().min(1),
  reaction: ReactionSchema,
  action: ActionSchema,
});
export type StepOutput = z.infer<typeof StepOutputSchema>;

export interface Step extends StepOutput {
  index: number;
  url: string;
  actionResult: 'ok' | 'failed' | 'n/a';
  actionError?: string;
}
