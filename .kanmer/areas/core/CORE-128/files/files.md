# Files — CORE-128

*The files document. Not the research — this is the **surface area** of the change, not the findings behind it.*

Full reproduction evidence, measurements and root-cause analysis are in `scratch/research.md`.
Three independent causes were confirmed; each lands in a different place.

## Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/io.ts` | Gains one exported helper, `removeTreeWithRetry`, sitting beside `renameWithRetry` — the same species of accommodation for the same Windows behaviour (an open handle blocks the operation for a few ms). Node's recursive `fs.rm` already retries `EBUSY`/`ENOTEMPTY`/`EPERM`, but only when `maxRetries > 0`, and the default is `0`. Risk: `io.ts` is core source, so the committed plugin bundle must be rebuilt (see Ripple effects). |
| `packages/core/vitest.config.ts` (new) | packages/core has **no** vitest config, so vitest's 5 s default `testTimeout` applies. Set `testTimeout`/`hookTimeout` to 30 s with a comment naming the Windows costs being accommodated (measured: ~1 s PowerShell process-identity probe on the first locked write in a process, plus CORE-125's 2 145 ms lock-acquisition retry budget, before any assertion runs). Risk: a genuinely hung test now takes 30 s to report instead of 5 s. No assertion changes. |
| `packages/core/src/*.test.ts` (13 files with temp roots) | Every `afterEach`/`finally` recursive removal of an OS temp directory routes through `removeTreeWithRetry`. `store.test.ts`, `claims.test.ts`, `docs.test.ts`, `migrate.test.ts`, `project.test.ts`, `staleness.test.ts`, `merge-gate.test.ts`, `board.test.ts`, `sources.test.ts`, `dispatch-supervisor.test.ts` and `io.test.ts` are the observed and adjacent members. Risk: mechanical, but a missed `await` would silently leak temp directories. |
| `packages/mcp-server/src/**/*.test.mjs` | Same substitution, via `@kanmer/core` (already a real dependency; `project-registry.test.mjs` already imports it). Notably `http.test.mjs`, `sources.test.mjs`, `tunnels/cloudflared.test.mjs`, `check-pr.test.mjs`, `reconciliation.test.mjs`. |
| `packages/mcp-server/src/http.test.mjs` | Additionally: `spawnSync(process.execPath, …, { timeout: 2_000 })` boots a whole Node process that then imports `dist/http.js`. 2 s does not cover cold module load on a contended Windows host; raise with a comment. This is the ticket's `spawnSync ETIMEDOUT`. |
| `packages/mcp-server/src/tunnels/readiness.test.mjs` | The "delayed local success" case gives a real loopback server a `timeoutMs: 1_000` wall-clock budget while the server deliberately sleeps 150 ms. Raise the budget with a comment; the assertion (`attempts === 2`, and that the request deadline is not coupled to polling) is unchanged. This is the ticket's `TUNNEL_READINESS_TIMEOUT`. |
| `scripts/*.test.mjs` | Same removal substitution. `@kanmer/core` resolves from the root workspace symlink (precedent: `scripts/check-plugin-sync.mjs`), and `npm test` already requires a prior build because `test:http` imports `packages/mcp-server/dist`. |
| `scripts/antigravity-plugin-config.test.mjs` | Two changes. (1) The `finally` block removes a tree whose `bin` subdirectory is the just-exited `cmd.exe`'s working directory — the ticket's `EBUSY rmdir …\Kanmer Test Space\Kanmer\bin`; route it through the helper. (2) The child env is built as `{ ...process.env, LOCALAPPDATA }`, so it inherits `NoDefaultCurrentDirectoryInExePath=1` from an agent harness; cmd then drops the current directory from its search path and the shipped `pushd …\bin&&call kanmer-mcp.cmd` token cannot resolve the shim (`'kanmer-mcp.cmd' is not recognized`). Delete that one variable from the **child** env with a comment naming it. Risk: this is the highest-judgement edit in the ticket — see Out of scope for what is deliberately *not* being decided here. |
| `AGENTS.md` §8 | One new gotcha so a verifier stops rediscovering all three causes, and so new tests are written against the shared helper rather than a bare `fs.rm`. Risk: `npm run verify:agents-block` pins the managed block; the gotcha list is prose outside it, but the file is also checked by `verify:docs`. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated committed build artifact — mandatory because `io.ts` changed (AGENTS.md §8 gotcha 8). |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/io.ts` | `renameWithRetry` and `RENAME_RETRY_MS` are the existing precedent for bounded Windows retries and the comment style expected (name the OS behaviour, not "flaky"). `DEFAULT_LOCK_RETRY_MS = [10, 25, 60, 150, 300, 600, 1000]` is the 2 145 ms figure any new timeout must be sized against. `defaultProcessIdentity()` is the `execFileSync("powershell.exe", …)` that costs ~776 ms (self, then cached per module instance) / ~1 103 ms (foreign pid, never cached). |
| `packages/core/src/store.ts` `withLeaseLock` (~line 1137) | Every `updateItem`/`moveItem`/`setDoc`/`appendScratch` now runs inside the board write lock, which is why store/claims/docs tests got slower after CORE-125. It passes **no** `ExclusiveFileLockOptions`, so the default PowerShell identity probe applies. |
| `AGENTS.md` §8 gotcha 17 | The write-lock contract this ticket must not disturb: re-entrancy is per async execution context, nothing slow belongs inside the lock. Explains why the fix is a timeout, not a lock change. |
| `AGENTS.md` §8 gotcha 8 | Core-only fixes still need `npm run plugin:build`; `plugin:check` compares committed bundle bytes against a fresh build and **refuses** in a checkout that does not own its `@kanmer/core` resolution — so the worktree needs its own `npm install` before `plugin:build`/`plugin:check` mean anything. |
| `AGENTS.md` §8 gotcha 13 | The Antigravity launcher token is a deliberate, hard-won contract (quote-free, space-safe, `pushd`+`call`). Do not "fix" the token to dodge the test failure. |
| `packages/core/package.json` | `test` is `vitest run --no-file-parallelism`; that flag is the rail's real configuration and must stay. Raising file parallelism is a *reproduction* lever only. |
| `scripts/test-scripts.mjs` | `scripts/*.test.mjs` are node:test files run in one `node --test` invocation. node:test has no default per-test timeout, so only the vitest suites need a `testTimeout`. |
| `scripts/verify.mjs` | `VERIFY_STEPS` is the authoritative rail; `npm test` is step 2 and runs core → gui → mcp-server http → scripts. A failure in any of them is what "verification is blocked" means. |
| `apps/gui/tsconfig.node.json` | `composite: true` and `include: ["src/main/**/*", …]` — gui test files **are** typechecked, so any helper they import must be typed. This is why the helper belongs in `@kanmer/core` rather than a loose `.mjs` under `scripts/lib/`. |
| `packages/core/tsconfig.json` | Conversely, core excludes `src/**/*.test.ts`, so core test files are not typechecked; a mistake there surfaces only when vitest runs. |

## Ripple effects

- **Committed build artifact.** `io.ts` is compiled into `plugins/kanmer/mcp/kanmer-mcp.cjs`. `npm run plugin:build` then `npm run plugin:check` must run in a checkout that owns its `@kanmer/core` resolution — so `npm install` inside `.worktrees/core-128` is a prerequisite, not an optimisation.
- **Typecheck.** A new `@kanmer/core` export must be built (`npm run build`) before `npm run typecheck` can see it from `apps/gui` and `packages/mcp-server`.
- **`npm test` ordering.** Core's vitest run is step 2 of 5 inside `npm test`; it short-circuits the rest on failure, so gui/http/scripts coverage of a change is only observed once core is green.
- **Verification cost.** The ticket asks for ten consecutive `npm run verify` runs, at least three under concurrent load. Each unloaded run is on the order of 10 minutes on this host and materially longer under load; this is the dominant cost of the ticket and must be budgeted as such.
- **No board/GUI behaviour changes**, so no FRD/ADR text needs revising; `AGENTS.md` is the only prose that changes.

## Out of scope

- **Changing the lock's identity mechanism.** The ~1 s first-locked-write cost is real and affects production (the first board write of every MCP session), but replacing the PowerShell probe means changing what identity string processes compare, and a mismatch between "self" and "foreign" identity formats would let a live lock be reclaimed as stale. That is a lock-contract change, not a test fix. Recorded as a follow-up recommendation instead.
- **Changing the Antigravity launcher token.** That the shipped `pushd`+`call` token cannot resolve the shim when `NoDefaultCurrentDirectoryInExePath` is defined is a genuine product observation, but the variable is not set by the installed Antigravity host, the human shell or the hosted runner — only by agent harnesses. Hardening the token belongs to the launcher's own ticket (AGENTS.md §8 gotcha 13), not here.
- **Weakening or deleting any assertion.** Every timeout raised carries a comment naming the Windows behaviour it accommodates; no `expect`/`assert` is removed, loosened or skipped.
- **`apps/gui` vitest configuration.** GUI tests already carry explicit 30 s per-test timeouts where they need them and no GUI failure was reproduced. It will be added only if a GUI failure appears during this ticket's repeat runs — and the reason recorded if so.
- **CI workflow changes.** The hosted runner hits the same 5 s timeout (the `c6bbddd6` push-to-main run), so the fix is in the tests, not in retry logic around them. No `.github/workflows` change.
