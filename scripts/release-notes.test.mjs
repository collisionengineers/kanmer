import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("release notes turn shorthand PR refs into repository links", () => {
  const boardRoot = mkdtempSync(join(tmpdir(), "kanmer-release-notes-"));
  const ticketDir = join(boardRoot, ".kanmer", "areas", "core", "CORE-027");
  mkdirSync(ticketDir, { recursive: true });
  // CORE-027 is the documented merged ticket behind PR #96. Keep this small
  // fixture in the test so clean CI does not need the operator's board
  // worktree, while retaining the real stage/PR data the regression covers.
  writeFileSync(
    join(ticketDir, "CORE-027.md"),
    `---
id: CORE-027
type: ticket
title: Give @kanmer/core a browser-safe subpath export
status: done
area: core
stageEntered:
  done: '2026-08-21T01:04:37.070Z'
prs:
  - '96'
archived: false
created: '2026-08-16T20:18:36.563Z'
updated: '2026-08-21T13:02:17.321Z'
---
`,
    "utf8",
  );

  try {
    const output = execFileSync(
      process.execPath,
      ["scripts/release-notes.mjs", "--since", "v0.3.2"],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, KANMER_BOARD_ROOT: boardRoot },
      },
    );

    assert.match(
      output,
      /\(\[PR\]\(https:\/\/github\.com\/collisionengineers\/kanmer\/pull\/96\)\)/,
    );
    assert.doesNotMatch(output, /\(\[PR\]\((?:#)?96\)\)/);
  } finally {
    rmSync(boardRoot, { recursive: true, force: true });
  }
});
