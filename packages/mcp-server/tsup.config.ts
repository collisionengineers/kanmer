import { defineConfig } from "tsup";
import { versionDefine } from "./version-define.mjs";

export default defineConfig({
  entry: ["src/index.ts", "src/http.ts", "src/http-cli.ts", "src/remote-token-cli.ts", "src/project-identity.ts", "src/remote-cli.ts", "src/remote-host.ts", "src/tunnels/cloudflared-config.ts", "src/tunnels/cloudflared.ts", "src/tunnels/supervisor.ts"],
  format: ["esm"],
  // The stdio entry self-reports its own path/hash and discovers bundled
  // skills relative to that entry. Keep every ESM entry self-contained: a
  // shared chunk would make `__filename` name that generated chunk instead of
  // the spawned dist/index.js command.
  splitting: false,
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
