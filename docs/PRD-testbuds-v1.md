# PRD: Testbuds v1 — Persona-driven UX/accessibility feedback (local-first)

> Domain language: see [CONTEXT.md](../CONTEXT.md). Architecture & module contracts: see
> [ARCHITECTURE.md](../ARCHITECTURE.md). Rationale: [ADR-0001](../docs/adr/0001-modular-architecture-deferred-tech.md),
> [ADR-0002](../docs/adr/0002-persona-wedge-and-validity-stance.md).

## Problem Statement

Getting real user feedback on an app is expensive, slow, and often impossible at the early
stage — exactly when it's most needed. A solo developer, indie hacker, or PM building a
product frequently has no users yet, so usability problems (friction, dead-ends,
discoverability gaps, accessibility barriers) go undiscovered until after launch. Existing AI
options either (a) roleplay as sycophantic "users" that hallucinate praise or friction with no
grounding, or (b) are crowded natural-language E2E test runners that answer "did it pass?" but
never "does this flow actually work *and feel right* for a real person?"

## Solution

Testbuds is a **local-first** tool that runs AI agents ("Buds") through a developer's app as
simulated users and returns **trustworthy, evidence-grounded usability feedback**. The
developer runs `npx testbuds`, which opens a local web **Dashboard**; they point a Bud at a
**Target** (their app on localhost/staging, inheriting their real auth session — no credential
storage), describe a **Flow Spec** (a goal + optional hints), and watch a quirky green Bud
character navigate and react in real time. The Bud's behavior is governed by **Calibration**:
**Capability traits** (Perception Mode, patience budget, input method) deliberately handicap
the otherwise-superhuman model toward a target human's limits, while **Disposition traits**
(goals, mood, voice) add character. Each Run produces a durable **Run Artifact** —
confidence-tagged, evidence-linked **Findings**, a step-by-step **Replay**, and a **Synthesis
Report** with ranked friction and action items. Testbuds is positioned honestly as a fast
first-pass that surfaces candidate friction to investigate, not a replacement for real user
testing.

## User Stories

1. As an indie developer with no users yet, I want an AI agent to walk through my signup flow, so that I can find friction before real users hit it.
2. As a developer, I want to run Testbuds locally against `localhost`, so that I can test pre-release builds that aren't deployed anywhere.
3. As a developer, I want the Bud to inherit my already-authenticated session, so that it can test flows behind login without me storing test credentials anywhere.
4. As a developer, I want a one-time login handoff that Testbuds reuses, so that I don't re-authenticate on every Run.
5. As a developer, I want to describe a Flow as a plain-language goal (e.g. "start tracking time on a task"), so that I don't have to script selectors.
6. As a developer, I want to optionally add soft step-hints to a Flow, so that I can steer the Bud toward a known path without forcing it.
7. As a developer running in Persona mode, I want the Bud to improvise the path from the goal, so that I learn whether the feature is *discoverable*, not just whether it works when guided.
8. As a developer, I want the Bud to log when it deviates from my hints, so that deviations become discoverability Findings.
9. As a product manager, I want to pick a pre-made Bud Costume that matches my target user, so that I get relevant feedback without configuring traits.
10. As a developer, I want to tweak individual Capability traits (Perception Mode, patience budget, input method), so that the Bud mechanically behaves like a specific user type.
11. As a developer, I want to tweak Disposition traits (goals, domain familiarity, mood, voice) and add custom instructions, so that I can simulate a specific persona's attitude.
12. As an accessibility-conscious developer, I want an a11y-only Perception Mode Bud, so that I can find barriers a screen-reader user would hit.
13. As a developer, I want a vision Perception Mode Bud, so that I can find issues a sighted low-tech user would hit (low contrast, poor visual hierarchy).
14. As a developer, I want a DOM-hybrid Perception Mode Bud, so that I can simulate a power user who navigates structure efficiently.
15. As a developer, I want to watch the Bud character react live with expressions, so that I can see at a glance where it struggles or succeeds.
16. As a developer, I want the Bud's facial expression to be driven by its actual mechanical state (confused when stuck), so that the reactions are evidence, not theatrics.
17. As a developer, I want a live step timeline during a Run, so that I can follow what the Bud perceived and did at each step.
18. As a developer, I want each Finding to carry the evidence behind it (what mechanically happened), so that I can trust it isn't hallucinated.
19. As a developer, I want each Finding to carry a confidence level, so that I can prioritize which to investigate.
20. As a developer, I want a Finding when the Bud could not perceive a target in its Perception Mode (`perception_miss`), so that I catch accessibility gaps mechanically.
21. As a developer, I want a Finding when the Bud backtracked or retried repeatedly, so that I catch confusing navigation.
22. As a developer, I want a Finding when the Bud blew its patience budget or gave up, so that I catch flows that are too long or unclear.
23. As a developer, I want a Finding when the app showed an error or dead-end, so that I catch broken paths.
24. As a developer, I want a Synthesis Report ranking the top friction with concrete action items, so that I know what to fix first.
25. As a developer, I want to click a Finding and jump to that exact moment in the Replay, so that I can see the friction in context.
26. As a developer, I want every Run saved as a durable artifact on disk, so that I can revisit it later.
27. As a developer, I want to re-open a past Run Artifact in the Dashboard, so that I can review Findings and Replay after the fact.
28. As a developer, I want to bring my own LLM API key, so that I control cost and have no dependence on a Testbuds-hosted service.
29. As a developer, I want a sensible default model (Claude Sonnet 4.6) with the option to swap, so that it works out of the box but stays flexible.
30. As a cost-conscious developer, I want a per-Run cost estimate derived from Perception Mode × step budget before I run, so that I avoid surprises.
31. As a developer, I want a cheap a11y-text-only Run option, so that I can run many sessions inexpensively.
32. As a developer, I want the patience/step budget to hard-cap a Run, so that cost and runtime are bounded.
33. As an open-source user, I want the core to be permissively licensed and runnable entirely locally, so that I can self-host and contribute without copyleft concerns.
34. As a developer, I want Testbuds to fail loudly if I request a trait the current adapter can't support (e.g. vision on an adapter that can't screenshot), so that I'm never silently misled.
35. As a future user, I want the architecture to support mobile and desktop Targets later, so that my investment isn't web-only forever.
36. As a contributor, I want tech choices (browser/agent libraries, storage, model) isolated behind ports, so that I can swap them as the space evolves.
37. As a developer, I want to run the same Flow Spec later as a deterministic CI test (Assertion mode), so that today's persona Flow becomes tomorrow's regression test without rewriting it.
38. As a developer, I want to compare how different Buds experienced the same Flow (cross-Bud consolidation), so that I can build a prioritized action plan — acknowledged as a fast-follow, not v1.

## Implementation Decisions

**Architecture (per ADR-0001).** Stable hand-written domain core; volatile tech behind ports;
v1 ships a single fused **web** Interaction adapter with a Surface-neutral outer boundary; the
Surface swap-seam is deferred. Single-language **TypeScript**; local web Dashboard in React.

**Modules and their interfaces** (no file paths — see ARCHITECTURE.md):
- **Bud Model** — `resolve(budDef) → BudConfig`. Merges Base Bud + Capability traits +
  Disposition traits + Costume into a declarative, Surface-neutral Bud config carrying
  perception mode, budgets, allowed inputs, disposition prompt, and Calibration constraints.
- **Flow Spec** — `parse(text) → { goal, hints[], mode }`. Mode-aware; Persona mode treats
  hints as soft.
- **Interaction module** (web adapter) — `interact({ budConfig, flowSpec, mode, target }) →
  (event stream + result)`. **Owns the per-step agent loop** and faithfully executes the
  declarative Bud config. Advertises a **Capabilities descriptor** for pre-Run validation.
  Emits a Surface-neutral event stream: `perceived | intent | action | outcome | mechanical |
  reaction | milestone`. Target is an opaque, surface-tagged `{ surface, entry, auth }` handle.
- **Signal Capture** — `consume(eventStream) → CapturedTrace`. Records actions, perception
  snapshots, timings, and Mechanical events as the evidence layer.
- **Findings Engine** — `analyze(trace) → Finding[]`. Maps Mechanical events → confidence-
  tagged, evidence-linked Findings (`type, severity, confidence, stepRef, evidence, commentary,
  optional fix`); applies Calibration + heuristics (WCAG/Nielsen).
- **Run Artifact** — durable record + projections `toReport()`, `toReplay()`.
- **Run Orchestrator** — `run(bud, flow, target) → Artifact`. Validates Bud config against the
  adapter's Capabilities, wires Interaction + Signal Capture, fan-in to Findings Engine.
- **Ports:** **Model Provider** (BYO-key, model-agnostic, vision-capable; default Claude
  Sonnet 4.6) and **Artifact Store** (local filesystem in v1; cloud adapter is the hosted-tier
  seam).
- **Dashboard** — subscribes to the live event stream; renders Bud reactions/expressions, step
  timeline, and the Run Artifact viewer.

**Normalized vocabularies** (must not leak web specifics): `Element` (adapter-assigned id, ARIA-
like role, name/value/state/bounds), `Action` (`point|input|scroll|gesture|key|navigate|wait|
finish`), `Mechanical` event taxonomy (`deviation, backtrack, repeat_attempt, search_thrash,
perception_miss, stuck, budget_exceeded, error_state, gave_up, goal_achieved`).

**Validity (per ADR-0002).** Calibration handicaps the model toward human limits; Findings are
confidence + evidence tagged; honest "first-pass, not a replacement" positioning.

**Auth.** One-time login handoff persisted as reusable session state; no raw credential
storage. Bud inherits a real session for behind-login Targets.

## Testing Decisions

**What makes a good test here:** assert *external behavior* through a module's interface, not
its internals. The deep-module payoff is that the Interaction boundary is a clean event-stream
contract — so everything downstream is testable with a **scripted event stream**, no real
browser or LLM required.

**Modules to test (confirmed with the developer):**
- **All pure domain modules** — unit-tested in isolation, no browser/LLM:
  - *Bud Model:* given a Bud definition (base + traits + costume), `resolve()` returns the
    expected declarative Bud config (perception mode, budgets, constraints, disposition prompt).
  - *Flow Spec:* `parse()` extracts goal + hints + mode from plain-language input, including
    "goal only" and "goal + hints" cases.
  - *Signal Capture:* given a scripted event stream, `consume()` produces the expected
    CapturedTrace (correct Mechanical events recorded with step refs).
  - *Findings Engine:* given a CapturedTrace containing known Mechanical events (esp.
    `perception_miss`, `stuck`, `backtrack`, `budget_exceeded`), `analyze()` returns Findings of
    the right type/severity/confidence with evidence attached; LLM synthesis is mocked.
  - *Run Artifact:* `toReport()` / `toReplay()` produce correct projections from a known
    artifact (ranking, action items, step-linked replay references).
- **Run Orchestrator (fake adapter):** wire a Run with a **fake Interaction adapter** that emits
  a scripted event stream, assert the produced Run Artifact is correct end-to-end (proves the
  whole pipe minus real browser/LLM), and assert it rejects a Bud config the fake adapter's
  Capabilities descriptor doesn't support.
- **Port contract tests:** Model Provider and Artifact Store, exercised against local/mock
  adapters so future swaps are safe (e.g. save-then-load round-trips an Artifact; Model Provider
  honors the model-agnostic interface).

**Deferred:** the **Interaction web adapter** integration test against a fixture app (real
browser + LLM, asserting Mechanical events including `perception_miss` fire correctly) — valuable
but slow; deferred until the pure pipe is proven (substance-first).

**Prior art:** none yet (greenfield repo). Establish the scripted-event-stream fixture as the
shared test harness for all downstream modules.

## Out of Scope

- **Assertion mode** (deterministic, self-healing CI test execution) — the Flow Spec and Run
  Artifact are designed to support it, but v1 ships **Persona mode** only.
- **Mobile-native and desktop Surfaces** — boundary kept Surface-neutral; **no** non-web adapter
  is built in v1.
- **Cross-Bud consolidation** (running one Flow across multiple Buds → merged action plan) —
  fast-follow; v1 is single-Bud.
- **Hosted/SaaS tier** — scheduled Runs, history aggregation, managed credits, cloud Artifact
  Store; deferred behind the Artifact Store + Orchestrator seams.
- **browser-use "deep persona explorer" plugin** — documented future adapter behind the
  Decision Engine; not built (avoids the AGPL `workflow-use` trap and Python sidecar).
- **Managed LLM key / billing** — v1 is BYO-key only.
- **Full character animation polish** — v1 ships a functional, expressive Bud avatar; richer
  animation follows once the signal is proven.

## Further Notes

- **Substance-first** is the v1 discipline: trustworthy evidence-grounded Findings + working
  local-auth on a real app + a functional Dashboard, before brand/animation depth.
- **Brand as credibility:** the cute green leaf-sprout Buds' expressions are driven by grounded
  Mechanical state, so delight reinforces trust rather than undermining it.
- **`perception_miss` is the flagship signal** — the highest-trust, mechanically-detected
  accessibility gap, and a key differentiator versus generic "AI roleplays a user" tools.
- **Honest positioning is load-bearing**, not marketing softness: never claim to replace real
  user testing.
