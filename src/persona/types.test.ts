import { describe, it, expect } from 'vitest';
import { PersonaSchema } from './types';

const valid = {
  slug: 'test-persona',
  name: 'Test Archetype',
  segment: 'B2C' as const,
  identity: { role: 'Shopper', context: 'Browsing on a laptop.' },
  jobToBeDone: 'Decide whether to buy.',
  motivations: ['Save money'],
  painPoints: ['Hidden fees'],
  skepticismLevel: 'high' as const,
  techSavviness: 'medium' as const,
  patienceBudget: 'low' as const,
  decisionCriteria: ['Clear pricing'],
  behavioralTendencies: 'Scans, does not read.',
};

describe('PersonaSchema', () => {
  it('accepts a valid persona', () => {
    expect(PersonaSchema.parse(valid).slug).toBe('test-persona');
  });

  it('rejects an invalid skepticism level', () => {
    expect(() => PersonaSchema.parse({ ...valid, skepticismLevel: 'extreme' })).toThrow();
  });

  it('rejects a persona missing identity', () => {
    const { identity, ...rest } = valid;
    expect(() => PersonaSchema.parse(rest)).toThrow();
  });
});
