import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyManagedBlock } from "./agentsBlock.js";
import { remoteProjectIdentity } from "./remoteAccess/identity.js";
import { q } from "./providers.js";

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
  connectAgent,
  disconnectAgent,
  marketplaceRoot,
  pluginRoot,
  probeCodexLauncher,
  reconcileProviderRegistration,
  reconcileSkills,
  removeBundledSkillsOnly,
  serverInvocation,
  updateSkills,
} = await import("./connect.js");
type AgentProvider = import("./providers.js").AgentProvider;
type ProviderId = import("./providers.js").ProviderId;
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
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
      "plugin/mcp_config.json": '{"mcpServers":{"kanmer":{"command":"cmd.exe","args":["/d","/s","/c","\\\"%LOCALAPPDATA%\\\\Kanmer\\\\bin\\\\kanmer-mcp.cmd\\\""]}}}\n',
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
      { file: "cmd.exe", args: ["/d", "/s", "/c", '"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd" --probe'] },
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
      "plugin/mcp_config.json": '{"mcpServers":{"kanmer":{"command":"cmd.exe","args":["/d","/s","/c","\\\"%LOCALAPPDATA%\\\\Kanmer\\\\bin\\\\kanmer-mcp.cmd\\\""]}}}\n',
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

  it("selects one fresh rootless invocation for Codex and preserves installed Electron for other providers", () => {
    const codex = serverInvocation("codex", "C:/board-a", "C:/source-a");
    expect(codex).toEqual({
      command: "cmd.exe",
      args: ["/d", "/s", "/c", '"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"'],
      env: { KANMER_BOARD_BRANCH: "kanmer-board" },
    });
    const second = serverInvocation("codex", "D:/other-board", "D:/other-source");
    expect(second).toEqual(codex);
    expect(second.args).not.toBe(codex.args);

    const custom = serverInvocation("codex", "C:/board-a", "C:/source-a", " release-board ");
    expect(custom.env).toEqual({ KANMER_BOARD_BRANCH: "release-board" });

    const grok = serverInvocation("grok", "C:/board-a", "C:/source-a");
    expect(grok.command).toBe(process.execPath);
    expect(grok.args).toContain("C:/board-a");
    expect(grok.env).toEqual({ ELECTRON_RUN_AS_NODE: "1", KANMER_BOARD_BRANCH: "kanmer-board" });

    const openAi = serverInvocation("claude", "C:/board-a", "C:/source-a", "team&whoami");
    expect(openAi.env).toEqual({ ELECTRON_RUN_AS_NODE: "1", KANMER_BOARD_BRANCH: "team&whoami" });
  });

  it("runs the fixed probe with explicit argv and bounded Windows options", async () => {
    const calls: unknown[] = [];
    const result = await probeCodexLauncher("C:/workspace", async (file, args, options) => {
      calls.push({ file, args, options });
      return { stdout: "Kanmer MCP launcher: healthy\n", stderr: "" };
    });

    expect(result.ok).toBe(true);
    expect(result.output).toBe("Kanmer MCP launcher: healthy");
    expect(calls).toEqual([{
      file: "cmd.exe",
      args: ["/d", "/s", "/c", '"%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd" --probe'],
      options: { cwd: "C:/workspace", windowsHide: true, timeout: 10_000, maxBuffer: 32 * 1024 },
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

    const result = await connectAgent("mcp-044" as ProviderId, root, root, {}, " release-board ");
    expect(result.ok).toBe(true);
    const registration = JSON.parse(await readFile(join(root, ".mcp-044.json"), "utf8"));
    expect(registration.invocation.env).toEqual({
      ELECTRON_RUN_AS_NODE: "1",
      KANMER_BOARD_BRANCH: "release-board",
    });
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
    expect(registration.mcpServers.kanmer.env).toEqual({ ELECTRON_RUN_AS_NODE: "1", KANMER_BOARD_BRANCH: "release-board" });
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

  it("refuses a failed probe before creating or changing project config", async () => {
    const root = await tempRoot();
    const result = await connectAgent("codex", root, root, {
      probeRunner: async () => { throw new Error("exit 67: launcher missing"); },
    });

    expect(result.ok).toBe(false);
    expect(result.command).toContain("cmd.exe");
    expect(result.command).toContain("--probe");
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

    const result = await connectAgent(id, root, root);

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

    const result = await connectAgent(id, root, root);

    expect(result.ok).toBe(false);
    // `plugin install <name>@<marketplace>` cannot succeed when the
    // `marketplace add` before it did not; running it only yields a second
    // error that misdescribes the first one's cause.
    await missing(marker);
  });

  it("still reports success when every command succeeds", async () => {
    const root = await tempRoot();
    const id = useProvider("mp-ok", [await succeedingCommand(root)]);

    const result = await connectAgent(id, root, root);

    expect(result.ok).toBe(true);
    expect(result.output).toContain("plugin installed");
  });

  it("ensures the managed block for marketplace hosts idempotently and retains it on disconnect", async () => {
    const root = await tempRoot();
    const id = useProvider("mp-agents", [await succeedingCommand(root)]);

    const first = await connectAgent(id, root, root);
    const agentsPath = join(root, "AGENTS.md");
    const firstAgents = await readFile(agentsPath, "utf8");

    expect(first.ok).toBe(true);
    expect(first.output).toContain("AGENTS.md block ensured");
    expect(firstAgents).toContain("kanmer:instructions:start");

    const second = await connectAgent(id, root, root);
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

    await connectAgent("mp-root" as ProviderId, root, root);
    testProviders.clear();

    expect(seen).toEqual([marketplaceRoot()]);
    expect(seen[0]).not.toBe(pluginRoot());
  });

  it("binds a literal custom branch in the staged Claude marketplace descriptor", async () => {
    const root = await tempRoot();
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
      const result = await connectAgent("claude" as ProviderId, root, root, {}, "team&whoami");
      expect(result.ok).toBe(true);
      expect(await readFile(observed, "utf8")).toBe("team&whoami");
      expect(seen).toHaveLength(1);
      expect(seen[0]).not.toBe(marketplaceRoot());
    } finally {
      testProviders.clear();
    }
  }, 30_000);
});
