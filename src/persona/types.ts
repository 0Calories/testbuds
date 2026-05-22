import { z } from 'zod';

export const LevelSchema = z.enum(['low', 'medium', 'high']);
export type Level = z.infer<typeof LevelSchema>;

export const PersonaSchema = z.object({
  slug: z.string().min(1),
  segment: z.enum(['B2C', 'B2B']),
  identity: z.object({
    name: z.string().min(1),
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
