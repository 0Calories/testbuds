import type { Finding } from './findings-engine.js';
import type { BudConfig, Mode, RunResult } from './interaction-contract.js';
import type { CapturedTrace } from './signal-capture.js';

/**
 * The durable, structured record of a Run: Findings (source of truth),
 * the captured evidence trace, and run metadata.
 */
export interface RunArtifact {
	runId: string;
	result: RunResult;
	findings: Finding[];
	trace: CapturedTrace;
	metadata: {
		budConfig: BudConfig;
		mode: Mode;
	};
}
