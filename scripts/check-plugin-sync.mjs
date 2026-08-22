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
import { createHash } from "node:crypto";
import { existsSync, realpathSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { checkIsolatedPlugin } from "./lib/plugin-isolation.mjs";
import { ownsCoreResolution } from "./lib/plugin-checkout-guard.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Refuse, loudly and with the fix. Matches `refuse()` in release.mjs. */
function refuse(why, fix) {
  console.error(`plugin:check refused: ${why}`);
  if (fix) console.error(`  fix: ${fix}`);
  process.exit(1);
}

// A worktree is valid when it owns the workspace dependency used for the
// fresh bundle. Conversely, a broken main checkout is invalid too. Asking git
// whether this is a linked worktree was only a proxy for this property.
const ownCore = realpathSync(join(root, "packages", "core"));
let resolvedCore;
try {
  resolvedCore = realpathSync(fileURLToPath(await import.meta.resolve("@kanmer/core")));
} catch (err) {
  refuse(
    `@kanmer/core cannot resolve from this checkout (${root})`,
    "run `npm install` in this checkout, then rerun `npm run plugin:check`",
  );
}
if (!ownsCoreResolution({ ownCore, resolvedCore })) {
  refuse(
    `@kanmer/core resolves to ${resolvedCore}, not this checkout's ${ownCore}`,
    "run `npm install` in this checkout so its workspace dependency is local, then rerun `npm run plugin:check`",
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

// The byte comparison proves source and committed bundle agree. This separate
// protocol run proves those bytes actually work when installed away from the
// monorepo, with no workspace resolution escape hatch.
const isolated = await checkIsolatedPlugin({ sourcePluginRoot: join(root, "plugins", "kanmer") });

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
// The three host manifests, and the two host-specific MCP configs that are
// shipped. Claude/grok use their own `${CLAUDE_PLUGIN_ROOT}` file; Antigravity
// uses its native root `plugin.json` + `mcp_config.json` pair. Codex remains
// skills-only and must not gain a server advertisement by accident.
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
// MCP-016 kept codex skills-only, while MCP-015 adds Antigravity's measured
// native `mcp_config.json` route. The descriptor uses only the runtime and
// plugin-root token accepted by the current CLI; it never pins cwd, a board
// root, or a machine path. The old root `.mcp.json` remains forbidden because
// agy reads that compatibility file independently of the native manifest.
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

  const agyManifestPath = join(pluginDir, "plugin.json");
  if (!existsSync(agyManifestPath)) {
    problems.push("missing plugins/kanmer/plugin.json for Antigravity");
  } else {
    const parsed = read(agyManifestPath);
    if (parsed.version !== repoVersion) {
      problems.push(`plugin.json: version "${parsed.version}" != package.json "${repoVersion}"`);
    }
    if (parsed.skills !== "./skills/") {
      problems.push(`plugin.json: skills is "${parsed.skills}", expected "./skills/"`);
    }
    if (parsed.mcpServers !== undefined) {
      problems.push("plugin.json: must not advertise mcpServers; Antigravity reads root mcp_config.json");
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

  const agyMcp = join(pluginDir, "mcp_config.json");
  if (!existsSync(agyMcp)) {
    problems.push("missing plugins/kanmer/mcp_config.json — Antigravity native plugin route is absent");
  } else {
    const entry = serverEntry(agyMcp);
    const args = entry.args ?? [];
    if (entry.command !== "node") problems.push(`mcp_config.json: command is "${entry.command}", expected "node"`);
    if (JSON.stringify(args) !== JSON.stringify(["${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"])) {
      problems.push(`mcp_config.json: args must be ["${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"]`);
    }
    if (entry.cwd !== undefined) problems.push("mcp_config.json: must not set cwd");
    if (args.some((a) => typeof a === "string" && /(?:^|[\\/])(?:Users|home|tmp)[\\/]|^[A-Za-z]:[\\/]|--(?:root|repo-root)\b/i.test(a))) {
      problems.push("mcp_config.json: must not contain a machine path or root flag");
    }
    if (!existsSync(join(pluginDir, "mcp", "kanmer-mcp.cjs"))) {
      problems.push("mcp_config.json: bundled MCP target is missing");
    }
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
    `${skillCount} skill frontmatters parse, manifests at v${manifestVersion}, ` +
    `isolated MCP handshake lists ${isolated.toolCount} tools`,
);
