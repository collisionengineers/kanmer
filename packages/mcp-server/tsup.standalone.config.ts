import { defineConfig } from "tsup";

/**
 * Self-contained CJS build for shipping inside the packaged desktop app.
 * Everything (core + gray-matter + chokidar + zod + the MCP SDK) is bundled
 * into one file, so it can run via `Kanmer.exe <file>` with ELECTRON_RUN_AS_NODE=1
 * and needs no node_modules on the target machine. CJS avoids the ESM
 * dynamic-require issue that gray-matter hits when inlined.
 */
export default defineConfig({
  entry: { "kanmer-mcp": "src/index.ts" },
  outDir: "dist/standalone",
  format: ["cjs"],
  clean: true,
  sourcemap: false,
  target: "node20",
  noExternal: [/.*/], // bundle everything
  platform: "node",
});
