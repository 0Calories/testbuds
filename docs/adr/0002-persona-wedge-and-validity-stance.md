# Persona-feedback wedge and the Calibration validity stance

Status: accepted

## Decision

Testbuds leads with **persona-driven UX/accessibility feedback** — the "agent as first user"
angle — and explicitly **not** with natural-language E2E test-running. The same plain-language
Flow Spec is designed to support a later **Assertion mode** (deterministic CI testing), but
that is a fast-follow, not the v1 wedge. To keep the feedback trustworthy, every Bud's
behavior is governed by **Calibration**: Capability traits deliberately *handicap* the
(superhuman) model toward a target human's limits, every Finding is **confidence-tagged with
evidence**, and Testbuds is positioned honestly as a **fast first-pass that surfaces candidate
friction to investigate — not a replacement for real user testing.**

## Why (and why it's surprising)

Two things a future reader will question:

1. **"AI E2E testing is obviously valuable — why aren't we leading with it?"** Because market
   research (mid-2026) found that the "plain-language E2E test, BYO key, OSS, runs in CI" wedge
   is **already crowded**: Shortest (MIT), Magnitude (Apache), TestZeus Hercules, with a wall of
   funded proprietary tools above (Octomind, Momentic, QA Wolf, mabl, Checkly). Entering there
   means arriving late and undifferentiated. By contrast, **no incumbent** frames the agent as
   a *simulated user giving a UX/accessibility verdict* rather than pass/fail — that white space
   is uncontested.

2. **"Why deliberately handicap a capable model?"** Because the validity threat cuts both ways:
   a frontier model is **superhuman** (it finds the poorly-labeled button a real confused user
   never would → false negatives, falsely reassuring) and sometimes **brittle** (stuck on a
   custom widget for agent-not-human reasons → false positives). If a Finding can't distinguish
   "about my UX" from "about the agent," the feedback is worthless — and trust is the entire
   product. Handicapping (perception mode, patience budget, input limits) is the mechanism that
   aligns Bud behavior with the target user; evidence + confidence let the user judge; honest
   positioning prevents overclaiming.

## Considered options

- **Lead with deterministic E2E** (win on determinism + OSS + BYO): viable but crowded; chosen
  as a later mode, not the wedge.
- **Trust the persona prompt** (minimal handicapping, position as a testing replacement):
  simplest, but maximal sycophancy/overclaim risk — the failure mode to avoid.
- **A11y-mechanical signal only for v1:** most ironclad, but narrower than the chosen
  calibrate-confidence-honest approach.

## Consequences

- The Findings Engine and Run Artifact must carry **confidence + evidence** as first-class
  fields (see [CONTEXT.md](../../CONTEXT.md): Finding, Calibration).
- Marketing/positioning must not claim "replaces user testing." The honesty is the
  positioning, not a weakness.
- Perception Mode doubles as both the strongest persona lever and the cross-Surface perception
  substrate (see [ADR-0001](./0001-modular-architecture-deferred-tech.md)).
