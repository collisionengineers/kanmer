# Auto-updater — implementation plan

> **Repo:** `C:\Users\Alex\Documents\GitHub\kanmer` · **Branch:** `updater-implementation` · **Base commit:** `0fcd327` (merge of PR #2)
> **Input:** [`research.md`](research.md) — version-verified against electron-builder **26.15.3** / electron-updater **6.8.9** in `node_modules` and against the installed app on this machine. Its architecture is **approved**; this plan implements it and does not re-litigate it.
> **Ends at:** "all §10 verification green + the two-version manual proof recorded, ready to commit." Merging, tagging and the first real GitHub release are the orchestrator's call — but the release *machinery* is built and dry-run here.

---

## Decisions this plan takes (and the ones it refuses)

| # | Decision | Verdict | One-line justification |
|---|---|---|---|
| D1 | `electron-updater` placement | `dependencies` in `apps/gui/package.json`, `^6.8.9` | Approved architecture. `^6` cannot cross into v7, which is where the signing fail-closed lands (D9). |
| D2 | Vite externalization | `external: ["electron-updater"]` in **main only** | Approved. `externalizeDepsPlugin()` is **banned** — it would externalize whatever lands in `dependencies` next, and gotcha 1 says `gray-matter` must stay bundled. |
| D3 | `files:` in `electron-builder.yml` | **No change** | Verified in `fileMatcher.js:177-219` and empirically in `release-build/builder-debug.yml` (`nodeModuleFilePatterns: ['**/*', …]`). |
| D4 | `releaseType` | **`release`**, never `draft` | A draft is invisible to `GitHubProvider` and fails *silently*. Release notes — the only real argument for draft — are covered by the `apps/gui/release-notes.md` convention. |
| D5 | Install path | `autoDownload: true`, `autoInstallOnAppQuit: true`, plus an explicit "Restart now" | Approved. `autoInstallOnAppQuit` fires on `quit`, i.e. after `before-quit`/`will-quit`, so a cancelled quit cannot install. |
| D6 | **Risk 1 (MCP-session kill)** | **Warn with facts; never block; never install without a user action.** Two probes: one before "Restart now", one on `before-quit` *only when an update is staged*. | See §"Risk 1" below. Refusing to install would mean heavy users never update; the damage from a killed session is a dropped stdio transport, not data loss (the store is crash-safe by construction). |
| D7 | `app.getName()` / `@kanmer/gui` rename | **Do not rename. Correct AGENTS.md §11 only.** | The rename's benefits are cosmetic paths + a dev-launch bug that already has a documented workaround. Its cost is a live-userData migration shipped in the *same release* as the first-ever auto-update — if either breaks, the mechanism to push a fix is the one that just broke. Decisive. A precise migration spec is boxed in §8.3 for whoever takes it later, in its own release. |
| D8 | Release procedure | **A script**, `scripts/release.mjs` (`npm run release <version>`) | No CI. Every failure mode research names (stale plugin bundle, missing `--publish always`, unset `GH_TOKEN`, draft, version typo) is one a script eliminates by refusing rather than guessing. |
| D9 | Code signing | **Not now**, but recorded with its expiry | electron-builder PR #10056 (merged 2026-08-12): fail-open on missing `publisherName` is deprecated, **v28 will fail closed**. Nothing in this implementation may assume unsigned works forever — hence D1's `^6` pin and the AGENTS §8/§11 bullets in Phase 8. |
| D10 | "Skip this version" persistence | **No.** In-session dismissal only. | No new settings field, no comparison logic. `autoInstallOnAppQuit` means "Later" already costs the user nothing. |
| D11 | Native OS toast for updates | **No.** In-window only (existing toast stack + a banner). | `checkForUpdatesAndNotify()` builds its own `Notification` from `app.getName()` — which is `@kanmer/gui` (D7). And an OS toast for an update, fired while the user is in another app, is an interruption with no action attached. |
| D12 | Renderer-triggered manual check (Settings row) | **Not built.** Help menu is the only manual-check surface. | Keeps the new IPC surface to four channels. It is a 4-line addition later if wanted. |

**Explicitly not doing, and why:** `setFeedURL` (electron-builder generates `app-update.yml`; `AppUpdater.loadUpdateConfig` finds it); `checkForUpdatesAndNotify` (D11); `stagingPercentage` (no rollout need yet, and you cannot un-publish your way out of a bad staged release); a GitHub Actions workflow (real fix for risk 9, but out of scope — flagged in AGENTS §11); `allowPrerelease` (GitHub excludes prereleases from `/releases/latest`, and it flips `allowDowngrade` on as a side effect).

---

## Risk 1 — the MCP-session kill: the design

**The mechanism, restated exactly.** `connect.ts:47` registers `command = process.execPath` = `%LOCALAPPDATA%\Programs\Kanmer\Kanmer.exe`, spawned by codex/Claude with `ELECTRON_RUN_AS_NODE=1` and `args = [<resourcesPath>/mcp/kanmer-mcp.cjs, --root, <project>]`. The NSIS installer's `allowOnlyOneInstallerInstance.nsh:79-101` runs, in PowerShell, `Get-CimInstance Win32_Process | ? { $_.Path.StartsWith('$INSTDIR') } | % { Stop-Process -Force }` — **by path prefix, not image name**. The agent's MCP server matches. `--updated` suppresses the prompt (`NsisUpdater.js:113`), so this happens with no dialog.

**What is actually lost.** The agent host's stdio transport dies. The *conversation* survives (the host process is not ours). `.kanmer/` cannot corrupt — `writeFileAtomic` (temp+rename) and `writeFileExclusive` (temp+link) make the store crash-safe by construction (AGENTS §7, §11). After the update, the respawned server is the new one *at the same path* (electron-updater's silent update passes no `/D=`, so the install dir is unchanged). So the honest damage is: one dropped in-flight tool call plus a reconnect.

**Therefore: inform, do not block.** Blocking would mean a user with a long-running agent never updates, which is a worse outcome than a dropped transport — and it would push them toward the manual-download path, which is the one that *does* have SmartScreen friction.

**The probe.** Run the installer's own predicate, narrowed so we can name what dies:

```
powershell -NoProfile -NonInteractive -Command
  "Get-CimInstance Win32_Process |
     Where-Object { $_.ExecutablePath -and $_.CommandLine -like '*kanmer-mcp.cjs*' } |
     Select-Object ExecutablePath,CommandLine | ConvertTo-Json -Compress"
```

Filter results to `ExecutablePath` under `dirname(process.execPath)` (case-insensitive), extract `--root <path>` from each command line, dedupe project paths. This precisely identifies agent MCP sessions and excludes our own renderer/GPU/utility children (their command lines never name the bundle).

**Where it runs — exactly two places, both user-initiated, never on a timer:**

1. **Before "Restart now"** — async, in the renderer's click handler, *before* the IPC call. Feeds the one confirm modal alongside `editorDirty`.
2. **On `before-quit`, only when `phase === "downloaded"` and `autoInstallOnAppQuit` is still true** — synchronous (`execFileSync`, 4 s timeout), then a three-button `dialog.showMessageBoxSync`. This is the *only* thing standing between "user quits Kanmer at 5pm while their agent is mid-run" and an unattended kill.

**Failure is open and honest.** Any failure (non-zero exit, timeout, unparseable JSON, non-Windows, not packaged) yields `{ count: 0, projects: [], unknown: true }`. `unknown: true` produces the generic warning ("Agent MCP sessions running from this install will be closed") and **never blocks**.

**Conservative fallbacks, named:** if the sync probe on quit causes any visible hang → delete `maybeBlockQuitForUpdate` and set `autoInstallOnAppQuit = false`, making the guarded "Restart now" the only install path. If the probe is unreliable in general → keep it, but always show the generic wording (drop the count and project names). Neither fallback changes any other phase.

---

## Phase order and coupling

```
1 Wiring + packaging proof ──┬─► 2 updater.ts (main) ──┐
                             └─► 3 mcp-sessions        ├─► 4 IPC contract ──► 5 Renderer ──► 7 Two-version proof
                                                        ┘                                 └─► 6 Release script
                                                                                              8 Docs (last)
```

1 is first because the dependency install is what makes `import { autoUpdater }` typecheck. 2 and 3 are independent of each other. 4 does the whole `CH`/`KanmerApi`/preload/handler pass **once** for all four channels — the precedent is the AMEND §5.3 note in `docs/plans/pr-2-review/remediation-plan.md`, and the reason is the same: four round-trips through three files is four chances to leave them out of step. 8 is last so the docs describe what shipped.

---

## Phase 1 — Wiring, and proving the *packaged* app can see the feed

### 1.1 The dependency

**File:** `apps/gui/package.json`, `package-lock.json`

Add above `devDependencies`:

```json
"dependencies": {
  "electron-updater": "^6.8.9"
},
```

Then `npm install` from the **repo root** (workspaces). This adds `node_modules/electron-updater` plus its closure (`builder-util-runtime` and `lazy-val` are already hoisted from electron-builder) and updates the `"apps/gui"` entry in `package-lock.json`. **Commit the lockfile.**

**Verify:** `npm ls electron-updater` resolves; `node -e "console.log(require.resolve('electron-updater'))"` prints a path.

### 1.2 The Vite external

**File:** `apps/gui/electron.vite.config.ts`

Three-line change plus a comment fix:

```ts
main: {
  build: {
    rollupOptions: {
      input: resolve(__dirname, "src/main/index.ts"),
      external: ["electron-updater"],
    },
  },
},
```

Update the file-header comment (`:5-9`) to say *"Bundle everything **except `electron-updater`** … electron-updater is externalized deliberately and shipped as a real production dependency inside the asar; do **not** replace this with `externalizeDepsPlugin()`, which would externalize every future `dependencies` entry — gray-matter must stay bundled (AGENTS §8 gotcha 1)."*

`preload` and `renderer` are untouched. Vite's `mergeConfig` concatenates arrays and electron-vite merges its own defaults in, so `electron` + node builtins stay external.

### 1.3 The publish block

**File:** `apps/gui/electron-builder.yml`

Append (order in the file: after `extraResources`, before `win:`):

```yaml
# Auto-update feed. owner/repo are explicit because neither package.json has a
# `repository` field, so electron-builder's auto-detection has nothing to read.
# releaseType MUST NOT be the default `draft`: GitHubProvider reads
# releases.atom and /releases/latest, and neither lists drafts — a draft release
# is invisible to every installed client, silently.
publish:
  - provider: github
    owner: collisionengineers
    repo: kanmer
    releaseType: release
```

**No `files:` change.** Do not add `node_modules/electron-updater/**/*` — it is cargo-culting and the debug output already proves it.

### 1.4 `.gitignore`

**File:** `.gitignore`

The working tree already has the `apps/gui/release-*/` rule (uncommitted) — fold it into this commit. Add one more line:

```
# local updater test feed config (Q6) — never committed, never packaged
apps/gui/dev-app-update.yml
```

### 1.5 The packaging check script

**File (new):** `scripts/check-updater-package.mjs` — dependency-free, matching the style of `check-plugin-sync.mjs` (header comment explaining *why*, `node:fs`/`node:path` only, exit 1 with the fix named).

```
node scripts/check-updater-package.mjs [--out apps/gui/release]
```

Six assertions, each printing the *fix* on failure:

1. `<out>/win-unpacked/resources/app-update.yml` exists, and its text contains `provider: github`, `owner: collisionengineers`, `repo: kanmer`. → *fix: the `publish:` block in `apps/gui/electron-builder.yml`.*
2. `<out>/win-unpacked/resources/app.asar` contains `node_modules/electron-updater/package.json`. Read the asar header without any dependency: open the file, read 16 bytes, `headerSize = buf.readUInt32LE(12)`, read `headerSize` bytes at offset 16, `JSON.parse` after stripping trailing NULs, then walk `header.files.node_modules.files["electron-updater"]`. → *fix: the `dependencies` entry, then `npm install`.*
3. `<out>/latest.yml` exists. (Confirmed to be written even with `--publish never`: `PublishManager.js:158-164` gates the `updateFileWriteTask` on `event.isWriteUpdateInfo` and a resolvable publish config, **not** on `isPublish`.)
4. `<out>/latest.yml`'s `files[0].url` and its legacy `path` both name a file that exists in `<out>`. Parse with `/^\s+url:\s*(.+)$/m` and `/^path:\s*(.+)$/m` — no YAML dependency. This is the spaces→dashes agreement (`Kanmer Setup 0.1.0.exe` → `Kanmer-Setup-0.1.0.exe`) that `GitHubProvider.resolveFiles` independently re-derives.
5. `<out>/win-unpacked/resources/elevate.exe` exists — electron-updater's `EACCES` fallback (`NsisUpdater.js:132-152`).
6. `<out>/win-unpacked/resources/mcp/kanmer-mcp.cjs` exists — regression guard that `extraResources` still packs.

Prints `updater package OK (6 checks)` on success.

> **Note for the executor:** with `--publish never`, `getPublishConfigs` is called with `errorIfCannot = false`, so a *malformed* publish block yields `null` silently instead of throwing. Check 1 is what catches that. Do not remove it.

### 1.6 The packaged-boot assertion

**File:** `apps/gui/src/main/index.ts`

In the `KANMER_SMOKE` branch inside `createWindow()` (`:176-195`), before the watchdog, add:

```ts
if (app.isPackaged) {
  const feed = join(process.resourcesPath, "app-update.yml");
  if (!existsSync(feed)) {
    console.error(`KANMER_SMOKE: ${feed} is missing — the packaged app has no update feed`);
    app.exit(1);
  }
}
```

Do **not** add a `require.resolve("electron-updater")` check. `updater.ts` imports `electron-updater` statically at module top level, so a missing module makes main fail to load and the process never reaches this code — the smoke exits non-zero by construction, and check 2 above catches it earlier and more legibly.

### 1.7 npm scripts

**File:** `package.json` (root)

```json
"dist:check": "npm run dist && node scripts/check-updater-package.mjs",
```

**Verify Phase 1** (this is the "prove it, don't just compile it" step):

```bash
npm install
npm run typecheck -w @kanmer/gui          # clean
npm run dist:check                        # -> "updater package OK (6 checks)"
cd apps/gui && KANMER_SMOKE=1 KANMER_OPEN="<a sandbox project>" \
  ./release/win-unpacked/Kanmer.exe --user-data-dir="<a fresh dir>"; echo $?
# -> 0. Note this runs the PACKAGED binary, not `npx electron .`.
```

The packaged boot smoke is the load-bearing one: it proves the shipped app finds `app-update.yml`, which is the exact "works in dev, silently dead when packaged" failure.

---

## Phase 2 — `apps/gui/src/main/updater.ts`

**File (new):** `apps/gui/src/main/updater.ts`. **File (edited):** `apps/gui/src/main/index.ts`.

### 2.1 Module shape

```ts
import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";
```

Static import, deliberately (see 1.6). Module-level constants — no magic numbers inline:

```ts
const FIRST_CHECK_DELAY_MS = 30_000;              // not t=0: it competes with openProject
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;     // Kanmer windows stay open for days
```

Exports:

| Export | Purpose |
|---|---|
| `initUpdater(send: (payload: UpdateStatusEvent) => void): void` | Configure flags, wire events, schedule checks. Called once from `whenReady`. |
| `checkForUpdatesNow(source: "auto" \| "manual"): void` | The Help-menu item and the interval both call this. |
| `installUpdateNow(): void` | `autoUpdater.quitAndInstall(true, true)`. The **only** caller is the `CH.installUpdate` handler. |
| `updateState(): UpdateStatusEvent` | Current state, for a late-mounting/reloaded renderer. |
| `isUpdaterEnabled(): boolean` | Menu-item `enabled:`. |
| `maybeBlockQuitForUpdate(e: Electron.Event): boolean` | The `before-quit` guard (§2.5). |

### 2.2 Guards and flags

```ts
export function initUpdater(send) {
  if (process.env["KANMER_SMOKE"]) return;                          // the boot smoke makes no network calls
  if (!app.isPackaged && !process.env["KANMER_DEV_UPDATE"]) return; // a normal `npm run dev:gui` never hits the network
  if (!app.isPackaged) autoUpdater.forceDevUpdateConfig = true;     // reads apps/gui/dev-app-update.yml

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true;   // 6.8.9 warns on every download otherwise; we never use nsis-web
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = log;                 // §2.4
  …
}
```

`KANMER_DEV_UPDATE=1` is the opt-in dev hook — it is what makes the Phase 2 fast-loop test possible without packaging, and it means the updater is inert in every other dev run.

### 2.3 Events → one channel

Add to `shared/ipc.ts` in Phase 4; the shape main emits:

```ts
export type UpdatePhase =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "available";   version: string }
  | { phase: "downloading"; version: string; percent: number }
  | { phase: "downloaded";  version: string; releaseNotes?: string }
  | { phase: "none";        version: string }   // up to date; version = the installed one
  | { phase: "error";       message: string }
  | { phase: "disabled" };                      // dev / smoke — the updater is not running

export interface UpdateStatusEvent { status: UpdatePhase; source: "auto" | "manual" }
```

**One channel, not two.** Research suggested `updateStatus` + `updateProgress`; fold progress into `phase: "downloading"`. Two channels would mean two `KanmerApi` methods and two preload wrappers for one concept, and would not reduce the event rate. Instead **throttle in main**: emit a `downloading` payload only when `Math.floor(percent)` changes. That is ≤100 IPC messages per download instead of thousands.

Wiring:

| electron-updater event | emitted `phase` |
|---|---|
| `checking-for-update` | `checking` |
| `update-available(info)` | `available`, `version: info.version` |
| `update-not-available` | `none`, `version: app.getVersion()` |
| `download-progress(p)` | `downloading`, `percent: p.percent` (throttled) |
| `update-downloaded(e)` | `downloaded`; `releaseNotes: typeof e.releaseNotes === "string" ? e.releaseNotes : undefined` (it is `string \| ReleaseNoteInfo[] \| null`) |
| `update-cancelled` | `idle` |
| `error(err)` | `error`, `message: err.message` |

Each emit sets a module-level `state` **and** calls `send(...)`, so `updateState()` and the push can never disagree.

### 2.4 Error handling and logging

**A failed check must never break app start.** Three separate guards:

- `checkForUpdatesNow` does `autoUpdater.checkForUpdates().catch(() => {})` — **empty catch on purpose**: electron-updater emits `error` *and* rejects for the same failure, so handling it in both places double-emits. The `error` listener is the single handler; the `.catch` exists only to stop an unhandled rejection.
- The whole body of `initUpdater` is wrapped in `try { … } catch (err) { log.error(...) }`.
- The `initUpdater(...)` call site in `whenReady` is *also* wrapped, and comes **after** `createWindow()`.

**Does "the MCP server must never write to stdout" (AGENTS §7) apply here? No — and say so in the code comment.** That rule is about the MCP *server* process, whose stdout **is** the transport. `updater.ts` runs in the Electron main process, whose stdout is not a transport; and when the same binary runs as the MCP server (`ELECTRON_RUN_AS_NODE=1`), the entry point is `kanmer-mcp.cjs` and `main/index.ts` is never loaded, so this file cannot execute there. Nevertheless, write to **stderr** for consistency with the existing `KANMER_SMOKE` messages:

```ts
const log = {
  info:  (m: unknown) => console.error("[updater]", m),
  warn:  (m: unknown) => console.error("[updater] warn:", m),
  error: (m: unknown) => console.error("[updater] error:", m),
  debug: (m: unknown) => console.error("[updater] debug:", m),
};
```

No `electron-log` dependency. At init, log one positive line naming the feed by reading the first lines of `join(process.resourcesPath, "app-update.yml")` when packaged — so a packaged run visibly proves it read the exact file the updater reads.

### 2.5 Scheduling, manual check, and the quit guard

```ts
setTimeout(() => checkForUpdatesNow("auto"), FIRST_CHECK_DELAY_MS);
timer = setInterval(() => checkForUpdatesNow("auto"), CHECK_INTERVAL_MS);
```

`checkForUpdatesNow("manual")` **short-circuits when `state.phase === "downloaded"`** and just re-`send`s the existing state — `checkForUpdates()` on an already-downloaded update resolves from cache and may not re-emit `update-downloaded`, which would make the menu item look broken.

`maybeBlockQuitForUpdate(e)`:

```ts
let quitPromptShown = false;
export function maybeBlockQuitForUpdate(e: Electron.Event): boolean {
  if (state.phase !== "downloaded" || quitPromptShown) return false;
  if (!autoUpdater.autoInstallOnAppQuit) return false;
  const sessions = mcpSessionsSync();                 // Phase 3; sync because before-quit cannot await
  if (sessions.count === 0 && !sessions.unknown) return false;
  e.preventDefault();
  quitPromptShown = true;
  const choice = dialog.showMessageBoxSync({
    type: "warning",
    title: "Install the update?",
    message: `Kanmer ${state.version} will install when you quit.`,
    detail: sessions.unknown
      ? "Agent MCP sessions running from this install will be closed by the installer."
      : `This will close ${sessions.count} agent MCP session(s): ${sessions.projects.join(", ")}. ` +
        "Board data is safe — the agent's connection is what drops.",
    buttons: ["Install and quit", "Quit without installing", "Cancel"],
    defaultId: 0, cancelId: 2, noLink: true,
  });
  if (choice === 2) { quitPromptShown = false; return true; }   // stay open
  if (choice === 1) autoUpdater.autoInstallOnAppQuit = false;   // defer to the next quit
  app.quit();                                                   // re-enter; quitPromptShown blocks a re-prompt
  return true;
}
```

### 2.6 `main/index.ts` integration

Four edits:

1. **`whenReady`** (`:523-543`) — after `createWindow()`:
   ```ts
   try {
     initUpdater((payload) => mainWindow?.webContents.send(CH.updateStatus, payload));
   } catch (err) {
     console.error("[updater] init failed:", err);
   }
   ```
2. **`buildMenu()` Help submenu** (`:247-255`) — insert *before* "Kanmer on GitHub":
   ```ts
   { label: "Check for Updates…", enabled: isUpdaterEnabled(),
     click: () => checkForUpdatesNow("manual") },
   { type: "separator" },
   ```
   `buildMenu()` re-runs on every `openProject` (recents refresh), so this item must stay cheap and stateless. It is.
3. **`before-quit` → `will-quit` split.** Today `app.on("before-quit", () => { void watch?.close(); })` (`:549-551`). If `maybeBlockQuitForUpdate` calls `preventDefault()`, `preventDefault` does **not** stop other `before-quit` listeners — the watcher would close and the app would keep running with live-reload silently dead. Fix by moving the close:
   ```ts
   app.on("before-quit", (e) => { maybeBlockQuitForUpdate(e); });
   app.on("will-quit", () => { void watch?.close(); });
   ```
   `will-quit` fires only when `before-quit` was not prevented, and `quit` (where `autoInstallOnAppQuit` installs) fires after it. This ordering is correct and strictly better than what is there now.
4. Imports.

**Test (Phase 2, automated):** none — this module is all electron/IO. The pure logic that *is* testable lives in Phase 3 and Phase 5.

**Verify (Phase 2, the dev fast loop — no packaging):**

1. Create `apps/gui/dev-app-update.yml` (gitignored by 1.4):
   ```yaml
   provider: generic
   url: http://127.0.0.1:8080
   updaterCacheDirName: kanmer-updater-dev
   ```
2. Build a fixture feed in `sandbox-harness/feed/` (already gitignored). Copy the existing installer to `Kanmer-Setup-9.9.9.exe`, then compute its sha512 (base64) and byte size, and write `sandbox-harness/feed/latest.yml`:
   ```yaml
   version: 9.9.9
   files:
     - url: Kanmer-Setup-9.9.9.exe
       sha512: <the base64 above>
       size: <the bytes above>
   path: Kanmer-Setup-9.9.9.exe
   sha512: <same base64>
   releaseDate: '2026-08-13T00:00:00.000Z'
   ```
3. `npx http-server sandbox-harness/feed -p 8080`
4. `cd apps/gui && npm run build && KANMER_DEV_UPDATE=1 npx electron . --user-data-dir="<fresh dir>"`

**Expect on stderr:** `[updater]` lines for checking → update-available 9.9.9 → progress → update-downloaded. **Do not click anything** (there is no UI yet, and the payload is a 0.1.0 installer wearing a 9.9.9 label). This proves the event wiring and the flags. It proves nothing about packaging — Phase 1 and Phase 7 do that.

---

## Phase 3 — MCP session detection

Independent of Phase 2; can be done in parallel.

### 3.1 The pure parser

**File (new):** `apps/gui/src/shared/mcp-sessions.ts` — zero imports (the type comes from `ipc.js` as a type-only import), so a vitest file next to it needs no electron.

```ts
/** Parse the CIM JSON into the sessions an NSIS update would force-kill. */
export function parseSessions(stdout: string, installDir: string): McpSessions
```

Algorithm:
1. `JSON.parse(stdout)`; if the result is not an array, wrap it (`ConvertTo-Json` emits a bare object for a single match — this is the classic PowerShell trap and the reason this function is worth testing).
2. Keep rows whose `ExecutablePath` starts with `installDir`, compared case-insensitively after normalising `/`→`\`.
3. From each `CommandLine`, extract the `--root` argument: match `/--root\s+("([^"]*)"|(\S+))/` and take group 2 ?? group 3.
4. Return `{ count: rows.length, projects: [...new Set(roots)], unknown: false }`.
5. Any throw → `{ count: 0, projects: [], unknown: true }`.

**Test (new):** `apps/gui/src/shared/mcp-sessions.test.ts` — 7 cases:
- empty string → `unknown: true`
- `"[]"` → `{count: 0, unknown: false}`
- a single bare object (not an array) → `count: 1` *(the PowerShell single-item trap)*
- two rows, same project → `count: 2, projects.length === 1`
- a row whose `ExecutablePath` is outside `installDir` → excluded
- a quoted `--root "C:\Path With Spaces\proj"` → the full path
- malformed JSON → `unknown: true`

### 3.2 The shell

**File (new):** `apps/gui/src/main/mcp-sessions.ts`

```ts
export async function mcpSessions(): Promise<McpSessions>      // execFile, for the renderer's Restart-now probe
export function  mcpSessionsSync(): McpSessions                // execFileSync, for before-quit only
```

Both:
- Return `{ count: 0, projects: [], unknown: false }` immediately when `process.platform !== "win32" || !app.isPackaged`. (Un-packaged means `process.execPath` is the dev Electron binary — nothing an installer would kill.)
- `installDir = dirname(process.execPath)`.
- Spawn `powershell.exe` with `["-NoProfile","-NonInteractive","-Command", <the CIM query in §Risk 1>]`, `{ timeout: 4000, windowsHide: true, maxBuffer: 1 << 20 }`.
- Pass stdout to `parseSessions(stdout, installDir)`; any throw → `{ count: 0, projects: [], unknown: true }`.

A file-header comment must record *why* this exists — quote `allowOnlyOneInstallerInstance.nsh:79-101`'s path-prefix kill and `connect.ts:47`'s `command = process.execPath`. This is non-obvious code and the next reader will otherwise delete it.

**Verify:** `npm test` (the 7 new cases pass). Manual, from an installed build with an agent connected:
```powershell
Get-CimInstance Win32_Process | ? { $_.CommandLine -like '*kanmer-mcp.cjs*' } | Select ProcessId,ExecutablePath,CommandLine
```
must list the agent's server, and Phase 7 step 8 confirms the app reports the same count.

---

## Phase 4 — The IPC contract (one pass, four channels)

**Files:** `apps/gui/src/shared/ipc.ts`, `apps/gui/src/preload/index.ts`, `apps/gui/src/main/index.ts`

AGENTS §7/§9's hard convention: a channel needs **four things in step** — `CH` entry, `KanmerApi` method, preload wrapper, main handler. Do all four channels in one pass.

### `shared/ipc.ts`

```ts
// in CH:
  /** Renderer → main: current update state (for a renderer that mounted late). */
  getUpdateState: "kanmer:getUpdateState",
  /** Renderer → main: install the downloaded update and restart. Guarded in the renderer. */
  installUpdate: "kanmer:installUpdate",
  /** Renderer → main: agent MCP sessions an update would force-kill. */
  mcpSessions: "kanmer:mcpSessions",
  /** Main → renderer: auto-update state changes. */
  updateStatus: "kanmer:updateStatus",
```

Types: `UpdatePhase`, `UpdateStatusEvent` (§2.3) and

```ts
/**
 * Agent MCP sessions running from the installed app. The NSIS installer kills
 * every process under the install dir, and the MCP server IS Kanmer.exe there
 * (connect.ts), so these are exactly what an update closes. `unknown` means the
 * probe failed — warn generically, never block.
 */
export interface McpSessions { count: number; projects: string[]; unknown: boolean }
```

`KanmerApi` additions:

```ts
  /** Current auto-update state (`disabled` in dev/smoke). */
  getUpdateState(): Promise<UpdateStatusEvent>;
  /**
   * Install the downloaded update and restart. NOT CANCELLABLE — BaseUpdater
   * spawns the installer BEFORE app.quit(), and the installer force-kills every
   * process under the install dir. Every guard (unsaved edits, live agent
   * sessions) must run in the renderer BEFORE this is called. Main refuses
   * unless an update is actually downloaded.
   */
  installUpdate(): Promise<void>;
  /** Agent MCP sessions an update would close. Probe before offering "Restart now". */
  mcpSessions(): Promise<McpSessions>;
  /** Subscribe to auto-update state changes. Returns an unsubscribe fn. */
  onUpdateStatus(cb: (payload: UpdateStatusEvent) => void): () => void;
```

That doc comment on `installUpdate` is load-bearing — it is the one place a future contributor reads before wiring a second caller.

### `preload/index.ts`

Three `invoke` wrappers and one `on`/`removeListener` wrapper, following the exact shape of `onAgentChange` (`:54-58`).

### `main/index.ts` — handlers in `registerIpc()`

```ts
ipcMain.handle(CH.getUpdateState, () => updateState());
ipcMain.handle(CH.mcpSessions, () => mcpSessions());
ipcMain.handle(CH.installUpdate, () => {
  // Defensive: the renderer owns the guards, but nothing else may ever spawn
  // an installer. quitAndInstall() cannot be undone once called.
  if (updateState().status.phase !== "downloaded") {
    throw new Error("No downloaded update to install");
  }
  installUpdateNow();
});
```

**Verify:** `npm run typecheck -w @kanmer/gui` clean. Then grep the four names across the three files and confirm four hits each:
```bash
for n in getUpdateState installUpdate mcpSessions updateStatus; do \
  echo "$n: $(grep -c "$n" apps/gui/src/shared/ipc.ts apps/gui/src/preload/index.ts apps/gui/src/main/index.ts | paste -sd' ')"; done
```

---

## Phase 5 — The renderer surface

### 5.1 Pure logic first (this is where the automated coverage lives)

**File (new):** `apps/gui/src/renderer/src/lib/update.ts` — AGENTS §7: renderer logic that could be pure, is; `lib/` is the only renderer code with vitest coverage.

```ts
export type UpdateSurface =
  | { kind: "none" }
  | { kind: "toast";  text: string }
  | { kind: "banner"; version: string };

/** What the update state should put on screen. `dismissed` is per-session (D10). */
export function updateSurface(ev: UpdateStatusEvent | null, dismissed: boolean): UpdateSurface;

/**
 * The "Restart now" gate. Returns the sentence to confirm, or null when there is
 * nothing to lose — in which case the caller may install immediately. This is
 * the guard that MUST run before the installUpdate IPC call: quitAndInstall()
 * spawns the installer before app.quit(), so a guard placed after it is a guard
 * that never runs.
 */
export function restartWarning(dirtyId: string | null, sessions: McpSessions): string | null;
```

`restartWarning` composes at most two clauses, joined with `" and "`:
- `dirtyId` → `discard unsaved changes to ${dirtyId}`
- `sessions.unknown` → `close any agent MCP sessions running from this install`
- else `sessions.count > 0` → `close ${count} agent MCP session(s) (${projects.join(", ")})`

and wraps as `Restarting to update will ${clauses}. Continue?`. Returns `null` when both are empty.

`updateSurface` mapping:

| state | `source` | result |
|---|---|---|
| `idle` / `checking` / `disabled` | any | `none` |
| `available` / `downloading` | any | `toast: "Kanmer <v> is downloading…"` |
| `downloaded`, `dismissed === false` | any | `banner: <v>` |
| `downloaded`, `dismissed === true` | any | `none` |
| `none` | `manual` | `toast: "Kanmer <v> is up to date."` |
| `none` | `auto` | `none` |
| `error` | `manual` | `toast: "Update check failed: <message>"` |
| `error` | `auto` | `none` — *a laptop that just went offline is not news* |

**Test (new):** `apps/gui/src/renderer/src/lib/update.test.ts` — one case per table row (8) plus 4 for `restartWarning` (null when clean; names the item; names the count and projects; names both; and `unknown` → the generic clause). ~13 cases.

### 5.2 `App.tsx`

State:
```ts
const [update, setUpdate] = useState<UpdateStatusEvent | null>(null);
const [updateDismissed, setUpdateDismissed] = useState(false);
const [pendingRestart, setPendingRestart] = useState<string | null>(null);
const toastedVersion = useRef<string | null>(null);
```

Subscription (one effect, no `root` dependency — updates are app-global, not project-scoped):
```ts
useEffect(() => {
  void window.kanmer.getUpdateState().then(setUpdate);
  return window.kanmer.onUpdateStatus(setUpdate);
}, []);
```

Surface effect: derive `updateSurface(update, updateDismissed)`; on `kind === "toast"`, push into the **existing** toast stack (`:754-770`) with `id: null` and the existing 4500 ms auto-dismiss, deduped by `toastedVersion.current` so a download's many `downloading` emits produce one toast.

Banner: rendered next to the existing `format === 1` banner (`:610-633`), same markup shape:
```tsx
{surface.kind === "banner" && (
  <div className="banner info">
    <span>Kanmer {surface.version} is ready to install.</span>
    <div className="conflict-actions">
      <button className="primary xs" onClick={() => void onRestartToUpdate()}>Restart now</button>
      <button className="ghost xs" onClick={() => setUpdateDismissed(true)}>Later</button>
    </div>
  </div>
)}
```
"Later" is free — `autoInstallOnAppQuit` installs on the next normal quit. Say so in a `title=` tooltip: *"Installs the next time you quit Kanmer."*

**The gate — this is the whole point of the phase:**
```tsx
const onRestartToUpdate = useCallback(async () => {
  const sessions = await window.kanmer.mcpSessions()
    .catch(() => ({ count: 0, projects: [], unknown: true }));
  const warning = restartWarning(editorDirty.current ? selectedId : null, sessions);
  if (warning === null) { void window.kanmer.installUpdate(); return; }
  setPendingRestart(warning);
}, [selectedId]);
```
and the confirm, next to the existing two `ConfirmModal`s (`:772-797`):
```tsx
{pendingRestart && (
  <ConfirmModal
    message={pendingRestart}
    actionLabel="Restart and update"
    onCancel={() => setPendingRestart(null)}
    onConfirm={() => {
      editorDirty.current = false;
      setPendingRestart(null);
      void window.kanmer.installUpdate();
    }}
  />
)}
```

**Invariant to state in a comment and in AGENTS §7:** `window.kanmer.installUpdate()` has exactly **two** call sites — the `warning === null` early return and this `onConfirm`. Both are downstream of the probe. Nothing else may call it.

One modal, not two chained ones: `restartWarning` composes both facts into one sentence, so the user is asked once.

### 5.3 CSS

**File:** `apps/gui/src/renderer/src/styles.css` — one rule beside `.banner.warn` (`:173`), same shape, informational tint:
```css
.banner.info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #14202a;
  border-bottom: 1px solid #1f3543;
  color: var(--accent, #7ac0ff);
}
```
(`.banner` has no `[data-theme=light]` override today — that is pre-existing and out of scope.)

**Verify Phase 5:** `npm test` (13 new GUI cases green), `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, and the Phase 2 dev-feed loop again — this time the banner appears and "Restart now" opens the confirm. **Do not confirm it in the dev loop** (the payload is a mislabelled installer). Cancel and verify nothing happens.

---

## Phase 6 — Release process

### 6.1 `scripts/release.mjs`

**File (new).** `node scripts/release.mjs <version> [--dry-run]`, wired as root `"release": "node scripts/release.mjs"`. Dependency-free (`node:child_process`, `node:fs`, `node:path`, global `fetch`), house style. **It refuses; it never guesses.**

Pre-flight (all before any work — fail in 200 ms, not 4 minutes):
1. `git status --porcelain` empty, and `git rev-parse --abbrev-ref HEAD` is `main`. Else refuse.
2. `<version>` matches `/^\d+\.\d+\.\d+$/` — **no leading `v`** (`gitHubPublisher.js:35-37` throws on one) and **no prerelease** (GitHub excludes prereleases from `/releases/latest`, so the updater would never see it). Must be strictly greater than `apps/gui/package.json`'s current version.
3. One of `GITHUB_RELEASE_TOKEN` / `GH_TOKEN` / `GITHUB_TOKEN` is set (that precedence order).
4. `apps/gui/release-notes.md` exists and its text contains `<version>` — a cheap guard against shipping last release's notes. `resolveReleaseBody` (`PublishManager.js:246`) reads `release-notes.md` from `packager.projectDir`, which is `process.cwd()` when electron-builder is invoked from `apps/gui` — hence that path. Verified in source.

Verification gate (each must exit 0, in order):
```
npm run build
npm run plugin:check          # NOT plugin:build — see handoff notes
npm test
node packages/mcp-server/src/smoke.mjs
node packages/mcp-server/src/smoke-protocol.mjs
npm run verify:agents-block
npm run typecheck -w @kanmer/gui
```

`--dry-run` stops here and prints what it would do.

Release:
5. Write `<version>` into `apps/gui/package.json` **and** root `package.json` (the app one is authoritative — `appInfo.version = metadata.version` of the *app dir*, `appInfo.js:29`; the root is cosmetic and private). Then `npm install --package-lock-only` so the lockfile's two version fields follow.
6. `npm run build -w @kanmer/gui`, then **pass 1**: `npx electron-builder --win --publish never` in `apps/gui`, then `node scripts/check-updater-package.mjs`. Catching "no `app-update.yml`" or "`electron-updater` not in the asar" *before* a release exists on GitHub is worth the extra pack.
7. `git commit -am "release: v<version>"`, `git tag v<version>`. Tag locally so it points at this exact commit — the publisher does **not** create a git tag, it creates a *release* with `tag_name: v<version>` and GitHub materialises the tag on publish.
8. **Pass 2**: `npx electron-builder --win --publish always` in `apps/gui`. `always` is load-bearing from a laptop: `getOrCreateRelease` (`gitHubPublisher.js:100-107`) only creates a release when `publish === "always"` **or** `getCiTag() != null`, and there is no CI tag here.
9. Post-publish proof — the exact thing `GitHubProvider` reads:
   ```js
   const r = await fetch("https://github.com/collisionengineers/kanmer/releases/latest",
                         { headers: { Accept: "application/json" } });
   // assert (await r.json()).tag_name === `v${version}`
   ```
   Plus a `HEAD` on `…/releases/download/v<version>/latest.yml` expecting 200/302. Fail loudly if either is wrong — that failure means every installed client is blind.
10. `git push && git push --tags`.
11. Print the residual manual checklist: *"never delete assets from old releases (blockmaps: `Provider.getBlockMapFiles` derives the previous URL by string-replacing the version, so a missing old blockmap silently costs every client a full 77 MB download); re-uploading to a release published >2 h ago needs `EP_GH_IGNORE_TIME=true`."*

### 6.2 `apps/gui/release-notes.md`

**File (new), committed.** Seed with a `## 0.1.0` heading and a one-line note. The convention: the top section names the version being released; the script's check 4 enforces that it was updated.

**Verify Phase 6:** `node scripts/release.mjs 0.1.1 --dry-run` runs the whole gate and stops before writing anything; then `git status --porcelain` must still be empty. Also verify each refusal fires: dirty tree, `v0.1.1`, `0.1.0-beta.1`, unset token, stale release notes.

---

## Phase 7 — The two-version manual proof

**This is the only thing that actually proves the feature works.** It produces no commit — it produces evidence, which goes in the PR body / a `proof.md`.

> **⚠ This phase uninstalls and reinstalls Kanmer on the machine it runs on.** It must not be run autonomously while the user has Kanmer open or is relying on it. It is documented here for the user (or a later session) to run deliberately.

Prepare: back up `%APPDATA%\@kanmer\gui\settings.json`; uninstall Kanmer; delete `%LOCALAPPDATA%\Programs\Kanmer` and `%LOCALAPPDATA%\@kanmergui-updater`.

1. On a scratch working tree, temporarily replace `electron-builder.yml`'s publish block with `- provider: generic\n  url: http://127.0.0.1:8080`. **Do not commit.**
2. At version `0.1.0`: `npm run dist:check` → passes. Run `apps/gui/release/Kanmer Setup 0.1.0.exe`, install.
3. **Verify the install is complete** — `%LOCALAPPDATA%\Programs\Kanmer` must contain **both** `resources\` and `locales\`. Research recorded a partial install on this machine missing both (the `EBUSY` class). If it reproduces, stop and understand it *before* continuing: the same overwrite happens unattended during an update.
   Also confirm `resources\app-update.yml` exists and says `provider: generic`.
4. Bump `apps/gui/package.json` to `0.1.1`; `npm run dist:check` again.
5. Serve the release dir: `npx http-server apps/gui/release -p 8080`.
6. **Put risk 1 under test.** In the *installed* Kanmer: open a scratch project → ⚙ Settings → Connect Claude Code (or codex). In that project, run the agent and issue one Kanmer tool call so the server process is live. Confirm:
   ```powershell
   Get-CimInstance Win32_Process | ? { $_.CommandLine -like '*kanmer-mcp.cjs*' } | Select ProcessId,ExecutablePath,CommandLine
   ```
7. In the installed Kanmer, open a ticket and type into the editor (dirty). Wait for the banner, or use **Help → Check for Updates…**.
8. Click **Restart now**. **Expect** one confirm modal naming *both* the dirty ticket id *and* `1 agent MCP session (<project path>)`. **Cancel** → nothing happens, still 0.1.0, editor still dirty. Re-open and **Confirm** → app closes, installer runs silently, Kanmer relaunches as 0.1.1.
9. After: check the exe's file version is 0.1.1; `resources\mcp\kanmer-mcp.cjs` refreshed; the agent's MCP process is **gone** (risk 1 confirmed and the warning was honest); record whether the agent's next tool call respawns or errors.
10. Re-run the MCP smoke against the *updated* install — proves `extraResources` survived:
    ```bash
    KANMER_NODE="%LOCALAPPDATA%\Programs\Kanmer\Kanmer.exe" \
    KANMER_SERVER="%LOCALAPPDATA%\Programs\Kanmer\resources\mcp\kanmer-mcp.cjs" \
    node packages/mcp-server/src/smoke.mjs      # -> 68/68
    ```
11. Settings survived: `%APPDATA%\@kanmer\gui\settings.json` still holds the recents and window bounds. (This is also the empirical confirmation of D7's premise.)
12. **The quit path.** Bump to `0.1.2`, rebuild, serve, let 0.1.1 download it, start an MCP session again, then **quit** Kanmer → expect the three-button dialog. Choose **Quit without installing** → still 0.1.1 next launch. Repeat and choose **Install and quit** → 0.1.2 next launch. Then quit with *no* MCP session and an update staged → **no dialog**, installs silently. All three branches must be exercised.
13. Record whether the 0.1.1→0.1.2 download was differential (range requests) or full — informational only.
14. Restore: `git checkout apps/gui/electron-builder.yml apps/gui/package.json`, reinstall the real build, restore `settings.json` if needed.

**After the first real GitHub release** (orchestrator's call), the residual proof:
```bash
curl -s -H "Accept: application/json" https://github.com/collisionengineers/kanmer/releases/latest   # tag_name === v<version>
curl -sI https://github.com/collisionengineers/kanmer/releases/download/v<version>/latest.yml        # 200/302
```

---

## Phase 8 — Documentation

### 8.1 `AGENTS.md`

- **§2 layout** — under `apps/gui/src/main/`: `updater.ts   # electron-updater: schedule, events, quitAndInstall` and `mcp-sessions.ts  # which agent MCP servers an update would kill`. Under `shared/`: `mcp-sessions.ts  # pure CIM-output parser (tested)`. Under `renderer/src/lib/`: `update.ts`. Under `scripts/`: `check-updater-package.mjs`, `release.mjs`. Add `apps/gui/release-notes.md`.
- **§5 `@kanmer/gui`** — one sentence: main owns the auto-updater; the renderer only ever *asks* to install, and the ask is gated on unsaved edits and live agent sessions before it becomes an IPC call.
- **§6 commands** — three rows: `npm run dist:check`, `npm run release <version>` (needs `GH_TOKEN`), and the `KANMER_DEV_UPDATE=1` + `dev-app-update.yml` dev-feed run.
- **§7 conventions** — two bullets:
  1. *"**`quitAndInstall()` is not cancellable.** `BaseUpdater` spawns the installer **before** `app.quit()`, and the installer force-kills every process under the install dir — so a guard placed after the IPC call is a guard that never runs. `CH.installUpdate` has exactly two renderer call sites, both downstream of `restartWarning()`; main refuses the call unless an update is actually downloaded."*
  2. *"**`electron-updater` is the one externalized production dependency**, via `external: ["electron-updater"]` in the main build only. Do **not** replace it with `externalizeDepsPlugin()` — that externalizes every future `dependencies` entry, and gotcha 1 requires gray-matter to stay bundled in the CJS main output."*
- **§8 gotchas** —
  - **Amend gotcha 5**: it says electron-builder bundles nothing from `node_modules`. It now bundles exactly one thing — `electron-updater` — because `dependencies` is what turns on `NodeModulesCollector`. `files:` needs no entry for it (a *separate* node-module matcher starts from `**/*`).
  - **New gotcha 10 — the update kills agent MCP servers.** `allowOnlyOneInstallerInstance.nsh:79-101` stops every process whose path is under `$INSTDIR`, and `connect.ts:47` registers `process.execPath` as the MCP command, so the agent's server **is** a process in the install dir. `--updated` suppresses the prompt. This is why `mcp-sessions.ts` exists.
  - **New gotcha 11 — `releaseType` defaults to `draft`, and drafts are invisible.** `GitHubProvider` reads `releases.atom` and `/releases/latest`; neither lists drafts. `electron-builder.yml` sets `releaseType: release` explicitly. Never revert it.
- **§10 verification** — new step: *"If the GUI packaging or the updater changed: `npm run dist:check`, then boot the **packaged** binary under `KANMER_SMOKE` (`release/win-unpacked/Kanmer.exe --user-data-dir=<fresh>`). Compiling is not evidence — this is the step that catches 'works in dev, dead when packaged'."*
- **§11 limitations** — the correction plus new bullets (below).

### 8.2 The §11 correction (D7) — replace the last two sentences of the "Running from source does not launch" bullet

> The **packaged** app is *not* unaffected, contrary to what this bullet used to say. electron-builder's `productName` never reaches the `package.json` inside `app.asar` — that file is `{"name":"@kanmer/gui","version":…}` with scripts and devDependencies stripped and no `productName` injected. So `app.getName()` is `@kanmer/gui` in the packaged app too: the installed app's userData is `%APPDATA%\@kanmer\gui\` (verified on disk — it holds the real `settings.json` and there is no `%APPDATA%\Kanmer` at all), and the updater cache dir inherits it as `%LOCALAPPDATA%\@kanmergui-updater`. Only the *single-instance-lock* symptom is dev-only. A one-line `app.setName("Kanmer")` would fix all three paths at once, but it silently orphans every existing user's settings, so it stays a product decision — and if it is ever taken it must ship with a one-time settings migration, in its own release, never alongside a change to the update mechanism itself.

New §11 bullets:
- **Unsigned auto-update has a stated expiry.** `NsisUpdater.verifySignature` returns "pass" when `publisherName` is absent from `app-update.yml`, and `publisherName` is only written when a signing cert exists — so unsigned updates install today. electron-builder PR #10056 (merged 2026-08-12) deprecates that fail-open and states **v28 will fail closed**. We are on electron-builder 26.15.3 / electron-updater `^6.8.9`; the caret cannot cross into v7, so nothing breaks by drift. Read the release notes before any major bump, and treat "get a signing story" as scheduled, not someday. Once signing is on, `publisherName` lands in `app-update.yml` and turns verification **on** for all future clients — changing the cert subject later then breaks updates for everyone on the old build. It is a one-way door.
- **An update closes live agent MCP sessions.** Unavoidable with NSIS (gotcha 10). We warn with a count and never install without a user action; the store is crash-safe, so the loss is a dropped transport, not data. The long-term fix is shipping the MCP server as a separate binary outside `$INSTDIR`, or a launcher shim that survives updates.
- **The registered MCP command path can go stale.** `allowToChangeInstallationDirectory: true` means a *manual* re-install can move the install dir; every project's `.mcp.json` / codex entry then points at a path that no longer exists. electron-updater's silent update passes no `/D=`, so auto-updates keep the directory. Not detected today; a "recorded MCP command ≠ `process.execPath` → offer Reconnect" check is the follow-up.
- **No CI: releases are cut from one machine** by `npm run release <version>`. The script runs the whole verification gate first and refuses on a dirty tree, a bad version, a missing token or stale release notes — but it is still one laptop's toolchain. A ~30-line GitHub Actions workflow on tag push is the real fix.

### 8.3 If anyone later takes D7's rename (out of scope; specified so it is not improvised)

**Its own release, nothing else in it:**
1. `app.setName("Kanmer")` as the **first statement** of `main/index.ts`, above `app.requestSingleInstanceLock()` (`:57`) — the lock and every `app.getPath("userData")` resolve against the name, so anything later is too late.
2. In `settings.ts`, before the first `readSettings()`: if `join(app.getPath("userData"), "settings.json")` is absent **and** the legacy dir `join(dirname(dirname(app.getPath("userData"))), "@kanmer", "gui", "settings.json")` exists, copy the legacy `settings.json` (only that file — not the Chromium profile) into the new userData dir and leave the original in place as a rollback. Never `rename`.
3. Accept that the updater cache dir changes to `kanmer-updater`, orphaning the old `%LOCALAPPDATA%\@kanmergui-updater\installer.exe` (~77 MB) — document it, or delete it in the same migration.
4. Accept that a from-source dev run now shares the installed app's single-instance lock and settings — which is precisely why §11 left it alone.
5. Ship it *after* at least two successful auto-update cycles, so the mechanism that would deliver a fix is known-good.

### 8.4 `README.md`

New `## Updates` section after "Install — the easy way":
- Kanmer checks GitHub Releases ~30 s after launch and every 6 hours, downloads in the background, and shows a banner when an update is ready.
- **Restart now** installs immediately; **Later** costs nothing — it installs the next time you quit.
- **An update closes any agent MCP session running from the installed app** (the installer stops every process in the install folder, and the MCP server is the app's own binary). Kanmer tells you how many are open before it restarts, and asks again if you quit with an update staged. Your board is safe — `.kanmer/` writes are atomic; it is the agent's connection that drops, and it reconnects against the new server.
- The installer is **unsigned**, so SmartScreen warns on a *manual* download — but not on an auto-update, which is spawned by an already-trusted process with no Mark-of-the-Web. The friction is paid once, on first install.
- **To go back one version:** re-run `%LOCALAPPDATA%\@kanmergui-updater\installer.exe` — the previously installed installer keeps a copy of itself there. There is no automatic rollback; the normal remedy for a bad release is a higher version.

New `### Release (maintainers)` block under "Verify end-to-end":
```bash
# edit apps/gui/release-notes.md first — the script refuses stale notes
GH_TOKEN=<pat with repo scope> npm run release 0.2.0
```
with a line naming what it does: verifies everything, bumps `apps/gui/package.json`, builds, checks the package, tags `v0.2.0`, publishes a **non-draft** GitHub release with the installer + blockmap + `latest.yml`, and re-fetches `/releases/latest` to prove clients can see it.

---

## Commit structure

Seven commits, matching house subjects (`feat(gui):`, `build(gui):`, `chore(scripts):`, `docs:`).

| # | Subject | Contents |
|---|---|---|
| 1 | `build(gui): ship electron-updater in the package and publish to GitHub Releases` | `apps/gui/package.json` (dependencies), `package-lock.json`, `apps/gui/electron.vite.config.ts` (external + comment), `apps/gui/electron-builder.yml` (publish block), `scripts/check-updater-package.mjs`, root `package.json` (`dist:check`), `apps/gui/src/main/index.ts` (packaged smoke assertion), `.gitignore` (`release-*/` + `dev-app-update.yml`) |
| 2 | `feat(gui): auto-update wiring in the main process` | `apps/gui/src/main/updater.ts`, `main/index.ts` (init, Help-menu item, `before-quit`→`will-quit` split) |
| 3 | `feat(gui): identify the MCP sessions an update would kill` | `apps/gui/src/shared/mcp-sessions.ts` + `.test.ts`, `apps/gui/src/main/mcp-sessions.ts` |
| 4 | `feat(gui): IPC contract for update status, install and MCP sessions` | `shared/ipc.ts`, `preload/index.ts`, `main/index.ts` handlers |
| 5 | `feat(gui): update banner, and gate Restart now on unsaved work and live agent sessions` | `renderer/src/lib/update.ts` + `.test.ts`, `App.tsx`, `styles.css` |
| 6 | `chore(scripts): one-command release with verification, publishing and a post-publish check` | `scripts/release.mjs`, `apps/gui/release-notes.md`, root `package.json` (`release`) |
| 7 | `docs: the app self-updates — release procedure, gotchas, and the §11 userData correction` | `AGENTS.md`, `README.md` |

Commit 2 depends on 1 (typecheck). Commits 2 and 3 are independent of each other. Commit 4 needs 2 and 3. Phase 7 produces evidence, not a commit.

---

## Final verification sequence

Run in this order from the repo root. **Nothing here may regress the merged baseline.**

```bash
npm test                                              # core 80 + GUI 40 + 20 new (13 update, 7 mcp-sessions) = 60 GUI
node packages/mcp-server/src/smoke.mjs                # 68/68
node packages/mcp-server/src/smoke-protocol.mjs       # 26/26
npm run verify:agents-block                           # 26/26
npm run build && npm run plugin:check                 # "20 tools match" + bundle bytes match
npm run typecheck -w @kanmer/gui                      # clean
npm run build -w @kanmer/gui                          # clean
npm run dist:check                                    # "updater package OK (6 checks)"
cd apps/gui && KANMER_SMOKE=1 KANMER_OPEN="<sandbox>" \
  ./release/win-unpacked/Kanmer.exe --user-data-dir="<fresh dir>"; echo $?   # 0 — PACKAGED binary
node scripts/release.mjs 0.1.1 --dry-run              # whole gate passes; tree still clean afterwards
```

Then **Phase 7 in full**, with steps 3, 8, 10, 11 and all three branches of 12 recorded verbatim.

Baseline invariants that must be unchanged: core test count 80 (this change touches no core file); `plugin:check` bundle bytes identical (this change touches no server file); `smoke.mjs` 68/68 and `smoke-protocol.mjs` 26/26 unchanged; `verify-agents-block.mjs` 26/26 unchanged.

---

## Handoff notes

**Do not touch:**
- `packages/core/**` and `packages/mcp-server/**` — nothing here needs them. If you touch them, `npm run plugin:build` becomes mandatory (gotcha 8) and the release script's gate changes.
- **Do not run `npm run plugin:build`.** It rewrites the committed bundle. Run `npm run build && npm run plugin:check` instead — the check verifies bytes without producing a diff.
- `files:` in `electron-builder.yml`. `preload`/`renderer` in `electron.vite.config.ts`.
- `apps/gui/release/` and `apps/gui/release-build/` — both gitignored, both build output.

**Never do:**
- `externalizeDepsPlugin()` (D2). `autoUpdater.setFeedURL()`. `checkForUpdatesAndNotify()` (D11).
- `releaseType: draft`, or hand-editing asset names on a GitHub release page (the space→dash rename is derived independently in two places and they must agree).
- Delete assets from an old release — a missing old `.blockmap` silently costs every client on that version a full 77 MB download.
- Call `quitAndInstall()` from anywhere but the `CH.installUpdate` handler, or add a third renderer call site for `installUpdate()`.
- Move `watch?.close()` anywhere except `will-quit`.

**Conservative fallbacks, if something proves risky:**

| If | Then |
|---|---|
| The `before-quit` sync probe hangs or feels wrong | Delete `maybeBlockQuitForUpdate` and set `autoInstallOnAppQuit = false`. "Restart now" becomes the only install path — safe, but some users never update. |
| The CIM probe is unreliable | Keep it; always render the `unknown: true` generic wording. Never let it block. |
| `check-updater-package.mjs`'s asar header parse is brittle | Fall back to `node_modules/.bin/asar list <asar>` via `execFileSync` (`@electron/asar` is a real transitive dep of electron-builder). Do not drop check 2 — it is the one that catches the packaging failure. |
| `apps/gui/release-notes.md` does not appear on the GitHub release | Move it to the repo root and re-check. `projectDir` is `process.cwd()` at electron-builder invocation; the script invokes from `apps/gui`, which is why it lives there. Verified in source, but confirm on the first real release. |
| Two-pass packaging in `release.mjs` is too slow | Drop pass 1 and run `check-updater-package.mjs` after pass 2, accepting that a bad package is caught only after the release exists. Prefer the two-pass. |

**Where the plan is genuinely uncertain** (each with the conservative option already taken, and what would settle it):
1. **Differential-download savings for Kanmer.** Most of the 77 MB is the unchanged Electron runtime, but `app.asar` and `kanmer-mcp.cjs` change nearly every release. No action; Phase 7 step 13 observes it. Settled by watching one real 0.1.1→0.1.2 update.
2. **The partial install already on this machine** (`%LOCALAPPDATA%\Programs\Kanmer` missing `resources\` and `locales\`). Cause unknown; the same unattended overwrite happens during an update. Phase 7 step 3 makes reproducing it a gate, not a footnote. Settled by a clean install that has both directories.
3. **Whether the agent host respawns a killed MCP server automatically.** Differs by host and probably by version. Phase 7 step 9 records the observed behaviour rather than asserting one. If it does *not* respawn, the README wording in 8.4 needs softening from "it reconnects" to "reconnect the agent".
4. **PowerShell availability/latency on other machines.** Fails open by design; the only cost of being wrong is a less specific warning. Settled by running Phase 7 on a second machine, which is not required to ship.

**Two things this plan deliberately leaves undone**, recorded so they are not mistaken for oversights: a GitHub Actions release workflow (risk 9's real fix), and stale-MCP-path detection after an install-directory change (risk 7). Both are §11 bullets in Phase 8.
