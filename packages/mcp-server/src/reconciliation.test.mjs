import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  KanmerStore,
  compileStepPacket,
  parsePlan,
  reconcileEvidence,
  removeTreeWithRetry,
  STEP_PACKET_LIMITS,
  stepPacketDigest,
  stepTicketAuthority,
} from "../../core/dist/index.js";
import {
  GH_MAX_BUFFER,
  GH_TIMEOUT_MS,
  GIT_MAX_BUFFER,
  GIT_TIMEOUT_MS,
  applyReconciliation,
  collectReconciliationEvidence,
  collectWorkspaceSnapshot,
  leaseRecoverySummary,
  proofEvidence,
  pullRequestEvidence,
  reconcileTicket,
  requiredChecksEvidence,
  workspaceEvidence,
} from "../dist/reconciliation.js";
import { releaseChannelAction } from "../dist/release.js";
import { failCoded } from "../dist/errors.js";

// Salvaged from PR #286 (CORE-113); the apply test was dropped with the
// mutating surface (CORE-122) and rebuilt on revisions and leases by CORE-131.
// Cases cover bounded subprocesses, the common-dir identity rule, the
// bootstrap claim contract, and the revision-bound apply — including the
// F-015 regression PR #286's `expectedUpdated` provably could not catch.

const mergeSha = "a".repeat(40);
const headSha = "b".repeat(40);
const repoJson = JSON.stringify({ nameWithOwner: "collisionengineers/kanmer" });
const mergedJson = JSON.stringify({ state: "MERGED", headRefOid: headSha, mergeCommit: { oid: mergeSha } });
const openJson = JSON.stringify({ state: "OPEN", headRefOid: headSha, mergeCommit: null });
const closedJson = JSON.stringify({ state: "CLOSED", headRefOid: headSha, mergeCommit: null });
const passChecks = JSON.stringify([{ state: "SUCCESS", bucket: "pass" }]);
const commonDir = (root) => async () => ({ ok: true, path: root });

function proof(result = "PASS", failureClass, merged = mergeSha, receiptHeadSha, receiptJob = "verify") {
  const receiptsBlock = receiptHeadSha === undefined ? "" :
    "receipts:\n" +
    "  - kind: github-actions-run\n" +
    "    provider: github\n" +
    "    repo: collisionengineers/kanmer\n" +
    "    workflow: pr.yml\n" +
    "    event: push\n" +
    "    run_id: 1234567890\n" +
    "    attempt: 1\n" +
    "    head_sha: \"" + receiptHeadSha + "\"\n" +
    "    job: " + receiptJob + "\n" +
    "    conclusion: success\n" +
    "    url: \"https://github.com/collisionengineers/kanmer/actions/runs/1234567890\"\n" +
    "    covers: [\"npm run verify\"]\n" +
    "    observed_by: \"ci-bot\"\n";
  // CORE-129: a `proof-record/2` document. The attempt ledger is no longer
  // decorative — the top-level verdict is bound to its final authoritative
  // entry — so this fixture derives the attempt from `result`/`failureClass`
  // rather than emitting `attempts: []`, which schema 2 refuses.
  const exitCode = result === "PASS" ? 0 : result === "FAIL" ? 1 : "null";
  const attemptClass = result === "PASS" ? "" : "    failure_class: " + (failureClass ?? "inconclusive") + "\n";
  const attempt = result === "INCONCLUSIVE"
    ? "  - attempted_at: \"2026-08-26T00:00:00.000Z\"\n" +
      "    exit_code: null\n" +
      "    result: INCONCLUSIVE\n" +
      "    authority: authoritative\n" +
      "    summary: no process ran\n" +
      "    failure_class: inconclusive\n"
    : "  - attempted_at: \"2026-08-26T00:00:00.000Z\"\n" +
      "    command: npm run verify\n" +
      "    cwd: /tmp/verify\n" +
      "    exit_code: " + exitCode + "\n" +
      "    result: " + result + "\n" +
      "    authority: authoritative\n" +
      "    summary: fixture attempt\n" +
      attemptClass;
  return "---\n" +
    "kind: proof-record\n" +
    "schema: 2\n" +
    "merged_sha: " + merged + "\n" +
    "environment: detached fixture\n" +
    "verified_at: \"2026-08-26T00:00:00.000Z\"\n" +
    "result: " + result + "\n" +
    (result === "PASS" ? "" : "failure_class: " + (result === "INCONCLUSIVE" ? "inconclusive" : (failureClass ?? "inconclusive")) + "\n") +
    "attempts:\n" +
    attempt +
    receiptsBlock +
    "---\n";
}

/** A `run` that answers gh from fixtures and git from a described workspace. */
function workspaceRun(branch, { status = "", gh = ghRun() } = {}) {
  return async (command, args, options) => {
    if (command !== "git") return gh(command, args, options);
    assertBounded(command, options);
    if (args.includes("status")) return { stdout: status };
    if (args.includes("symbolic-ref")) return { stdout: branch + "\n" };
    assert.fail("unexpected git args: " + args.join(" "));
  };
}

async function rejects(fn, code) {
  await assert.rejects(fn, (error) => {
    assert.equal(error.code, code, `expected ${code}, got ${error.code}: ${error.message}`);
    return true;
  });
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

/**
 * Age a claim on disk rather than injecting a clock: the store's own
 * precondition and `transferTicket` both read real time, so an apply that only
 * looked expired to the collector must not be reachable through this fixture.
 */
async function expireClaim(store, id) {
  const file = path.join(store.paths.kanmer, "areas", "_none", id, `${id}.md`);
  const aged = new Date(Date.now() - 60 * 60_000).toISOString();
  await fs.writeFile(file, (await fs.readFile(file, "utf8")).replace(/^claim_expires_at: .*$/mu, `claim_expires_at: '${aged}'`), "utf8");
}

async function fixtureStore(t, prefix) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => { await removeTreeWithRetry(root); });
  const store = new KanmerStore(root);
  await store.init();
  return { root, store };
}

async function directoryDigest(root) {
  const hash = createHash("sha256");
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replaceAll("\\", "/");
      hash.update(relative);
      if (entry.isDirectory()) await visit(absolute);
      else hash.update(await fs.readFile(absolute));
    }
  }
  await visit(root);
  return hash.digest("hex");
}

const STEP_PLAN = (filesVersion) => `# Plan — TICK-001

## Objective
Change one bounded file.

## Starting state
Evidence: \`files/files.md\`@\`${filesVersion}\`.

## Governing docs
Meets \`docs/functional/frd/FRD-033.md\`.

## Required changes
Change \`tracked.txt\`.

## Expected files
| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | \`tracked.txt\` | bounded change |
| Modify | \`docs/note.md\` | second step |

## Do not modify
- \`forbidden/**\`

## Constraints
Stay inside the packet.

## Ordered steps

### Step 1 — Change the file
- Preconditions: baseline exists.
- Files: \`tracked.txt\`
- Change: change the bounded file.
- Preserved behaviour: everything else.
- Forbidden: no other path.
- Negative cases: forbidden path.
- Tests: \`tracked.txt\`
- Commands: \`git diff --check\`
- Expected output: clean.
- Done when: the file changed.
- Deviation stop: stop on another path.

### Step 2 — Write the note
- Preconditions: step 1 passed.
- Files: \`docs/note.md\`
- Change: write the note.
- Preserved behaviour: runtime.
- Forbidden: no runtime edits.
- Negative cases: runtime change.
- Tests: \`docs/note.md\`
- Commands: \`git diff --check\`
- Expected output: clean.
- Done when: the note exists.
- Deviation stop: stop on runtime change.

## Acceptance checks
- \`git diff --check\`

## Commands
- \`git diff --check\`

## Failure and deviation rules
Stop on an undeclared path.

## Stop condition
Stop after the selected step.
`;

async function stepFixture(t, { batch = false } = {}) {
  const { root, store } = await fixtureStore(t, "kanmer-step-ticket-");
  execFileSync("git", ["-C", root, "init", "-b", "main"], { stdio: "ignore" });
  execFileSync("git", ["-C", root, "config", "user.email", "fixture@example.invalid"]);
  execFileSync("git", ["-C", root, "config", "user.name", "Fixture"]);
  await fs.writeFile(path.join(root, "tracked.txt"), "base\n");
  execFileSync("git", ["-C", root, "add", "tracked.txt"]);
  execFileSync("git", ["-C", root, "commit", "-m", "base"], { stdio: "ignore" });
  const worktree = path.join(root, ".worktrees", "ticket");
  execFileSync("git", ["-C", root, "worktree", "add", "-b", "ticket-step", worktree, "main"], { stdio: "ignore" });
  const ticket = await store.createItem({ type: "ticket", title: "Constrained", profile: "custom", requires: {}, status: "implementing" });
  const batchMember = batch
    ? await store.createItem({ type: "ticket", title: "Batch sibling", profile: "custom", requires: {}, status: "implementing" })
    : null;
  await store.setDoc(ticket.id, "files", "# Files\n");
  const files = await store.getDocWithVersion(ticket.id, "files");
  const planText = STEP_PLAN(files.version);
  const checklistText = "- [ ] Step 1 — change the file\n- [ ] Step 2 — write the note\n";
  await store.setDoc(ticket.id, "plan", planText);
  await store.setDoc(ticket.id, "checklist", checklistText);
  await store.takeTicket(ticket.id, {
    branch: "ticket-step",
    worktree: ".worktrees/ticket",
    assignee: "worker",
    ...(batch
      ? {
          controllerRun: "batch-controller-run",
          batch: "batch-step",
          batchMembers: [ticket.id, batchMember.id],
        }
      : {}),
  });
  const [plan, checklist, revision, baseline, currentTicket, inventory] = await Promise.all([
    store.getDocWithVersion(ticket.id, "plan"),
    store.getDocWithVersion(ticket.id, "checklist"),
    store.getRevision(ticket.id),
    collectWorkspaceSnapshot({ repoRoot: root, boardRoot: root, worktree: ".worktrees/ticket", branch: "ticket-step" }),
    store.getItem(ticket.id),
    store.listTicketDocsWithVersions(ticket.id),
  ]);
  assert.equal(baseline.ok, true);
  if (!baseline.ok) throw new Error(baseline.reason);
  const project = { project_id: null, board_id: null, fingerprint: "fixture-project" };
  const compiled = compileStepPacket({
    plan: parsePlan(planText),
    planPath: "plan/plan.md",
    planVersion: plan.version,
    project,
    ticket: {
      id: ticket.id,
      revision: revision.revision,
      itemAuthority: stepTicketAuthority(currentTicket),
      documents: inventory.map((document) => ({ path: document.doc, version: document.version }))
        .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0),
    },
    batch: batch ? "batch-step" : null,
    workspace: baseline.snapshot,
    evidence: [{ layer: "ticket", group: null, path: "files/files.md", version: files.version }],
    checklist: checklistText,
    checklistPath: "checklist/checklist.md",
    checklistVersion: checklist.version,
    select: 1,
    stopCondition: "Stop after the selected step.",
  });
  assert.equal(compiled.ok, true);
  if (!compiled.ok) throw new Error(compiled.reason);
  return { root, store, ticket, worktree, packet: compiled.packet, project, checklistText };
}

test("proof and required-check decoders reject incomplete or unrelated evidence", () => {
  assert.deepEqual(proofEvidence(null), { state: "absent" });
  assert.equal(proofEvidence(proof()).state, "pass");
  assert.equal(proofEvidence(proof()).mergedSha, mergeSha);
  // An unquoted YAML instant loads as a Date; the record is the same record.
  assert.equal(proofEvidence(proof().replace(/"2026-08-26T00:00:00\.000Z"/g, "2026-08-26T00:00:00.000Z")).state, "pass");
  // CORE-129: a schema-2 record missing required fields is invalid, and the
  // parsed state travels with it so the inspector can say which kind of "no".
  const broken = proofEvidence("---\nkind: proof-record\nschema: 2\nresult: PASS\nmerged_sha: abc\n---\n");
  assert.equal(broken.state, "invalid");
  assert.equal(broken.record.state, "invalid");
  // A record that never declared the typed contract is legacy, not malformed —
  // and legacy is still not authority for an automated Done recommendation.
  const legacy = proofEvidence("---\nkind: proof-record\nresult: PASS\nmerged_sha: " + mergeSha + "\nenvironment: e\nverified_at: \"2026-08-26T00:00:00.000Z\"\nattempts: []\n---\n");
  assert.equal(legacy.state, "invalid");
  assert.equal(legacy.record.state, "legacy");
  assert.deepEqual(proofEvidence("not frontmatter").record.state, "legacy");
  assert.equal(requiredChecksEvidence([{ state: "IN_PROGRESS", bucket: "pending" }]), "pending");
  assert.equal(requiredChecksEvidence([{ state: "SUCCESS", bucket: "pass" }]), "pass");
  assert.equal(requiredChecksEvidence([]), "not-applicable");
  assert.equal(requiredChecksEvidence({ statusCheckRollup: [{ status: "COMPLETED", conclusion: "SUCCESS" }] }), "unavailable");
  assert.deepEqual(pullRequestEvidence(null, "pass"), { state: "unavailable", requiredChecks: "unavailable" });
});

test("proofEvidence surfaces receipts additively (MCP-057) and stays back-compat without them", () => {
  // No receipts: the `receipts` key is absent, exactly as before MCP-057.
  const noReceipts = proofEvidence(proof());
  assert.equal(noReceipts.state, "pass");
  assert.equal(noReceipts.mergedSha, mergeSha);
  assert.equal(noReceipts.receipts, undefined);
  const failNoReceipts = proofEvidence(proof("FAIL", "implementation"));
  assert.equal(failNoReceipts.state, "fail");
  assert.equal(failNoReceipts.failureClass, "implementation");
  assert.equal(failNoReceipts.receipts, undefined);

  // A matching receipt is surfaced on the returned evidence.
  const withMatchingReceipt = proofEvidence(proof("PASS", undefined, mergeSha, mergeSha));
  assert.equal(withMatchingReceipt.state, "pass");
  assert.equal(withMatchingReceipt.mergedSha, mergeSha);
  assert.equal(withMatchingReceipt.receipts.length, 1);
  assert.equal(withMatchingReceipt.receipts[0].kind, "github-actions-run");
  assert.equal(withMatchingReceipt.receipts[0].head_sha, mergeSha);

  // CORE-129 tightened this. A receipt naming a commit other than the record's
  // own `merged_sha` is a document that contradicts itself, so the typed parser
  // refuses it here rather than passing a "pass" the classifier then has to
  // take back. The classifier's own PROOF_RECEIPT_SHA_MISMATCH remains — it
  // compares a receipt against the LIVE pull-request merge SHA, which is a
  // different question from internal consistency — and is asserted below.
  const wrongShaSha = "c".repeat(40);
  const withWrongReceipt = proofEvidence(proof("PASS", undefined, mergeSha, wrongShaSha));
  assert.equal(withWrongReceipt.state, "invalid");
  assert.equal(withWrongReceipt.record.state, "invalid");
  assert.ok(withWrongReceipt.record.diagnostics.some((reason) => reason.includes("does not match this record's merged_sha")));

  // An empty receipts list is treated the same as no receipts (omitted field).
  const emptyReceipts = proofEvidence(proof().replace("---\n\n", "---\n").replace("attempts:", "receipts: []\nattempts:"));
  assert.equal(emptyReceipts.state, "pass");
  assert.equal(emptyReceipts.receipts, undefined);
});

test("reconcileEvidence rejects a receipt naming a different merge, distinct from a stale proof mergedSha (MCP-057)", async () => {
  const wrongShaSha = "c".repeat(40);
  // Built directly rather than through `proofEvidence`, because CORE-129's
  // parser now refuses this document one layer earlier (asserted above). The
  // classifier's rule is a different rule — receipt versus the LIVE merge SHA —
  // and it stays enforced for any evidence that reaches it, including evidence
  // assembled by a host that is not this build's decoder.
  const evidenceWithMismatchedReceipt = {
    ticket: { id: "TICK-057", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false },
    claim: { state: "unclaimed", controller: null, worker: null, takenAt: null, expiresAt: null, branch: null, worktree: null, reviewRound: 0, remediationBudget: 1 },
    commits: { values: [], reachability: "not-applicable" },
    pullRequest: { state: "merged", mergeSha, requiredChecks: "pass" },
    proof: { state: "pass", mergedSha: mergeSha, receipts: [{ kind: "github-actions-run", workflow: "pr.yml", event: "push", run_id: 1, head_sha: wrongShaSha, job: "verify", conclusion: "success", url: "https://example.invalid/1" }] },
    workspace: { state: "not-recorded", recordedWorktree: null, claimIdentity: "not-applicable" },
    release: { state: "not-applicable" },
  };
  const result = reconcileEvidence(evidenceWithMismatchedReceipt);
  assert.equal(result.recommendation, null);
  assert.ok(result.findings.some((finding) => finding.code === "PROOF_RECEIPT_SHA_MISMATCH"));
});

test("reconcileEvidence rejects a receipt naming the wrong job via assessReceipt, on both the PASS and FAIL routes (MCP-057)", () => {
  const baseTicket = { id: "TICK-057", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false };
  const baseClaim = { state: "unclaimed", controller: null, worker: null, takenAt: null, expiresAt: null, branch: null, worktree: null, reviewRound: 0, remediationBudget: 1 };
  const baseCommits = { values: [], reachability: "not-applicable" };
  const basePullRequest = { state: "merged", mergeSha, requiredChecks: "pass" };
  const baseWorkspace = { state: "not-recorded", recordedWorktree: null, claimIdentity: "not-applicable" };
  const baseRelease = { state: "not-applicable" };

  const passResult = reconcileEvidence({
    ticket: baseTicket,
    claim: baseClaim,
    commits: baseCommits,
    pullRequest: basePullRequest,
    proof: proofEvidence(proof("PASS", undefined, mergeSha, mergeSha, "kanmer-gate")),
    workspace: baseWorkspace,
    release: baseRelease,
  });
  assert.equal(passResult.recommendation, null);
  assert.ok(passResult.findings.some((finding) => finding.code === "PROOF_RECEIPT_REJECTED" && finding.message.includes('receipt job must be "verify"')));

  const failResult = reconcileEvidence({
    ticket: baseTicket,
    claim: baseClaim,
    commits: baseCommits,
    pullRequest: basePullRequest,
    proof: proofEvidence(proof("FAIL", "implementation", mergeSha, mergeSha, "kanmer-gate")),
    workspace: baseWorkspace,
    release: baseRelease,
  });
  assert.equal(failResult.recommendation, null);
  assert.ok(failResult.findings.some((finding) => finding.code === "PROOF_RECEIPT_REJECTED" && finding.message.includes('receipt job must be "verify"')));
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
  assert.deepEqual(result.recommendation, {
    action: "MOVE_TO_VERIFYING", targetStatus: "verifying", advisory: true,
    ticketId: ticket.id, revision: (await store.getRevision(ticket.id)).revision,
  });
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
  // CORE-133: this is the exact shape the collector emits for an abandoned
  // claim whose worktree is gone, and it now reaches the already-authorised
  // transfer instead of no recommendation at all. Still a dry run: the
  // recommendation is advisory and the claim is untouched below.
  assert.deepEqual(expired.recommendation, {
    action: "RECOVER_EXPIRED_CLAIM", advisory: true,
    ticketId: claimed.id, revision: (await store.getRevision(claimed.id)).revision,
  });
  assert.equal(expired.evidence.workspace.claimIdentity, "unavailable");
  assert.equal((await store.getItem(claimed.id)).taken_at, taken.taken_at);
  assert.equal((await store.getItem(claimed.id)).claim_controller, "ctl-durable");
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


// ---------------------------------------------------------------------------
// FRD-028 acceptance 2-4: the revision-bound apply (CORE-131)
// ---------------------------------------------------------------------------

test("proofEvidence decodes failure_class, and schema 2 refuses a FAIL that names none", () => {
  const decoded = (raw) => {
    const evidence = proofEvidence(raw);
    return { state: evidence.state, mergedSha: evidence.mergedSha, failureClass: evidence.failureClass };
  };
  assert.deepEqual(decoded(proof("FAIL", "implementation")), { state: "fail", mergedSha: mergeSha, failureClass: "implementation" });
  assert.deepEqual(decoded(proof("FAIL", "plan")), { state: "fail", mergedSha: mergeSha, failureClass: "plan" });
  assert.deepEqual(decoded(proof("FAIL", "transient")), { state: "fail", mergedSha: mergeSha, failureClass: "transient" });

  // CORE-129: "a proof that names no class is inconclusive, never retryable"
  // (kanmer-verify) is now enforced at the point of writing rather than
  // repaired at the point of reading. A schema-2 FAIL must name
  // implementation, plan or transient; an unnamed, misspelled or
  // wrongly-cased class is refused, and the diagnostic says which.
  for (const bad of [undefined, "flaky", "Transient"]) {
    const evidence = proofEvidence(proof("FAIL", bad));
    assert.equal(evidence.state, "invalid", "FAIL with class " + String(bad));
    assert.equal(evidence.record.state, "invalid");
  }

  // An inconclusive outcome is written as one, and still routes nothing.
  assert.deepEqual(decoded(proof("INCONCLUSIVE")), { state: "fail", mergedSha: mergeSha, failureClass: "inconclusive" });

  // A PASS record carries no class at all, and one that does is refused.
  assert.deepEqual(decoded(proof("PASS")), { state: "pass", mergedSha: mergeSha, failureClass: undefined });
  assert.equal(proofEvidence(proof("PASS", "implementation")).state, "pass");
});

test("a recommendation is bound to the ticket revision it was computed from", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-apply-binding-");
  const ticket = await store.createItem({ type: "ticket", title: "Bound", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const dry = await reconcileTicket(store, ticket.id, ghRun());
  const revision = (await store.getRevision(ticket.id)).revision;
  assert.deepEqual(dry.recommendation, {
    action: "MOVE_TO_VERIFYING", targetStatus: "verifying", advisory: true, ticketId: ticket.id, revision,
  });
  // No second fingerprint: PR #286's 64-char proposal hash is not reintroduced.
  assert.equal("proposal" in dry, false);
  assert.equal("id" in dry.recommendation, false);
});

test("apply advances a merged Review ticket to Verifying and records exactly one durable transition", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-apply-verifying-");
  store.setActor("ctl-a");
  const ticket = await store.createItem({ type: "ticket", title: "Merged", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const dry = await reconcileTicket(store, ticket.id, ghRun());
  const applied = await applyReconciliation(store, { id: ticket.id, expectedRevision: dry.recommendation.revision }, ghRun());
  assert.equal(applied.action, "MOVE_TO_VERIFYING");
  assert.equal(applied.item.status, "verifying");
  assert.deepEqual(applied.from, { status: "review", controller: null });
  assert.deepEqual(applied.to, { status: "verifying", controller: null });
  assert.equal(applied.result.recommendation.action, "MOVE_TO_VERIFYING");
  const execution = await store.getDoc(ticket.id, "scratch/execution");
  assert.match(execution, /^## Transitions$/mu);
  assert.equal(execution.match(/reconcile MOVE_TO_VERIFYING/gu).length, 1);
  assert.equal(
    execution.includes(`reconcile MOVE_TO_VERIFYING by ctl-a; stage review → verifying; revision ${dry.recommendation.revision}`),
    true,
    execution,
  );
  // The activity log is a secondary index, never the audit record.
  assert.ok((await store.getActivity({ id: ticket.id })).some((entry) => entry.field === "reconciliation"));
});

test("apply moves a PASS proof from Verifying to Done", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-apply-done-");
  store.setActor("ctl-a");
  const ticket = await store.createItem({ type: "ticket", title: "Passed", profile: "custom", requires: {}, status: "verifying", prs: ["12"] });
  await store.setDoc(ticket.id, "proof", proof("PASS"));
  const dry = await reconcileTicket(store, ticket.id, ghRun());
  assert.equal(dry.recommendation.action, "MOVE_TO_DONE");
  const applied = await applyReconciliation(store, { id: ticket.id, expectedRevision: dry.recommendation.revision }, ghRun());
  assert.equal(applied.item.status, "done");
  assert.match(await store.getDoc(ticket.id, "scratch/execution"), /reconcile MOVE_TO_DONE by ctl-a; stage verifying → done; revision /u);
});

test("explicit apply recovers a pending pre-journal release epoch before fresh collection", async (t) => {
  const { root, store } = await fixtureStore(t, "kanmer-apply-pending-epoch-");
  store.setActor("ctl-a");
  const ticket = await store.createItem({ type: "ticket", title: "Pending release epoch", profile: "custom", requires: {}, status: "verifying", prs: ["12"] });
  await store.setDoc(ticket.id, "proof", proof("PASS"));
  const dry = await reconcileTicket(store, ticket.id, ghRun());
  assert.equal(dry.recommendation.action, "MOVE_TO_DONE");

  const releases = path.join(root, ".kanmer", "releases");
  await fs.mkdir(releases, { recursive: true });
  await fs.writeFile(path.join(releases, "state.json"), `${JSON.stringify({
    schema: 1,
    revision: 1,
    phase: "pending",
    transaction_id: "crash-before-journal",
    channel: "main",
  }, null, 2)}\n`, "utf8");
  const stranded = await reconcileTicket(store, ticket.id, ghRun());
  assert.equal(stranded.evidence.release.state, "unavailable");
  assert.equal(stranded.recommendation, null);

  const applied = await applyReconciliation(store, {
    id: ticket.id,
    expectedRevision: dry.recommendation.revision,
  }, ghRun());
  assert.equal(applied.item.status, "done");
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(releases, "state.json"), "utf8")), {
    schema: 1,
    revision: 1,
    phase: "stable",
    transaction_id: "crash-before-journal",
    channel: "main",
  });
});

test("release crash recovery remains durable when the later ticket CAS refuses", async (t) => {
  const { root, store } = await fixtureStore(t, "kanmer-apply-recovery-before-refusal-");
  store.setActor("ctl-a");
  const ticket = await store.createItem({ type: "ticket", title: "Recovery before refusal", profile: "custom", requires: {}, status: "verifying", prs: ["12"] });
  await store.setDoc(ticket.id, "proof", proof("PASS"));
  const releases = path.join(root, ".kanmer", "releases");
  await fs.mkdir(releases, { recursive: true });
  await fs.writeFile(path.join(releases, "state.json"), `${JSON.stringify({
    schema: 1,
    revision: 1,
    phase: "pending",
    transaction_id: "recover-before-revision-refusal",
    channel: "main",
  }, null, 2)}\n`, "utf8");

  await assert.rejects(
    () => applyReconciliation(store, { id: ticket.id, expectedRevision: "stale-revision" }, ghRun()),
    /Conflict:.*revision changed/u,
  );
  assert.equal((await store.getItem(ticket.id)).status, "verifying");
  assert.equal(await store.getDoc(ticket.id, "scratch/execution"), null);
  assert.equal(JSON.parse(await fs.readFile(path.join(releases, "state.json"), "utf8")).phase, "stable");
});

test("explicit apply removes a fully applied release journal retained after the stable epoch", async (t) => {
  const { root, store } = await fixtureStore(t, "kanmer-apply-retained-journal-");
  store.setActor("ctl-a");
  const ticket = await store.createItem({ type: "ticket", title: "Retained release journal", profile: "custom", requires: {}, status: "verifying", prs: ["12"] });
  await store.setDoc(ticket.id, "proof", proof("PASS"));
  const dry = await reconcileTicket(store, ticket.id, ghRun());
  assert.equal(dry.recommendation.action, "MOVE_TO_DONE");

  const release = await releaseChannelAction(store, {
    action: "acquire",
    integrationSha: headSha,
    includedTickets: [ticket.id],
  });
  const releases = path.join(root, ".kanmer", "releases");
  const state = JSON.parse(await fs.readFile(path.join(releases, "state.json"), "utf8"));
  const head = JSON.parse(await fs.readFile(path.join(releases, "heads", "main.json"), "utf8"));
  const journal = {
    schema: 1,
    transaction_id: state.transaction_id,
    channel: "main",
    created_at: release.attempt.created_at,
    attempts: [{ before: null, after: release.attempt }],
    head_record: { before: null, after: head },
    channel_record: { before: null, after: release.lease },
  };
  const journalFile = path.join(releases, "transactions", "main.json");
  await fs.writeFile(journalFile, `${JSON.stringify(journal, null, 2)}\n`, "utf8");
  const stranded = await reconcileTicket(store, ticket.id, ghRun());
  assert.equal(stranded.evidence.release.state, "unavailable");
  assert.equal(stranded.recommendation, null);

  const applied = await applyReconciliation(store, {
    id: ticket.id,
    expectedRevision: dry.recommendation.revision,
  }, ghRun());
  assert.equal(applied.item.status, "done");
  await assert.rejects(fs.stat(journalFile), { code: "ENOENT" });
});

test("apply rechecks the release epoch under the write lock and refuses late drift", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-apply-release-drift-");
  store.setActor("ctl-a");
  const ticket = await store.createItem({ type: "ticket", title: "Release drift", profile: "custom", requires: {}, status: "verifying", prs: ["12"] });
  await store.setDoc(ticket.id, "proof", proof("PASS"));
  const release = await releaseChannelAction(store, {
    action: "acquire",
    integrationSha: headSha,
    includedTickets: [ticket.id],
  });
  const dry = await reconcileTicket(store, ticket.id, ghRun());
  assert.equal(dry.recommendation.action, "MOVE_TO_DONE");
  assert.equal(dry.evidence.release.state, "not-applicable");
  const revision = dry.recommendation.revision;
  const activityBefore = (await store.getActivity({ id: ticket.id })).length;
  const originalApply = store.applyReconciliation.bind(store);
  store.applyReconciliation = async (...args) => {
    await store.recordReleaseProgress({
      leaseId: release.lease.lease_id,
      leaseRevision: release.lease.lease_revision,
      serviceUnavailable: "publisher became unavailable after collection",
    });
    return originalApply(...args);
  };

  await assert.rejects(
    () => applyReconciliation(store, { id: ticket.id, expectedRevision: revision }, ghRun()),
    /RECONCILIATION_DRIFT:.*release evidence is now unavailable/u,
  );
  assert.equal((await store.getItem(ticket.id)).status, "verifying");
  assert.equal((await store.getRevision(ticket.id)).revision, revision, "release sidecar mutation does not move the ticket revision");
  assert.equal((await store.getActivity({ id: ticket.id })).length, activityBefore);
  assert.equal((await reconcileTicket(store, ticket.id, ghRun())).evidence.release.state, "unavailable");
  assert.equal(
    failCoded(new Error("RECONCILIATION_DRIFT: release evidence changed")).structuredContent.error.code,
    "RECONCILIATION_DRIFT",
  );
});

test("apply routes a FAIL proof by its failure_class and quotes the proof in the audited reason", async (t) => {
  for (const [failureClass, target] of [["implementation", "implementing"], ["plan", "preparing"]]) {
    const { store } = await fixtureStore(t, `kanmer-apply-${failureClass}-`);
    store.setActor("ctl-a");
    const ticket = await store.createItem({ type: "ticket", title: "Failed", profile: "custom", requires: {}, status: "verifying", prs: ["12"] });
    await store.setDoc(ticket.id, "proof", proof("FAIL", failureClass));
    const dry = await reconcileTicket(store, ticket.id, ghRun());
    assert.equal(dry.recommendation.action, "ROUTE_VERIFICATION_FAILURE");
    assert.equal(dry.recommendation.targetStatus, target);
    const applied = await applyReconciliation(store, { id: ticket.id, expectedRevision: dry.recommendation.revision }, ghRun());
    assert.equal(applied.item.status, target);
    const execution = await store.getDoc(ticket.id, "scratch/execution");
    // Two lines by design: the verb records what it did, reconciliation why.
    assert.match(execution, new RegExp(`stage verifying → ${target} by ctl-a; reason: proof FAIL ${failureClass}: `, "u"));
    assert.match(execution, new RegExp(`reconcile ROUTE_VERIFICATION_FAILURE by ctl-a; stage verifying → ${target}; revision `, "u"));
  }
});

test("a transient or unnamed verification failure recommends nothing and refuses the apply as a normal outcome", async (t) => {
  // CORE-129: schema 2 makes "no class named" unwritable, so the inconclusive
  // half of this case is now expressed as `result: INCONCLUSIVE` — the same
  // outcome, said explicitly rather than inferred from an omission.
  for (const [result, failureClass, code] of [
    ["FAIL", "transient", "VERIFICATION_TRANSIENT_RETRY"],
    ["INCONCLUSIVE", undefined, "VERIFICATION_INCONCLUSIVE"],
  ]) {
    const { store } = await fixtureStore(t, "kanmer-apply-transient-");
    const ticket = await store.createItem({ type: "ticket", title: "Retry", profile: "custom", requires: {}, status: "verifying", prs: ["12"] });
    await store.setDoc(ticket.id, "proof", proof(result, failureClass));
    const dry = await reconcileTicket(store, ticket.id, ghRun());
    assert.equal(dry.recommendation, null);
    assert.equal(dry.findings.some((finding) => finding.code === code), true);
    const before = JSON.stringify(await store.getItem(ticket.id));
    await rejects(() => applyReconciliation(store, { id: ticket.id, expectedRevision: "rev1:whatever" }, ghRun()), "RECONCILIATION_INCONCLUSIVE");
    assert.equal(JSON.stringify(await store.getItem(ticket.id)), before);
  }
});

test("apply refuses a stale expected_revision with a structured conflict and mutates nothing", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-apply-stale-");
  const ticket = await store.createItem({ type: "ticket", title: "Stale", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const before = JSON.stringify(await store.getItem(ticket.id));
  const activityBefore = (await store.getActivity({ id: ticket.id })).length;
  await rejects(() => applyReconciliation(store, { id: ticket.id, expectedRevision: "rev1:0000000000000000" }, ghRun()), "REVISION_CONFLICT");
  assert.equal(JSON.stringify(await store.getItem(ticket.id)), before);
  assert.equal((await store.getActivity({ id: ticket.id })).length, activityBefore);
  assert.equal(await store.getDoc(ticket.id, "scratch/execution"), null);
});

test("F-015 regression: a proof rewritten between collect and apply is refused, not applied", async (t) => {
  // CORE-113's terminal defect. `updated` on the ticket file does not move when
  // only a pipeline document changes, so PR #286's `expectedUpdated` CAS would
  // have moved this ticket to Done on the strength of a proof that had already
  // flipped PASS → FAIL. The document-inclusive revision does move.
  const { store } = await fixtureStore(t, "kanmer-apply-f015-");
  const ticket = await store.createItem({ type: "ticket", title: "F-015", profile: "custom", requires: {}, status: "verifying", prs: ["12"] });
  await store.setDoc(ticket.id, "proof", proof("PASS"));
  const dry = await reconcileTicket(store, ticket.id, ghRun());
  assert.equal(dry.recommendation.action, "MOVE_TO_DONE");
  const staleRevision = dry.recommendation.revision;
  const updatedBefore = (await store.getItem(ticket.id)).updated;

  // Rewrite ONLY the proof document; nothing else about the ticket changes.
  await store.setDoc(ticket.id, "proof", proof("FAIL", "implementation"));
  const item = await store.getItem(ticket.id);
  assert.equal(item.updated, updatedBefore, "the ticket file's `updated` deliberately did not move");
  assert.notEqual((await store.getRevision(ticket.id)).revision, staleRevision, "the document-inclusive revision did");

  await rejects(() => applyReconciliation(store, { id: ticket.id, expectedRevision: staleRevision }, ghRun()), "REVISION_CONFLICT");
  assert.equal((await store.getItem(ticket.id)).status, "verifying");
});

test("apply keeps CORE-121's backward-move authority for Review → Implementing", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-apply-return-");
  // A non-`gui` actor: the board's own drag-backwards operator default must not
  // stand in for an authority decision here.
  store.setActor("ctl-a");
  const ticket = await store.createItem({ type: "ticket", title: "Closed", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const closedRun = ghRun({ view: new Map([["12", closedJson]]) });
  const dry = await reconcileTicket(store, ticket.id, closedRun);
  assert.equal(dry.recommendation.action, "MOVE_TO_IMPLEMENTING");
  const revision = dry.recommendation.revision;
  // No reason at all — exactly what PR #286 passed, and why its path is dead.
  await assert.rejects(
    () => applyReconciliation(store, { id: ticket.id, expectedRevision: revision }, closedRun),
    /BACKWARD_MOVE_NEEDS_REASON/u,
  );
  // A reason that is not an operator override still cannot self-authorise.
  await assert.rejects(
    () => applyReconciliation(store, { id: ticket.id, expectedRevision: revision, reason: "reconcile: the PR closed" }, closedRun),
    /REVIEW_RETURN_NEEDS_ATTESTATION/u,
  );
  assert.equal((await store.getItem(ticket.id)).status, "review");
  // An operator supplies the authority; the existing contract judges it.
  const applied = await applyReconciliation(
    store,
    { id: ticket.id, expectedRevision: revision, reason: "operator: the PR closed unmerged" },
    closedRun,
  );
  assert.equal(applied.item.status, "implementing");
  assert.equal(applied.item.review_round, 1);
});

test("apply releases only a clean, identity-matched terminal claim, and releases the claim not the workspace", async (t) => {
  const { root, store } = await fixtureStore(t, "kanmer-apply-release-");
  store.setActor("ctl-a");
  const ticket = await store.createItem({ type: "ticket", title: "Terminal", profile: "custom", requires: {}, status: "implementing" });
  await fs.mkdir(path.join(root, "wt"), { recursive: true });
  const taken = await store.takeTicket(ticket.id, { branch: "b", worktree: "wt", assignee: "ctl-a", controller: "ctl-a" });
  await store.updateItem(ticket.id, { status: "done" });
  const run = workspaceRun("b", { gh: ghRun({ view: new Map([["12", mergedJson]]) }) });
  const options = { resolveCommonDir: commonDir(path.join(root, ".git")) };
  const dry = await reconcileTicket(store, ticket.id, run, options);
  assert.equal(dry.recommendation.action, "RELEASE_CLEAN_TERMINAL_CLAIM");
  assert.equal(dry.recommendation.targetStatus, undefined);
  const applied = await applyReconciliation(store, { id: ticket.id, expectedRevision: dry.recommendation.revision }, run, options);
  assert.equal(applied.item.taken_at, undefined);
  assert.equal(applied.item.branch, undefined);
  assert.equal(applied.item.worktree, undefined);
  assert.deepEqual(applied.from, { status: "done", controller: "ctl-a" });
  assert.deepEqual(applied.to, { status: "done", controller: null });
  // The claim went; the workspace is untouched.
  assert.ok((await fs.stat(path.join(root, "wt"))).isDirectory());
  const execution = await store.getDoc(ticket.id, "scratch/execution");
  assert.match(execution, /reconcile RELEASE_CLEAN_TERMINAL_CLAIM by ctl-a; controller ctl-a → \(none\); revision /u);
  assert.equal(/reconcile RELEASE_CLEAN_TERMINAL_CLAIM[^\n]*stage /u.test(execution), false, "a claim action records no stage change");
  assert.ok(taken.taken_at);
});

test("apply recovers an expired claim over a DIRTY workspace without touching a byte of it (FRD-028 AC4)", async (t) => {
  const { root, store } = await fixtureStore(t, "kanmer-apply-recover-");
  store.setActor("ctl-b");
  const git = (args, cwd = root) => execFileSync("git", args, { cwd, windowsHide: true, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git(["init", "-q", "-b", "main"]);
  git(["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "--allow-empty", "-q", "-m", "root"]);
  const worktree = path.join(root, ".worktrees", "TICK-001");
  git(["worktree", "add", "-q", "-b", "tick-001-work", worktree, "main"]);
  const dirty = path.join(worktree, "unfinished.txt");
  await fs.writeFile(dirty, "work in progress\n", "utf8");

  const ticket = await store.createItem({ type: "ticket", title: "Abandoned", profile: "custom", requires: {}, status: "implementing" });
  const taken = await store.takeTicket(ticket.id, { branch: "tick-001-work", worktree: ".worktrees/TICK-001", assignee: "ctl-a", controller: "ctl-a" });

  const porcelain = () => git(["-C", worktree, "status", "--porcelain"]);
  const statusBefore = porcelain();
  assert.ok(statusBefore.trim(), "the fixture workspace really is dirty");

  await expireClaim(store, ticket.id);
  const dry = await reconcileTicket(store, ticket.id);
  assert.equal(dry.evidence.claim.state, "expired");
  assert.equal(dry.evidence.workspace.state, "dirty");
  assert.equal(dry.recommendation.action, "RECOVER_EXPIRED_CLAIM");
  assert.ok(dry.findings.some((finding) => finding.code === "DIRTY_WORKSPACE_PRESERVED"));

  const applied = await applyReconciliation(
    store,
    { id: ticket.id, expectedRevision: dry.recommendation.revision, controller: "ctl-b" },
  );
  assert.equal(applied.action, "RECOVER_EXPIRED_CLAIM");
  assert.deepEqual(applied.from, { status: "implementing", controller: "ctl-a" });
  assert.deepEqual(applied.to, { status: "implementing", controller: "ctl-b" });
  // A transfer changes who is responsible, never where the work is.
  assert.equal(applied.item.branch, "tick-001-work");
  assert.equal(applied.item.worktree, ".worktrees/TICK-001");
  assert.equal(applied.item.taken_at, taken.taken_at);
  assert.equal(applied.item.lease_reclaimed_from, "ctl-a");
  assert.notEqual(applied.item.lease_id, taken.lease_id);
  // Nothing was deleted, cleaned or committed: the porcelain is byte-identical.
  assert.equal(porcelain(), statusBefore);
  assert.equal(await fs.readFile(dirty, "utf8"), "work in progress\n");
  const execution = await store.getDoc(ticket.id, "scratch/execution");
  assert.match(execution, /reconcile RECOVER_EXPIRED_CLAIM by ctl-b; controller ctl-a → ctl-b; revision /u);
  // The transfer records its own re-read evidence; both lines are kept.
  assert.match(execution, /claim-transfer ctl-a → ctl-b \(expired;[^\n]*evidence: workspace dirty \(matches-claim\)/u);
});

// CORE-133. The two shapes FRD-028 names as "a missing worktree or no
// surviving work" are what the real collector emits for an abandoned claim, and
// before CORE-133 neither could reach `RECOVER_EXPIRED_CLAIM`. Both are proved
// end to end here, through the real collector and `applyReconciliation`, not
// only through the pure classifier.
test("apply recovers an expired claim whose recorded worktree has been deleted, and creates nothing in its place", async (t) => {
  const { root, store } = await fixtureStore(t, "kanmer-apply-missing-");
  store.setActor("ctl-b");
  const ticket = await store.createItem({ type: "ticket", title: "Deleted workspace", profile: "custom", requires: {}, status: "implementing" });
  const taken = await store.takeTicket(ticket.id, { branch: "tick-001-work", worktree: ".worktrees/GONE", assignee: "ctl-a", controller: "ctl-a" });
  await expireClaim(store, ticket.id);

  const dry = await reconcileTicket(store, ticket.id);
  assert.equal(dry.evidence.claim.state, "expired");
  // The exact shape the collector emits for an ENOENT worktree.
  assert.deepEqual(dry.evidence.workspace, { state: "missing", recordedWorktree: ".worktrees/GONE", claimIdentity: "unavailable" });
  assert.equal(dry.recommendation.action, "RECOVER_EXPIRED_CLAIM");
  assert.equal(dry.recommendation.targetStatus, undefined);
  assert.ok(dry.findings.some((finding) => finding.code === "WORKSPACE_MISSING"));

  const applied = await applyReconciliation(
    store,
    { id: ticket.id, expectedRevision: dry.recommendation.revision, controller: "ctl-b" },
  );
  assert.equal(applied.action, "RECOVER_EXPIRED_CLAIM");
  assert.deepEqual(applied.from, { status: "implementing", controller: "ctl-a" });
  assert.deepEqual(applied.to, { status: "implementing", controller: "ctl-b" });
  // Responsibility moved; the recorded location and claim time did not, so an
  // operator can still find whatever the abandoned worker left behind.
  assert.equal(applied.item.branch, "tick-001-work");
  assert.equal(applied.item.worktree, ".worktrees/GONE");
  assert.equal(applied.item.taken_at, taken.taken_at);
  assert.equal(applied.item.lease_reclaimed_from, "ctl-a");
  assert.notEqual(applied.item.lease_id, taken.lease_id);
  // Recovery is not re-creation: nothing was written at the recorded path.
  await assert.rejects(fs.stat(path.join(root, ".worktrees", "GONE")), /ENOENT/u);
  const execution = await store.getDoc(ticket.id, "scratch/execution");
  assert.match(execution, /reconcile RECOVER_EXPIRED_CLAIM by ctl-b; controller ctl-a → ctl-b; revision /u);
  assert.match(execution, /claim-transfer ctl-a → ctl-b \(expired;[^\n]*evidence: workspace missing \(unavailable\)/u);
});

test("apply recovers an expired claim that never recorded a workspace", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-apply-unrecorded-");
  store.setActor("ctl-b");
  const ticket = await store.createItem({ type: "ticket", title: "No workspace", profile: "custom", requires: {}, status: "implementing" });
  // An isolated branch-only take: legal, and exactly the incomplete claim a
  // crashed worker leaves when it never reached `git worktree add`.
  const taken = await store.takeTicket(ticket.id, { branch: "tick-001-work", assignee: "ctl-a", controller: "ctl-a" });
  assert.equal(taken.worktree, undefined);
  await expireClaim(store, ticket.id);

  const dry = await reconcileTicket(store, ticket.id);
  assert.equal(dry.evidence.claim.state, "expired");
  assert.deepEqual(dry.evidence.workspace, { state: "not-recorded", recordedWorktree: null, claimIdentity: "not-applicable" });
  assert.equal(dry.recommendation.action, "RECOVER_EXPIRED_CLAIM");
  assert.ok(dry.findings.some((finding) => finding.code === "CLAIM_WITHOUT_RECORDED_WORKSPACE"));

  const applied = await applyReconciliation(
    store,
    { id: ticket.id, expectedRevision: dry.recommendation.revision, controller: "ctl-b" },
  );
  assert.equal(applied.action, "RECOVER_EXPIRED_CLAIM");
  assert.deepEqual(applied.to, { status: "implementing", controller: "ctl-b" });
  assert.equal(applied.item.branch, "tick-001-work");
  assert.equal(applied.item.worktree, undefined);
  assert.equal(applied.item.taken_at, taken.taken_at);
  assert.equal(applied.item.lease_reclaimed_from, "ctl-a");
  const execution = await store.getDoc(ticket.id, "scratch/execution");
  assert.match(execution, /claim-transfer ctl-a → ctl-b \(expired;[^\n]*evidence: workspace not-recorded \(not-applicable\)/u);
});

for (const identity of ["foreign-repository", "branch-mismatch"]) {
  test(`an expired claim over a ${identity} workspace stays refused by the classifier and the store`, async (t) => {
    const { root, store } = await fixtureStore(t, `kanmer-apply-${identity}-`);
    await fs.mkdir(path.join(root, "wt"), { recursive: true });
    const ticket = await store.createItem({ type: "ticket", title: "Unsafe workspace", profile: "custom", requires: {}, status: "implementing" });
    await store.takeTicket(ticket.id, { branch: "b", worktree: "wt", assignee: "ctl-a", controller: "ctl-a" });
    await expireClaim(store, ticket.id);
    const run = workspaceRun(identity === "branch-mismatch" ? "someone-elses-branch" : "b");
    const options = identity === "foreign-repository"
      ? { resolveCommonDir: async (directory) => ({ ok: true, path: path.join(directory, ".git") }) }
      : { resolveCommonDir: commonDir(path.join(root, ".git")) };
    const before = JSON.stringify(await store.getItem(ticket.id));

    const dry = await reconcileTicket(store, ticket.id, run, options);
    assert.equal(dry.evidence.claim.state, "expired");
    assert.equal(dry.evidence.workspace.claimIdentity, identity);
    assert.equal(dry.recommendation, null);
    await rejects(() => applyReconciliation(store, { id: ticket.id, expectedRevision: "rev1:whatever" }, run, options), "RECONCILIATION_INCONCLUSIVE");
    // transferTicket refuses it independently, so no second path can reach it.
    const revision = (await store.getRevision(ticket.id)).revision;
    await assert.rejects(
      () => store.applyReconciliation(ticket.id, {
        action: "RECOVER_EXPIRED_CLAIM", expectedRevision: revision, actor: "ctl-b",
        recovery: leaseRecoverySummary(dry.evidence),
      }),
      /RECOVERY_REFUSED/u,
    );
    assert.equal(JSON.stringify(await store.getItem(ticket.id)), before);
  });
}

for (const failureClass of ["implementation", "plan"]) {
  test(`a ${failureClass} FAIL proof naming a stale merge SHA routes nothing and the apply refuses without touching it`, async (t) => {
    const { store } = await fixtureStore(t, `kanmer-apply-stale-fail-${failureClass}-`);
    const ticket = await store.createItem({ type: "ticket", title: "Stale FAIL", profile: "custom", requires: {}, status: "verifying", prs: ["12"] });
    // A proof from an earlier verification round: FAIL, correctly classed, and
    // about a merge this ticket no longer sits on.
    await store.setDoc(ticket.id, "proof", proof("FAIL", failureClass, "c".repeat(40)));
    const proofBefore = await store.getDoc(ticket.id, "proof");
    const before = JSON.stringify(await store.getItem(ticket.id));

    const dry = await reconcileTicket(store, ticket.id, ghRun());
    assert.equal(dry.evidence.proof.state, "fail");
    assert.equal(dry.evidence.proof.failureClass, failureClass);
    assert.equal(dry.recommendation, null);
    assert.ok(dry.findings.some((finding) => finding.code === "PROOF_MERGE_SHA_MISMATCH"));

    await rejects(() => applyReconciliation(store, { id: ticket.id, expectedRevision: "rev1:whatever" }, ghRun()), "RECONCILIATION_INCONCLUSIVE");
    // The stale record is evidence, not garbage: it is preserved byte for byte.
    assert.equal(await store.getDoc(ticket.id, "proof"), proofBefore);
    assert.equal(JSON.stringify(await store.getItem(ticket.id)), before);
    assert.equal((await store.getItem(ticket.id)).status, "verifying");
    assert.equal(await store.getDoc(ticket.id, "scratch/execution"), null);
  });
}

test("a live claim is never reconciled into a transfer, at either layer", async (t) => {
  const { root, store } = await fixtureStore(t, "kanmer-apply-live-");
  await fs.mkdir(path.join(root, "wt"), { recursive: true });
  const ticket = await store.createItem({ type: "ticket", title: "Live", profile: "custom", requires: {}, status: "implementing" });
  await store.takeTicket(ticket.id, { branch: "b", worktree: "wt", assignee: "ctl-a", controller: "ctl-a" });
  const run = workspaceRun("b");
  const options = { resolveCommonDir: commonDir(path.join(root, ".git")) };
  // The classifier proposes nothing for a live claim, so the boundary refuses.
  const dry = await reconcileTicket(store, ticket.id, run, options);
  assert.equal(dry.evidence.claim.state, "current");
  assert.equal(dry.recommendation, null);
  await rejects(() => applyReconciliation(store, { id: ticket.id, expectedRevision: "rev1:whatever" }, run, options), "RECONCILIATION_INCONCLUSIVE");
  // And the store refuses the action outright, so no other caller can force it.
  const revision = (await store.getRevision(ticket.id)).revision;
  await assert.rejects(
    () => store.applyReconciliation(ticket.id, { action: "RECOVER_EXPIRED_CLAIM", expectedRevision: revision, actor: "ctl-b" }),
    /CLAIM_LIVE/u,
  );
  assert.equal((await store.getItem(ticket.id)).claim_controller, "ctl-a");
});

test("the board worktree is refused as a reconciliation target in every path", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-apply-board-");
  const ticket = await store.createItem({ type: "ticket", title: "Board", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  // takeTicket already refuses `.` outright (assertNotBoardWorktree), so the
  // only way a board can record it is by hand — which is exactly the broken
  // state reconciliation has to survive.
  await store.takeTicket(ticket.id, { branch: "kanmer-board", worktree: "wt", assignee: "ctl-a" });
  const file = path.join(store.paths.kanmer, "areas", "_none", ticket.id, `${ticket.id}.md`);
  await fs.writeFile(file, (await fs.readFile(file, "utf8")).replace(/^worktree: .*$/mu, "worktree: ."), "utf8");
  const before = JSON.stringify(await store.getItem(ticket.id));
  const dry = await reconcileTicket(store, ticket.id, ghRun());
  assert.equal(dry.evidence.workspace.boardWorktree, true);
  assert.equal(dry.findings[0].code, "BOARD_WORKTREE_PROTECTED");
  assert.equal(dry.recommendation, null);
  await rejects(() => applyReconciliation(store, { id: ticket.id, expectedRevision: "rev1:whatever" }, ghRun()), "RECONCILIATION_INCONCLUSIVE");
  // transferTicket refuses it independently, so no second path can reach it.
  const revision = (await store.getRevision(ticket.id)).revision;
  await assert.rejects(
    () => store.applyReconciliation(ticket.id, {
      action: "RECOVER_EXPIRED_CLAIM", expectedRevision: revision, actor: "ctl-b",
      recovery: leaseRecoverySummary(dry.evidence),
    }),
    /CLAIM_LIVE|RECOVERY_REFUSED/u,
  );
  assert.equal(JSON.stringify(await store.getItem(ticket.id)), before);
});

test("the store dispatcher re-asserts every action's precondition before it reaches a verb", async (t) => {
  const { store } = await fixtureStore(t, "kanmer-apply-precondition-");
  const ticket = await store.createItem({ type: "ticket", title: "Wrong stage", profile: "custom", requires: {}, status: "review", prs: ["12"] });
  const revision = (await store.getRevision(ticket.id)).revision;
  await assert.rejects(
    () => store.applyReconciliation(ticket.id, { action: "MOVE_TO_DONE", targetStatus: "done", expectedRevision: revision }),
    /RECONCILIATION_PRECONDITION_FAILED/u,
  );
  await assert.rejects(
    () => store.applyReconciliation(ticket.id, { action: "MOVE_TO_VERIFYING", targetStatus: "done", expectedRevision: revision }),
    /RECONCILIATION_PRECONDITION_FAILED/u,
  );
  await assert.rejects(
    () => store.applyReconciliation(ticket.id, { action: "RELEASE_CLEAN_TERMINAL_CLAIM", targetStatus: "done", expectedRevision: revision }),
    /RECONCILIATION_PRECONDITION_FAILED/u,
  );
  assert.equal((await store.getItem(ticket.id)).status, "review");
  assert.equal(await store.getDoc(ticket.id, "scratch/execution"), null);
});

test("packet-aware reconcile_ticket classifies actual allowed changes and writes no board byte", async (t) => {
  const fixture = await stepFixture(t);
  await fs.writeFile(path.join(fixture.worktree, "tracked.txt"), "worker change\n");
  await fixture.store.setDoc(fixture.ticket.id, "checklist", fixture.checklistText.replace("[ ] Step 1", "[x] Step 1"));
  await fixture.store.setDoc(fixture.ticket.id, "scratch/worker-log", "heartbeat note");
  const referenceInput = path.join(fixture.root, "reference-input.txt");
  await fs.writeFile(referenceInput, "operator reference\n");
  await fixture.store.addReference(fixture.ticket.id, referenceInput, "operator.txt");
  const before = await directoryDigest(path.join(fixture.root, ".kanmer"));
  const run = async (command, args, options) => ({ stdout: execFileSync(command, args, { cwd: options.cwd, encoding: "utf8", windowsHide: true }) });
  const result = await reconcileTicket(fixture.store, fixture.ticket.id, run, { stepPacket: fixture.packet, stepProject: fixture.project });
  assert.equal(result.step.status, "pass");
  assert.deepEqual(result.step.changedPaths, [{ path: "tracked.txt", classification: "allowed" }]);
  assert.equal(await directoryDigest(path.join(fixture.root, ".kanmer")), before);
});

test("packet-aware reconcile_ticket fails a forbidden path committed and later reverted", async (t) => {
  const fixture = await stepFixture(t);
  await fs.mkdir(path.join(fixture.worktree, "forbidden"));
  await fs.writeFile(path.join(fixture.worktree, "forbidden", "transient.txt"), "forbidden history\n");
  execFileSync("git", ["-C", fixture.worktree, "add", "forbidden/transient.txt"]);
  execFileSync("git", ["-C", fixture.worktree, "commit", "-m", "touch forbidden path"], { stdio: "ignore" });
  await fs.rm(path.join(fixture.worktree, "forbidden", "transient.txt"));
  execFileSync("git", ["-C", fixture.worktree, "add", "-u", "forbidden/transient.txt"]);
  execFileSync("git", ["-C", fixture.worktree, "commit", "-m", "restore endpoint"], { stdio: "ignore" });
  assert.equal(execFileSync("git", ["-C", fixture.worktree, "diff", "--name-only", fixture.packet.workspace.head, "HEAD"], { encoding: "utf8" }).trim(), "");
  await fixture.store.setDoc(fixture.ticket.id, "checklist", fixture.checklistText.replace("[ ] Step 1", "[x] Step 1"));

  const result = await reconcileTicket(fixture.store, fixture.ticket.id, undefined, {
    stepPacket: fixture.packet,
    stepProject: fixture.project,
  });
  assert.equal(result.step.status, "fail");
  assert.ok(result.step.findings.some((finding) => finding.code === "STEP_PATH_FORBIDDEN" && finding.path === "forbidden/transient.txt"));
  assert.deepEqual(result.step.changedPaths, [{ path: "forbidden/transient.txt", classification: "forbidden" }]);
});

for (const [label, checklist, expectedCode] of [
  ["an unticked selected step", (text) => text, "STEP_NOT_COMPLETED"],
  ["a later step marker", (text) => text.replace("[ ] Step 2", "[x] Step 2"), "STEP_LATER_ADVANCED"],
  ["a checklist text deviation", (text) => `${text}worker-added text\n`, "STEP_CHECKLIST_CONTENT_CHANGED"],
]) {
  test(`${label} does not suppress actual workspace classification`, async (t) => {
    const fixture = await stepFixture(t);
    await fs.writeFile(path.join(fixture.worktree, "undeclared.txt"), "worker deviation\n");
    const changedChecklist = checklist(fixture.checklistText);
    if (changedChecklist !== fixture.checklistText) {
      await fixture.store.setDoc(fixture.ticket.id, "checklist", changedChecklist);
    }
    const result = await reconcileTicket(fixture.store, fixture.ticket.id, undefined, { stepPacket: fixture.packet, stepProject: fixture.project });
    assert.equal(result.step.status, "fail");
    assert.ok(result.step.findings.some((finding) => finding.code === expectedCode));
    assert.ok(result.step.findings.some((finding) => finding.code === "STEP_PATH_UNDECLARED" && finding.path === "undeclared.txt"));
    assert.deepEqual(result.step.changedPaths, [{ path: "undeclared.txt", classification: "undeclared" }]);
  });
}

for (const [label, mutate, expectedCode] of [
  ["plan", async (fixture) => {
    const current = await fixture.store.getDoc(fixture.ticket.id, "plan");
    await fixture.store.setDoc(fixture.ticket.id, "plan", current.replace("Stay inside the packet.", "Stay inside the exact packet."));
  }, "STEP_PLAN_STALE"],
  ["evidence", async (fixture) => {
    await fixture.store.setDoc(fixture.ticket.id, "files", "# Files\n\npost-issuance evidence drift\n");
  }, "STEP_EVIDENCE_STALE"],
  ["ticket", async (fixture) => {
    await fixture.store.updateItem(fixture.ticket.id, { body: "post-issuance ticket authority drift" });
  }, "STEP_TICKET_AUTHORITY_STALE"],
]) {
  test(`post-issuance ${label} drift retains undeclared workspace evidence`, async (t) => {
    const fixture = await stepFixture(t);
    await fs.writeFile(path.join(fixture.worktree, "undeclared.txt"), "worker deviation\n");
    await mutate(fixture);
    const result = await reconcileTicket(fixture.store, fixture.ticket.id, undefined, {
      stepPacket: fixture.packet,
      stepProject: fixture.project,
    });
    assert.equal(result.step.status, "fail");
    assert.ok(result.step.findings.some((finding) => finding.code === expectedCode));
    assert.ok(result.step.findings.some((finding) => finding.code === "STEP_PATH_UNDECLARED" && finding.path === "undeclared.txt"));
    assert.deepEqual(result.step.changedPaths, [{ path: "undeclared.txt", classification: "undeclared" }]);
  });
}

test("unavailable batched authority remains explicitly inconclusive", async (t) => {
  const fixture = await stepFixture(t, { batch: true });
  await fixture.store.setDoc(fixture.ticket.id, "proof", "x".repeat(STEP_PACKET_LIMITS.maxStringBytes + 1));
  const result = await reconcileTicket(fixture.store, fixture.ticket.id, undefined, {
    stepPacket: fixture.packet,
    stepProject: fixture.project,
  });
  assert.equal(result.step.status, "inconclusive");
  assert.equal(result.step.packetId, fixture.packet.packetId);
  assert.deepEqual(result.step.changedPaths, []);
  assert.ok(result.step.findings.some((finding) => finding.code === "STEP_AUTHORITY_UNAVAILABLE"));
  assert.equal(result.step.findings.some((finding) => finding.code === "STEP_IDENTITY_MISMATCH"), false);
});

for (const countedDocument of ["proof", "open-questions", "post-implementation-report"]) {
  test(`an exact checklist tick does not mask a concurrent ${countedDocument} rewrite`, async (t) => {
    const fixture = await stepFixture(t);
    await fs.writeFile(path.join(fixture.worktree, "tracked.txt"), "worker change\n");
    await fixture.store.setDoc(fixture.ticket.id, "checklist", fixture.checklistText.replace("[ ] Step 1", "[x] Step 1"));
    await fixture.store.setDoc(fixture.ticket.id, countedDocument, "unrelated counted document change");
    const result = await reconcileTicket(fixture.store, fixture.ticket.id, undefined, { stepPacket: fixture.packet, stepProject: fixture.project });
    assert.equal(result.step.status, "fail");
    assert.ok(result.step.findings.some((finding) => finding.code === "STEP_TICKET_DOCUMENTS_STALE"));
  });
}

test("invalid and recomputed-broader packets skip step Git while ordinary evidence still collects", async (t) => {
  const fixture = await stepFixture(t);
  let stepCalls = 0;
  const stepRun = async () => { stepCalls += 1; throw new Error("step Git must not run"); };
  const ordinaryRun = async (command, args, options) => ({ stdout: execFileSync(command, args, { cwd: options.cwd, encoding: "utf8", windowsHide: true }) });
  const invalid = await reconcileTicket(fixture.store, fixture.ticket.id, ordinaryRun, { stepPacket: { packetVersion: "step-packet/1" }, stepProject: fixture.project, stepRun });
  assert.equal(invalid.step.status, "inconclusive");
  assert.notEqual(invalid.evidence, null);
  assert.equal(stepCalls, 0);

  const { packetId: _ignored, ...body } = fixture.packet;
  const broaderBody = { ...body, allowedFiles: [...body.allowedFiles, "README.md"] };
  const broader = { ...broaderBody, packetId: stepPacketDigest(broaderBody) };
  const forged = await reconcileTicket(fixture.store, fixture.ticket.id, ordinaryRun, { stepPacket: broader, stepProject: fixture.project, stepRun });
  assert.equal(forged.step.status, "fail");
  assert.ok(forged.step.findings.some((finding) => finding.code === "STEP_PLAN_AUTHORITY_MISMATCH"));
  assert.notEqual(forged.evidence, null);
  assert.equal(stepCalls, 0);
});

test("invalid and stale step packets append to a real ordinary recommendation", async (t) => {
  const fixture = await stepFixture(t);
  const ordinary = await fixture.store.createItem({ type: "ticket", title: "Ordinary review", profile: "custom", requires: {}, status: "review" });
  let stepCalls = 0;
  const stepRun = async () => { stepCalls += 1; throw new Error("step Git must not run"); };

  const invalid = await reconcileTicket(fixture.store, ordinary.id, undefined, {
    stepPacket: { packetVersion: "step-packet/1" },
    stepProject: fixture.project,
    stepRun,
  });
  assert.equal(invalid.recommendation.action, "MOVE_TO_IMPLEMENTING");
  assert.notEqual(invalid.evidence, null);
  assert.equal(invalid.step.status, "inconclusive");
  assert.equal(stepCalls, 0);

  const stale = await reconcileTicket(fixture.store, ordinary.id, undefined, {
    stepPacket: fixture.packet,
    stepProject: fixture.project,
    stepRun,
  });
  assert.equal(stale.recommendation.action, "MOVE_TO_IMPLEMENTING");
  assert.notEqual(stale.evidence, null);
  assert.equal(stale.step.status, "fail");
  assert.ok(stale.step.findings.some((finding) => finding.code === "STEP_IDENTITY_MISMATCH"));
  assert.equal(stepCalls, 0);
});

test("missing workspace evidence is inconclusive rather than PASS", async (t) => {
  const fixture = await stepFixture(t);
  await fixture.store.setDoc(fixture.ticket.id, "checklist", fixture.checklistText.replace("[ ] Step 1", "[x] Step 1"));
  await fs.rename(fixture.worktree, `${fixture.worktree}.missing`);
  const result = await reconcileTicket(fixture.store, fixture.ticket.id, undefined, { stepPacket: fixture.packet, stepProject: fixture.project });
  assert.equal(result.step.status, "inconclusive");
  assert.ok(result.step.findings.some((finding) => finding.code === "STEP_WORKSPACE_UNAVAILABLE"));
});
