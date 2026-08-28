# Post-implementation report — CORE-135

## Summary

GitHub now requires every pull request to be current with `main` before merge, and the repository's existing board-push dispatcher is installed on `kanmer-board`. No Kanmer source behavior, workflow architecture, stage, group, package, repository variable, or provider changed.

This is an administrative delivery ticket, so there is deliberately no source diff or source PR. Its immutable review subjects are the full branch-protection before/after comparison, exact board-branch commits, canonical workflow blob, and GitHub Action/job identities.

## Changes

| Surface | Result |
|---|---|
| GitHub `main` protection | `required_status_checks.strict` changed from `false` to `true`. `verify` and `kanmer-gate` remain the only required checks, both app id `15368`. A normalized full-object comparison reported every unrelated field identical. |
| `kanmer-board:.github/workflows/board-regate.yml` | Installed byte-identically from `origin/main` at board commit `70f09ddea983e9cf87c28be36cf2ece1a0e5f24a`. Git blob `e93ec28a220d9bf41358408890f8ba38e49469a7`; SHA-256 `4b8ad8322d7cf30553988d8ef3924729d22f5ee6fed2d84dec3e5b22c16edeee`. |
| CORE-135 board evidence | Plan/ticket commit `e0a7f39b98f0e2ef9747be20982f29aec2cd642e`; durable take commit `73ceb24347a8222f490b433032a2e92c2c8acf8d`; separate `.kanmer`-only acceptance fixture `09d2a74d1c3532ea719cfd3428ce71b7875aca6e`. |
| Ticket control workspace | `.worktrees/core-135`, branch `core-135-current-base-regate`, unchanged at `add0da7fc17968796f43b3035065de400a4db2d4`. It exists only to preserve normal ticket ownership and carries no source commit. |

## Current-base proof

Before the protection change, PR #304 head `8a909ee97d95a0c50e5102c3c7f88d4c575614ba` retained successful required checks produced while its recorded base was `d523a29365a20133fc5f0e16a29df40b1a80bd8e`:

- `verify` check `98834595596`: SUCCESS.
- `kanmer-gate` check `98834594505`: SUCCESS.

Current verified `main` is `add0da7fc17968796f43b3035065de400a4db2d4`. `git merge-base --is-ancestor add0da7… 8a909ee…` exited 1. After `strict:true`, GitHub reports PR #304 `mergeStateStatus=BEHIND` while those old successes remain attached. This is the native platform block, not an inferred Kanmer gate.

The final half of the acceptance remains intentionally deferred to Phase 3: rebasing PR #304 must produce a new head and fresh required checks. CORE-135 therefore stops in Verifying, not Done, until that evidence exists.

## Board-push re-gate proof

The exact `.kanmer`-only fixture commit `09d2a74d1c3532ea719cfd3428ce71b7875aca6e` produced:

- Board push re-gate run `33169661851`: SUCCESS; dispatch-regate job `98843408905` succeeded.
- Dispatched pull-request workflow run `33169669232` at exact main `add0da7fc17968796f43b3035065de400a4db2d4`: SUCCESS.
- Its `regate` job `98843436089`: SUCCESS.
- PR #304 gate job `98843275615`: SUCCESS and top-level `boardSha=09d2a74d1c3532ea719cfd3428ce71b7875aca6e`.
- PR #303 gate job `98843281301`: SUCCESS and the same exact `boardSha`.
- Its existing workflow-dispatch side effect, hosted authoritative `verify` job `98843436337`: SUCCESS in 5m34s at exact main.

Causal detail is retained rather than simplified: the installation push had already started attempt-4 gate jobs for both PRs. The fixture's own `regate` job observed those jobs in progress and logged that it could not request duplicate re-runs; the existing workflow contract says the active attempts will judge the new tip. Both active jobs then fetched board HEAD `09d2a74d…` and emitted that exact top-level `boardSha`. Thus the board-only push both dispatched the existing path and was the state actually judged.

Installation-dispatch run `33169609976` was cancelled only after its `regate` job `98843244165` succeeded, because its redundant hosted verify overlapped the fixture rail. The cancellation enforced the one-full-rail rule and is not a source failure. The fixture rail was retained and passed.

## Focused verification

- `node --test scripts/pr-workflow.test.mjs`: exit 0; 1 pass, 0 fail.
- Remote workflow blob: exact match `e93ec28a220d9bf41358408890f8ba38e49469a7`.
- Remote workflow SHA-256: exact match `4b8ad8322d7cf30553988d8ef3924729d22f5ee6fed2d84dec3e5b22c16edeee`.
- Full protection comparison: `unrelated_fields_equal=true`.
- Board worktree remained on `kanmer-board`; every push was ordinary, never forced.
- No source file changed in `core-135-current-base-regate`.

## Governing contracts

- ADR-0016: met. GitHub supplies merge physics; no merge queue, evaluator, service or second workflow architecture was added.
- FRD-035: partially met at this stage. Board freshness and native stale-base blocking are proven; fresh-head verification after PR #304's rebase remains the explicit Verifying condition.
- [[CORE-123]]: reused as designed. Its operator-installed workflow bytes were installed without modification.

## Rollback and residual risk

Rollback was prepared but not applied:

1. Send the same app-bound required-checks payload with only `strict:false`.
2. Revert board commit `70f09ddea983e9cf87c28be36cf2ece1a0e5f24a` normally; never rewrite board history.

Residual risk: the existing `workflow_dispatch` condition also schedules a full main `verify` job for every board push. This ticket records and resource-controls that shipped behavior; it does not redesign it because board re-gating itself is reliable and the release brief permits only the smallest setup needed.

No Infisical or secret-rotation work was performed.
