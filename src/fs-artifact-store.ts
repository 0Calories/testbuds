import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ArtifactStore } from './artifact-store.js';
import type { RunArtifact } from './run-artifact.js';

/** Local-filesystem Artifact Store: one JSON file per Run. */
export class FsArtifactStore implements ArtifactStore {
	constructor(private readonly baseDir: string) {}

	async save(artifact: RunArtifact): Promise<string> {
		await mkdir(this.baseDir, { recursive: true });
		const ref = join(this.baseDir, `${artifact.runId}.json`);
		await writeFile(ref, JSON.stringify(artifact, null, '\t'));
		return ref;
	}

	async load(ref: string): Promise<RunArtifact> {
		return JSON.parse(await readFile(ref, 'utf8')) as RunArtifact;
	}
}
