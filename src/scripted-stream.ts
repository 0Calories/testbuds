import type { RunEvent } from './interaction-contract.js';

/**
 * Turns a scripted list of events into the async event stream the
 * Interaction boundary speaks. The shared test harness for every module
 * downstream of the boundary — no real browser or LLM required.
 */
export async function* streamOf(events: RunEvent[]): AsyncGenerator<RunEvent> {
	yield* events;
}
