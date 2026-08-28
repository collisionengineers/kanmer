import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { KanmerStore, removeTreeWithRetry } from "../../core/dist/index.js";
import {
  GH_MAX_BUFFER,
  GH_TIMEOUT_MS,
  GIT_MAX_BUFFER,
  GIT_TIMEOUT_MS,
  collectReconciliationEvidence,
  leaseRecoverySummary,
  proofEvidence,
  pullRequestEvidence,
  reconcileTicket,
  requiredChecksEvidence,
  workspaceEvidence,
} from "../dist/reconciliation.js";

// Salvaged from PR #286 (CORE-113); the apply test was dropped with the
// mutating surface (CORE-122). New cases cover bounded subprocesses, the
// common-dir identity rule and the bootstrap claim contract.

const mergeSha = "a".repeat(40);
const headSha = "b".repeat(40);
const repoJson = JSON.stringify({ nameWithOwner: "collisionengineers/kanmer" });
const mergedJson = JSON.stringify({ state: "MERGED", headRefOid: headSha, mergeCommit: { oid: mergeSha } });
const openJson = JSON.stringify({ state: "OPEN", headRefOid: headSha, mergeCommit: null });
const closedJson = JSON.stringify({ state: "CLOSED", headRefOid: headSha, mergeCommit: null });
const passChecks = JSON.stringify([{ state: "SUCCESS", bucket: "pass" }]);
const commonDir = (root) => async () => ({ ok: true, path: root });

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

function assertBounded(command, options) {
  assert.equal(options.windowsHide, true);
  assert.equal(typeof options.cwd, "string");
  if (command === "gh") {
    assert.equal(options.timeout, GH_TIMEOUT_MS);
    assert.equal(options.maxBuffer, GH_MAX_BUFFER);
  } else {
    assert.equal(options.timeout, GIT_TIMEOUT_MS);
    assert.equal(options.maxBuffer, GIT_MAX_BUFFER);
  }
}

function ghRun({ view = new Map([["12", mergedJson]]), checks = passChecks } = {}) {
  return async (command, args, options) => {
    assert.equal(command, "gh");
    assertBounded(command, options);
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

async function fixtureStore(t, prefix) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => { await removeTreeWithRetry(root); });
  const store = new KanmerStore(root);
  await store.init();
  return { root, store };
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
  const { store } = await fixtureStore(t, "kanmer-reconciliation-mcp-");
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
  for (const [command, , options] of calls) assertBounded(command, options);
});

test("collector preserves a same-repository PR URL and rejects a cross-repository one before query", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-reconciliation-url-");
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

test("collector proves every recorded commit is reachable from the exact merge target with bounded git calls", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-reconciliation-commit-");
  const commit = "c".repeat(40);
  const ticket = await store.createItem({ type: "ticket", title: "Reachability", profile: "custom", requires: {}, status: "review", prs: ["12"], commits: [commit] });
  const calls = [];
  const run = async (command, args, options) => {
    calls.push({ command, args: [...args] });
    if (command === "git") {
      assert.deepEqual(args, ["merge-base", "--is-ancestor", commit, mergeSha]);
      assertBounded(command, options);
      return { stdout: "" };
    }
    return ghRun()(command, args, options);
  };
  const evidence = await collectReconciliationEvidence(store, ticket.id, run);
  assert.deepEqual(evidence.commits, { values: [commit], reachability: "reachable" });
  assert.equal(calls.filter((call) => call.command === "git").length, 1);
});

test("a stalled gh is reported as unavailable evidence and an inconclusive result, never a fabricated state", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-reconciliation-stall-");
  const ticket = await store.createItem({ type: "ticket", title: "Stalled", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const stalled = async (command, args, options) => {
    assertBounded(command, options);
    if (args[0] === "repo") return { stdout: repoJson };
    // Node's execFile rejects with killed:true/signal once `timeout` elapses.
    throw Object.assign(new Error("gh stalled"), { killed: true, signal: "SIGTERM", stdout: "", code: null });
  };
  const result = await reconcileTicket(store, ticket.id, stalled);
  assert.equal(result.evidence.pullRequest.state, "unavailable");
  assert.equal(result.evidence.pullRequest.requiredChecks, "unavailable");
  assert.equal(result.recommendation, null);
  assert.equal(result.findings[0].code, "EVIDENCE_INCONCLUSIVE");
  const stalledChecks = async (command, args, options) => {
    assertBounded(command, options);
    if (args[0] === "repo") return { stdout: repoJson };
    if (args[1] === "view") return { stdout: closedJson };
    throw Object.assign(new Error("gh stalled"), { killed: true, signal: "SIGTERM", stdout: "[{\"state\":\"SUCCESS\",\"bucket\":\"pass\"}]", code: null });
  };
  const checks = await collectReconciliationEvidence(store, ticket.id, stalledChecks);
  assert.equal(checks.pullRequest.state, "closed-unmerged");
  assert.equal(checks.pullRequest.requiredChecks, "unavailable");
});

test("workspace evidence distinguishes missing, inaccessible, foreign, detached, and branch mismatch worktrees", async (t) => {
  const { root, store } = await fixtureStore(t, "kanmer-reconciliation-worktree-");
  const run = async (command, args, options) => {
    assertBounded(command, options);
    if (args.includes("status")) return { stdout: "" };
    if (args.includes("symbolic-ref")) return { stdout: "expected-branch\n" };
    assert.fail("unexpected git args: " + args.join(" "));
  };
  const present = async () => ({ isDirectory: () => true });
  const same = commonDir(path.join(root, ".git"));
  const missing = await workspaceEvidence(store, "missing", "expected-branch", run, async () => {
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  }, same);
  assert.equal(missing.state, "missing");
  const inaccessible = await workspaceEvidence(store, "blocked", "expected-branch", run, async () => {
    throw Object.assign(new Error("denied"), { code: "EACCES" });
  }, same);
  assert.equal(inaccessible.state, "unavailable");
  const foreign = await workspaceEvidence(store, "foreign", "expected-branch", run, present, async (directory) =>
    ({ ok: true, path: directory === path.resolve(root, "foreign") ? path.join(root, "other", ".git") : path.join(root, ".git") }));
  assert.equal(foreign.claimIdentity, "foreign-repository");
  const matches = await workspaceEvidence(store, "matches", "expected-branch", run, present, same);
  assert.equal(matches.claimIdentity, "matches-claim");
  assert.equal(matches.state, "clean");
  const mismatch = await workspaceEvidence(store, "mismatch", "expected-branch", async (command, args, options) => {
    assertBounded(command, options);
    if (args.includes("status")) return { stdout: "" };
    return { stdout: "other-branch\n" };
  }, present, same);
  assert.equal(mismatch.claimIdentity, "branch-mismatch");
  const detached = await workspaceEvidence(store, "detached", "expected-branch", async (command, args, options) => {
    assertBounded(command, options);
    if (args.includes("status")) return { stdout: "" };
    throw Object.assign(new Error("detached"), { code: 1 });
  }, present, same);
  assert.equal(detached.claimIdentity, "detached");
  const unresolved = await workspaceEvidence(store, "unresolved", "expected-branch", run, present, async () => ({ ok: false, detail: "not a git checkout" }));
  assert.equal(unresolved.claimIdentity, "unavailable");
});

test("a linked .worktrees/<id> checkout of the source repository is matches-claim, not foreign-repository", async (t) => {
  const { root, store } = await fixtureStore(t, "kanmer-reconciliation-linked-");
  const git = (args, cwd = root) => execFileSync("git", args, { cwd, windowsHide: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git(["init", "-q", "-b", "main"]);
  git(["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "--allow-empty", "-q", "-m", "root"]);
  git(["worktree", "add", "-q", "-b", "tick-001-work", path.join(root, ".worktrees", "TICK-001"), "main"]);
  const ticket = await store.createItem({ type: "ticket", title: "Linked", profile: "custom", requires: {}, status: "implementing" });
  const taken = await store.takeTicket(ticket.id, { branch: "tick-001-work", worktree: ".worktrees/TICK-001", assignee: "worker" });
  const evidence = await collectReconciliationEvidence(store, taken.id);
  assert.equal(evidence.workspace.state, "clean");
  assert.equal(evidence.workspace.claimIdentity, "matches-claim");
  assert.equal(evidence.claim.state, "current");
  await fs.writeFile(path.join(root, ".worktrees", "TICK-001", "dirty.txt"), "x", "utf8");
  const dirty = await collectReconciliationEvidence(store, taken.id);
  assert.equal(dirty.workspace.state, "dirty");
  const otherRoot = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-reconciliation-other-"));
  t.after(async () => { await removeTreeWithRetry(otherRoot); });
  git(["init", "-q", "-b", "main"], otherRoot);
  git(["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "--allow-empty", "-q", "-m", "root"], otherRoot);
  const foreignTicket = await store.createItem({ type: "ticket", title: "Foreign", profile: "custom", requires: {}, status: "implementing" });
  const foreignTaken = await store.takeTicket(foreignTicket.id, { branch: "main", worktree: otherRoot, assignee: "worker" });
  assert.equal((await collectReconciliationEvidence(store, foreignTaken.id)).workspace.claimIdentity, "foreign-repository");
});

test("reconcile_ticket is a dry run: the store is unchanged and the claim block follows the bootstrap contract", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-reconciliation-dryrun-");
  const ticket = await store.createItem({ type: "ticket", title: "Dry run", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const before = JSON.stringify(await store.getItem(ticket.id));
  const activityBefore = (await store.getActivity({ id: ticket.id })).length;
  const result = await reconcileTicket(store, ticket.id, ghRun());
  assert.deepEqual(result.recommendation, { action: "MOVE_TO_VERIFYING", targetStatus: "verifying", advisory: true });
  assert.equal("proposal" in result, false);
  assert.deepEqual(result.evidence.claim, {
    state: "unclaimed", controller: null, worker: null, takenAt: null, expiresAt: null, branch: null, worktree: null, reviewRound: 0, remediationBudget: 1,
    leaseId: null, leaseRevision: null, heartbeatAt: null, phase: null, legacy: false,
  });
  assert.equal(result.evidence.release.state, "not-applicable");
  assert.equal(JSON.stringify(await store.getItem(ticket.id)), before);
  assert.equal((await store.getActivity({ id: ticket.id })).length, activityBefore);

  const claimed = await store.createItem({ type: "ticket", title: "Claimed", profile: "custom", requires: {}, status: "implementing" });
  const taken = await store.takeTicket(claimed.id, { branch: "b", worktree: "wt/none", assignee: "ctl-a", controller: "ctl-durable" });
  const live = await reconcileTicket(store, claimed.id, ghRun(), { now: new Date(Date.parse(taken.taken_at) + 60_000) });
  assert.equal(live.evidence.claim.state, "current");
  assert.equal(live.evidence.claim.controller, "ctl-durable");
  assert.equal(live.evidence.claim.worker, "ctl-a");
  assert.equal(live.evidence.claim.expiresAt, taken.claim_expires_at);
  // CORE-115: the lease record is reported next to the bootstrap fields.
  assert.equal(live.evidence.claim.leaseId, taken.lease_id);
  assert.equal(live.evidence.claim.leaseRevision, 1);
  assert.equal(live.evidence.claim.heartbeatAt, taken.lease_heartbeat_at);
  assert.equal(live.evidence.claim.phase, "implementing");
  assert.equal(live.evidence.claim.legacy, false);
  assert.equal(live.evidence.workspace.state, "missing");
  const expired = await reconcileTicket(store, claimed.id, ghRun(), { now: new Date(Date.parse(taken.claim_expires_at) + 1) });
  assert.equal(expired.evidence.claim.state, "expired");
  assert.ok(expired.findings.some((finding) => finding.code === "CLAIM_EXPIRED"));
  assert.ok(expired.findings.some((finding) => finding.code === "WORKSPACE_MISSING"));
  assert.equal(expired.recommendation, null);
  assert.equal((await store.getItem(claimed.id)).taken_at, taken.taken_at);
});

test("leaseRecoverySummary reduces evidence to what a reclaim records, and a legacy claim reports legacy", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-reconciliation-lease-");
  const ticket = await store.createItem({ type: "ticket", title: "Legacy", profile: "custom", requires: {}, status: "implementing" });
  const taken = await store.takeTicket(ticket.id, { branch: "b", worktree: "wt/none", assignee: "ctl-a" });
  const file = path.join(store.paths.kanmer, "areas", "_none", ticket.id, `${ticket.id}.md`);
  // Lazy up to the next key: YAML folds the long lease_workspace value over several lines.
  await fs.writeFile(file, (await fs.readFile(file, "utf8")).replace(/^lease_[a-z_]+: [\s\S]*?\n(?=[a-z_]+: |---)/gmu, ""), "utf8");
  const legacy = await reconcileTicket(store, ticket.id, ghRun(), { now: new Date(Date.parse(taken.taken_at) + 60_000) });
  assert.equal(legacy.evidence.claim.legacy, true);
  assert.equal(legacy.evidence.claim.leaseId, null);
  assert.equal(legacy.evidence.claim.state, "current");
  const summary = leaseRecoverySummary(legacy.evidence);
  assert.deepEqual(summary, { workspace: "missing", claimIdentity: "unavailable", boardWorktree: false, pullRequest: "absent", commits: 0, proof: "absent" });
  const board = leaseRecoverySummary({
    ...legacy.evidence,
    workspace: { state: "unavailable", recordedWorktree: "wt", boardWorktree: true, claimIdentity: "unavailable" },
    commits: { values: ["a", "b"], reachability: "not-applicable" },
    pullRequest: { state: "open", requiredChecks: "pending" },
  });
  assert.deepEqual(board, { workspace: "unavailable", claimIdentity: "unavailable", boardWorktree: true, pullRequest: "open", commits: 2, proof: "absent" });
  // The store is a pure evidence consumer: a reclaim of the legacy claim records the summary and mints the lease.
  const aged = new Date(Date.parse(taken.taken_at) - 31 * 60_000).toISOString();
  await fs.writeFile(file, (await fs.readFile(file, "utf8")).replace(/^taken_at: .*$/mu, `taken_at: '${aged}'`).replace(/^claim_expires_at: .*\n/mu, ""), "utf8");
  const reclaimed = await store.transferTicket(ticket.id, { assignee: "ctl-b", recovery: summary });
  assert.ok(reclaimed.lease_id);
  assert.equal(reclaimed.lease_reclaimed_from, "ctl-a");
  assert.equal(reclaimed.worktree, "wt/none");
  assert.match(await store.getDoc(ticket.id, "scratch/execution"), /evidence: workspace missing \(unavailable\), pr absent, commits 0, proof absent/u);
});
