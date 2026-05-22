import { describe, it, expect } from 'vitest';
import { StepOutputSchema } from './types';

const validStepOutput = {
  bubble: 'Where is the pricing?',
  narration: 'I want to know the price before anything else. I will look for a pricing link.',
  reaction: { emotion: 'curious', intensity: 0.4 },
  action: { kind: 'act', instruction: 'click the Pricing link in the navigation' },
};

describe('StepOutputSchema', () => {
  it('accepts a valid step output', () => {
    expect(StepOutputSchema.parse(validStepOutput).action.kind).toBe('act');
  });

  it('accepts a finish action', () => {
    const finish = {
      ...validStepOutput,
      action: { kind: 'finish', outcome: 'gave_up', reason: 'No pricing anywhere.' },
    };
    expect(StepOutputSchema.parse(finish).action.outcome).toBe('gave_up');
  });

  it('rejects an unknown emotion', () => {
    const bad = { ...validStepOutput, reaction: { emotion: 'angry', intensity: 0.5 } };
    expect(() => StepOutputSchema.parse(bad)).toThrow();
  });

  it('rejects an intensity above 1', () => {
    const bad = { ...validStepOutput, reaction: { emotion: 'curious', intensity: 2 } };
    expect(() => StepOutputSchema.parse(bad)).toThrow();
  });
});
