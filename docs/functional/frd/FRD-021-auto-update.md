---
status: approved
covers: shipped updater (backfill)
---

# FRD-021 — Auto-update

- R1. The packaged app checks GitHub Releases; an available update surfaces as a non-blocking banner/toast reusing the in-app toast stack — **on every screen, including with no project open**; "Later" is free (the update installs on the next normal quit anyway); dismissal is per-session.
- R2. **Restart is gated** on unsaved editor work and live agent MCP sessions — the app never yanks the floor out from under a working agent or an unsaved edit.
- R3. Release discipline: `release.mjs` prepares a version change through the protected-main PR/check boundary, refuses to publish unless `release-notes.md` names the version (the guard against shipping stale notes), and `dist:check` verifies the packaged app can actually self-update.
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
- R4 — the fixed installer-owned launcher remains the registered command. Fresh installs provision
  a complete Electron-as-Node runtime under `%LOCALAPPDATA%\\Kanmer\\mcp\\<version>` and expose it
  through the stable `current` boundary. The script is kept at
  `<runtime>\\resources\\mcp\\kanmer-mcp.cjs` beside `<runtime>\\resources\\plugins\\kanmer\\skills`
  so packaged identity and staleness discovery remain truthful. The launcher retains the
  install-root `process.execPath`/`extraResources` payload as a compatibility fallback for legacy
  registrations.
  `electron-builder.yml` sets `releaseType: release` (drafts reach zero clients) and ships the
  install-root bundle via `extraResources`.

Two limits worth carrying forward, both already recorded in AGENTS.md §11: an update can still
force-kill legacy live agent MCP servers because those servers remain processes under `$INSTDIR`
(gotcha 10), and the end-to-end two-version install cycle has not yet been run on a real build.
The external runtime boundary is covered by deterministic package/static rails here; packaged
update, active-session survival, junction behavior, and uninstall cleanup remain INCONCLUSIVE
until a disposable Windows host runs the integration cycle.

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
legacy processes under `$INSTDIR`; we **can** prevent the install failing because of one.
`installUpdateNow` now clears legacy agent MCP servers itself and verifies before `quitAndInstall`,
and refuses with a named reason rather than starting an install that will abort — R2's gate is
unchanged and still runs in the renderer, before the IPC call. Fresh launcher sessions use the
external runtime boundary, but their packaged update survival is an INCONCLUSIVE integration claim
until the required Windows cycle is run.

That refusal path fails **closed** (a probe that cannot confirm is not a clearance), which is the
opposite direction from the warning path's deliberate fail-open. Both are correct; they answer
different questions.

## Amended — GUI-066

**R3's as-built claim was too weak to be true in practice.** `release.mjs` did end
by proving something, but only that `/releases/latest` carried the right tag and
that `latest.yml` returned 200 to a `HEAD`. Three consecutive releases published
incompletely anyway:

| Release | What never uploaded |
|---|---|
| 0.3.0 | `Kanmer-Setup-0.3.0.exe.blockmap` |
| 0.3.1 | `Kanmer-Setup-0.3.1.exe` **and** `latest.yml` |
| 0.3.2 | `latest.yml` |

Each needed a manual re-publish, and the old gate caught only two of the three:
**0.3.0 passed while missing its blockmap**, which is the quiet failure —
`Provider.getBlockMapFiles` derives the *previous* release's blockmap URL by
string-substituting the version, so a missing old blockmap costs every client on
that version a full ~78 MB download instead of a differential one. Nobody
notices; everyone pays.

The mechanism is not a fluke and is now recorded in AGENTS.md §8 gotcha 12:
`getOrCreateRelease()` returns `null` rather than throwing, and `doUpload()` logs
`"skipped publishing"` and returns — **no throw, exit 0**. The publisher's exit
code was never evidence of upload.

**No requirement changed.** R3 still reads "release discipline enforced by
`release.mjs`"; what changed is that the enforcement now covers the whole
published artifact set rather than one asset of three:

- Post-publish, the script reads `GET /repos/:owner/:repo/releases/tags/v<v>` and
  asserts, for **every** expected asset, that it is present, that `state` is
  `uploaded`, that `size` matches the local build, and that GitHub's
  `digest: "sha256:…"` matches a locally computed sha256. The script is holding
  the files it just built, so this is a full integrity check that downloads zero
  bytes. `latest.yml`'s `files[0].{size,sha512}` are cross-checked against the
  local installer as well — the manifest records sha512-base64 while the API
  reports sha256-hex, so the local file is the bridge between them.
- The expected set is **derived**, not hardcoded: the local pack directory
  filtered to the version (it accumulates every past version's artifacts) and
  mapped through the space→dash rename, so a target added to
  `electron-builder.yml` later widens the check instead of silently narrowing it.
  A sanity floor refuses a derived set with no installer or a missing blockmap,
  because a check that cannot fail is worse than no check.
- A missing `.exe.blockmap` is a **hard failure**, identical in severity to a
  missing installer or manifest. Treating it as a warning is how 0.3.0 shipped.
- On a detected gap the script repairs **exactly once** from the local package's
  already-built files and re-verifies — bounded, because a retry loop turns a
  visible failure into a hang. The repair uses `gh release upload --clobber`
  with explicit GitHub asset names, so it does not build another installer.
  `EP_GH_IGNORE_TIME=true` remains load-bearing for Electron Builder's one
  publish attempt: without it an old existing release can make that publisher
  silently skip its upload.
- If the second verification still finds a gap the script **refuses loudly and
  does not demote the release**. `14f2715` moved `git push --tags` ahead of the
  publish, so by then the tag is public; rewriting a public artifact unattended is
  a judgement call, so the refusal names `gh release edit v<v> --prerelease` as a
  suggestion rather than running it.
- Failures that mean *the check could not run* (rate limit, bad token, absent
  `digest`, API shape drift) are reported and exited distinctly from *the release
  is broken*, so the verifier does not become the thing that blocks releases.

The logic lives in `scripts/verify-release-assets.mjs`, split so the deciding
part is pure — `verifyAssets({expected, assets})` takes a plain GitHub-shaped
`assets[]` and touches no network, no filesystem and no exit code. It is covered
by `scripts/verify-release-assets.test.mjs` (`node:test`) against golden fixtures
captured from the three real releases above, and it runs standalone against any
published tag, which is how R3 is now demonstrable **without cutting a release**:
`node scripts/verify-release-assets.mjs 0.3.2` passes and `… 0.3.0` fails on the
absent blockmap. Since `npm test` is step 1 of the release gate, those fixtures
gate every future release.

**One limit, stated rather than papered over:** the exact-file repair path is
unproven until a real release exercises it. Its trigger, name mapping and bound
are unit-tested, but no pre-release run uploads to GitHub.

**Accepted gap:** v0.3.0's blockmap is not backfilled — it needs a rebuild from
that tag, and the cost falls only on clients still on 0.3.0, who pay one full
download on their next update and are then current.

## Amended — GUI-065

**R1 said "a non-blocking banner/toast". It never said *where*, and the gap that
left was real.** With no project open, `App.tsx` returned the welcome screen
from an early return, and all three update surfaces — the banner, the
`.toast-stack`, and the "Restart and update" confirm — sat *below* it. The
updater itself was already app-global (one module-level state in
`main/updater.ts`, one unconditional `send` in `main/index.ts`, a preload
surface with no project argument), and Help ▸ Check for Updates… was already
ungated, so on the welcome screen the check ran, the download completed, and
every result rendered into a subtree that was never mounted. The sharpest form:
a user clicked a menu item and got absolute silence.

Nothing here was a deliberate decision — the FRD, the updater research, and
GUI-017's documents all have zero mentions of the welcome screen. That is why
R1 now says **"on every screen, including with no project open"**: so the next
reader cannot mistake the silence for intent.

**No requirement changed and no mechanism changed.** This ticket added zero IPC,
zero preload and zero main-process code. The three surfaces are now bound once
above the early return and rendered from both branches, which keeps exactly one
banner instance and therefore keeps R2's single-`installUpdate()`-call-site
property intact — duplicating the markup into the welcome branch would have
broken it. The whole toast stack moved, not only the update toasts: without it
the manual check stays silent, and "Restart now" would open a confirm that never
renders. A consequence worth recording is that GUI-064's install-refusal toast
is now visible on the welcome screen too, which is where a user with no project
open most needs to see it.

The R1 line above still cites `App.tsx:915-931` for the banner; since GUI-065 the
banner is `renderer/src/components/UpdateBanner.tsx`, rendered from a JSX value
bound above `App.tsx`'s `if (!root || !board)`. The R2 line's "exactly two
`installUpdate()` call sites" has been **one** since GUI-064.

## Amended — GUI-133

The v0.3.7 installation exposed a deeper failure beneath GUI-064: Electron
Builder 26's generated process guard queried `Win32_Process.Path`, but CIM's
field is `ExecutablePath`. It therefore selected and stopped no install-root
processes. The old uninstaller could enter its file-by-file atomic rename while
legacy Electron-as-Node sessions still mapped ICU/V8, and recovery/reinstall
could produce a split tree: v0.3.7 app resources and registry metadata beside a
v0.3.3 executable/runtime. `customInstall` ran after application extraction and
could only prove that files existed, not that every file belonged to one build.

The supported `customCheckAppRunning` hook now replaces that defective
predicate. Before the old uninstaller runs it discovers and stops processes by
the real `ExecutablePath`, constrained to the exact case-insensitive install
directory boundary, then re-enumerates. An unavailable/inconclusive probe or a
remaining process refuses before file mutation. A Kanmer-named process whose
path is inaccessible is inconclusive rather than silently excluded, and every
CIM invocation has a bounded timeout. Install/runtime overlap compares
canonical trailing-separator roots in both directions, including drive roots.
Because Electron Builder adds
`--updated` to every nested old-uninstaller invocation, updater inheritance is
carried by a process-local marker: direct interactive replacement retains its
notice/cancel path, while an actual updater and its nested uninstaller use the
bounded unattended path. Static package checks pin the hook. External runtimes stage the complete installed Electron tree—not only the
exe, ICU and V8 snapshot—into immutable `<version>-<installer-pid>` generations
before `current` is switched. PID reuse is handled by allocating an absent
numeric-suffixed name before copying anything, so every sibling DLL and resource
pack is present and a repair cannot overwrite a live prior generation.
Prior generations are retained during install because they may still serve live
MCP sessions; only uninstall owns recursive external-runtime cleanup.
Acceptance also requires a real version-distinguishable two-install
cycle showing agreement among `Kanmer.exe`, app.asar, registry/uninstaller,
external runtime, launcher probe, and GUI boot.

## Amended — CORE-042 protected-main release boundary

R3's release owner remains `scripts/release.mjs`, but the command now has two
explicit phases. `npm run release -- <version> --ticket <id>` runs the shared
verification rail, writes the version and deterministic artifacts on
`release/v<version>`, pushes only that branch, and opens a PR targeting exact
protected `main` with a standalone `Kanmer: <id>` footer; preparation uses the
operator's normal `gh auth` session and does not require a publisher token. It
stops before creating a tag or publishing. After an authorized PR merge and
local `main` update, `npm run release -- <version> --publish --release-commit
<full-sha>` requires matching merged manifests and proves the supplied
**post-merge** SHA is reachable before pushing only `refs/tags/v<version>` and
running the existing single-package publisher, visibility check, updater-package
check, and complete asset-digest verifier. `.github/workflows/release.yml`
remains a tag-triggered, contents-read-only verifier and never publishes or
repairs a release.

Live PR/check enforcement, authorized merge, public tag/assets, and a real
two-version packaged updater cycle are external evidence boundaries; they must
remain INCONCLUSIVE until an operator records them.
