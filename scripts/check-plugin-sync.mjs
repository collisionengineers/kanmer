// Fail if the plugin is out of sync with the server, in three ways:
//
//   1. tool NAMES registered by the server vs. documented in the plugin's tool
//      reference — the skills describe the tool surface, so a rename that only
//      lands on one side leaves agents following instructions for tools that no
//      longer exist;
//   2. the committed bundle's BYTES vs. a fresh build. The committed
//      plugins/kanmer/mcp/kanmer-mcp.cjs carries independent compiled copies of
//      every store method, so behaviour can drift arbitrarily far from source
//      without a single tool name changing. Names alone cannot see that.
//   3. every SKILL.md's YAML frontmatter parses under a strict parser (SKILL-018).
//
// (2) means plugin:check now requires a prior `npm run build` — consistent with
// `npm run plugin:build` already running it, and with AGENTS.md §10 pairing the
// two. It assumes tsup output is reproducible, which it is at this commit; if a
// future toolchain bump breaks that, the failure message already names the fix
// (`npm run plugin:build`), which is also the correct action either way.
//
// (2) is also only meaningful when the artifact was built where the check runs,
// so this script REFUSES to run from a linked git worktree (MCP-007). A worktree
// has no node_modules of its own, so @kanmer/core resolves up to the main
// checkout's workspace symlink and tsup bundles MAIN's core — both sides of the
// byte comparison are then built the same wrong way, they agree, and the check
// reports a pass it cannot support. That is exactly how SKILL-011 (PR #31)
// merged a bundle that did not contain the feature it shipped. There is
// deliberately no env-var bypass: a guard you can switch off at 2am is the
// failure mode this replaces. `plugin:build` stays unguarded — the artifact can
// still be produced wrong, it just can no longer be validated wrong.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Refuse, loudly and with the fix. Matches `refuse()` in release.mjs. */
function refuse(why, fix) {
  console.error(`plugin:check refused: ${why}`);
  if (fix) console.error(`  fix: ${fix}`);
  process.exit(1);
}

/**
 * Is `dir` a linked git worktree rather than the main checkout?
 *
 * The canonical test is git's own: in a linked worktree --git-dir points at
 * .git/worktrees/<name> while --git-common-dir points at the shared .git.
 * Resolve both against `dir` before comparing — git answers one relatively and
 * one absolutely depending on which case you are in, so comparing the raw
 * strings is accidentally right at the root and wrong elsewhere. Query with
 * `cwd: dir` so the answer describes the tree this script belongs to, not
 * whatever directory the shell happened to be in.
 *
 * Fallback when git is off PATH: in a linked worktree `.git` is a file
 * ("gitdir: …"), not a directory. A superset — it also fires for submodules and
 * `git clone --separate-git-dir` — which is the safe direction for a refusal
 * that names its own fix.
 */
function isLinkedWorktree(dir) {
  try {
    const gitDir = execFileSync("git", ["rev-parse", "--git-dir"], {
      cwd: dir,
      encoding: "utf8",
    }).trim();
    const commonDir = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd: dir,
      encoding: "utf8",
    }).trim();
    return resolve(dir, gitDir) !== resolve(dir, commonDir);
  } catch {
    try {
      return statSync(join(dir, ".git")).isFile();
    } catch {
      return false;
    }
  }
}

if (isLinkedWorktree(root)) {
  refuse(
    `this is a linked git worktree (${root}), where the bundle check cannot mean anything — ` +
      "a worktree has no node_modules of its own, so @kanmer/core resolves up to the main " +
      "checkout and the committed bundle and the fresh build are produced the same wrong way, " +
      "agree, and pass",
    "run `npm run plugin:check` from the main checkout instead (the repo root that owns " +
      "node_modules); if the committed bundle needs refreshing, `npm run plugin:build` there too",
  );
}

const serverPath = join(root, "packages/mcp-server/src/index.ts");
const refPath = join(
  root,
  "plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md",
);

for (const p of [serverPath, refPath]) {
  if (!existsSync(p)) {
    console.error(`Missing file: ${p}`);
    process.exit(1);
  }
}

const serverSrc = readFileSync(serverPath, "utf8");
const refDoc = readFileSync(refPath, "utf8");

const registered = [...serverSrc.matchAll(/registerTool\(\s*"([^"]+)"/g)].map((m) => m[1]);

// Only the tool tables count. Everything from "## Field semantics" onward
// documents fields and item types, whose names would otherwise be mistaken for
// tools. Documented tools are the first cell of a table row: | `tool_name` | … |
const toolSection = refDoc.split(/^## Field semantics/m)[0];
const documented = [...toolSection.matchAll(/^\|\s*`([a-z_]+)`\s*\|/gm)].map((m) => m[1]);

const missing = registered.filter((t) => !documented.includes(t));
const stale = documented.filter((t) => !registered.includes(t));

if (missing.length || stale.length) {
  if (missing.length) console.error(`Undocumented tools: ${missing.join(", ")}`);
  if (stale.length) console.error(`Documented but unregistered: ${stale.join(", ")}`);
  console.error(`Update ${refPath}`);
  process.exit(1);
}

// The bundle's bytes. Tool names are the contract; the bundle is the thing
// installed plugins actually run.
const bundlePath = join(root, "plugins/kanmer/mcp/kanmer-mcp.cjs");
const distPath = join(root, "packages/mcp-server/dist/standalone/kanmer-mcp.cjs");
if (!existsSync(bundlePath)) {
  console.error(`No committed plugin bundle at ${bundlePath} — run \`npm run plugin:build\`.`);
  process.exit(1);
}
if (!existsSync(distPath)) {
  console.error(
    `No standalone bundle at ${distPath} — run \`npm run build\` first ` +
      `(plugin:check now verifies the committed bundle's bytes, not just tool names).`,
  );
  process.exit(1);
}
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
if (sha(bundlePath) !== sha(distPath)) {
  console.error("Committed plugin bundle differs from a fresh build — run `npm run plugin:build`.");
  process.exit(1);
}

// Every SKILL.md's frontmatter, parsed under a strict YAML parser. Five
// different hosts parse this frontmatter with five different parsers; a file
// that looks fine to whichever tool wrote it can still be silently rejected by
// whichever tool reads it — SKILL-018 was exactly this: an unquoted `": "`
// inside a plain scalar (`description: … a standup ("now": …)`) broke
// Antigravity's Go YAML parser, which dropped the skill with no error visible
// anywhere in Kanmer. `yaml` (already a dependency of @kanmer/core and the
// GUI, so no new dependency here) enforces the same "a plain scalar cannot
// contain `: `" rule that caught it.
function checkSkillFrontmatter() {
  const skillsDir = join(root, "plugins/kanmer/skills");
  const skillDirs = existsSync(skillsDir)
    ? readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory())
    : [];
  const errors = [];
  for (const dir of skillDirs) {
    const skillPath = join(skillsDir, dir.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const text = readFileSync(skillPath, "utf8");
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      errors.push(`${skillPath}: no --- frontmatter block found`);
      continue;
    }
    try {
      parseYaml(match[1]);
    } catch (err) {
      errors.push(`${skillPath}: ${err.message.split("\n")[0]}`);
    }
  }
  if (errors.length) {
    console.error("Skill frontmatter failed to parse under a strict YAML parser:");
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  return skillDirs.length;
}
const skillCount = checkSkillFrontmatter();

console.log(
  `plugin-sync OK — ${registered.length} tools match, bundle bytes match, ` +
    `${skillCount} skill frontmatters parse`,
);
