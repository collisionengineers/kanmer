# Post-implementation report — CORE-123

PR: https://github.com/collisionengineers/kanmer/pull/288 · branch `core-123-merge-gate-board-sync` · head `8989669316befc635a6a85f6a3271873779ad93d` · base `origin/main` dc514375 · worktree `.worktrees/core-123`.
Commits: `51a736f9` (implementation), `89896693` (workflow-test pin, AGENTS.md, tool-reference wording).

## Files changed and why

| File | Why |
| --- | --- |
| `packages/core/src/merge-gate.ts` | `SYNC_REQUIRED` code; `strict` and `board` evidence on `MergeGatePhase2Evidence`; `levelFor()` makes NO_REVIEW_RECORD/STALE_REVIEW/COMMITS_UNREACHABLE/SYNC_REQUIRED `error` only under strict; `syncCheck()` (current/unrecorded pass, stale/unknown fail, skipped without evidence); result gains `boardSha`, `strict`; skipped lists extended in order |
| `packages/core/src/merge-gate.test.ts` | Existing ordered-check expectations extended by the 8th code (additive); new strict-vs-default and SYNC_REQUIRED state tests |
| `packages/core/src/review-attestation.ts` | Optional `board_sha` (40-hex), `expected_reviewers` (non-empty strings), `threads_snapshot` (array); returns `boardSha/expectedReviewers/threadsSnapshot/planHash`; existing attestations unchanged |
| `packages/core/src/review-attestation.test.ts` (new) | absent/valid/malformed for each optional field |
| `packages/mcp-server/src/git-reachability.mjs` | `collectBoardEvidence({boardRoot, attestedSha})` — `rev-parse HEAD`, `merge-base --is-ancestor`; never throws; non-git board → unrecorded/unknown |
| `packages/mcp-server/src/check-pr.mjs` | Uses core `parseReviewAttestation` (duplicate validator removed, `parseReviewEvidence` kept as wrapper), `readStrictFlag()` from `KANMER_GATE_STRICT`, passes `strict` + board evidence on both resolved and no-ticket paths |
| `packages/mcp-server/src/check-pr.test.mjs` | Strict-flag parsing; needs-changes/missing attestation warn by default and exit 1 under strict; git-backed board fixture: current, ancestor, unknown (never pushed), stale (diverged via `commit-tree`), malformed `board_sha`; optional fields carried |
| `packages/mcp-server/src/index.ts` | `inspectBoardSync()` + `get_status.boardSync` block (null-safe) and tool description sentence |
| `packages/mcp-server/src/smoke.mjs` | Shape assertion for `boardSync` |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated bundle (`plugin:build`; `plugin:check` OK) |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | Attestation template adds `board_sha` (+ optional `expected_reviewers`, `threads_snapshot`) and the push-first rule |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `get_status.boardSync` note (worded without a `kanmer-gate` token — `verify:skills` treats it as a skill reference) |
| `.github/workflows/pr.yml` | `workflow_dispatch`; `push: [main, kanmer-board]`; `verify` runs for PRs (non-edited) and pushes to `main`; `kanmer-gate` PR-only with `KANMER_GATE_STRICT` env; new `regate` job (`actions: write`) re-runs the `kanmer-gate` job of the latest PR run for each open PR into `main` via `gh run rerun --job` |
| `scripts/pr-workflow.test.mjs` | Pins the new trigger/strict/regate contract (added assertions; existing ones untouched) |
| `AGENTS.md` | Gate section documents the push triggers, `regate`, and the strict switch (outside the managed block; `verify:agents-block` 31/31) — small deviation from the files map, required by the section's own "update the test and docs when changing the trigger" rule |
| `apps/gui/src/main/kanmerGit.ts` | `syncBoard`: `rebase --autostash` + second stage pass; `classifySyncFailure` (conflict → `paused: true`, else `paused: false`); `inspectBoardSync`; `sync` attached to all available statuses; `shouldScheduleAutomaticSync` requires `sync.remote !== false` |
| `apps/gui/src/main/kanmerGit.test.ts` | Race reproduction via a self-removing `post-commit` hook; transient-vs-conflict; ahead/behind counts; no-remote guard; classifier unit test |
| `apps/gui/src/main/settings.ts`, `settings.test.ts` | Absent `gitSyncMinutes` → `DEFAULT_GIT_SYNC_MINUTES` (5); explicit 0 stays off |
| `apps/gui/src/shared/ipc.ts`, `renderer/.../Settings.tsx` | `sync?` type; "ahead N · behind M" and unpushed-commits hint |
| `docs/architecture/adr/ADR-0011…`, `ADR-0016…` | One-sentence amendments recording the strict switch, `SYNC_REQUIRED`, and the board-push re-run |

## Governing docs

- FRD-034 AC2 — met: under strict, a head mismatch or `needs-changes` blocks; the attestation is additionally bound to the pushed board tip via `board_sha`/`SYNC_REQUIRED`. AC5 — `expected_reviewers` is carried for SKILL-037 (no settlement logic here, per plan).
- FRD-035 AC5 — met: a board push re-judges open PRs so a green gate reflects the pushed board; merge SHAs on `main` get a bound `verify` run.
- ADR-0011 / ADR-0016 — wording amended only as the plan authorised; core spawns no git; the 0/1/2 + JSON + annotation contract is unchanged apart from additive keys (`boardSha`, `strict`, the `SYNC_REQUIRED` check).

## Commands and results (cwd `.worktrees/core-123` unless noted)

| Command | Exit | Notes |
| --- | --- | --- |
| `npm ci` | 0 | |
| `npx vitest run packages/core/src/merge-gate.test.ts packages/core/src/review-attestation.test.ts --root packages/core` | 0 | 19 passed |
| `npm run build:core` | 0 | |
| `node --test packages/mcp-server/src/check-pr.test.mjs` (attempt 1) | 0 (1 subtest failed) | fixture: `git checkout -b diverged` refused by uncommitted board writes — fixture rewritten with `commit-tree` |
| `node --test packages/mcp-server/src/check-pr.test.mjs` (attempt 2) | 0 | 8/8 |
| `npx vitest run src/main/kanmerGit.test.ts src/main/settings.test.ts` (apps/gui, attempt 1) | 143 | killed at the 10-min tool timeout (53 real-git tests on a loaded host) — INCONCLUSIVE |
| `npx vitest run src/main/kanmerGit.test.ts -t "<new tests>"` (attempts 1–3) | 1, 1, 0 | fixture fixes: `--git-path` absolute path (`resolve`), hook firing twice (self-removing hook); attempt 3 green |
| `node -e "js-yaml.load(pr.yml)"` | 0 | `actionlint` not installed — INCONCLUSIVE |
| `npm run typecheck` | 0 | |
| `npm run build` | 0 | |
| `npm run plugin:check` → `npm run plugin:build` → `npm run plugin:check` | 1 → 0 → 0 | bundle regenerated and committed |
| `npm run verify` (attempt 1, background) | 1 | stopped at `npm test` core: `store.test.ts › format v1 compatibility › does not re-issue an id that already exists in the other layout` — 5000 ms vitest timeout + `ENOTEMPTY rmdir …\.kanmer`; ran concurrently with an orphaned first verify |
| `npm run verify` (attempt 2, alone) | 1 | same single test, same error |
| `npx vitest run src/store.test.ts -t "does not re-issue an id"` in `.worktrees/core-123/packages/core` | 0 | passes alone (5062 ms) |
| same command in the untouched `main` checkout `packages/core` | 1 | fails identically (`store.ts`/`store.test.ts` untouched by this PR) — host quirk, recorded not chased |
| `npm run test:scripts` (attempt 1) | 1 | 3 failures: 2 known `antigravity-plugin-config` host quirks + `pr-workflow.test.mjs` "kanmer gate follows the configured board branch" (my multi-line `if:` broke its regex) — fixed by keeping `if:` on one line and moving the comment above the job |
| `npm run test:scripts` (attempt 2) | 1 | 118 pass, 2 fail: only the known `antigravity-plugin-config.test.mjs` EBUSY/cmd.exe cases |
| `node --test scripts/pr-workflow.test.mjs` | 0 | after the fix |
| `npm run verify:docs` | 0 | |
| `node packages/mcp-server/src/smoke.mjs` | 0 | includes the new `boardSync` assertion |
| `npm run smoke:headless`, `npm run mcpb:check`, `npm run smoke:protocol`, `npm run smoke:discovery` | 0, 0, 0, 0 | |
| `npm run verify:skills` (attempt 1) | 1 | `kanmer-gate` in tool-reference.md read as a nonexistent skill — reworded |
| `npm run verify:skills` (attempt 2) | 0 | ALL CHECKS PASSED |
| `npm run verify:agents-block` | 0 | 31/31 |
| `npm run test -w @kanmer/gui` (full suite, attempt 1, detached) | — | process died silently at 15:30 — INCONCLUSIVE |
| `npm run test -w @kanmer/gui` (full suite, attempt 2) | 1 | 48 files pass, 2 fail: `connect.test.ts` GUI-100 launcher (EBUSY rmdir / 5 s timeout, known Windows class) and `kanmerGit.test.ts` — 23 tests including 3 new ones failed with "Hook timed out in 10000ms" (beforeEach `git init` under load) |
| `npx vitest run src/main/kanmerGit.test.ts src/main/settings.test.ts` (apps/gui, alone) | 0 | 65/65 passed — the hook timeouts do not reproduce when the file runs alone |

Hosted `verify` on PR #288 is authoritative for the rails that are host-flaky here.

## Risks and follow-ups

- `regate` needs `actions: write` for `GITHUB_TOKEN`; if the repo restricts workflow token permissions the job logs "not permitted" and exits 0 — the fallback is `workflow_dispatch`. It re-runs the gate job even for PRs whose gate already passed (harmless).
- The default (`KANMER_GATE_STRICT` unset) leaves `needs-changes` as a warning exactly as before; enabling strict is an operator repo-variable change.
- `SYNC_REQUIRED` only fires once reviewers write `board_sha`; the review skill template now asks for it. Existing attestations pass as `unrecorded`.
- The race reproduction test runs ~29 s on this host against the file's 30 s real-git budget; if it flakes hosted, raise that budget rather than weaken the assertions.
- `gitSyncMinutes` default applies only when the key is absent from settings.json; the operator's existing explicit value is untouched.

## For kanmer-verify (on the merged SHA)

1. `npm run verify` hosted (authoritative); locally expect the known host quirks above.
2. `node --test packages/mcp-server/src/check-pr.test.mjs` and `npx vitest run src/main/kanmerGit.test.ts` (apps/gui) alone.
3. Observe on GitHub: a push to `kanmer-board` after the merge triggers the `regate` job and a fresh `kanmer-gate` run appears on any open PR; a push to `main` runs `verify`.
4. `get_status` on the live board reports `boardSync` with integer `ahead`/`behind`; GUI Settings shows "ahead N · behind M".
