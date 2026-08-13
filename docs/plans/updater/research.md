# Electron auto-update research for Kanmer

Research date: 2026-08-13. Branch: `updater-implementation`.
Everything below about *this repo* was verified by reading files or inspecting the
build output / installed app on this machine. Everything about *electron-updater
and electron-builder* was verified against the exact versions this repo pins
(electron-builder **26.15.3**, electron-updater **6.8.9**), not against the docs
site — the published docs at electron.build now document **v27**, which is still
in alpha, and several things on that page do not exist in 26.x (see
[Version drift](#version-drift-the-docs-site-is-ahead-of-what-we-pin)).

---

## Executive summary

We are adding **in-place self-update** to the installed Windows app: the running
Kanmer checks GitHub Releases, downloads the next NSIS installer in the
background, and installs it at a moment the user chooses — never while the
editor is dirty.

| # | Decision | Verdict | Why (short) |
|---|---|---|---|
| 1 | Package | `electron-updater@^6.8.9` | Only supported updater for the `nsis` target; ships in lockstep with the pinned `builder-util-runtime@9.7.0` we already have on disk. |
| 2 | Where it lives in `package.json` | A real **`dependencies`** entry in `apps/gui/package.json` | electron-builder 26 collects production deps through `NodeModulesCollector` and ships them into the asar. Nothing else works reliably. |
| 3 | `files:` change in `electron-builder.yml` | **None needed** | Verified: the node-module matcher takes *only exclude patterns* from `files` (`fileMatcher.js:177-210`), and the current config has no `!` patterns. Adding `node_modules/electron-updater/**/*` is cargo-culting. |
| 4 | Vite handling | Add `external: ["electron-updater"]` to **main only** in `electron.vite.config.ts` — **not** `externalizeDepsPlugin()` | electron-vite 2.3.0 bundles everything by default; the surgical `external` keeps that invariant (which gray-matter depends on, AGENTS.md §8.1) and avoids a future footgun where moving `@kanmer/core` to `dependencies` would silently externalize an ESM package into a CJS bundle. |
| 5 | Update source | GitHub Releases, `provider: github`, public repo, **no token in the client** | Decided. Confirmed the provider only hits `releases.atom` + `/releases/latest` + `/releases/download/...`, all anonymous for a public repo. |
| 6 | Release must be **published**, not draft | Yes — `releaseType: draft` is the electron-builder default and the updater cannot see drafts | `GitHubProvider` reads the Atom feed and `/releases/latest`; neither lists drafts. This is the #1 "why doesn't it update" trap. |
| 7 | Tag format | `v<version>` where `<version>` is `apps/gui/package.json`'s `version` | `gitHubPublisher.js:38` — `tag = githubTagPrefix(info) + version`, prefix defaults to `"v"`. The publisher creates the *release*; GitHub creates the git tag on publish. |
| 8 | `autoDownload` | `true` (default) | Downloads are ~77 MB full / far less differential; background download then a quiet prompt is the right feel for a local-first tool. |
| 9 | `autoInstallOnAppQuit` | `true` (default) — this is the primary install path | It fires on Electron's `quit` event, i.e. *after* `before-quit`/`will-quit`, so a cancelled quit never installs. That is exactly the guard the dirty-editor work needs. |
| 10 | Explicit "Restart now" | Gate `quitAndInstall()` behind `editorDirty` in the renderer | `BaseUpdater.quitAndInstall` spawns the installer **before** calling `app.quit()`. Once called it cannot be cancelled — and the installer force-kills every process under the install dir. Gate before, never after. |
| 11 | Differential downloads | Already work; keep `differentialPackage` default | `.blockmap` is already produced (`release/Kanmer Setup 0.1.0.exe.blockmap`) and the NSIS installer already caches itself at `%LOCALAPPDATA%\@kanmergui-updater\installer.exe`. Both halves of the mechanism are in place today. |
| 12 | Code signing | Not required today; unsigned NSIS auto-update **works** | `NsisUpdater.verifySignature` returns `null` (skip) when `publisherName` is absent. But this fail-open is **deprecated as of 2026-08-12** and electron-builder **v28 will fail closed** — see [signing section](#what-signing-would-take-and-what-breaks-without-it). |
| 13 | `disableWebInstaller` | Set to `true` | electron-updater 6.8.9 logs a warning on every download otherwise and says the default flips in a future version. We never use `nsis-web`. |

Three things must be fixed or consciously accepted before shipping, in this order:
**(a)** the packaged app has *no* `resources/app-update.yml` and no `latest.yml`
today — publish config is the whole unlock; **(b)** the NSIS installer force-kills
the agent's MCP server child process, because that child *is* `Kanmer.exe` inside
the install directory; **(c)** `app.getName()` is `@kanmer/gui` **in the packaged
app too** (AGENTS.md §11 is wrong about this), which is why the updater cache dir
is literally `%LOCALAPPDATA%\@kanmergui-updater`.

---

## Current state — verified

### Dependencies and bundling

- `apps/gui/package.json:15-33` has **only** a `devDependencies` block. There is
  no `dependencies` key at all. `@kanmer/core`, `chokidar`, `gray-matter`,
  `marked`, `yaml`, `zod`, `react` — all dev.
- `apps/gui/package.json:2-6`: `name: "@kanmer/gui"`, `version: "0.1.0"`,
  `main: "./out/main/index.js"`. **No `productName`, no `repository` field.**
- `apps/gui/electron.vite.config.ts:5-9` states the intent in a comment: *"Bundle
  everything (core + gray-matter + chokidar + yaml + zod) into the main and
  preload outputs… so the packaged app ships only `out/**` and needs no
  node_modules."*
- `apps/gui/electron.vite.config.ts:10-28` has **no `plugins` array for `main` or
  `preload`**. `externalizeDepsPlugin` is not imported and not used.
- electron-vite 2.3.0's `externalizeDepsPlugin` is **opt-in**
  (`node_modules/electron-vite/dist/index.mjs:347-372`). It reads only
  `pkg.dependencies` — devDependencies are never externalized by it.
- electron-vite 2.3.0's *default* externals for main and preload are
  `['electron', /^electron\/.+/, ...builtinModules(+ 'node:' prefixed)]`
  (`node_modules/electron-vite/dist/chunks/lib-BmEkZIgk.mjs:273` for main, `:378`
  for preload). Everything else is bundled by Rollup.
- Output format is **CJS**: electron-vite picks `cjs` unless the package.json has
  `"type": "module"` (`lib-BmEkZIgk.mjs:261`), and `apps/gui/package.json` does not.
- Verified with `npm list --omit dev --json` from the repo root: `@kanmer/gui`
  resolves as a workspace node with **zero production dependencies**.

### electron-builder configuration and what it actually ships

- `apps/gui/electron-builder.yml:11-13`: `files: [out/**/*, package.json]`.
- `apps/gui/electron-builder.yml:17-19`: `extraResources` → `resources/mcp/kanmer-mcp.cjs`.
- `apps/gui/electron-builder.yml:21-31`: `win.target: [nsis]`, `nsis.oneClick: false`,
  `perMachine: false`, `allowToChangeInstallationDirectory: true`.
- **There is no `publish:` block.** Consequence, verified on disk:
  - `apps/gui/release/` contains `Kanmer Setup 0.1.0.exe`,
    `Kanmer Setup 0.1.0.exe.blockmap`, `builder-debug.yml`,
    `builder-effective-config.yaml`, `win-unpacked/` — and **no `latest.yml`**.
  - `apps/gui/release/win-unpacked/resources/` contains `app.asar`, `elevate.exe`,
    `mcp/` — and **no `app-update.yml`**.
  - Both files are written only when a publish configuration resolves
    (`PublishManager.js:74-90` writes `app-update.yml` in `onAfterPack`;
    `:158-164` schedules `latest.yml`). `getPublishConfigsForUpdateInfo`
    (`PublishManager.js:206-224`) can fall back to auto-detecting a GitHub repo,
    but only via `packager.info.repositoryInfo`, and neither package.json has a
    `repository` field. So today: nothing.
- `apps/gui/release/builder-debug.yml:1-17` is the empirical proof of how `files`
  interacts with node_modules:
  ```yaml
  firstOrDefaultFilePatterns:
    - '!**/node_modules/**'     # <- injected by electron-builder
    - '!build{,/**/*}'
    - '!release{,/**/*}'
    - out/**/*
    - package.json
    ...
  nodeModuleFilePatterns:
    - '**/*'                    # <- everything in each collected prod module
    - out/**/*
    - package.json
  ```
  The main matcher excludes `node_modules`; a *separate* matcher governs
  production node_modules and starts from `**/*`. Nothing today matches it
  because there are no production dependencies.
- `resources/elevate.exe` **is** packed (verified, 107 KB). `CopyElevateHelper`
  copies it unless `packElevateHelper === false`
  (`targets/nsis/nsisUtil.js:56-87`), which we do not set. This matters: it is
  electron-updater's fallback when the installer spawn fails with `EACCES`.
- The blockmap is already produced: `isBuildDifferentialAware` is
  `!isPortable && options.differentialPackage !== false`
  (`NsisTarget.js:66-68`), so it is on by default, and
  `createBlockmap` (`differentialUpdateInfoBuilder.js:66-79`) emits
  `<installer>.exe.blockmap` as a first-class artifact — it will be uploaded
  alongside the exe as soon as publishing is on.

### The installed app on this machine

- Installed at `%LOCALAPPDATA%\Programs\Kanmer` (per-user, as `perMachine: false`
  implies).
- **`%LOCALAPPDATA%\@kanmergui-updater\installer.exe` already exists** (77 MB,
  same timestamp as the install). This is the NSIS installer copying itself for
  future differential updates: `NsisTarget.js:502` defines
  `APP_INSTALLER_STORE_FILE = "<updaterCacheDirName>\installer.exe"` and
  `templates/nsis/include/installer.nsh:93` does
  `copyFile "$EXEPATH" "$LOCALAPPDATA\${APP_INSTALLER_STORE_FILE}"`.
  So half the differential-update machinery is already running in production.
- The cache dir name is derived from the **package name**, not productName:
  `appInfo.updaterCacheDirName = sanitizedName.toLowerCase() + "-updater"`
  (`appInfo.js:126-128`), and `sanitizeFileName("@kanmer/gui")` evaluates to
  `"@kanmergui"` (verified by calling `builder-util`'s function directly).
  Hence `@kanmergui-updater`.
- **Correction to AGENTS.md §11 (line 371):** it claims the packaged app is
  unaffected by the scoped-name bug because `productName: Kanmer`. That is not
  what happens. The `package.json` inside `app.asar` is
  `{"name":"@kanmer/gui","version":"0.1.0","description":…,"author":"Kanmer","main":"./out/main/index.js"}`
  — electron-builder strips scripts/devDependencies but **does not inject
  `productName`**. Verified on disk: the *packaged* app's userData is
  `%APPDATA%\@kanmer\gui\` (it holds `settings.json` with the user's real
  recentProjects and windowBounds, plus a full Chromium profile). There is no
  `%APPDATA%\Kanmer` directory at all. The single-instance-lock symptom may
  still be dev-only, but the *path* claim is wrong and should be fixed while we
  are in here, because the updater inherits it.
- The current install is **incomplete**: `%LOCALAPPDATA%\Programs\Kanmer`
  contains `Kanmer.exe`, the `.pak`/`.dat`/`.dll` files — but **no `resources/`
  directory and no `locales/`**. That is consistent with the `EBUSY`-class
  install failure mentioned in the task brief. Worth reproducing deliberately as
  part of updater testing (see [Risks](#risks-and-failure-modes)).

### The parts of the app the updater has to cooperate with

- `apps/gui/src/main/index.ts:57-71` — single-instance lock, with a `KANMER_SMOKE`
  branch that exits 1. Any updater code must not run in smoke mode.
- `apps/gui/src/main/index.ts:207-258` — `buildMenu()`, with a **Help submenu at
  :247-255** currently holding one item ("Kanmer on GitHub"). This is the natural
  home for "Check for Updates…".
- `apps/gui/src/main/index.ts:264-335` — the native-toast batching machinery
  (`markOwnWrite`, `queueToast`, `flushToasts`) and `Notification` usage.
- `apps/gui/src/main/index.ts:523-543` — `app.whenReady()` handler; `:549-551` —
  `before-quit` closes the watcher.
- `apps/gui/src/renderer/src/App.tsx:72-74` — `editorDirty` ref, `pendingNav`,
  `pendingProject`; `:117-125` — `trySelect`; `:128-137` — the `beforeunload`
  handler; `:772-797` — the two `ConfirmModal` instances that gate discarding
  edits. `apps/gui/src/renderer/src/components/Editor.tsx:109` / `:294-299` —
  `pendingTab`.
- `apps/gui/src/renderer/src/App.tsx:61,754-770` — the in-app toast stack the
  update prompt should reuse.
- `apps/gui/src/main/connect.ts:28-48` — the MCP registration writes
  `command = process.execPath` (i.e. the **absolute path to the installed
  `Kanmer.exe`**), `args = [<resourcesPath>/mcp/kanmer-mcp.cjs, --root, <project>]`,
  `env = { ELECTRON_RUN_AS_NODE: "1" }` into the agent host's config. Two
  consequences for updates, both real (see [Risks](#risks-and-failure-modes)).

---

## The recommended architecture

### What changes

1. **`apps/gui/package.json`** — add a `dependencies` block:
   ```json
   "dependencies": { "electron-updater": "^6.8.9" }
   ```
   That is the *only* production dependency. Everything else stays dev.

2. **`apps/gui/electron.vite.config.ts`** — externalize exactly one module in the
   `main` build:
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
   Vite's `mergeConfig` concatenates arrays, and electron-vite merges *its*
   defaults with the user config (`lib-BmEkZIgk.mjs:299`), so `electron` and the
   node builtins stay external too. Do **not** add
   `externalizeDepsPlugin()`: it externalizes *every* entry of `dependencies`,
   which is fine today (one entry) but becomes a silent breakage the day someone
   promotes `@kanmer/core` — an ESM workspace package — into `dependencies`, at
   which point the CJS main bundle would `require()` an ESM module. The
   comment at `electron.vite.config.ts:5-9` should be updated to say "everything
   except `electron-updater`".

3. **`apps/gui/electron-builder.yml`** — add publishing. No `files` change:
   ```yaml
   publish:
     - provider: github
       owner: collisionengineers
       repo: kanmer
       releaseType: release   # NOT the default "draft" — see below
   ```
   `owner`/`repo` are explicit rather than auto-detected, because auto-detection
   goes through `repositoryInfo` and neither package.json declares `repository`.

4. **`apps/gui/src/main/`** — a new `updater.ts` module owning the
   `autoUpdater` wiring, plus IPC channels in `shared/ipc.ts` and a Help-menu
   item. See [Q4](#4-the-update-ux) for the shape.

### What ships where, after the change

| Artifact | Where it ends up | Produced by |
|---|---|---|
| `electron-updater` + 8 transitive deps (~2 MB unpacked) | `app.asar/node_modules/` | `NodeModulesCollector`, driven by `dependencies` |
| `out/main/index.js` (now `require`s `electron-updater`) | `app.asar/out/main/` | electron-vite / Rollup |
| `app-update.yml` (provider, owner, repo, `updaterCacheDirName`) | `resources/app-update.yml`, **outside** the asar | `PublishManager.js:88-89` at `onAfterPack` |
| `Kanmer Setup <v>.exe` | `apps/gui/release/`, uploaded as `Kanmer-Setup-<v>.exe` | NSIS target |
| `Kanmer Setup <v>.exe.blockmap` | same, uploaded as `Kanmer-Setup-<v>.exe.blockmap` | `createBlockmap` |
| `latest.yml` (version, sha512, size, url, path) | `apps/gui/release/`, uploaded verbatim | `updateInfoBuilder.js:72-129` |
| `elevate.exe` | `resources/elevate.exe` (already there) | `CopyElevateHelper` |

Note the space→dash rename: `computeSafeArtifactNameIfNeeded`
(`platformPackager.js:690-703`) turns `Kanmer Setup 0.2.0.exe` into
`Kanmer-Setup-0.2.0.exe` for GitHub, and `updateInfoBuilder.js:100-107` writes
that same safe name into `latest.yml`'s `files[0].url` **and** the legacy `path`
field. `GitHubProvider.resolveFiles` independently replaces spaces with dashes.
The two agree, so this works — but it is why you must not hand-edit asset names
on the release page.

### How a release happens, end to end

```
1. bump apps/gui/package.json version   0.1.0 -> 0.2.0
   (root package.json version is independent; see Q3)
2. npm run dist                          # existing script: builds core, server, gui, then electron-builder --win
   -> apps/gui/release/{Kanmer Setup 0.2.0.exe, .exe.blockmap, latest.yml}
3. GH_TOKEN=<pat with repo scope> \
   npx electron-builder --win --publish always      (from apps/gui)
   -> creates GitHub release tagged v0.2.0 and uploads all three files
4. git tag v0.2.0 && git push --tags   (optional — GitHub creates the tag when
   the release is published; do it explicitly if you want the tag to point at a
   specific commit)
5. PUBLISH the release on github.com if it was created as a draft.
   Draft releases are invisible to the updater.
6. Installed 0.1.0 clients see it within one check interval.
```

`--publish always` is load-bearing when publishing from a dev machine:
`getOrCreateRelease` (`gitHubPublisher.js:100-107`) only creates a release when
`options.publish === "always"` **or** `getCiTag() != null`. On a laptop there is
no CI tag, so `onTag`/`onTagOrDraft` will silently not create anything.

`GH_TOKEN` never reaches the client. `app-update.yml` contains only
`{provider, owner, repo, updaterCacheDirName, …}` — `PublishManager.js:191-204`
builds it from the resolved publish config; the token is an env var read by the
*publisher*, not part of the config object.

---

## Findings by question

### 1. The dependency/bundling question

**The answer is: make it a real `dependency`, externalize it in Vite's main
build, and change nothing in `files:`.**

Three sub-answers, each verified:

**(a) Does `electron-updater` have to be in `dependencies`?**
It has to be *reachable at runtime*. Two mechanisms can achieve that — being
shipped as a node module, or being inlined into `out/main/index.js`. Only the
first is a supported path, because it is the only one electron-builder itself
participates in. Adding it to `dependencies` is what turns on
`NodeModulesCollector` for it: `collectNodeModulesWithLogging`
(`util/appFileCopier.js:173-200`) runs
`npm list -a --include prod --include optional --omit dev --json --long`
(`npmNodeModulesCollector.js:15-17`) across `[appDir, projectDir, workspaceRoot]`
— so **npm-workspace hoisting is handled**; the package will be resolved from the
repo-root `node_modules` and copied into the asar regardless of where npm put it.

**(b) Does `files:` need a `node_modules/electron-updater/**/*` entry?**
**No — verified twice.** In code: `getNodeModuleFileMatcher`
(`fileMatcher.js:177-219`) builds a *separate* matcher for production node
modules and its `addPatterns` helper only forwards patterns that start with `!`
when the config is an array of strings; our config has none. It then prepends
`**/*`. Empirically: `apps/gui/release/builder-debug.yml` already records
`nodeModuleFilePatterns: ['**/*', 'out/**/*', 'package.json']` — a set whose
first, everything-matching entry means every file of every collected production
module is included. (The trailing two entries are an artifact of the YAML array
being normalised to the object/`filter` form, visible in
`builder-effective-config.yaml`; they are harmless because `**/*` already
matches.) Meanwhile the *main* matcher gets `!**/node_modules/**` injected at
`fileMatcher.js:126-138`, which is why the current build ships no node_modules —
not because of the `files` list.

**(c) Can it just stay bundled by Vite?**
Probably, but do not. In its favour: every `require()` in electron-updater is a
*static string literal*, including the platform switch in `out/main.js`
(`require("./NsisUpdater")`, `require("./MacUpdater")`, …) and the one runtime
`require("electron").Notification` in `AppUpdater.checkForUpdatesAndNotify`. It
never reads its own `package.json` and never uses `__dirname` for anything
load-bearing — the only path magic is `process.resourcesPath` (for
`app-update.yml` and `elevate.exe`), which is a *runtime* path and therefore
bundling-neutral. Against it: the dependency closure is
`builder-util-runtime → debug + sax`, plus `fs-extra@10 → graceful-fs +
universalify + jsonfile`, `js-yaml@4`, `semver`, `lazy-val`,
`tiny-typed-emitter`, `lodash.isequal`, `lodash.escaperegexp`. `debug@4`'s
`node.js` wraps `require('supports-color')` in a try/catch, which Rollup's
CommonJS handling resolves eagerly; `js-yaml@4` ships a dual CJS/ESM build and
electron-vite sets `resolve.mainFields: ['module','jsnext:main','jsnext']`
(`lib-BmEkZIgk.mjs:263-266`), i.e. it prefers the ESM entry inside a CJS output.
None of this is *known* to break — it is simply unverified, and the failure mode
if it does break is the classic one: fine in dev, broken (or silently inert) in
the packaged app. The externalize path costs ~2 MB in a 77 MB installer and is
what every electron-vite + electron-builder template does. Take it.

**Why `external: [...]` and not `externalizeDepsPlugin()`:** functionally
identical *today* (one production dependency, so the plugin would externalize
exactly `electron-updater`). But the plugin's contract is "externalize whatever
is in `dependencies`", and this repo's whole build depends on the opposite
invariant — AGENTS.md §8 gotcha 1 explains that `gray-matter` must be bundled
into a CJS output or it throws `Dynamic require of "fs" is not supported`.
Leaving a plugin in place that would silently externalize the next thing someone
promotes is a trap in a repo that has already been bitten by exactly this class
of bug.

**Also add `!dev-app-update.yml` awareness:** the dev config file (Q6) lands at
`apps/gui/dev-app-update.yml` and is *already* excluded from the package by the
`files: [out/**/*, package.json]` allowlist. No action needed, but it should be
gitignored or committed deliberately, not accidentally.

### 2. Publishing

**Config.** Minimum viable `publish` block is in
[the architecture section](#what-changes). Options that exist in
`builder-util-runtime@9.7.0`'s `GithubOptions`
(`node_modules/builder-util-runtime/out/publishOptions.d.ts`):
`provider`, `repo`, `owner`, `vPrefixedTagName` (deprecated), `tagNamePrefix`,
`host`, `protocol`, `token`, `private`, `channel`, `releaseType`, plus the
inherited `publishAutoUpdate`, `requestHeaders`, `timeout`, `updaterCacheDirName`.
Note `tagNamePrefix` **does** exist in 26.15.3 — it is not a v27 addition.

**What a release must contain.** Exactly three files per platform/arch:

| File | Why | If missing |
|---|---|---|
| `latest.yml` | The channel file. The updater fetches `/releases/download/<tag>/latest.yml` first. | `ERR_UPDATER_CHANNEL_FILE_NOT_FOUND` (`GitHubProvider.js:120-124`) |
| `Kanmer-Setup-<v>.exe` | The installer, sha512-verified against `latest.yml` | download fails |
| `Kanmer-Setup-<v>.exe.blockmap` | Differential download | falls back to full download (Windows only — `NsisUpdater.js:171-176` returns `process.platform === "win32"`, i.e. non-Windows *throws*) |

Note the blockmap must exist on **both** the old and the new release:
`Provider.getBlockMapFiles` (`providers/Provider.js:22-26`) derives the old URL
by string-replacing the new version with the old version throughout the new
URL's pathname. With tag `v0.2.0` and asset `Kanmer-Setup-0.2.0.exe.blockmap`,
that yields `/releases/download/v0.1.0/Kanmer-Setup-0.1.0.exe.blockmap`. Delete
an old release's blockmap and every client on that version silently does a full
77 MB download. (`AppUpdater.js:678-699` caches the new blockmap as
`current.blockmap` in the updater cache dir, so on the *second* update the old
blockmap comes from disk rather than the network.)

**`GH_TOKEN` and `--publish`.** Token precedence is
`GITHUB_RELEASE_TOKEN` > `GH_TOKEN` / `GITHUB_TOKEN`. `--publish` accepts
`onTag | onTagOrDraft | always | never`; `PublishManager.js:63` computes
`isPublish = publish != null && publish !== "never" && (publish !== "onTag" || getCiTag() != null)`.
From a dev machine with no `CI_TAG`/`GITHUB_REF` tag, use `always`. Two more
publisher behaviours worth knowing (`gitHubPublisher.js:58-113`):
- The publisher **does not create a git tag**. It creates a *release* with
  `tag_name: v<version>`; GitHub materialises the tag when the release is
  published. This is why `--publish` works without pushing a tag first.
- It refuses to add assets to a **published** release older than **2 hours**
  ("existing release published more than 2 hours ago") unless
  `EP_GH_IGNORE_TIME=true`. Re-uploading a fix to yesterday's release needs that
  env var or a new version.
- `version` must not start with `v` (`gitHubPublisher.js:35-37` throws).

**Blockmap, concretely.** `buildBlockMap` chunks the installer and records
per-chunk sha; `FileWithEmbeddedBlockMapDifferentialDownloader` then issues HTTP
range requests for only the changed chunks, reusing the cached old
`installer.exe`. `configureDifferentialAwareArchiveOptions`
(`differentialUpdateInfoBuilder.js:32-59`) forces `dictSize: 1` MB and
`solid: false` inside the NSIS 7z payload specifically so that a small code
change invalidates few blocks — the code comment records 2% re-download at 1 MB
dict vs 52% at 64 MB. **Yes it works for `nsis`** (it is `nsis-web` that uses the
other, package-file path). For Kanmer specifically the win will be smaller than
typical: most of the 77 MB is the Electron runtime (unchanged between patch
releases, so those blocks are reused) but `resources/mcp/kanmer-mcp.cjs` and the
whole `app.asar` change on nearly every release. Expect meaningful but not
dramatic savings. `GitHubProvider` sets `isUseMultipleRangeRequest: false`
(`GitHubProvider.js:12-18`, comment: *"because GitHib uses S3"*), so it issues
sequential single-range requests rather than one multi-range request.

### 3. Versioning

**Which version wins.** `appInfo.version = info.metadata.version`
(`appInfo.js:29`) where `metadata` is the **app directory's** package.json —
i.e. `apps/gui/package.json`. The root `package.json`'s `version: "0.1.0"` is
irrelevant to the build and to the updater. `app.getVersion()` in the packaged
app reads the same value out of the asar's package.json (verified: the asar
package.json carries `"version": "0.1.0"`).

**What the tag must look like.** `v<version>` — `gitHubPublisher.js:38`
`this.tag = githubTagPrefix(info) + version`, and `githubTagPrefix` returns
`tagNamePrefix ?? (vPrefixedTagName === false ? "" : "v")`. So `0.2.0` → tag
`v0.2.0`. The updater does not require the tag to equal the version: it reads
the tag from `/releases/latest`'s `tag_name` (or the Atom feed href, matched by
`hrefRegExp = /\/tag\/(v?[^/]+)$/`), and then builds download URLs as
`/<owner>/<repo>/releases/download/<tag>/<file>`. But the **blockmap** old-URL
derivation *does* assume the version string appears in the URL, so keeping
tag == `v` + version is required for differential downloads to work.

**On mismatch.** Three distinct failure shapes:
- `latest.yml`'s `version` ≤ installed version → `update-not-available`
  (`AppUpdater.js:339-363`; `eq` short-circuits, then `gt`, then
  `allowDowngrade && lt`).
- Tag doesn't match the release the assets are on → 404 on `latest.yml` →
  `ERR_UPDATER_CHANNEL_FILE_NOT_FOUND`.
- `latest.yml`'s `version` is not valid semver → `ERR_UPDATER_INVALID_VERSION`.
- A **prerelease** version (`0.2.0-beta.1`) is excluded from `/releases/latest`
  by GitHub itself (verified against a live public repo: the endpoint returned
  `electron-builder@26.15.7` while `27.0.0-alpha.6` existed), so it is invisible
  unless the client sets `allowPrerelease` — which also flips `allowDowngrade`
  to true. Keep releases plain semver for now.

**Recommendation for the plan.** A single `scripts/release.mjs` (or an npm
`version` hook) that bumps `apps/gui/package.json` only, and leaves the root
private package at whatever it is. Optionally mirror the version into the root
for tidiness, but do not make anything depend on it. Also worth deciding: the
plugin bundle `plugins/kanmer/mcp/kanmer-mcp.cjs` is a committed artifact
(AGENTS.md §8 gotcha 8) and must be refreshed in the same commit as any release
that changes the server, or plugin users and app users diverge.

### 4. The update UX

**The API surface, from electron-updater 6.8.9's own source** (`AppUpdater.js`,
`BaseUpdater.js`, `NsisUpdater.js`):

Events: `checking-for-update`, `update-available(UpdateInfo)`,
`update-not-available(UpdateInfo)`, `download-progress(ProgressInfo)`,
`update-downloaded(UpdateDownloadedEvent)`, `update-cancelled(UpdateInfo)`,
`error(Error, message?)`, `login`, `appimage-filename-updated`.

Flags and their real defaults (`AppUpdater.js:103-150`):
`autoDownload = true`, `autoInstallOnAppQuit = true`, `autoRunAppAfterInstall = true`,
`allowPrerelease = false`, `allowDowngrade = false`, `disableWebInstaller = false`,
`disableDifferentialDownload = false`, `fullChangelog = false`.

**The three mechanics that determine the right shape for Kanmer:**

1. `autoInstallOnAppQuit` installs on Electron's **`quit`** event —
   `ElectronAppAdapter.onQuit` is `app.once("quit", …)` and
   `BaseUpdater.addQuitHandler` skips when `exitCode !== 0`. `quit` fires *after*
   `before-quit` and `will-quit`, so anything that cancels the quit (a
   `beforeunload` prompt, an `e.preventDefault()` in `before-quit`) prevents the
   install by construction. **This makes `autoInstallOnAppQuit: true` safe for
   the dirty-editor case for free.**
2. `quitAndInstall()` is **not** cancellable. `BaseUpdater.js:13-27` calls
   `this.install(...)` — which spawns the installer process — and only then
   `setImmediate(() => { …; this.app.quit(); })`. If the quit is then blocked,
   the installer is already running and will force-kill the app anyway (see
   Q7). Therefore: **never call `quitAndInstall()` from main without asking the
   renderer first.**
3. `quitAndInstall()`'s default is `isSilent = false`, and with
   `oneClick: false` a non-silent NSIS run shows the **full installer wizard**.
   For an "install now" button that should feel like a restart, call
   `quitAndInstall(true, true)` — silent install, then relaunch. (Note
   `BaseUpdater.js:15`: in non-silent mode the second argument is ignored in
   favour of `autoRunAppAfterInstall`.)

**Recommended shape.**

- **Main** owns an `updater.ts`:
  - Bail out entirely when `!app.isPackaged` or `process.env.KANMER_SMOKE` — the
    smoke boot must not make network calls, and `isUpdaterActive()` would refuse
    anyway (`AppUpdater.js:277-284`).
  - `autoUpdater.autoDownload = true`, `autoInstallOnAppQuit = true`,
    `disableWebInstaller = true`, `autoRunAppAfterInstall = true`.
  - `autoUpdater.logger` → a small wrapper writing to `console`/a file. Do **not**
    use `checkForUpdatesAndNotify()`: it fires its own raw
    `new Notification({title: "A new update is ready to install", body: "{appName} version…"})`
    (`AppUpdater.js:286-312`) using `app.getName()` — which is `@kanmer/gui`
    today. Use `checkForUpdates()` and drive Kanmer's own toast surface.
  - Check on a timer: once ~30 s after `whenReady()` (not at t=0 — it competes
    with `openProject`), then every 4–6 h. Kanmer is a long-lived window.
  - Forward events to the renderer over new `CH.updateStatus` /
    `CH.updateProgress` channels, mirroring the existing `CH.agentChange`
    pattern in `shared/ipc.ts:55-56`.
- **Renderer**:
  - `update-available` → a quiet toast in the existing stack
    (`App.tsx:754-770`): "Kanmer 0.2.0 is downloading".
  - `update-downloaded` → a persistent, dismissible banner/toast: "Update ready
    — Restart now / Later". "Later" is free: `autoInstallOnAppQuit` means the
    next normal quit installs it.
  - "Restart now" runs the **same guard the rest of the app uses**: if
    `editorDirty.current`, show a `ConfirmModal` ("Discard unsaved changes to
    `<id>` and restart to update?") exactly like `pendingProject`
    (`App.tsx:785-797`); only on confirm call `window.kanmer.installUpdate()`,
    which calls `quitAndInstall(true, true)`.
  - `error` → do not toast by default. A failed update check on a laptop that
    just went offline is not news. Surface it in the Help menu item's result and
    in the log.
- **Menu**: add "Check for Updates…" to the Help submenu
  (`main/index.ts:247-255`). A manual check should always report *something*
  ("You're up to date" / "Downloading 0.2.0…" / the error) — that is the one
  place errors are worth showing.
- **The agent-concurrency angle**: the updater never touches `.kanmer/`, so an
  agent writing files is not a correctness problem for the *update*. It is a
  problem for the *restart* — see Q7. Consider deferring the "Restart now"
  prompt while `ownWrites`/recent `agentChange` activity is hot, or at least
  wording it as "Kanmer will close — an agent may be mid-write".

**Do not call `setFeedURL`.** electron-builder generates `app-update.yml`; the
docs say so explicitly and `AppUpdater.loadUpdateConfig` reads it from
`process.resourcesPath` automatically.

### 5. Code signing

Full treatment in [its own section](#what-signing-would-take-and-what-breaks-without-it).
Short answers to the three questions asked:

- **Does unsigned NSIS auto-update work?** Yes, today.
  `NsisUpdater.verifySignature` (`NsisUpdater.js:88-104`) reads `publisherName`
  from `app-update.yml` and `return null` — i.e. *verification passed* — when it
  is absent, and also when `app-update.yml` itself is `ENOENT`. `publisherName`
  is only populated when a signing cert exists
  (`PublishManager.js:196-203`: `winPackager.isForceCodeSigningVerification ?
  computedPublisherName : undefined`). So no cert → no `publisherName` → no
  verification → the update installs.
- **What is `signtool.exe` doing in the build log?**
  `signWindows` (`codeSign/windowsCodeSign.js:5-16`) logs
  **`"signing with signtool.exe"` at INFO level unconditionally**, *before*
  looking for a certificate. It then calls `signFile`, which finds `cscInfo == null`,
  logs `"no signing info identified, signing is skipped"` at **debug** level, and
  returns `false`. So the log line is a lie of omission: nothing was signed and
  `signtool.exe` was never executed. Corroborated on this machine: the
  electron-builder cache (`%LOCALAPPDATA%\electron-builder\Cache`) contains only
  `7zip@1.0.0`, `nsis-3.0.4.1`, `nsis-resources-3.4.1` — **no `winCodeSign`
  entry**, which is the download that would contain `signtool.exe`. (Resource
  editing in 26.x uses the pure-JS `resedit` via `editWindowsResources`, not the
  old rcedit binary, so nothing else pulls that toolset in either.)
- **What would signing cost/require?** See the section below.

### 6. Testing an updater

**Without publishing anything (fast loop, dev mode).**
`AppUpdater.appUpdateConfigPath` is
`isPackaged ? resourcesPath/app-update.yml : join(app.getAppPath(), "dev-app-update.yml")`
(`ElectronAppAdapter.js:22-24`). Under `electron-vite dev`, `app.getAppPath()`
is `apps/gui`, so the file goes at **`apps/gui/dev-app-update.yml`**. Combined
with `autoUpdater.forceDevUpdateConfig = true` (which is what makes
`isUpdaterActive()` return true when `!app.isPackaged`,
`AppUpdater.js:277-284`), you can exercise the whole event flow without
packaging. Note the dev-run caveat from AGENTS.md §6/§11: you will need
`--user-data-dir=<fresh dir>`.

Two useful `dev-app-update.yml` shapes:
```yaml
# a) point at the real GitHub releases
provider: github
owner: collisionengineers
repo: kanmer
```
```yaml
# b) point at a local static server (fastest iteration)
provider: generic
url: http://localhost:8080
```
For (b), serve a directory containing a hand-written `latest.yml` plus a real
installer + blockmap (`npx http-server` or `python -m http.server`). The
`generic` provider fetches `<url>/latest.yml` directly — no Atom feed, no
`/releases/latest`, so it is much easier to script. `latest.yml` needs
`version`, `files: [{url, sha512, size}]`, `path`, `sha512`, `releaseDate`;
copy the shape electron-builder emits once you have one real build.

**With packaging but without GitHub (highest-fidelity, still local).**
Temporarily add `publish: {provider: generic, url: http://localhost:8080}` to
`electron-builder.yml`, build 0.2.0, serve `apps/gui/release/`, and install
0.1.0. This exercises the real `app-update.yml`, the real NSIS `--updated /S`
install path, the real process-kill, and the real blockmap logic. **This is the
test that catches the bundling/packaging failure mode**, and it is the one that
must be run before shipping.

**What can be automated.**
- Unit: pure helpers only — a version-compare/"should we prompt" function, and
  the dirty-gate decision. Put them in `renderer/src/lib/` per AGENTS.md §7 so
  vitest actually covers them, taking `now` as an argument.
- Integration-ish: a script that spins up `http.server` over a fixture dir and
  asserts `checkForUpdates()` resolves with `isUpdateAvailable: true` under
  `forceDevUpdateConfig`. Doable headlessly with an `ELECTRON_RUN_AS_NODE`-style
  harness, or as an extra mode of the existing `KANMER_SMOKE` boot.
- The `latest.yml` ↔ artifact-name agreement (spaces vs dashes) is checkable in
  CI-less form: after `npm run dist`, assert that `latest.yml`'s `files[0].url`
  names a file that exists in `release/`.

**What genuinely needs two real installs.** The install-over-running-app
behaviour, the NSIS process kill (including the MCP child), the
`allowToChangeInstallationDirectory` interaction, the differential download
against real GitHub range requests, and SmartScreen. Budget one manual
two-version cycle per release-process change. Extend AGENTS.md §10's checklist
with an updater step.

**Staged rollout, if wanted later.** Hand-edit `stagingPercentage: 10` into a
published `latest.yml`. `AppUpdater.isStagingMatch` (`:314-331`) hashes a
persisted per-user staging id against it. To pull a bad staged release you must
ship a *higher* version — you cannot un-publish your way out.

### 7. Failure modes and gotchas specific to this setup

**The MCP server child process is `Kanmer.exe` inside the install directory.**
This is the big one and it is specific to Kanmer. `connect.ts:47` registers
`command = process.execPath` = `%LOCALAPPDATA%\Programs\Kanmer\Kanmer.exe`, run
with `ELECTRON_RUN_AS_NODE=1`, and codex/Claude spawn that as a long-lived child
for the duration of an agent session. Now read what the installer does
(`templates/nsis/include/allowOnlyOneInstallerInstance.nsh:79-101`, the
PowerShell branch, which is the branch that runs on any modern Windows):
```powershell
Get-CimInstance -ClassName Win32_Process |
  ? { $_.Path -and $_.Path.StartsWith('$INSTDIR','CurrentCultureIgnoreCase') } |
  % { Stop-Process -Id $_.ProcessId -Force }
```
It kills by **path prefix**, not by image name. The MCP server process matches.
So an auto-update installs by force-killing the agent's MCP server mid-session.
The agent host sees its stdio transport die. `_CHECK_APP_RUNNING` (`:105-165`)
does this without any prompt when `${isUpdated}` is set — which electron-updater
always sets via `--updated` (`NsisUpdater.js:113`). After two failed kill
rounds it shows `appCannotBeClosed` and `Quit`s, which is how an update can
abort halfway.

**The registered MCP command path is absolute.** `allowToChangeInstallationDirectory: true`
means a user *can* move the install during an update (the `/D=` arg is only
passed when `installDirectory` is set, so electron-updater's silent update keeps
the current dir — but a manual re-install can move it). Every project's
`.mcp.json` / codex entry then points at a path that no longer exists.
Mitigation to consider in the plan: after an update, re-run the registration for
recent projects, or detect a stale path and offer "Reconnect".

**`extraResources` churn.** `resources/mcp/kanmer-mcp.cjs` is replaced wholesale
by each install — it is inside `$INSTDIR`, which NSIS's `extractAppPackage`
overwrites. No partial-state risk, but it means the agent's next MCP spawn after
an update runs the new server against a `.kanmer/` that may have been written by
the old one. Since the store format is versioned (`version.json`) and reads
handle both formats, this is safe today; it becomes a real constraint the day a
format 3 lands.

**Update-while-agent-is-writing.** The updater itself is inert with respect to
`.kanmer/`. The hazard is only the restart. `writeFileAtomic` (temp + rename)
means a killed writer cannot leave a half file, and `writeFileExclusive` means a
killed creator cannot leave a half-claimed id — the store is crash-safe by
construction (AGENTS.md §7, §11). So the worst case is a lost in-flight write,
not corruption. Still worth wording the restart prompt honestly.

**Unsigned + SmartScreen.** Every downloaded `Kanmer-Setup-x.y.z.exe` is a fresh
unknown binary. On a *manual* download the user gets "Windows protected your
PC → More info → Run anyway". On an **auto-update the installer is spawned by a
process the user already trusts, not by the browser**, so it carries no
Mark-of-the-Web and SmartScreen's file-reputation check does not gate it — this
is a real, underappreciated advantage of auto-update: the friction is paid once,
on first install. UAC is also not involved: `perMachine: false` +
`requestedExecutionLevel: asInvoker` (default) + a per-user install dir.

**`perMachine: false` + Program Files.** If a user used
`allowToChangeInstallationDirectory` to install into `C:\Program Files\Kanmer`,
the per-user installer will need elevation to overwrite it.
`updateInfo.isAdminRightsRequired` is only set when `isPerMachine`
(`NsisTarget.js:311`), so it stays false and electron-updater spawns the
installer unelevated; on `UNKNOWN`/`EACCES` it retries via
`resources/elevate.exe` (`NsisUpdater.js:132-152`), which triggers a UAC prompt
out of nowhere. On `ENOENT` it falls back to `shell.openPath`. This path works
but is ugly; the plan should at minimum log it.

**The `%LOCALAPPDATA%\@kanmergui-updater` name.** Cosmetic but user-visible, and
it is the same scoped-name root cause as the userData path. `updaterCacheDirName`
is computed from `metadata.name` and then **overwritten** by `PublishManager.js`
onto whatever you put in the publish config, so it cannot be configured away —
the only fix is renaming the package (see Open questions).

**A stale/partial install already exists on this machine** — the installed
`%LOCALAPPDATA%\Programs\Kanmer` has no `resources/` and no `locales/`. Whatever
produced that (the `EBUSY` failure) is a live risk for updates too, because the
same overwrite happens unattended. Reproducing and understanding it is worth a
plan step.

**Rollback.** There is none, in the sense of an automatic revert.
`allowDowngrade` is false by default, so shipping `0.2.1` that is actually
`0.2.0`'s code is the standard remedy; publishing a *lower* version does nothing.
The safety net that does exist: `%LOCALAPPDATA%\@kanmergui-updater\installer.exe`
is the previously-installed installer, so a user can always re-run it manually
to go back one version. Worth documenting in the README.

### 8. Alternatives

**`electron-updater` vs Electron's built-in `autoUpdater` + `update.electronjs.org`.**
Electron's built-in `autoUpdater` on Windows *is* Squirrel.Windows — it has no
NSIS backend. `update.electronjs.org`'s README lists its requirements as: public
GitHub repo, releases on GitHub Releases, code-signed builds, and macOS +
Windows only, with Windows support meaning **Squirrel.Windows** (or MSIX on
Electron 41+, and we are on 31). Adopting it would mean abandoning NSIS, hence
abandoning `allowToChangeInstallationDirectory`, the assisted installer, and the
existing installed base. Rejected: the free hosted service is genuinely nice, but
it is not compatible with the installer we ship, and electron-builder's own
GitHub provider needs no server at all for a public repo.

**NSIS vs Squirrel.Windows.** Squirrel.Windows installs into
`%LOCALAPPDATA%\<AppName>` with no choice of directory, uses a stub exe +
versioned `app-x.y.z` folders, and updates by downloading `.nupkg` deltas
against a `RELEASES` file. It is genuinely simpler to auto-update and it is what
`update.electronjs.org` speaks. But electron-builder's own docs list it as
**not supported** for auto-update on their side, it produces a noticeably worse
first-install experience, and it would strand every existing Kanmer install.
Rejected.

**MSI / AppX(MSIX).** MSI has no electron-updater support at all
(electron-builder issue #3322 asks exactly this; the answer is no). AppX/MSIX
*can* be updater-aware (`isSuitableWindowsTarget` accepts `appx` with
`electronUpdaterAware: true`, `PublishManager.js:391-396`) and MSIX would get
proper Store-grade signing and clean install/uninstall semantics — but it
requires signing to install *at all*, sandboxes the app in ways that would fight
the "read and write arbitrary project folders" model, and is a much larger
change than this task warrants. Rejected for now; revisit only if Store
distribution ever becomes a goal.

**A `generic` provider on our own static host** (S3/Netlify/GitHub Pages).
Cheaper to reason about (one `latest.yml` at a fixed URL, no Atom feed, no
draft-vs-published trap, real multi-range requests), but it means owning
hosting and a publish step outside electron-builder's `--publish`. Keep it in the
back pocket as the **testing** transport (Q6) rather than production.

---

## Risks and failure modes

Ranked by expected damage × likelihood.

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Auto-update kills the agent's MCP server mid-session.** The NSIS installer stops every process whose path is under `$INSTDIR`, and the MCP server *is* `Kanmer.exe` there. | Never auto-install without user action while the app is open (rely on `autoInstallOnAppQuit`, which needs a real quit). Word the "Restart now" prompt to say agent sessions will be interrupted. Consider surfacing "an agent is connected" state. Long-term: ship the MCP server as a separate small binary, or register a launcher shim path that survives updates. |
| 2 | **Works in dev, dead in the packaged app** (or vice versa) because `electron-updater` isn't actually present at runtime. | `dependencies` + `external: ["electron-updater"]` (both, together). Verify with a real packaged two-version test against a local `generic` server *before* the first GitHub release. Add a hard assertion to the boot smoke: in a packaged build, `require.resolve("electron-updater")` must succeed and `resources/app-update.yml` must exist. |
| 3 | **Release published as a draft → nothing ever updates, silently.** `releaseType` defaults to `draft`; `GitHubProvider` reads `/releases/latest` and `releases.atom`, neither of which lists drafts. | Set `releaseType: release` explicitly, and make "the release is published" an explicit step in the release checklist. A one-line `curl -H 'Accept: application/json' https://github.com/collisionengineers/kanmer/releases/latest` post-publish check proves it. |
| 4 | **`quitAndInstall()` called with a dirty editor.** It is not cancellable — the installer is spawned before `app.quit()` and will force-kill the app regardless. | Gate in the renderer with the existing `editorDirty` + `ConfirmModal` pattern. IPC handler in main must be the *only* caller and must be reachable only from that confirmed path. |
| 5 | **`EBUSY` / partial install** — already observed once on this machine (installed dir is missing `resources/` and `locales/`). | Reproduce deliberately. Ensure the app fully exits (watcher closed at `main/index.ts:549-551`) before the installer runs; that is what `autoInstallOnAppQuit` gives you. Test the case where a second Kanmer window or an MCP child is running. |
| 6 | **Old blockmaps deleted → every client full-downloads 77 MB.** | Never delete assets from old releases. Add it to the release checklist. `disableDifferentialDownload` is *not* the answer; the fallback already happens automatically on Windows. |
| 7 | **The registered MCP command path goes stale** after an install-directory change. | Detect at startup: if `readSettings().recentProjects` exist and the recorded MCP command path ≠ `process.execPath`, offer a one-click re-Connect. |
| 8 | **Signing fail-closed lands in a future electron-updater.** PR #10056 (merged 2026-08-12) adds a deprecation warning today and states v28 will reject unverifiable updates. | Pin `electron-updater` (not `^`-drift blindly), read release notes on bumps, and treat "get a signing story" as a scheduled item, not a someday. |
| 9 | **Publishing from a laptop.** No CI means the release depends on one machine's toolchain, and a mis-set `GH_TOKEN` or a stale `plugins/kanmer/mcp/kanmer-mcp.cjs` ships silently. | A single `npm run release` script that runs `npm run build && npm run plugin:build && npm run plugin:check && npm test` before it will publish anything. A GitHub Actions workflow is the real fix and is a small file; consider it in the plan. |
| 10 | **Update check noise on a flaky network.** `error` fires for every failed check. | Do not toast `error` on automatic checks; only on user-initiated ones. |

---

## What signing would take, and what breaks without it

**Nothing *breaks* today. That is the accurate statement.** The precise
behaviours:

| Surface | Unsigned today | Notes |
|---|---|---|
| electron-updater signature check | **Skipped, silently, and the update installs.** | `NsisUpdater.verifySignature` returns `null` when `publisherName` is absent from `app-update.yml`, and `publisherName` is only written when a cert exists. |
| electron-builder build | Logs `signing with signtool.exe` at INFO, then skips at debug. No signtool download, no invocation. | `windowsCodeSign.js:5-16`; verified by the absence of a `winCodeSign` entry in this machine's electron-builder cache. |
| SmartScreen on first install (browser download) | "Windows protected your PC" → More info → Run anyway. | This is the friction the user actually experiences. |
| SmartScreen on auto-update | Effectively none — the installer is spawned by an already-trusted process, with no Mark-of-the-Web. | The main practical argument that auto-update *reduces* the cost of being unsigned. |
| Enterprise / managed machines | May block unsigned installers outright (AppLocker, WDAC, Smart App Control). | Not a concern for the current audience. |
| Antivirus false positives | Elevated for unsigned Electron installers; AGENTS.md §8 gotcha 6 already records Defender interfering with the build. | Signing measurably reduces this. |

**The thing that changes the calculus:** electron-builder PR
[#10056](https://github.com/electron-userland/electron-builder/pull/10056),
merged to `master` on **2026-08-12**, adds a loud deprecation warning when
electron-updater skips verification because `app-update.yml` has no
`publisherName`, and states plainly: *"this fail-open behavior is deprecated,
electron-builder v28 will fail closed."* It is **not** in electron-updater 6.8.9
(published 2026-06-05) or electron-builder 26.15.7, so we have time — but
"unsigned auto-update" has a stated expiry date. Pin versions and watch release
notes.

**Options, with current facts** (from Microsoft's own
[Code signing options for Windows app developers](https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options)):

| Option | Cost | Availability | SmartScreen | Fit for Kanmer |
|---|---|---|---|---|
| **Azure Artifact Signing** (formerly Trusted Signing) | **~$9.99/month** | Orgs: US, Canada, EU, UK (+ AU, NZ, JP, KR, SG, CH, NO, IL for Public Trust per the quickstart). **Individuals: US and Canada only.** Orgs need a *verifiable 3-year history*; identity validation takes days and a trial Azure subscription will 403. | Reputation builds over time — **no instant trust** | Cheapest real option. electron-builder 26 supports it natively via `win.azureSignOptions` (`options/winOptions.d.ts:28-32`), no HSM/USB token, works from CI. Blocked if the publisher is an individual outside US/CA or a company under 3 years old. |
| **OV certificate** (DigiCert, Sectigo, …) | **$150–300/year** | Worldwide | Same reputation model as above | The fallback when Azure Artifact Signing is unavailable. Since the 2023 CA/B baseline change, OV keys must live on an HSM or token, which complicates unattended CI signing. |
| **EV certificate** | **$400+/year** | Worldwide | **Same as OV since 2024 — the instant-SmartScreen-bypass is gone.** | No longer worth the premium for this purpose. Microsoft's own doc says "No longer recommended specifically for SmartScreen bypass." |
| **Self-signed** | Free | — | **Blocks installation for public users** | Useless for distribution. Only meaningful if you want to *test* the `publisherName` verification path end to end — which is actually a good reason to make one temporarily. |
| **No signature** (status quo) | Free | — | Warning on manual download; nothing on auto-update | Where we are. Defensible for a developer-audience tool distributed via GitHub. |

**What implementing signing would touch:** add `win.azureSignOptions` (or
`win.signtoolOptions.certificateFile` + `WIN_CSC_KEY_PASSWORD`) to
`electron-builder.yml`; secrets management for the release machine or CI; and
one consequence to be aware of — once signing is on, `publisherName` lands in
`app-update.yml`, which turns **on** update signature verification for all
future clients. Changing certificate subject later then breaks updates for
everyone on the old build unless `publisherName` is set to an array covering
both. Plan the first signed release carefully; it is a one-way door.

---

## Version drift: the docs site is ahead of what we pin

`https://www.electron.build/docs/features/auto-update` currently documents
**electron-builder 27** (it says so: *"Since electron-builder 27 the generated
`latest*.yml` targets the modern `files[]` metadata format by default"*), and
27.x is still `alpha` as of 2026-08-13 (latest stable is 26.15.7). Things on
that page that **do not exist** in what we pin:

- `autoInstallEvent: "manual" | "onQuit" | "onNextLaunch"` — not in
  electron-updater 6.8.9's `AppUpdater`. Use `autoInstallOnAppQuit` +
  `quitAndInstall`.
- `installPendingUpdateIfAvailable()` — not in 6.8.9.
- The `files[]`-only metadata default. In 26.15.3,
  `electronUpdaterCompatibility` defaults to `">=2.15"`
  (`updateInfoBuilder.js:85`), which resolves `isElectronUpdater1xCompatibility`
  to `false`, so no legacy `sha2` is written — but `path` **is** still written
  for the GitHub provider (`:99-107`). Fine either way; just don't expect the
  page's exact output.

Things the page gets right for 26.x: `dev-app-update.yml` +
`forceDevUpdateConfig`, staged rollouts via `stagingPercentage`, "do not call
`setFeedURL`", NSIS-only on Windows, and macOS requiring signing.

Where a source and the code disagree, this document follows the code in
`node_modules/` on this machine.

---

## Open questions for the plan

1. **Rename `@kanmer/gui` → `kanmer` (or add `productName` to the shipped
   package.json)?**
   *For:* fixes three things at once — `%APPDATA%\@kanmer\gui` → `%APPDATA%\Kanmer`,
   `%LOCALAPPDATA%\@kanmergui-updater` → `kanmer-updater`, and the from-source
   launch bug in AGENTS.md §11. *Against:* it **moves every existing user's
   settings** (`settings.json`, recentProjects, window bounds) to a new path with
   no migration, and it changes the workspace package name that
   `npm run -w @kanmer/gui` and the root scripts reference. This is a product
   decision, exactly as §11 says — but note it is now *also* an updater decision,
   and the cheapest moment to take it is the same release that introduces the
   updater. If taken, add a one-time settings migration in `settings.ts`.
   If not taken, at minimum fix the wrong claim in AGENTS.md §11.
2. **Check cadence and first-check delay.** 4 h? 6 h? Only on launch? Kanmer
   windows stay open for days, so launch-only checking would rarely fire. No
   strong evidence either way; pick something and make it a constant.
3. **Should "Later" be sticky per version?** i.e. a "skip 0.2.0" that persists in
   `settings.ts`. Adds a settings field and a comparison; the alternative is
   re-prompting on every launch until they restart. Leaning: no skip, but do not
   re-toast within a session once dismissed.
4. **`releaseType: release` vs `draft` + manual publish.** `release` is one less
   step and one less silent-failure mode; `draft` gives a chance to write release
   notes and sanity-check assets before anyone downloads. Recommend `draft`
   during the first few releases (with "publish the release" as an explicit,
   checked step), then `release` once the process is boring.
5. **CI or not.** A ~30-line GitHub Actions workflow on tag push would remove the
   "it built on Alex's laptop" class of risk and make `--publish onTag` work as
   designed. Out of scope for the updater itself, but the updater is what makes
   the release process load-bearing. Flag it; do not necessarily do it now.
6. **Release notes source.** `resolveReleaseBody` (`PublishManager.js:170-190`)
   reads `releaseInfo.releaseNotes`, then `releaseInfo.releaseNotesFile`, then
   `release-notes.md` in the project dir. The updater surfaces `releaseNotes` in
   `UpdateInfo`. Do we want to show them in the update toast? Cheap if we adopt
   `apps/gui/release-notes.md` as a convention.
7. **Does anything need to stop the updater during an active agent session?**
   There is no signal today for "an agent is connected" — the MCP server is a
   separate process the GUI never talks to. `ownWrites`/`agentChange` recency is
   the only proxy. Worth deciding whether that proxy is good enough to gate a
   restart prompt on, or whether it is over-engineering.

---

## Sources

**This repository (all line numbers verified 2026-08-13)**
- `apps/gui/package.json`, `apps/gui/electron-builder.yml`,
  `apps/gui/electron.vite.config.ts`
- `apps/gui/src/main/index.ts`, `apps/gui/src/main/connect.ts`,
  `apps/gui/src/shared/ipc.ts`
- `apps/gui/src/renderer/src/App.tsx`, `apps/gui/src/renderer/src/components/Editor.tsx`
- `apps/gui/release/builder-debug.yml`, `apps/gui/release/builder-effective-config.yaml`
- `AGENTS.md` §6, §7, §8 (gotchas 1, 5, 6, 8), §10, §11
- On-disk: `%LOCALAPPDATA%\Programs\Kanmer`, `%LOCALAPPDATA%\@kanmergui-updater`,
  `%APPDATA%\@kanmer\gui`, `%LOCALAPPDATA%\electron-builder\Cache`

**electron-builder 26.15.3 / app-builder-lib 26.15.3 (read from `node_modules`)**
- `out/publish/PublishManager.js` — `app-update.yml`, publish-config resolution,
  `isSuitableWindowsTarget`, `getPublishConfigsForUpdateInfo`
- `out/publish/updateInfoBuilder.js` — `latest.yml` generation,
  `electronUpdaterCompatibility`
- `out/fileMatcher.js` — main vs node-module matchers
- `out/util/appFileCopier.js`, `out/node-module-collector/*` — production dep collection
- `out/targets/nsis/NsisTarget.js`, `out/targets/nsis/nsisUtil.js`,
  `out/targets/differentialUpdateInfoBuilder.js`
- `templates/nsis/include/allowOnlyOneInstallerInstance.nsh`,
  `templates/nsis/include/installer.nsh`
- `out/appInfo.js`, `out/winPackager.js`, `out/codeSign/windowsCodeSign.js`,
  `out/codeSign/windowsSignToolManager.js`, `out/toolsets/windows.js`,
  `out/options/winOptions.d.ts`
- `node_modules/builder-util-runtime/out/publishOptions.d.ts` (v9.7.0)
- `node_modules/electron-publish/out/gitHubPublisher.js`

**electron-updater 6.8.9 (read from the published tarball)**
- [`out/main.js`](https://unpkg.com/electron-updater@6.8.9/out/main.js)
- [`out/AppUpdater.js`](https://unpkg.com/electron-updater@6.8.9/out/AppUpdater.js)
- [`out/BaseUpdater.js`](https://unpkg.com/electron-updater@6.8.9/out/BaseUpdater.js)
- [`out/NsisUpdater.js`](https://unpkg.com/electron-updater@6.8.9/out/NsisUpdater.js)
- [`out/ElectronAppAdapter.js`](https://unpkg.com/electron-updater@6.8.9/out/ElectronAppAdapter.js)
- [`out/providers/Provider.js`](https://unpkg.com/electron-updater@6.8.9/out/providers/Provider.js)
- [`out/providers/GitHubProvider.js`](https://unpkg.com/electron-updater@6.8.9/out/providers/GitHubProvider.js)

**electron-vite 2.3.0 (read from `node_modules`)**
- `dist/index.mjs` (`externalizeDepsPlugin`), `dist/chunks/lib-BmEkZIgk.mjs`
  (main/preload default configs)
- [electron-vite: Dependency handling](https://electron-vite.org/guide/dependency-handling)
  — note this documents the current major, where deps are externalized by
  default; **2.3.0 does not do that**.

**Official documentation**
- [electron-builder: Auto Update](https://www.electron.build/docs/features/auto-update)
- [electron-builder: Publish](https://www.electron.build/docs/publish)
- [Electron: Updating Applications](https://www.electronjs.org/docs/latest/tutorial/updates)
- [update.electronjs.org README](https://github.com/electron/update.electronjs.org)
- [Microsoft: Code signing options for Windows app developers](https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options)
- [Microsoft: Artifact Signing (formerly Trusted Signing) — quickstart & prerequisites](https://learn.microsoft.com/azure/artifact-signing/quickstart)
- [Microsoft: Artifact Signing FAQ](https://learn.microsoft.com/azure/artifact-signing/faq)

**Issue tracker / PRs**
- [electron-builder PR #10056 — warn on skipped update signature verification;
  v28 will fail closed](https://github.com/electron-userland/electron-builder/pull/10056)
  (merged 2026-08-12)
- [#3322 — Does MSI work with auto-update?](https://github.com/electron-userland/electron-builder/issues/3322)
- [#8116 — extra `v` added to url when fetching blockmap](https://github.com/electron-userland/electron-builder/issues/8116)
- [#6399 / #4736 — Cannot parse blockmap, fallback to full download](https://github.com/electron-userland/electron-builder/issues/6399)
- [#7338 — autoUpdater is undefined on dynamic import](https://github.com/electron-userland/electron-builder/issues/7338)
- [#8276 — Support for Azure Trusted Signing](https://github.com/electron-userland/electron-builder/issues/8276)

**Live checks performed**
- `GET https://github.com/electron-userland/electron-builder/releases/latest`
  with `Accept: application/json` → returned `tag_name: electron-builder@26.15.7`
  while `27.0.0-alpha.6` existed, confirming prereleases (and drafts) are excluded.
- `GET https://github.com/electron-userland/electron-builder/releases.atom` →
  confirmed the feed shape and `/tag/<name>` href format the provider parses.
- `npm view electron-updater versions/time`, `npm view electron-builder versions`
  → 6.8.9 stable (2026-06-05), 7.0.0-alpha.5; 26.15.7 stable, 27.0.0-alpha.6.
- `npm list --omit dev --json` from the repo root → `@kanmer/gui` has zero
  production dependencies.
