## Reproduction evidence (2026-08-28, Windows 11, 8 logical CPUs, 14.9 GB RAM, ~2.7 GB free)

Host was already contended by a concurrent verification rail in `.worktrees/verify-MCP-051`.

### Load generator

`%TEMP%\core128\hog.mjs` — N processes, each looping: create 40x4 KB files in a temp
subdirectory, read them back, sha256 4000 updates, `rmSync` the subdirectory. CPU + temp-volume
churn on the same volume the suites use.

### Attempts

| # | Command | Load | Exit | Result |
| --- | --- | --- | --- | --- |
| 1 | `npx vitest run --no-file-parallelism` (packages/core) | none | 0 | pass, 62.2 s. Slowest test 1628 ms (`claims.test.ts` take/release). store.test.ts file 11.4 s. |
| 2 | `npx vitest run --no-file-parallelism` (packages/core) | 6 hogs | 0 | pass, 141.7 s. store.test.ts 40.7 s (3.6x), docs.test.ts 24.5 s (4.7x). Slowest test 3734 ms — 75 % of the 5 s budget. |
| 3 | `npx vitest run` (file parallelism ON) (packages/core) | 4 hogs | 1 | **3 failures.** `docs.test.ts > the shipped profile gate matrix > chore: …` `Test timed out in 5000ms` (5929 ms); `claims.test.ts > audited backward moves (CORE-121) > returns Review → Implementing …` and `claims.test.ts > batch workspaces (CORE-124) > AC4 …` both `ENOTEMPTY: directory not empty, rmdir '…\kanmer-claims-*\.kanmer'`; docs.test.ts also raised `ENOTEMPTY … kanmer-docs-*\.kanmer`. |
| 4 | `npm test` (real rail, `--no-file-parallelism`) | 6 hogs | 1 | **2 failures**, both `claims.test.ts > batch workspaces (CORE-124)`: one `Test timed out in 5000ms` (5168 ms / 6041 ms), one `ENOTEMPTY … \.kanmer`. Core suite 209.8 s. |
| 5 | `node scripts/test-scripts.mjs` x6 | 8 hogs | 1 x6 | `antigravity-plugin-config.test.mjs` x2 failed **every** run — but with `'kanmer-mcp.cmd' is not recognized as an internal or external command`, not EBUSY. |
| 6 | `node --test scripts/antigravity-plugin-config.test.mjs` | none | 1 | Same two failures. **Not load-sensitive.** |

### Root causes measured

1. **`NoDefaultCurrentDirectoryInExePath=1` is set in the agent harness's process env.**
   `[Environment]::GetEnvironmentVariable(..., 'Process') = 1`, `'User'` and `'Machine'` are both
   empty. The test forwards `{ ...process.env, LOCALAPPDATA }` to its `cmd.exe` child, so cmd drops
   the current directory from its command search path and the shipped
   `pushd !LOCALAPPDATA!\Kanmer\bin&&call kanmer-mcp.cmd` token can no longer resolve the shim.
   This is why the hosted runner and a human shell are green while every agent-driven
   `npm run verify` is red on exactly these two tests.

2. **The first locked board write in a process costs ~1 s on Windows.**
   `packages/core/src/io.ts` `defaultProcessIdentity()` runs `execFileSync("powershell.exe", …)`
   synchronously, blocking the event loop. Measured against the freshly built bundle:

   - `defaultProcessIdentity(process.pid)` — **776 ms** first call, 0 ms cached.
   - `defaultProcessIdentity(<other pid>)` — **1103 ms**, never cached.
   - `store.updateItem()` — **998 ms** first call, **25.9 ms** steady state (mean of 20).
   - Bare `execFileSync powershell.exe …` on an idle host: 464 / 491 / 750 ms.

   Vitest runs with `isolate: true`, so module state (`cachedSelfProcessIdentityReady`) resets per
   test *file*; every file that performs a locked write pays the probe again, and when a file's
   first locked write happens inside a test body that test alone burns ~1 s — far more under load.

3. **CORE-125's write lock adds a 2145 ms acquisition budget.**
   `DEFAULT_LOCK_RETRY_MS = [10, 25, 60, 150, 300, 600, 1000]` sums to 2145 ms of sleeps before a
   contended claim gives up. `updateItem`/`moveItem`/`setDoc`/`appendScratch` all run inside it now.
   2145 ms + ~1 s identity probe already consumes 63 % of vitest's 5 s default before any assertion
   runs.

4. **Teardown uses Node's default `maxRetries: 0`.**
   `fs.rm(root, { recursive: true, force: true })` — Node's recursive rm *does* retry
   `EBUSY`/`EMFILE`/`ENFILE`/`ENOTEMPTY`/`EPERM`, but only when `maxRetries > 0`. `io.test.ts:13`
   already passes `maxRetries: 3`; nothing else does. ~90 `mkdtemp` sites across core, gui,
   mcp-server and scripts share the un-retried teardown.
