import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyManagedBlock } from "./agentsBlock.js";
import { remoteProjectIdentity } from "./remoteAccess/identity.js";
import { codexPortableInvocation, providerById, q } from "./providers.js";
import { removeTreeWithRetry } from "@kanmer/core";

vi.mock("electron", () => ({ app: { isPackaged: false, getAppPath: () => process.cwd() } }));

/**
 * A synthetic marketplace provider, resolvable by id, so the install path can be
 * driven with commands this test owns.
 *
 * Only `providerById` is overridden, and only for ids the real registry does not
 * know — every other test in this file keeps the real providers.
 */
vi.mock("./providers.js", async (importActual) => {
  const actual = await importActual<typeof import("./providers.js")>();
  return {
    ...actual,
    providerById: (id: string) => testProviders.get(id) ?? actual.providerById(id),
  };
});

const testProviders = new Map<string, AgentProvider>();

const {
  claudeMarketplaceStableRoot,
  connectAgent,
  disconnectAgent,
  marketplaceRoot,
  pluginRoot,
  probeCodexLauncher,
  reconcileProviderRegistration,
  reconcileSkills,
  removeBundledSkillsOnly,
  serverInvocation,
  skillsStatus,
  updateSkills,
} = await import("./connect.js");
type AgentProvider = import("./providers.js").AgentProvider;
type ProviderId = import("./providers.js").ProviderId;
type MarketplaceHostState = import("./providers.js").MarketplaceHostState;
type MarketplaceVersionCheck = import("./providers.js").MarketplaceVersionCheck;
const roots: string[] = [];
afterEach(async () => {
  // Every test that stages Claude's marketplace points LOCALAPPDATA at a temp
  // directory first, so no test can write into the operator's real
  // `%LOCALAPPDATA%\Kanmer\claude-marketplace`.
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map((root) => removeTreeWithRetry(root)));
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "kanmer-connect-"));
  roots.push(root);
  return root;
}

/** Write `{ "<skill>/<relative path>": contents }` under a root. */
async function writeTree(root: string, files: Record<string, string>): Promise<void> {
  for (const [rel, contents] of Object.entries(files)) {
    const target = join(root, ...rel.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
}

const missing = async (...segments: string[]) =>
  expect(readFile(join(...segments), "utf8")).rejects.toThrow();

/** Every project registration now preflights the installer-owned launcher (GUI-149); tests that are not about the probe pass this. */
const probeOk = async () => ({ stdout: "Kanmer MCP launcher: healthy\n", stderr: "" });

const antigravityAbsentCommandRunner = async (command: string) => {
  if (command === "agy plugin list") return { stdout: "No imported plugins.", stderr: "" };
  throw new Error(`unexpected command: ${command}`);
};

describe("bundled skill removal", () => {
  it("removes only bundled children and preserves unknown skills and files byte-for-byte", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-connect-"));
    roots.push(root);
    const bundled = join(root, "bundled");
    const destination = join(root, ".grok", "skills");
    await mkdir(join(bundled, "kanmer-review"), { recursive: true });
    await mkdir(join(destination, "kanmer-review"), { recursive: true });
    await mkdir(join(destination, "mycompany-review"), { recursive: true });
    await writeFile(join(destination, "mycompany-review", "note.txt"), "keep exactly\n");
    await writeFile(join(destination, "user.txt"), "also keep\n");
    await writeFile(join(destination, ".kanmer-skills-version"), "1\n");

    await removeBundledSkillsOnly(root, ".grok/skills", bundled);

    await expect(readFile(join(destination, "mycompany-review", "note.txt"), "utf8")).resolves.toBe("keep exactly\n");
    await expect(readFile(join(destination, "user.txt"), "utf8")).resolves.toBe("also keep\n");
    await expect(readFile(join(destination, "kanmer-review"), "utf8")).rejects.toThrow();
    await expect(readFile(join(destination, ".kanmer-skills-version"), "utf8")).rejects.toThrow();
  });
});

describe("registration ownership (GUI-079)", () => {
  /** A project `.mcp.json` exactly as `claude mcp add kanmer -s project` writes it. */
  const CLAUDE_MCP_JSON = `${JSON.stringify(
    {
      mcpServers: {
        kanmer: {
          type: "stdio",
          command: "C:\\Programs\\Kanmer\\Kanmer.exe",
          args: ["kanmer-mcp.cjs", "--root", "C:\\proj\\.worktrees\\kanmer"],
          env: { ELECTRON_RUN_AS_NODE: "1" },
        },
      },
    },
    null,
    2,
  )}\n`;

  it("disconnecting grok leaves Claude's .mcp.json byte-intact", async () => {
    // The defect: grok merged `mcpServers.kanmer` into `.mcp.json` — the same
    // file and the same key Claude's project registration uses — and its
    // unmerge deleted that key unconditionally. So disconnecting grok
    // unregistered Claude. grok now owns `.grok/config.toml` and Kanmer does
    // not touch `.mcp.json` for grok in either direction.
    const root = await mkdtemp(join(tmpdir(), "kanmer-connect-"));
    roots.push(root);
    await writeFile(join(root, ".mcp.json"), CLAUDE_MCP_JSON);
    await mkdir(join(root, ".grok"), { recursive: true });
    await writeFile(
      join(root, ".grok", "config.toml"),
      "[mcp_servers.kanmer]\ncommand = 'Kanmer.exe'\n\n[mcp_servers.linear]\nurl = 'https://mcp.linear.app/mcp'\n",
    );

    let installed = true;
    const commandRunner = async (command: string) => {
      if (command === "grok plugin list") {
        return { stdout: installed ? "kanmer (user, enabled)" : "No plugins installed.", stderr: "" };
      }
      if (command === "grok plugin uninstall kanmer --confirm") {
        installed = false;
        return { stdout: "Uninstalled 1 plugin(s)", stderr: "" };
      }
      if (command === "grok inspect") {
        return { stdout: installed ? "kanmer (user, enabled) 12 skills, 1 MCPs" : "", stderr: "" };
      }
      throw new Error(`unexpected command: ${command}`);
    };
    const result = await disconnectAgent("grok", root, { commandRunner });

    expect(result.ok).toBe(true);
    await expect(readFile(join(root, ".mcp.json"), "utf8")).resolves.toBe(CLAUDE_MCP_JSON);
    // Its legacy file loses only the kanmer entry.
    const grokConfig = await readFile(join(root, ".grok", "config.toml"), "utf8");
    expect(grokConfig).not.toContain("mcp_servers.kanmer");
    expect(grokConfig).toContain("mcp_servers.linear");
  });

  it("retains the shared block while Claude's project registration is connected", async () => {
    // The shared block belongs to every connected host. A native-plugin
    // cleanup must therefore notice Claude's project registration even though
    // Claude is not a copy-skills peer.
    const root = await mkdtemp(join(tmpdir(), "kanmer-connect-"));
    roots.push(root);
    await writeFile(join(root, ".mcp.json"), CLAUDE_MCP_JSON);
    await mkdir(join(root, ".agents"), { recursive: true });
    await writeFile(
      join(root, ".agents", "mcp_config.json"),
      JSON.stringify({ mcpServers: { kanmer: {} } }),
    );
    await writeFile(join(root, "AGENTS.md"), "# Guide\n");

    const result = await disconnectAgent("antigravity", root, { commandRunner: antigravityAbsentCommandRunner });

    expect(result.ok).toBe(true);
    expect(result.output).toContain("another connected host");
  });
});

describe("Grok native plugin lifecycle (MCP-014)", () => {
  it("preflights, installs, verifies with inspect, then retires legacy project state", async () => {
    const root = await tempRoot();
    const bundle = join(root, "plugin");
    await writeTree(root, {
      "plugin/.claude-plugin/plugin.json": "{}\n",
      "plugin/skills/kanmer-plan/SKILL.md": "skill\n",
      "plugin/mcp/claude.mcp.json": '{"mcpServers":{"kanmer":{"args":["${CLAUDE_PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"]}}}\n',
      "plugin/mcp/kanmer-mcp.cjs": "\n",
    });
    await writeTree(root, {
      ".kanmer/version.json": JSON.stringify({ format: 2 }),
      ".grok/config.toml":
        "[mcp_servers.kanmer]\ncommand = 'old'\n\n[mcp_servers.linear]\nurl = 'https://mcp.linear.app/mcp'\n",
      ".grok/skills/old-skill/SKILL.md": "old\n",
      ".grok/skills/.kanmer-skills-version": "0.2.0\nskills:\nold-skill\n",
      "AGENTS.md": applyManagedBlock("# user\n"),
    });
    const seen: string[] = [];
    const commandRunner = async (command: string) => {
      seen.push(command);
      if (command === "grok --version") return { stdout: "grok 1.0.5", stderr: "" };
      if (command === "grok plugin --help") return { stdout: "install uninstall", stderr: "" };
      if (command === "node --version") return { stdout: "v24.15.0", stderr: "" };
      if (command.startsWith("grok plugin install ")) {
        const match = command.match(/^grok plugin install (.+) --trust$/);
        expect(match).not.toBeNull();
        const stagedRoot = match![1].replace(/^"|"$/g, "");
        const descriptor = JSON.parse(await readFile(join(stagedRoot, "mcp", "claude.mcp.json"), "utf8")) as { mcpServers: { kanmer: { env?: Record<string, string> } } };
        expect(descriptor.mcpServers.kanmer.env).toEqual({ KANMER_BOARD_BRANCH: "release-board" });
        return { stdout: "Installed 1 plugin(s)", stderr: "" };
      }
      if (command === "grok inspect") return { stdout: "kanmer (user, enabled) 12 skills, 1 MCPs", stderr: "" };
      if (command.startsWith("grok -p ")) {
        expect(await readFile(join(root, ".grok", "config.toml"), "utf8")).not.toContain("mcp_servers.kanmer");
        const identity = remoteProjectIdentity({ boardRoot: root, repoRoot: root, format: 2, boardSource: "default" });
        return {
          stdout: JSON.stringify({
            project_fingerprint: identity.fingerprint,
            board_root: identity.boardRoot,
            repo_root: identity.repoRoot,
            format: identity.format,
            board_expected_branch: "release-board",
            board_actual_branch: "release-board",
            board_on_expected_branch: true,
          }),
          stderr: "",
        };
      }
      throw new Error(`unexpected command: ${command}`);
    };

    const result = await connectAgent("grok", root, root, { commandRunner, pluginRootPath: bundle }, " release-board ");

    expect(result.ok).toBe(true);
    expect(seen.slice(0, 3)).toEqual(["grok --version", "grok plugin --help", "node --version"]);
    expect(seen[3]).toContain("grok plugin install");
    expect(seen[3]).toContain("--trust");
    expect(seen[5]).toContain("grok -p");
    expect(result.output).toContain("inspect: kanmer (user, enabled)");
    await expect(readFile(join(bundle, "mcp", "claude.mcp.json"), "utf8")).resolves.not.toContain("KANMER_BOARD_BRANCH");
    expect(await readFile(join(root, ".grok", "config.toml"), "utf8")).toContain("mcp_servers.linear");
    await missing(root, ".grok", "skills", "old-skill", "SKILL.md");
    expect(await readFile(join(root, "AGENTS.md"), "utf8")).toBe("# user\n");
  });

  it("does not retire legacy state when inspect cannot prove the plugin", async () => {
    const root = await tempRoot();
    const bundle = join(root, "plugin");
    await writeTree(root, {
      "plugin/.claude-plugin/plugin.json": "{}\n",
      "plugin/skills/kanmer-plan/SKILL.md": "skill\n",
      "plugin/mcp/claude.mcp.json": '{"mcpServers":{"kanmer":{"args":["${CLAUDE_PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"]}}}\n',
      "plugin/mcp/kanmer-mcp.cjs": "\n",
    });
    await writeTree(root, {
      ".grok/config.toml": "[mcp_servers.kanmer]\ncommand = 'old'\n",
      ".grok/skills/old-skill/SKILL.md": "old\n",
      ".grok/skills/.kanmer-skills-version": "0.2.0\nskills:\nold-skill\n",
    });
    const commandRunner = async (command: string) => {
      if (command === "grok inspect") return { stdout: "", stderr: "" };
      return { stdout: "ok", stderr: "" };
    };
    const result = await connectAgent("grok", root, root, { commandRunner, pluginRootPath: bundle });
    expect(result.ok).toBe(false);
    expect(result.output).toContain("No legacy project state was changed");
    expect(await readFile(join(root, ".grok", "config.toml"), "utf8")).toContain("mcp_servers.kanmer");
    await expect(readFile(join(root, ".grok", "skills", "old-skill", "SKILL.md"), "utf8")).resolves.toBe("old\n");
  });
});

describe("Antigravity native plugin lifecycle (MCP-015)", () => {
  it("preflights, validates, installs, proves a bound tool call, then retires legacy state", async () => {
    const root = await tempRoot();
    const boardRoot = join(root, "safe & hostile $(whoami) `tick` ;");
    const bundle = join(root, "plugin");
    await writeTree(root, {
      "plugin/plugin.json": '{"name":"kanmer","version":"0.3.3","skills":"./skills/"}\n',
      "plugin/mcp_config.json": '{"mcpServers":{"kanmer":{"command":"cmd.exe","args":["/d","/v:on","/s","/c","setlocal EnableDelayedExpansion&&set KANMER_PROVIDER_CWD=!CD!&&pushd !LOCALAPPDATA!\\\\Kanmer\\\\bin&&call kanmer-mcp.cmd"]}}}\n',
      "plugin/skills/kanmer-plan/SKILL.md": "skill\n",
      "plugin/mcp/kanmer-mcp.cjs": "\n",
    });
    await writeTree(root, {
      ".agents/mcp_config.json": JSON.stringify({ mcpServers: { kanmer: { command: "old" }, other: {} } }),
      ".agents/skills/old-skill/SKILL.md": "old\n",
      ".agents/skills/.kanmer-skills-version": "0.2.0\nskills:\nold-skill\n",
      "AGENTS.md": applyManagedBlock("# user\n"),
    });
    const seen: { file: string; args: string[] }[] = [];
    const nativeCommandRunner = async (file: string, args: string[]) => {
      seen.push({ file, args });
      if (file === "agy" && args[0] === "--version") return { stdout: "1.1.14", stderr: "" };
      if (file === "agy" && args[0] === "plugin" && args[1] === "--help") return { stdout: "install validate list uninstall", stderr: "" };
      if (file === "cmd.exe") return { stdout: "Kanmer MCP launcher: healthy", stderr: "" };
      if (file === "agy" && args[0] === "plugin" && args[1] === "validate") {
        const descriptor = JSON.parse(await readFile(join(args[2], "mcp_config.json"), "utf8")) as { mcpServers: { kanmer: { env?: Record<string, string> } } };
        expect(descriptor.mcpServers.kanmer.env).toEqual({ KANMER_BOARD_BRANCH: "release-board" });
        return { stdout: "[ok] plugin", stderr: "" };
      }
      if (file === "agy" && args[0] === "plugin" && args[1] === "install") return { stdout: "Installed plugin kanmer", stderr: "" };
      if (file === "agy" && args[0] === "plugin" && args[1] === "list") return { stdout: "kanmer", stderr: "" };
      if (file === "agy" && args[0] === "--add-dir") {
        const isolated = JSON.parse(await readFile(join(root, ".agents", "mcp_config.json"), "utf8")) as { mcpServers?: Record<string, unknown> };
        expect(isolated.mcpServers?.kanmer).toBeUndefined();
        const identity = remoteProjectIdentity({ boardRoot, repoRoot: root, format: 3, boardSource: "default" });
        return {
          stdout: JSON.stringify({
            project_fingerprint: identity.fingerprint,
            board_root: identity.boardRoot,
            repo_root: identity.repoRoot,
            format: identity.format,
            board_expected_branch: "release-board",
            board_actual_branch: "release-board",
            board_on_expected_branch: true,
          }),
          stderr: "",
        };
      }
      throw new Error(`unexpected command: ${file} ${args.join(" ")}`);
    };

    const result = await connectAgent("antigravity", root, boardRoot, { nativeCommandRunner, pluginRootPath: bundle }, " release-board ");

    expect(result.ok).toBe(true);
    expect(seen.slice(0, 4)).toEqual([
      { file: "agy", args: ["--version"] },
      { file: "agy", args: ["plugin", "--help"] },
      { file: "cmd.exe", args: ["/d", "/v:on", "/s", "/c", "setlocal EnableDelayedExpansion&&set KANMER_PROVIDER_CWD=!CD!&&pushd !LOCALAPPDATA!\\Kanmer\\bin&&call kanmer-mcp.cmd --probe"] },
      { file: "agy", args: ["plugin", "validate", expect.stringContaining("kanmer-native-plugin-")] },
    ]);
    expect(seen[4]).toEqual({ file: "agy", args: ["plugin", "install", expect.stringContaining("kanmer-native-plugin-")] });
    expect(seen[4].args[2]).not.toBe(bundle);
    expect(seen[5]).toEqual({ file: "agy", args: ["plugin", "list"] });
    expect(seen[6].file).toBe("agy");
    expect(seen[6].args.slice(0, 2)).toEqual(["--add-dir", boardRoot]);
    expect(seen[6].args[2]).toBe("-p");
    expect(result.output).toContain("functional get_status");
    await expect(readFile(join(bundle, "mcp_config.json"), "utf8")).resolves.not.toContain("KANMER_BOARD_BRANCH");
    const legacy = JSON.parse(await readFile(join(root, ".agents", "mcp_config.json"), "utf8"));
    expect(legacy.mcpServers.kanmer).toBeUndefined();
    expect(legacy.mcpServers.other).toBeTruthy();
    await missing(root, ".agents", "skills", "old-skill", "SKILL.md");
    await expect(readFile(join(root, "AGENTS.md"), "utf8")).resolves.toBe("# user\n");
  });

  it("does not retire legacy project state when the bound tool call cannot be proven", async () => {
    const root = await tempRoot();
    const bundle = join(root, "plugin");
    await writeTree(root, {
      "plugin/plugin.json": '{"name":"kanmer","version":"0.3.3","skills":"./skills/"}\n',
      "plugin/mcp_config.json": '{"mcpServers":{"kanmer":{"command":"cmd.exe","args":["/d","/v:on","/s","/c","setlocal EnableDelayedExpansion&&set KANMER_PROVIDER_CWD=!CD!&&pushd !LOCALAPPDATA!\\\\Kanmer\\\\bin&&call kanmer-mcp.cmd"]}}}\n',
      "plugin/skills/kanmer-plan/SKILL.md": "skill\n",
      "plugin/mcp/kanmer-mcp.cjs": "\n",
      ".agents/mcp_config.json": JSON.stringify({ mcpServers: { kanmer: { command: "old" } } }),
    });
    const nativeCommandRunner = async (file: string, args: string[]) => {
      if (file === "agy" && args[0] === "plugin" && args[1] === "list") return { stdout: "kanmer", stderr: "" };
      if (file === "agy" && args[0] === "--add-dir") return { stdout: "I could not call the tool, but KANMER_GET_STATUS_OK", stderr: "" };
      return { stdout: "ok", stderr: "" };
    };
    const result = await connectAgent("antigravity", root, root, { nativeCommandRunner, pluginRootPath: bundle });
    expect(result.ok).toBe(false);
    expect(result.output).toContain("No legacy project state was changed");
    expect(await readFile(join(root, ".agents", "mcp_config.json"), "utf8")).toContain("kanmer");
  });
});

describe("disconnect peer safety", () => {
  it("retains the shared block when another copy-skills host has malformed registration", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-connect-"));
    roots.push(root);
    await mkdir(join(root, ".agents"), { recursive: true });
    await writeFile(join(root, ".agents", "mcp_config.json"), JSON.stringify({ mcpServers: { kanmer: {} } }));
    await writeFile(join(root, "opencode.json"), "{ malformed");
    const result = await disconnectAgent("antigravity", root, { commandRunner: antigravityAbsentCommandRunner });
    expect(result.ok).toBe(true);
    expect(result.output).toContain("AGENTS.md block retained for another connected host");
  });
});

describe("install reconciles the destination instead of overlaying it", () => {
  it("prunes a skill the roster recorded but the bundle no longer ships", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".agents", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "new plan\n" });
    await writeTree(dest, {
      "kanmer-plan/SKILL.md": "old plan\n",
      "kanmer-retired/SKILL.md": "retired\n",
      "mycompany-review/note.txt": "keep exactly\n",
      "user.txt": "also keep\n",
      ".kanmer-skills-version": "0.1.0\nskills:\nkanmer-plan\nkanmer-retired\n",
    });

    const result = await reconcileSkills(dest, bundle, "0.2.0");

    expect(result.removed).toEqual(["kanmer-retired"]);
    expect(result.replaced).toEqual(["kanmer-plan"]);
    expect(result.installed).toEqual([]);
    await missing(dest, "kanmer-retired", "SKILL.md");
    await expect(readFile(join(dest, "kanmer-plan", "SKILL.md"), "utf8")).resolves.toBe("new plan\n");
    // The invariant this ticket must strengthen, not weaken, while gaining the
    // power to delete: a skill Kanmer did not write is untouched.
    await expect(readFile(join(dest, "mycompany-review", "note.txt"), "utf8")).resolves.toBe("keep exactly\n");
    await expect(readFile(join(dest, "user.txt"), "utf8")).resolves.toBe("also keep\n");
  });

  it("replaces an owned folder wholesale, so a file the bundle dropped cannot outlive it", async () => {
    // The second shape of retirement: impact-template.md was renamed inside a
    // folder that survived, and a merging `cp` leaves the old name behind.
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".agents", "skills");
    await writeTree(bundle, { "kanmer-research/assets/files-template.md": "files\n" });
    await writeTree(dest, {
      "kanmer-research/assets/impact-template.md": "stale\n",
      "kanmer-research/SKILL.md": "old\n",
      ".kanmer-skills-version": "0.1.0\nskills:\nkanmer-research\n",
    });

    await reconcileSkills(dest, bundle, "0.2.0");

    await missing(dest, "kanmer-research", "assets", "impact-template.md");
    await missing(dest, "kanmer-research", "SKILL.md");
    await expect(
      readFile(join(dest, "kanmer-research", "assets", "files-template.md"), "utf8"),
    ).resolves.toBe("files\n");
  });

  it("reports a first install as installed, not as replaced — nothing could have been lost", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".grok", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "plan\n" });

    const result = await reconcileSkills(dest, bundle, "0.2.0");

    expect(result).toEqual({ installed: ["kanmer-plan"], replaced: [], removed: [] });
  });

  it("stamps the roster it just wrote, version first", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".grok", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "p\n", "kanmer-auto/SKILL.md": "a\n" });

    await reconcileSkills(dest, bundle, "0.2.0");

    expect(await readFile(join(dest, ".kanmer-skills-version"), "utf8")).toBe(
      "0.2.0\nskills:\nkanmer-auto\nkanmer-plan\n",
    );
  });

  it("deletes nothing it cannot account for when the stamp predates the roster", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".agents", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "plan\n" });
    await writeTree(dest, {
      "kanmer-unknown/SKILL.md": "not in the bundle, not tombstoned\n",
      ".kanmer-skills-version": "0.1.0\n",
    });

    const result = await reconcileSkills(dest, bundle, "0.2.0");

    expect(result.removed).toEqual([]);
    await expect(readFile(join(dest, "kanmer-unknown", "SKILL.md"), "utf8")).resolves.toBe(
      "not in the bundle, not tombstoned\n",
    );
  });

  it("repairs a pre-roster install through the closed tombstone list", async () => {
    // Neither residue is recoverable from the roster — both retired before it
    // existed — so the two shipped tombstones are what cleans them up.
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".agents", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "plan\n" });
    await writeTree(dest, {
      "kanmer-import/SKILL.md": "folded into kanmer-setup\n",
      "kanmer-research/assets/impact-template.md": "renamed to files-template\n",
      "kanmer-research/assets/files-template.md": "current\n",
      "mycompany-review/note.txt": "keep exactly\n",
      ".kanmer-skills-version": "0.1.0\n",
    });

    const result = await reconcileSkills(dest, bundle, "0.2.0");

    expect(result.removed).toEqual(["kanmer-import", "kanmer-research/assets/impact-template.md"]);
    await missing(dest, "kanmer-import", "SKILL.md");
    await missing(dest, "kanmer-research", "assets", "impact-template.md");
    await expect(
      readFile(join(dest, "kanmer-research", "assets", "files-template.md"), "utf8"),
    ).resolves.toBe("current\n");
    await expect(readFile(join(dest, "mycompany-review", "note.txt"), "utf8")).resolves.toBe("keep exactly\n");
  });

  it("refuses to follow a roster entry that would escape the destination", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".agents", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "plan\n" });
    await writeTree(root, { "outside.txt": "must survive\n" });
    await writeTree(dest, { ".kanmer-skills-version": "0.1.0\nskills:\n..\n../..\nsub/dir\n" });

    await reconcileSkills(dest, bundle, "0.2.0");

    await expect(readFile(join(root, "outside.txt"), "utf8")).resolves.toBe("must survive\n");
  });
});

describe("disconnect removes what Kanmer wrote, not what it currently ships", () => {
  it("removes a roster-recorded skill the bundle has since retired", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".grok", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "plan\n" });
    await writeTree(dest, {
      "kanmer-plan/SKILL.md": "plan\n",
      "kanmer-retired/SKILL.md": "retired\n",
      "mycompany-review/note.txt": "keep exactly\n",
      ".kanmer-skills-version": "0.1.0\nskills:\nkanmer-plan\nkanmer-retired\n",
    });

    await removeBundledSkillsOnly(root, ".grok/skills", bundle);

    await missing(dest, "kanmer-retired", "SKILL.md");
    await missing(dest, "kanmer-plan", "SKILL.md");
    await missing(dest, ".kanmer-skills-version");
    await expect(readFile(join(dest, "mycompany-review", "note.txt"), "utf8")).resolves.toBe("keep exactly\n");
  });
});

describe("disconnect and provider-specific project skill directories", () => {
  const roster = "0.1.0\nskills:\nkanmer-plan\n";

  it("removes OpenCode's copy without touching Antigravity's .agents copy", async () => {
    const root = await tempRoot();
    await writeTree(root, {
      "opencode.json": JSON.stringify({ mcp: { kanmer: {} } }),
      ".agents/mcp_config.json": JSON.stringify({ mcpServers: { kanmer: {} } }),
      ".opencode/skills/kanmer-plan/SKILL.md": "opencode plan\n",
      ".opencode/skills/.kanmer-skills-version": roster,
      ".agents/skills/kanmer-plan/SKILL.md": "plan\n",
      ".agents/skills/.kanmer-skills-version": roster,
    });

    const result = await disconnectAgent("opencode", root);

    expect(result.ok).toBe(true);
    expect(result.output).toContain("bundled copied skills removed");
    await missing(root, ".opencode", "skills", "kanmer-plan", "SKILL.md");
    await expect(
      readFile(join(root, ".agents", "skills", "kanmer-plan", "SKILL.md"), "utf8"),
    ).resolves.toBe("plan\n");
  });

  it("removes Antigravity's copy without touching OpenCode's copy", async () => {
    const root = await tempRoot();
    await writeTree(root, {
      "opencode.json": JSON.stringify({ mcp: { kanmer: {} } }),
      ".agents/mcp_config.json": JSON.stringify({ mcpServers: { kanmer: {} } }),
      ".opencode/skills/kanmer-plan/SKILL.md": "opencode plan\n",
      ".opencode/skills/.kanmer-skills-version": roster,
      ".agents/skills/kanmer-plan/SKILL.md": "plan\n",
      ".agents/skills/.kanmer-skills-version": roster,
    });

    const result = await disconnectAgent("antigravity", root, { commandRunner: antigravityAbsentCommandRunner });

    expect(result.ok).toBe(true);
    expect(result.output).toContain("bundled copied skills removed");
    await missing(root, ".agents", "skills", "kanmer-plan", "SKILL.md");
    await expect(
      readFile(join(root, ".opencode", "skills", "kanmer-plan", "SKILL.md"), "utf8"),
    ).resolves.toBe("opencode plan\n");
  });
});

describe("portable Codex launcher contract (GUI-100)", () => {
  it("ships a literal Antigravity board-branch default", async () => {
    const descriptorPath = join(dirname(fileURLToPath(import.meta.url)), "../../../..", "plugins", "kanmer", "mcp_config.json");
    const descriptor = JSON.parse(await readFile(descriptorPath, "utf8")) as {
      mcpServers: { kanmer: { env?: Record<string, string> } };
    };
    expect(descriptor.mcpServers.kanmer.env).toEqual({ KANMER_BOARD_BRANCH: "kanmer-board" });
    expect(JSON.stringify(descriptor)).not.toContain("${KANMER_BOARD_BRANCH");
  });

  it("selects one fresh rootless invocation for every project registration (GUI-100, GUI-149)", () => {
    const portable = {
      command: "powershell.exe",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "& (Join-Path $env:LOCALAPPDATA 'Kanmer\\bin\\kanmer-mcp.cmd')"],
      env: { KANMER_BOARD_BRANCH: "kanmer-board" },
    };
    const codex = serverInvocation("codex", "C:/board-a", "C:/source-a");
    expect(codex).toEqual(portable);
    const second = serverInvocation("codex", "D:/other-board", "D:/other-source");
    expect(second).toEqual(codex);
    expect(second.args).not.toBe(codex.args);

    // Claude Code and OpenCode used to receive process.execPath, the bundled
    // script and --root/--repo-root here. Same contract for all three now.
    for (const id of ["claude", "opencode"] as const) {
      const inv = serverInvocation(id, "C:/board-a", "C:/source-a");
      expect(inv).toEqual(portable);
      expect(JSON.stringify(inv)).not.toMatch(/Users|Kanmer.exe|kanmer-mcp.cjs|--root|--repo-root|cwd|ELECTRON_RUN_AS_NODE|board-a|source-a/);
    }

    const custom = serverInvocation("claude", "C:/board-a", "C:/source-a", " release-board ");
    expect(custom.env).toEqual({ KANMER_BOARD_BRANCH: "release-board" });
    const hostile = serverInvocation("claude", "C:/board-a", "C:/source-a", "team&whoami");
    expect(hostile.env).toEqual({ KANMER_BOARD_BRANCH: "team&whoami" });
  });

  it("runs the fixed probe with explicit argv and bounded Windows options", async () => {
    const calls: unknown[] = [];
    const result = await probeCodexLauncher("C:/workspace", async (file, args, options) => {
      calls.push({ file, args, options });
      return { stdout: "Kanmer MCP launcher: healthy\n", stderr: "" };
    });

    expect(result.ok).toBe(true);
    expect(result.output).toBe("Kanmer MCP launcher: healthy");
    expect(result.command).toBe("powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '$ErrorActionPreference = ''Stop''; & (Join-Path $env:LOCALAPPDATA ''Kanmer\\bin\\kanmer-mcp.cmd'') --probe; exit $LASTEXITCODE'");
    expect(calls).toEqual([{
      file: "powershell.exe",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "$ErrorActionPreference = 'Stop'; & (Join-Path $env:LOCALAPPDATA 'Kanmer\\bin\\kanmer-mcp.cmd') --probe; exit $LASTEXITCODE"],
      options: {
        cwd: "C:/workspace",
        windowsHide: true,
        timeout: 10_000,
        maxBuffer: 32 * 1024,
      },
    }]);
  });

  it("threads the saved board branch through a project registration", async () => {
    const root = await tempRoot();
    testProviders.set("mcp-044", {
      id: "mcp-044" as ProviderId,
      label: "MCP-044 test host",
      register: {
        kind: "configFile",
        configPath: ".mcp-044.json",
        merge: (existing, invocation) => JSON.stringify({
          ...(existing ? JSON.parse(existing) : {}),
          invocation,
        }),
        unmerge: (existing) => existing,
        registrationState: () => "registered",
      },
      install: { kind: "copySkills", skillsScope: "agentsOnly" },
      dispatch: false,
    } as AgentProvider);

    const result = await connectAgent("mcp-044" as ProviderId, root, root, { probeRunner: probeOk }, " release-board ");
    expect(result.ok).toBe(true);
    const registration = JSON.parse(await readFile(join(root, ".mcp-044.json"), "utf8"));
    expect(registration.invocation.env).toEqual({ KANMER_BOARD_BRANCH: "release-board" });
    expect(registration.invocation.command).toBe("powershell.exe");
  });

  it("refreshes only an owned existing registration and preserves other hosts", async () => {
    const root = await tempRoot();
    const other = await tempRoot();
    const beforeOther = JSON.stringify({ mcpServers: { other: { command: "keep" } } }, null, 2) + "\n";
    await writeFile(join(root, ".mcp.json"), JSON.stringify({
      mcpServers: {
        kanmer: { command: "old", args: ["old"] },
        other: { command: "keep" },
      },
    }, null, 2) + "\n");
    await writeFile(join(other, ".mcp.json"), beforeOther);

    const result = await reconcileProviderRegistration("claude", root, root, " release-board ");

    expect(result).toMatchObject({ ok: true });
    const registration = JSON.parse(await readFile(join(root, ".mcp.json"), "utf8")) as { mcpServers: Record<string, any> };
    expect(registration.mcpServers.kanmer.env).toEqual({ KANMER_BOARD_BRANCH: "release-board" });
    expect(registration.mcpServers.kanmer.command).toBe("powershell.exe");
    expect(registration.mcpServers.other).toEqual({ command: "keep" });
    await expect(readFile(join(other, ".mcp.json"), "utf8")).resolves.toBe(beforeOther);
  });

  it("does not overwrite an absent or malformed owned registration", async () => {
    const root = await tempRoot();
    const absent = JSON.stringify({ mcpServers: { other: {} } }, null, 2) + "\n";
    await writeFile(join(root, ".mcp.json"), absent);
    await expect(reconcileProviderRegistration("claude", root, root, "release-board")).resolves.toMatchObject({ ok: true });
    await expect(readFile(join(root, ".mcp.json"), "utf8")).resolves.toBe(absent);

    const malformed = "{ not-json\n";
    await writeFile(join(root, ".mcp.json"), malformed);
    const result = await reconcileProviderRegistration("claude", root, root, "release-board");
    expect(result.ok).toBe(false);
    expect(result.output).toContain("No file was changed");
    await expect(readFile(join(root, ".mcp.json"), "utf8")).resolves.toBe(malformed);
  });

  it("executes hostile branch text as one argv value, never through the shell (GUI-114)", async () => {
    const root = await tempRoot();
    const seen: { file: string; args: string[]; cwd: string }[] = [];
    let shellCalled = false;
    testProviders.set("mcp-114", {
      id: "mcp-114" as ProviderId,
      label: "MCP-114 test CLI",
      register: {
        kind: "cli",
        addCommand: (inv, projectRoot) => `claude mcp add ${projectRoot} ${inv.env.KANMER_BOARD_BRANCH}`,
        addArgv: (inv) => ({ file: "claude", args: ["mcp", "add", "kanmer", "-e", `KANMER_BOARD_BRANCH=${inv.env.KANMER_BOARD_BRANCH}`] }),
        removeCommands: () => [],
      },
      install: { kind: "copySkills", skillsScope: "agentsOnly" },
      dispatch: false,
    } as AgentProvider);

    const result = await connectAgent("mcp-114" as ProviderId, root, root, {
      probeRunner: probeOk,
      commandRunner: async () => {
        shellCalled = true;
        return { stdout: "shell", stderr: "" };
      },
      argvCommandRunner: async (file, args, cwd) => {
        seen.push({ file, args, cwd });
        return { stdout: "registered", stderr: "" };
      },
    }, "team&whoami");

    expect(result.ok).toBe(true);
    expect(shellCalled).toBe(false);
    expect(seen).toEqual([{
      file: "claude",
      args: ["mcp", "add", "kanmer", "-e", "KANMER_BOARD_BRANCH=team&whoami"],
      cwd: root,
    }]);
    testProviders.delete("mcp-114");
  });

  it.runIf(process.platform === "win32")("crosses the real Node to PowerShell launcher boundary", async () => {
    const localAppData = await tempRoot();
    const launcher = join(localAppData, "Kanmer", "bin", "kanmer-mcp.cmd");
    await mkdir(dirname(launcher), { recursive: true });
    await writeFile(launcher, "@echo off\r\necho Kanmer MCP launcher: healthy\r\n", "utf8");

    const previous = process.env.LOCALAPPDATA;
    process.env.LOCALAPPDATA = localAppData;
    try {
      const result = await probeCodexLauncher(localAppData);
      expect(result).toMatchObject({
        ok: true,
        command: "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '$ErrorActionPreference = ''Stop''; & (Join-Path $env:LOCALAPPDATA ''Kanmer\\bin\\kanmer-mcp.cmd'') --probe; exit $LASTEXITCODE'",
        output: "Kanmer MCP launcher: healthy",
      });
    } finally {
      if (previous === undefined) delete process.env.LOCALAPPDATA;
      else process.env.LOCALAPPDATA = previous;
    }
  });

  it.runIf(process.platform === "win32")("propagates the launcher probe's non-zero exit status", async () => {
    const localAppData = await tempRoot();
    const launcher = join(localAppData, "Kanmer", "bin", "kanmer-mcp.cmd");
    await mkdir(dirname(launcher), { recursive: true });
    await writeFile(launcher, "@echo off\r\nexit /b 19\r\n", "utf8");

    const previous = process.env.LOCALAPPDATA;
    process.env.LOCALAPPDATA = localAppData;
    try {
      await expect(probeCodexLauncher(localAppData)).resolves.toMatchObject({ ok: false });
    } finally {
      if (previous === undefined) delete process.env.LOCALAPPDATA;
      else process.env.LOCALAPPDATA = previous;
    }
  });

  it.runIf(process.platform === "win32")("fails the probe when the portable launcher is missing", async () => {
    const localAppData = await tempRoot();
    const previous = process.env.LOCALAPPDATA;
    process.env.LOCALAPPDATA = localAppData;
    try {
      await expect(probeCodexLauncher(localAppData)).resolves.toMatchObject({ ok: false });
    } finally {
      if (previous === undefined) delete process.env.LOCALAPPDATA;
      else process.env.LOCALAPPDATA = previous;
    }
  });

  it.runIf(process.platform === "win32")("starts the generated registration and completes an MCP handshake through normal argv serialization", async () => {
    const localAppData = await mkdtemp(join(tmpdir(), "Kanmer Local App Data "));
    roots.push(localAppData);
    const bin = join(localAppData, "Kanmer", "bin");
    const launcher = join(bin, "kanmer-mcp.cmd");
    await mkdir(bin, { recursive: true });
    await writeFile(join(bin, "kanmer-mcp.cjs"), [
      'const rl = require("node:readline").createInterface({ input: process.stdin });',
      'rl.on("line", (line) => { const request = JSON.parse(line); if (request.method === "initialize") console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "kanmer", version: "test" } } })); else if (request.method === "tools/list") console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { tools: [{ name: "get_status" }] } })); else if (request.method === "tools/call") console.log(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { content: [{ type: "text", text: "{\\\"project\\\":\\\"kanmer\\\"}" }] } })); });',
    ].join("\n"), "utf8");
    await writeFile(launcher, `@echo off\r\n"${process.execPath}" "%~dp0kanmer-mcp.cjs"\r\n`, "utf8");

    const invocation = codexPortableInvocation();
    const responses = await new Promise<unknown[]>((resolve, reject) => {
      const child = spawn(invocation.command, invocation.args, {
        cwd: localAppData,
        env: { ...process.env, LOCALAPPDATA: localAppData },
        stdio: ["pipe", "pipe", "pipe"],
      });
      const received: unknown[] = [];
      let buffer = "";
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error("Timed out waiting for generated Codex registration MCP handshake"));
      }, 5_000);
      child.once("error", reject);
      child.stdout.on("data", (chunk) => {
        buffer += String(chunk);
        for (;;) {
          const newline = buffer.indexOf("\n");
          if (newline < 0) break;
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          received.push(JSON.parse(line));
          if (received.length === 1) {
            child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })}\n`);
            child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`);
            child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_status", arguments: {} } })}\n`);
          }
          if (received.length === 3) {
            clearTimeout(timeout);
            child.once("close", () => resolve(received));
            child.kill();
          }
        }
      });
      child.stderr.on("data", (chunk) => reject(new Error(String(chunk))));
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } })}\n`);
    });

    expect(responses).toMatchObject([
      { result: { serverInfo: { name: "kanmer" } } },
      { result: { tools: [{ name: "get_status" }] } },
      { result: { content: [{ text: '{"project":"kanmer"}' }] } },
    ]);
  });

  it("refuses a failed probe before creating or changing project config", async () => {
    const root = await tempRoot();
    const result = await connectAgent("codex", root, root, {
      probeRunner: async () => { throw new Error("exit 67: launcher missing"); },
    });

    expect(result.ok).toBe(false);
    expect(result.command).toContain("powershell.exe");
    expect(result.command).toContain("--probe");
    expect(result.command).not.toContain('\\"');
    expect(result.output).toContain("No absolute-path fallback was used");
    await missing(root, ".codex", "config.toml");
  });
});

describe("a failed plugin-install command is reported, not swallowed (MCP-013)", () => {
  // The defect: installSkills caught every non-zero exit into the note
  // "plugin cmd skipped (…)", connectAgent folded that string into a result
  // still flagged ok, and Settings.tsx rendered "✓ Connected". Because
  // `claude plugin marketplace add` was being handed the plugin directory
  // rather than the marketplace root, that tick was shown for an install that
  // failed on every single release — which is the whole reason this class of
  // bug survives: a command that fails loudly gets fixed in a day.
  //
  // Driven through the REAL exec, with real subprocesses that really exit
  // non-zero. A stubbed runner would be a proxy: code that swallows a genuine
  // child-process rejection can satisfy a mock that merely rejects a promise.

  /** Register a synthetic marketplace provider whose commands this test owns. */
  function useProvider(id: string, commands: string[], onRoot?: (root: string) => void): ProviderId {
    testProviders.set(id, {
      id: id as ProviderId,
      label: id,
      register: {
        kind: "configFile",
        configPath: "test-host.json",
        merge: () => JSON.stringify({ mcpServers: { kanmer: {} } }),
        unmerge: () => "{}",
        registrationState: () => "registered",
      },
      install: {
        kind: "marketplace",
        marketplaceCommands: (root: string) => {
          onRoot?.(root);
          return commands;
        },
      },
      dispatch: false,
    } as AgentProvider);
    return id as ProviderId;
  }
  afterEach(() => testProviders.clear());

  /** A real command that exits non-zero after saying why, as these CLIs do. */
  async function failingCommand(root: string, message: string): Promise<string> {
    const script = join(root, "fail.cjs");
    await writeFile(
      script,
      `process.stderr.write(${JSON.stringify(`${message}\n`)});\nprocess.exit(1);\n`,
    );
    return `node "${script}"`;
  }

  /** A real command that succeeds. */
  async function succeedingCommand(root: string): Promise<string> {
    const script = join(root, "ok.cjs");
    await writeFile(script, `process.stdout.write(${JSON.stringify("added\n")});\n`);
    return `node "${script}"`;
  }

  it("surfaces the failure as ok:false carrying the exact command to run by hand", async () => {
    const root = await tempRoot();
    // The real message, from the real CLI, measured for this ticket:
    //   $ claude plugin marketplace add …\kanmer\plugins\kanmer
    //   ✘ Failed to add marketplace: Marketplace file not found at …   EXIT=1
    const cmd = await failingCommand(root, "Failed to add marketplace: Marketplace file not found");
    const id = useProvider("mp-broken", [cmd]);

    const result = await connectAgent(id, root, root, { probeRunner: probeOk });

    expect(result.ok).toBe(false);
    // Settings.tsx renders `command` under "Run this yourself:" with a copy
    // button — FRD-012 AC-4's fallback, which marketplace hosts never got.
    expect(result.command).toBe(cmd);
    // What the command SAID, not "Command failed": the reason is the point.
    expect(result.output).toContain("Marketplace file not found");
    // And the half that did work is still reported, so the user is not told
    // that nothing happened when the board was in fact registered.
    expect(result.output).toContain("Registered Kanmer in test-host.json");
  });

  it("does not run the commands after the one that failed", async () => {
    const root = await tempRoot();
    const cmd = await failingCommand(root, "Failed to add marketplace");
    const marker = join(root, "second-ran.txt");
    const second = join(root, "second.cjs");
    await writeFile(second, `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran");\n`);
    const id = useProvider("mp-ordered", [cmd, `node "${second}"`]);

    const result = await connectAgent(id, root, root, { probeRunner: probeOk });

    expect(result.ok).toBe(false);
    // `plugin install <name>@<marketplace>` cannot succeed when the
    // `marketplace add` before it did not; running it only yields a second
    // error that misdescribes the first one's cause.
    await missing(marker);
  });

  it("still reports success when every command succeeds", async () => {
    const root = await tempRoot();
    const id = useProvider("mp-ok", [await succeedingCommand(root)]);

    const result = await connectAgent(id, root, root, { probeRunner: probeOk });

    expect(result.ok).toBe(true);
    expect(result.output).toContain("plugin installed");
  });

  it("ensures the managed block for marketplace hosts idempotently and retains it on disconnect", async () => {
    const root = await tempRoot();
    const id = useProvider("mp-agents", [await succeedingCommand(root)]);

    const first = await connectAgent(id, root, root, { probeRunner: probeOk });
    const agentsPath = join(root, "AGENTS.md");
    const firstAgents = await readFile(agentsPath, "utf8");

    expect(first.ok).toBe(true);
    expect(first.output).toContain("AGENTS.md block ensured");
    expect(firstAgents).toContain("kanmer:instructions:start");

    const second = await connectAgent(id, root, root, { probeRunner: probeOk });
    expect(second.ok).toBe(true);
    await expect(readFile(agentsPath, "utf8")).resolves.toBe(firstAgents);

    // FRD-012 R4: marketplace disconnect does not remove AGENTS.md without
    // an explicit user interaction. Copy-skills cleanup remains separate.
    const disconnected = await disconnectAgent(id, root);
    expect(disconnected.ok).toBe(true);
    await expect(readFile(agentsPath, "utf8")).resolves.toBe(firstAgents);
  });

  it("updateSkills surfaces the same failure rather than reporting an update", async () => {
    const root = await tempRoot();
    const cmd = await failingCommand(root, "Failed to add marketplace");
    const id = useProvider("mp-update", [cmd]);

    const result = await updateSkills(id, root);

    expect(result.ok).toBe(false);
    expect(result.command).toBe(cmd);
    expect(result.output).toContain("Failed to add marketplace");
  });
});

describe("the marketplace command is given the marketplace root (MCP-013)", () => {
  // THE defect. `installSkills` passed `pluginRoot()`, so every release ran
  //   claude plugin marketplace add …\kanmer\plugins\kanmer
  // and got, measured against claude 2.1.233:
  //   ✘ Failed to add marketplace: Marketplace file not found at
  //     …\kanmer\plugins\kanmer\.claude-plugin\marketplace.json     EXIT=1
  // Pointed one level of nesting higher it exits 0 and the plugin installs.
  //
  // The mismatch is between two directories, so it cannot be seen from either
  // one alone — which is why both are exported and the relationship, not the
  // value, is what is asserted. Neither is a fixed string here: `app.isPackaged`
  // is stubbed false in this file, and the packaged branch resolves against
  // `process.resourcesPath`. Pinning literals would test the stub.

  it("the marketplace root is the plugin root minus plugins/kanmer", () => {
    expect(join(marketplaceRoot(), "plugins", "kanmer")).toBe(pluginRoot());
  });

  it("the marketplace root is NOT the plugin root", () => {
    // The check on the check: if these two ever became the same directory the
    // assertion above would hold vacuously and the defect would be back.
    expect(marketplaceRoot()).not.toBe(pluginRoot());
  });

  it("connect hands the provider the marketplace root, not the plugin root", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-connect-"));
    roots.push(root);
    const seen: string[] = [];
    const script = join(root, "noop.cjs");
    await writeFile(script, "");
    testProviders.set("mp-root", {
      id: "mp-root" as ProviderId,
      label: "mp-root",
      register: {
        kind: "configFile",
        configPath: "test-host.json",
        merge: () => "{}",
        unmerge: () => "{}",
        registrationState: () => "registered",
      },
      install: {
        kind: "marketplace",
        marketplaceCommands: (dir: string) => {
          seen.push(dir);
          return [`node "${script}"`];
        },
      },
      dispatch: false,
    } as AgentProvider);

    await connectAgent("mp-root" as ProviderId, root, root, { probeRunner: probeOk });
    testProviders.clear();

    expect(seen).toEqual([marketplaceRoot()]);
    expect(seen[0]).not.toBe(pluginRoot());
  });

  it("binds a literal custom branch in the staged Claude marketplace descriptor", async () => {
    const root = await tempRoot();
    // Staging is installer-owned now (GUI-147), so this test points
    // LOCALAPPDATA at a temp directory rather than refreshing the real
    // `%LOCALAPPDATA%\Kanmer\claude-marketplace` on the developer's machine.
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const script = join(root, "inspect-marketplace.cjs");
    const observed = join(root, "observed-branch.txt");
    await writeFile(script, [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const descriptor = JSON.parse(fs.readFileSync(path.join(process.argv[2], 'plugins', 'kanmer', 'mcp', 'claude.mcp.json'), 'utf8'));",
      "fs.writeFileSync(process.argv[3], descriptor.mcpServers.kanmer.env.KANMER_BOARD_BRANCH);",
    ].join("\n"));
    const seen: string[] = [];
    testProviders.set("claude", {
      id: "claude" as ProviderId,
      label: "claude",
      register: {
        kind: "configFile",
        configPath: "test-host.json",
        merge: () => "{}",
        unmerge: () => "{}",
        registrationState: () => "registered",
      },
      install: {
        kind: "marketplace",
        marketplaceCommands: (dir: string) => {
          seen.push(dir);
          return [`node ${q(script)} ${q(dir)} ${q(observed)}`];
        },
      },
      dispatch: false,
    } as AgentProvider);
    try {
      const result = await connectAgent("claude" as ProviderId, root, root, { probeRunner: probeOk }, "team&whoami");
      expect(result.ok).toBe(true);
      expect(await readFile(observed, "utf8")).toBe("team&whoami");
      expect(seen).toHaveLength(1);
      expect(seen[0]).not.toBe(marketplaceRoot());
    } finally {
      testProviders.clear();
    }
  }, 30_000);
});

describe("Claude's marketplace is staged where the host can keep reading it (GUI-147)", () => {
  // The defect, observed on the 2026-09-01 v0.4.0 install:
  //  1. Staging was `mkdtemp(kanmer-claude-marketplace-*)` and `installSkills`
  //     deleted it in a `finally`. Claude Code records a *directory* marketplace
  //     by path, so once that path was gone every session reported
  //     `Marketplace kanmer failed to load: cache-miss` — no skills, no
  //     `plugin:kanmer:kanmer` server — while Connect had reported success.
  //  2. `claude plugin install` exits 0 without upgrading an already-installed
  //     plugin, so the cached plugin stayed at 0.3.12 against a 0.4.0 board.
  //
  // No test here runs a real `claude` command: the two state files are fixtures
  // and the read-only version read-back is injected. Staging is pointed at a
  // temp LOCALAPPDATA so the operator's real marketplace is never touched.

  afterEach(() => testProviders.clear());

  /** The real Claude provider's specs, captured before a synthetic one shadows it. */
  function claudeInstall(): {
    marketplaceCommands: (root: string, state?: MarketplaceHostState) => string[];
    installedVersion: MarketplaceVersionCheck;
    hostRemoveCommands: () => string[];
  } {
    const install = providerById("claude")!.install;
    expect(install.kind).toBe("marketplace");
    return install as ReturnType<typeof claudeInstall>;
  }

  /** `known_marketplaces.json` as Claude Code writes it. */
  const knownMarketplaces = (path: string | null) =>
    JSON.stringify(
      path === null
        ? { "claude-plugins-official": { source: { source: "github", repo: "x/y" } } }
        : {
            "claude-plugins-official": { source: { source: "github", repo: "x/y" } },
            kanmer: { source: { source: "directory", path }, installLocation: path, lastUpdated: "2026-09-01T23:44:47.849Z" },
          },
    );

  /** `installed_plugins.json` as Claude Code writes it (`version: 2`). */
  const installedPlugins = (version: string | null) =>
    JSON.stringify({
      version: 2,
      plugins: version === null
        ? { "azure@claude-plugins-official": [{ scope: "user", version: "1.2.32" }] }
        : {
            "azure@claude-plugins-official": [{ scope: "user", version: "1.2.32" }],
            "kanmer@kanmer": [{ scope: "user", installPath: "…", version, installedAt: "2026-09-01T23:44:50.387Z" }],
          },
    });

  /** A `claude plugin list` transcript, in the shape claude 2.1.233 prints. */
  const pluginList = (version: string | null, scope = "user") =>
    [
      "Installed plugins:",
      "",
      "  ❯ azure@claude-plugins-official",
      "    Version: 1.2.32",
      "    Scope: user",
      "    Status: ✔ enabled",
      "",
      ...(version === null
        ? []
        : ["  ❯ kanmer@kanmer", `    Version: ${version}`, `    Scope: ${scope}`, "    Status: ✔ enabled", ""]),
    ].join("\n");

  /** Write the two host state files and return the directory holding them. */
  async function hostStateDir(marketplacePath: string | null, pluginVersion: string | null): Promise<string> {
    const dir = await tempRoot();
    await writeFile(join(dir, "known_marketplaces.json"), knownMarketplaces(marketplacePath));
    await writeFile(join(dir, "installed_plugins.json"), installedPlugins(pluginVersion));
    return dir;
  }

  /** The version this app ships, which the host is required to report back. */
  async function bundledVersion(): Promise<string> {
    const manifest = JSON.parse(
      await readFile(join(pluginRoot(), ".claude-plugin", "plugin.json"), "utf8"),
    ) as { version: string };
    return manifest.version;
  }

  /**
   * Register a synthetic provider under the id `claude`, so the claude-specific
   * staging and state read run, with commands and specs this test owns. The real
   * `claude` binary is never invoked.
   */
  function useSyntheticClaude(spec: {
    commands: (root: string, state?: MarketplaceHostState) => string[];
    installedVersion?: MarketplaceVersionCheck;
    hostRemoveCommands?: () => string[];
  }): ProviderId {
    testProviders.set("claude", {
      id: "claude" as ProviderId,
      label: "claude",
      register: {
        kind: "configFile",
        configPath: "test-host.json",
        merge: () => JSON.stringify({ mcpServers: { kanmer: {} } }),
        unmerge: () => "{}",
        registrationState: () => "registered",
      },
      install: {
        kind: "marketplace",
        marketplaceCommands: spec.commands,
        installedVersion: spec.installedVersion,
        hostRemoveCommands: spec.hostRemoveCommands,
      },
      dispatch: false,
    } as unknown as AgentProvider);
    return "claude" as ProviderId;
  }

  /** A real command that succeeds, as the file's other marketplace tests use. */
  async function noopCommand(root: string): Promise<string> {
    const script = join(root, "noop.cjs");
    await writeFile(script, "process.stdout.write('added\\n');\n");
    return `node ${q(script)}`;
  }

  it("resolves one installer-owned staging root from LOCALAPPDATA, the same one every time", async () => {
    const local = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", local);

    // Stability is the property, not the literal: a `mkdtemp` root is a new path
    // on every call, and that is exactly what Claude Code cannot follow.
    expect(claudeMarketplaceStableRoot()).toBe(join(local, "Kanmer", "claude-marketplace"));
    expect(claudeMarketplaceStableRoot()).toBe(claudeMarketplaceStableRoot());

    // A sibling of the installer's other two roots (%LOCALAPPDATA%\Kanmer\mcp
    // and \bin), so it follows the environment rather than a hard-coded path.
    const moved = join(local, "moved");
    vi.stubEnv("LOCALAPPDATA", moved);
    expect(claudeMarketplaceStableRoot()).toBe(join(moved, "Kanmer", "claude-marketplace"));

    // Windows-only feature, but the resolver must not throw where the variable
    // is absent — the test runner is one such place.
    vi.stubEnv("LOCALAPPDATA", "");
    expect(() => claudeMarketplaceStableRoot()).not.toThrow();
    expect(claudeMarketplaceStableRoot()).toContain(join("Kanmer", "claude-marketplace"));
  });

  it("stages into that root, leaves it in place after Connect, and refreshes it on the next one", async () => {
    const root = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const stable = claudeMarketplaceStableRoot();
    const seen: string[] = [];
    const cmd = await noopCommand(root);
    const id = useSyntheticClaude({ commands: (dir) => { seen.push(dir); return [cmd]; } });

    const first = await connectAgent(id, root, root, { probeRunner: probeOk, claudePluginStateDir: await hostStateDir(null, null) });

    expect(first.ok).toBe(true);
    // The host is handed the stable root, not a temp directory.
    expect(seen).toEqual([stable]);
    // And the marketplace manifest it will read is still there after Connect
    // returned — the whole of defect 1 is that this file was deleted.
    await expect(
      readFile(join(stable, ".claude-plugin", "marketplace.json"), "utf8"),
    ).resolves.toContain("kanmer");
    await expect(
      readFile(join(stable, "plugins", "kanmer", "mcp", "claude.mcp.json"), "utf8"),
    ).resolves.toContain("KANMER_BOARD_BRANCH");

    // A file the bundle no longer ships must not survive inside a marketplace
    // the host still trusts: refresh replaces each owned subdirectory.
    const retired = join(stable, "plugins", "kanmer", "skills", "kanmer-retired", "SKILL.md");
    await mkdir(dirname(retired), { recursive: true });
    await writeFile(retired, "retired\n");

    const second = await connectAgent(id, root, root, { probeRunner: probeOk, claudePluginStateDir: await hostStateDir(stable, null) });

    expect(second.ok).toBe(true);
    // Same path, refreshed — not a second directory.
    expect(seen).toEqual([stable, stable]);
    await missing(retired);
    await expect(
      readFile(join(stable, ".claude-plugin", "marketplace.json"), "utf8"),
    ).resolves.toContain("kanmer");
  }, 60_000);

  it("keeps the staged root when a marketplace command fails", async () => {
    const root = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const stable = claudeMarketplaceStableRoot();
    const failing = join(root, "fail.cjs");
    await writeFile(failing, "process.stderr.write('Failed to add marketplace\\n');\nprocess.exit(1);\n");
    const id = useSyntheticClaude({ commands: () => [`node ${q(failing)}`] });

    const result = await connectAgent(id, root, root, { probeRunner: probeOk, claudePluginStateDir: await hostStateDir(null, null) });

    expect(result.ok).toBe(false);
    // A failed Connect must not take the marketplace with it: the previous
    // registration still points here, and the next Connect refreshes it.
    await expect(
      readFile(join(stable, ".claude-plugin", "marketplace.json"), "utf8"),
    ).resolves.toContain("kanmer");
  }, 60_000);

  it("reads add-vs-update and install-vs-reinstall from the host's own state files", async () => {
    const root = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const stable = claudeMarketplaceStableRoot();
    const cmd = await noopCommand(root);

    const observe = async (marketplacePath: string | null, pluginVersion: string | null) => {
      const states: (MarketplaceHostState | undefined)[] = [];
      const id = useSyntheticClaude({ commands: (_dir, state) => { states.push(state); return [cmd]; } });
      const result = await connectAgent(id, root, root, {
        probeRunner: probeOk,
        claudePluginStateDir: await hostStateDir(marketplacePath, pluginVersion),
      });
      expect(result.ok).toBe(true);
      testProviders.clear();
      return states[0];
    };

    // Fresh machine: neither file mentions Kanmer.
    expect(await observe(null, null)).toEqual({ marketplace: "absent", pluginInstalled: false });
    // Already registered at the directory being staged: refresh in place.
    expect(await observe(stable, null)).toEqual({ marketplace: "staged", pluginInstalled: false });
    // Registered at the temp directory v0.4.0 recorded and then deleted. This is
    // the upgrade case, and it must not be mistaken for "already correct":
    // `marketplace update` would re-read that dead path.
    expect(await observe(join(root, "gone", "kanmer-claude-marketplace-abc"), "0.3.12")).toEqual({
      marketplace: "elsewhere",
      pluginInstalled: true,
    });
    // Plugin present at the staged root: an upgrade, not a first install.
    expect(await observe(stable, "0.3.12")).toEqual({ marketplace: "staged", pluginInstalled: true });
  }, 120_000);

  it("treats missing host state files as nothing recorded rather than an error", async () => {
    const root = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const cmd = await noopCommand(root);
    const states: (MarketplaceHostState | undefined)[] = [];
    const id = useSyntheticClaude({ commands: (_dir, state) => { states.push(state); return [cmd]; } });

    // A machine that has never installed a Claude plugin has neither file.
    const result = await connectAgent(id, root, root, { probeRunner: probeOk, claudePluginStateDir: join(root, "no-such-dir") });

    expect(result.ok).toBe(true);
    expect(states[0]).toEqual({ marketplace: "absent", pluginInstalled: false });
  }, 60_000);

  it("turns each recorded state into the Claude verbs that actually change it", () => {
    const commands = (state?: MarketplaceHostState) =>
      claudeInstall().marketplaceCommands("C:/STAGED", state);

    expect(commands({ marketplace: "absent", pluginInstalled: false })).toEqual([
      `claude plugin marketplace add ${q("C:/STAGED")}`,
      "claude plugin install kanmer@kanmer -s user -y",
    ]);
    expect(commands({ marketplace: "staged", pluginInstalled: false })).toEqual([
      "claude plugin marketplace update kanmer",
      "claude plugin install kanmer@kanmer -s user -y",
    ]);
    // `marketplace update` re-reads the recorded source, so a registration left
    // pointing at a deleted temp directory has to be dropped and re-added.
    expect(commands({ marketplace: "elsewhere", pluginInstalled: false })).toEqual([
      "claude plugin marketplace remove kanmer",
      `claude plugin marketplace add ${q("C:/STAGED")}`,
      "claude plugin install kanmer@kanmer -s user -y",
    ]);
    // Defect 2: install alone is a no-op over an existing plugin, so the
    // upgrade path must uninstall first — and in that order.
    expect(commands({ marketplace: "staged", pluginInstalled: true })).toEqual([
      "claude plugin marketplace update kanmer",
      "claude plugin uninstall kanmer@kanmer -s user -y",
      "claude plugin install kanmer@kanmer -s user -y",
    ]);
    // With no state at all the list is the first-install one, which is what
    // keeps every existing caller of this pure function behaving as before.
    expect(commands()).toEqual(commands({ marketplace: "absent", pluginInstalled: false }));
  });

  it("reads the installed version back out of the host's own report", () => {
    const { parse } = claudeInstall().installedVersion;

    expect(parse(pluginList("0.4.0"))).toBe("0.4.0");
    // Absent is null, not a crash and not a false match on another plugin.
    expect(parse(pluginList(null))).toBeNull();
    expect(parse("Installed plugins:\n")).toBeNull();
    // Scope is part of the identity: the same plugin legitimately appears at
    // more than one scope with different versions, and Kanmer installs at user.
    const twoScopes = [
      "  ❯ kanmer@kanmer",
      "    Version: 0.3.12",
      "    Scope: local",
      "    Status: ✔ enabled",
      "",
      "  ❯ kanmer@kanmer",
      "    Version: 0.4.0",
      "    Scope: user",
      "    Status: ✔ enabled",
    ].join("\n");
    expect(parse(twoScopes)).toBe("0.4.0");
  });

  it("fails Connect with a pasteable repair when the host reports a version that is not the bundled one", async () => {
    const root = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const bundled = await bundledVersion();
    const cmd = await noopCommand(root);
    const id = useSyntheticClaude({ commands: () => [cmd], installedVersion: claudeInstall().installedVersion });

    const result = await connectAgent(id, root, root, {
        probeRunner: probeOk,
      claudePluginStateDir: await hostStateDir(null, "0.3.12"),
      // The exact state of the reported defect: every command exited 0 and the
      // host was still on the previous release.
      hostVersionRunner: async () => ({ stdout: pluginList("0.3.12"), stderr: "" }),
    });

    expect(result.ok).toBe(false);
    // Settings.tsx renders `command` under "Run this yourself:" with a copy
    // button, so it must be the repair, verbatim.
    expect(result.command).toBe(
      "claude plugin uninstall kanmer@kanmer -s user -y && claude plugin install kanmer@kanmer -s user -y",
    );
    expect(result.output).toContain("0.3.12");
    expect(result.output).toContain(bundled);
  }, 60_000);

  it("fails Connect when the host reports no Kanmer plugin at all after the install", async () => {
    const root = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const cmd = await noopCommand(root);
    const id = useSyntheticClaude({ commands: () => [cmd], installedVersion: claudeInstall().installedVersion });

    const result = await connectAgent(id, root, root, {
        probeRunner: probeOk,
      claudePluginStateDir: await hostStateDir(null, null),
      hostVersionRunner: async () => ({ stdout: pluginList(null), stderr: "" }),
    });

    expect(result.ok).toBe(false);
    expect(result.output).toContain("no Kanmer plugin at all");
  }, 60_000);

  it("fails Connect when the version cannot be read at all, rather than reporting success", async () => {
    const root = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const cmd = await noopCommand(root);
    const id = useSyntheticClaude({ commands: () => [cmd], installedVersion: claudeInstall().installedVersion });

    const result = await connectAgent(id, root, root, {
        probeRunner: probeOk,
      claudePluginStateDir: await hostStateDir(null, null),
      hostVersionRunner: async () => { throw new Error("'claude' is not recognized"); },
    });

    // An install nobody can confirm is the state this ticket exists to end.
    expect(result.ok).toBe(false);
    expect(result.output).toContain("not recognized");
  }, 60_000);

  it("reports success when the host confirms the bundled version", async () => {
    const root = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const bundled = await bundledVersion();
    const cmd = await noopCommand(root);
    const id = useSyntheticClaude({ commands: () => [cmd], installedVersion: claudeInstall().installedVersion });

    const result = await connectAgent(id, root, root, {
        probeRunner: probeOk,
      claudePluginStateDir: await hostStateDir(null, null),
      hostVersionRunner: async () => ({ stdout: pluginList(bundled), stderr: "" }),
    });

    expect(result.ok).toBe(true);
    expect(result.output).toContain(`host reports plugin v${bundled}`);
  }, 60_000);

  it("surfaces the host's installed plugin version in the skills staleness read", async () => {
    const root = await tempRoot();
    const bundled = await bundledVersion();

    const stale = await skillsStatus("claude", root, {
      hostVersionRunner: async () => ({ stdout: pluginList("0.3.12"), stderr: "" }),
    });
    expect(stale).toMatchObject({
      scope: "marketplace",
      installedVersion: "0.3.12",
      bundledVersion: bundled,
      updateAvailable: true,
    });

    const current = await skillsStatus("claude", root, {
      hostVersionRunner: async () => ({ stdout: pluginList(bundled), stderr: "" }),
    });
    expect(current).toMatchObject({ installedVersion: bundled, updateAvailable: false });

    // Nothing in the staleness family throws: a host whose CLI is not on PATH
    // renders as unknown, not as a broken Settings panel.
    const unreadable = await skillsStatus("claude", root, {
      hostVersionRunner: async () => { throw new Error("'claude' is not recognized"); },
    });
    expect(unreadable).toMatchObject({ installedVersion: null, updateAvailable: false });

    // Scope containment: codex declares no read-back, so its status is unchanged.
    const codex = await skillsStatus("codex", root, {
      hostVersionRunner: async () => { throw new Error("codex must not be asked"); },
    });
    expect(codex).toMatchObject({ scope: "marketplace", installedVersion: null, updateAvailable: false });
  });

  it("removes the host's own marketplace and plugin on disconnect, and keeps the staged directory", async () => {
    const root = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const stable = claudeMarketplaceStableRoot();
    const cmd = await noopCommand(root);
    const removeCommands = claudeInstall().hostRemoveCommands;
    const id = useSyntheticClaude({ commands: () => [cmd], hostRemoveCommands: removeCommands });

    const connected = await connectAgent(id, root, root, { probeRunner: probeOk, claudePluginStateDir: await hostStateDir(null, null) });
    expect(connected.ok).toBe(true);

    const ran: string[] = [];
    const disconnected = await disconnectAgent(id, root, {
      commandRunner: async (command) => { ran.push(command); return { stdout: "", stderr: "" }; },
    });

    expect(disconnected.ok).toBe(true);
    // FRD-012 R4: Connect now leaves a durable registration, so disconnect owes
    // its removal — and only this provider's own two objects (R1a). The plugin
    // goes first: an uninstall resolves against the marketplace that supplied
    // it, so removing the registration first would orphan it.
    expect(ran).toEqual([
      "claude plugin uninstall kanmer@kanmer -s user -y",
      "claude plugin marketplace remove kanmer",
    ]);
    // The installer-owned directory is not disconnect's to delete: once the
    // registration is gone it is inert, and the next Connect refreshes it.
    await expect(
      readFile(join(stable, ".claude-plugin", "marketplace.json"), "utf8"),
    ).resolves.toContain("kanmer");
  }, 60_000);

  it("leaves a marketplace host that declares no host removals untouched on disconnect", async () => {
    const root = await tempRoot();
    vi.stubEnv("LOCALAPPDATA", await tempRoot());
    const cmd = await noopCommand(root);
    // codex is such a host: Connect stages nothing durable for it, so there is
    // nothing of its own for disconnect to remove.
    const id = useSyntheticClaude({ commands: () => [cmd] });
    await connectAgent(id, root, root, { probeRunner: probeOk, claudePluginStateDir: await hostStateDir(null, null) });

    const ran: string[] = [];
    const disconnected = await disconnectAgent(id, root, {
      commandRunner: async (command) => { ran.push(command); return { stdout: "", stderr: "" }; },
    });

    expect(disconnected.ok).toBe(true);
    expect(ran).toEqual([]);
  }, 60_000);
});

describe("every project registration is portable and gitignored (GUI-149)", () => {
  const forbidden = /Users|Kanmer\.exe|kanmer-mcp\.cjs|--root|--repo-root|ELECTRON_RUN_AS_NODE/;
  const launcherArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "& (Join-Path $env:LOCALAPPDATA 'Kanmer\\bin\\kanmer-mcp.cmd')"];
  const probeFails = async () => {
    throw new Error("exit 65: Kanmer MCP launcher: installation is missing or invalid.");
  };

  it.each(["claude", "opencode"] as const)("refuses %s before writing anything when the launcher probe fails", async (id) => {
    const root = await tempRoot();
    const result = await connectAgent(id, root, root, {
      probeRunner: probeFails,
      argvCommandRunner: async () => {
        throw new Error("the host CLI must not be invoked after a failed probe");
      },
    });
    expect(result.ok).toBe(false);
    expect(result.output).toContain("No absolute-path fallback was used");
    await missing(root, ".mcp.json");
    await missing(root, "opencode.json");
    await missing(root, ".gitignore");
  });

  it("writes the portable launcher and appends the registration file and skills directory to a git project's .gitignore once", async () => {
    const root = await tempRoot();
    await mkdir(join(root, ".git"));
    await writeFile(join(root, ".gitignore"), "node_modules/\n");

    const first = await connectAgent("opencode", root, root, { probeRunner: probeOk });
    expect(first.ok).toBe(true);
    expect(first.output).toContain("added opencode.json, .opencode/skills/ to .gitignore");
    const after = await readFile(join(root, ".gitignore"), "utf8");
    expect(after).toBe("node_modules/\nopencode.json\n.opencode/skills/\n");

    const registration = JSON.parse(await readFile(join(root, "opencode.json"), "utf8")) as { mcp: Record<string, unknown> };
    expect(registration.mcp.kanmer).toEqual({
      type: "local",
      command: ["powershell.exe", ...launcherArgs],
      environment: { KANMER_BOARD_BRANCH: "kanmer-board" },
      enabled: true,
    });
    expect(JSON.stringify(registration)).not.toMatch(forbidden);

    // Idempotent: a second Connect neither duplicates the rules nor reports them.
    const second = await connectAgent("opencode", root, root, { probeRunner: probeOk });
    expect(second.ok).toBe(true);
    expect(second.output).not.toContain(".gitignore");
    await expect(readFile(join(root, ".gitignore"), "utf8")).resolves.toBe(after);
  });

  it("leaves a project that is not a git checkout without a .gitignore", async () => {
    const root = await tempRoot();
    const result = await connectAgent("opencode", root, root, { probeRunner: probeOk });
    expect(result.ok).toBe(true);
    await missing(root, ".gitignore");
  });

  it("gitignores on the branch-change reconcile path as well", async () => {
    const root = await tempRoot();
    await mkdir(join(root, ".git"));
    await writeFile(join(root, "opencode.json"), JSON.stringify({ mcp: { kanmer: { type: "local", command: ["old"] } } }));
    const result = await reconcileProviderRegistration("opencode", root, root, "release-board");
    expect(result.ok).toBe(true);
    expect(result.output).toContain("added opencode.json, .opencode/skills/ to .gitignore");
    await expect(readFile(join(root, ".gitignore"), "utf8")).resolves.toBe("opencode.json\n.opencode/skills/\n");
    const registration = JSON.parse(await readFile(join(root, "opencode.json"), "utf8")) as { mcp: Record<string, any> };
    expect(registration.mcp.kanmer.command).toEqual(["powershell.exe", ...launcherArgs]);
    expect(registration.mcp.kanmer.environment).toEqual({ KANMER_BOARD_BRANCH: "release-board" });
  });
});
