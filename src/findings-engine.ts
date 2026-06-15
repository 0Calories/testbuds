import type {
	Confidence,
	MechanicalEvent,
	MechanicalKind,
} from './interaction-contract.js';
import type { CapturedTrace } from './signal-capture.js';

/**
 * A single surfaced result from a Run, grounded in observable run
 * evidence (a Mechanical event), never only the Bud's opinion.
 */
export interface Finding {
	type: 'friction' | 'dead-end' | 'a11y-gap' | 'confusion';
	severity: 'low' | 'medium' | 'high';
	confidence: Confidence;
	stepRef: number;
	evidence: MechanicalEvent;
}

/** How each Mechanical kind surfaces as a Finding. Unmapped kinds are not surfaced yet. */
const FINDING_RULES: Partial<
	Record<MechanicalKind, Pick<Finding, 'type' | 'severity'>>
> = {
	error_state: { type: 'dead-end', severity: 'high' },
};

/** Maps the Mechanical events in a CapturedTrace to Findings. */
export function analyze(trace: CapturedTrace): Finding[] {
	const findings: Finding[] = [];
	for (const event of trace.mechanical) {
		const rule = FINDING_RULES[event.kind];
		if (rule) {
			findings.push({
				...rule,
				confidence: event.confidence,
				stepRef: event.stepRef,
				evidence: event,
			});
		}
	}
	return findings;
}
