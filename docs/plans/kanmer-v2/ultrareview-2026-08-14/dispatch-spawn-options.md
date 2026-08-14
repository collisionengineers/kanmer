# Dispatch spawn options break tree-kill on POSIX and CLI launch on Windows

- **Severity:** normal
- **PR:** #10 (Phase 7: agents dispatch)
- **File:** `apps/gui/src/main/dispatch.ts:99-108`
- **Source bug ids:** bug_001, bug_002 (merged)

## Follow-up verdict — partially validated

**Validated:** the POSIX process-group claim follows directly from the call pair:
the child is spawned without `detached`, while cancellation sends `SIGTERM` to
`-proc.pid`. Unless the child is a process-group leader that negative pid does not
identify its descendants, and the fallback kills only the direct child.

**Qualified:** Windows is genuinely unreliable, but not universally dead. On this
checkout's Windows host (Node `v24.14.0`), a shell-free
`spawnSync(<cli>, ["--version"])` produced:

| Provider | Result |
| --- | --- |
| `claude` | exit 0 (`claude.exe`) |
| `codex` | `ENOENT` (npm shim installation) |
| `opencode` | exit 0 |
| `grok` | exit 0 (`grok.exe`) |

Therefore the statement that *all four* CLIs necessarily fail is refuted, while
the supported bare-command contract remains defective for installations exposed
only through a shim. The current asynchronous `error` listener also writes a tail
message but does not itself set a terminal state or immediately release resources.
The suggested unconditional `shell: true` patch is not accepted as written:
prompt text must not be passed through a shell without an explicit quoting and
trust-boundary design.

## Summary

The `spawn` call in `apps/gui/src/main/dispatch.ts:101` is missing two platform-specific options that break dispatch on both target platforms:

- **(a)** Without `detached: true` on POSIX, `treeKillImpl`'s `process.kill(-proc.pid, 'SIGTERM')` throws ESRCH (the child inherits Electron's PGID, so `-pid` targets a group that doesn't exist), the catch falls back to `proc.kill()` which only signals the direct child, and grandchildren (git/node spawned by claude/codex/opencode/grok) orphan on cancel/timeout/app-quit — silently violating the docblock ("kill the process group") and `killAllDispatches`'s before-quit invariant.
- **(b)** Without `shell: true` on Windows, spawn cannot execute the `.cmd` shims npm installs for all four dispatchable CLIs — Node throws EINVAL synchronously (post-CVE-2024-27980, Node 18.20/20.12+) or emits async ENOENT, then the catch reraises the misleading "Is its CLI installed and authenticated?" message even though the CLI is installed.

Since `electron-builder.yml` only declares a Windows target, this makes the entire Phase 7 dispatch feature non-functional on the shipping platform.

## Detail

### (a) POSIX: `detached: true` is missing — tree-kill silently degrades

`treeKillImpl` at `dispatch.ts:49-60` promises to "kill the process group" and — via the docblock and `killAllDispatches` — that no grandchild orphans on cancel/timeout/app-quit (`main/index.ts:715`: "tree-kill background agents so none is orphaned"). On POSIX it calls `process.kill(-proc.pid, 'SIGTERM')`. This only works when the child is a *process group leader*, which requires `setsid()`. Node's libuv only calls `setsid()` when `UV_PROCESS_DETACHED` is set — i.e. `spawn({ detached: true })`. Without it, the child inherits Electron's PGID, so `-child.pid` targets a group whose PGID is `Electron.pid` — a group the child isn't a leader of — and the kernel returns ESRCH. The catch swallows it and falls back to `proc.kill('SIGTERM')`, which only signals the direct child.

Agent CLIs — `claude` / `codex` / `opencode` / `grok` — are Node CLIs that fork `git` and `node` subprocesses (worktree creation, MCP calls, PR ops). Those subprocesses **orphan** on every cancel, timeout, and app-quit path, and keep running: consuming API credits, holding worktree locks, writing MCP calls to `.kanmer/`, editing files. The vitest suite doesn't catch this because `__setSpawnForTests` returns a fake `EventEmitter` with no real PID/PGID and `__setTreeKillForTests` bypasses `treeKillImpl` entirely — so the fake-child's `proc.kill()` is a no-op that never exercises the `-pid` path.

### (b) Windows: `shell: true` is missing — dispatch cannot invoke ANY of the four CLIs

Node's `child_process.spawn` on Windows uses `CreateProcess`, which resolves `.exe` (via `PATHEXT`) but **not** `.cmd`/`.bat`. All four dispatchable CLIs are npm-installed Node CLIs, which npm registers on Windows as `.cmd` shims. Prior to Node 18.20.2 / 20.12.2, spawning a `.cmd` without `shell: true` emitted an async `ENOENT` via `child.on('error')`. Since the CVE-2024-27980 patch, it **throws synchronously** with EINVAL/ENOENT.

Both paths break the current code:

- **Sync throw**: caught by the `try/catch` at `102-108` and rethrown with `"Couldn't start <cli>: … Is its CLI installed and authenticated?"` — actively misleading, because the CLI *is* installed and *is* authenticated.
- **Async error**: lands in `proc.on('error')` at `:134`, gets prepended `[dispatch error]` in the tail, `close` fires with no useful state, the dispatch is marked `failed`.

`electron-builder.yml:25-27` declares **only** a Windows NSIS target — Windows *is* the shipping platform, so the entire "Dispatch to agent →" menu, Dispatches drawer, and card spinner badge (Phase 7's headline feature) are non-functional there. Compare `connect.ts:180-192`, which uses `execAsync` (spawns through `cmd.exe`) and hits none of this.

### Step-by-step proof (Windows path)

1. User right-clicks a ticket on the board and picks "Dispatch to agent → Claude Code" (`main/index.ts:451-457`).
2. `dispatchTicket(store, "claude", ticketId)` runs (`dispatch.ts:72`); provider is dispatchable, ticket isn't taken, no in-flight lock → proceeds.
3. `provider.dispatchCli` is `"claude"` (`providers.ts:199`), `provider.dispatchArgs` returns `["-p", prompt]`.
4. `spawnFn("claude", ["-p", prompt], { cwd, env, windowsHide: true })` runs — no `shell` option.
5. On Windows the resolver looks for `claude.exe` on PATH, fails to find one (npm installed `claude.cmd`), and on modern Node throws EINVAL synchronously.
6. Caught at `:102-108` and rethrown as `"Couldn't start claude: spawn claude EINVAL. Is its CLI installed and authenticated?"` — the user re-runs `claude --version`, sees the CLI works, and files a "false-alarm" bug.

### Step-by-step proof (POSIX cancel path)

1. User dispatches a claude ticket; `spawn("claude", ["-p", prompt], { cwd, env, windowsHide: true })` succeeds. `child.pid = 12345`; child is in Electron's process group.
2. `claude` spawns `git worktree add .worktrees/TICK-42` (grandchild `git`, pid 12346, same PGID) and later `node <mcp-call>` (pid 12347).
3. User clicks Cancel → `cancelDispatch("TICK-42")` → `treeKill(proc)`.
4. `treeKillImpl` runs `process.kill(-12345, 'SIGTERM')`. No process group has PGID 12345 (only detached leaders do). The kernel returns ESRCH; Node throws.
5. The catch runs `proc.kill('SIGTERM')` → signals PID 12345 only. `git` (12346) and `node` (12347) survive.
6. The dispatch is marked `cancelled` in the UI and dropped from `active`. The grandchildren keep running. `killAllDispatches` on `app.quit` hits the same failure — Electron exits, grandchildren keep going.

## Fix

One-line change at `dispatch.ts:101`, plus prompt escaping for the shell path:

```ts
proc = spawnFn(provider.dispatchCli, args, {
  cwd: root,
  env: process.env,
  windowsHide: true,
  detached: process.platform !== "win32",
  shell: process.platform === "win32",
});
```

The prompt built by `takeTicketPromptText(ticketId)` (`packages/core/src/prompts.ts`) contains embedded quotes/apostrophes and newlines, so under `shell: true` on Windows the args must be quoted (or the whole command assembled and passed as one string) — otherwise `cmd.exe` will mis-split them. Consider `proc.unref()` on the detached child for the log-stream lifecycle, and adding a real Windows dispatch smoke test to CI (or at least a targeted unit test that exercises the sync-throw path with a fake spawn that throws) — the current tests can never catch this class of bug because they bypass the real spawn and tree-kill code paths entirely.

## Resolution plan

1. In `apps/gui/src/main/dispatch.ts`, extract a `spawnDispatch` helper that
   resolves the provider's registry-controlled command for the current platform.
   Use direct spawn for executable installations. On Windows, fall back to an
   explicitly resolved `.cmd` shim through `ComSpec` only when direct resolution
   is unavailable; quote every argument with a dedicated Windows-command-line
   encoder. Never interpolate an arbitrary command name or raw prompt into a
   command string.
2. Spawn POSIX workers with `detached: true`; keep Windows non-detached because
   `taskkill /T` handles the tree. Do not call `unref()` while stdout/stderr and
   completion bookkeeping are intentionally owned by the app.
3. Consolidate synchronous throws and the child `error` event into one start-
   failure finalizer that closes the log, clears the timer and active entry, marks
   the dispatch failed, emits status once and never appends a misleading success
   summary.
4. Keep `treeKillImpl`'s negative-pid POSIX path, now backed by the detached
   process-group invariant; retain direct-child fallback only for a genuine race
   where the group has already exited.
5. Extend `apps/gui/src/main/dispatch.test.ts` with injected platform/command
   resolution seams. Assert exact spawn executable, arguments and options for an
   `.exe`, a Windows `.cmd` shim and POSIX; add synchronous and asynchronous start
   failures plus cancel/timeout cleanup.

Illustrative option diff (the resolver determines the executable and arguments):

```diff
-spawnFn(provider.dispatchCli, args, { cwd: root, env: process.env, windowsHide: true })
+spawnFn(command, resolvedArgs, {
+  cwd: root,
+  env: process.env,
+  windowsHide: true,
+  detached: process.platform !== "win32",
+})
```

Acceptance requires a real Windows smoke for at least one executable install and
one npm-shim install, plus a POSIX test proving the spawned pid is its group leader
and cancellation terminates a grandchild.

## Remediation evidence

Remediated on PR #10 (`1bd8145`): `cross-spawn`, Windows shim handling,
POSIX detached process groups, and asynchronous launch-error cleanup are implemented. GUI typecheck passed.
