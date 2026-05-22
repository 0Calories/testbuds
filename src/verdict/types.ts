import { z } from 'zod';

export const FrictionItemSchema = z.object({
  title: z.string().min(1),
  stepIndex: z.number().int().min(0),
  url: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  evidenceQuote: z.string().min(1),
});
export type FrictionItem = z.infer<typeof FrictionItemSchema>;

export const VerdictSchema = z.object({
  decision: z.enum(['would_buy', 'would_investigate', 'would_bail']),
  confidence: z.number().min(0).max(1),
  frictionList: z.array(FrictionItemSchema),
  summary: z.string().min(1),
  highlight: z.string().min(1),
});
export type Verdict = z.infer<typeof VerdictSchema>;
