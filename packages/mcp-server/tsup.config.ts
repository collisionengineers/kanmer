import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  sourcemap: true,
  target: "node20",
  // Keep dependencies (incl. @kanmer/core and CJS libs like gray-matter)
  // external so Node loads them from node_modules with normal CJS interop.
  banner: { js: "#!/usr/bin/env node" },
});
