# 6.1 `scripts/release.mjs`

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
