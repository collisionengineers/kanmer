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
  requiredChecksEvidence,
  workspaceEvidence,
} from "../dist/reconciliation.js";

const mergeSha = "a".repeat(40);
const headSha = "b".repeat(40);
const repoJson = JSON.stringify({ nameWithOwner: "collisionengineers/kanmer" });
const mergedJson = JSON.stringify({ state: "MERGED", headRefOid: headSha, mergeCommit: { oid: mergeSha } });
const openJson = JSON.stringify({ state: "OPEN", headRefOid: headSha, mergeCommit: null });
const passChecks = JSON.stringify([{ state: "SUCCESS", bucket: "pass" }]);

function proof(result = "PASS") {
  return "---\n" +
    "kind: proof-record\n" +
    "merged_sha: " + mergeSha + "\n" +
    "environment: detached fixture\n" +
    "verified_at: \"2026-08-26T00:00:00.000Z\"\n" +
    "result: " + result + "\n" +
    "attempts: []\n" +
    "---\n";
}

function ghRun({ view = new Map([["12", mergedJson]]), checks = passChecks } = {}) {
  return async (command, args, options) => {
    assert.equal(command, "gh");
    assert.equal(options.windowsHide, true);
    if (args[0] === "repo") {
      assert.deepEqual(args, ["repo", "view", "--json", "nameWithOwner"]);
      return { stdout: repoJson };
    }
    if (args[0] === "pr" && args[1] === "view") {
      assert.deepEqual(args.slice(3), ["--json", "state,headRefOid,mergeCommit"]);
      const response = view.get(args[2]);
      if (!response) throw new Error("missing fixture PR");
      return { stdout: response };
    }
    if (args[0] === "pr" && args[1] === "checks") {
      assert.deepEqual(args.slice(3), ["--required", "--json", "state,bucket"]);
      return { stdout: checks };
    }
    assert.fail("unexpected command: " + command + " " + args.join(" "));
  };
}

test("proof and required-check decoders reject incomplete or unrelated evidence", () => {
  assert.deepEqual(proofEvidence(null), { state: "absent" });
  assert.deepEqual(proofEvidence(proof()), { state: "pass", mergedSha: mergeSha });
  assert.deepEqual(proofEvidence(proof().replace("\"2026-08-26T00:00:00.000Z\"", "2026-08-26T00:00:00.000Z")), { state: "pass", mergedSha: mergeSha });
  assert.deepEqual(proofEvidence("---\nkind: proof-record\nresult: PASS\nmerged_sha: abc\n---\n"), { state: "invalid" });
  assert.deepEqual(proofEvidence(proof("FAIL")), { state: "fail", mergedSha: mergeSha });
  assert.deepEqual(proofEvidence("not frontmatter"), { state: "invalid" });
  assert.equal(requiredChecksEvidence([{ state: "IN_PROGRESS", bucket: "pending" }]), "pending");
  assert.equal(requiredChecksEvidence([{ state: "SUCCESS", bucket: "pass" }]), "pass");
  assert.equal(requiredChecksEvidence([]), "not-applicable");
  assert.equal(requiredChecksEvidence({ statusCheckRollup: [{ status: "COMPLETED", conclusion: "SUCCESS" }] }), "unavailable");
  assert.deepEqual(pullRequestEvidence(null, "pass"), { state: "unavailable", requiredChecks: "unavailable" });
});

test("collector selects the active recorded PR rather than the first reference and uses required-only checks", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-reconciliation-mcp-"));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const store = new KanmerStore(root);
  await store.init();
  const ticket = await store.createItem({ type: "ticket", title: "Recover", profile: "custom", requires: {}, status: "review", prs: ["11", "12"] });
  const calls = [];
  const run = async (...args) => {
    calls.push(args);
    return ghRun({ view: new Map([["11", mergedJson], ["12", openJson]]) })(...args);
  };
  const evidence = await collectReconciliationEvidence(store, ticket.id, run);
  assert.equal(evidence.pullRequest.state, "open");
  assert.equal(evidence.pullRequest.requiredChecks, "pass");
  assert.deepEqual(calls.map(([, args]) => args), [
    ["repo", "view", "--json", "nameWithOwner"],
    ["pr", "view", "11", "--json", "state,headRefOid,mergeCommit"],
    ["pr", "view", "12", "--json", "state,headRefOid,mergeCommit"],
    ["pr", "checks", "12", "--required", "--json", "state,bucket"],
  ]);
});

test("collector preserves a same-repository PR URL and rejects a cross-repository one before query", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-reconciliation-url-"));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const store = new KanmerStore(root);
  await store.init();
  const local = await store.createItem({ type: "ticket", title: "Local URL", profile: "custom", requires: {}, status: "review", prs: ["https://github.com/collisionengineers/kanmer/pull/12"] });
  const localCalls = [];
  const localRun = async (...args) => {
    localCalls.push(args);
    return ghRun({ view: new Map([["https://github.com/collisionengineers/kanmer/pull/12", mergedJson]]) })(...args);
  };
  assert.equal((await collectReconciliationEvidence(store, local.id, localRun)).pullRequest.state, "merged");
  assert.deepEqual(localCalls[1][1], ["pr", "view", "https://github.com/collisionengineers/kanmer/pull/12", "--json", "state,headRefOid,mergeCommit"]);
  const duplicate = await store.createItem({ type: "ticket", title: "Duplicate reference", profile: "custom", requires: {}, status: "review", prs: ["12", "https://github.com/collisionengineers/kanmer/pull/12"] });
  const duplicateCalls = [];
  await collectReconciliationEvidence(store, duplicate.id, async (...args) => {
    duplicateCalls.push(args);
    return ghRun({ view: new Map([["https://github.com/collisionengineers/kanmer/pull/12", mergedJson]]) })(...args);
  });
  assert.equal(duplicateCalls.filter(([, args]) => args[0] === "pr" && args[1] === "view").length, 1);
  const foreign = await store.createItem({ type: "ticket", title: "Foreign URL", profile: "custom", requires: {}, status: "review", prs: ["https://github.com/other/repo/pull/12"] });
  let views = 0;
  const foreignEvidence = await collectReconciliationEvidence(store, foreign.id, async (...args) => {
    if (args[1][0] === "pr" && args[1][1] === "view") views += 1;
    return ghRun()(...args);
  });
  assert.equal(foreignEvidence.pullRequest.state, "unavailable");
  assert.equal(views, 0);
});

test("collector proves every recorded commit is reachable from the exact merge target", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-reconciliation-commit-"));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const store = new KanmerStore(root);
  await store.init();
  const commit = "c".repeat(40);
  const ticket = await store.createItem({ type: "ticket", title: "Reachability", profile: "custom", requires: {}, status: "review", prs: ["12"], commits: [commit] });
  const calls = [];
  const run = async (command, args, options) => {
    calls.push({ command, args: [...args] });
    if (command === "git") {
      assert.deepEqual(args, ["merge-base", "--is-ancestor", commit, mergeSha]);
      return { stdout: "" };
    }
    return ghRun()(command, args, options);
  };
  const evidence = await collectReconciliationEvidence(store, ticket.id, run);
  assert.deepEqual(evidence.commits, { values: [commit], reachability: "reachable" });
  assert.equal(calls.filter((call) => call.command === "git").length, 1);
});

test("workspace evidence distinguishes missing, inaccessible, foreign, detached, and branch mismatch worktrees", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-reconciliation-worktree-"));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const store = new KanmerStore(root);
  await store.init();
  const run = async (_command, args) => {
    if (args.includes("rev-parse")) return { stdout: root + "\n" };
    if (args.includes("status")) return { stdout: "" };
    if (args.includes("symbolic-ref")) return { stdout: "expected-branch\n" };
    assert.fail("unexpected git args: " + args.join(" "));
  };
  const missing = await workspaceEvidence(store, "missing", "expected-branch", run, async () => {
    const error = Object.assign(new Error("missing"), { code: "ENOENT" });
    throw error;
  });
  assert.equal(missing.state, "missing");
  const inaccessible = await workspaceEvidence(store, "blocked", "expected-branch", run, async () => {
    const error = Object.assign(new Error("denied"), { code: "EACCES" });
    throw error;
  });
  assert.equal(inaccessible.state, "unavailable");
  const foreign = await workspaceEvidence(store, "foreign", "expected-branch", async (_command, args) => {
    if (args.includes("rev-parse")) return { stdout: path.join(root, "other") + "\n" };
    if (args.includes("status")) return { stdout: "" };
    return { stdout: "expected-branch\n" };
  }, async () => ({ isDirectory: () => true }));
  assert.equal(foreign.claimIdentity, "foreign-repository");
  const mismatch = await workspaceEvidence(store, "mismatch", "expected-branch", async (_command, args) => {
    if (args.includes("rev-parse")) return { stdout: root + "\n" };
    if (args.includes("status")) return { stdout: "" };
    return { stdout: "other-branch\n" };
  }, async () => ({ isDirectory: () => true }));
  assert.equal(mismatch.claimIdentity, "branch-mismatch");
  const detached = await workspaceEvidence(store, "detached", "expected-branch", async (_command, args) => {
    if (args.includes("rev-parse")) return { stdout: root + "\n" };
    if (args.includes("status")) return { stdout: "" };
    const error = Object.assign(new Error("detached"), { code: 1 });
    throw error;
  }, async () => ({ isDirectory: () => true }));
  assert.equal(detached.claimIdentity, "detached");
});

test("apply re-collects before moving a current ticket and leaves a changed proposal untouched", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-reconciliation-apply-"));
  t.after(async () => { await fs.rm(root, { recursive: true, force: true }); });
  const store = new KanmerStore(root);
  await store.init();
  const ticket = await store.createItem({ type: "ticket", title: "Apply", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const merged = ghRun();
  const dryRun = await reconcileTicket(store, ticket.id, merged);
  assert.equal(dryRun.proposal?.action, "MOVE_TO_VERIFYING");
  const applied = await applyReconciliation(store, { id: ticket.id, expectedUpdated: ticket.updated, proposalId: dryRun.proposal.id }, merged);
  assert.equal(applied.item.status, "verifying");
  const conflict = await store.createItem({ type: "ticket", title: "Conflict", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const original = await reconcileTicket(store, conflict.id, merged);
  await assert.rejects(
    () => applyReconciliation(store, { id: conflict.id, expectedUpdated: conflict.updated, proposalId: original.proposal.id }, ghRun({ view: new Map([["12", openJson]]) })),
    /Conflict: reconciliation evidence/,
  );
  assert.equal((await store.getItem(conflict.id))?.status, "review");
});
