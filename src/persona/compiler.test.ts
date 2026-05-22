import { describe, it, expect } from 'vitest';
import { compilePersona } from './compiler';
import { getPersona } from './library';

describe('compilePersona', () => {
  const persona = getPersona('skeptical-bargain-hunter')!;
  const prompt = compilePersona(persona);

  it('includes the persona name and role', () => {
    expect(prompt).toContain('Dana Pryce');
    expect(prompt).toContain('Budget-conscious online shopper');
  });

  it('includes the job-to-be-done', () => {
    expect(prompt).toContain(persona.jobToBeDone);
  });

  it('includes every decision criterion', () => {
    for (const c of persona.decisionCriteria) {
      expect(prompt).toContain(c);
    }
  });

  it('instructs the agent to think aloud and to be willing to give up', () => {
    expect(prompt.toLowerCase()).toContain('think aloud');
    expect(prompt.toLowerCase()).toContain('give up');
  });
});
