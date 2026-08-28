# Checklist — CORE-128

*One independently tickable box per ordered plan step or acceptance check.*

- [ ] Step 1 — `npm install` in `.worktrees/core-128` so the worktree owns its `@kanmer/core` resolution (`plugin:check` refuses otherwise).
- [ ] Step 2 — Add `removeTreeWithRetry` to `packages/core/src/io.ts` with a doc comment naming the Windows open-handle behaviour and the bounded retry budget; `npm run build:core` succeeds.
- [ ] Step 3 — Add `packages/core/vitest.config.ts` setting `testTimeout`/`hookTimeout` to 30 s with a comment sizing it against the 2 145 ms lock-acquisition budget and the ~1 s PowerShell process-identity probe.
- [ ] Step 4 — Route every temp-root teardown in `packages/core/src/*.test.ts` through `removeTreeWithRetry`; `npm run test -w @kanmer/core` passes 465/465 under the load recipe.
- [ ] Step 5 — Route `packages/mcp-server` and `scripts` test teardowns through the helper; raise `http.test.mjs`'s `spawnSync` timeout and `readiness.test.mjs`'s "delayed local success" `timeoutMs`, each with a comment naming the Windows/load behaviour accommodated.
- [ ] Step 6 — `scripts/antigravity-plugin-config.test.mjs`: delete `NoDefaultCurrentDirectoryInExePath` from the child env with a comment, route the `finally` removals through the helper; both `cmd.exe` tests pass in this agent shell (they fail 1/1 today).
- [ ] Step 7 — Route `apps/gui` test teardowns through the helper via `@kanmer/core`; `npm run typecheck` passes.
- [ ] Step 8 — Add the AGENTS.md §8 gotcha covering all three causes and the rule that new tests use `removeTreeWithRetry`.
- [ ] Step 9 — `npm run plugin:build` then `npm run plugin:check` succeed in the worktree (committed generated artifact refreshed).
- [ ] Step 10 — [pre-review] Ten consecutive `npm run verify` runs, at least three under concurrent load; every exit code recorded, and the honest count reported if ten are not reached.
- [ ] Step 11 — [pre-review] `git diff` shows no removed or loosened `expect`/`assert` and no unauthorised `.skip`/`.only`/`.todo`; every raised timeout carries its comment.
- [ ] Step 12 — [pre-review] Write the post-implementation report, open the PR with a `Kanmer: CORE-128` footer, move the ticket to Review — and stop there: no review, merge, verify, closeout or release.

## Progress notes
