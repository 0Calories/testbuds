import { describe, expect, it } from 'vitest';
import type { RunEvent } from './interaction-contract.js';
import { streamOf } from './scripted-stream.js';
import { consume } from './signal-capture.js';

describe('Signal Capture', () => {
	it('records Mechanical events with their step refs from the event stream', async () => {
		const events: RunEvent[] = [
			{
				type: 'perceived',
				stepRef: 1,
				elements: [{ id: 'el-1', role: 'button', name: 'Submit' }],
			},
			{
				type: 'action',
				stepRef: 1,
				action: { type: 'point', targetId: 'el-1', reason: 'Submit the form' },
			},
			{
				type: 'mechanical',
				stepRef: 1,
				kind: 'error_state',
				confidence: 'high',
				detail: 'Error banner appeared after submit',
			},
			{
				type: 'mechanical',
				stepRef: 2,
				kind: 'goal_achieved',
				confidence: 'high',
			},
		];

		const trace = await consume(streamOf(events));

		expect(trace.mechanical).toEqual([
			{
				type: 'mechanical',
				stepRef: 1,
				kind: 'error_state',
				confidence: 'high',
				detail: 'Error banner appeared after submit',
			},
			{
				type: 'mechanical',
				stepRef: 2,
				kind: 'goal_achieved',
				confidence: 'high',
			},
		]);
	});
});
