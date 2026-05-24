import 'dotenv/config';
import { Command } from 'commander';
import { getPersona, personaLibrary } from './persona/library';

const program = new Command();

program
  .name('testbuds')
  .description('Run a synthetic customer against a product and print a verdict.');

program
  .command('personas')
  .description('List available personas.')
  .action(() => {
    for (const p of personaLibrary) {
      console.log(`${p.slug}  (${p.segment})  — ${p.name}, ${p.identity.role}`);
    }
  });

program
  .command('run')
  .description('Start a persona run via the worker. Watch the run live at http://localhost:3000/runs/<id>.')
  .requiredOption('--persona <slug>', 'persona slug (see `testbuds personas`)')
  .requiredOption('--url <url>', 'target URL to test')
  .requiredOption('--goal <goal>', 'plain-language goal for the persona')
  .option('--viewport <mode>', 'desktop or mobile', 'desktop')
  .action(async (opts) => {
    const persona = getPersona(opts.persona);
    if (!persona) {
      console.error(`Unknown persona "${opts.persona}". Run \`testbuds personas\` to list them.`);
      process.exit(1);
    }

    const workerUrl = process.env.WORKER_HTTP_URL ?? 'http://localhost:5174';
    const res = await fetch(`${workerUrl}/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personaSlug: opts.persona,
        targetUrl: opts.url,
        goal: opts.goal,
        viewport: opts.viewport === 'mobile' ? 'mobile' : 'desktop',
      }),
    }).catch(() => null);

    if (!res || !res.ok) {
      console.error('Worker offline. Start it with `pnpm worker`.');
      process.exit(1);
    }

    const { run } = (await res.json()) as { run: { id: string } };
    console.log(`Run started: http://localhost:3000/runs/${run.id}`);
  });

program.parseAsync().catch((err) => {
  console.error('Run failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
