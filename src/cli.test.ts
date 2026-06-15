import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { main } from './cli.js';
import { FsArtifactStore } from './fs-artifact-store.js';

describe('CLI', () => {
	it('runs the scripted demo Run end-to-end and prints the saved artifact path', async () => {
		const baseDir = await mkdtemp(join(tmpdir(), 'testbuds-'));
		const lines: string[] = [];

		await main({ baseDir, out: (line) => lines.push(line) });

		expect(lines).toHaveLength(1);
		const ref = lines[0];
		expect(ref.startsWith(baseDir)).toBe(true);
		const artifact = await new FsArtifactStore(baseDir).load(ref);
		expect(artifact.result.outcome).toBe('achieved');
		expect(artifact.findings.length).toBeGreaterThan(0);
	});
});
