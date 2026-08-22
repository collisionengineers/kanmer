# Checklist — CORE-032

- [x] Create .github/workflows/pr.yml as the only implementation file.
- [x] Configure only pull_request events targeting main.
- [x] Restrict activity types to opened, synchronize, reopened, and ready_for_review.
- [x] Set top-level permissions: contents: read and no write permissions.
- [x] Set workflow-level defaults.run.shell: bash.
- [x] Define exactly one job with ID verify and display name verify.
- [x] Set the job runner to windows-latest.
- [x] Add actions/checkout@v4 with no unnecessary history or board fetch.
- [x] Add actions/setup-node@v4 with node-version: 20 and no unmeasured cache configuration.
- [x] Add one run step containing exactly npm ci && npm run verify.
- [x] Confirm there is no push, workflow_dispatch, schedule, merge-group, path filter, matrix, retry, artifact, or second workflow/job.
- [x] Confirm there is no kanmer-gate placeholder.
- [x] Run git diff --check and inspect the complete workflow diff.
- [x] Confirm git status --short lists only .github/workflows/pr.yml.
- [x] Open the PR against main with Kanmer: CORE-032 in the body. PR #136.
- [x] Confirm the current PR head receives exactly one check named verify. PR #136 received exactly one check named verify.
- [x] Record the run ID, head SHA, conclusion, and elapsed duration; note whether it meets the under-ten-minute target. Run 32531237498, head a24f924b512c22e14641d6a7c8102860862ae6a3, conclusion failure, job 01:29 / run envelope 01:35, under ten minutes.
- [x] Stop at review readiness; do not configure protection, add kanmer-gate, merge, or begin a blocked ticket.

## Progress notes

- 2026-08-21: CORE-031 is merged on the current main and root npm run verify exists.
- 2026-08-21: Static YAML contract check exited 0. The workflow has only pull_request targeting main with the four required activity types, contents: read, workflow-level Bash, one verify job on windows-latest, checkout@v4, setup-node@v4 Node 20, and one npm ci && npm run verify step. No push trigger, gate stub, cache, matrix, retry, artifact, or extra job/workflow was added.
- 2026-08-21: Normal main checkout npm run verify first failure preserved: exit 1 after 71.15s; packages/core/src/migrate.test.ts > migration: v2 → v3 > resuming does not rewrite tickets an earlier run already migrated timed out at 5000ms. Core result was 1 failed, 258 passed, 259 total across 11 files. This is unrelated to the workflow and was not weakened or absorbed.
- 2026-08-21: git diff --check exited 0; git status --short listed only .github/workflows/pr.yml.
- 2026-08-21: PR #136 opened with Kanmer: CORE-032. Its single verify check ran on windows-latest with Bash and Node v20.20.2. Run 32531237498 / job 96923485539 started 2026-08-21T22:02:25Z and completed 2026-08-21T22:03:54Z; run envelope was 2026-08-21T22:02:20Z to 22:03:55Z. It concluded failure in the shared npm run verify rail at apps/gui/src/main/kanmerGit.test.ts: expected C:UsersRUNNER~1AppDataLocalTemp... but received C:UsersunneradminAppDataLocalTemp.... The workflow setup, checkout, Node setup, and Bash invocation succeeded. This real-PR failure is preserved and not fixed in CORE-032.
- Real post-merge kanmer-board non-trigger evidence remains unavailable and INCONCLUSIVE until an authorized merge and ordinary board sync.

# Closeout checklist

Append to the ticket's checklist.md when closeout starts (`set_ticket_doc doc: "checklist", append: true`) so cleanup progress is visible on the board.

---

## Closeout — CORE-032


## Closeout completion — 2026-08-22

- [x] PR merge verified: PR #136 MERGED at 2026-08-21T22:08:21Z; merge commit 2ba84147cc513ad23e2811e09c005772cb259cfb.
- [x] proof.md finalized with PR URL, merge date, merged-main SHA, green hosted verify evidence, and retained failed attempts.
- [x] Moved Verifying → Done after get_doc_gates passed.
- [x] Outcome recorded with PR link, merge commit, CORE-037 disposition, and separate follow-ups CORE-024/CORE-033.
- [x] No CORE-032 worktree or branch remained; git worktree list contains only main, core-036, and the board worktree.
- [x] `git fetch --prune origin` and `git worktree prune` completed.
- [x] `take_ticket action: release` issued; no taken_at, branch, or worktree remains on the ticket.

## Parked (explicitly deferred)
- Deferred/inconclusive: Confirm CORE-031 is merged and root npm run verify exists and is green in a normal checkout. CORE-031 is merged and the command exists, but the normal-checkout run exited 1 on an unrelated pre-existing core migration timeout; retained below.
- Deferred/inconclusive: Confirm the run uses Windows, Bash, Node 20, and executes both npm ci and npm run verify successfully. Setup/checkout/Node/Bash succeeded, but the shared verify rail failed; this remains unchecked.
- Deferred/inconclusive: After merge, use an ordinary board-sync push to confirm pr.yml creates no kanmer-board run; do not manufacture a board change.
- Deferred/inconclusive: PR merge verified (`gh pr view --json state,mergedAt`)
- Deferred/inconclusive: proof.md finalised (PR URL + merge date appended)
- Deferred/inconclusive: Moved to final stage
- Deferred/inconclusive: Outcome recorded in ticket body (PR link, follow-ups)
- Deferred/inconclusive: cd out of worktree; `git worktree remove .worktrees/CORE-032`
- Deferred/inconclusive: `git branch -d <branch>` (`-D` if squash/rebase-merged)
- Deferred/inconclusive: `git fetch --prune` + `git worktree prune`
- Deferred/inconclusive: `take_ticket action: "release"`
- Deferred/inconclusive: Post-merge kanmer-board non-trigger evidence remains INCONCLUSIVE and was not manufactured.
