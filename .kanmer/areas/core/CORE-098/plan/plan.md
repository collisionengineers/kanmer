# Plan — CORE-098: v0.3.5 successor release

## Objective

After [[DOC-022]] has independently merged its v0.3.5 release-notes change, prepare exactly one generated v0.3.5 release PR from clean current protected main; obtain independent review and normal merge; then publish and prove the successor from a separate clean merged-main clone. The v0.3.4 tag and its failed evidence remain immutable.

## Governing docs

- **FRD-021 R3** — the release script must prepare the version through protected-main review, require notes that name the version, and prove the packaged updater. This plan uses that existing process without modifying it.
- **AGENTS.md §11** — the tag workflow is read-only verification; local `scripts/release.mjs` is the only publisher and repair owner. The plan does not add CI publisher credentials or widen workflow permissions.
- **HZN-007 context** — each stage is adjacent; the author does not independently review or merge; proof is written only on merged main; all failed attempts are retained.

## Preconditions and hold

1. Hold all release activity until [[DOC-022]] is merged through its own independent-review process. Before execution, record its PR and merge SHA, then read fresh GitHub `main` state. Confirm that the resulting `apps/gui/release-notes.md` names `0.3.5`.
2. Before the preparation command, use a **new clean normal clone from GitHub** at that exact current-main SHA (not the dirty root checkout, board worktree, or the held ticket worktree). Confirm:
   - `git status --porcelain` is empty;
   - its checked-out branch is `main`;
   - no `release/v0.3.5` branch or `v0.3.5` tag exists;
   - before running the preparation command, set `$env:KANMER_ROOT` to the existing canonical board root for that process if its MCP HTTP tests need a board; do not create, copy, or edit a board in the clone;
   - dependencies are installed from the lockfile without changing it.

Until every condition holds, record the unmet precondition and stop. In particular, do not run a dry-run, version bump, tag, or packaging attempt early.

## Execution after the hold releases

3. In that clean normal clone, run **exactly once**:

   ```powershell
   npm run release -- 0.3.5 --ticket CORE-098
   ```

   The script owns the authoritative verification rail, version-bump artifacts, `release/v0.3.5` branch, generated commit, branch push, and release PR. Do not hand-edit generated files, amend the commit, or retry after a failure. Its expected stop is a release PR with `Kanmer: CORE-098`; no tag, GitHub Release, or release asset is created in this phase.

4. Capture sanitized command exits, fresh-main SHA, generated commit/head SHA, PR URL/number, exact changed-file set, `git diff --check`, and release-script output. The diff must contain only the script-generated release-bearing manifests, lockfile, and regenerated artifacts documented in `files`. Any unrelated change, failed rail, existing release branch, or unexpected output is a stop-and-report condition, not a scope expansion.

5. Write the implementation report, move only to Review, and wait for an independent reviewer of the exact PR head. The author does not review, merge, alter branch protection, or use a bypass.

## Approved pre-mutation configuration correction

The initial preparation invocation on 2026-08-24 exited 1 in the MCP HTTP rail before the release script created a release branch, version commit, tag, PR, package, publisher action, or public release. Build, Core 310/310, and GUI 468/468 had already passed; 9 of 102 MCP HTTP tests then failed because the fresh normal clone had no discoverable board and the process did not receive `KANMER_ROOT`. The full failed output and zero-mutation remote/clone census are retained in `scratch/execution`; the failed invocation is ticked as completed failure-evidence preservation, not as a successful preparation.

This is a precondition omission, not a source or release failure. It authorizes **one** corrected preparation invocation in a newly rechecked clean normal clone, after setting `$env:KANMER_ROOT` to the existing canonical board root for that process before running the same command. This binding supplies test context only; it does not copy, initialize, or edit a board in the clone. No other retry is authorized: a failure after this corrected configuration remains a hard stop.

## Post-merge publication and evidence

6. After all required PR checks and independent review pass, let the normal protected-main merge supply its full merge SHA. Create a second new clean normal clone at that exact merged-main SHA. Only the local publisher process may inherit a publisher token through its process environment (for example, `GH_TOKEN` or `GITHUB_RELEASE_TOKEN`); do not write, print, store, map into Actions, or persist that token. Run exactly once:

   ```powershell
   npm run release -- 0.3.5 --publish --release-commit <full-merged-sha>
   ```

   This is the sole authorized tag/publish action. Do not manually create/move tags, upload or rename assets, create a release, or perform an out-of-band repair. If the canonical publisher exercises its own bounded exact-file recovery, record that fact; do not add a manual recovery step.

7. Treat the following as independent required evidence:
   - `v0.3.5` points at the recorded merged release commit;
   - the GitHub Release is public/non-draft and its expected assets are uploaded and integrity-checked by `node scripts/verify-release-assets.mjs 0.3.5`;
   - the tag-triggered `release-verify` workflow completes successfully, including its read-only packaged-updater and public-asset checks;
   - all command exits, PR/merge/tag/workflow/release links, and any automatic publisher repair are recorded without credentials.
   Append only the exact relevant facts to [[CORE-036]] and [[CORE-042]]; do not move or close them.

8. An independent verifier on merged main decides whether to write CORE-098 proof and move Verifying → Done. This plan stops before that verification/closeout work.

## Failure and deviation rules

- A precondition, preparation, review/check, publish, asset-verifier, or tag-workflow failure remains recorded with its exit/status and stops its phase. No silent retry, shorter rail, manual upload, retag, or v0.3.4 repair is permitted.
- `verify-release-assets.mjs` exit 1 is a failed/incomplete release and exit 2 is inconclusive execution/authentication state; neither is PASS.
- DOC-022 changing source, release-note wording, or its merge SHA after planning is a prerequisite refresh, not permission for CORE-098 to edit its scope.
- No source changes are made by this planning task. The ticket stays held in Implementing after the gate/worktree setup until DOC-022 merges.

## Stop condition

For this assignment, stop after CORE-098 is in Implementing with its own clean recorded worktree/branch and the outstanding DOC-022 dependency is documented. Do not invoke `release.mjs`, open a release PR, tag, publish, review, merge, verify, or close out.
