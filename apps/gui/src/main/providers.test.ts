import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROVIDERS,
  RETIRED_SKILL_PATHS,
  antigravityBindingNote,
  classifyLegacyCodexEntry,
  codexPortableInvocation,
  codexPortableProbeInvocation,
  normalizeBoardBranch,
  dispatchableProviders,
  codexServerName,
  formatSkillsStamp,
  legacyCodexEntries,
  isNewerVersion,
  parseSkillsStamp,
  providerById,
  codexTrustFromConfig,
  codexTrustNote,
  q,
  type Invocation,
} from "./providers.js";
import * as TOML from "smol-toml";
import { applyManagedBlock, removeManagedBlock, START, END, BLOCK_BODY } from "./agentsBlock.js";
import { BLOCK_BODY as CANONICAL_BODY } from "../../../../scripts/agents-block-body.mjs";
import { listDispatchProviders, SKILL_DESTINATIONS, STALENESS_PROVIDER_PATHS } from "@kanmer/core";

const inv: Invocation = {
  command: "/opt/electron",
  args: ["/app/mcp/kanmer-mcp.cjs", "--root", "/home/me/proj"],
  env: { ELECTRON_RUN_AS_NODE: "1" },
};
const ROOT = "/home/me/proj";

describe("provider registry", () => {
  it("has all five providers", () => {
    expect(PROVIDERS.map((p) => p.id).sort()).toEqual([
      "antigravity",
      "claude",
      "codex",
      "grok",
      "opencode",
    ]);
  });

  it("uses core's staleness path catalog for every owned provider path", () => {
    for (const id of ["codex", "opencode"] as const) {
      const register = providerById(id)!.register;
      if (register.kind !== "configFile") throw new Error(`expected ${id} config file`);
      expect(register.configPath).toBe(STALENESS_PROVIDER_PATHS[id].registrationFile);
    }

    for (const id of ["opencode"] as const) {
      const install = providerById(id)!.install;
      if (install.kind !== "copySkills") throw new Error(`expected ${id} copied skills`);
      expect(install.skillsDir).toBe(STALENESS_PROVIDER_PATHS[id].skillsDir);
      expect(SKILL_DESTINATIONS).toContain(install.skillsDir);
    }

    // CORE-030: Claude is marketplace-managed, so a user-created mirror is
    // never a staleness destination the GUI can accidentally resurrect.
    expect(SKILL_DESTINATIONS).not.toContain(".claude/skills");
  });

  // codex's CLI registration is superseded by the project config file — see
  // "codex project-scoped TOML registration" below. `codexServerName` survives
  // only to name the legacy global entries that cleanup drains.

  it("claude registers at project scope as kanmer", () => {
    const reg = providerById("claude")!.register;
    if (reg.kind !== "cli") throw new Error("expected cli");
    const cmd = reg.addCommand(inv, ROOT);
    expect(cmd).toContain("claude mcp add kanmer -s project");
    expect(cmd).toContain("-e ELECTRON_RUN_AS_NODE=1");
    const configured = reg.addCommand({ ...inv, env: { ...inv.env, KANMER_BOARD_BRANCH: "release-board" } }, ROOT);
    expect(configured).toContain("-e KANMER_BOARD_BRANCH=release-board");
    expect(reg.addArgv?.({ ...inv, env: { ...inv.env, KANMER_BOARD_BRANCH: "release-board" } }, ROOT)).toEqual({
      file: "claude",
      args: [
        "mcp", "add", "kanmer", "-s", "project",
        "-e", "ELECTRON_RUN_AS_NODE=1", "-e", "KANMER_BOARD_BRANCH=release-board",
        "--", inv.command, ...inv.args,
      ],
    });
    expect(q("team&whoami")).toBe('"team&whoami"');
    expect(reg.addCommand({ ...inv, env: { KANMER_BOARD_BRANCH: "team&whoami" } }, ROOT))
      .toContain('"KANMER_BOARD_BRANCH=team&whoami"');
  });

  it("opencode merges an mcp.local entry, preserving unknown keys and idempotent", () => {
    const reg = providerById("opencode")!.register;
    if (reg.kind !== "configFile") throw new Error("expected configFile");
    expect(reg.configPath).toBe("opencode.json");
    const first = reg.merge('{ "theme": "dark", "mcp": { "other": { "type": "local" } } }', inv);
    const obj = JSON.parse(first);
    expect(obj.theme).toBe("dark"); // unknown key preserved
    expect(obj.mcp.other).toBeTruthy(); // other server preserved
    expect(obj.mcp.kanmer.type).toBe("local");
    expect(obj.mcp.kanmer.command).toEqual([inv.command, ...inv.args]);
    expect(obj.mcp.kanmer.environment.ELECTRON_RUN_AS_NODE).toBe("1");
    const configured = JSON.parse(reg.merge(null, {
      ...inv,
      env: { ...inv.env, KANMER_BOARD_BRANCH: "release-board" },
    }));
    expect(configured.mcp.kanmer.environment).toEqual({
      ELECTRON_RUN_AS_NODE: "1",
      KANMER_BOARD_BRANCH: "release-board",
    });
    // Idempotent: re-merging its own output is byte-identical.
    expect(reg.merge(first, inv)).toBe(first);
    // Unmerge removes only kanmer.
    const back = JSON.parse(reg.unmerge(first));
    expect(back.mcp.kanmer).toBeUndefined();
    expect(back.mcp.other).toBeTruthy();
    expect(back.theme).toBe("dark");
  });

  it("antigravity uses the native user-plugin contract and retains legacy paths only for cleanup", () => {
    const provider = providerById("antigravity")!;
    expect(provider.register).toEqual({ kind: "none" });
    const install = provider.install;
    if (install.kind !== "plugin") throw new Error("expected native plugin");
    expect(install).toMatchObject({
      scope: "user",
      pluginName: "kanmer",
      cli: "agy",
      legacyConfigPath: ".agents/mcp_config.json",
      legacySkillsDir: ".agents/skills",
    });
    expect(install.installCommand("C:\\Kanmer\\plugins\\kanmer")).toBe(
      "agy plugin install C:\\Kanmer\\plugins\\kanmer",
    );
    expect(install.validateCommand?.("C:\\Kanmer\\plugins\\kanmer")).toContain("agy plugin validate");
    expect(install.functionalCommand("C:\\My Projects\\kanmer")).toContain("agy --add-dir");
  });

  it("no provider writes .mcp.json — it is Claude's, and Claude reaches it through its own CLI", () => {
    // The defect this replaces: grok merged `mcpServers.kanmer` into the very
    // file `claude mcp add -s project` writes, so grok's disconnect deleted
    // Claude's registration. Ownership is now structural, not a heuristic.
    for (const p of PROVIDERS) {
      if (p.register.kind === "configFile") expect(p.register.configPath).not.toBe(".mcp.json");
    }
  });

  it("Grok uses the native user-scoped plugin and retains legacy cleanup knowledge", () => {
    const provider = providerById("grok")!;
    expect(provider.register).toEqual({ kind: "none" });
    const install = provider.install;
    if (install.kind !== "plugin") throw new Error("expected native plugin");
    expect(install).toMatchObject({
      scope: "user",
      pluginName: "kanmer",
      legacyConfigPath: ".grok/config.toml",
      legacySkillsDir: ".grok/skills",
    });
    expect(install.installCommand("C:\\Kanmer\\plugins\\kanmer")).toContain(
      "grok plugin install",
    );
    expect(install.installCommand("C:\\Kanmer\\plugins\\kanmer")).toContain("--trust");
    expect(install.uninstallCommand()).toBe("grok plugin uninstall kanmer --confirm");
    expect(install.argv?.functional("C:\\hostile root & $(whoami) `tick` ;", "C:\\board root")).toEqual({
      file: "grok",
      args: [
        "-p",
        expect.stringContaining("Call the Kanmer get_status tool"),
        "--cwd",
        "C:\\hostile root & $(whoami) `tick` ;",
      ],
    });
  });

  it("each config-file provider answers registration from its own file's shape", () => {
    const state = (id: string, contents: string) => {
      const reg = providerById(id)!.register;
      if (reg.kind !== "configFile") throw new Error("expected configFile");
      return reg.registrationState(contents);
    };
    expect(state("opencode", '{"mcp":{"kanmer":{}}}')).toBe("registered");
    expect(state("opencode", '{"mcpServers":{"kanmer":{}}}')).toBe("absent");
    expect(state("codex", "[mcp_servers.other]\ncommand = 'x'\n")).toBe("absent");
    // "Cannot read" is kept distinct from "no": disconnect keeps the shared
    // AGENTS.md block on it, the legacy sweep refuses to drain on it.
    expect(state("codex", "[not valid")).toBe("indeterminate");
  });

  it("antigravity installs a user plugin and is dispatchable only through binding", () => {
    const antigravity = providerById("antigravity")!;
    expect(antigravity.register).toEqual({ kind: "none" });
    expect(antigravity.install).toMatchObject({ kind: "plugin", scope: "user", pluginName: "kanmer" });
    expect(antigravity.dispatch).toBe(true);
    expect(antigravity.dispatchCli).toBe("agy");
    expect(antigravity.dispatchArgs?.("PROMPT", "C:\\My Projects\\kanmer")).toEqual([
      "--add-dir",
      "C:\\My Projects\\kanmer",
      "-p",
      "PROMPT",
    ]);
    expect(dispatchableProviders().map((p) => p.id)).toContain("antigravity");
    expect(providerById("claude")!.dispatch).toBe(true);
  });

  it("antigravity's connect note names the binding, not a capability tier", () => {
    const note = antigravityBindingNote("C:\\Users\\Me\\proj");
    expect(note).toContain("--add-dir");
    expect(note).toContain("C:\\Users\\Me\\proj");
    expect(note).toContain("agy 1.1.14");
    expect(note).toMatch(/IDE was not tested/);
    expect(note).not.toMatch(/register-only/);
    // Paths with spaces stay one argument in the command it suggests.
    expect(antigravityBindingNote("C:\\My Projects\\p")).toContain('"C:\\My Projects\\p"');
  });

  it("dispatchable hosts build the headless CLI + args carrying the prompt", () => {
    expect(providerById("claude")!.dispatchArgs!("PROMPT", ROOT)).toEqual(["-p", "PROMPT"]);
    expect(providerById("codex")!.dispatchArgs!("PROMPT", ROOT)).toEqual(["exec", "PROMPT"]);
    expect(providerById("opencode")!.dispatchArgs!("PROMPT", ROOT)).toEqual(["run", "PROMPT"]);
    expect(providerById("grok")!.dispatchArgs!("PROMPT", ROOT)).toEqual([
      "-p",
      "PROMPT",
      "--cwd",
      ROOT,
    ]);
    expect(providerById("antigravity")!.dispatchArgs!("PROMPT", ROOT)).toEqual([
      "--add-dir",
      ROOT,
      "-p",
      "PROMPT",
    ]);
  });

  it("derives the GUI dispatch roster exactly from core's shared registry", () => {
    expect(dispatchableProviders().map((p) => p.id)).toEqual(listDispatchProviders().map((p) => p.id));
    expect(dispatchableProviders().map((p) => p.label)).toEqual(listDispatchProviders().map((p) => p.label));
  });
});

describe("AGENTS.md managed block", () => {
  it("creates a block at byte 0 when the file is absent", () => {
    const out = applyManagedBlock(null, "BODY", { stubHeading: "# Guide" });
    expect(out.startsWith(START)).toBe(true);
    expect(out).toContain("BODY");
    expect(out).toContain("# Guide");
  });

  it("prepends to an existing file, preserving its content", () => {
    const original = "# Their guide\n\nProse.\n";
    const out = applyManagedBlock(original, "BODY");
    expect(out.startsWith(START)).toBe(true);
    expect(out.endsWith(original)).toBe(true);
  });

  it("refreshes in place and is idempotent", () => {
    const first = applyManagedBlock("PREAMBLE\n\n# Their guide\n", "BODY");
    const second = applyManagedBlock(first, "BODY");
    expect(second).toBe(first);
    expect(second.split(START).length).toBe(2); // exactly one block
  });

  it("remove restores the surrounding file, drops the file when it was block-only", () => {
    const withBlock = applyManagedBlock("# Their guide\n\nProse.\n", "BODY");
    const restored = removeManagedBlock(withBlock);
    expect(restored).not.toBeNull();
    expect(restored).not.toContain(START);
    expect(restored).toContain("# Their guide");
    // A file that was only the block (+ stub) removes entirely.
    const blockOnly = applyManagedBlock(null, "BODY", { stubHeading: "# Contributor guide" });
    // The stub heading is real content, so removal leaves it — assert markers gone.
    const afterOnly = removeManagedBlock(blockOnly);
    expect(afterOnly === null || !afterOnly.includes(START)).toBe(true);
  });

  it("throws on a malformed half-marked file", () => {
    expect(() => applyManagedBlock(`${END}\nx\n${START}\n`, "BODY")).toThrow();
  });

  it("writes the canonical body, not a local copy of one", () => {
    // The regression this guards is not hypothetical. This module used to carry
    // its own BLOCK_BODY literal, it drifted to a v2 body, and Connect — which
    // calls applyManagedBlock with the default — wrote that stale body over the
    // current one in real repositories (SKILL-013).
    //
    // Asserted against the *canonical* module rather than against a copied
    // string, because a hardcoded expectation here would be a fourth copy.
    expect(BLOCK_BODY).toBe(CANONICAL_BODY);
    // And against the two v2 markers specifically, so the failure names itself.
    expect(BLOCK_BODY).not.toContain("researching → planning");
    expect(BLOCK_BODY).not.toContain("impact.md");

    const written = applyManagedBlock(null, undefined, { stubHeading: "# Guide" });
    expect(written).toContain(CANONICAL_BODY);
  });
});

describe("isNewerVersion (skills update marker)", () => {
  it("is true only when the bundled version is strictly newer", () => {
    expect(isNewerVersion("0.2.0", "0.1.0")).toBe(true);
    expect(isNewerVersion("1.0.0", "0.9.9")).toBe(true);
    expect(isNewerVersion("0.1.10", "0.1.2")).toBe(true); // numeric, not lexical
  });

  it("is false when equal or older", () => {
    expect(isNewerVersion("0.1.0", "0.1.0")).toBe(false);
    expect(isNewerVersion("0.1.0", "0.2.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
  });

  it("treats a short version as zero-padded", () => {
    expect(isNewerVersion("0.1.1", "0.1")).toBe(true);
    expect(isNewerVersion("0.1", "0.1.0")).toBe(false);
  });
});

describe("codex project-scoped TOML registration (FRD-012 R1)", () => {
  const codex = providerById("codex")!;
  const reg = codex.register as Extract<typeof codex.register, { kind: "configFile" }>;

  it("registers in the project file, not via the CLI", () => {
    expect(reg.kind).toBe("configFile");
    expect(reg.configPath).toBe(".codex/config.toml");
  });

  it("writes [mcp_servers.kanmer] with command, args and env for Electron", () => {
    const out = reg.merge(null, inv);
    expect(out).toContain("[mcp_servers.kanmer]");
    expect(out).toContain("/opt/electron");
    expect(out).toContain("--root");
    // env is not optional: the registered command is the Electron binary,
    // which only runs the server as Node with this set.
    expect(out).toContain("ELECTRON_RUN_AS_NODE");
    expect(TOML.parse(out)).toMatchObject({
      mcp_servers: { kanmer: { command: "/opt/electron", env: { ELECTRON_RUN_AS_NODE: "1" } } },
    });
  });

  it("defines one rootless, byte-identical portable Codex entry with no env", () => {
    const portable = codexPortableInvocation();
    expect(portable).toEqual({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", '"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"'],
      env: {},
    });
    const parsed = TOML.parse(reg.merge(null, portable)) as Record<string, any>;
    expect(parsed).toEqual({
      mcp_servers: {
        kanmer: {
          command: "cmd.exe",
          args: ["/d", "/s", "/c", '"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"'],
        },
      },
    });
    const fromAnotherMachine = codexPortableInvocation();
    expect(reg.merge(null, fromAnotherMachine)).toBe(reg.merge(null, portable));
    expect(JSON.stringify(parsed)).not.toMatch(/Users|Users|Kanmer\.exe|--root|--repo-root|cwd|ELECTRON_RUN_AS_NODE/);
  });

  it("adds only the configured board branch to a project-scoped portable entry", () => {
    expect(normalizeBoardBranch(" release-board ")).toBe("release-board");
    expect(normalizeBoardBranch("  ")).toBe("kanmer-board");
    const configured = codexPortableInvocation(" release-board ");
    const parsed = TOML.parse(reg.merge(null, configured)) as Record<string, any>;
    expect(parsed.mcp_servers.kanmer).toMatchObject({
      command: "cmd.exe",
      env: { KANMER_BOARD_BRANCH: "release-board" },
    });
    expect(parsed.mcp_servers.kanmer).not.toHaveProperty("cwd");
    expect(parsed.mcp_servers.kanmer).not.toHaveProperty("--root");
  });

  it("creates a fresh probe descriptor without changing the registration", () => {
    const probe = codexPortableProbeInvocation();
    expect(probe).toEqual({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", '"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd" --probe'],
      env: {},
    });
    const normal = codexPortableInvocation();
    expect(normal.args).toEqual(["/d", "/s", "/c", '"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"']);
  });

  it("preserves unknown tables, unknown keys and other MCP servers", () => {
    const existing = [
      'model = "o3"',
      "",
      "[projects.'/home/me/proj']",
      'trust_level = "trusted"',
      "",
      "[mcp_servers.context7]",
      'command = "npx"',
      'args = ["-y", "@upstash/context7-mcp"]',
      "",
    ].join("\n");
    const parsed = TOML.parse(reg.merge(existing, inv)) as Record<string, never>;
    expect(parsed.model).toBe("o3");
    expect(parsed.projects).toMatchObject({ "/home/me/proj": { trust_level: "trusted" } });
    expect(parsed.mcp_servers).toMatchObject({
      context7: { command: "npx" },
      kanmer: { command: "/opt/electron" },
    });
  });

  it("is idempotent and byte-stable on re-merge", () => {
    const once = reg.merge(null, inv);
    const twice = reg.merge(once, inv);
    expect(twice).toBe(once);
    expect(reg.merge(twice, inv)).toBe(once);
  });

  it("unmerge removes only kanmer, leaving the rest untouched", () => {
    const withBoth = reg.merge(
      ['[mcp_servers.context7]', 'command = "npx"', ""].join("\n"),
      inv,
    );
    const after = TOML.parse(reg.unmerge(withBoth)) as Record<string, never>;
    expect(after.mcp_servers).toMatchObject({ context7: { command: "npx" } });
    expect((after.mcp_servers as Record<string, unknown>).kanmer).toBeUndefined();
  });

  it("unmerge drops an mcp_servers table left empty", () => {
    const only = reg.merge(null, inv);
    expect(TOML.parse(reg.unmerge(only))).toEqual({});
  });

  it("leaves an unparseable file exactly as found rather than mangling it", () => {
    const broken = "this is [not valid toml";
    expect(reg.unmerge(broken)).toBe(broken);
  });

  it("keeps the legacy global cleanup so old kanmer-<project> entries drain", () => {
    // `codex mcp add` only ever wrote the global config, so every project that
    // connected under an older Kanmer left an entry behind.
    expect(reg.removeCommands?.(ROOT)).toEqual([`codex mcp remove ${codexServerName(ROOT)}`]);
  });
});

describe("legacy global codex sweep (GUI-079)", () => {
  // Synthetic on purpose. The machine that reported this bug no longer
  // reproduces it — its `~/.codex/config.toml` has no `kanmer-*` entry left —
  // so the shape below is reconstructed from what the old writer produced:
  // `--root <boardRoot>` plus `--repo-root <sourceRoot>` when the board lives
  // in a worktree, alongside a non-Kanmer server that must survive untouched.
  const GLOBAL = [
    "# a comment the sweep must never rewrite away",
    "startup_timeout_sec = 120.0",
    "",
    "[projects.'c:\\users\\pc\\documents\\github\\alpha']",
    'trust_level = "trusted"',
    "",
    "[mcp_servers.mcp_microsoftdocs]",
    'url = "https://learn.microsoft.com/api/mcp"',
    "",
    "[mcp_servers.kanmer-alpha]",
    'command = "Kanmer.exe"',
    "args = ['kanmer-mcp.cjs', '--root', 'C:\\Users\\PC\\Documents\\GitHub\\alpha\\.worktrees\\kanmer', '--repo-root', 'C:\\Users\\PC\\Documents\\GitHub\\alpha']",
    "",
    "[mcp_servers.kanmer-pegasus]",
    'command = "Kanmer.exe"',
    "args = ['kanmer-mcp.cjs', '--root', 'C:\\Users\\PC\\Documents\\GitHub\\pegasus']",
    "",
  ].join("\n");

  const byName = (toml: string, name: string) =>
    legacyCodexEntries(toml).find((e) => e.name === name)!;

  it("lists only kanmer-* entries and recovers each project root from its args", () => {
    const entries = legacyCodexEntries(GLOBAL);
    expect(entries.map((e) => e.name).sort()).toEqual(["kanmer-alpha", "kanmer-pegasus"]);
    // --repo-root wins over --root: --root points at the board worktree, which
    // is not the project. The name is never used for this — codexServerName
    // lowercases, slugifies and truncates to 32 chars, and basenames are not
    // unique on a machine.
    expect(byName(GLOBAL, "kanmer-alpha").projectRoot).toBe(
      "C:\\Users\\PC\\Documents\\GitHub\\alpha",
    );
    expect(byName(GLOBAL, "kanmer-pegasus").projectRoot).toBe(
      "C:\\Users\\PC\\Documents\\GitHub\\pegasus",
    );
  });

  it("two entries whose basenames collide are still told apart by their roots", () => {
    // `codexServerName` would produce the same slug for both of these, which is
    // why the has-a-replacement probe keys on the recorded path instead.
    const toml = [
      "[mcp_servers.kanmer-app]",
      "args = ['s.cjs', '--repo-root', '/home/me/one/app']",
      "[mcp_servers.kanmer-app-2]",
      "args = ['s.cjs', '--repo-root', '/home/me/two/app']",
      "",
    ].join("\n");
    expect(legacyCodexEntries(toml).map((e) => e.projectRoot)).toEqual([
      "/home/me/one/app",
      "/home/me/two/app",
    ]);
  });

  it("degrades to nothing rather than guessing on input it cannot read", () => {
    expect(legacyCodexEntries(null)).toEqual([]);
    expect(legacyCodexEntries("")).toEqual([]);
    expect(legacyCodexEntries("this is [not valid toml")).toEqual([]);
    expect(legacyCodexEntries('model = "o3"')).toEqual([]);
    // A bare global `kanmer` is not ours: Kanmer only ever wrote `kanmer-<slug>`
    // globally, so an unprefixed one is the user's own hand-registration.
    expect(legacyCodexEntries("[mcp_servers.kanmer]\ncommand = 'x'\n")).toEqual([]);
  });

  it("ignores a name outside the slug alphabet rather than shelling out with it", () => {
    // TOML *quoted* keys may legally hold anything, and the name is
    // interpolated into a `codex mcp remove` command line. `codexServerName`
    // can only ever have produced [A-Za-z0-9_-], so anything else is both not
    // ours and not something to hand a shell.
    const hostile = [
      `[mcp_servers."kanmer-x; rm -rf ~"]`,
      "args = ['s.cjs', '--repo-root', '/tmp/x']",
      "[mcp_servers.'kanmer-$(whoami)']",
      "args = ['s.cjs', '--repo-root', '/tmp/y']",
      "",
    ].join("\n");
    expect(legacyCodexEntries(hostile)).toEqual([]);
  });

  it("reports an entry with no recoverable root instead of acting on it", () => {
    const urlOnly = '[mcp_servers.kanmer-remote]\nurl = "https://example.test/mcp"\n';
    const entry = byName(urlOnly, "kanmer-remote");
    expect(entry.projectRoot).toBeNull();
    const finding = classifyLegacyCodexEntry(entry, null);
    expect(finding.status).toBe("unknown-root");
    expect(finding.removable).toBe(false);
  });

  it("an entry whose args carry no --root at all is the same case", () => {
    const noRoot = "[mcp_servers.kanmer-x]\nargs = ['s.cjs', '--verbose']\n";
    expect(byName(noRoot, "kanmer-x").projectRoot).toBeNull();
  });

  it("THE PEGASUS CASE: a project with no replacement is reported and never removable", () => {
    // The live original: `pegasus/.codex/config.toml` held only an unrelated
    // server, so the orphaned global entry was pegasus's *only* working
    // registration. Removing it blind would have silently cut board access to a
    // project the user was not looking at.
    const finding = classifyLegacyCodexEntry(byName(GLOBAL, "kanmer-pegasus"), {
      exists: true,
      hasProjectRegistration: false,
      trust: "trusted",
    });
    expect(finding.status).toBe("no-replacement");
    expect(finding.removable).toBe(false);
    expect(finding.recommended).toBe(false);
    // The warning has to name the project and say what to do about it.
    expect(finding.detail).toContain("pegasus");
    expect(finding.detail).toMatch(/Connect/);
  });

  it("drains only an entry whose project has a replacement codex will actually load", () => {
    const entry = byName(GLOBAL, "kanmer-alpha");
    const drainable = classifyLegacyCodexEntry(entry, {
      exists: true,
      hasProjectRegistration: true,
      trust: "trusted",
    });
    expect(drainable.status).toBe("drainable");
    expect(drainable.removable).toBe(true);
    expect(drainable.recommended).toBe(true);

    // A replacement codex will not load is not a replacement. Trust is recorded
    // globally and gates project config, so `codexTrustFromConfig` gates this.
    for (const trust of ["untrusted", "maybe-via-ancestor", "unknown"] as const) {
      const held = classifyLegacyCodexEntry(entry, {
        exists: true,
        hasProjectRegistration: true,
        trust,
      });
      expect(held.status).toBe("untrusted");
      expect(held.removable).toBe(false);
    }
  });

  it("a vanished project folder is removable but never pre-selected", () => {
    // Not the protected case — a folder that is not there has no registration
    // to cut. But the probe can be wrong about an unmounted drive, so it never
    // rides along with the recommended selection, and the row says so.
    const finding = classifyLegacyCodexEntry(byName(GLOBAL, "kanmer-alpha"), {
      exists: false,
      hasProjectRegistration: false,
      trust: "unknown",
    });
    expect(finding.status).toBe("orphaned");
    expect(finding.removable).toBe(true);
    expect(finding.recommended).toBe(false);
    expect(finding.detail).toMatch(/not mounted/);
  });

  it("is a no-op on the second run, and still holds back what it held back", () => {
    // Run one drains kanmer-alpha and refuses kanmer-pegasus. Run two sees the
    // file codex left behind: the drained entry is gone, the held-back one is
    // still there, still reported, still not removable (ADR-0010).
    const afterFirstRun = GLOBAL.split("[mcp_servers.kanmer-alpha]")
      .join("[mcp_servers.removed-by-codex]");
    const second = legacyCodexEntries(afterFirstRun);
    expect(second.map((e) => e.name)).toEqual(["kanmer-pegasus"]);
    expect(
      classifyLegacyCodexEntry(second[0]!, {
        exists: true,
        hasProjectRegistration: false,
        trust: "trusted",
      }).removable,
    ).toBe(false);

    // And once every project has reconnected there is nothing left to find, so
    // the panel renders nothing at all.
    expect(legacyCodexEntries(GLOBAL.replace(/kanmer-/g, "other-"))).toEqual([]);
  });
});

describe("project skill installs (FRD-012 R2)", () => {
  it("keeps OpenCode project skills while Antigravity delegates to its plugin", () => {
    const opencode = providerById("opencode")!.install;
    const antigravity = providerById("antigravity")!.install;
    if (opencode.kind !== "copySkills" || antigravity.kind !== "plugin") {
      throw new Error("unreachable");
    }
    expect(opencode).toMatchObject({ skillsScope: "project", skillsDir: ".opencode/skills" });
    expect(antigravity).toMatchObject({ scope: "user", legacySkillsDir: ".agents/skills" });
  });

  it("Grok no longer copies a project skill tree", () => {
    const install = providerById("grok")!.install;
    expect(install.kind).toBe("plugin");
  });
});

describe("codex trust detection", () => {
  const cfg = [
    "[projects.'c:\\users\\me\\documents\\github']",
    'trust_level = "trusted"',
    // A *basic* (double-quoted) TOML string, so backslashes must be escaped —
    // real configs mix this with the single-quoted literal form above.
    '[projects."c:\\\\users\\\\me\\\\exact"]',
    'trust_level = "trusted"',
    "[projects.'c:\\users\\me\\revoked']",
    'trust_level = "untrusted"',
    "",
  ].join("\n");

  it("matches an exact path case-insensitively, across quote styles and separators", () => {
    // Real configs lowercase Windows paths and mix ' and " quoting.
    expect(codexTrustFromConfig(cfg, "C:\\Users\\Me\\Exact")).toBe("trusted");
    expect(codexTrustFromConfig(cfg, "C:/Users/Me/Exact/")).toBe("trusted");
  });

  it("reports a trusted parent as a maybe, never as trusted", () => {
    // Whether codex matches the nearest ancestor is undocumented; claiming
    // "trusted" on a guess would be worse than saying we are unsure.
    expect(codexTrustFromConfig(cfg, "C:/Users/Me/Documents/GitHub/kanmer")).toBe(
      "maybe-via-ancestor",
    );
  });

  it("treats an unlisted or explicitly untrusted folder as untrusted", () => {
    expect(codexTrustFromConfig(cfg, "C:/Users/Me/Revoked")).toBe("untrusted");
    expect(codexTrustFromConfig(cfg, "C:/somewhere/else")).toBe("untrusted");
  });

  it("does not guess when the config is missing or unparseable", () => {
    expect(codexTrustFromConfig(null, "/x")).toBe("unknown");
    expect(codexTrustFromConfig("[not valid", "/x")).toBe("unknown");
  });

  it("only warns when there is something to warn about", () => {
    expect(codexTrustNote("trusted")).toBeNull();
    expect(codexTrustNote("untrusted")).toMatch(/trust the folder/);
    expect(codexTrustNote("maybe-via-ancestor")).toMatch(/parent folder/);
    expect(codexTrustNote("unknown")).toMatch(/Could not read/);
  });
});

describe("skills stamp", () => {
  it("puts the version on line 1 so an older Kanmer cannot read a roster line as a version", () => {
    const stamp = formatSkillsStamp("0.2.0", ["kanmer-plan", "kanmer-auto"]);
    expect(stamp.split("\n")[0]).toBe("0.2.0");
    expect(parseSkillsStamp(stamp)).toEqual({ version: "0.2.0", roster: ["kanmer-auto", "kanmer-plan"] });
  });

  it("round-trips, sorting and de-duplicating the roster and ending with a newline", () => {
    const stamp = formatSkillsStamp("1.0.0", ["b", "a", "b", " ", "c "]);
    expect(stamp).toBe("1.0.0\nskills:\na\nb\nc\n");
    expect(parseSkillsStamp(stamp).roster).toEqual(["a", "b", "c"]);
  });

  it("reports a legacy bare-version stamp as an unknown roster, never an empty one", () => {
    // The distinction is load-bearing: null means "I do not know what I own
    // here", which must make callers delete less, not delete everything.
    expect(parseSkillsStamp("0.1.0\n")).toEqual({ version: "0.1.0", roster: null });
    expect(parseSkillsStamp("0.1.0")).toEqual({ version: "0.1.0", roster: null });
    expect(parseSkillsStamp("")).toEqual({ version: "", roster: null });
  });

  it("represents a genuinely empty roster distinctly from a legacy stamp", () => {
    expect(parseSkillsStamp(formatSkillsStamp("0.2.0", []))).toEqual({ version: "0.2.0", roster: [] });
  });

  it("tolerates CRLF, blank lines and surrounding whitespace", () => {
    expect(parseSkillsStamp("  0.2.0 \r\n\r\nskills:\r\n kanmer-plan \r\n\r\n")).toEqual({
      version: "0.2.0",
      roster: ["kanmer-plan"],
    });
  });

  it("treats a stamp it cannot recognise as rosterless rather than guessing", () => {
    expect(parseSkillsStamp('{"version":"0.2.0"}').roster).toBeNull();
  });

  it("keeps the tombstone list closed at the two paths retired by 130f837", () => {
    // This assertion is the guard on the decision, not on the code: the list
    // repairs pre-roster installs and never grows — future retirements are the
    // recorded roster's job, and a growing list would be a second source of
    // truth about what Kanmer owns.
    expect([...RETIRED_SKILL_PATHS]).toEqual([
      "kanmer-import",
      "kanmer-research/assets/impact-template.md",
    ]);
  });
});

describe("copySkills destinations stay gitignored (GUI-083)", () => {
  // apps/gui/src/main -> repo root is four levels up.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
  const gitignoreLines = fs
    .readFileSync(path.join(repoRoot, ".gitignore"), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

  /**
   * A `copySkills` destination is ignored only if `.gitignore` carries the
   * exact directory rule (`<dir>/`) — a bare-prefix or substring match would
   * pass even when the real ignore line is missing, which defeats the point.
   */
  function isDirIgnored(dir: string): boolean {
    const rule = `${dir.replace(/\/+$/, "")}/`;
    return gitignoreLines.includes(rule);
  }

  const skillsDirs = [
    ...new Set(
      PROVIDERS.filter((p) => p.install.kind === "copySkills")
        .map((p) => (p.install as { skillsDir?: string }).skillsDir)
        .filter((dir): dir is string => Boolean(dir)),
    ),
  ];

  it("found copySkills destinations to check (guards against silently checking nothing)", () => {
    expect(skillsDirs.length).toBeGreaterThan(0);
  });

  it.each(skillsDirs)("copySkills destination %s has a matching .gitignore rule", (dir) => {
    expect(isDirIgnored(dir)).toBe(true);
  });

  it("a copySkills destination with no ignore rule is caught, not silently passed", () => {
    // This is the check on the check itself (GUI-083): a helper identical to
    // the one above, run against a destination deliberately absent from
    // .gitignore, must report it as NOT ignored — proving the assertion style
    // above actually fails on a real gap rather than trivially passing.
    expect(isDirIgnored(".totally-fake-provider/skills")).toBe(false);
  });
});

describe("marketplace references match the manifests that define them (MCP-013)", () => {
  // apps/gui/src/main -> repo root is four levels up.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

  /**
   * The two marketplace manifests, in the two schemas their hosts read.
   *
   * They declare **different** marketplace names — `kanmer` and
   * `kanmer-plugins` — and that is correct rather than drift: they are separate
   * files in separate schemas, no caller ever sees both, and renaming codex's
   * would relocate every existing user's plugin cache
   * (`~/.codex/plugins/cache/kanmer-plugins/kanmer/<version>`). FRD-012 R2
   * records the divergence as legitimate.
   *
   * So this suite does not reconcile the names. It pins each hard-coded
   * `<plugin>@<marketplace>` string in PROVIDERS to the manifest that defines
   * it — which is the failure the divergence actually invites: an "install the
   * plugin" command copied from one host to the other, correct-looking and
   * wrong. Nothing checked either string against either file before.
   */
  const MANIFESTS = {
    claude: {
      /** Claude Code's schema: `plugins[].source` is a string. */
      file: ".claude-plugin/marketplace.json",
      read: (json: Record<string, unknown>) => ({
        marketplace: json.name as string,
        plugin: (json.plugins as { name: string; source: string }[])[0]!.name,
        source: (json.plugins as { name: string; source: string }[])[0]!.source,
      }),
    },
    codex: {
      /** The agents schema: `plugins[].source` is an object with a `path`. */
      file: ".agents/plugins/marketplace.json",
      read: (json: Record<string, unknown>) => ({
        marketplace: json.name as string,
        plugin: (json.plugins as { name: string; source: { path: string } }[])[0]!.name,
        source: (json.plugins as { name: string; source: { path: string } }[])[0]!.source.path,
      }),
    },
  } as const;

  /** Every command the provider would run, for an arbitrary marketplace root. */
  function commandsFor(id: "claude" | "codex"): string[] {
    const provider = providerById(id)!;
    expect(provider.install.kind).toBe("marketplace");
    return (
      provider.install as { marketplaceCommands: (root: string) => string[] }
    ).marketplaceCommands("/MARKETPLACE_ROOT");
  }

  it.each(["claude", "codex"] as const)(
    "%s references the marketplace and plugin names its own manifest declares",
    (id) => {
      const spec = MANIFESTS[id];
      const json = JSON.parse(fs.readFileSync(path.join(repoRoot, spec.file), "utf8"));
      const { marketplace, plugin } = spec.read(json);
      const commands = commandsFor(id).join("\n");

      expect(commands).toContain(`${plugin}@${marketplace}`);
    },
  );

  it.each(["claude", "codex"] as const)("%s's manifest points at a plugin that exists", (id) => {
    const spec = MANIFESTS[id];
    const json = JSON.parse(fs.readFileSync(path.join(repoRoot, spec.file), "utf8"));
    const { source } = spec.read(json);
    // Relative to the marketplace root, which is the repo root here and
    // `resources/` in the packaged app — connect.ts's marketplaceRoot() is
    // correct in both because the packed layout keeps these two segments.
    expect(source).toBe("./plugins/kanmer");
    expect(fs.existsSync(path.join(repoRoot, source))).toBe(true);
  });

  it.each(["claude", "codex"] as const)(
    "%s is pointed at the marketplace root, not the plugin directory",
    (id) => {
      // The defect itself (MCP-013): connect.ts passed pluginRoot(), so
      // `plugin marketplace add …/plugins/kanmer` exited 1 with "Marketplace
      // file not found". The commands must carry the root they are given, whole
      // — nothing may append `plugins/kanmer` back on.
      const commands = commandsFor(id);
      const add = commands.find((c) => c.includes("marketplace add"));
      expect(add).toBeDefined();
      expect(add).toContain("/MARKETPLACE_ROOT");
      expect(add).not.toContain("plugins/kanmer");
    },
  );

  it("a reference naming the wrong marketplace is caught, not silently passed", () => {
    // The check on the check, run through the SAME predicate the assertions
    // above use — otherwise this only proves two strings differ, which they
    // would even if the predicate were `expect(true).toBe(true)`.
    const matches = (commands: string, plugin: string, marketplace: string) =>
      commands.includes(`${plugin}@${marketplace}`);

    const readRef = (id: "claude" | "codex") => {
      const spec = MANIFESTS[id];
      return spec.read(JSON.parse(fs.readFileSync(path.join(repoRoot, spec.file), "utf8")));
    };
    const claude = readRef("claude");
    const codex = readRef("codex");

    // The names really do differ, so a cross-host copy is a real hazard.
    expect(codex.marketplace).not.toBe(claude.marketplace);

    // Claude's real commands satisfy the predicate for Claude's manifest…
    expect(matches(commandsFor("claude").join("\n"), claude.plugin, claude.marketplace)).toBe(true);
    // …and fail it for codex's, which is the mistake being guarded against:
    // `codex plugin add kanmer@kanmer` looks right and installs nothing.
    expect(matches(commandsFor("claude").join("\n"), codex.plugin, codex.marketplace)).toBe(false);
    expect(matches("codex plugin add kanmer@kanmer", codex.plugin, codex.marketplace)).toBe(false);
  });
});
