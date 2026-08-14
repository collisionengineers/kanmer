import { describe, expect, it } from "vitest";
import {
  PROVIDERS,
  codexServerName,
  isNewerVersion,
  providerById,
  type Invocation,
} from "./providers.js";
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

  it("codex registers per-project by name and carries ELECTRON_RUN_AS_NODE", () => {
    const reg = providerById("codex")!.register;
    if (reg.kind !== "cli") throw new Error("expected cli");
    const cmd = reg.addCommand(inv, ROOT);
    expect(cmd).toContain(`codex mcp add ${codexServerName(ROOT)}`);
    expect(cmd).toContain("--env ELECTRON_RUN_AS_NODE=1");
    expect(cmd).toContain("--root");
    expect(reg.removeCommands(ROOT)).toEqual([`codex mcp remove ${codexServerName(ROOT)}`]);
  });

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
