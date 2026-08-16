---
status: approved
covers: shipped updater (backfill)
---

# FRD-021 — Auto-update

- R1. The packaged app checks GitHub Releases; an available update surfaces as a non-blocking banner/toast reusing the in-app toast stack; "Later" is free (the update installs on the next normal quit anyway); dismissal is per-session.
- R2. **Restart is gated** on unsaved editor work and live agent MCP sessions — the app never yanks the floor out from under a working agent or an unsaved edit.
- R3. Release discipline: `release.mjs` refuses to publish unless `release-notes.md` names the version (the guard against shipping stale notes); `dist:check` verifies the packaged app can actually self-update.
- R4. MCP registrations point at the installed executable path; updates preserve that path's validity.

**Acceptance (as-built):** the updater research/plan verification list; a packaged build with a newer release shows the banner, defers restart while an agent session is live, and installs on quit.

Related: docs/plans/updater · apps/gui release rail.

## Verified against code — Phase 0.2

All in `apps/gui/src/` unless noted.

- R1 — `initUpdater` `main/updater.ts:79-136`, inert under `KANMER_SMOKE` and inert unpackaged
  unless `KANMER_DEV_UPDATE=1` `:83-86`; `autoDownload` / `autoInstallOnAppQuit` /
  `disableWebInstaller` / `allowPrerelease:false` / `allowDowngrade:false` `:89-96` — so "Later" is
  genuinely free, the update lands on the next normal quit. One `UpdatePhase` channel carries the
  cycle `shared/ipc.ts:98-108`; progress throttled to whole percents `updater.ts:107-113`. Banner
  `App.tsx:915-931`, surface decided by the pure `lib/update.ts:23-44`; dismissal is per-session by
  design `App.tsx:108-111`. Schedule: 30 s then every 6 h `updater.ts:19-21,130-131`.
- R2 — `installUpdateNow` is **not** cancellable and says why `updater.ts:187-198`; the gate is
  therefore in the renderer — `restartWarning()` `lib/update.ts:58-68` (pure, vitest-covered),
  with exactly two `installUpdate()` call sites `App.tsx:449` and `App.tsx:1144`; main refuses
  unless the phase is `downloaded` `main/index.ts:739-747`; the quit path re-checks
  `maybeBlockQuitForUpdate` `updater.ts:208-249`. Live agent sessions are named, not just counted,
  by `main/mcp-sessions.ts` + the pure parser `shared/mcp-sessions.ts`, which runs the NSIS
  installer's own by-path-prefix predicate and fails open deliberately.
- R3 — `release.mjs:132-134` refuses with no `release-notes.md`, and `:135-140` refuses when the
  notes do not mention the version being released ("the guard against shipping last release's
  text"). `dist:check` → `scripts/check-updater-package.mjs`, wired at `package.json`.
- R4 — `connect.ts:45` registers `command = process.execPath` with
  `ELECTRON_RUN_AS_NODE=1`; `electron-builder.yml` sets `releaseType: release` (drafts reach zero
  clients) and ships the bundle via `extraResources`.

Two limits worth carrying forward, both already recorded in AGENTS.md §11: an update force-kills
live agent MCP servers because the server *is* a process under `$INSTDIR` (gotcha 10), and the
end-to-end two-version install cycle has not yet been run on a real build.

## Amended — GUI-064

The second limit above was load-bearing. The first time the two-version cycle ran on a real build
(0.3.0 → 0.3.1) it **failed**: `Failed to uninstall old application files. Please try running the
installer again.: 2`, and the update never applied.

`: 2` is the old uninstaller aborting. Under `--updated` it takes `un.atomicRMDir`, which renames
every file out of `$INSTDIR` and gives up on the first rename that fails. A live agent MCP server
is enough — it holds `icudtl.dat` and `v8_context_snapshot.bin`, which V8 and ICU memory-map
without `FILE_SHARE_DELETE`. (`Kanmer.exe` and the DLLs are *not* the problem: Windows permits
renaming a mapped image. Measured, not assumed.) The installer's own kill exists but races that
rename and can lose, and it already retries 5×1 s, so no amount of waiting fixes it.

**This did not change any requirement — it restored R4.** "Updates preserve that path's validity"
was simply not true while the update could not apply at all. What changed is a claim in the prose
above and in `shared/mcp-sessions.ts`: *"We cannot prevent it."* We cannot prevent NSIS killing
processes under `$INSTDIR`; we **can** prevent the install failing because of one. `installUpdateNow`
now clears agent MCP servers itself and verifies before `quitAndInstall`, and refuses with a named
reason rather than starting an install that will abort — R2's gate is unchanged and still runs in
the renderer, before the IPC call.

That refusal path fails **closed** (a probe that cannot confirm is not a clearance), which is the
opposite direction from the warning path's deliberate fail-open. Both are correct; they answer
different questions.
