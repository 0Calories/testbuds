import { randomUUID } from 'node:crypto';
import type { ArtifactStore } from './artifact-store.js';
import { analyze } from './findings-engine.js';
import type {
	InteractionAdapter,
	RunInvocation,
} from './interaction-contract.js';
import type { RunArtifact } from './run-artifact.js';
import { consume } from './signal-capture.js';

export interface RunDeps {
	adapter: InteractionAdapter;
	store: ArtifactStore;
}

/**
 * Wires a Run: Interaction → Signal Capture → Findings Engine →
 * Artifact Store. Returns the artifact and the ref it was saved under.
 */
export async function run(
	invocation: RunInvocation,
	{ adapter, store }: RunDeps,
): Promise<{ artifact: RunArtifact; ref: string }> {
	const interactionRun = adapter.interact(invocation);
	const trace = await consume(interactionRun.events);
	const result = await interactionRun.result;

	const artifact: RunArtifact = {
		runId: randomUUID(),
		result,
		findings: analyze(trace),
		trace,
		metadata: {
			budConfig: invocation.budConfig,
			mode: invocation.mode,
		},
	};

	const ref = await store.save(artifact);
	return { artifact, ref };
}
