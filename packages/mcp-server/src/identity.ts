import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Which *shape* the running server was launched as, derived from its own
 * resolved path — no build-time flag is involved, and none is wanted.
 *
 * The four real shapes are the ones `apps/gui/src/main/connect.ts:36-52` and
 * `plugins/kanmer/mcp/claude.mcp.json` can produce between them:
 *
 *   packaged       `<resourcesPath>/mcp/kanmer-mcp.cjs`     — inside the app
 *   plugin         `<pluginRoot>/mcp/kanmer-mcp.cjs`        — a Claude plugin
 *   dev-standalone `…/dist/standalone/kanmer-mcp.cjs`       — a checkout build
 *   dev-esm        `…/dist/index.js`                        — a checkout build
 *
 * `unknown` is not a failure: someone may legitimately copy the bundle
 * somewhere else, and saying so is more honest than guessing.
 */
export type BuildShape = "packaged" | "plugin" | "dev-standalone" | "dev-esm" | "unknown";

/**
 * Which build is answering. Every field is nullable on purpose — see
 * {@link serverIdentity}.
 */
export interface ServerIdentity {
  /** Release version, injected at build time. `null` if the define is absent. */
  version: string | null;
  /** Absolute path of the script actually running. */
  path: string | null;
  /** sha256 of that file's bytes, computed at runtime. */
  sha256: string | null;
  /** First 8 hex chars of {@link sha256}, for eyeballing two builds side by side. */
  sha256Short: string | null;
  /** The file's mtime, ISO-8601. Survives NSIS installation, so it is the build time. */
  mtime: string | null;
  /** The file's size in bytes. */
  size: number | null;
  /** Which shape it was launched as. */
  build: BuildShape;
}

/**
 * The release version, injected by esbuild `define` in both tsup configs from
 * the root `package.json` — see `tsup.config.ts` / `tsup.standalone.config.ts`.
 *
 * It is a `define` and not a `require("../package.json")` because the shipped
 * shape has no `package.json` beside it: `apps/gui/electron-builder.yml:15-23`
 * copies exactly one file into `resources/mcp/`.
 *
 * The `typeof` guard is what makes an *un-defined* context (vitest, `tsx`, a
 * bare `tsc` emit) degrade to `null` instead of throwing a ReferenceError —
 * `typeof` on an undeclared identifier is legal JavaScript. With the define
 * applied, esbuild substitutes the literal and folds the whole expression away.
 *
 * This is the ONLY build-time input to the bundle's bytes, and it is a pure
 * function of the source tree: it changes once per release, never per build and
 * never per commit. That is a hard requirement, not a preference —
 * `scripts/check-plugin-sync.mjs:57-76` compares the committed bundle
 * byte-for-byte against a fresh build, so a timestamp would break the check on
 * every build and an embedded git sha on every commit (the bundle is committed,
 * so the sha baked into it is always the *parent* commit's).
 */
declare const __KANMER_VERSION__: string;
export const SERVER_VERSION: string | null =
  typeof __KANMER_VERSION__ === "string" ? __KANMER_VERSION__ : null;

/**
 * The path of the script that is actually running.
 *
 * `__filename` is native in the CJS standalone bundle, and shimmed by tsup in
 * the ESM dev build (`shims: true` on `tsup.config.ts` only — the byte-compared
 * standalone config deliberately gains nothing but the `define`). `@types/node`
 * declares it globally, so this typechecks in an ESM package without a cast.
 */
function selfPath(): string | null {
  try {
    return typeof __filename === "string" && __filename ? path.resolve(__filename) : null;
  } catch {
    return null;
  }
}

/**
 * Classify by path segments rather than substrings, so a repo that merely
 * happens to live under a folder called `resources` is not misreported.
 *
 * `packaged` and `plugin` are both `…/mcp/kanmer-mcp.cjs`; the grandparent
 * separates them. Anything else under `mcp/` is treated as a plugin, which
 * covers plugin roots this repo does not control (`${CLAUDE_PLUGIN_ROOT}`, and
 * whatever nesting a marketplace install uses).
 */
export function classifyBuild(scriptPath: string | null): BuildShape {
  if (!scriptPath) return "unknown";
  const parts = path.resolve(scriptPath).split(/[\\/]/);
  const file = parts[parts.length - 1];
  const parent = parts[parts.length - 2];
  const grandparent = parts[parts.length - 3];

  if (file === "kanmer-mcp.cjs") {
    if (parent === "mcp") return grandparent === "resources" ? "packaged" : "plugin";
    if (parent === "standalone" && grandparent === "dist") return "dev-standalone";
  }
  if (file === "index.js" && parent === "dist") return "dev-esm";
  return "unknown";
}

/**
 * Cached for the process lifetime. `get_status` is the orientation call and
 * may run more than once a session; the bundle is ~1.4 MB and its bytes cannot
 * change under a running process in any way we would want to report.
 */
let cached: ServerIdentity | undefined;

/**
 * Identity of the running server: what it is, and what file it came from.
 *
 * **Nothing here throws.** Any failure to resolve, stat or hash yields `null`
 * for that field and leaves the rest intact — `get_status` is what an agent
 * calls to orient itself, and a broken orientation call is worse than a
 * partially-unknown one.
 *
 * The self-sha256 is the field that does the real work. It needs no cooperation
 * from the build system, so it distinguishes two builds that were produced by
 * completely different means — which is exactly the case this exists for: an
 * installed app bundle and a working checkout's bundle, answering for the same
 * board, differing in which gates they enforce, and previously returning
 * identical `get_status` output.
 */
export function serverIdentity(): ServerIdentity {
  if (cached) return cached;

  const scriptPath = selfPath();
  const identity: ServerIdentity = {
    version: SERVER_VERSION,
    path: scriptPath,
    sha256: null,
    sha256Short: null,
    mtime: null,
    size: null,
    build: classifyBuild(scriptPath),
  };

  if (scriptPath) {
    try {
      const stat = fs.statSync(scriptPath);
      identity.size = stat.size;
      identity.mtime = stat.mtime.toISOString();
    } catch {
      // Leave both null: an unstattable script is reportable, not fatal.
    }
    try {
      const sha = createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex");
      identity.sha256 = sha;
      identity.sha256Short = sha.slice(0, 8);
    } catch {
      // Same: a bundle we cannot read still answered this call.
    }
  }

  cached = identity;
  return identity;
}
