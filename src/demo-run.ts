import type { ScriptedRun } from './fake-interaction-adapter.js';
import type { RunInvocation } from './interaction-contract.js';

/**
 * The canonical scripted demo Run: a Bud signs up, hits an unexplained
 * validation error, recovers, and reaches the goal. Drives the CLI
 * walking skeleton and is reusable as a test fixture.
 */
export const demoScript: ScriptedRun = {
	events: [
		{
			type: 'perceived',
			stepRef: 1,
			elements: [
				{ id: 'el-1', role: 'textfield', name: 'Email' },
				{ id: 'el-2', role: 'button', name: 'Sign up' },
			],
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
			type: 'action',
			stepRef: 2,
			action: {
				type: 'point',
				targetId: 'el-2',
				reason: 'Submit the signup form',
			},
		},
		{ type: 'outcome', stepRef: 2, success: false },
		{
			type: 'mechanical',
			stepRef: 2,
			kind: 'error_state',
			confidence: 'high',
			detail: 'Validation error shown with no explanation of what to fix',
		},
		{
			type: 'reaction',
			stepRef: 2,
			utterance: 'Hmm, it says something went wrong but not what…',
			expression: 'confused',
			cause: 'error_state',
		},
		{
			type: 'action',
			stepRef: 3,
			action: {
				type: 'point',
				targetId: 'el-2',
				reason: 'Retry submitting the form',
			},
		},
		{ type: 'outcome', stepRef: 3, success: true },
		{
			type: 'mechanical',
			stepRef: 3,
			kind: 'goal_achieved',
			confidence: 'high',
		},
		{
			type: 'reaction',
			stepRef: 3,
			utterance: 'Got there in the end!',
			expression: 'happy',
			cause: 'goal_achieved',
		},
		{ type: 'milestone', stepRef: 3, kind: 'goal_achieved' },
	],
	result: { outcome: 'achieved' },
};

export const demoInvocation: RunInvocation = {
	budConfig: { perceptionMode: 'hybrid', stepBudget: 10 },
	flowSpec: { goal: 'Sign up for an account' },
	mode: 'persona',
	target: { surface: 'web', entry: 'fixture://signup' },
};
