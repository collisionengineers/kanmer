import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { KanmerStore } from "../../core/dist/index.js";
import { readPrEvent } from "./check-pr.mjs";
import { removeTreeWithRetry } from "@kanmer/core";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const cli = path.join(repoRoot, "packages", "mcp-server", "src", "check-pr.mjs");

const HEAD = "a".repeat(40);
const BASE = "b".repeat(40);

/** A board whose delivery policy integrates into `dev` and releases from `main`. */
async function fixture(delivery) {
  const board = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-delivery-"));
  const store = new KanmerStore(board);
  await store.init();
  if (delivery) await store.updateBoard((config) => ({ ...config, delivery }));
  const ticket = await store.createItem({ type: "ticket", title: "delivery fixture", status: "review" });
  return { board, store, ticket, event: path.join(board, "event.json") };
}

function pullRequestEvent(body, baseRef) {
  return {
    pull_request: {
      number: 1,
      body,
      head: { sha: HEAD, ref: "feature" },
      base: { sha: BASE, ...(baseRef === undefined ? {} : { ref: baseRef }) },
    },
  };
}

function runGate(board, event, env = {}) {
  const result = spawnSync(process.execPath, [cli, "--board", board, "--event", event], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, KANMER_GATE_STRICT: "", ...env },
  });
  return { ...result, json: JSON.parse(result.stdout.trim().split("\n").at(-1)) };
}

function targetCheck(json) {
  return json.checks?.find((entry) => entry.code === "WRONG_TARGET");
}

test("readPrEvent carries the base ref through, and omits it when the event has none", () => {
  const withRef = readPrEvent(pullRequestEvent("Kanmer: CORE-1", "dev"));
  assert.equal(withRef.baseRef, "dev");
  assert.equal(withRef.baseSha, BASE);

  // An event with no base.ref must not be rejected, and must not acquire a
  // guessed default — a gate that assumed `main` would be the hardcoding
  // FRD-031 exists to remove.
  const withoutRef = readPrEvent(pullRequestEvent("Kanmer: CORE-1", undefined));
  assert.equal("baseRef" in withoutRef, false);
  assert.equal(withoutRef.baseSha, BASE);

  const blankRef = readPrEvent(pullRequestEvent("Kanmer: CORE-1", ""));
  assert.equal("baseRef" in blankRef, false);
});

test("the gate passes a main-only project's PR into main and never mentions a wrong target", async () => {
  const { board, ticket, event } = await fixture(null);
  await fs.writeFile(event, JSON.stringify(pullRequestEvent(`Kanmer: ${ticket.id}`, "main")), "utf8");
  const { json } = runGate(board, event);
  assert.equal(targetCheck(json).outcome, "pass");
  assert.equal(targetCheck(json).details.expected, "main");
  assert.equal(json.findings.some((f) => f.code === "WRONG_TARGET"), false);
  await removeTreeWithRetry(board);
});

test("the gate warns, without blocking, when a PR misses the configured integration branch", async () => {
  const { board, ticket, event } = await fixture({ integrationBranch: "dev", releaseBranch: "main" });
  await fs.writeFile(event, JSON.stringify(pullRequestEvent(`Kanmer: ${ticket.id}`, "main")), "utf8");
  const { json, stderr } = runGate(board, event);
  const check = targetCheck(json);
  assert.equal(check.outcome, "warn");
  assert.equal(check.level, "warning");
  assert.equal(check.details.baseRef, "main");
  assert.equal(check.details.expected, "dev");
  assert.match(stderr, /::warning title=kanmer\/gate \[WRONG_TARGET\]/u);
  await removeTreeWithRetry(board);
});

test("KANMER_GATE_STRICT promotes a wrong target to a blocking error", async () => {
  const { board, ticket, event } = await fixture({ integrationBranch: "dev", releaseBranch: "main" });
  await fs.writeFile(event, JSON.stringify(pullRequestEvent(`Kanmer: ${ticket.id}`, "main")), "utf8");
  const { json, status, stderr } = runGate(board, event, { KANMER_GATE_STRICT: "1" });
  assert.equal(targetCheck(json).outcome, "fail");
  assert.equal(targetCheck(json).level, "error");
  assert.equal(json.ok, false);
  assert.equal(status, 1);
  assert.match(stderr, /::error title=kanmer\/gate \[WRONG_TARGET\]/u);
  await removeTreeWithRetry(board);
});

test("an event with no base ref skips the target check rather than guessing", async () => {
  const { board, ticket, event } = await fixture({ integrationBranch: "dev" });
  await fs.writeFile(event, JSON.stringify(pullRequestEvent(`Kanmer: ${ticket.id}`, undefined)), "utf8");
  const { json } = runGate(board, event, { KANMER_GATE_STRICT: "1" });
  assert.equal(targetCheck(json).outcome, "skipped");
  assert.equal(json.findings.some((f) => f.code === "WRONG_TARGET"), false);
  await removeTreeWithRetry(board);
});

test("a recorded hotfix legitimately targets the release branch", async () => {
  const { board, store, ticket, event } = await fixture({ integrationBranch: "dev", releaseBranch: "main" });
  await store.updateItem(ticket.id, { delivery_branch: "main" });
  await fs.writeFile(event, JSON.stringify(pullRequestEvent(`Kanmer: ${ticket.id}`, "main")), "utf8");
  const onRelease = runGate(board, event, { KANMER_GATE_STRICT: "1" }).json;
  assert.equal(targetCheck(onRelease).outcome, "pass");
  assert.equal(targetCheck(onRelease).details.hotfix, true);
  await removeTreeWithRetry(board);
});
