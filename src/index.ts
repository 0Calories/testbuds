import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

async function main() {
	const stagehand = new Stagehand({
		env: 'LOCAL',
		model: 'anthropic/claude-sonnet-4-6',
		localBrowserLaunchOptions: {
			headless: false, // Show browser window
			devtools: true, // Open developer tools
			viewport: { width: 1280, height: 720 },
		},
	});

	await stagehand.init();
	const page = stagehand.context.pages()[0];

	await page.goto('https://gethibana.com');

	// Act on the page
	await stagehand.act('Click the login button');

	// Extract structured data
	const pageText = await stagehand.extract();

	console.log(pageText);
	await stagehand.close();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
