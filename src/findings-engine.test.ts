import { describe, expect, it } from 'vitest';
import { analyze } from './findings-engine.js';
import type { CapturedTrace } from './signal-capture.js';

describe('Findings Engine', () => {
	it('does not surface goal_achieved as a Finding — the run result already records it', () => {
		const trace: CapturedTrace = {
			mechanical: [
				{
					type: 'mechanical',
					stepRef: 2,
					kind: 'error_state',
					confidence: 'high',
				},
				{
					type: 'mechanical',
					stepRef: 5,
					kind: 'goal_achieved',
					confidence: 'high',
				},
			],
		};

		const findings = analyze(trace);

		expect(findings).toEqual([
			{
				type: 'dead-end',
				severity: 'high',
				confidence: 'high',
				stepRef: 2,
				evidence: trace.mechanical[0],
			},
		]);
	});

	it('maps an error_state Mechanical event to a dead-end Finding with evidence attached', () => {
		const trace: CapturedTrace = {
			mechanical: [
				{
					type: 'mechanical',
					stepRef: 3,
					kind: 'error_state',
					confidence: 'high',
					detail: 'Error banner appeared after submit',
				},
			],
		};

		const findings = analyze(trace);

		expect(findings).toEqual([
			{
				type: 'dead-end',
				severity: 'high',
				confidence: 'high',
				stepRef: 3,
				evidence: trace.mechanical[0],
			},
		]);
	});
});
