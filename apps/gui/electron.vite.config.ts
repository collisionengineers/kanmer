import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

// Bundle everything (core + gray-matter + chokidar + yaml + zod) into the main
// and preload outputs. electron-vite builds these as CJS via Rollup, which
// handles gray-matter's require() correctly — so the packaged app ships only
// `out/**` and needs no node_modules. `electron` and node builtins stay
// external automatically.
export default defineConfig({
  main: {
    build: {
      rollupOptions: { input: resolve(__dirname, "src/main/index.ts") },
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
