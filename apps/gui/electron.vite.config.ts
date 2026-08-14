import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

// Bundle everything (core + gray-matter + chokidar + yaml + zod) EXCEPT
// `electron-updater` into the main and preload outputs. electron-vite builds
// these as CJS via Rollup, which handles gray-matter's require() correctly.
// `electron` and node builtins stay external automatically.
//
// electron-updater is externalized deliberately and shipped as a real
// production dependency inside the asar (electron-builder's
// NodeModulesCollector packs `dependencies`, so `files:` needs no entry for
// it). Do NOT replace this with `externalizeDepsPlugin()`: that externalizes
// every future `dependencies` entry, and gray-matter must stay bundled in the
// CJS main output (AGENTS.md §8 gotcha 1).
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/main/index.ts"),
        external: ["electron-updater"],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: { input: resolve(__dirname, "src/preload/index.ts") },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    plugins: [react()],
    build: {
      rollupOptions: { input: resolve(__dirname, "src/renderer/index.html") },
    },
  },
});
