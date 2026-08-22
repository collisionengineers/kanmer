import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { KanmerStore } from "../../core/dist/index.js";
import { assertGitRepository, collectCommitReachability } from "./git-reachability.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const cli = path.join(repoRoot, "packages", "mcp-server", "src", "check-pr.mjs");

async function fixture() {
  const board = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-check-pr-"));
  const store = new KanmerStore(board);
  await store.init();
  const ticket = await store.createItem({ type: "ticket", title: "CLI fixture", status: "review" });
  const event = path.join(board, "event.json");
  return { board, store, ticket, event };
}

function run(board, event, ...args) {
  return spawnSync(process.execPath, [cli, "--board", board, "--event", event, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("check-pr emits one JSON verdict and uses exit 0/1/2", async () => {
  const { board, store, ticket, event } = await fixture();
  try {
    await fs.writeFile(event, JSON.stringify({ pull_request: { number: 1, body: `Kanmer: ${ticket.id}`, head: { sha: "a".repeat(40), ref: "wrong-branch" } } }));
    const pass = run(board, event);
    assert.equal(pass.status, 0);
    assert.equal(JSON.parse(pass.stdout).ok, true);
    assert.equal(pass.stdout.trim().split("\n").length, 1);
    assert.match(pass.stderr, /::warning title=kanmer\/gate \[NO_REVIEW_RECORD\]::/);

    await fs.mkdir(path.join(board, ".kanmer", "areas", "_none", ticket.id, "open-questions"), { recursive: true });
    await fs.writeFile(path.join(board, ".kanmer", "areas", "_none", ticket.id, "open-questions", "questions.md"), "- [ ] choose", "utf8");
    const fail = run(board, event);
    assert.equal(fail.status, 1);
    assert.match(fail.stderr, /::error title=kanmer\/gate \[OPEN_QUESTIONS\]::/);
    assert.equal(JSON.parse(fail.stdout).findings[0].code, "OPEN_QUESTIONS");

    const blockedTicket = await store.createItem({ type: "ticket", title: "blocked", status: "review" });
    const blocker = await store.createItem({ type: "ticket", title: "blocker", status: "implementing" });
    await store.updateItem(blocker.id, { blocks: [blockedTicket.id] });
    await fs.writeFile(event, JSON.stringify({ pull_request: { number: 3, body: `Kanmer: ${blockedTicket.id}`, head: { sha: "a".repeat(40), ref: "blocked" } } }));
    const blocked = run(board, event);
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /\[DEPENDENCY_BLOCKED\]/);
    assert.equal(JSON.parse(blocked.stdout).checks.find((check) => check.code === "WRONG_STAGE").outcome, "pass");

    const cleanTicket = await store.createItem({ type: "ticket", title: "review record", status: "review" });
    await store.setDoc(cleanTicket.id, "scratch/review", "---\nkind: wrong-record\nhead_sha: abc\n---\n");
    await fs.writeFile(event, JSON.stringify({ pull_request: { number: 4, body: `Kanmer: ${cleanTicket.id}`, head: { sha: "a".repeat(40), ref: "review-record" } } }));
    const invalidReview = run(board, event);
    assert.equal(invalidReview.status, 0);
    assert.match(invalidReview.stderr, /\[STALE_REVIEW\]/);

    await store.setDoc(cleanTicket.id, "scratch/review", "---\nkind: [broken\n---\n");
    const malformedReview = run(board, event);
    assert.equal(malformedReview.status, 0);
    assert.match(malformedReview.stderr, /\[STALE_REVIEW\]/);

    await fs.writeFile(event, JSON.stringify({ pull_request: { number: 2, body: null, head: { sha: "def", ref: "feature/no-ticket" } } }));
    const noTicket = run(board, event);
    assert.equal(noTicket.status, 1);
    assert.equal(JSON.parse(noTicket.stdout).findings[0].code, "NO_TICKET");

    const infra = spawnSync(process.execPath, [cli, "--unknown"], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(infra.status, 2);
    assert.equal(JSON.parse(infra.stdout).infrastructureError, true);
    assert.doesNotMatch(infra.stderr, /node_modules|[A-Za-z]:\\/);
  } finally {
    await fs.rm(board, { recursive: true, force: true });
  }
});

test("git reachability uses argv-safe bounded ancestry checks and preserves states", async () => {
  const calls = [];
  const a = "a".repeat(40);
  const b = "b".repeat(40);
  const c = "c".repeat(40);
  const evidence = await collectCommitReachability({
    commits: [b, a, b, "not-a-sha", c],
    headSha: a,
    cwd: "C:\\hostile root\\$() `tick`; &",
    run: async (file, args, options) => {
      calls.push({ file, args, options });
      if (args[0] === "rev-parse") return { stdout: ".git" };
      if (args[2] === b) throw Object.assign(new Error("not ancestor"), { code: 1 });
      if (args[2] === c) throw Object.assign(new Error("missing object"), { code: 128, stderr: "missing object" });
      return {};
    },
  });
  assert.deepEqual(evidence, [
    { sha: "a".repeat(40), state: "reachable" },
    { sha: "b".repeat(40), state: "unreachable" },
    { sha: "c".repeat(40), state: "indeterminate", diagnostic: "missing object" },
    { sha: "not-a-sha", state: "indeterminate", diagnostic: "ticket commit is not a full hexadecimal Git object id" },
  ]);
  assert.equal(calls.every((call) => call.file === "git" && call.args[0] === "merge-base" && Array.isArray(call.args)), true);
  assert.equal(calls.every((call) => call.options.cwd.includes("$()")), true);
  await assertGitRepository({ cwd: "C:\\hostile root", run: async (file, args) => {
    assert.equal(file, "git");
    assert.deepEqual(args, ["rev-parse", "--git-dir"]);
    return { stdout: ".git" };
  } });
});
