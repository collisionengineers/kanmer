import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { KanmerStore } from "../../core/dist/index.js";
import {
  applyReconciliation,
  collectReconciliationEvidence,
  proofEvidence,
  pullRequestEvidence,
  reconcileTicket,
} from "../dist/reconciliation.js";

const mergeSha = "a".repeat(40);
const ghPass = JSON.stringify({
  state: "MERGED",
  headRefOid: "b".repeat(40),
  mergeCommit: { oid: mergeSha },
  statusCheckRollup: [{ status: "COMPLETED", conclusion: "SUCCESS" }],
});

test("proof and GitHub decoders preserve unavailable and failed states", () => {
  assert.deepEqual(proofEvidence(null), { state: "absent" });
  assert.deepEqual(proofEvidence("---\nkind: proof-record\nresult: PASS\nmerged_sha: abc\n---\n"), { state: "pass", mergedSha: "abc" });
  assert.deepEqual(proofEvidence("---\nkind: proof-record\nresult: FAIL\n---\n"), { state: "fail" });
  assert.deepEqual(proofEvidence("not frontmatter"), { state: "invalid" });
  assert.equal(pullRequestEvidence({ state: "OPEN", statusCheckRollup: [{ status: "IN_PROGRESS", conclusion: null }] }).requiredChecks, "pending");
  assert.deepEqual(pullRequestEvidence(null), { state: "unavailable", requiredChecks: "unavailable" });
});

test("collector uses only fixed gh argv and apply re-collects before moving a current ticket", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-reconciliation-mcp-"));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const store = new KanmerStore(root);
  await store.init();
  const ticket = await store.createItem({ type: "ticket", title: "Recover", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const calls = [];
  const run = async (command, args, options) => {
    calls.push({ command, args: [...args], cwd: options.cwd });
    assert.equal(command, "gh");
    assert.deepEqual(args, ["pr", "view", "12", "--json", "state,headRefOid,mergeCommit,statusCheckRollup"]);
    assert.equal(options.cwd, root);
    return { stdout: ghPass };
  };

  const evidence = await collectReconciliationEvidence(store, ticket.id, run);
  assert.equal(evidence.pullRequest.state, "merged");
  assert.equal(evidence.pullRequest.requiredChecks, "pass");
  const dryRun = await reconcileTicket(store, ticket.id, run);
  assert.equal(dryRun.proposal?.action, "MOVE_TO_VERIFYING");
  const applied = await applyReconciliation(store, { id: ticket.id, expectedUpdated: ticket.updated, proposalId: dryRun.proposal.id }, run);
  assert.equal(applied.item.status, "verifying");
  assert.equal(calls.length, 3, "collect, dry-run and apply each gather fresh facts");
});

test("apply refuses when fresh evidence no longer yields the proposed action", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-reconciliation-conflict-"));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const store = new KanmerStore(root);
  await store.init();
  const ticket = await store.createItem({ type: "ticket", title: "Conflict", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const merged = async () => ({ stdout: ghPass });
  const dryRun = await reconcileTicket(store, ticket.id, merged);
  const closed = async () => ({ stdout: JSON.stringify({ state: "CLOSED", mergeCommit: null, statusCheckRollup: [{ status: "COMPLETED", conclusion: "SUCCESS" }] }) });
  await assert.rejects(
    () => applyReconciliation(store, { id: ticket.id, expectedUpdated: ticket.updated, proposalId: dryRun.proposal.id }, closed),
    /Conflict: reconciliation evidence/,
  );
  assert.equal((await store.getItem(ticket.id))?.status, "review");
});
