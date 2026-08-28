# Plan — CORE-135

## Objective

Guarantee that a pull request cannot merge using required checks produced against an older `main` base, and activate the already-shipped board-push re-gate workflow on `kanmer-board`, without changing Kanmer source behavior or introducing another workflow system.

## Bound evidence

- Verified current `main`: `add0da7fc17968796f43b3035065de400a4db2d4`.
- Controlled stale PR: #304, old head `8a909ee97d95a0c50e5102c3c7f88d4c575614ba`, recorded base `d523a29365a20133fc5f0e16a29df40b1a80bd8e`.
- Old-head required checks: `verify` and `kanmer-gate` both successful before `main` advanced; dispatch run `33165777445`.
- Board baseline before this ticket: `053e918618d80cecc4aaf697c033c0dfc6965a3a`.
- Canonical board workflow blob: `e93ec28a220d9bf41358408890f8ba38e49469a7`; SHA-256 `4b8ad8322d7cf30553988d8ef3924729d22f5ee6fed2d84dec3e5b22c16edeee`.
- Stable controller: packaged v0.3.12; expected logical project `kanmer-proj-v1:5dbaab312733032858ad528e48eeaa4221b4356f9b7899d892540d964c10b268`.

## Governing contracts

- ADR-0016: keep GitHub as merge physics; do not build a second evaluator or merge queue.
- FRD-035: golden-board promotion requires current CI and Kanmer gates plus stable-controlled board freshness.
- [[CORE-123]]: reuse its implemented operator-installed dispatcher; do not rewrite it.

## Exact changes

1. Capture the complete live protection object and PR #304's old-head check identities.
2. Patch only the `required_status_checks` subresource so `strict` changes from `false` to `true`. Preserve the two app-bound checks exactly:
   - `verify`, app id `15368`
   - `kanmer-gate`, app id `15368`
3. Re-read the complete protection object and compare every unrelated field with the baseline. Keep a ready rollback payload that changes only `strict` back to `false`; acceptance retains `true`.
4. Prove the stale state without manufacturing a PR:
   - old successes remain attached to head `8a909ee…`;
   - current `main` `add0da7…` is not an ancestor of that head;
   - native strict protection requires the branch to be updated.
5. In the explicitly authorized board-worktree exception, add `.github/workflows/board-regate.yml` with exactly the bytes from `origin/main`. Verify both Git blob and SHA-256 before committing.
6. Commit and push the workflow normally on `kanmer-board`; verify the remote branch contains the exact canonical blob. Never force-push.
7. Append one bounded CORE-135 progress record through stable v0.3.12 and sync that `.kanmer`-only change as a separate board commit.
8. Bind the resulting `Board push re-gate` run, dispatched `pr.yml` run, `regate` result, and refreshed open-PR `kanmer-gate` attempts to the exact board-only SHA. Record the existing workflow-dispatch verify side effect honestly; do not redesign it here.
9. Write the post-implementation report. Have a fresh independent reviewer compare live settings, remote workflow bytes, Action evidence, ticket scope and rollback safety.
10. Move CORE-135 through Review to Verifying. Keep it in Verifying until Phase 3 rebases PR #304 and proves the new head receives fresh `verify` and `kanmer-gate` checks that the old head cannot satisfy. Then write exact proof, move Done, release, and clean its control worktree/branch.

## Workspace and ownership

Create branch `core-135-current-base-regate` and worktree `.worktrees/core-135` from current `origin/main`, record them with `take_ticket`, and use that workspace as the ticket's bounded control/evidence context. It carries no source changes and creates no source PR. The only repository mutation outside GitHub settings is the explicitly authorized workflow installation in the existing board worktree.

## Expected mutation surface

- GitHub `main` protection: only `required_status_checks.strict`.
- `.worktrees/kanmer/.github/workflows/board-regate.yml`: exact copy of the existing canonical main workflow.
- `.kanmer/areas/core/CORE-135/**`: durable ticket evidence and lifecycle state.
- No source file, package, build artifact, group membership, repository variable, branch name or `KANMER_GATE_STRICT` change.

## Negative cases and failure handling

- If the protection response changes check names, app ids, or any unrelated setting, immediately apply the captured strict-only rollback and stop that mutation path.
- If a channel, credential, workflow permission or protection response is unreadable, fail closed; do not infer success.
- If the installed workflow's blob or SHA-256 differs, do not push it.
- If the board is not on `kanmer-board`, project identity differs, or local/remote history diverges, do not mutate.
- If a board push does not dispatch the existing workflow reliably, add only the smallest setup/sync correction under this ticket; source changes then require a normal PR and exact-head review.
- A `BLOCKED` merge state alone is not attributed solely to base staleness because PR #304 also has unresolved threads. The proof must use strict protection configuration, exact ancestry, old-head checks, and the fresh-check sequence after rebase.
- Existing hosted verify runs caused by `workflow_dispatch` are not overlapped with another full Windows rail or misclassified as source regressions.
- Do not revisit Infisical or secret rotation.

## Commands and expected results

- `gh api repos/collisionengineers/kanmer/branches/main/protection`: capture full before/after snapshots.
- `gh api repos/collisionengineers/kanmer/branches/main/protection/required_status_checks`: before is `strict:false`; after is `strict:true` with only the two preserved app-bound checks.
- PowerShell builds the PATCH payload from the live `checks` array and sends it through `gh api --method PATCH --input -`.
- `git merge-base --is-ancestor add0da7fc17968796f43b3035065de400a4db2d4 8a909ee97d95a0c50e5102c3c7f88d4c575614ba`: expected exit 1 before rebase.
- `git hash-object .worktrees/kanmer/.github/workflows/board-regate.yml`: expected `e93ec28a220d9bf41358408890f8ba38e49469a7`.
- `Get-FileHash -Algorithm SHA256`: expected `4b8ad8322d7cf30553988d8ef3924729d22f5ee6fed2d84dec3e5b22c16edeee`.
- `node --test scripts/pr-workflow.test.mjs`: expected exit 0; no source edit.
- GitHub Action/API queries: exact board SHA appears in the board-dispatch run and refreshed gate output.
- After PR #304 rebase: new head differs from `8a909ee…`; both required checks are new attempts on that exact head and pass before merge.

## Acceptance and stop condition

Implementation is complete when strict protection is preserved, the exact workflow is installed remotely, and a board-only push has refreshed open-PR gates against its exact board SHA. There is no source PR. CORE-135 pauses in Verifying until PR #304's required Phase-3 rebase supplies the final fresh-head proof; only then may proof be PASS and the ticket close.
