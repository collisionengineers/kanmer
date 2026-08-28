---
id: CORE-135
type: ticket
title: Require current-base verification and activate board-push re-gating
status: done
area: core
assignee: release-controller
profile: fix
stageEntered:
  preparing: '2026-08-28T11:57:22.052Z'
  review: '2026-08-28T12:12:00.824Z'
  verifying: '2026-08-28T12:14:34.763Z'
  done: '2026-08-28T12:50:34.907Z'
labels:
  - reliable-autonomy
links:
  - CORE-123
refs:
  - docs/architecture/adr/ADR-0016-compiled-workflow.md
  - docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md
archived: false
created: '2026-08-28T11:56:59.489Z'
updated: '2026-08-28T12:51:45.458Z'
---

## What

Require pull requests to be current with `main` before merge, and activate the repository’s existing board-push re-gate workflow on `kanmer-board`.

## Why

[[CORE-123]] delivered the dispatcher and merge-gate machinery but deliberately left board-branch installation as an operator action. GitHub currently has `required_status_checks.strict: false`, so a PR can retain green verification produced against an older `main` base.

## Approach

- Preserve the existing app-bound `verify` and `kanmer-gate` requirements and change only current-base strictness.
- Install the existing `board-regate.yml` bytes on `kanmer-board` through the documented operator path.
- Use PR #304 as the controlled stale-base proof and a bounded board-only ticket update as the re-gate proof.
- Do not change source behavior, workflow architecture, `KANMER_GATE_STRICT`, stages, or HZN-008 membership.

## Verification

- [x] PR #304 has both required checks green on its old base before `main` advances.
- [x] After `main` advances and strict current-base protection is enabled, PR #304 is blocked as stale while its old green checks remain attached.
- [x] Updating PR #304 produces a new head and fresh required checks.
- [x] A board-only push runs `Board push re-gate`, dispatches the existing PR workflow, and refreshes open-PR gate evidence against the exact board SHA.
- [x] Main protection retains only `verify` and `kanmer-gate` with their existing app identities and every unrelated setting unchanged.

## Outcome

PASS. Strict current-base protection and board-push re-gating are active and proven. PR #304 produced fresh green required checks at new exact head `8010881c4e48ffabe97aba674361980f8ab3b279`. Terminal proof is recorded, the claim is released, and the clean control workspace is removed.
