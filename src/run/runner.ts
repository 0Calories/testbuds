import type { Stagehand } from '@browserbasehq/stagehand';
import type Anthropic from '@anthropic-ai/sdk';
import type { Persona } from '../persona/types';

/**
 * Minimal shape we read from each AI SDK step. Defined locally to decouple from
 * AI SDK type churn — the callback's real type is richer, but we only touch these.
 */
interface AgentStepLike {
  text?: string;
  toolCalls: Array<{ toolName: string; input: unknown }>;
  toolResults: Array<{ output?: unknown }>;
}
import { compilePersona } from '../persona/compiler';
import type { Step, Action } from '../agent/types';
import {
  makeReactTool,
  makeFinishTool,
  type ReactToolInput,
  type FinishToolInput,
} from '../agent/tools';
import type { Connection } from '../connection/types';
import { establishAuth, makeAuthDriver } from '../connection/auth';
import { synthesizeVerdict } from '../verdict/synthesizer';
import type { Verdict } from '../verdict/types';

export interface ExecuteRunInput {
  persona: Persona;
  connection: Connection;
  targetUrl: string;
  goal: string;
  maxSteps?: number;
  /** Viewport for the agent's browser session. Defaults to 'desktop'. */
  viewport?: 'desktop' | 'mobile';
  onStep?: (step: Step) => void;
  /** Fires once the Stagehand session exists, before auth/navigation. */
  onBrowserReady?: (info: { sessionId: string | undefined }) => void | Promise<void>;
}

export interface ExecuteRunDeps {
  anthropic: Anthropic;
  createStagehand: () => Promise<Stagehand>;
}

export interface RunResult {
  steps: Step[];
  verdict: Verdict;
  metadata: { durationMs: number; stepCount: number };
}

/**
 * Execute one full synthetic-customer run: auth -> Stagehand agent loop -> verdict.
 *
 * Stagehand owns the observe -> reason -> act loop, mode selection (DOM/hybrid),
 * and stop-condition heuristics. We layer persona conditioning + per-step capture
 * on top via two custom tools:
 *   - `react`: persona MUST call before every browser action (captures in-character
 *     thinking, narration, and emotion that drive the avatar + verdict).
 *   - `finish`: persona calls to end the run in character; triggers AbortSignal.
 *
 * We still run an Opus verdict pass over the captured step transcript.
 */
export async function executeRun(
  input: ExecuteRunInput,
  deps: ExecuteRunDeps,
): Promise<RunResult> {
  const startedAt = Date.now();
  const stagehand = await deps.createStagehand();

  try {
    // Apply mobile viewport before any navigation, if requested.
    if (input.viewport === 'mobile') {
      const page = stagehand.context?.activePage();
      if (page) await page.setViewportSize(390, 844);
    }

    // Surface the Browserbase session id to the caller so they can fetch the Live View URL.
    await input.onBrowserReady?.({
      sessionId: (stagehand as unknown as { browserbaseSessionID?: string }).browserbaseSessionID,
    });

    // 1. Auth
    await establishAuth(makeAuthDriver(stagehand), input.connection);

    // 2. Navigate to target
    const page = stagehand.context?.activePage();
    if (!page) throw new Error('No active page after auth');
    await page.goto(input.targetUrl);

    // 3. Run the agent loop, capturing every step
    const steps: Step[] = [];
    let pendingReact: ReactToolInput | null = null;
    let finalDecision: FinishToolInput | null = null;
    const abort = new AbortController();

    const reactTool = makeReactTool((r) => {
      pendingReact = r;
    });
    const finishTool = makeFinishTool((f) => {
      finalDecision = f;
      abort.abort();
    });

    const agent = stagehand.agent({
      model: {
        modelName: 'anthropic/claude-sonnet-4-6',
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      mode: 'hybrid',
      systemPrompt: buildCustomInstructions(input.persona),
      tools: { react: reactTool, finish: finishTool },
    });

    try {
      await agent.execute({
        instruction: framedInstruction(input.goal),
        maxSteps: input.maxSteps ?? 25,
        signal: abort.signal,
        callbacks: {
          onStepFinish: async (step) => {
            const record = buildStepRecord({
              step: step as unknown as AgentStepLike,
              index: steps.length,
              url: stagehand.context?.activePage()?.url() ?? '',
              pendingReact,
              finalDecision,
            });
            steps.push(record);
            input.onStep?.(record);
            pendingReact = null;
          },
        },
      });
    } catch (err) {
      // The persona's `finish` aborts the signal — that's expected, not an error.
      if (!abort.signal.aborted) throw err;
    }

    // 4. Synthesize the verdict (Opus pass over the captured transcript)
    const verdict = await synthesizeVerdict(
      { persona: input.persona, goal: input.goal, steps },
      { anthropic: deps.anthropic },
    );

    return {
      steps,
      verdict,
      metadata: { durationMs: Date.now() - startedAt, stepCount: steps.length },
    };
  } finally {
    await stagehand.close();
  }
}

/**
 * Re-frame the user-supplied goal so the agent treats it as a *decision question*
 * rather than a task to complete. Without this, Stagehand's master prompt
 * interprets the instruction as "accomplish X" and the agent will dutifully sign
 * up / click buy / hand over an email even when the persona wouldn't.
 */
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

/**
 * Build the `customInstructions` block Stagehand injects into the agent's master
 * system prompt (as `<customInstructions>...</customInstructions>`). Combines the
 * compiled persona prompt with task-protocol instructions telling the LLM how to
 * use our `react` and `finish` tools alongside Stagehand's browser tools.
 */
function buildCustomInstructions(persona: Persona): string {
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

/** Translate one AI SDK step into our `Step` record for the transcript. */
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

  // Prefer the react input from this step's tool calls; fall back to one buffered
  // by the execute() callback firing before this onStepFinish.
  const reactInput = (reactCall?.input as ReactToolInput | undefined) ?? pendingReact;

  // Action: finish (this step or buffered) > browser tool > pure observation
  let action: Action;
  if (finishCall) {
    const fin = finishCall.input as FinishToolInput;
    action = { kind: 'finish', outcome: fin.outcome, reason: fin.reason };
  } else if (finalDecision) {
    action = {
      kind: 'finish',
      outcome: finalDecision.outcome,
      reason: finalDecision.reason,
    };
  } else if (browserCalls[0]) {
    action = mapToolCallToAction(browserCalls[0].toolName, browserCalls[0].input);
  } else {
    action = { kind: 'act', instruction: '(no browser action)' };
  }

  // Surface any tool-execution error from this step.
  const failedResult = step.toolResults.find((r) => {
    const out = (r as { output?: unknown }).output;
    return out !== null && typeof out === 'object' && out !== undefined && 'error' in (out as object);
  });
  const failedError =
    failedResult !== undefined
      ? String(((failedResult as { output: { error?: unknown } }).output.error ?? ''))
      : undefined;

  // Narration is only set when the persona has something to say. Pure observation
  // steps (screenshot/ariaTree only) and bare finish calls produce no narration
  // unless the LLM also said something in free `text` — UI consumers should skip
  // empty narration rows. Finish actions get a friendly fallback from the reason.
  let narration: string;
  if (reactInput) {
    narration = reactInput.narration;
  } else if (step.text && step.text.length > 0) {
    narration = step.text;
  } else if (action.kind === 'finish' && action.reason) {
    narration = `Wrapping up — ${action.reason}`;
  } else {
    narration = '';
  }
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

/** Map a Stagehand built-in browser tool call to our `Action` shape. */
function mapToolCallToAction(toolName: string, input: unknown): Action {
  const args = (input ?? {}) as Record<string, unknown>;
  if (toolName === 'goto' && typeof args.url === 'string') {
    return { kind: 'navigate', url: args.url };
  }
  return { kind: 'act', instruction: describeBrowserTool(toolName, args) };
}

/**
 * Turn a Stagehand browser tool call into a third-person, human-readable
 * description of what the bud is doing this step — used by the run sidebar
 * trail. Keep these as short verb phrases ("Clicking the pricing button",
 * "Reading the page") rather than raw tool/argument dumps.
 */
function describeBrowserTool(toolName: string, args: Record<string, unknown>): string {
  const name = toolName.toLowerCase();
  // The natural-language `act` tool — surface the persona's instruction directly.
  const nlInstruction =
    (typeof args.action === 'string' && args.action) ||
    (typeof args.instruction === 'string' && args.instruction) ||
    (typeof args.description === 'string' && args.description) ||
    '';
  if (name === 'act' && nlInstruction) return toGerundPhrase(nlInstruction);

  switch (name) {
    case 'click':
      return 'Clicking';
    case 'type': {
      const text = typeof args.text === 'string' ? args.text : undefined;
      return text ? `Typing “${ellipsize(text, 40)}”` : 'Typing';
    }
    case 'scroll':
      return 'Scrolling';
    case 'fill':
    case 'fillform':
      return 'Filling out a form';
    case 'screenshot':
      return 'Looking at the page';
    case 'ariatree':
    case 'extract':
    case 'observe':
      return 'Reading the page';
    case 'wait':
      return 'Waiting';
    case 'hover':
      return 'Hovering';
    case 'press':
    case 'keypress':
      return 'Pressing a key';
    case 'select':
      return 'Selecting an option';
    case 'back':
      return 'Going back';
    case 'reload':
    case 'refresh':
      return 'Reloading the page';
    default:
      return nlInstruction ? toGerundPhrase(nlInstruction) : `Running ${toolName}`;
  }
}

function ellipsize(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/** Convert an imperative phrase ("click the X") into a gerund phrase ("Clicking the X"). */
function toGerundPhrase(imperative: string): string {
  const trimmed = imperative.trim();
  if (!trimmed) return imperative;
  const space = trimmed.search(/\s/);
  const first = space === -1 ? trimmed : trimmed.slice(0, space);
  const rest = space === -1 ? '' : trimmed.slice(space);
  return capitalize(toGerund(first)) + rest;
}

const GERUND_OVERRIDES: Record<string, string> = {
  go: 'going',
  do: 'doing',
  see: 'seeing',
  read: 'reading',
  put: 'putting',
  get: 'getting',
  set: 'setting',
  run: 'running',
  hit: 'hitting',
  pay: 'paying',
  begin: 'beginning',
};

function toGerund(verb: string): string {
  const lower = verb.toLowerCase();
  if (GERUND_OVERRIDES[lower]) return GERUND_OVERRIDES[lower];
  if (lower.endsWith('ie')) return lower.slice(0, -2) + 'ying';
  if (lower.endsWith('e') && !lower.endsWith('ee') && !lower.endsWith('ye') && !lower.endsWith('oe')) {
    return lower.slice(0, -1) + 'ing';
  }
  // CVC doubling for short verbs: tap -> tapping, drag -> dragging.
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(lower) && lower.length >= 3 && lower.length <= 5) {
    return lower + lower.slice(-1) + 'ing';
  }
  return lower + 'ing';
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}
