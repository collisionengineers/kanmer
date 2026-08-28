# Checklist — CORE-128

*One independently tickable box per ordered plan step or acceptance check.*

- [x] Step 1 — `npm install` in `.worktrees/core-128` so the worktree owns its `@kanmer/core` resolution (`plugin:check` refuses otherwise).
- [x] Step 2 — Add `removeTreeWithRetry` to `packages/core/src/io.ts` with a doc comment naming the Windows open-handle behaviour and the bounded retry budget; `npm run build:core` succeeds.
- [x] Step 3 — Add `packages/core/vitest.config.ts` setting `testTimeout`/`hookTimeout` to 30 s with a comment sizing it against the 2 145 ms lock-acquisition budget and the ~1 s PowerShell process-identity probe.
- [x] Step 4 — Route every temp-root teardown in `packages/core/src/*.test.ts` through `removeTreeWithRetry`; `npm run test -w @kanmer/core` passes 465/465 under the load recipe.
- [x] Step 5 — Route `packages/mcp-server` and `scripts` test teardowns through the helper; raise `http.test.mjs`'s `spawnSync` timeout and `readiness.test.mjs`'s "delayed local success" `timeoutMs`, each with a comment naming the Windows/load behaviour accommodated.
- [x] Step 6 — `scripts/antigravity-plugin-config.test.mjs`: delete `NoDefaultCurrentDirectoryInExePath` from the child env with a comment, route the `finally` removals through the helper; both `cmd.exe` tests pass in this agent shell (they fail 1/1 today).
- [x] Step 7 — Route `apps/gui` test teardowns through the helper via `@kanmer/core`; `npm run typecheck` passes.
- [x] Step 8 — Add the AGENTS.md §8 gotcha covering all three causes and the rule that new tests use `removeTreeWithRetry`.
- [x] Step 9 — `npm run plugin:build` then `npm run plugin:check` succeed in the worktree (committed generated artifact refreshed).
- [x] Step 10 — [pre-review] Ten consecutive `npm run verify` runs, at least three under concurrent load; every exit code recorded, and the honest count reported if ten are not reached.
- [x] Step 11 — [pre-review] `git diff` shows no removed or loosened `expect`/`assert` and no unauthorised `.skip`/`.only`/`.todo`; every raised timeout carries its comment.
- [x] Step 12 — [pre-review] Write the post-implementation report, open the PR with a `Kanmer: CORE-128` footer, move the ticket to Review — and stop there: no review, merge, verify, closeout or release.

## Progress notes

**Steps 1-9, 11 complete** (commit `5a631455`).

- Step 4 evidence: the exact reproduction that failed 3 tests before the change
  (`npx vitest run` with file parallelism on, plus 4 load generators) now exits 0 with
  465/465 passing.
- Step 6 evidence: `node --test scripts/antigravity-plugin-config.test.mjs` exits 0 with 4/4
  passing and **0 skipped** in this agent shell — the two `cmd.exe` tests genuinely ran
  (107 ms / 126 ms) rather than being skipped away. They failed 1/1 before the change.
- Step 9 **deviation**: `plugin:build` regenerated the bundle to *identical bytes* and
  `plugin:check` passed ("39 tools match, bundle bytes match"). tsup tree-shakes the new
  export because no server code calls it, so `plugins/kanmer/mcp/kanmer-mcp.cjs` is
  correctly **not** in the diff. The plan predicted a bundle change; the rebuild was still
  run and certified, which is what the gotcha requires.
- Step 11 evidence: `git diff -U0 | grep '^-' | grep -E 'expect\(|assert\.'` returns nothing —
  no assertion was removed or loosened. The only new `.skip` is the authorised, reason-carrying
  `t.skip()` in the two antigravity tests, which did not fire.
- Full `npm test` (core 465, gui 520, mcp-server http, scripts) exits 0; `npm run typecheck`
  exits 0.

- [x] Step 10 — [pre-review] Ten consecutive `npm run verify` runs, at least three under concurrent load; every exit code recorded, and the honest count reported if ten are not reached.

**Achieved in full: 10/10 exit 0, runs 1-3 under three load generators each**, at
`7061045b` (rebased onto `origin/main` `bf0eaed4`). Seconds: 955, 840, 786, 441, 439, 501,
511, 455, 490, 563. Every run completed the whole rail (last step `plugin-sync OK`), and
`node:test` reported `skipped 0`, so the conditional antigravity skip never fired.

Two earlier sweeps were abandoned rather than counted, and are reported as such:

- **Sweep A** — run 1 (loaded) failed on `readiness.test.mjs > readiness accepts only a
  bounded successful loopback /ready response` with `TUNNEL_READINESS_TIMEOUT`: a 100 ms
  wall-clock budget for two event-loop-scheduled polls. A new member of the family, in a file
  the ticket names. Fixed, then the whole mcp-server suite was hammered 5× under 6 generators
  (5/5 exit 0) rather than waiting for the next sweep to find the next one.
- **Sweep B** — run 3 (loaded) failed on `kanmerGit.test.ts > serializes concurrent orphan
  cleanup and leaves no quarantine residue`, `expected false to be true`. Not a test budget: a
  real defect (cause 4 in the report). Fixed and proven 3/3 under load.
- **Operator error, recorded:** an early attempt ran two sweeps concurrently in the same
  worktree after a `pkill` failed to take. Those results were discarded as uninterpretable and
  the sweep was restarted single-instance under a lock directory. The `kanmerGit` failure it
  had surfaced was not an artefact — it reproduced in the guarded sweep.

- [x] Step 12 — [pre-review] Write the post-implementation report, open the PR with a `Kanmer: CORE-128` footer, move the ticket to Review — and stop there: no review, merge, verify, closeout or release.


## Red-main remediation — `d523a293`

- [x] Preserve the exact merged-SHA FAIL proof and deterministic 15-call mechanism.
- [x] Resume the recorded branch/worktree and preserve reviewed head `1d1f09b…` through an ordinary current-main merge.
- [x] Convert exactly the 15 remaining bare teardown calls; preserve every assertion and keep the diff to one file.
- [x] Pass the three focused checks at candidate `662938db…`.
- [x] Pass one complete authoritative rail from a clean standalone Windows checkout at exact `662938db…`.
- [x] Push ordinarily and open remediation PR #305 with a `Kanmer: CORE-128` footer.
- [x] Hand the unchanged exact head to a fresh independent reviewer; no self-review, merge, verification, closeout, or release in this execution lane.
