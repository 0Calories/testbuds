import { describe, expect, it } from 'vitest';
import { FakeInteractionAdapter } from './fake-interaction-adapter.js';
import type { RunEvent, RunInvocation } from './interaction-contract.js';

const invocation: RunInvocation = {
	budConfig: { perceptionMode: 'hybrid' },
	flowSpec: { goal: 'Sign up for an account' },
	mode: 'persona',
	target: { surface: 'web', entry: 'fixture://signup' },
};

describe('Fake Interaction adapter', () => {
	it('advertises a Capabilities descriptor', () => {
		const adapter = new FakeInteractionAdapter({
			events: [],
			result: { outcome: 'achieved' },
		});

		expect(adapter.capabilities).toEqual({
			surface: 'web',
			perceptionModes: ['a11y', 'vision', 'hybrid'],
			inputs: ['point', 'input', 'scroll', 'key'],
			canScreenshot: false,
			liveView: false,
		});
	});

	it('emits the scripted event stream and then the final run result', async () => {
		const events: RunEvent[] = [
			{
				type: 'perceived',
				stepRef: 1,
				elements: [{ id: 'el-1', role: 'textfield', name: 'Email' }],
			},
			{
				type: 'intent',
				stepRef: 1,
				rationale: 'The email field is the obvious starting point',
				action: {
					type: 'input',
					targetId: 'el-1',
					value: 'bud@example.com',
					reason: 'Fill in email',
				},
			},
			{
				type: 'action',
				stepRef: 1,
				action: {
					type: 'input',
					targetId: 'el-1',
					value: 'bud@example.com',
					reason: 'Fill in email',
				},
			},
			{ type: 'outcome', stepRef: 1, success: true },
			{
				type: 'mechanical',
				stepRef: 1,
				kind: 'goal_achieved',
				confidence: 'high',
			},
			{
				type: 'reaction',
				stepRef: 1,
				utterance: 'That was easy!',
				expression: 'happy',
			},
			{ type: 'milestone', stepRef: 1, kind: 'goal_achieved' },
		];
		const adapter = new FakeInteractionAdapter({
			events,
			result: { outcome: 'achieved' },
		});

		const run = adapter.interact(invocation);
		const received: RunEvent[] = [];
		for await (const event of run.events) {
			received.push(event);
		}

		expect(received).toEqual(events);
		await expect(run.result).resolves.toEqual({ outcome: 'achieved' });
	});
});
