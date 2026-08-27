---
kind: review-attestation
pr: "288"
head_sha: "df293ad2bf4b7f603e67998be7cb5b62f9430cbe"
verdict: pass
reviewer: "claude-core123-delta-reviewer"
independent: true
plan_hash: "533b4e5116983c28"
ticket_updated: "2026-08-27T16:43:53.895Z"
board_sha: "f7188a8113d686c1b19273eb4f10acc3072982d2"
threads_snapshot: []
findings:
  - id: F-001
    severity: major
    summary: "regate could never fire on a kanmer-board push (push workflows run from the pushed ref's tree; the board branch has no .github). Fixed in df293ad2: pr.yml push trigger is [main] only, regate runs on workflow_dispatch or push to main; new operator-installed .github/workflows/board-regate.yml (on push kanmer-board -> gh workflow run pr.yml --ref main). pr-workflow.test.mjs forbids kanmer-board in any branches list and pins the board-regate contract; plan/open-questions/AGENTS/ADR-0016/ticket Verification reworded as operator-enabled."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "syncBoard could commit and push conflict markers after a conflicting autostash re-apply (rebase --autostash exits 0). Fixed in df293ad2: refs/stash snapshot before the rebase, `git diff --name-only --diff-filter=U` and surviving-stash check after it, `rebase --abort` only when rebase-merge/rebase-apply exists, no staging, throws an 'Applying autostash resulted in conflicts' error that classifySyncFailure maps to paused:true. New real-git test 'pauses without committing markers when the autostash re-apply conflicts' asserts remote tip unchanged, no markers in any commit, stash retained, UU path listed, no rebase in progress; reviewer confirms the assertions cannot pass with the pre-fix second stage() pass."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "PR conflicted with origin/main a8318ea6 (CORE-122). Fixed: branch rebased onto a8318ea6 (3dad4b26, 2b3cf620, df293ad2), bundle regenerated; reviewer's `npm run plugin:check` reports 38 tools / bundle bytes match / isolated handshake 38; GitHub reports MERGEABLE / CLEAN at df293ad2. get_status.boardSync and CORE-122's reconcile_ticket registration coexist in packages/mcp-server/src/index.ts without overlap."
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "settings.ts maps an invalid gitSyncMinutes to 0 and only an absent key to 5; plan step 6 wording was ambiguous, Constraints text is the tighter rule and is what is implemented and tested."
    disposition: accepted-risk
    reason: "Safe behaviour (off) and consistent with the plan's Constraints section; unchanged in the delta."
  - id: F-005
    severity: note
    summary: "Prior run saw the host-only 'serializes concurrent orphan cleanup' failure. Delta run: `npx vitest run src/main/kanmerGit.test.ts --root apps/gui` passed 54/54 in 387.56 s with no orphan-cleanup or hook-timeout flake on this host."
    disposition: accepted-risk
    reason: "Known host quirk did not reproduce this run; hosted verify is green at df293ad2."
  - id: F-006
    severity: note
    summary: "regate re-runs the kanmer-gate job for every open PR (also already-green ones) and skips in-progress/unfound runs with a log line. Not a loop: kanmer-gate is pull_request-only, verify only runs for PRs and main pushes, and the regate job itself never pushes."
    disposition: accepted-risk
    reason: "Documented in open-questions; harmless extra gate reruns."
  - id: F-007
    severity: note
    summary: "board-regate.yml, once an operator installs it on the board branch, dispatches pr.yml on every board push (including each GUI auto-sync push, default interval 5 min), and each dispatch re-runs kanmer-gate for all open PRs. Cannot loop (kanmer-gate/regate never write the board; workflow_dispatch chains are the only hop) and is not required for correctness (manual fallback `gh workflow run pr.yml --ref main`), but it can be chatty on a busy board."
    disposition: accepted-risk
    reason: "Operator-opt-in file, documented as such in its header, AGENTS.md and open-questions; throttling would be a follow-up if runner minutes matter."
---

# Delta review — CORE-123 / PR #288 (head df293ad2)

Independent delta reviewer (fresh run; not the author `claude-code`, not the round-0 reviewer). Verdict: **pass**. Scope: the round-0 findings F-001..F-006, the changed lines of df293ad2 (and the rebased 3dad4b26/2b3cf620 against a8318ea6), their direct callers/contracts, and the relevant tests.

## Inputs bound
- Diff `a8318ea6..df293ad2` (24 files, +1027/-98); delta commit df293ad2 touches board-regate.yml, pr.yml, AGENTS.md, kanmerGit.ts/.test.ts, ADR-0016, bundle, pr-workflow.test.mjs.
- Plan v533b4e5116983c28 (with "Remediation round 1" section), open-questions, checklist (19/20, only the post-merge verifier item open), post-implementation report v5b4f079ddfbcaa4a, scratch/execute.
- PR #288: head df293ad2, MERGEABLE/CLEAN, reviewDecision empty, no GitHub reviews, GraphQL reviewThreads empty; the only comment is the Codex usage-limit notice (no content to disposition). Codex automated review not awaited per controller instruction.
- Board worktree HEAD = origin/kanmer-board = f7188a81 at attestation time (read-only; never touched).

## Verification of each fix
- **F-002** `apps/gui/src/main/kanmerGit.ts`: `stashBefore` snapshot, `unmergedPaths()` (`--diff-filter=U`), `rebaseInProgress()` gating `rebase --abort`, no `stage()` before the throw, error text matches the `autostash.*conflict` branch of `classifySyncFailure` → `paused: true`. The success path still runs the second `stage()` only when no unmerged/new stash is present. Test asserts remote tip, `HEAD:.kanmer/version.json`, `log -p --all -S<<<<<<<`, stash list, UU path and no rebase-merge dir — these fail against the previous code (which staged and pushed the markers); report records the red run.
- **F-001** `.github/workflows/pr.yml`: `push: branches: [main]` + `workflow_dispatch`; `verify` guarded to PR events or refs/heads/main; `kanmer-gate` PR-only; `regate` if guard `workflow_dispatch || (push && refs/heads/main)`, job-level `actions: write, contents: read, pull-requests: read`. `board-regate.yml`: `on: push: [kanmer-board]`, single `gh workflow run pr.yml --ref main` step, header marks it OPERATOR-INSTALLED; not needed for correctness. No loop (see F-006/F-007). `scripts/pr-workflow.test.mjs` asserts `branches: [main]`, `doesNotMatch(/branches: \[[^\]]*kanmer-board[^\]]*\]/)`, and pins the board-regate shape.
- **F-003**: rebased; `plugin:check` 38 tools; `packages/mcp-server/src/index.ts` carries both CORE-122's `reconcile_ticket` registration and the new `inspectBoardSync`/`boardSync` in `get_status` with no semantic overlap (boardSync is a git ahead/behind probe; reconcile_ticket is a board-document inspector).

## Independent commands (cwd .worktrees/core-123)
- `npm test -w @kanmer/core -- merge-gate` → exit 0, 16/16.
- `node --test packages/mcp-server/src/check-pr.test.mjs` → exit 0, 8/8.
- `node --test scripts/pr-workflow.test.mjs` → exit 0, 1/1.
- `npx vitest run src/main/kanmerGit.test.ts --root apps/gui` → exit 0, 54/54 in 387.56 s (autostash-conflict test 20.0 s, race test 17.7 s); no orphan-cleanup or hook-timeout flake this run.
- `npm run plugin:check` → exit 0 (38 tools, bundle bytes match, isolated handshake 38).

## Checks at df293ad2
Hosted run 33093680581 (pull_request): first attempt `kanmer-gate` failed only on `WRONG_STAGE` (ticket was `implementing` on the fetched board a428d560; STALE_REVIEW/COMMITS_UNREACHABLE were warnings, SYNC_REQUIRED `current`). After the operator-authorised board push the job was re-run: `verify` pass (4m50s), `kanmer-gate` pass (1m3s), `regate` skipped (correct for a pull_request event). Both required checks green at df293ad2.

## Residual risk
Board-push re-gate remains operator-enabled (F-007); strict mode is off by default so a stale attestation stays a warning until `KANMER_GATE_STRICT` is set. The commit list on the ticket still names pre-rebase SHAs only through the attestation history; the live `commits` field carries the rebased SHAs.
