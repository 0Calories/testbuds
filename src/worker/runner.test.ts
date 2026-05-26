import { describe, it, expect } from 'vitest';
import { humanizeToolCall, buildAuthStep } from './runner';

describe('humanizeToolCall', () => {
  it('describes a screenshot without args', () => {
    expect(humanizeToolCall('screenshot', {})).toBe('Taking a screenshot');
  });

  it('describes a scroll with its direction', () => {
    expect(humanizeToolCall('scroll', { direction: 'down', percentage: 50 })).toBe('Scrolling down');
    expect(humanizeToolCall('scroll', { direction: 'up' })).toBe('Scrolling up');
    expect(humanizeToolCall('scroll', {})).toBe('Scrolling');
  });

  it('describes a think without leaking the model\'s reasoning text', () => {
    const out = humanizeToolCall('think', { reasoning: 'Let me assess what I have seen...' });
    expect(out).toBe('Thinking it over');
    expect(out).not.toContain('assess');
  });

  it('quotes typed text and truncates long input', () => {
    expect(humanizeToolCall('type', { text: 'hello' })).toBe('Typing "hello"');
    const long = 'a'.repeat(80);
    const out = humanizeToolCall('type', { text: long });
    expect(out.startsWith('Typing "')).toBe(true);
    expect(out.endsWith('…"')).toBe(true);
    expect(out.length).toBeLessThan(50);
  });

  it('passes through a high-level act instruction', () => {
    expect(humanizeToolCall('act', { action: 'click the Pricing link' })).toBe('click the Pricing link');
  });

  it('falls back to the bare tool name for unknown tools — never JSON', () => {
    const out = humanizeToolCall('exotic_tool', { foo: { bar: 1 }, list: [1, 2, 3] });
    expect(out).toBe('exotic_tool');
    expect(out).not.toContain('{');
    expect(out).not.toContain('[');
  });
});

describe('buildAuthStep', () => {
  it('produces a synthetic step #0 with no emotion bubble', () => {
    const step = buildAuthStep('bud@testbuds.dev', 'https://app.example.com/login');
    expect(step.index).toBe(0);
    expect(step.url).toBe('https://app.example.com/login');
    expect(step.action.kind).toBe('auth');
    expect(step.action.username).toBe('bud@testbuds.dev');
    expect(step.bubble).toBe('');
    expect(step.narration).toContain('bud@testbuds.dev');
    expect(step.reaction.emotion).toBe('neutral');
    expect(step.reaction.intensity).toBe(0);
    expect(step.actionResult).toBe('ok');
  });

  it('does not leak any password material into the step', () => {
    const step = buildAuthStep('bud@testbuds.dev', 'https://app.example.com/login');
    const json = JSON.stringify(step);
    expect(json).not.toContain('password');
    expect(json).not.toContain('Password');
  });
});
