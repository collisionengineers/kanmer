# Research — CORE-135: current-base protection and board-push re-gating

## Question

What is the smallest repository-administration change that guarantees a pull request cannot merge on verification from an older `main` base, and activates the already-shipped board re-gate path without adding source behavior or another workflow system?

## Findings

- Live GitHub protection on `main` requires exactly `verify` and `kanmer-gate`, both bound to GitHub Actions app id `15368`, but `required_status_checks.strict` is `false`. All unrelated protection settings were captured from `gh api repos/collisionengineers/kanmer/branches/main/protection`: admins enforced, conversation resolution required, zero approvals, force-push/deletion disabled, and no rulesets.
- GitHub's required-status-checks `strict` field is the existing platform control for requiring the head branch to be current before merge. Updating only that subresource can preserve the app-bound check identities; no Kanmer merge queue or new gate is needed.
- Before CORE-128 advanced `main`, PR #304 head `8a909ee97d95a0c50e5102c3c7f88d4c575614ba` had `verify` SUCCESS and a manually re-gated `kanmer-gate` SUCCESS against base `d523a29365a20133fc5f0e16a29df40b1a80bd8e`. The re-gate was dispatched by workflow run `33165777445`.
- CORE-128 then advanced `main` to exact verified SHA `add0da7fc17968796f43b3035065de400a4db2d4`. PR #304 still records base `d523a293…` and the same old successful checks; Git ancestry therefore establishes a stale base before its required Phase-3 rebase.
- `.github/workflows/board-regate.yml` already exists on `main` as Git blob `e93ec28a220d9bf41358408890f8ba38e49469a7` (SHA-256 `4b8ad8322d7cf30553988d8ef3924729d22f5ee6fed2d84dec3e5b22c16edeee`). It is absent from `origin/kanmer-board`, so GitHub cannot observe board pushes there.
- [[CORE-123]] deliberately shipped the dispatcher as an operator-installed file. Its proof passed the implementation and its Outcome explicitly leaves this installation step outstanding; the ticket checklist remains 27/28 for that reason.
- The existing dispatcher performs `gh workflow run pr.yml --ref main`. The existing `regate` job then re-runs only each open PR's latest `kanmer-gate` job. A manual dispatch was successfully exercised in run `33165777445`; no new service or token is required.
- The dispatched `pr.yml` also schedules its existing main-ref `verify` job because the current condition admits `workflow_dispatch` on `main`. That is existing behavior, not a source regression and not changed by this ticket; acceptance is the required re-gate evidence.
- `node --test scripts/pr-workflow.test.mjs` passes 1/1 on current main, pinning the dispatcher/permission contract.
- Stable packaged Kanmer v0.3.12 remains the live board authority. The board is format 3, clean on `kanmer-board`, and the ticket is intentionally not a member of HZN-008.

## Implications

1. Patch only the required-status-checks subresource from `strict:false` to `strict:true`, preserving both checks and app ids, then re-read the complete protection object to prove no unrelated setting changed.
2. Copy the canonical workflow byte-for-byte into the existing board worktree, commit and push normally, and verify the remote blob equals `e93ec28a…`.
3. Use one later `.kanmer`-only CORE-135 update as the unambiguous board-push fixture; bind the resulting dispatcher, regate and per-PR gate attempts to that exact board SHA.
4. Record PR #304's old green checks and stale ancestry before rebasing it. Its Phase-3 rebase must create a new head and fresh required checks; old-head success is not reusable.
5. No source PR, HZN membership change, `KANMER_GATE_STRICT` change, workflow rewrite, stage, service or provider abstraction is in scope.

## Open questions

None. GitHub's native strict current-base rule and the repository's documented board-workflow installation path fix the implementation choices.
