# Post-implementation report — CORE-123

PR: https://github.com/collisionengineers/kanmer/pull/288 · branch `core-123-merge-gate-board-sync` · **head `df293ad2bf4b7f603e67998be7cb5b62f9430cbe`** (remediation round 1) · base `origin/main` a8318ea6 · worktree `.worktrees/core-123`.
Commits (after rebase): `3dad4b26` (implementation, was 51a736f9), `2b3cf620` (workflow-test pin/AGENTS/tool-reference, was 89896693), `df293ad2` (remediation round 1). Previous reviewed head: 89896693 (review v9770bd1beecdaa95, needs-changes).

## Remediation round 1 (review v9770bd1beecdaa95 → df293ad2)

| Finding | Resolution |
| --- | --- |
| **F-003** (major) PR conflicted with `origin/main` a8318ea6 (CORE-122) | `git fetch origin && git rebase origin/main` in `.worktrees/core-123`; the only conflict was `plugins/kanmer/mcp/kanmer-mcp.cjs` — resolved by taking main's bundle (`git checkout origin/main -- …`), continuing, then `npm run build:core` + `npm run plugin:build` to regenerate; `npm run plugin:check` exit 0 (38 tools, bundle bytes match, isolated handshake 38). Every tool-count assertion already reads 38 from main: `smoke.mjs:62`, `smoke-protocol.mjs:160`, `AGENTS.md:404`, `docs/manual/connect.md:145` (generated manual `check:manual` passes); tool-reference.md has no count. Branch force-pushed with `--force-with-lease` to the existing PR #288 (no new PR). |
| **F-002** (major, data safety) `rebase --autostash` exits 0 on a conflicting stash re-apply and the second stage pass committed/pushed conflict markers | `apps/gui/src/main/kanmerGit.ts`: `syncBoard` records `refs/stash` before the rebase; after it, `unmergedPaths()` (`git diff --name-only --diff-filter=U`) and a new/surviving `refs/stash` are checked. If either is present: `git rebase --abort` only if a rebase is actually in progress (`rebase-merge`/`rebase-apply` dir exists), **no staging**, no automatic `stash pop`/`checkout --merge` (the stash keeps the local writes for a human), and an `Applying autostash resulted in conflicts …` error is thrown, which `classifySyncFailure` maps to `paused: true`. New real-git test "pauses without committing markers when the autostash re-apply conflicts": remote edits `.kanmer/version.json`, a self-removing post-commit hook writes a conflicting line between the sync commit and the rebase; asserts `paused: true`, conflict error, remote tip unchanged, `HEAD:.kanmer/version.json` and `git log -p --all -S<<<<<<<` carry no markers, `stash list` holds the autostash, `--diff-filter=U` lists the file, no rebase in progress. Proven red without the fix (exit 1: `paused` false) and green with it. The transient race test (non-conflicting concurrent write) still syncs unpaused. |
| **F-001** (major) `regate` on `push: kanmer-board` can never fire (push workflows run from the pushed ref's tree; the board branch has only `.gitignore` + `.kanmer`) | Honest fix, both halves: (a) `.github/workflows/pr.yml` — `push: branches: [main]` only; `regate` runs on `workflow_dispatch` **or** push to `main` (a merge moves every open PR's base, so re-running `kanmer-gate` is real work). (b) New `.github/workflows/board-regate.yml` on `main`, header-marked OPERATOR-INSTALLED with the copy commands: `on: push: kanmer-board` → `gh workflow run pr.yml --ref main` (`GITHUB_TOKEN` suffices; `workflow_dispatch` is exempt from the no-chained-runs rule). It was **not** committed to `kanmer-board` — agents never commit there. `scripts/pr-workflow.test.mjs` now asserts `[main]` only, forbids `kanmer-board` in any `branches:` list, asserts the regate guard on `refs/heads/main`, and pins board-regate.yml's trigger/permissions/dispatch and the AGENTS wording. AGENTS.md gate section, ADR-0016, open-questions, plan (appended "Remediation round 1") and the ticket Verification bullet now state the board-push re-gate as operator-enabled, not automatic; manual fallback is `gh workflow run pr.yml --ref main`. |
| F-004..F-006 (minor/note, accepted) | No change. |

## Files changed and why

| File | Why |
| --- | --- |
| `packages/core/src/merge-gate.ts` | `SYNC_REQUIRED` code; `strict` and `board` evidence on `MergeGatePhase2Evidence`; `levelFor()` makes NO_REVIEW_RECORD/STALE_REVIEW/COMMITS_UNREACHABLE/SYNC_REQUIRED `error` only under strict; `syncCheck()` (current/unrecorded pass, stale/unknown fail, skipped without evidence); result gains `boardSha`, `strict`; skipped lists extended in order |
| `packages/core/src/merge-gate.test.ts` | Existing ordered-check expectations extended by the 8th code (additive); new strict-vs-default and SYNC_REQUIRED state tests |
| `packages/core/src/review-attestation.ts` | Optional `board_sha` (40-hex), `expected_reviewers` (non-empty strings), `threads_snapshot` (array); returns `boardSha/expectedReviewers/threadsSnapshot/planHash`; existing attestations unchanged |
| `packages/core/src/review-attestation.test.ts` (new) | absent/valid/malformed for each optional field |
| `packages/mcp-server/src/git-reachability.mjs` | `collectBoardEvidence({boardRoot, attestedSha})` — `rev-parse HEAD`, `merge-base --is-ancestor`; never throws; non-git board → unrecorded/unknown |
| `packages/mcp-server/src/check-pr.mjs` | Uses core `parseReviewAttestation` (duplicate validator removed, `parseReviewEvidence` kept as wrapper), `readStrictFlag()` from `KANMER_GATE_STRICT`, passes `strict` + board evidence on both resolved and no-ticket paths |
| `packages/mcp-server/src/check-pr.test.mjs` | Strict-flag parsing; needs-changes/missing attestation warn by default and exit 1 under strict; git-backed board fixture: current, ancestor, unknown, stale, malformed `board_sha`; optional fields carried |
| `packages/mcp-server/src/index.ts` | `inspectBoardSync()` + `get_status.boardSync` block (null-safe) and tool description sentence (merged cleanly with CORE-122's `reconcile_ticket`) |
| `packages/mcp-server/src/smoke.mjs` | Shape assertion for `boardSync` (tool count 38 inherited from main) |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated bundle on top of a8318ea6 (`plugin:build`; `plugin:check` OK) |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | Attestation template adds `board_sha` (+ optional `expected_reviewers`, `threads_snapshot`) and the push-first rule |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `get_status.boardSync` note |
| `.github/workflows/pr.yml` | `workflow_dispatch`; `push: [main]`; `verify` runs for PRs (non-edited) and pushes to `main`; `kanmer-gate` PR-only with `KANMER_GATE_STRICT` env; `regate` job (`actions: write`) re-runs the `kanmer-gate` job of the latest PR run for each open PR on dispatch or push to `main` |
| `.github/workflows/board-regate.yml` (new, round 1) | Operator-installed board-branch dispatcher (see F-001) |
| `scripts/pr-workflow.test.mjs` | Pins the trigger/strict/regate/board-regate contract (added assertions; existing ones untouched) |
| `AGENTS.md` | Gate section: push/dispatch triggers, `regate`, operator-enabled board re-gate, strict switch (outside the managed block; `verify:agents-block` 31/31) |
| `apps/gui/src/main/kanmerGit.ts` | `syncBoard`: `rebase --autostash` + autostash-conflict detection (round 1) + second stage pass; `unmergedPaths` (exported), `rebaseInProgress`; `classifySyncFailure`; `inspectBoardSync`; `sync` attached to all available statuses; `shouldScheduleAutomaticSync` requires `sync.remote !== false` |
| `apps/gui/src/main/kanmerGit.test.ts` | Race reproduction; autostash-conflict reproduction (round 1); transient-vs-conflict; ahead/behind counts; no-remote guard; classifier unit test |
| `apps/gui/src/main/settings.ts`, `settings.test.ts` | Absent `gitSyncMinutes` → `DEFAULT_GIT_SYNC_MINUTES` (5); explicit 0 stays off |
| `apps/gui/src/shared/ipc.ts`, `renderer/.../Settings.tsx` | `sync?` type; "ahead N · behind M" and unpushed-commits hint |
| `docs/architecture/adr/ADR-0011…`, `ADR-0016…` | One-sentence amendments: strict switch, `SYNC_REQUIRED`, re-gate on `main` push/dispatch and (operator-installed) board push |

## Governing docs

- FRD-034 AC2 — met: under strict, a head mismatch or `needs-changes` blocks; the attestation is additionally bound to the pushed board tip via `board_sha`/`SYNC_REQUIRED`. AC5 — `expected_reviewers` is carried for SKILL-037 (no settlement logic here, per plan).
- FRD-035 AC5 — met for what the workflow can honestly do: every push to `main` re-judges open PRs and gives the merge SHA a bound `verify` run; re-judging on a board push is delivered as the operator-installed `board-regate.yml` (documented), not claimed as automatic.
- ADR-0011 / ADR-0016 — wording amended only as the plan authorised; core spawns no git; the 0/1/2 + JSON + annotation contract is unchanged apart from additive keys.

## Commands and results — remediation round 1 (cwd `.worktrees/core-123` unless noted)

| Command | Exit | Notes |
| --- | --- | --- |
| `git fetch origin && git rebase origin/main` | 0 (stopped at 1/2) | CONFLICT only in `plugins/kanmer/mcp/kanmer-mcp.cjs` |
| `git checkout origin/main -- plugins/kanmer/mcp/kanmer-mcp.cjs && git add … && GIT_EDITOR=true git rebase --continue` | 0 | rebased: 3dad4b26, 2b3cf620 |
| `npm run build:core` / `npm run plugin:build` / `npm run plugin:check` | 0 / 0 / 0 | 38 tools, bundle bytes match |
| `npx vitest run src/main/kanmerGit.test.ts -t "autostash re-apply conflicts\|concurrent agent write between add\|transient sync failure"` (apps/gui) | 0 | 3 passed (28.4 s, 23.5 s, 19.4 s) |
| same, new test only, with `kanmerGit.ts` fix stashed | 1 | `expected false to be true` (`paused`) — proves the test catches the bug |
| `node --test scripts/pr-workflow.test.mjs` | 0 | 1/1 |
| js-yaml parse of `pr.yml` + `board-regate.yml` | 0 | `actionlint` not installed — INCONCLUSIVE |
| `npm run verify:agents-block` / `npm run verify:docs` / `npm run typecheck` / `npm run verify:skills` | 0 / 0 / 0 / 0 | |
| `npm run test:scripts` | 1 | 118 pass, 2 fail: only the known `antigravity-plugin-config.test.mjs` host cases (LOCALAPPDATA spaces, installer shim cwd) |
| `git push --force-with-lease -u origin core-123-merge-gate-board-sync` | 0 | 89896693 → df293ad2 on PR #288 |
| `npm run verify` (background, log `.worktrees/core-123-verify-r1.log`) | 1 | build OK; `check:manual` OK; core 382/382; **GUI 493/493 (50 files, incl. the new autostash test)**; `test:http` 1 failure: `http.test.mjs` "project resolution fails before binding" — `spawnSync node ETIMEDOUT` at its 2 s spawn timeout; rail stopped before `test:scripts`/`plugin:check` (run individually above) |
| `node --test --test-name-pattern="project resolution fails before binding" src/http.test.mjs` (packages/mcp-server, attempt 1) | 1 | same ETIMEDOUT alone |
| same on the untouched `main` checkout (a8318ea6) | 0 | file untouched by this PR (`git diff origin/main -- http.test.mjs http.mjs` empty) |
| same in the worktree, attempts 2 and 3 | 0, 0 | passes — the known "http spawn ETIMEDOUT under load" host quirk, recorded not chased |

Round-0 command table (first head 89896693) is retained in git history of this document; hosted `verify` and `kanmer-gate` on PR #288 at df293ad2 are authoritative for the host-flaky rails.

## Risks and follow-ups

- The board-push re-gate is **operator-enabled**: nothing re-runs the gate on a `kanmer-board` push until an operator copies `board-regate.yml` onto the board branch (commands in its header). Until then: push the board, then `gh workflow run pr.yml --ref main`.
- `regate` needs `actions: write` for `GITHUB_TOKEN`; if restricted it logs "not permitted" and exits 0. It re-runs the gate job for all open PRs on every `main` push (harmless extra runs).
- Autostash-conflict pause leaves the board worktree with unmerged entries and the local writes in `git stash` (as Git left it) for a human to resolve; the GUI shows the paused error and the timer stays off until Retry.
- Default (`KANMER_GATE_STRICT` unset) keeps `needs-changes` a warning; strict is an operator repo-variable change. `SYNC_REQUIRED` only fires once reviewers write `board_sha`.
- The two race tests run ~25–30 s each against the file's 30 s real-git budget; raise the budget rather than weaken the assertions if they flake hosted.

## For kanmer-verify (on the merged SHA)

1. `npm run verify` hosted (authoritative); locally expect the host quirks recorded above.
2. `node --test packages/mcp-server/src/check-pr.test.mjs`, `node --test scripts/pr-workflow.test.mjs`, and `npx vitest run src/main/kanmerGit.test.ts` (apps/gui) alone.
3. Observe on GitHub: the merge push to `main` runs `verify` and `regate` (re-running `kanmer-gate` on any open PR). A `kanmer-board` push re-gates only if an operator has installed `board-regate.yml` on the board branch — do not expect it otherwise.
4. `get_status` on the live board reports `boardSync` with integer `ahead`/`behind`; GUI Settings shows "ahead N · behind M".
