import { z } from 'zod';

export const LevelSchema = z.enum(['low', 'medium', 'high']);
export type Level = z.infer<typeof LevelSchema>;

/** Mascot costume — pairs the persona with the Testbud's visual costume. */
export const CostumeSchema = z.enum([
  'hardhat',
  'bags',
  'clipboard',
  'coffee',
  'megaphone',
  'cards',
  'sweatband',
  'phone',
]);
export type Costume = z.infer<typeof CostumeSchema>;

export const PersonaSchema = z.object({
  slug: z.string().min(1),
  /** Display name of the archetype (e.g. "Skeptical Bargain-Hunter"). Not a personal name. */
  name: z.string().min(1),
  segment: z.enum(['B2C', 'B2B']),
  /** Mascot costume the persona wears. */
  costume: CostumeSchema,
  identity: z.object({
    role: z.string().min(1),
    context: z.string().min(1),
  }),
  jobToBeDone: z.string().min(1),
  motivations: z.array(z.string()).min(1),
  painPoints: z.array(z.string()).min(1),
  skepticismLevel: LevelSchema,
  techSavviness: LevelSchema,
  patienceBudget: LevelSchema,
  decisionCriteria: z.array(z.string()).min(1),
  behavioralTendencies: z.string().min(1),
  groundingNotes: z.string().optional(),
});

export type Persona = z.infer<typeof PersonaSchema>;
