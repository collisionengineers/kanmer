# 1.2 The Vite external

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
