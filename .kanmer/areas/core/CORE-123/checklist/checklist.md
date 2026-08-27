# Checklist — CORE-123

- [x] Worktree `.worktrees/core-123` on branch `core-123-merge-gate-board-sync` from `origin/main` (dc514375); `npm run build:core` works there.
- [x] `review-attestation.ts` parses optional `board_sha` (40-hex), `expected_reviewers` (non-empty strings), `threads_snapshot` (array); returns `boardSha/expectedReviewers/threadsSnapshot/planHash`; new `review-attestation.test.ts` covers absent/valid/malformed for each.
- [x] `merge-gate.ts`: `SYNC_REQUIRED` code, `strict` + `board` evidence, level chooser for the four checks, `boardSha` on result, skipped lists extended; `merge-gate.test.ts` covers default vs strict levels, current/stale/unknown/unrecorded/skipped, stable order.
- [x] `git-reachability.mjs#collectBoardEvidence` (rev-parse HEAD, merge-base --is-ancestor, tolerant of non-git board dir).
- [x] `check-pr.mjs` imports `parseReviewAttestation`, keeps `parseReviewEvidence` wrapper, reads `KANMER_GATE_STRICT`, passes board evidence, emits `boardSha`.
- [x] `check-pr.test.mjs` fixtures: needs-changes fails (strict) / warns (default); missing attestation same; stale `board_sha` → `SYNC_REQUIRED` fail with exit 1 under strict; current passes; no `board_sha` passes; non-git board unrecorded.
- [x] `get_status.boardSync` in `packages/mcp-server/src/index.ts` (null-safe), smoke.mjs assertion, tool-reference.md note.
- [x] `kanmerGit.ts`: `classifySyncFailure`, `inspectBoardSync`, `syncBoard` uses `rebase --autostash` + post-rebase re-add/commit, transient ⇒ `paused:false`, conflict ⇒ `paused:true`; `shouldScheduleAutomaticSync` requires `sync.remote !== false`.
- [x] `kanmerGit.test.ts`: post-commit-hook race reproduction syncs and stays unpaused; conflict path pauses; transient classification unit test; ahead/behind counts.
- [x] `settings.ts` absent `gitSyncMinutes` → 5, explicit 0 stays off (test); `ipc.ts` `sync?` type; `Settings.tsx` ahead/behind hint; `index.ts` passes `sync` through (spread of `ctx.syncStatus`, no change needed).
- [x] `pr.yml`: `workflow_dispatch`, `push: [main, kanmer-board]`, `if:` guards, `KANMER_GATE_STRICT` env, `regate` job with `gh run rerun --job`; YAML parses (js-yaml); actionlint unavailable on host; `scripts/pr-workflow.test.mjs` pins the contract.
- [x] kanmer-review SKILL.md template adds `board_sha` (+ optional `expected_reviewers`, `threads_snapshot`) and the push-first sentence; ADR-0011/ADR-0016 one-sentence amendments; AGENTS.md gate section updated.
- [x] `npm run build` regenerates `plugins/kanmer/mcp/kanmer-mcp.cjs` (`plugin:build` + `plugin:check` OK); committed with the change.
- [x] [pre-review] Focused tests and `npm run verify` run with exact commands/exit codes recorded (post-implementation-report §Commands); known host-only failures recorded verbatim (core `store.test.ts` v1 id test, `antigravity-plugin-config`, GUI hook timeouts under load, `connect.test.ts` EBUSY); no assertion weakened.
- [x] [pre-review] Commits `51a736f9`, `89896693` and PR #288 carry `Kanmer: CORE-123`; post-implementation report written; ticket moved to Review; stopped.
- [ ] [post-merge] Reviewer/verifier observes a `kanmer-board` push re-running `kanmer-gate` on an open PR.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.

- 2026-08-27 execute: implementation complete; focused tests green (see scratch/execute.md for exact commands/exits); full `npm run verify` running in background, result to be appended.
- 2026-08-27 execute: `npm run verify` exit 1 twice on the host-only core `store.test.ts` timeout (identical on untouched main); remaining rails run individually — see the report. PR https://github.com/collisionengineers/kanmer/pull/288, head 8989669316befc635a6a85f6a3271873779ad93d.
