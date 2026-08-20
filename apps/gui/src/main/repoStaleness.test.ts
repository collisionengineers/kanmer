import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultBoardConfig, detectStaleness, resolvePaths } from "@kanmer/core";
import { repoStalenessFor } from "./repoStaleness.js";

const roots: string[] = [];

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
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
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
});
