---
id: CORE-118
type: ticket
title: Compile evidence-backed constrained plans into step packets
status: done
area: core
assignee: claude-code-core118
profile: feature
stageEntered:
  preparing: '2026-08-27T23:05:50.724Z'
  review: '2026-08-27T23:43:41.998Z'
  verifying: '2026-08-28T00:01:23.407Z'
  done: '2026-08-28T00:47:10.322Z'
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
blocks:
  - SKILL-036
  - CORE-127
refs:
  - docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md
commits:
  - 924d7294c128f66c72dd1d8da6f01337cef9ab4b
  - 0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/297'
archived: false
created: '2026-08-26T21:02:42.005Z'
updated: '2026-08-28T00:51:55.437Z'
---

## What

Strengthen preparation evidence and canonical plans, then compile approved plans into bounded step packets a constrained worker can execute safely.

## Why

A weak worker needs exact permitted files, symbols, behaviour, tests and stop conditions rather than an unbounded repository prompt.

## Approach

- Separate shared group research from ticket impact research.
- Validate concrete plan fields and risk-sensitive evidence.
- Compile versioned packets and reconcile actual changes after every step.

## Verification

- [ ] Validation rejects unresolved vague plan language and a fixture worker packet enforces allowed files and completion evidence.

## Outcome

Merged: PR [#297](https://github.com/collisionengineers/kanmer/pull/297) (merge commit `0f4a21fefc3788a4b8c19c7c550e52e0ab8d5ab2`, head `924d7294c128f66c72dd1d8da6f01337cef9ab4b`), merged 2026-08-28T00:01:09Z.

Review attestation version `1f0d9f12360713f7` (reviewer `claude-core118-independent-reviewer`). Proof `8c54963f3905ead9`, result **PASS**.

FRD-033 acceptance criteria 1–3 delivered as two pure core modules —
`packages/core/src/plan.ts` and `packages/core/src/step-packet.ts` — surfaced
behind one optional `step` parameter on `get_execution_packet`. Tool roster
unchanged at 39; nothing persisted; no `packages/core/src/store.ts` change.

**Acceptance criterion 4 split to [[CORE-127]]**, whose research scratch already
carries the six findings deferred from review.

Two corrections the independent verifier established relative to the
implementation report:

1. The change adds exactly **two** additive packet fields — `validation` and
   `groupContexts[].version` — not three. `ticket.revision` was already present
   at the merge parent (from CORE-114), so it is not new in this ticket.
2. The step packet's file containment is **declarative, not enforced**: a
   `## Do not modify` glob such as `apps/gui/**` does not forbid
   `apps/gui/main.ts` (string comparison, not glob matching), and Expected-files
   entries like `/etc/hosts` or `../other/x.ts` compile into `allowedFiles` with
   zero blockers (no path normalisation or repo-root confinement). Both
   confirmed empirically, dispositioned minor, and deferred to CORE-127.
