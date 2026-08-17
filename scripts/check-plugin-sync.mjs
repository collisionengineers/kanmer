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
  // stdio silences git's own stderr: execFileSync inherits it by default, so a
  // non-repo directory would print `fatal: not a git repository` before the
  // fallback quietly handles it — noise that reads like the failure it isn't.
  const opts = { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] };
  try {
    const gitDir = execFileSync("git", ["rev-parse", "--git-dir"], opts).trim();
    const commonDir = execFileSync("git", ["rev-parse", "--git-common-dir"], opts).trim();
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

// ---------------------------------------------------------------------------
// The two plugin manifests, and the ONE MCP config that is still shipped.
// Three failures this catches, all three of which shipped:
//
//   - the plugin.json versions drifting from the repo version (MCP-011). Not
//     cosmetic: bundledSkillsVersion() (connect.ts) reads
//     .claude-plugin/plugin.json and installSkills() stamps every copied skill
//     set with that same number, so while it disagrees with package.json,
//     installed and bundled are written from one constant and
//     skillsStatus().updateAvailable can never be true — the "Update skills"
//     button is unreachable by construction. release.mjs now bumps these, so
//     this check exists for the hand-edit that bypasses it.
//   - an invocation naming a file that is not there, or using a ${TOKEN} the
//     reading host does not expand (MCP-011). The server then silently never
//     launches, which is exactly how the original defect stayed invisible for
//     three releases.
//   - the plugin advertising an MCP server to a host that cannot run one
//     (MCP-016) — see below.
//
// MCP-016: the plugin is SKILLS-ONLY for codex and antigravity/agy, and the
// assertions here are deliberately about ABSENCE. Neither host expands any
// ${…} token in a plugin's MCP config or passes the child a PLUGIN_ROOT, so a
// plugin-supplied server cannot locate its own script; codex's relative `cwd`
// fixes that only by moving board discovery into the plugin cache, where there
// is no board. Locating the script and finding the board need different working
// directories and neither host expresses both. It is also redundant — Connect
// writes the working codex registration at <repo>/.codex/config.toml with
// absolute paths — so nothing a user relies on depends on it. Two files, not
// one, because the two hosts reach the advertisement by different routes:
// codex follows .codex-plugin/plugin.json's mcpServers key, while agy reads
// plugins/kanmer/.mcp.json at the plugin root REGARDLESS of any manifest
// (measured: it reported source "claude-code" while copying the root .mcp.json
// verbatim). Removing only one leaves the other host still advertising it.
// Claude Code and grok are unaffected: mcp/claude.mcp.json is untouched, works,
// and keeps every rule it had.
// ---------------------------------------------------------------------------
function checkPluginManifests() {
  const pluginDir = join(root, "plugins/kanmer");
  const repoVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const problems = [];

  const read = (file) => JSON.parse(readFileSync(file, "utf8"));
  /** The one server entry a bundled MCP config must declare. */
  const serverEntry = (file) => {
    const entry = read(file)?.mcpServers?.kanmer;
    if (!entry) problems.push(`${file}: no mcpServers.kanmer entry`);
    return entry ?? {};
  };

  // `mcpServers` is the manifest key each host follows to an MCP config.
  // `null` means the manifest must not declare one at all (MCP-016).
  for (const [manifest, mcpKey] of [
    [".claude-plugin/plugin.json", "./mcp/claude.mcp.json"],
    [".codex-plugin/plugin.json", null],
  ]) {
    const file = join(pluginDir, manifest);
    if (!existsSync(file)) {
      problems.push(`missing plugins/kanmer/${manifest}`);
      continue;
    }
    const parsed = read(file);
    if (parsed.version !== repoVersion) {
      problems.push(
        `${manifest}: version "${parsed.version}" != package.json "${repoVersion}" — ` +
          `while these disagree, skillsStatus().updateAvailable can never fire`,
      );
    }
    if (parsed.skills !== "./skills/") {
      problems.push(
        `${manifest}: skills is "${parsed.skills}", expected "./skills/" — the skills are ` +
          "what this plugin delivers on every host and must not be dropped with the server",
      );
    }
    if (mcpKey === null) {
      if (parsed.mcpServers !== undefined) {
        problems.push(
          `${manifest}: declares mcpServers "${parsed.mcpServers}", and must not — codex ` +
            "cannot run a plugin-supplied server (FRD-012 R6, MCP-016), and Connect already " +
            "writes the working registration at <repo>/.codex/config.toml. Re-adding this is " +
            "a decision, not a fix: it advertises a server that has never once launched",
        );
      }
    } else if (parsed.mcpServers !== mcpKey) {
      problems.push(`${manifest}: mcpServers is "${parsed.mcpServers}", expected "${mcpKey}"`);
    } else if (!existsSync(join(pluginDir, mcpKey))) {
      problems.push(`${manifest}: mcpServers points at ${mcpKey}, which does not exist`);
    }
  }

  // No .mcp.json at the plugin root. This is a SEPARATE assertion from the
  // manifest key above and is not redundant with it: agy never consults a
  // manifest for MCP, so the file's mere presence re-advertises the server on
  // Antigravity even with the codex manifest clean (MCP-016 research, finding 2).
  const codexMcp = join(pluginDir, ".mcp.json");
  if (existsSync(codexMcp)) {
    problems.push(
      "plugins/kanmer/.mcp.json exists, and must not — antigravity/agy copies it verbatim " +
        "regardless of what any manifest points at, then joins its relative path to the " +
        "SESSION cwd (`Cannot find module '<cwd>\\mcp\\kanmer-mcp.cjs'`). Deleting the " +
        "manifest key alone does not stop that host; the file has to be absent (MCP-016)",
    );
  }

  // mcp/claude.mcp.json — Claude Code and grok. Both expand ${CLAUDE_PLUGIN_ROOT}
  // and the shell-style ${VAR:-default} form, so this one genuinely works and is
  // deliberately kept.
  const claudeMcp = join(pluginDir, "mcp/claude.mcp.json");
  if (existsSync(claudeMcp)) {
    const entry = serverEntry(claudeMcp);
    const script = entry.args?.[0] ?? "";
    const prefix = "${CLAUDE_PLUGIN_ROOT}/";
    if (!script.startsWith(prefix)) {
      problems.push(`mcp/claude.mcp.json: args[0] must start with ${prefix} (got "${script}")`);
    } else if (!existsSync(join(pluginDir, script.slice(prefix.length)))) {
      problems.push(`mcp/claude.mcp.json: args[0] names a file that does not exist: ${script}`);
    }
    if (entry.cwd !== undefined) {
      problems.push("mcp/claude.mcp.json: must not set cwd — a relative cwd breaks grok's handshake");
    }
    // It may not pin a board. An absolute --root cannot survive a different
    // machine or user account, and since MCP-010 the server discovers the board
    // itself (ADR-0012).
    if ((entry.args ?? []).some((a) => typeof a === "string" && a.startsWith("--root"))) {
      problems.push(
        "mcp/claude.mcp.json: must not pass --root — the server discovers the board (ADR-0012)",
      );
    }
  } else {
    problems.push(
      "missing plugins/kanmer/mcp/claude.mcp.json — Claude Code and grok DO run a " +
        "plugin-supplied server and this is the file that gives it to them",
    );
  }

  if (problems.length) {
    console.error("Plugin manifests are wrong:");
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  return repoVersion;
}
const manifestVersion = checkPluginManifests();

// ---------------------------------------------------------------------------
// The two MARKETPLACE manifests, and whether the packaged app carries them.
//
// Distinct from the plugin manifests above: those describe the plugin, these
// are what a host's `plugin marketplace add <dir>` looks for inside <dir>. Both
// live at the REPO ROOT, one level above `plugins/`, which is the whole of
// MCP-013 — Connect passed `plugins/kanmer` and every install exited 1 with
// "Marketplace file not found", silently, on every release.
//
// Two failures this catches:
//
//   - a manifest whose `source` stops naming `./plugins/kanmer`. connect.ts's
//     marketplaceRoot() is defined as pluginRoot() minus exactly those two
//     segments; if a manifest points somewhere else that derivation is wrong in
//     the packaged app, where nothing else would notice.
//   - `extraResources` dropping a manifest. That is not hypothetical: `0f3bb03`
//     shipped `plugins/kanmer` plus a comment claiming a local marketplace
//     source, while the v2 plan asked for the plugin AND both JSONs
//     (docs/plans/kanmer-v2/phase-6-agents-connect/plan.md:30). The half that
//     was dropped is the half that makes it a marketplace.
//
// This reads the electron-builder CONFIG. `check-updater-package.mjs` asserts
// the same thing about the packed OUTPUT — config-level here because it is free
// and runs on every `plugin:check`, artifact-level there because a config that
// looks right is not an artifact that is.
// ---------------------------------------------------------------------------
function checkMarketplaces() {
  const problems = [];
  /** `[file, how to read its single plugin entry]`, one per host schema. */
  const manifests = [
    [
      ".claude-plugin/marketplace.json", // Claude Code: source is a string
      (p) => (typeof p?.source === "string" ? p.source : null),
    ],
    [
      ".agents/plugins/marketplace.json", // the agents schema (codex): source is an object
      (p) => (typeof p?.source?.path === "string" ? p.source.path : null),
    ],
  ];

  const names = [];
  for (const [rel, readSource] of manifests) {
    const file = join(root, rel);
    if (!existsSync(file)) {
      problems.push(`missing ${rel} — without it \`plugin marketplace add <repo root>\` exits 1`);
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      problems.push(`${rel}: not valid JSON (${err.message})`);
      continue;
    }
    if (typeof parsed.name !== "string" || parsed.name === "") {
      problems.push(`${rel}: no marketplace name`);
    } else {
      names.push(parsed.name);
    }
    const entry = Array.isArray(parsed.plugins) ? parsed.plugins[0] : undefined;
    if (!entry) {
      problems.push(`${rel}: declares no plugins`);
      continue;
    }
    if (entry.name !== "kanmer") {
      problems.push(`${rel}: plugins[0].name is "${entry.name}", expected "kanmer"`);
    }
    const source = readSource(entry);
    if (source !== "./plugins/kanmer") {
      problems.push(
        `${rel}: plugins[0].source is "${source}", expected "./plugins/kanmer" — ` +
          "connect.ts's marketplaceRoot() is pluginRoot() minus those two segments",
      );
    } else if (!existsSync(join(root, "plugins", "kanmer"))) {
      problems.push(`${rel}: points at plugins/kanmer, which does not exist`);
    }
  }

  // The names differ on purpose (`kanmer` vs `kanmer-plugins`) — different
  // schemas, different hosts, and renaming codex's would relocate every
  // existing user's plugin cache. Asserted so the divergence stays a decision
  // rather than becoming a surprise; providers.test.ts pins each hard-coded
  // `<plugin>@<marketplace>` string to the manifest that declares it.
  if (names.length === 2 && names[0] === names[1]) {
    problems.push(
      `both marketplaces are now named "${names[0]}" — if that is intended, update ` +
        "providers.ts's install commands, FRD-012 R2 and this check together",
    );
  }

  // extraResources must pack the plugin AND both manifests, at paths that
  // reproduce the repo-root layout under `resources/`.
  const builderFile = join(root, "apps/gui/electron-builder.yml");
  if (!existsSync(builderFile)) {
    problems.push("missing apps/gui/electron-builder.yml");
  } else {
    const extra = parseYaml(readFileSync(builderFile, "utf8"))?.extraResources ?? [];
    const packedTo = new Set(
      extra.map((e) => (typeof e === "string" ? e : e?.to)).filter((t) => typeof t === "string"),
    );
    for (const required of [
      "plugins/kanmer",
      ".claude-plugin/marketplace.json",
      ".agents/plugins/marketplace.json",
    ]) {
      if (!packedTo.has(required)) {
        problems.push(
          `electron-builder.yml extraResources does not pack "${required}" — ` +
            "the packaged app then has no local marketplace source (MCP-013)",
        );
      }
    }
  }

  if (problems.length) {
    console.error("Marketplace manifests are wrong:");
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  return names;
}
const marketplaceNames = checkMarketplaces();

console.log(`  marketplaces: ${marketplaceNames.join(", ")} — both packed into the app`);
console.log(
  `plugin-sync OK — ${registered.length} tools match, bundle bytes match, ` +
    `${skillCount} skill frontmatters parse, manifests at v${manifestVersion}`,
);
