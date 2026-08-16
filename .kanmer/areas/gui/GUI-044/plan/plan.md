# 1.5 The packaging check script

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
