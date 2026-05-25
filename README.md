<div align="center">

<img src="app/icon.svg" width="96" alt="Testbuds">

# Testbuds

### Real customer feedback. Before the customer.

Synthetic customers that **actually use your product** — as a specific persona — and tell you what real customers think but never email you about.

<br>

<a href="https://www.youtube.com/watch?v=Vz18MEg2En8">
  <img src="https://img.youtube.com/vi/Vz18MEg2En8/maxresdefault.jpg" alt="Watch the 3-minute demo" width="720">
</a>

<sub>Watch the 3-minute demo</sub>

</div>

---

## The problem

Real customer research costs **~$200 a session** and takes **two weeks** to schedule. Most founders skip it, ship blind, and lose customers they never see leaving.

## What you get

Pick a persona. Point it at a URL — your landing page, or your live product behind a login. Eight minutes later, you get:

- **A verdict** — `would_buy`, `would_investigate`, or `would_bail`
- **A ranked friction list** — each item carries the persona's own quoted reaction, the screen it happened on, and a severity

> **Verdict:** would_bail (confidence 0.82)
>
> 1. **Pricing locked behind "contact sales"** · *high*
>    *"I'm out — I shouldn't have to book a call just to learn the basics."*
> 2. **Hero doesn't say what the product does** · *high*
>    *"I scrolled the hero twice and still couldn't tell what this is for."*
> 3. **No reward feedback after a habit check-in** · *medium*
>    *"I logged it, but where's the streak? It just… moved on."*

## The personas

| **B2C** | **B2B** |
|---|---|
| Skeptical Bargain-Hunter | Time-Poor Evaluator |
| Overwhelmed Switcher | Technical Gatekeeper (CTO) |
| Goal-Driven Self-Improver | ROI-Driven Buyer |
| Distracted Mobile Browser | Internal Champion |

Each persona has motivations, pain points, decision criteria, and a patience budget. They behave like the customer — not like a helpful AI trying to complete a task.

> [!NOTE]
> **The thing surveys miss.** Customers in surveys tell you what they *would* do. Testbuds shows you what they *actually do* once inside your product — the gap between stated and revealed preference.

## Why it's different

- **It uses the real product.** Not just the landing page. Give it test credentials and it logs in.
- **It bails when a real customer would bail.** "Sign up" is never a forced outcome — leaving is a valid one.
- **It quotes itself.** Every friction item ships with the persona's own words, not generic UX advice.

## vs. traditional research

|  | Real moderated session | Testbuds |
|---|---|---|
| Cost per customer | ~$200 | **~$1.40** |
| Time to results | 1–2 weeks | **8 minutes** |
| Personas covered | 1 panel, by demographic | **8 archetypes, on demand** |
| Behind a login | Sometimes | **Any URL, free or paid** |

## How it works

The persona's identity, motivations, and decision criteria are compiled into the AI agent's instructions. The agent then drives a real browser on your real product — seeing the page through vision and the accessibility tree — and narrates in character at each step. A final pass over the transcript synthesizes the verdict and the quoted friction list.

## Run it

```bash
pnpm install   # set ANTHROPIC_API_KEY, BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID in .env
pnpm dev       # web UI at http://localhost:3000
```

Or from the CLI:

```bash
pnpm run testbuds run \
  --persona skeptical-bargain-hunter \
  --url https://your-product.com \
  --goal "Decide whether to sign up."
```

---

<div align="center">
<sub>Makers Lounge 2026 Innovation Hackathon · Track 03 · Synthetic Customers</sub>
</div>
