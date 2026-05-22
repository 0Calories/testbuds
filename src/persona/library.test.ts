import { describe, it, expect } from 'vitest';
import { personaLibrary, getPersona } from './library';
import { PersonaSchema } from './types';

describe('personaLibrary', () => {
  it('has at least 6 personas', () => {
    expect(personaLibrary.length).toBeGreaterThanOrEqual(6);
  });

  it('every persona is valid against PersonaSchema', () => {
    for (const p of personaLibrary) {
      expect(() => PersonaSchema.parse(p)).not.toThrow();
    }
  });

  it('every persona slug is unique', () => {
    const slugs = personaLibrary.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('getPersona returns a persona by slug, or undefined', () => {
    expect(getPersona('skeptical-bargain-hunter')?.slug).toBe('skeptical-bargain-hunter');
    expect(getPersona('does-not-exist')).toBeUndefined();
  });
});
