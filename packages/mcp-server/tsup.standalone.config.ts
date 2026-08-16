import { defineConfig } from "tsup";
import { versionDefine } from "./version-define.mjs";

/**
 * Self-contained CJS build for shipping inside the packaged desktop app.
 * Everything (core + gray-matter + chokidar + zod + the MCP SDK) is bundled
 * into one file, so it can run via `Kanmer.exe <file>` with ELECTRON_RUN_AS_NODE=1
 * and needs no node_modules on the target machine. CJS avoids the ESM
 * dynamic-require issue that gray-matter hits when inlined.
 *
 * **This config decides the bytes `scripts/check-plugin-sync.mjs` compares.**
 * The committed `plugins/kanmer/mcp/kanmer-mcp.cjs` is hashed against a fresh
 * build of this output, so nothing non-deterministic may enter here. The single
 * build-time input is `versionDefine()`, which is a pure function of the source
 * tree and moves once per release — see the note in `version-define.mjs`.
 *
 * No `shims`: CJS has `__filename` natively, which is all `identity.ts` needs.
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
  define: versionDefine(),
});
