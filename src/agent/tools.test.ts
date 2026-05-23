import { describe, it, expect, vi } from 'vitest';
import {
  makeReactTool,
  makeFinishTool,
  REACT_TOOL_INPUT,
  FINISH_TOOL_INPUT,
} from './tools';

// AI SDK tool objects carry their execute function — we duck-type the result
// because the Tool generic varies by SDK version.
type ExecutableTool<T> = { execute: (input: T) => Promise<unknown> };

describe('makeReactTool', () => {
  it('calls the callback with the parsed input when executed', async () => {
    const onReact = vi.fn();
    const t = makeReactTool(onReact) as unknown as ExecutableTool<{
      bubble: string;
      narration: string;
      reaction: { emotion: 'curious'; intensity: number };
    }>;
    const input = {
      bubble: 'Looking for pricing.',
      narration: 'I need to know the price before anything else.',
      reaction: { emotion: 'curious' as const, intensity: 0.3 },
    };
    const result = await t.execute(input);
    expect(onReact).toHaveBeenCalledWith(input);
    expect(result).toEqual({ acknowledged: true });
  });
});

describe('makeFinishTool', () => {
  it('calls the callback with the parsed input when executed', async () => {
    const onFinish = vi.fn();
    const t = makeFinishTool(onFinish) as unknown as ExecutableTool<{
      outcome: 'completed' | 'gave_up';
      reason: string;
    }>;
    const input = { outcome: 'gave_up' as const, reason: 'No pricing visible.' };
    const result = await t.execute(input);
    expect(onFinish).toHaveBeenCalledWith(input);
    expect(result).toEqual({ stopped: true });
  });
});

describe('REACT_TOOL_INPUT schema', () => {
  it('rejects an invalid emotion', () => {
    expect(() =>
      REACT_TOOL_INPUT.parse({
        bubble: 'a',
        narration: 'b',
        reaction: { emotion: 'angry', intensity: 0.5 },
      }),
    ).toThrow();
  });

  it('rejects an intensity above 1', () => {
    expect(() =>
      REACT_TOOL_INPUT.parse({
        bubble: 'a',
        narration: 'b',
        reaction: { emotion: 'curious', intensity: 2 },
      }),
    ).toThrow();
  });
});

describe('FINISH_TOOL_INPUT schema', () => {
  it('rejects an invalid outcome', () => {
    expect(() => FINISH_TOOL_INPUT.parse({ outcome: 'maybe', reason: 'x' })).toThrow();
  });

  it('rejects an empty reason', () => {
    expect(() => FINISH_TOOL_INPUT.parse({ outcome: 'completed', reason: '' })).toThrow();
  });
});
