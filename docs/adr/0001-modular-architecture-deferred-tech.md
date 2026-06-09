# Modular architecture with tech deferred behind ports

Status: accepted

## Decision

Testbuds is built as **stable, hand-written domain modules** (Bud Model, Flow Spec, Findings
Engine, Run Artifact) with every fast-moving vendor library quarantined behind a **port**
(Interaction, Model Provider, Artifact Store). v1 ships a **single fused web adapter** for the
Interaction module — which **owns the per-step agent loop** and emits a Surface-neutral event
stream — with persona/Calibration supplied as **declarative Bud config**, not adapter code.
The Surface swap-seam (web → mobile → desktop) is **deferred**, but the Interaction module's
outer boundary is kept Surface-neutral so a future Surface is an additive sibling adapter, not
a rewrite. See [ARCHITECTURE.md](../../ARCHITECTURE.md) for the module map and the Interaction
boundary contract.

## Why (and why it's surprising)

The obvious path is "pick Playwright + Stagehand and build directly on them." We rejected
that as the *foundation* because:

- **The browser/agent space is moving fast.** Market research (mid-2026) surveyed Browserbase,
  Steel.dev, Lightpanda, Cloudflare, Vercel `agent-browser`, Browserless, Hyperbrowser,
  browser-use, Stagehand, Playwright MCP, computer-use models, and more — the landscape shifts
  quarter to quarter. Binding the core to one vendor would age badly. Ports make "which
  library" a reversible, per-module decision made later with fresh research.
- **Tech we'd reflexively reach for carries traps.** browser-use's deterministic-replay layer
  (`workflow-use`) is **AGPL-3.0 and alpha** — a copyleft hazard for an open-core product;
  Browserless is SSPL; Lightpanda cannot screenshot (kills vision + "watch the Bud"). These
  only become safe-to-swap behind a port.
- **Cross-Surface ambition.** Testbuds must serve mobile/desktop product owners eventually.
  The accessibility-model–shaped normalized vocabularies (Element / Action / Mechanical event)
  are the cross-platform common denominator; keeping web specifics inside the Interaction
  module is what makes that future cheap.

## Considered options

- **Universal brain + per-Surface hands** (one platform-agnostic Decision Engine, swappable
  Target Runtime): elegant brain-reuse, but forces a vision-first brain and rules out
  DOM-native web tools like Stagehand. Rejected for v1.
- **Per-Surface fused adapters** (each Surface brings its own brain+hands): chosen shape, but
  with the **seam deferred** — v1 builds only the web adapter.
- **Just build on one library, no ports:** fastest start, highest lock-in + license risk.
  Rejected.

## Consequences

- v1 leans on Stagehand's autonomous `agent()` inside the web adapter — pragmatic and fast.
- **Calibration must stay declarative** (perception mode, budgets, thresholds, disposition
  prompt, constraint lists). If it ever needs imperative per-step logic, that is the explicit
  signal the Interaction boundary has been outgrown (revisit toward a shared policy hook).
- The hosted tier is not a separate product — it is a cloud **Artifact Store** adapter (plus a
  scheduled/parallel Run Orchestrator), reusing the same domain core and Dashboard.
