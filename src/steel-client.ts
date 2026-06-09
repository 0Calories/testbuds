import Steel from 'steel-sdk';

const apiKey = process.env.STEEL_API_KEY;

if (!apiKey) {
	throw new Error(
		'STEEL_API_KEY is not set —check --env-file ordering / .env.local',
	);
}

const client = new Steel({
	steelAPIKey: apiKey,
});

async function main() {
	const session = await client.sessions.create();
	console.log('Session created:', session.id);
	console.log(`View live session at: ${session.sessionViewerUrl}`);

	await client.sessions.release(session.id);
	console.log('Session released');
}

main().catch(console.error);
