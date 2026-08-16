import fs from "node:fs";
import path from "node:path";
import { serverIdentity, type BuildShape } from "./identity.js";

/**
 * Where the skills tree this build ships actually lives on disk.
 *
 * This is the known-good reference CORE-023's staleness detector compares a
 * repo against — and locating it used to be the hard part. Research called it
 * "three different relative answers, and it fails on the fourth", and proposed
 * baking a content manifest into the bundle at build time to avoid the problem
 * entirely.
 *
 * [[MCP-012]] made that unnecessary. `classifyBuild()` already resolves which
 * of the four shapes is running, from the script's own path, so the answer is
 * *determined* rather than guessed — one case per shape, and `unknown` for
 * anything else:
 *
 *   packaged        `<resources>/mcp/kanmer-mcp.cjs`            → `<resources>/plugins/kanmer/skills`
 *   plugin          `<pluginRoot>/mcp/kanmer-mcp.cjs`           → `<pluginRoot>/skills`
 *   dev-standalone  `…/packages/mcp-server/dist/standalone/…`   → `<repo>/plugins/kanmer/skills`
 *   dev-esm         `…/packages/mcp-server/dist/index.js`       → `<repo>/plugins/kanmer/skills`
 *
 * (`packaged` from `apps/gui/electron-builder.yml`, which copies
 * `plugins/kanmer` to `resources/plugins/kanmer`; `plugin` from
 * `plugins/kanmer/.claude-plugin/plugin.json`, whose `"skills": "./skills/"` is
 * the manifest Claude itself reads.)
 *
 * Choosing discovery over the authorised build-time bake is not thrift. A baked
 * *skills* manifest would make the standalone bundle's bytes a function of
 * every skill prose file, and `scripts/check-plugin-sync.mjs` compares the
 * committed bundle byte-for-byte against a fresh build — so from then on every
 * skill-prose edit would fail `plugin:check` until someone rebuilt the MCP
 * bundle. That is a permanent tax on a file nobody would expect to be coupled
 * to the binary. This adds no build-time input at all.
 *
 * Returns null rather than a guess when the tree is not there. Null becomes
 * `state: "unknown"` in the report — the honest answer, and never `behind`.
 */
export function bundledSkillsDir(): string | null {
  const { path: scriptPath, build } = serverIdentity();
  if (!scriptPath) return null;
  const candidate = skillsDirFor(scriptPath, build);
  if (!candidate) return null;
  try {
    return fs.statSync(candidate).isDirectory() ? candidate : null;
  } catch {
    return null;
  }
}

/**
 * The path arithmetic, split out from the filesystem probe so it is testable
 * as a pure function of (path, shape).
 */
export function skillsDirFor(scriptPath: string, build: BuildShape): string | null {
  const dir = path.dirname(path.resolve(scriptPath));
  switch (build) {
    // <resources>/mcp/kanmer-mcp.cjs → <resources>/plugins/kanmer/skills
    case "packaged":
      return path.join(dir, "..", "plugins", "kanmer", "skills");
    // <pluginRoot>/mcp/kanmer-mcp.cjs → <pluginRoot>/skills
    case "plugin":
      return path.join(dir, "..", "skills");
    // <repo>/packages/mcp-server/dist/standalone/kanmer-mcp.cjs
    case "dev-standalone":
      return path.join(dir, "..", "..", "..", "..", "plugins", "kanmer", "skills");
    // <repo>/packages/mcp-server/dist/index.js
    case "dev-esm":
      return path.join(dir, "..", "..", "..", "plugins", "kanmer", "skills");
    case "unknown":
      return null;
  }
}
