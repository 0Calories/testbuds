# Testbuds

Synthetic customers that actually use your product. A user picks a persona (e.g. *Skeptical Bargain-Hunter*, *Time-Poor Evaluator*), points it at a real URL, and an agentic AI navigates the live product as that customer — thinking aloud — then returns a verdict (`would_buy` / `would_investigate` / `would_bail`) and a ranked list of friction points quoted in the persona's own voice.

## How it works

Runs use Stagehand's `agent()` on a Browserbase hosted browser (`mode: 'hybrid'`, vision + ARIA) with two custom AI SDK tools — `react` (persona shares an in-character thought when something is worth saying) and `finish` (persona ends the run in character). Per-step output is captured into a `Step` transcript; a final Opus pass over that transcript synthesizes the verdict + friction list. The persona's identity, motivations, and decision criteria are compiled into Stagehand's `<customInstructions>` block.

## Personas

Six archetypes seeded in `src/persona/library.ts`:

- **B2C** — Skeptical Bargain-Hunter · Goal-Driven Self-Improver · Distracted Mobile Browser
- **B2B** — Time-Poor Evaluator · Technical Gatekeeper (CTO) · ROI-Driven Buyer

## Run it

Testbuds is a two-process app: a Next.js UI (port 3000) and a worker (port 5174) that owns Chromium + the Stagehand agent.

```bash
pnpm install
# .env: ANTHROPIC_API_KEY (Browserbase keys no longer needed)

pnpm exec playwright install chromium   # first time only

pnpm run testbuds personas              # list personas

# Start both processes:
pnpm dev:all
# ...or two terminals:
#   pnpm worker
#   pnpm dev

# Start a run from the CLI (browser still needed to watch the live view):
pnpm run testbuds run --persona skeptical-bargain-hunter \
                      --url https://example.com \
                      --goal "Decide whether to sign up."

pnpm test          # unit tests
pnpm run typecheck # tsc --noEmit
```
