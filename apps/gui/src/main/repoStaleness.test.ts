import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { defaultBoardConfig, detectStaleness, resolvePaths } from "@kanmer/core";
import { BLOCK_BODY, END, removeManagedBlock, START } from "./agentsBlock.js";
import { repoStalenessFor } from "./repoStaleness.js";
import { removeTreeWithRetrySync } from "@kanmer/core";

const roots: string[] = [];
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function tempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kanmer-gui-staleness-"));
  roots.push(root);
  return root;
}

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

afterEach(() => {
  for (const root of roots.splice(0)) removeTreeWithRetrySync(root);
});

describe("repoStalenessFor", () => {
  it("uses the source checkout rather than the separate board worktree", async () => {
    const root = tempRoot();
    const source = path.join(root, "source");
    const board = path.join(root, "board-worktree");
    const bundled = path.join(root, "bundle", "skills");
    const start = "<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->";
    const end = "<!-- kanmer:instructions:end -->";
    write(path.join(bundled, "kanmer-setup", "SKILL.md"), `\`\`\`markdown\n${start}\ncurrent\n${end}\n\`\`\`\n`);
    write(path.join(source, "AGENTS.md"), `${start}\nstale\n${end}\n`);

    const paths = resolvePaths(board, source);
    const input = {
      paths,
      board: defaultBoardConfig(),
      boardSource: "default" as const,
      format: 3,
      bundledSkillsDir: bundled,
    };
    const throughGui = await repoStalenessFor({
      paths,
      getBoardWithSource: async () => ({ board: input.board, source: input.boardSource }),
      detectFormat: async () => input.format,
    }, bundled);

    expect(throughGui).toEqual(detectStaleness(input));
    expect(throughGui.stale).toEqual(
      expect.arrayContaining([expect.objectContaining({ artefact: "agents-block", state: "behind" })]),
    );
  });

  it("proves setup, drift detection, repeatability, and removal preserve AGENTS ownership", () => {
    const root = tempRoot();
    const repo = path.join(root, "disposable-repo");
    const agents = path.join(repo, "AGENTS.md");
    const template = path.join(
      repoRoot,
      "plugins",
      "kanmer",
      "skills",
      "kanmer-docs",
      "assets",
      "agents-template.md",
    );
    const writer = path.join(repoRoot, "scripts", "agents-block.mjs");
    const bundledSkills = path.join(repoRoot, "plugins", "kanmer", "skills");

    // This is the missing-file route prescribed by kanmer-setup: materialise
    // the one user-owned template, then run the writer that owns only markers.
    fs.mkdirSync(repo, { recursive: true });
    fs.copyFileSync(template, agents);
    const skeleton = fs.readFileSync(agents, "utf8");
    execFileSync(process.execPath, [writer, repo], { encoding: "utf8" });
    const first = fs.readFileSync(agents, "utf8");

    expect(first).toContain(BLOCK_BODY);
    expect(first).toContain("## Agent conduct");
    for (const heading of ["Commands", "Architecture map", "Conventions", "Gotchas", "Verification"]) {
      expect(first).toMatch(new RegExp(`^## ${heading}$`, "m"));
    }

    execFileSync(process.execPath, [writer, repo], { encoding: "utf8" });
    expect(fs.readFileSync(agents, "utf8")).toBe(first);

    const tampered = first.replace(
      "# Kanmer operating instructions",
      "# Tampered Kanmer operating instructions",
    );
    expect(tampered).not.toBe(first);
    fs.writeFileSync(agents, tampered, "utf8");
    const stale = detectStaleness({
      paths: resolvePaths(repo),
      board: defaultBoardConfig(),
      boardSource: "default",
      format: 3,
      bundledSkillsDir: bundledSkills,
    });
    expect(stale.stale).toEqual(
      expect.arrayContaining([expect.objectContaining({ artefact: "agents-block", state: "behind" })]),
    );

    const remaining = removeManagedBlock(fs.readFileSync(agents, "utf8"));
    expect(remaining).not.toBeNull();
    fs.writeFileSync(agents, remaining!, "utf8");
    expect(fs.readFileSync(agents, "utf8")).toBe(skeleton);
    expect(fs.readFileSync(agents, "utf8")).not.toContain(START);
    expect(fs.readFileSync(agents, "utf8")).not.toContain(END);

    const removed = detectStaleness({
      paths: resolvePaths(repo),
      board: defaultBoardConfig(),
      boardSource: "default",
      format: 3,
      bundledSkillsDir: bundledSkills,
    });
    expect(removed.stale).toEqual(
      expect.arrayContaining([expect.objectContaining({ artefact: "agents-block", state: "unstamped" })]),
    );
  });
});
