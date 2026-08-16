# 1.1 The dependency

**File:** `apps/gui/package.json`, `package-lock.json`

Add above `devDependencies`:

```json
"dependencies": {
  "electron-updater": "^6.8.9"
},
```

Then `npm install` from the **repo root** (workspaces). This adds `node_modules/electron-updater` plus its closure (`builder-util-runtime` and `lazy-val` are already hoisted from electron-builder) and updates the `"apps/gui"` entry in `package-lock.json`. **Commit the lockfile.**

**Verify:** `npm ls electron-updater` resolves; `node -e "console.log(require.resolve('electron-updater'))"` prints a path.
