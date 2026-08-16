# Research — MCP-005: ship the MCP server outside the install directory

## Question

Where is the MCP server payload placed at package time, where should it live
instead so that no agent MCP process holds a handle inside `$INSTDIR`, and how do
the already-written absolute-path registrations on every project on the machine
get moved to the new location?

## Findings

### 1. The lock comes from `command`, not from the script. This is the headline.

- `serverInvocation()` (`apps/gui/src/main/connect.ts:36-52`) returns
  `{ command: process.execPath, args: [script, "--root", …], env: { ELECTRON_RUN_AS_NODE: "1" } }`.
  Packaged, `script` = `join(process.resourcesPath, "mcp", "kanmer-mcp.cjs")`.
- GUI-064's proof measured the blockers as `icudtl.dat` and
  `v8_context_snapshot.bin` — **not** the `.cjs`, **not** `Kanmer.exe`, **not**
  the DLLs. Those two are memory-mapped by V8/ICU without `FILE_SHARE_DELETE`,
  so `un.atomicRMDir` cannot rename them and aborts (`uninstallFailed: 2`).
- Those two files are loaded by the Electron **runtime**, relative to its own
  `execPath`. They have nothing to do with where the `.cjs` sits.
- **Therefore: relocating `kanmer-mcp.cjs` alone changes nothing.** As long as
  `command` is `%LOCALAPPDATA%\Programs\Kanmer\Kanmer.exe`, the server process is
  a process under `$INSTDIR` holding the exact two files that break the update.
  The ticket must relocate *the runtime*, and the `.cjs` only comes along with it.
- Direct evidence on this machine: the project's `.mcp.json` already points
  `args[0]` at a **source-tree** copy
  (`C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer\mcp\kanmer-mcp.cjs`) while
  `command` is the installed `Kanmer.exe` — and GUI-064's post-closeout probe
  still found that process under `$INSTDIR`. Script outside the install dir,
  lock still there.

### 2. A relocated copy of the Electron binary works, and needs only three files

Measured (scratch dir, `ELECTRON_RUN_AS_NODE=1`; full log in `scratch/research.md`):

| Files present | Result |
|---|---|
| `Kanmer.exe` only | `FATAL icu_util.cc(223): Invalid file descriptor to ICU data received` |
| `+ icudtl.dat + v8_context_snapshot.bin` | runs, `node v20.18.0` |
| `snapshot_blob.bin` removed | still runs (not needed) |
| `v8_context_snapshot.bin` removed | `FATAL v8_initializer.cc(616): Error loading V8 startup snapshot file` |

The relocated copy ran the real standalone bundle (`kanmer-mcp ready — root: …`)
and `Process.Modules` reported **0 modules under `\Programs\Kanmer\`**.

- **Minimal payload: 3 files, 191.98 MB** (`Kanmer.exe` 180.8 MB, `icudtl.dat`
  10.5 MB, `v8_context_snapshot.bin` 0.66 MB). The whole install is 265 MB.
- Pleasing symmetry: the two data files a relocated copy *needs* are exactly the
  two GUI-064 measured as *blocking*. That is not a coincidence — they are the
  same two mappings.
- The exe can be renamed (`kanmer-mcp.exe`) — Authenticode signs the PE, not the
  filename — which also makes the process legible in Task Manager and to
  `mcp-sessions.ts`.

### 3. Hardlinking is not an option

A hardlink into `$INSTDIR` is the *same file*. The mapping-without-`FILE_SHARE_DELETE`
lock is on the file object, so renaming the `$INSTDIR` directory entry still
fails. Only a real byte copy (or a separately-built binary) breaks the lock.

### 4. Where it is placed at package time

- `apps/gui/electron-builder.yml:17-23` — `extraResources` places
  `../../packages/mcp-server/dist/standalone/kanmer-mcp.cjs` → `mcp/kanmer-mcp.cjs`,
  **and** `../../plugins/kanmer` → `plugins/kanmer` (which contains a *second*
  copy of the same `.cjs`). Two copies ship inside `resources/`. Confirmed on disk:
  `…\Kanmer\resources\{mcp,plugins}`.
- The bundle is produced by `packages/mcp-server/tsup.standalone.config.ts`
  (CJS, `noExternal: [/.*/]`, `target: node20`) via `npm run build`; copied into
  the plugin by `scripts/build-plugin.mjs`; byte-checked by
  `scripts/check-plugin-sync.mjs`; existence-checked in the packaged output by
  `scripts/check-updater-package.mjs` check 6.
- `files:` ships only `out/**/*` + `package.json`; nothing else is involved.

### 5. Candidate destinations, weighed

`app.getPath("userData")` is **`%APPDATA%\@kanmer\gui`** — *Roaming*, and under
the scoped package name (AGENTS.md §11: `app.getName()` is `@kanmer/gui` in the
packaged app too; verified on disk, that folder holds the real `settings.json`).

| Destination | Survives uninstall | Cleanup | Elevation | Signing | Verdict |
|---|---|---|---|---|---|
| `userData` = `%APPDATA%\@kanmer\gui\mcp\<v>` | yes (NSIS `deleteAppDataOnUninstall` is not set) | ours | none | copy keeps signature | **rejected** — Roaming. ~192 MB into a roaming profile is hostile in any managed environment, and the `@kanmer\gui` path is itself a known wart |
| `%LOCALAPPDATA%\Kanmer\mcp\<v>` | yes | ours, needs a `customUnInstall` NSIS macro | none (per-user) | copy keeps signature | **recommended** — local, per-user, outside the install root, precedent already exists (`%LOCALAPPDATA%\@kanmergui-updater`) |
| `%PROGRAMDATA%\Kanmer` | yes | ours | **yes** (write to ProgramData) | as above | rejected — `perMachine: false`, so the app has never needed elevation; adding an elevation prompt to Connect is a regression |
| Ship a standalone `node.exe` / Node SEA | n/a | n/a | none | **new binary, new signing subject, new SmartScreen reputation** | rejected for v1 — see below |
| Launcher shim (`.cmd`/`.exe`) that resolves the current install | n/a | n/a | none | n/a | **does not fix anything** — the shim spawns `Kanmer.exe` from `$INSTDIR`, so the lock is unchanged. It only fixes path staleness |

On the Node-runtime option: a Node SEA or a bundled `node.exe` is ~80 MB rather
than 192 MB and is arguably the "right" long-term artefact, but it (a) adds ~80 MB
to the installer for *everyone*, whereas the copy-from-install approach costs
download nothing and disk only on machines that connect an agent; (b) introduces
a second binary that will need its own signing story, which AGENTS.md §11 already
flags as a scheduled one-way door; (c) is a different Node build from the one the
app is tested against. The copy approach reuses a runtime that is already on the
machine, already the exact version the app ships, and (once signing exists)
already signed.

### 6. Versioning and the "one migration, not one per release" problem

If registrations point at `…\mcp\<version>\kanmer-mcp.exe`, **every release
re-breaks every registration** — we would have traded one migration for a
permanent one. The way out is a stable path:

- versioned directories `…\Kanmer\mcp\0.3.3\`, plus a **directory junction**
  `…\Kanmer\mcp\current` → the active version. `mklink /J` needs no elevation
  and no Developer Mode (unlike a symlink), and retargeting a junction while a
  process runs from the old target is safe — existing handles keep the old
  directory alive.
- Registrations then hold `…\Kanmer\mcp\current\kanmer-mcp.exe`, which is
  written **once** and never changes again.
- Stale versioned dirs are GC'd at boot when nothing holds them.
- Fallback if junctions prove unusable on some filesystem: refresh
  `current\` in place, which cannot overwrite a running exe — so it would have
  to be "write the new version, retry the swap next boot". That is strictly
  worse; the junction is the design.

### 7. What already exists on the machine to migrate (measured)

Two registration files, each holding **two** independent absolute paths:

```
.mcp.json           command = …\Programs\Kanmer\Kanmer.exe
                    args[0] = …\GitHub\kanmer\plugins\kanmer\mcp\kanmer-mcp.cjs
.codex/config.toml  command = …\Programs\Kanmer\Kanmer.exe
                    args[0] = …\Programs\Kanmer\resources\mcp\kanmer-mcp.cjs
```

Five providers write five different files (`providers.ts:294-389`):
`.mcp.json` (claude, grok), `.codex/config.toml`, `opencode.json`,
`.agents/mcp_config.json` — plus legacy global `~/.codex/config.toml`
`kanmer-<project>` entries, which `removeCommands` already drains.

The app's own knowledge of "projects it has seen" is
`settings.recentProjects`, **capped at 8** (`settings.ts` `MAX_RECENT = 8`) and
on this machine already polluted with five `%TEMP%\tmp.*` roots. It is not a
reliable inventory of every project ever connected.

### 8. The Claude-Code plugin route already uses a real Node, inconsistently

`plugins/kanmer/mcp/claude.mcp.json` and `plugins/kanmer/.mcp.json` register
`command: "node"` with `${CLAUDE_PLUGIN_ROOT}/mcp/kanmer-mcp.cjs`. So the
marketplace/plugin install path **silently requires Node** — the very thing the
Connect path deliberately avoids ("the target machine needs no separate Node
install", `connect.ts:33-35`). Two delivery routes, two contradictory
assumptions. Worth naming; whichever runtime MCP-005 picks, these two should
agree, and MCP-008 (`.mcpb` for Claude Desktop) inherits the same question.

### 9. Downstream code that reads the install-dir assumption

- `apps/gui/src/shared/mcp-sessions.ts:75-110` — `parseSessions` filters rows by
  `ExecutablePath.startsWith(dirname(process.execPath))`, deliberately mirroring
  the NSIS installer's own by-path-prefix kill. After relocation this returns
  **0 for migrated projects automatically** — no code change needed for
  correctness, but the warning copy ("this will close N agent MCP sessions")
  becomes vacuous for them and still true for un-migrated ones.
- `apps/gui/src/main/mcp-sessions.ts` — the CIM query matches
  `CommandLine -like '*kanmer-mcp.cjs*'`, which still matches the relocated
  server; only the path-prefix filter excludes it. `stopMcpSessions()` therefore
  keeps working as the safety net for un-migrated registrations, which is
  exactly what we want it to become.
- `apps/gui/src/main/updater.ts:211-224` — `installUpdateNow` gates the install
  on `stopMcpSessions().cleared`. Unchanged; it should simply stop finding
  anything once migration has run.

## Implications

1. **The change is "relocate the runtime", not "relocate the payload".** Any plan
   that only moves `kanmer-mcp.cjs` out of `resources/` satisfies the ticket
   title and fixes nothing. This must be stated in the plan's first line.
2. **Copy the installed Electron binary — 3 files, ~192 MB — into
   `%LOCALAPPDATA%\Kanmer\mcp\<version>\`, expose it through a `current`
   junction, and register `current\kanmer-mcp.exe`.** No new binary, no new
   signing subject, no elevation, no installer size increase, and "no Node
   required" is preserved by construction because the runtime *is* the Electron
   we already ship.
3. **The junction is what makes the migration a one-time event.** Without a
   stable path this ticket creates a permanent per-release migration obligation.
4. **Migration is a sweep plus a fallback, and the fallback is the honest part.**
   The app can rewrite the registrations of projects it can find (open tabs,
   `recentProjects`); it cannot find every project ever connected. For those,
   the old registration keeps *working* — `Kanmer.exe` still exists at that path
   after an auto-update, and the `.cjs` in `resources/mcp/` should keep shipping
   for exactly this reason — but it keeps locking `$INSTDIR`. So GUI-064's
   `stopMcpSessions()` stays, demoted from "the only thing standing between the
   user and a failed update" to "the belt for legacy registrations". That is
   precisely the framing the ticket body asks for.
5. **Detection beats hope.** `mcpSessions()` already resolves each session's
   `--root`. A session found under `$INSTDIR` after this ships *is* a
   legacy registration, and its project path is right there — enough to surface
   "these projects use the old registration → Reconnect" rather than silently
   carrying them forever. This also subsumes the AGENTS.md §11 follow-up
   ("recorded MCP command ≠ `process.execPath` → offer Reconnect").
6. **First-run cost is real and needs a UX decision.** ~192 MB of copying has to
   happen somewhere: at install (slows every install, including users who never
   connect an agent), at first Connect (a visible pause in a modal), or lazily at
   app boot in the background. This is a product call, not an implementation
   detail — see open-questions.
7. **Uninstall leaves ~192 MB behind unless we remove it.** `deleteAppDataOnUninstall`
   is not set and would not cover `%LOCALAPPDATA%\Kanmer` anyway. A
   `customUnInstall` NSIS macro (a new `apps/gui/build/installer.nsh`) is in scope.
8. **This needs an ADR.** Where the server runtime lives, what the registered
   `command` is, and the stable-path/junction contract are cross-cutting: they
   bind packaging, Connect, the updater, the plugin, and MCP-008's `.mcpb`.
   ADR-0012 (next free number) — **not written here, by instruction.**

## Open questions

Recorded in full in `open-questions`; two of them are operator-only.
