# Plan — CORE-123: Merge-gate hardening and board-sync confirmation

## Objective
One PR on the stable line so that the CI gate and the board agree before anything is called final: attestation/commit checks can be promoted to errors behind `KANMER_GATE_STRICT`, a stale attested board SHA is a structured `SYNC_REQUIRED` check, the gate job is re-run for open PRs when `kanmer-board` is pushed, the GUI auto-sync no longer stalls on the add→rebase race, and ahead/behind drift is visible in the GUI and `get_status`.

## Starting state
- `packages/core/src/merge-gate.ts`: `NO_REVIEW_RECORD`, `STALE_REVIEW`, `COMMITS_UNREACHABLE` hard-coded `warning`; no board evidence; `MergeGatePhase2Evidence = {reviewStageId, finalStageId, blockers, review, commits}`.
- `packages/core/src/review-attestation.ts` (CORE-121) and `check-pr.mjs#parseReviewEvidence` are duplicate validators; no `board_sha`/`threads_snapshot`/`expected_reviewers` anywhere.
- `.github/workflows/pr.yml`: `on: pull_request` only; both jobs read `github.event.pull_request`.
- `apps/gui/src/main/kanmerGit.ts#syncBoard`: `add → commit → fetch → rebase → push`; any failure sets `paused: true`, which disables the timer (`shouldRunAutomaticSync`). `settings.ts` `gitSyncMinutes` defaults to 0. No ahead/behind anywhere; `get_status.boardWorktree` has branch health only.
- Worktree for this ticket: `.worktrees/core-123`, branch `core-123-merge-gate-board-sync` from `origin/main` (dc514375).

## Governing docs
- FRD-034 (durable goal control and independent review) — **Meets** AC2 ("bind the verdict/findings to the exact PR head") by making head-mismatch/needs-changes blocking under strict and binding the attestation additionally to the board tip (`board_sha` → `SYNC_REQUIRED`); AC5 is served by `expected_reviewers` being carried for SKILL-037.
- FRD-035 (golden board and promotion safety) — **Meets** AC5 ("required CI and Kanmer gates are green") by making the gate re-run when the board moves, so a green gate reflects the pushed board.
- ADR-0011 / ADR-0016 — **Modifies** wording only, under the ticket's explicit approach ("gate behind repo variable `KANMER_GATE_STRICT` for one release"): warnings remain the default; one sentence in each ADR records that `KANMER_GATE_STRICT` promotes them to errors and that `SYNC_REQUIRED` compares the attested `board_sha` with the fetched board tip. Core still spawns no git; ancestry evidence is collected at the CLI boundary exactly as ADR-0011 already allows. No new ADR.

## Required changes
1. **Core gate.** `MergeGateFindingCode` gains `SYNC_REQUIRED`. `MergeGatePhase2Evidence` gains `strict?: boolean` (default false) and `board?: { sha: string | null; attestedSha?: string; state: "current" | "stale" | "unknown" | "unrecorded" }`. Level for `NO_REVIEW_RECORD`, `STALE_REVIEW`, `COMMITS_UNREACHABLE`, `SYNC_REQUIRED` = `strict ? "error" : "warning"`. `SYNC_REQUIRED` outcomes: `current` → pass; `unrecorded` (no `board_sha` in attestation, or absent/invalid attestation) → pass with message "attestation records no board_sha"; `stale`/`unknown` → fail with details `{attestedBoardSha, boardSha, state}`; when no board evidence is supplied at all → skipped. `MergeGateResult.boardSha: string | null` set from `evidence.board?.sha ?? null`. `skipped()` and `phase2NoTicket` include the new code last in order. `MergeGateReviewValid` gains optional `boardSha`, `expectedReviewers`, `threadsSnapshot` passthrough via `details`.
2. **Core attestation parser.** `parseReviewAttestation` accepts optional `board_sha` (must be full 40-hex if present), `expected_reviewers` (array of non-empty strings if present), `threads_snapshot` (array if present); returns `boardSha?`, `expectedReviewers?`, `threadsSnapshot?`, `planHash`. Existing valid files stay valid.
3. **check-pr.mjs.** Import `parseReviewAttestation`; `parseReviewEvidence(raw)` becomes a wrapper returning `{state, reason}` or `{state:"valid", headSha, verdict, boardSha, details}`. Read `KANMER_GATE_STRICT` (`1|true|yes`, case-insensitive) → `strict`. Board evidence from new `collectBoardEvidence({ boardRoot, attestedSha })` in `git-reachability.mjs`: `rev-parse HEAD` in boardRoot (null if not a git checkout → state `unrecorded` when no attestedSha, `unknown` otherwise); with attestedSha: `merge-base --is-ancestor <attested> HEAD` exit 0 → `current`, 1 → `stale`, other → `unknown`. Evidence passed for both the resolved and empty paths. Output JSON now carries `boardSha`.
4. **Workflow.** `on:` adds `workflow_dispatch` and `push: branches: [main, kanmer-board]`. `verify` runs for `pull_request` (non-edited) and `push` to `main`. `kanmer-gate` runs only for `pull_request`; adds env `KANMER_GATE_STRICT: ${{ vars.KANMER_GATE_STRICT || '' }}` on the gate step. New job `regate` (`if: github.event_name == 'workflow_dispatch' || (github.event_name == 'push' && github.ref == 'refs/heads/kanmer-board')`, `permissions: actions: write, pull-requests: read, contents: read`, ubuntu-latest): `gh pr list --base main --state open --json headRefOid`; for each head, `gh run list --workflow pr.yml --commit <sha> --event pull_request --json databaseId --limit 1`; then `gh api .../runs/<id>/jobs` to find the `kanmer-gate` job id and `gh run rerun <runId> --job <jobId>`; logs and continues on any per-PR failure; exits 0. Comment notes that the trigger branch is literal because `on:` cannot read `vars`.
5. **GUI sync.** `syncBoard`: rebase with `--autostash`; after a successful rebase run `add`+conditional commit again so autostash-restored writes ride along; on failure, `classifySyncFailure(message)` → `"conflict"` when the message matches `/CONFLICT|could not apply|Resolve all conflicts|autostash.*conflict|rebase.*in progress/i`, else `"transient"`; conflict → `paused: true` (after `rebase --abort`), transient → `paused: false`, `error` set, so the timer retries. Exported pure helper is unit-tested. Status gains `sync?: { remote: boolean; ahead: number; behind: number; localSha: string | null; remoteSha: string | null }` computed by new `inspectBoardSync(boardRoot, branch)` (`git remote get-url origin`, `rev-parse HEAD`, `rev-parse refs/remotes/origin/<branch>`, `rev-list --left-right --count HEAD...refs/remotes/origin/<branch>`; all failures → zeros/null, never throws), attached in `ensureBoardWorktree`'s available results and by `syncBoard` on both success and failure. `shouldScheduleAutomaticSync(status, minutes)` additionally requires `status.sync?.remote !== false`.
6. **GUI settings/UI.** `settings.ts`: absent/invalid `gitSyncMinutes` → 5 (new `DEFAULT_GIT_SYNC_MINUTES`), explicit non-negative integer kept (0 = off); `setKanmerGitPreferences` keeps 0 as off. `ipc.ts` type gains `sync?`. `Settings.tsx` hint shows `ahead N · behind M` and "unpushed board commits" when ahead > 0. `index.ts` status snapshot passes `sync` through (spread already covers it; confirm at L897–910).
7. **MCP get_status.** `boardSync: { remoteBranch, localSha, remoteSha, ahead, behind } | null` computed with the paired git probe in `packages/mcp-server/src/index.ts` (null when the board is not a git checkout or has no remote-tracking ref); tool description sentence added; `smoke.mjs` asserts shape; tool-reference.md mentions it.
8. **Skill + docs.** kanmer-review template adds `board_sha: "<git rev-parse HEAD of the board worktree after pushing>"` plus optional `expected_reviewers: []`, `threads_snapshot: []`, and one sentence: push the board before writing `board_sha`; ADR-0011/0016 one-sentence amendments.
9. **Bundle.** `npm run build` regenerates `plugins/kanmer/mcp/kanmer-mcp.cjs`; commit it.

## Expected files
| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/core/src/merge-gate.ts` | codes, levels, board evidence, boardSha |
| Modify | `packages/core/src/merge-gate.test.ts` | strict/default, SYNC_REQUIRED states, order |
| Modify | `packages/core/src/review-attestation.ts` | optional fields |
| Add | `packages/core/src/review-attestation.test.ts` | field cases |
| Modify | `packages/core/src/index.ts` | type exports if needed |
| Modify | `packages/mcp-server/src/check-pr.mjs` | shared parser, strict, board evidence |
| Modify | `packages/mcp-server/src/git-reachability.mjs` | `collectBoardEvidence` |
| Modify | `packages/mcp-server/src/check-pr.test.mjs` | fixtures per ticket Verification |
| Modify | `packages/mcp-server/src/index.ts` | `boardSync` |
| Modify | `packages/mcp-server/src/smoke.mjs` | boardSync assertion |
| Modify (generated) | `plugins/kanmer/mcp/kanmer-mcp.cjs` | rebuilt bundle |
| Modify | `plugins/kanmer/skills/kanmer-review/SKILL.md` | attestation template |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | get_status note |
| Modify | `.github/workflows/pr.yml` | triggers, strict env, regate |
| Modify | `apps/gui/src/main/kanmerGit.ts`, `kanmerGit.test.ts` | race fix, classify, sync counts |
| Modify | `apps/gui/src/main/settings.ts` (+ its test if present), `apps/gui/src/main/index.ts`, `apps/gui/src/shared/ipc.ts`, `apps/gui/src/renderer/src/components/Settings.tsx` | default 5, type, hint |
| Modify | `docs/architecture/adr/ADR-0011-…md`, `ADR-0016-…md` | wording |

## Do not modify
`.worktrees/kanmer` (board worktree), any `.kanmer` file directly, `packages/core/src/store.ts` backward-move logic, `release.yml`, existing test assertions (no weakening), other tickets.

## Constraints
- Core stays git-free (ADR-0011); git only in `check-pr.mjs`/`git-reachability.mjs`, GUI main, MCP server probe.
- Default (non-strict) gate output must keep today's levels; only additive keys (`boardSha`, `SYNC_REQUIRED` check) change the JSON.
- Existing attestations without `board_sha` remain valid and pass `SYNC_REQUIRED` as `unrecorded`.
- Persisted `gitSyncMinutes: 0` stays off; only an absent key defaults to 5.
- `plugin:check` requires the rebuilt bundle in the same commit.
- Windows dev host: write files with Edit/Write tools (LF), `MSYS_NO_PATHCONV=1` for `git show ref:path`.

## Ordered steps
1. `git fetch origin`; `git worktree add .worktrees/core-123 -b core-123-merge-gate-board-sync origin/main`; `npm ci` there if `node_modules` missing (or reuse root install via workspace — verify `npm run build:core` works).
2. Core: review-attestation optional fields + test (step 2 of Required changes).
3. Core: merge-gate evidence/levels/SYNC_REQUIRED/boardSha + tests; `npm run test -w @kanmer/core` and `npm run build:core`.
4. mcp-server: `collectBoardEvidence`, check-pr rewrite, fixtures; run `npm run test:http -w @kanmer/mcp-server`.
5. mcp-server: `boardSync` in get_status + smoke assertion + tool-reference.
6. GUI: `classifySyncFailure`, `inspectBoardSync`, `syncBoard` autostash/retry, `shouldScheduleAutomaticSync` remote guard, settings default, ipc type, Settings.tsx hint, index.ts; tests incl. post-commit-hook race reproduction; `npm run test -w @kanmer/gui`.
7. Workflow `pr.yml` edits; validate YAML parses (`node -e` with js-yaml from node_modules) and `actionlint` if available (optional).
8. Skill template + ADR sentences.
9. `npm run build` (bundle), then `npm run verify` in background with a log; record exit codes; known host-only failures recorded verbatim.
10. Commit(s) with `Kanmer: CORE-123` footer; push; `gh pr create` with footer; write post-implementation report; move ticket to Review.

## Acceptance checks
- Production callers: `check-pr.mjs` is invoked by `pr.yml` `kanmer-gate` step; `syncBoard` by the GUI timer/`syncKanmerNow`; `get_status` tool registration in `packages/mcp-server/src/index.ts`.
- Bundle `plugins/kanmer/mcp/kanmer-mcp.cjs` rebuilt (`plugin:check` green).
- Tests (ticket Verification): `needs-changes` fails under strict / warns by default; missing attestation same; stale `board_sha` → `SYNC_REQUIRED` fail; current → pass; no `board_sha` → pass unrecorded; GUI race test passes with autostash; transient error leaves `paused:false`; conflict keeps `paused:true`; ahead/behind counts correct; settings default 5 / explicit 0 off.
- Hosted: first `kanmer-board` push after the PR opens re-runs `kanmer-gate` on it (observed in the PR checks; reviewer to confirm).

## Commands
- cwd `.worktrees/core-123`: `npm run build:core`; `npm run test -w @kanmer/core`; `npm run test:http -w @kanmer/mcp-server`; `npm run test -w @kanmer/gui -- kanmerGit`; `npm run typecheck`; `npm run build`; `npm run verify > verify.log 2>&1` (background, 15 min).

## Failure and deviation rules
Stop and report: an existing test must be weakened to pass; `plugin:check` cannot be satisfied; the regate job needs a separate workflow file or a PAT; store.ts changes become necessary; scope grows (split via kanmer-tickets with `blocks`). Host-only known failures are recorded, not chased.

## Stop condition
PR open against `main` with a `Kanmer: CORE-123` footer, post-implementation report written, ticket moved to Review. Do not review, merge, verify, close out, or release the claim.

## Remediation round 1 (2026-08-27, after review v9770bd1beecdaa95)

Revisions to Required change 4 and 5 and to the Hosted acceptance check, recorded rather than silently coded around:

- **Change 4 (workflow) — the failure rule "regate needs a separate workflow file" applied.** `pr.yml` on `main` can never receive `push: kanmer-board` (GitHub runs push workflows from the pushed ref's tree; the board branch has only `.gitignore` and `.kanmer`). Honest shape: `push: branches: [main]` + `workflow_dispatch`; `regate` runs on both (a `main` push moves every open PR's base, so re-judging is real work). A separate minimal `.github/workflows/board-regate.yml` (`on: push: kanmer-board` → `gh workflow run pr.yml --ref main`, `GITHUB_TOKEN` suffices because `workflow_dispatch` is exempt from the no-chained-runs rule) ships on `main` as the file an **operator** copies onto the board branch; agents never commit to the board branch, so the board-push re-gate is operator-enabled, not automatic.
- **Change 5 (GUI sync) — autostash conflict detection.** `git rebase --autostash` exits 0 when re-applying the stash conflicts; `syncBoard` now checks `git diff --name-only --diff-filter=U` and whether a new `refs/stash` survived the rebase, aborts any in-progress rebase, never stages, and pauses with a conflict error. No automatic `stash pop`/`checkout --merge`; the stash keeps the local writes for a human.
- **Hosted acceptance check** now reads: a push to `main` re-runs `kanmer-gate` on open PRs; a `kanmer-board` push does so only after the operator installs `board-regate.yml` on the board branch.
