import 'dotenv/config';
import { Command } from 'commander';
import Anthropic from '@anthropic-ai/sdk';
import { StagehandBrowser } from './agent/browser';
import { getPersona, personaLibrary } from './persona/library';
import { executeRun } from './run/runner';
import type { Connection } from './connection/types';

const program = new Command();

program
  .name('testbuds')
  .description('Run a synthetic customer against a product and print a verdict.');

program
  .command('personas')
  .description('List available personas.')
  .action(() => {
    for (const p of personaLibrary) {
      console.log(`${p.slug}  (${p.segment})  — ${p.identity.name}, ${p.identity.role}`);
    }
  });

program
  .command('run')
  .description('Run a persona against a target URL.')
  .requiredOption('--persona <slug>', 'persona slug (see `testbuds personas`)')
  .requiredOption('--url <url>', 'target URL to test')
  .requiredOption('--goal <goal>', 'plain-language goal for the persona')
  .option('--max-steps <n>', 'maximum loop steps', '25')
  .option('--login-url <url>', 'login page URL (enables test-credential mode)')
  .option('--username <username>', 'test account username')
  .option('--password <password>', 'test account password')
  .action(async (opts) => {
    const persona = getPersona(opts.persona);
    if (!persona) {
      console.error(`Unknown persona "${opts.persona}". Run \`testbuds personas\` to list them.`);
      process.exit(1);
    }

    const connection: Connection =
      opts.loginUrl && opts.username && opts.password
        ? { mode: 'test-credential', loginUrl: opts.loginUrl, username: opts.username, password: opts.password }
        : { mode: 'public' };

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    console.log(`\n▶ ${persona.identity.name} is visiting ${opts.url}\n`);

    const result = await executeRun(
      {
        persona,
        connection,
        targetUrl: opts.url,
        goal: opts.goal,
        maxSteps: Number(opts.maxSteps),
        onStep: (step) => {
          const emoji = step.actionResult === 'failed' ? '⚠️ ' : '';
          console.log(`  [${step.index}] ${emoji}${step.reaction.emotion}: ${step.narration}`);
        },
      },
      { anthropic, createBrowser: () => StagehandBrowser.create() },
    );

    console.log(`\n── VERDICT ──`);
    console.log(`Decision:   ${result.verdict.decision} (confidence ${result.verdict.confidence})`);
    console.log(`Highlight:  ${result.verdict.highlight}`);
    console.log(`Summary:    ${result.verdict.summary}`);
    console.log(`\nFriction (${result.verdict.frictionList.length}):`);
    for (const f of result.verdict.frictionList) {
      console.log(`  [${f.severity}] ${f.title} — "${f.evidenceQuote}" (step ${f.stepIndex})`);
    }
    console.log(`\n${result.metadata.stepCount} steps in ${(result.metadata.durationMs / 1000).toFixed(1)}s`);
  });

program.parseAsync().catch((err) => {
  console.error('Run failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
