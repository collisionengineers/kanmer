import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { KanmerStore } from "../../core/dist/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const cli = path.join(repoRoot, "packages", "mcp-server", "src", "check-pr.mjs");

async function fixture() {
  const board = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-check-pr-"));
  const store = new KanmerStore(board);
  await store.init();
  const ticket = await store.createItem({ type: "ticket", title: "CLI fixture" });
  const event = path.join(board, "event.json");
  return { board, ticket, event };
}

function run(board, event, ...args) {
  return spawnSync(process.execPath, [cli, "--board", board, "--event", event, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("check-pr emits one JSON verdict and uses exit 0/1/2", async () => {
  const { board, ticket, event } = await fixture();
  try {
    await fs.writeFile(event, JSON.stringify({ pull_request: { number: 1, body: `Kanmer: ${ticket.id}`, head: { sha: "abc", ref: "wrong-branch" } } }));
    const pass = run(board, event);
    assert.equal(pass.status, 0);
    assert.equal(JSON.parse(pass.stdout).ok, true);
    assert.equal(pass.stdout.trim().split("\n").length, 1);

    await fs.mkdir(path.join(board, ".kanmer", "areas", "_none", ticket.id, "open-questions"), { recursive: true });
    await fs.writeFile(path.join(board, ".kanmer", "areas", "_none", ticket.id, "open-questions", "questions.md"), "- [ ] choose", "utf8");
    const fail = run(board, event);
    assert.equal(fail.status, 1);
    assert.match(fail.stderr, /::error title=kanmer-gate::/);
    assert.equal(JSON.parse(fail.stdout).findings[0].code, "OPEN_QUESTIONS");

    await fs.writeFile(event, JSON.stringify({ pull_request: { number: 2, body: null, head: { sha: "def", ref: "feature/no-ticket" } } }));
    const noTicket = run(board, event);
    assert.equal(noTicket.status, 1);
    assert.equal(JSON.parse(noTicket.stdout).findings[0].code, "NO_TICKET");

    const infra = spawnSync(process.execPath, [cli, "--unknown"], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(infra.status, 2);
    assert.doesNotMatch(infra.stderr, /node_modules|[A-Za-z]:\\/);
  } finally {
    await fs.rm(board, { recursive: true, force: true });
  }
});
