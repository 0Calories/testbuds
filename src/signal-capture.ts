import type { MechanicalEvent, RunEvent } from './interaction-contract.js';

/** The evidence layer recorded from a Run's event stream. */
export interface CapturedTrace {
	mechanical: MechanicalEvent[];
}

/** Consumes an Interaction event stream into a CapturedTrace. */
export async function consume(
	stream: AsyncIterable<RunEvent>,
): Promise<CapturedTrace> {
	const mechanical: MechanicalEvent[] = [];
	for await (const event of stream) {
		if (event.type === 'mechanical') {
			mechanical.push(event);
		}
	}
	return { mechanical };
}
