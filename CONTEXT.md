# Testbuds

A local-first tool that runs AI agents ("Buds") through user flows in a developer's
application to surface usability friction, generating realistic simulated user-testing
feedback. An optional hosted layer sells persistence and orchestration on top.

The same plain-language **Flow Spec** can be run in two **Modes**: Persona mode
(qualitative UX/a11y feedback — the v1 wedge) and Assertion mode (deterministic,
self-healing CI test — a later extension). The wedge is the uncontested "agent as
first user" angle; deterministic NL test-running alone is a crowded market.

## Language

**Bud**:
An AI agent that role-plays as a user navigating a Target. A Bud is a Base Bud plus
optional Traits, optionally packaged as a Costume.
_Avoid_: Agent (too generic), bot.

**Base Bud**:
The default Bud — executes a Flow Spec as a plausible generic user (not a script), with
sensible defaults and no special disposition. The "no-fiddling" tier. Has a default
Perception Mode (vision-hybrid).

**Trait**:
A tweakable dial applied on top of a Base Bud. Two kinds:
- **Capability trait** (hard/mechanical): Perception Mode (a11y-only / vision / DOM-hybrid),
  patience/give-up budget, input method. Mechanically changes behavior → reproducible,
  verifiable Findings. This is the trustworthy signal.
- **Disposition trait** (soft/prompt): goals, domain familiarity, mood, voice, custom
  instructions. Shapes interpretation & reactions. Flavor, not source of truth.

**Bud config**:
The resolved, **declarative, Surface-neutral** policy the Bud Model emits and the
Interaction module faithfully executes: Perception Mode, patience/step/time budget, allowed
inputs, disposition prompt, and Calibration constraints. Carries persona+calibration as
*data* so the policy is shared across Surfaces (not reimplemented per adapter). If
calibration ever needs imperative per-step logic, that's the signal the Interaction
boundary has been outgrown.

**Mechanical event**:
A grounded, observable signal emitted by the Interaction module during a Run — the evidence
Findings are built from. Taxonomy: `deviation`, `backtrack`, `repeat_attempt`,
`search_thrash`, `perception_miss`, `stuck`, `budget_exceeded`, `error_state`, `gave_up`,
`goal_achieved`. **`perception_miss`** (a target plausibly exists but not in the Bud's
current Perception Mode) is the highest-trust signal and the mechanically-detected
accessibility gap.

**Perception Mode**:
What a Bud is allowed to perceive — a11y-tree only (≈ screen-reader user), vision/screenshot
(≈ sighted user), or DOM-hybrid (≈ power user). A Capability trait; the single strongest
lever on behavior.

**Costume** (a.k.a. Preset):
A named, branded bundle of Traits + visual identity (e.g. "Grandma Bud" = vision +
low-domain + low-patience). Reduces setup friction and carries the Testbuds brand
(cute green leaf-sprout characters with expressions). A Bud's facial expression is driven
by its grounded behavioral state (e.g. confused face when it mechanically gets stuck), so
brand delight reinforces signal credibility rather than faking it.
_Avoid_: Persona (overloaded — prefer Costume for the preset, Traits for the dials).

**Target**:
The thing under test that a Bud navigates — a flow or surface within an application,
authenticated or public. A Target runs on a **Surface**.
_Avoid_: Site, app (ambiguous about auth boundary), page.

**Surface**:
The platform a Target lives on — **web** (v1), **mobile-native**, or **desktop**. Testbuds
is deliberately not browser-only; the architecture must extend to mobile/desktop without a
rewrite. v1 ships the web Surface only.

**Interaction subsystem**:
The cluster that makes a Bud actually interact with a Target (the "hands" that perceive the
Surface + perform actions, plus the "brain" that decides the next action, watched by Signal
Capture). v1 builds a **single fused web adapter** (internals may freely use web tech —
Stagehand/Playwright — and fuse brain+hands); the Surface swap-seam is **deferred**.
**Guardrail:** web concepts (DOM, CSS selectors, URLs) must NOT leak *out* of the
Interaction module — its outer boundary stays Surface-neutral (steps, actions, perceived
elements, mechanical events, reactions) so adding a mobile/desktop Surface later is an
additive sibling adapter, not a rewrite.
_Avoid_: Browser Runtime (too web-specific — prefer Target Runtime for the future hands port).

**Flow**:
A goal-oriented sequence of steps a Bud attempts within a Target (e.g. sign-up,
checkout, onboarding).
_Avoid_: Journey, scenario.

**Flow Spec**:
The plain-language definition of a Flow: a **goal** plus **optional soft step-hints**.
Persona mode leans goal-first (the Bud improvises the path; deviations from hints are
logged as Findings — the discoverability signal). Assertion mode later reads the same
spec as a strict script. One Flow Spec, runnable in either Mode.

**Mode**:
The lens a Run applies to a Flow Spec. **Persona mode** = qualitative UX/a11y feedback
(non-deterministic, exploratory). **Assertion mode** = deterministic pass/fail CI test
(compile-once, replay LLM-free, heal-on-break). v1 ships Persona mode.

**Finding**:
A single surfaced result from a Run: `{type (friction / dead-end / a11y-gap / confusion),
severity, confidence, step ref, evidence (what mechanically happened), Bud commentary,
optional fix}`. Grounded in observable run evidence, not only the Bud's opinion. The
structured **source of truth** of a Run.
_Avoid_: Issue, bug, insight.

**Calibration** (validity principle):
Frontier models are *superhuman* (glide past real friction → false negatives) and
sometimes *brittle* (stuck for non-human reasons → false positives). Capability traits
deliberately **handicap** the model toward a target human's limits to align Bud-behavior
with user-behavior. Every Finding is confidence-tagged with its evidence. Testbuds is
positioned as a **fast first-pass that surfaces candidate friction to investigate — not a
replacement for real user testing.** Honesty is the positioning, not a weakness.

**Run Artifact**:
The durable, structured output of a Run — Findings + a **Replay** (step-by-step
screenshot/DOM sequence with Bud reactions pinned to each step) + run metadata (Bud
config, Mode, timings). One artifact, three projections: structured Findings (source of
truth) → Replay (linked evidence) → **Synthesis Report** (generated human view with
ranked friction + action items). Built once so the future hosted tier can sync, query,
aggregate, and compare across Runs. v1 is single-Bud; cross-Bud consolidation is a fast-follow.

**Run**:
A single execution of one Bud against one Target+Flow, producing a durable artifact
(reactions, friction points, replay).
_Avoid_: Session (collides with auth session), test.

**Session** (auth):
The real authenticated browser session, owned by the developer, that a Bud inherits to
reach behind-login Targets. Distinct from a **Run**.

## Relationships

- A **Bud** = a **Base Bud** + zero or more **Traits**, optionally bundled as a **Costume**.
- A **Run** executes one **Bud** against one **Target** following one **Flow** (in one **Mode**).
- A **Run** inherits the developer's real auth **Session** when the **Target** is behind login.
- A **Run** produces a durable artifact (reactions + friction findings + replay).

## Flagged ambiguities

- "session" was overloaded: the auth **Session** (credentials/cookies) vs. a **Run**
  (one execution). Resolved: these are distinct.
