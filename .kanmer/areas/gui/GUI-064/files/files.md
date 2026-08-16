# Files — GUI-064

The change is confined to the **main process's install path** plus the wording
the renderer shows before it. No core change, so no plugin rebuild.

## Where the change lands

| Path | Why |
|---|---|
| `apps/gui/src/main/mcp-sessions.ts` | Today it only *reports* sessions (`mcpSessions`, `mcpSessionsSync`). It gains the other half: stop the sessions it found and re-probe to confirm they are gone. The CIM query at `:23-26` already selects exactly the right processes — it needs `ProcessId` carried through, which the current `Select-Object` drops. Risk: this is the file that force-kills user processes; the predicate must stay narrow (`kanmer-mcp.cjs` **and** path under `$INSTDIR`) or it kills the running app. |
| `apps/gui/src/shared/mcp-sessions.ts` | The pure parser. Must surface pids for the killer to use, without widening what counts as a session. Zero-runtime-import rule (`:26`) holds — pids are data, not electron. |
| `apps/gui/src/main/updater.ts` | `installUpdateNow` (`:196-198`) is one line today. It becomes: stop sessions → verify clear → only then `quitAndInstall`. Its doc comment at `:187-198` explains why nothing can run *after* that call, and that reasoning is exactly why the new step goes before it. `maybeBlockQuitForUpdate` (`:208-249`) is the second entrance to the same install and needs the same treatment — it is synchronous, which constrains how the stop is implemented. |
| `apps/gui/src/main/index.ts:828-836` | The `CH.installUpdate` handler. If stopping can fail, this is where a failure becomes a value the renderer can show instead of a silent no-op. |
| `apps/gui/src/shared/ipc.ts` | Only if the handler starts returning a result or a new `UpdatePhase` is needed for "preparing to install". Prefer not to widen the channel; `UpdatePhase` is already the one channel carrying the cycle. |
| `apps/gui/src/renderer/src/lib/update.ts:50-68` | `restartWarning` currently tells the user the installer will close their sessions. Once *we* close them, that sentence is wrong. Pure and vitest-covered, so the wording change is cheap and testable. |
| `apps/gui/src/renderer/src/App.tsx:499-503`, `:1377` | The two — and the invariant at `:493` says exactly two — `installUpdate()` call sites. They should not need to change; confirm the guard still runs before both. |
| `apps/gui/electron-builder.yml:40-43` | Only if we take the NSIS-side option: an `include`/`customUnInstall` script so a busy file is reported with its name instead of `: 2`. Adding NSIS script is a packaging change and must be re-verified by a real build, not a typecheck. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `node_modules/app-builder-lib/templates/nsis/uninstaller.nsh:36-95,165-190` | `un.atomicRMDir` and the `isUpdated` branch — the actual failing code. Read this before proposing anything: it renames every file out of `$INSTDIR` and aborts on the first failure, having already computed the busy path into `$R0`. |
| `…/nsis/include/installUtil.nsh:129-133,213-240` | Where `: 2` is printed, and the 5×1 s retry loop that already exists. Tells you that "just retry" is not an available idea. |
| `…/nsis/include/allowOnlyOneInstallerInstance.nsh:104-165` | The installer's own kill-by-path-prefix, including the graceful-then-forced ordering. This is the code we are compensating for, and the source of the predicate `shared/mcp-sessions.ts` mirrors. |
| `apps/gui/src/main/connect.ts:37,51` | `{ ELECTRON_RUN_AS_NODE: "1" }` + `command: process.execPath` — the two lines that make an agent's MCP server a process inside `$INSTDIR`. The root cause in two lines. |
| `apps/gui/src/main/dispatch.ts:51-63` | The repo's existing precedent for killing a process tree on Windows (`taskkill /pid … /T /F`) and why a bare `kill()` orphans grandchildren. Reuse the reasoning; do not invent a second way. |
| `AGENTS.md:453` (gotcha 10), `AGENTS.md:489` | The documented position, including the stated long-term fix — *"shipping the MCP server as a separate binary outside `$INSTDIR`, or a launcher shim that survives updates"*. That would remove the root cause rather than manage it, and is bigger than this ticket. |
| `docs/functional/frd/FRD-021-auto-update.md:11,28-34,42-44` | R2 and R4, and the as-built admission that the two-version cycle had never been run. The requirement this ticket restores. |
| `scripts/check-updater-package.mjs` | What `dist:check` already asserts about the packaged updater — the place any new packaging assertion belongs. |

## Ripple effects

- **Tests.** `apps/gui/src/shared/mcp-sessions.test.ts` covers the parser and
  must cover pid extraction, including the malformed/absent cases it already
  guards. `renderer/src/lib/update.test.ts` covers `restartWarning` and pins the
  wording being changed. The kill path itself needs an injectable executor to be
  testable without killing real processes — `dispatch.ts:38-43` (`spawnFn`) is
  the in-repo precedent for that seam.
- **Docs.** FRD-021 R2/R4 and its as-built section; AGENTS.md gotcha 10 and the
  §11 limitation at `:489` both currently assert *"we cannot prevent it"*, which
  becomes half-true. `apps/gui/release-notes.md` needs a user-facing line.
- **Build artifacts.** None. `packages/core` is untouched, so `plugin:build` /
  `plugin:check` are not implicated (AGENTS.md §8 gotcha 8 does not apply).
- **Verification cannot be done by unit tests alone.** The failure only exists in
  a packaged two-version install cycle. Proof requires a real build, a real
  install, and a live MCP session — the cycle FRD-021 admits has never been run.

## Out of scope

- **Repairing this machine's stuck 0.3.0 → 0.3.1 update.** The installer is
  already staged in `%LOCALAPPDATA%\@kanmergui-updater\pending\`; running it with
  agent sessions stopped is a one-off action for the user, not a code change.
- **[[GUI-065]]** — update UI on the welcome screen. Same subsystem, unrelated
  failure.
- **Moving the MCP server out of `$INSTDIR`** (AGENTS.md §11's long-term fix).
  It would eliminate the root cause and it changes how the product is packaged
  and registered with every agent host — its own ticket, raised in
  `open-questions.md`.
- **macOS/Linux.** No NSIS, no uninstaller, no such failure.
- **Differential updates.** v0.3.0 shipped without a blockmap, so this update
  was a full 78 MB download. Real, separate, costs bandwidth not correctness.
