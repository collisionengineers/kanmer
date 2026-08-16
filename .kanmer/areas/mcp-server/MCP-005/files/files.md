# Files — MCP-005

*The surface area of relocating the MCP server **runtime** out of `$INSTDIR`.
The findings behind it are in `research`.*

## Where the change lands

| Path | What changes | Risk |
|---|---|---|
| `apps/gui/src/main/mcp-runtime.ts` **(new)** | The whole new mechanism: resolve `%LOCALAPPDATA%\Kanmer\mcp`, provision a versioned dir by copying `Kanmer.exe` → `kanmer-mcp.exe` + `icudtl.dat` + `v8_context_snapshot.bin` from `dirname(process.execPath)`, copy the standalone `.cjs` beside it, retarget the `current` junction, GC old versions. | **High.** ~192 MB copy with partial-failure, disk-full, AV-interference and concurrent-instance cases. Must be atomic-by-rename (copy to `<v>.tmp`, then rename) or a half-copied runtime becomes a broken registration. Junction creation can fail on non-NTFS / redirected `%LOCALAPPDATA%`. |
| `apps/gui/src/main/connect.ts` (`serverInvocation`, 36-52) | `command` becomes `…\Kanmer\mcp\current\kanmer-mcp.exe`, `args[0]` becomes the `.cjs` beside it. `ELECTRON_RUN_AS_NODE=1` stays (it is still Electron). Dev branch unchanged. Must fail loudly, not silently fall back to `process.execPath`, if provisioning has not run. | **High.** This function's output is what gets written into user config files. A wrong value here is written to disk on every project a user connects. |
| `apps/gui/src/main/mcp-migrate.ts` **(new)** | The registration sweep: for each candidate project root, for each of the 5 provider config files, if the `kanmer` entry matches the old scheme, rewrite `command`/`args[0]` in place using the providers' existing pure `merge`. Idempotent, atomic write, never touches a config it cannot parse. | **High.** Writes to files Kanmer does not own, in projects the user may have edited by hand. `codexTomlMerge` already loses comments (`providers.ts:152-154`) — acceptable for connect, more contentious when done unasked. |
| `apps/gui/src/main/index.ts` | Call provisioning + migration at boot (and/or before Connect); expose whatever IPC the "legacy registration detected" surface needs. | Medium. Boot-path work that must never block the window. |
| `apps/gui/electron-builder.yml` (17-23) | `extraResources` keeps `mcp/kanmer-mcp.cjs` (deliberately — it is what legacy registrations still run; see Ripple). Possibly stops shipping the duplicate copy under `plugins/kanmer/mcp/`. | Low, but **do not delete `mcp/kanmer-mcp.cjs`**: removing it breaks every un-migrated registration on every machine. |
| `apps/gui/build/installer.nsh` **(new)** + `nsis.include` in `electron-builder.yml` | `customUnInstall` macro removing `%LOCALAPPDATA%\Kanmer\mcp`. | Medium. NSIS is not exercised by any test; a syntax error here breaks the *uninstaller*, which is on the update path (`un.atomicRMDir`). Same blast radius as GUI-064. |
| `apps/gui/src/shared/mcp-sessions.ts` (75-110) | Meaning shifts: rows under `$INSTDIR` are now *legacy registrations*, not "all sessions". `parseSessions` itself likely needs no change; the doc comment and the `McpSessions` semantics do. | Low code risk, high comment-rot risk — this file's comment block is the repo's canonical explanation of the bug and would become wrong. |
| `apps/gui/src/main/mcp-sessions.ts` | Comment block updated for the same reason. `stopMcpSessions()` behaviour unchanged, re-framed as the legacy safety net. | Low. Resist the urge to delete it — that is the belt GUI-064 bought. |
| `apps/gui/src/renderer/…` (`App.tsx` restart warning, `lib/update.ts:58-68`) | Warning copy: a migrated machine has 0 sessions and should say nothing; a legacy one should say *which projects* need reconnecting. | Medium — `restartWarning()` is pure and vitest-covered, so changes are cheap but the tests move with it. |
| `scripts/check-updater-package.mjs` (check 6) | Still assert `resources/mcp/kanmer-mcp.cjs` (legacy path must keep shipping); optionally add a check that the relocation payload's three source files exist in `win-unpacked`. | Low. |
| `docs/architecture/adr/ADR-0012-…md` **(new — do not write in this ticket)** | Where the server runtime lives, what `command` is, and the stable-path contract. | — |
| `docs/functional/frd/FRD-021-auto-update.md` | R4 ("MCP registrations point at the installed executable path") becomes **false by design** and must be rewritten, not amended around. | Medium — R4 is the requirement this ticket deliberately breaks. |
| `docs/functional/frd/FRD-012-connect.md` | R1's registration matrix gains the relocated-runtime `command` and the migration behaviour. | Low. |
| `AGENTS.md` §11 | Two bullets retire ("an update closes live agent MCP sessions"; "the registered MCP command path can go stale"), one arrives (the relocated runtime + legacy registrations). | Low. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `.kanmer/areas/gui/GUI-064/proof.md` | The measurement this whole ticket rests on: `blocked: 2 → 0` on one `taskkill`, and that the blockers are `icudtl.dat` + `v8_context_snapshot.bin`, **not** `Kanmer.exe` or the DLLs. Also records that after the fix the server was *still* a process under `$INSTDIR` — the thing MCP-005 removes. |
| `apps/gui/src/shared/mcp-sessions.ts:3-35` | Why the installer kills by **path prefix**, not image name. This is why relocation works at all, and why the relocated process is invisible to that kill. |
| `apps/gui/src/main/updater.ts:192-224` | `quitAndInstall` spawns the installer *before* `app.quit()`, so every guard must run before it. Any new provisioning/migration work must not be attempted on that path. |
| `apps/gui/src/main/providers.ts:294-389` | The five provider entries and their five config paths — the complete inventory the migration sweep must cover — plus the pure `merge`/`unmerge` functions to reuse rather than reimplement. |
| `apps/gui/src/main/providers.ts:142-204` | `codexTomlMerge`/`unmerge`: parse→serialise **loses comments**. Relevant because migration edits a user's file without being asked. |
| `apps/gui/src/main/settings.ts` (`MAX_RECENT = 8`) | The migration sweep's candidate list is capped at 8 recent projects, and on a real machine is polluted with `%TEMP%` roots. It is not an inventory of every connected project — the reason the "never reconnected" case exists at all. |
| `AGENTS.md` §11, the `app.getName()` bullet | `app.getPath("userData")` is **`%APPDATA%\@kanmer\gui`** — Roaming, scoped name. Do not reach for `userData` as the destination without reading this. |
| `AGENTS.md` §11, the signing bullet | Signing is a scheduled one-way door. A copied binary keeps its signature; a *newly built* one (Node SEA) needs its own subject and its own SmartScreen reputation. |
| `packages/mcp-server/tsup.standalone.config.ts` | Why the bundle is CJS and fully inlined, and that it is built for `node20` — the relocated Electron reports `v20.18.0`, so the target is unchanged. |
| `scripts/check-plugin-sync.mjs` | The committed `plugins/kanmer/mcp/kanmer-mcp.cjs` is byte-compared against a fresh build; anything that changes how the bundle is produced or copied trips the release gate. |
| `plugins/kanmer/mcp/claude.mcp.json` | The plugin route registers `command: "node"` — it already assumes a Node install, contradicting `connect.ts`'s stated reason for `process.execPath`. Decide deliberately whether to unify. |

## Ripple effects

- **Tests.** `apps/gui/src/main/providers.test.ts` and `mcp-sessions.test.ts`
  assert on the current invocation shape and on `execPath`-prefixed rows; both
  move. New pure units worth having: the "is this a legacy registration?"
  predicate and the config-rewrite, so migration is testable without touching a
  real config file. `packages/mcp-server` has **no unit tests** (FRD-022) — the
  server itself is untouched, so nothing new is owed there.
- **Release rail.** `npm run dist:check` → `check-updater-package.mjs` (check 6
  asserts the packaged `.cjs`); `npm run plugin:check` byte-compares the
  committed bundle; `release.mjs` runs both. None of them know about the new
  location — add a check or accept that the relocation is unguarded at release
  time.
- **Committed build artifact.** `plugins/kanmer/mcp/kanmer-mcp.cjs` is committed
  and byte-checked. If the relocation copies the `.cjs` from `resources/mcp/`,
  nothing changes; if the shipping layout changes, `build-plugin.mjs` and
  `check-plugin-sync.mjs` follow.
- **Disk.** ~192 MB per user, per retained version, outside `$INSTDIR`, plus the
  265 MB install. Uninstall does not reclaim it without the new NSIS macro.
- **Antivirus / SmartScreen.** "Application copies a 180 MB signed executable
  into `%LOCALAPPDATA%` and launches it" is a heuristic some AV products
  dislike. Unproven either way; worth one real-world check before release.
- **MCP-008** (blocked by this) inherits the answer: a `.mcpb` for Claude Desktop
  needs a `command` that is not `$INSTDIR`, and headless board access with the
  app closed is only coherent once the runtime is independent of the app.
- **Docs.** FRD-021 R4, FRD-012 R1, AGENTS.md §11, and the new ADR. FRD-021's
  "Amended — GUI-064" section explicitly carries the limitation this ticket
  removes; leaving it stale would be the same failure ADR-0009 exists to catch.

## Out of scope

- **Measuring the agent-host respawn question.** Folded in and explicitly
  deferred by the ticket body — relocation makes it moot.
- **Rewriting the MCP server itself.** `packages/mcp-server` is unchanged; this
  is a delivery/packaging ticket.
- **Signing.** Adjacent (a copied binary keeps its signature) but a separate,
  scheduled, one-way decision.
- **Removing `stopMcpSessions()`.** It becomes the legacy safety net, not dead
  code.
- **macOS/Linux.** Windows-only install target today.
- **The `.mcpb` bundle and headless mode.** MCP-008.
- **Writing ADR-0012.** Named as required; authored by `kanmer-docs`.
