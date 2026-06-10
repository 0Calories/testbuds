# Testbuds Architecture

This is the first-read reference for how Testbuds is structured. It describes the system as
**modules with stable contracts**, deliberately quarantining fast-moving tech choices behind
ports. For domain language (Bud, Trait, Finding, Surface, …) see [CONTEXT.md](./CONTEXT.md).
For the rationale behind these choices see [docs/adr/](./docs/adr/).

## Design principles

1. **Stable domain core, volatile tech at the edges.** The browser/agent space moves fast.
   Pure product logic (Buds, Findings, Calibration) is hand-written and stable; every vendor
   library lives behind a port as a swappable adapter.
2. **v1 is web-only, but never browser-*shaped*.** Targets run on a **Surface** (web today;
   mobile-native and desktop later). The system above the Interaction module speaks a
   Surface-neutral vocabulary so adding a Surface is an additive adapter, not a rewrite.
3. **Trust before delight (substance-first).** Findings are grounded in observable run
   evidence and confidence-tagged. Brand/character polish layers on top of a trustworthy
   signal, never substitutes for it.
4. **Local-first core, hosted tier as an adapter.** The OSS tool runs entirely on the
   developer's machine. The future paid tier (persistence, scheduling, aggregation) plugs in
   via the Artifact Store port — it is not a separate product.

## Module map

### ① Stable domain core — pure logic, no vendor tech (the moat)

| Module | Responsibility |
|---|---|
| **Bud Model** | Defines a Bud: Base Bud + Capability traits + Disposition traits + Costume → emits a resolved, declarative **Bud config**. |
| **Flow Spec** | Authors/parses a Flow: a goal + optional soft step-hints. Mode-aware (Persona now / Assertion later). |
| **Findings Engine** | Turns captured run signals into structured, confidence-tagged, evidence-linked **Findings**. Applies the Calibration principle + heuristics (WCAG / Nielsen). |
| **Run Artifact** | The durable record (Findings + Replay + metadata) and its projections: Synthesis Report, Replay. |

### ② Interaction — v1 single fused **web** adapter; Surface swap-seam deferred

| Module | Responsibility |
|---|---|
| **Interaction module** | Makes a Bud actually interact with a Target. Owns the per-step agent loop and emits a Surface-neutral event stream. Internals may freely use web tech (Stagehand / Playwright) and fuse "brain" + "hands". **Calibration/persona is supplied as declarative Bud config, not adapter code.** |

> **Guardrail:** web concepts (DOM, CSS selectors, URLs) must never leak *out* of the
> Interaction module. Its outer boundary is the contract below. Honor this and a
> mobile/desktop Surface is a new sibling adapter; break it and it's a teardown.

### ③ Volatile ports — tech TBD, swappable adapters

| Port | Responsibility | v1 adapter → later |
|---|---|---|
| **Model Provider** | BYO-key, vision-capable LLM access; model-agnostic. | Claude Sonnet 4.6 default (Haiku 4.5 for cheap a11y-text runs, Opus 4.8 for hard reasoning); OpenAI/Gemini/local swappable. |
| **Artifact Store** | Persist Run Artifacts. | Local filesystem → cloud DB (the hosted-tier seam). |

### ④ Orchestration & presentation

| Module | Responsibility |
|---|---|
| **Run Orchestrator** | Wires a Run (Bud + Flow Spec + Interaction + Capture). v1 local single-run; later scheduled/parallel (hosted). |
| **Signal Capture** | Observes the event stream and records evidence (actions, perception snapshots, timings, Mechanical events) → feeds Findings + Replay. |
| **Dashboard** | Local web UI (`npx testbuds`): live Bud reactions/expressions, step timeline, artifact viewer. React/TS. |

### Run data-flow

```
Bud Model + Flow Spec
        │
        ▼
  Run Orchestrator ──────────────► Interaction module ◄── Model Provider
        ▲                               │  (owns loop, emits events)
        │                               ▼
        │                         Signal Capture ──► Findings Engine ──► Run Artifact
        │                               │                                    │
        └─────────── Dashboard ◄────────┘ (live stream)         Artifact Store (local → cloud)
```

## The Interaction boundary contract

The linchpin of extensibility. Everything crossing it is Surface-neutral.

### ① Capabilities descriptor (adapter → system)

Lets the Orchestrator validate a Bud config before a Run and fail loudly rather than
silently degrade.

```
{ surface: 'web',
  perceptionModes: ['a11y','vision','hybrid'],
  inputs: ['point','input','scroll','key'],
  canScreenshot: true, liveView: true }
```

### ② Run invocation (system → adapter)

The Target is an **opaque, surface-tagged handle**. The Orchestrator never interprets
`entry`/`auth`; only the matching adapter does.

```
interact({ budConfig, flowSpec, mode,
           target: { surface, entry /*opaque*/, auth /*opaque handle*/ } })
```

### ③ Event stream (adapter → system, live)

One stream, consumed by **both** Signal Capture (persists) and the Dashboard (renders live).

| Event | Meaning |
|---|---|
| `perceived` | Normalized snapshot of what the Bud perceived this step (+ optional screenshot ref). |
| `intent` | The brain's rationale + the action it's about to take. |
| `action` | The normalized action performed. |
| `outcome` | Success/failure + latency + what changed. |
| `mechanical` | A grounded evidence event (see taxonomy) — what Findings are built from. |
| `reaction` | In-character utterance + expression, tied to a `mechanical` cause where possible. |
| `milestone` | Progress vs the Flow Spec (hint reached / deviated / goal achieved). |

### ④ Run result (adapter → system, final)

```
{ outcome: 'achieved' | 'partial' | 'failed', traceRef }
```

### Normalized vocabularies (never leak web specifics)

These are essentially the cross-platform accessibility model, which is why they survive the
jump to mobile/desktop.

```
Element  { id            // adapter-assigned, NOT a CSS selector
           role          // ARIA-like: button|link|textfield|checkbox|heading|image|tab|dialog|…
           name, value
           state { disabled, focused, checked, expanded, hidden }
           bounds, text }

Action   { type: point|input|scroll|gesture|key|navigate|wait|finish
           targetId?, value?, reason }     // 'point' → click on web, tap on mobile

Mechanical { kind: deviation | backtrack | repeat_attempt | search_thrash |
                   perception_miss | stuck | budget_exceeded | error_state |
                   gave_up | goal_achieved
             stepRef, perceivedRef, confidence }
```

> **`perception_miss`** — a target plausibly exists but not in the Bud's current Perception
> Mode — is the highest-trust signal in the product and the mechanically-detected
> accessibility gap.

## Deferred (explicit non-goals for v1)

- **Assertion mode** (deterministic CI testing): the Flow Spec and Run Artifact are designed
  to support it later, but v1 ships Persona mode only.
- **Cross-Surface** (mobile/desktop): boundary kept neutral; no adapter built.
- **Cross-Bud consolidation**, **hosted tier** (scheduling/aggregation/managed credits),
  **browser-use "deep explorer" plugin**: fast-follows behind existing seams.
