import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The esbuild `define` that injects the release version into the built server,
 * so `get_status` can report which release is answering (MCP-012).
 *
 * Shared by both tsup configs — the ESM dev build and the standalone CJS
 * bundle — so the two shapes can never disagree about the version they claim.
 * Plain `.mjs` rather than `.ts` so both esbuild (bundling the config) and bare
 * node resolve it with no extension-mapping ambiguity; it is not typechecked
 * either way, since `tsconfig.json` only includes `src/**\/*`.
 *
 * The value comes from the **root** `package.json` — the one
 * `scripts/release.mjs` actually bumps, alongside `apps/gui/package.json`.
 * `packages/mcp-server/package.json` is stuck at `0.1.0` and is never bumped,
 * so it is not a usable source.
 *
 * This is the only build-time input to the bundle's bytes, and it is a **pure
 * function of the source tree**: it moves once per release, never per build and
 * never per commit. `scripts/check-plugin-sync.mjs` compares the committed
 * bundle byte-for-byte with a fresh build, so anything less deterministic — a
 * build timestamp, an embedded git sha — would break that check permanently.
 */
export function versionDefine() {
  const here = dirname(fileURLToPath(import.meta.url));
  const rootPkg = resolve(here, "..", "..", "package.json");
  const { version } = JSON.parse(readFileSync(rootPkg, "utf8"));
  if (!version) {
    throw new Error(`No "version" in ${rootPkg} — the MCP build stamp reads it.`);
  }
  return { __KANMER_VERSION__: JSON.stringify(version) };
}
