# Independent review — CORE-039

## Verdict

**PASS for the CORE-039 implementation; no code changes requested.** Review performed against commit `79c85e07c977f29270ca84f62b1c729b28fe1d57` in `.worktrees/core-039`. This is an independent review; this reviewer did not merge or move the ticket.

## Findings

- **Fixture fidelity: PASS.** The disposable ticket reproduces the release-notes inputs from live CORE-027 and merged PR #96: `CORE-027`, title `Give @kanmer/core a browser-safe subpath export`, `status: done`, `area: core`, `stageEntered.done: 2026-08-21T01:04:37.070Z`, `prs: ['96']`, and the recorded created/updated timestamps. PR #96 is merged and titled `CORE-027: add browser-safe core export`; the regression assertion checks the canonical repository PR URL and rejects shorthand output. The fixture contains the exact fields consumed by `release-notes.mjs` (done timestamp/status/PR/area) and the focused test passes.
- **Environment seam/default: PASS.** `KANMER_BOARD_ROOT` is opt-in and trimmed; relative values resolve from the script checkout root and absolute values remain absolute. When unset, the existing `mainCheckout()/.worktrees/kanmer` discovery is unchanged. A real default invocation from this worktree exited 0 and included CORE-027/PR #96; an invalid explicit root preserved the existing exit-1 “No board at …” behavior.
- **Failure cleanup: PASS.** The fixture creation is outside the `try` (so setup failures are surfaced), while child execution and both assertions are inside `try/finally`; `rmSync(boardRoot, { recursive: true, force: true })` runs on pass or assertion/child failure and does not swallow assertion/child errors.
- **Scope and diff: PASS.** The commit changes only `scripts/release-notes.mjs` and `scripts/release-notes.test.mjs`; no dependency, production discovery default, board data, or unrelated CORE-038/MCP-041 work is absorbed. `git diff --check` exited 0.

## Verification evidence

- `npm run build`: exit 0.
- `node --test scripts/release-notes.test.mjs`: exit 0, 1/1.
- `npm run test:scripts`: exit 0, 80/80.
- `npm run typecheck`: exit 0 for core, mcp-server, ui, and gui.
- `git diff --check af61144ce743f74b2aba92fb0778588b0b9bedd0..HEAD`: exit 0.
- PR #147 hosted verify run `32543841729` / job `96958721319` is red, but the failure is outside this diff: GUI `renameBoardBranch > keeps the history, the path and the remote consistent` (352 total, 351 passed), with the expected-vs-received Windows short/long user path mismatch. The release-notes focused test and all 80 script tests passed in that run before the unrelated GUI failure. Treat the hosted red check as an existing/baseline CI issue, not a CORE-039 implementation finding.

No blocking review findings.
