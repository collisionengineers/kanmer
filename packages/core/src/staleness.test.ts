// Staleness detection (CORE-023).
//
// Half these cases assert that a row is **absent**. That is not padding: the
// failure mode this feature dies of is not missing a stale artefact, it is
// warning about a healthy one. A report that fires on every repo is a report
// nobody reads, so "a user's own skill is not drift" and "board.yml omitting
// questions-resolved is not a warning" are load-bearing tests, not nice-to-haves.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectStaleness, registeredRootIn, SKILLS_STAMP_FILE } from "./staleness.js";
import { resolvePaths } from "./paths.js";
import { defaultBoardConfig } from "./board.js";
import type { BoardConfig } from "./types.js";

const BLOCK_START =
  "<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->";
const BLOCK_END = "<!-- kanmer:instructions:end -->";

/** The body the fixture bundle "ships". Arbitrary — nothing under test knows it. */
const CANONICAL = "# Kanmer operating instructions\n\n- Start every session with `get_status`.";

let root: string;
let bundled: string;

/** Write a file, creating parents. */
function put(file: string, text: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-staleness-"));
  // The fixture "bundled skills tree": the setup skill carries the canonical
  // AGENTS block between the real markers, exactly as the shipped one does and
  // as scripts/verify-agents-block.mjs enforces.
  bundled = path.join(root, "_bundled", "skills");
  put(
    path.join(bundled, "kanmer-setup", "SKILL.md"),
    `# Setup\n\nprose\n\n\`\`\`markdown\n${BLOCK_START}\n${CANONICAL}\n${BLOCK_END}\n\`\`\`\n`,
  );
  put(path.join(bundled, "kanmer-plan", "SKILL.md"), "# Plan\n\nplan prose\n");
  put(path.join(bundled, "kanmer-plan", "assets", "plan-template.md"), "# Template\n");
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

/** Run the detector over the fixture repo. */
function detect(opts: { board?: BoardConfig; source?: "file" | "default"; format?: number } = {}) {
  return detectStaleness({
    paths: resolvePaths(root),
    board: opts.board ?? defaultBoardConfig(),
    boardSource: opts.source ?? "default",
    format: opts.format ?? 3,
    bundledSkillsDir: bundled,
  });
}

/** All entries for one artefact. */
const rowsFor = (r: ReturnType<typeof detect>, artefact: string) =>
  r.stale.filter((e) => e.artefact === artefact);

/** Install the bundled skills into a destination, byte-identical. */
function installSkills(dest: string, stamp = true): void {
  fs.cpSync(bundled, path.join(root, dest), { recursive: true });
  if (stamp) put(path.join(root, dest, SKILLS_STAMP_FILE), "0.3.3\nskills:\nkanmer-plan\n");
}

/** A correct AGENTS.md, block and all. */
function writeAgents(body = CANONICAL): void {
  put(path.join(root, "AGENTS.md"), `${BLOCK_START}\n${body}\n${BLOCK_END}\n\n# Their guide\n`);
}

describe("detectStaleness — a current repo", () => {
  it("reports clean when the block and skills match what is bundled", () => {
    writeAgents();
    installSkills(".claude/skills");
    const r = detect();
    expect(r.stale).toEqual([]);
    expect(r.upToDate).toBe(true);
  });

  it("says nothing at all about a repo with no Kanmer artefacts beyond the block", () => {
    writeAgents();
    expect(detect().stale).toEqual([]);
  });
});

describe("detectStaleness — the AGENTS.md managed block", () => {
  it("reports a drifted block as behind, and clears upToDate", () => {
    // The live reproduction in miniature: a v2-era body where the current one
    // should be. Connect really did write one of these over this repo's own
    // AGENTS.md (CORE-023 scratch-live-reproduction).
    writeAgents("# Kanmer operating instructions\n\nStages: backlog → researching → planning → …");
    const r = detect();
    expect(rowsFor(r, "agents-block")[0]?.state).toBe("behind");
    expect(r.upToDate).toBe(false);
  });

  it("does not hardcode the current body — the reference comes from the bundle", () => {
    // Move the bundle's idea of canonical, leave the repo alone: what was clean
    // must now be behind. This is the property that lets SKILL-013 rewrite the
    // block body without touching a line of this detector.
    writeAgents();
    put(
      path.join(bundled, "kanmer-setup", "SKILL.md"),
      `${BLOCK_START}\n# Something entirely different\n${BLOCK_END}\n`,
    );
    expect(rowsFor(detect(), "agents-block")[0]?.state).toBe("behind");
  });

  it("treats a missing AGENTS.md as unstamped, not behind", () => {
    const r = detect();
    expect(rowsFor(r, "agents-block")[0]?.state).toBe("unstamped");
    expect(r.upToDate).toBe(true);
  });

  it("treats an AGENTS.md with no markers as unstamped", () => {
    put(path.join(root, "AGENTS.md"), "# Their guide\n\nNo Kanmer block here.\n");
    expect(rowsFor(detect(), "agents-block")[0]?.state).toBe("unstamped");
  });

  it("treats malformed markers as unknown rather than throwing", () => {
    put(path.join(root, "AGENTS.md"), `${BLOCK_END}\nbackwards\n${BLOCK_START}\n`);
    const row = rowsFor(detect(), "agents-block")[0];
    expect(row?.state).toBe("unknown");
    expect(row?.detail).toMatch(/malformed/);
  });

  it("reports unknown, never behind, when the bundled reference cannot be found", () => {
    writeAgents("anything at all");
    const r = detectStaleness({
      paths: resolvePaths(root),
      board: defaultBoardConfig(),
      boardSource: "default",
      format: 3,
      bundledSkillsDir: null,
    });
    expect(rowsFor(r, "agents-block")[0]?.state).toBe("unknown");
    expect(r.upToDate).toBe(true);
  });

  it("ignores line-ending differences", () => {
    put(
      path.join(root, "AGENTS.md"),
      `${BLOCK_START}\r\n${CANONICAL.replace(/\n/g, "\r\n")}\r\n${BLOCK_END}\r\n`,
    );
    expect(rowsFor(detect(), "agents-block")).toEqual([]);
  });
});

describe("detectStaleness — installed skills", () => {
  it("reports a drifted skill file as behind, naming the skill", () => {
    writeAgents();
    installSkills(".claude/skills");
    put(path.join(root, ".claude/skills/kanmer-plan/SKILL.md"), "# Plan\n\nan older version\n");
    const row = rowsFor(detect(), "skills")[0];
    expect(row?.state).toBe("behind");
    expect(row?.detail).toContain("kanmer-plan");
    expect(row?.detail).toContain(".claude/skills");
  });

  it("catches drift below the top level, not just in SKILL.md", () => {
    writeAgents();
    installSkills(".claude/skills");
    put(path.join(root, ".claude/skills/kanmer-plan/assets/plan-template.md"), "# Old template\n");
    expect(rowsFor(detect(), "skills")[0]?.state).toBe("behind");
  });

  it("reports a partially installed skill set as behind", () => {
    writeAgents();
    installSkills(".claude/skills");
    fs.rmSync(path.join(root, ".claude/skills/kanmer-plan"), { recursive: true });
    expect(rowsFor(detect(), "skills")[0]?.detail).toMatch(/missing/);
  });

  it("DOES NOT count a skill the user wrote as drift", () => {
    // The operator's explicit rule, and not hypothetical: this repo's real
    // .claude/skills holds a `run-kanmer` skill with 115 files of node_modules
    // under it. The bundled-tree-first walk never even reads them.
    writeAgents();
    installSkills(".claude/skills");
    put(path.join(root, ".claude/skills/my-own-skill/SKILL.md"), "# Mine\n");
    put(path.join(root, ".claude/skills/my-own-skill/node_modules/x/index.js"), "junk");
    expect(rowsFor(detect(), "skills")).toEqual([]);
    expect(detect().upToDate).toBe(true);
  });

  it("says nothing about a skills directory holding none of Kanmer's skills", () => {
    writeAgents();
    put(path.join(root, ".agents/skills/somebody-elses/SKILL.md"), "# Theirs\n");
    expect(detect().stale).toEqual([]);
  });

  it("reports a retired skill that is still installed", () => {
    writeAgents();
    installSkills(".claude/skills");
    put(path.join(root, ".claude/skills/kanmer-import/SKILL.md"), "# Import\n");
    const retired = rowsFor(detect(), "skills").find((e) => e.detail.includes("retired"));
    expect(retired?.state).toBe("behind");
    expect(retired?.detail).toContain("kanmer-import");
  });

  it("checks every destination independently", () => {
    writeAgents();
    installSkills(".claude/skills");
    installSkills(".agents/skills");
    put(path.join(root, ".agents/skills/kanmer-plan/SKILL.md"), "# stale\n");
    const rows = rowsFor(detect(), "skills");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.detail).toContain(".agents/skills");
  });

  it("reports unknown, not behind, when there is no reference tree", () => {
    writeAgents();
    installSkills(".claude/skills");
    const r = detectStaleness({
      paths: resolvePaths(root),
      board: defaultBoardConfig(),
      boardSource: "default",
      format: 3,
      bundledSkillsDir: null,
    });
    expect(rowsFor(r, "skills")[0]?.state).toBe("unknown");
    expect(r.upToDate).toBe(true);
  });
});

describe("detectStaleness — the skills stamp", () => {
  it("reports an unstamped destination as unstamped, and keeps upToDate true", () => {
    writeAgents();
    installSkills(".claude/skills", false);
    const r = detect();
    expect(rowsFor(r, "skills-stamp")[0]?.state).toBe("unstamped");
    expect(r.upToDate).toBe(true);
  });

  it("says nothing when the stamp is present", () => {
    writeAgents();
    installSkills(".claude/skills");
    expect(rowsFor(detect(), "skills-stamp")).toEqual([]);
  });
});

describe("detectStaleness — board.yml", () => {
  /** A board config as an older Kanmer would have written it. */
  function boardWith(patch: Partial<BoardConfig>): BoardConfig {
    return { ...defaultBoardConfig(), ...patch };
  }

  it("says nothing about a synthesized default board", () => {
    writeAgents();
    expect(rowsFor(detect({ source: "default" }), "board-config")).toEqual([]);
  });

  it("reports questions-resolved as COMPENSATED, never behind", () => {
    // The single most important row in the module. Every board in existence
    // omits this key — resolveProfiles() injects it at read time — so `behind`
    // here would put a permanent warning on every get_status call ever made.
    writeAgents();
    const board = boardWith({ profiles: { feature: { "leave-preparing": ["plan"] } } });
    const r = detect({ board, source: "file" });
    const row = rowsFor(r, "board-config").find((e) => e.detail.includes("questions-resolved"));
    expect(row?.state).toBe("compensated");
    expect(row?.fix).toBe("none — informational");
    expect(r.upToDate).toBe(true);
  });

  it("says nothing when profiles already declare questions-resolved", () => {
    writeAgents();
    const board = boardWith({
      profiles: { feature: { "leave-preparing": ["plan", "questions-resolved"] } },
    });
    const rows = rowsFor(detect({ board, source: "file" }), "board-config");
    expect(rows.filter((e) => e.detail.includes("questions-resolved"))).toEqual([]);
  });

  it("reports dead format-2 keys as behind on a format-3 board", () => {
    writeAgents();
    const board = boardWith({
      profiles: { feature: { "leave-preparing": ["plan", "questions-resolved"] } },
      priorities: [{ id: "high", name: "High" }],
    });
    const r = detect({ board, source: "file", format: 3 });
    const row = rowsFor(r, "board-config").find((e) => e.state === "behind");
    expect(row?.detail).toContain("priorities");
    expect(r.upToDate).toBe(false);
  });

  it("does not call dead keys behind on a board that has not been migrated yet", () => {
    // On format 2 those keys are simply that board's shape, and the format
    // banner is already telling the user what to do.
    writeAgents();
    const board = boardWith({
      profiles: { feature: { "leave-preparing": ["plan", "questions-resolved"] } },
      priorities: [{ id: "high", name: "High" }],
    });
    const r = detect({ board, source: "file", format: 2 });
    expect(rowsFor(r, "board-config").filter((e) => e.state === "behind")).toEqual([]);
    expect(r.upToDate).toBe(true);
  });

  it("reports absent newer keys as compensated", () => {
    writeAgents();
    const board = boardWith({
      profiles: { feature: { "leave-preparing": ["plan", "questions-resolved"] } },
    });
    delete board.groupKinds;
    delete board.proofTypes;
    const r = detect({ board, source: "file" });
    const row = rowsFor(r, "board-config").find((e) => e.detail.includes("groupKinds"));
    expect(row?.state).toBe("compensated");
    expect(r.upToDate).toBe(true);
  });
});

describe("detectStaleness — provider MCP registrations", () => {
  const registration = (root_: string) =>
    JSON.stringify(
      { mcpServers: { kanmer: { command: "node", args: ["kanmer-mcp.cjs", "--root", root_] } } },
      null,
      2,
    );

  it("says nothing when the registration points at this board", () => {
    writeAgents();
    put(path.join(root, ".mcp.json"), registration(root));
    expect(rowsFor(detect(), "mcp-registration")).toEqual([]);
  });

  it("reports a registration pointing somewhere else as behind", () => {
    writeAgents();
    put(path.join(root, ".mcp.json"), registration(path.join(root, "..", "some-other-repo")));
    const r = detect();
    expect(rowsFor(r, "mcp-registration")[0]?.state).toBe("behind");
    expect(r.upToDate).toBe(false);
  });

  it("says nothing about a registration with no explicit --root", () => {
    // Board discovery from cwd upwards is a supported shape (ADR-0012), not an
    // old one.
    writeAgents();
    put(
      path.join(root, ".mcp.json"),
      JSON.stringify({ mcpServers: { kanmer: { command: "node", args: ["kanmer-mcp.cjs"] } } }),
    );
    expect(rowsFor(detect(), "mcp-registration")).toEqual([]);
  });

  it("says nothing about a config that does not mention kanmer at all", () => {
    writeAgents();
    put(
      path.join(root, ".mcp.json"),
      JSON.stringify({ mcpServers: { other: { args: ["--root", "/elsewhere"] } } }),
    );
    expect(rowsFor(detect(), "mcp-registration")).toEqual([]);
  });

  it("reads a TOML registration with the same extractor as a JSON one", () => {
    writeAgents();
    put(
      path.join(root, ".codex/config.toml"),
      `[mcp_servers.kanmer]\ncommand = "node"\nargs = ["kanmer-mcp.cjs", "--root", "${path
        .join(root, "..", "gone")
        .replace(/\\/g, "\\\\")}"]\n`,
    );
    expect(rowsFor(detect(), "mcp-registration")[0]?.state).toBe("behind");
  });

  it("is not confused by --repo-root", () => {
    expect(registeredRootIn('["--repo-root", "C:/a", "--root", "C:/b"]')).toBe("C:/b");
    expect(registeredRootIn('["--repo-root", "C:/a"]')).toBeNull();
  });

  it("unescapes the recorded path", () => {
    expect(registeredRootIn('"--root", "C:\\\\Users\\\\me\\\\repo"')).toBe("C:\\Users\\me\\repo");
  });
});

describe("detectStaleness — robustness", () => {
  it("never throws on a repo root that does not exist", () => {
    const missing = path.join(root, "not-there");
    expect(() =>
      detectStaleness({
        paths: resolvePaths(missing),
        board: defaultBoardConfig(),
        boardSource: "default",
        format: 3,
        bundledSkillsDir: bundled,
      }),
    ).not.toThrow();
  });

  it("never reports a state outside the four-value vocabulary", () => {
    writeAgents("drifted");
    installSkills(".claude/skills", false);
    put(path.join(root, ".claude/skills/kanmer-plan/SKILL.md"), "# old\n");
    put(path.join(root, ".mcp.json"), '{"mcpServers":{"kanmer":{"args":["--root","/elsewhere"]}}}');
    const board = { ...defaultBoardConfig(), profiles: { feature: { "leave-preparing": ["plan"] } } };
    const r = detect({ board, source: "file" });
    expect(r.stale.length).toBeGreaterThan(3);
    for (const e of r.stale) {
      expect(["behind", "compensated", "unstamped", "unknown"]).toContain(e.state);
      expect(e.detail).not.toBe("");
      expect(e.fix).not.toBe("");
    }
    expect(r.upToDate).toBe(false);
  });
});
