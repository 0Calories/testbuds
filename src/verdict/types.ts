import { z } from 'zod';

export const SeveritySchema = z.enum(['high', 'medium', 'low']);
export type Severity = z.infer<typeof SeveritySchema>;

export const ImpactSchema = z.enum(['high', 'medium', 'low']);
export type Impact = z.infer<typeof ImpactSchema>;

export const EffortSchema = z.enum(['small', 'medium', 'large']);
export type Effort = z.infer<typeof EffortSchema>;

/**
 * A short imperative verb the persona would use to label the change.
 * Free-form string (the synthesizer chooses something pithy like "Show",
 * "Replace", "Add", "Trim", "Move", "Reframe") — capped to keep it pill-sized.
 */
export const ActionVerbSchema = z.string().min(1).max(16);

export const FrictionItemSchema = z.object({
  title: z.string().min(1),
  stepIndex: z.number().int().min(0),
  url: z.string(),
  severity: SeveritySchema,
  evidenceQuote: z.string().min(1),

  /** Verb the persona uses for the recommended change ("Show", "Replace", …). */
  actionVerb: ActionVerbSchema,
  /** Concrete bullet-point recommendations the team should take. */
  recommendations: z.array(z.string().min(1)).min(1),
  impact: ImpactSchema,
  effort: EffortSchema,
  /** Team / role best placed to own this change (Marketing, Pricing, Web, …). */
  owner: z.string().min(1),
});
export type FrictionItem = z.infer<typeof FrictionItemSchema>;

export const WinItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});
export type WinItem = z.infer<typeof WinItemSchema>;

export const NextPersonaSuggestionSchema = z.object({
  /** Slug of another persona in the library worth running against the same URL. */
  slug: z.string().min(1),
  /** One-line reason in the bud's voice. */
  reason: z.string().min(1),
});
export type NextPersonaSuggestion = z.infer<typeof NextPersonaSuggestionSchema>;

export const VerdictSchema = z.object({
  decision: z.enum(['would_buy', 'would_investigate', 'would_bail']),
  confidence: z.number().min(0).max(1),
  frictionList: z.array(FrictionItemSchema),
  summary: z.string().min(1),
  highlight: z.string().min(1),

  /** Persona-voiced one-liner — the headline of the wrap-up. */
  headline: z.string().min(1),
  /** The single most-impactful insight, written as a business case sentence. */
  theOneThing: z.string().min(1),
  /** What's already working — keep doing this. */
  wins: z.array(WinItemSchema),
  /** A verbatim parting paragraph in the persona's voice. */
  partingNote: z.string().min(1),
  /** Distinct URLs the persona actually visited. */
  pagesExplored: z.number().int().min(0),
  /** Persona's rough estimate of how many pages the nav advertises. */
  pagesEstimatedTotal: z.number().int().min(0),
  /** Another persona worth pointing at the same URL next. */
  nextPersonaSuggestion: NextPersonaSuggestionSchema,
});
export type Verdict = z.infer<typeof VerdictSchema>;
