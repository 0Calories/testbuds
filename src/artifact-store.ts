import type { RunArtifact } from './run-artifact.js';

/**
 * Port for persisting Run Artifacts. v1 adapter is the local
 * filesystem; a cloud adapter is the future hosted-tier seam.
 */
export interface ArtifactStore {
	/** Persists the artifact and returns a ref it can be loaded by. */
	save(artifact: RunArtifact): Promise<string>;
	load(ref: string): Promise<RunArtifact>;
}
