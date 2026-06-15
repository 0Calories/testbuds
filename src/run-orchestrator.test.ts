import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	FakeInteractionAdapter,
	type ScriptedRun,
} from './fake-interaction-adapter.js';
import { FsArtifactStore } from './fs-artifact-store.js';
import type { RunInvocation } from './interaction-contract.js';
import { run } from './run-orchestrator.js';

const script: ScriptedRun = {
	events: [
		{
			type: 'perceived',
			stepRef: 1,
			elements: [{ id: 'el-1', role: 'button', name: 'Sign up' }],
		},
		{
			type: 'action',
			stepRef: 1,
			action: {
				type: 'point',
				targetId: 'el-1',
				reason: 'Open the signup form',
			},
		},
		{ type: 'outcome', stepRef: 1, success: true },
		{
			type: 'mechanical',
			stepRef: 2,
			kind: 'error_state',
			confidence: 'high',
			detail: 'Validation error with no explanation',
		},
		{
			type: 'mechanical',
			stepRef: 3,
			kind: 'goal_achieved',
			confidence: 'high',
		},
		{ type: 'milestone', stepRef: 3, kind: 'goal_achieved' },
	],
	result: { outcome: 'achieved' },
};

const invocation: RunInvocation = {
	budConfig: { perceptionMode: 'hybrid', stepBudget: 10 },
	flowSpec: { goal: 'Sign up for an account' },
	mode: 'persona',
	target: { surface: 'web', entry: 'fixture://signup' },
};

describe('Run Orchestrator', () => {
	it('runs a scripted Run end-to-end and persists a correct Run Artifact', async () => {
		const adapter = new FakeInteractionAdapter(script);
		const store = new FsArtifactStore(
			await mkdtemp(join(tmpdir(), 'testbuds-')),
		);

		const { artifact, ref } = await run(invocation, { adapter, store });

		expect(artifact.result).toEqual({ outcome: 'achieved' });
		expect(artifact.trace.mechanical).toEqual([
			script.events[3],
			script.events[4],
		]);
		expect(artifact.findings).toEqual([
			{
				type: 'dead-end',
				severity: 'high',
				confidence: 'high',
				stepRef: 2,
				evidence: script.events[3],
			},
		]);
		expect(artifact.metadata).toEqual({
			budConfig: invocation.budConfig,
			mode: 'persona',
		});
		await expect(store.load(ref)).resolves.toEqual(artifact);
	});
});
