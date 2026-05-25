import { describe, it, expect } from 'vitest';
import { humanizeToolCall } from './runner';

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
