import { pathToFileURL } from 'node:url';
import { demoInvocation, demoScript } from './demo-run.js';
import { FakeInteractionAdapter } from './fake-interaction-adapter.js';
import { FsArtifactStore } from './fs-artifact-store.js';
import { run } from './run-orchestrator.js';

export interface CliOptions {
	baseDir?: string;
	out?: (line: string) => void;
}

/** Runs the scripted demo Run end-to-end and prints the artifact path. */
export async function main({
	baseDir = '.testbuds/runs',
	out = console.log,
}: CliOptions = {}): Promise<void> {
	const adapter = new FakeInteractionAdapter(demoScript);
	const store = new FsArtifactStore(baseDir);
	const { ref } = await run(demoInvocation, { adapter, store });
	out(ref);
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
