# Checklist — CORE-135

## Prepare

- [x] Re-read project identity, board branch, board local/remote equality, CORE-135 version, and protection baseline.
- [x] Sync the completed research, files, plan and checklist before execution.
- [x] Create `.worktrees/core-135` on `core-135-current-base-regate` from exact current `origin/main`.
- [x] Take CORE-135 with the exact branch/worktree and stable project fingerprint.

## Current-base protection

- [ ] Capture PR #304 old head, recorded base, required check ids/conclusions, and main SHA.
- [ ] Confirm current main is not an ancestor of PR #304's old head.
- [ ] PATCH only `required_status_checks.strict` to `true`, preserving `verify` and `kanmer-gate` app id `15368`.
- [ ] Re-read full branch protection and prove every unrelated field is unchanged.
- [ ] Retain a strict-only rollback payload; do not use it after acceptance unless the comparison fails.

## Board re-gate installation

- [ ] Reconfirm `board-regate.yml` is absent from remote `kanmer-board`.
- [ ] Add the canonical workflow to the board worktree without editing its bytes.
- [ ] Verify local blob `e93ec28a220d9bf41358408890f8ba38e49469a7` and SHA-256 `4b8ad8322d7cf30553988d8ef3924729d22f5ee6fed2d84dec3e5b22c16edeee`.
- [ ] Commit and push normally; verify the exact blob on remote `kanmer-board`.
- [ ] Run `node --test scripts/pr-workflow.test.mjs` successfully from current source.

## Board-only dispatch proof

- [ ] Append one bounded CORE-135 progress note through stable v0.3.12.
- [ ] Sync the resulting `.kanmer`-only board commit and record its exact SHA.
- [ ] Record the successful `Board push re-gate` run for that SHA.
- [ ] Record the dispatched `pr.yml` run and successful `regate`.
- [ ] Record refreshed `kanmer-gate` attempts for every open PR with matching top-level `boardSha`.
- [ ] Record, without redesigning, any hosted verify rail scheduled by the existing dispatch condition.

## Review and staged verification

- [ ] Write the post-implementation report with exact before/after settings, commits, run ids and rollback state.
- [ ] Obtain a fresh independent administrative review of settings, workflow bytes, Action evidence, scope and safety.
- [ ] Disposition every review finding and move CORE-135 one stage at a time to Verifying.
- [ ] During Phase 3, rebase PR #304 onto current main and record its new exact head.
- [ ] Prove old-head successes cannot satisfy the new head: fresh `verify` and `kanmer-gate` attempts are required and pass.
- [ ] Write machine-readable PASS proof only after the fresh-head evidence exists.
- [ ] Move CORE-135 to Done, release its claim, and remove its clean control worktree/branch after terminal proof.
