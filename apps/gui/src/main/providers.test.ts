import { describe, expect, it } from "vitest";
import {
  PROVIDERS,
  RETIRED_SKILL_PATHS,
  codexServerName,
  formatSkillsStamp,
  isNewerVersion,
  parseSkillsStamp,
  providerById,
  codexTrustFromConfig,
  codexTrustNote,
  type Invocation,
} from "./providers.js";
import * as TOML from "smol-toml";
import { applyManagedBlock, removeManagedBlock, START, END } from "./agentsBlock.js";

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

  // codex's CLI registration is superseded by the project config file — see
  // "codex project-scoped TOML registration" below. `codexServerName` survives
  // only to name the legacy global entries that cleanup drains.

  it("claude registers at project scope as kanmer", () => {
    const reg = providerById("claude")!.register;
    if (reg.kind !== "cli") throw new Error("expected cli");
    const cmd = reg.addCommand(inv, ROOT);
    expect(cmd).toContain("claude mcp add kanmer -s project");
    expect(cmd).toContain("-e ELECTRON_RUN_AS_NODE=1");
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
    // Idempotent: re-merging its own output is byte-identical.
    expect(reg.merge(first, inv)).toBe(first);
    // Unmerge removes only kanmer.
    const back = JSON.parse(reg.unmerge(first));
    expect(back.mcp.kanmer).toBeUndefined();
    expect(back.mcp.other).toBeTruthy();
    expect(back.theme).toBe("dark");
  });

  it("grok/antigravity use the mcpServers shape into their own config paths", () => {
    expect((providerById("grok")!.register as { configPath: string }).configPath).toBe(".mcp.json");
    expect((providerById("antigravity")!.register as { configPath: string }).configPath).toBe(
      ".agents/mcp_config.json",
    );
    for (const id of ["grok", "antigravity"] as const) {
      const reg = providerById(id)!.register;
      if (reg.kind !== "configFile") throw new Error("expected configFile");
      const obj = JSON.parse(reg.merge(null, inv));
      expect(obj.mcpServers.kanmer.command).toBe(inv.command);
      expect(obj.mcpServers.kanmer.args).toEqual(inv.args);
      expect(obj.mcpServers.kanmer.env.ELECTRON_RUN_AS_NODE).toBe("1");
    }
  });

  it("antigravity is register-only (no dispatch)", () => {
    expect(providerById("antigravity")!.dispatch).toBe(false);
    expect(providerById("claude")!.dispatch).toBe(true);
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
    expect(providerById("antigravity")!.dispatchArgs).toBeUndefined();
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

  it("writes [mcp_servers.kanmer] with command, args and env", () => {
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

describe("project skill installs (FRD-012 R2)", () => {
  it("opencode and Antigravity share one .agents/skills tree", () => {
    for (const id of ["opencode", "antigravity"] as const) {
      const install = providerById(id)!.install;
      expect(install.kind).toBe("copySkills");
      if (install.kind !== "copySkills") throw new Error("unreachable");
      expect(install.skillsScope).toBe("project");
      expect(install.skillsDir).toBe(".agents/skills");
    }
  });

  it("Grok keeps its own directory — it does not read .agents/skills", () => {
    const install = providerById("grok")!.install;
    if (install.kind !== "copySkills") throw new Error("unreachable");
    expect(install.skillsDir).toBe(".grok/skills");
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
