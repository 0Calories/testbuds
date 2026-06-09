import { runSteelTest } from './steel-client.js';

async function main() {
	runSteelTest();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
