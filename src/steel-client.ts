import { Stagehand } from '@browserbasehq/stagehand';
import Steel from 'steel-sdk';

const apiKey = process.env.STEEL_API_KEY;

if (!apiKey) {
	throw new Error(
		'STEEL_API_KEY is not set —check --env-file ordering / .env.local',
	);
}

export async function runSteelTest() {
	const client = new Steel({
		steelAPIKey: apiKey,
	});
	const session = await client.sessions.create({});

	const stagehand = new Stagehand({
		env: 'LOCAL',
		localBrowserLaunchOptions: {
			cdpUrl: `${session.websocketUrl}&apiKey=${apiKey}`,
		},
		model: { modelName: 'anthropic/claude-sonnet-4-6', apiKey },
	});
	await stagehand.init();
}
