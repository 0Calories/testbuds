import { describe, it, expect } from 'vitest';
import { runLoop, type ReasonFn } from './orchestrator';
import { FakeBrowserSession } from './fake-browser';
import type { StepOutput } from './types';

const act = (instruction: string): StepOutput => ({
  bubble: 'b', narration: 'n', reaction: { emotion: 'neutral', intensity: 0.1 },
  action: { kind: 'act', instruction },
});
const finish = (): StepOutput => ({
  bubble: 'b', narration: 'done', reaction: { emotion: 'pleased', intensity: 0.8 },
  action: { kind: 'finish', outcome: 'completed', reason: 'Goal met.' },
});

/** A ReasonFn that returns each scripted output in turn. */
function scripted(outputs: StepOutput[]): ReasonFn {
  let i = 0;
  return async () => outputs[Math.min(i++, outputs.length - 1)]!;
}

describe('runLoop', () => {
  it('stops when the agent emits a finish action', async () => {
    const steps = await runLoop({
      goal: 'g', browser: new FakeBrowserSession(),
      reasonFn: scripted([act('click a'), act('click b'), finish()]),
    });
    expect(steps.length).toBe(3);
    expect(steps[2]!.action.kind).toBe('finish');
  });

  it('stops at maxSteps when the agent never finishes', async () => {
    const steps = await runLoop({
      goal: 'g', browser: new FakeBrowserSession(),
      reasonFn: scripted([act('click a'), act('click b'), act('click c'), act('click d'), act('click e')]),
      maxSteps: 5,
    });
    expect(steps.length).toBe(5);
  });

  it('records a failed action result and error', async () => {
    const browser = new FakeBrowserSession();
    browser.actShouldFail = true;
    const steps = await runLoop({
      goal: 'g', browser,
      reasonFn: scripted([act('click missing'), finish()]),
    });
    expect(steps[0]!.actionResult).toBe('failed');
    expect(steps[0]!.actionError).toBeTruthy();
  });

  it('stops early when the agent repeats the same action three times', async () => {
    const steps = await runLoop({
      goal: 'g', browser: new FakeBrowserSession(),
      reasonFn: scripted([act('click a')]),
      maxSteps: 20,
    });
    expect(steps.length).toBe(3);
  });

  it('calls onStep for every step', async () => {
    const seen: number[] = [];
    await runLoop({
      goal: 'g', browser: new FakeBrowserSession(),
      reasonFn: scripted([act('click a'), finish()]),
      onStep: (s) => seen.push(s.index),
    });
    expect(seen).toEqual([0, 1]);
  });
});
