import { defineConfig } from "tsup";

/**
 * @kanmer/ui is a thin packaging of the GUI renderer: the entry re-exports the
 * real components from apps/gui/src/renderer/src and imports its styles.css,
 * so tsup emits dist/index.js + dist/index.d.ts + dist/index.css from the one
 * source of truth. React stays external (peer); marked is bundled so the
 * design-system consumer needs nothing but React.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: false,
  target: "es2020",
  platform: "browser",
  external: ["react", "react-dom", "react/jsx-runtime"],
  noExternal: ["marked"],
  loader: { ".css": "css" },
});
