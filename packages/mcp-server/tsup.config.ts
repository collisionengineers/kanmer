import { defineConfig } from "tsup";
import { versionDefine } from "./version-define.mjs";

export default defineConfig({
  entry: ["src/index.ts", "src/http.ts", "src/http-cli.ts"],
  format: ["esm"],
  clean: true,
  sourcemap: true,
  target: "node20",
  // Keep dependencies (incl. @kanmer/core and CJS libs like gray-matter)
  // external so Node loads them from node_modules with normal CJS interop.
  banner: { js: "#!/usr/bin/env node" },
  // The release version, for get_status's server identity (MCP-012). Same
  // source as the standalone build's, so both shapes report the same release.
  define: versionDefine(),
  // ESM has no __filename, and identity.ts needs the running script's own path
  // in order to hash it. tsup injects the fileURLToPath(import.meta.url) shim.
  // Deliberately NOT set on tsup.standalone.config.ts: CJS has __filename
  // natively, and that config's output is compared byte-for-byte by
  // scripts/check-plugin-sync.mjs, so it gains nothing it does not need.
  shims: true,
});
