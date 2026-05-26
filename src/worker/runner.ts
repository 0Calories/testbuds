import Anthropic from '@anthropic-ai/sdk';
import { compilePersona } from '../persona/compiler';
import { getPersona } from '../persona/library';
import { synthesizeVerdict } from '../verdict/synthesizer';
import { makeReactTool, makeFinishTool, type ReactToolInput, type FinishToolInput } from '../agent/tools';
import { launchStagehandHost } from './stagehand-host';
import { establishAuth } from '../connection/auth';
import type { Step, Action } from '../agent/types';
import type { Verdict } from '../verdict/types';
import type { RunRunner } from './orchestrator';
import type { Page } from 'playwright';

interface AgentStepLike {
  text?: string;
  toolCalls: Array<{ toolName: string; input: unknown }>;
  toolResults: Array<{ output?: unknown }>;
}

export function makeWorkerRunner(): RunRunner {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  return async ({ run, connection, emitRrweb, emitStep, abortSignal }) => {
    const persona = getPersona(run.personaSlug);
    if (!persona) throw new Error(`Unknown persona: ${run.personaSlug}`);

    const host = await launchStagehandHost({
      viewport: run.viewport,
      emitRrweb,
    });

    try {
      const steps: Step[] = [];
      let pendingReact: ReactToolInput | null = null;
      let finalDecision: FinishToolInput | null = null;
      const innerAbort = new AbortController();
      abortSignal.addEventListener('abort', () => innerAbort.abort());

      if (connection) {
        // V3Page is Stagehand-internal and not assignable to Playwright Page directly;
        // cast here since establishAuth only uses goto/locator/fill/click/waitForLoadState,
        // all of which V3Page supports at runtime.
        await establishAuth(host.page as unknown as Page, connection);
        if (connection.mode === 'test-credential') {
          const authStep = buildAuthStep(connection.username, connection.loginUrl);
          steps.push(authStep);
          emitStep(authStep);
        }
      }

      await host.page.goto(run.targetUrl);

      const reactTool = makeReactTool((r) => { pendingReact = r; });
      const finishTool = makeFinishTool((f) => { finalDecision = f; innerAbort.abort(); });

      const agent = host.stagehand.agent({
        model: { modelName: 'anthropic/claude-sonnet-4-6', apiKey: process.env.ANTHROPIC_API_KEY },
        mode: 'hybrid',
        systemPrompt: buildCustomInstructions(persona),
        tools: { react: reactTool, finish: finishTool },
      });

      try {
        await agent.execute({
          instruction: framedInstruction(run.goal),
          maxSteps: 25,
          signal: innerAbort.signal,
          callbacks: {
            onStepFinish: async (rawStep) => {
              const record = buildStepRecord({
                step: rawStep as unknown as AgentStepLike,
                index: steps.length,
                url: host.page.url(),
                pendingReact,
                finalDecision,
              });
              steps.push(record);
              emitStep(record);
              pendingReact = null;
            },
          },
        });
      } catch (err) {
        if (!innerAbort.signal.aborted) throw err;
      }

      const verdict: Verdict = await synthesizeVerdict(
        { persona, goal: run.goal, steps },
        { anthropic },
      );
      return verdict;
    } finally {
      await host.close();
    }
  };
}

function framedInstruction(goal: string): string {
  return [
    'You are giving REAL customer feedback as the persona described in <customInstructions>.',
    '',
    'The user wants you to answer the following, IN CHARACTER, by using the product the way the persona would:',
    `> ${goal}`,
    '',
    'Important: this is not a task to be completed — it is a question to be answered honestly.',
    'Explore the product enough to ground your decision (scan, scroll, look for the proof your persona cares about). Then decide the way the persona genuinely would, and call `finish` with that decision. Both yes and no are valid outcomes. Bailing is also a valid outcome — bail if the persona would bail.',
    '',
    'Do NOT complete the action implied by the question (sign up, buy, etc.) unless the persona would actually do it after grounded evaluation. A premature "yes" is bad feedback.',
  ].join('\n');
}

function buildCustomInstructions(persona: import('../persona/types').Persona): string {
  return [
    compilePersona(persona),
    '',
    '# TASK PROTOCOL — read carefully',
    'Although you have web automation tools available, your ROLE in this task is to BE the persona above and use the product the way they would. The user needs to FEEL how this customer reacts — that is the deliverable.',
    '',
    '## When to call `react`',
    'Call the `react` tool FIRST on any step where you have a NEW in-character thought worth sharing — a fresh impression, a feeling about what you see, a moment of confusion or delight or frustration. Pass a short `bubble` (one first-person sentence), `narration` (1-3 first-person sentences), and your current `reaction` ({ emotion, intensity 0-1 }).',
    '',
    'You do NOT need to call `react` on every step. Pure observation actions ("let me look closer" via screenshot or ariaTree) and the terminal `finish` call are fine to do without a fresh `react` — only call it when the persona genuinely has something new to say.',
    '',
    'A good cadence: react when you arrive on a new page, when you spot something important, when your mood shifts, when you decide to give up or commit. Not when you are just looking around.',
    '',
    '## When to call `finish`',
    'When you have reached a clear yes/no decision OR your patience runs out: call the `finish` tool with `outcome` (`completed` or `gave_up`) and a short `reason` that captures your last thought. Do NOT continue exploring after calling `finish`.',
    '',
    '## Stay in character',
    'Use the first person. Do not break character to talk about being an AI or about the tools you are using.',
  ].join('\n');
}

function buildStepRecord(args: {
  step: AgentStepLike;
  index: number;
  url: string;
  pendingReact: ReactToolInput | null;
  finalDecision: FinishToolInput | null;
}): Step {
  const { step, index, url, pendingReact, finalDecision } = args;

  const reactCall = step.toolCalls.find((c) => c.toolName === 'react');
  const finishCall = step.toolCalls.find((c) => c.toolName === 'finish');
  const browserCalls = step.toolCalls.filter(
    (c) => c.toolName !== 'react' && c.toolName !== 'finish',
  );

  const reactInput = (reactCall?.input as ReactToolInput | undefined) ?? pendingReact;

  let action: Action;
  if (finishCall) {
    const fin = finishCall.input as FinishToolInput;
    action = { kind: 'finish', outcome: fin.outcome, reason: fin.reason };
  } else if (finalDecision) {
    action = { kind: 'finish', outcome: finalDecision.outcome, reason: finalDecision.reason };
  } else if (browserCalls[0]) {
    action = mapToolCallToAction(browserCalls[0].toolName, browserCalls[0].input);
  } else {
    action = { kind: 'act', instruction: '(no browser action)' };
  }

  const failedResult = step.toolResults.find((r) => {
    const out = (r as { output?: unknown }).output;
    return out !== null && typeof out === 'object' && out !== undefined && 'error' in (out as object);
  });
  const failedError = failedResult !== undefined
    ? String(((failedResult as { output: { error?: unknown } }).output.error ?? ''))
    : undefined;

  let narration: string;
  if (reactInput) narration = reactInput.narration;
  else if (step.text && step.text.length > 0) narration = step.text;
  else if (action.kind === 'finish' && action.reason) narration = `Wrapping up — ${action.reason}`;
  else narration = '';

  const bubble = reactInput?.bubble ?? (step.text ? step.text.slice(0, 120) : '');

  return {
    index,
    url,
    bubble,
    narration,
    reaction: reactInput?.reaction ?? { emotion: 'neutral', intensity: 0.5 },
    action,
    actionResult: failedResult ? 'failed' : 'ok',
    actionError: failedError,
  };
}

function mapToolCallToAction(toolName: string, input: unknown): Action {
  const args = (input ?? {}) as Record<string, unknown>;
  if (toolName === 'goto' && typeof args.url === 'string') return { kind: 'navigate', url: args.url };
  return { kind: 'act', instruction: humanizeToolCall(toolName, args) };
}

export function buildAuthStep(username: string, loginUrl: string): Step {
  return {
    index: 0,
    url: loginUrl,
    bubble: '',
    narration: `Bud signed in as ${username}`,
    reaction: { emotion: 'neutral', intensity: 0 },
    action: { kind: 'auth', username },
    actionResult: 'ok',
  };
}

/**
 * Turn a Stagehand/CUA tool call into a short, human-readable phrase
 * for the run trail. Unknown tools fall back to the bare tool name —
 * never raw JSON, since these strings render in the UI.
 */
export function humanizeToolCall(toolName: string, args: Record<string, unknown>): string {
  const str = (key: string): string | undefined =>
    typeof args[key] === 'string' ? (args[key] as string) : undefined;

  switch (toolName) {
    case 'screenshot':
      return 'Taking a screenshot';
    case 'scroll': {
      const direction = str('direction');
      if (direction === 'up' || direction === 'down' || direction === 'left' || direction === 'right') {
        return `Scrolling ${direction}`;
      }
      return 'Scrolling';
    }
    case 'think':
      return 'Thinking it over';
    case 'click':
      return 'Clicking';
    case 'type':
    case 'key':
    case 'fill': {
      const text = str('text');
      if (text) {
        const trimmed = text.length > 30 ? `${text.slice(0, 29)}…` : text;
        return `Typing "${trimmed}"`;
      }
      return 'Typing';
    }
    case 'extract': {
      const instruction = str('instruction');
      return instruction ? `Reading the page for ${truncatePhrase(instruction, 40)}` : 'Reading the page';
    }
    case 'observe':
      return 'Observing the page';
    case 'act': {
      const action = str('action') ?? str('instruction');
      return action ? truncatePhrase(action, 60) : 'Acting on the page';
    }
    case 'mouse_move':
      return 'Moving the cursor';
    case 'mouse_drag':
    case 'drag':
      return 'Dragging';
    case 'wait':
      return 'Waiting';
    default:
      return toolName;
  }
}

function truncatePhrase(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}
