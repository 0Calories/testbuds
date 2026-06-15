import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FsArtifactStore } from './fs-artifact-store.js';
import type { RunArtifact } from './run-artifact.js';

describe('ArtifactStore port contract (fs adapter)', () => {
	it('round-trips a Run Artifact through save then load', async () => {
		const baseDir = await mkdtemp(join(tmpdir(), 'testbuds-'));
		const store = new FsArtifactStore(baseDir);
		const artifact: RunArtifact = {
			runId: 'run-001',
			result: { outcome: 'achieved' },
			findings: [
				{
					type: 'dead-end',
					severity: 'high',
					confidence: 'high',
					stepRef: 3,
					evidence: {
						type: 'mechanical',
						stepRef: 3,
						kind: 'error_state',
						confidence: 'high',
					},
				},
			],
			trace: {
				mechanical: [
					{
						type: 'mechanical',
						stepRef: 3,
						kind: 'error_state',
						confidence: 'high',
					},
				],
			},
			metadata: { budConfig: { perceptionMode: 'hybrid' }, mode: 'persona' },
		};

		const ref = await store.save(artifact);
		const loaded = await store.load(ref);

		expect(loaded).toEqual(artifact);
	});
});
