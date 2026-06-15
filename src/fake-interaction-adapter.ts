import type {
	Capabilities,
	InteractionAdapter,
	InteractionRun,
	RunEvent,
	RunInvocation,
	RunResult,
} from './interaction-contract.js';
import { streamOf } from './scripted-stream.js';

/** A scripted Run: the events to emit and the result to report. */
export interface ScriptedRun {
	events: RunEvent[];
	result: RunResult;
}

/**
 * Interaction adapter that replays a scripted Run — no browser, no LLM.
 * Exercises the whole pipe downstream of the Interaction boundary.
 */
export class FakeInteractionAdapter implements InteractionAdapter {
	readonly capabilities: Capabilities = {
		surface: 'web',
		perceptionModes: ['a11y', 'vision', 'hybrid'],
		inputs: ['point', 'input', 'scroll', 'key'],
		canScreenshot: false,
		liveView: false,
	};

	constructor(private readonly script: ScriptedRun) {}

	interact(_invocation: RunInvocation): InteractionRun {
		return {
			events: streamOf(this.script.events),
			result: Promise.resolve(this.script.result),
		};
	}
}
