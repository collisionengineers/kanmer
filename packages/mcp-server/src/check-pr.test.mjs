import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { KanmerStore } from "../../core/dist/index.js";
import { assertGitRepository, collectCommitReachability } from "./git-reachability.mjs";
import { parseReviewEvidence, readPrEvent, readStrictFlag } from "./check-pr.mjs";
import { removeTreeWithRetry } from "@kanmer/core";

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
  return runWithEnv({}, board, event, ...args);
}

function runWithEnv(env, board, event, ...args) {
  return spawnSync(process.execPath, [cli, "--board", board, "--event", event, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, KANMER_GATE_STRICT: "", ...env },
  });
}

function gitIn(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function attestation(headSha, verdict = "pass", extra = "", current = {}) {
  return `---
kind: review-attestation
pr: "1"
head_sha: ${headSha}
verdict: ${verdict}
reviewer: independent-reviewer
independent: true
plan_hash: ${current.planHash ?? "plan-version"}
ticket_updated: "${current.ticketUpdated ?? "2026-08-22T07:00:00.000Z"}"
findings: []
${extra}---
Review body
`;
}

function pullRequestEvent(number, body, headSha, ref, baseSha = "b".repeat(40), identity = {}) {
  const baseRef = Object.hasOwn(identity, "baseRef") ? identity.baseRef : "main";
  const base = {
    sha: baseSha,
    ...(baseRef ? { ref: baseRef } : {}),
    ...(identity.repository ? { repo: { full_name: identity.repository } } : {}),
  };
  const pull_request = {
    number,
    body,
    head: {
      sha: headSha,
      ref,
      ...(identity.headRepository ? { repo: { full_name: identity.headRepository } } : {}),
    },
    base,
    ...(identity.url ? { html_url: identity.url } : {}),
  };
  return {
    pull_request,
    ...(identity.repository ? { repository: { full_name: identity.repository } } : {}),
  };
}

test("pull-request repository evidence stays available without changing legacy emitted PR JSON", () => {
  const event = pullRequestEvent(7, "Kanmer: CORE-126", "a".repeat(40), "batch-pr", "b".repeat(40), {
    repository: "collisionengineers/kanmer",
    headRepository: "contributor/kanmer",
  });
  const pr = readPrEvent(event);
  assert.equal(pr.repository, "collisionengineers/kanmer");
  assert.equal(pr.headRepository, "contributor/kanmer");
  assert.equal(Object.prototype.propertyIsEnumerable.call(pr, "headRepository"), false);
  assert.deepEqual(JSON.parse(JSON.stringify(pr)), {
    number: 7,
    headSha: "a".repeat(40),
    baseSha: "b".repeat(40),
    branch: "batch-pr",
    body: "Kanmer: CORE-126",
    baseRef: "main",
  });
});

test("review attestation parsing requires the complete machine schema", () => {
  const complete = `---
kind: review-attestation
pr: "159"
head_sha: ${"a".repeat(40)}
verdict: pass
reviewer: independent-reviewer
independent: true
plan_hash: plan-version
ticket_updated: "2026-08-22T07:00:00.000Z"
findings: []
---
Review body
`;
  assert.equal(parseReviewEvidence(complete).state, "valid");
  for (const field of ["pr", "verdict", "reviewer", "independent", "plan_hash", "ticket_updated", "findings"]) {
    const missing = complete.replace(new RegExp(`^${field}:.*\\n`, "m"), "");
    assert.equal(parseReviewEvidence(missing).state, "invalid", field);
  }
  assert.equal(parseReviewEvidence(complete.replace("verdict: pass", "verdict: maybe")).state, "invalid");
  const incompleteFinding = complete.replace("findings: []", "findings:\n  - id: F-001\n    severity: blocker\n    summary: missing disposition");
  assert.equal(parseReviewEvidence(incompleteFinding).state, "invalid");
});

test("check-pr emits one JSON verdict and uses exit 0/1/2", async () => {
  const { board, store, ticket, event } = await fixture();
  try {
    const realEvent = pullRequestEvent(
      1,
      `Kanmer: ${ticket.id}`,
      "a".repeat(40),
      "wrong-branch",
      "b".repeat(40),
      {
        repository: "collisionengineers/kanmer",
        url: "https://github.com/collisionengineers/kanmer/pull/1",
      },
    );
    await fs.writeFile(event, JSON.stringify(realEvent));
    const pass = run(board, event);
    assert.equal(pass.status, 0);
    const passResult = JSON.parse(pass.stdout);
    assert.equal(passResult.ok, true);
    assert.deepEqual(passResult.pr, {
      number: 1,
      headSha: "a".repeat(40),
      baseSha: "b".repeat(40),
      branch: "wrong-branch",
      body: `Kanmer: ${ticket.id}`,
      baseRef: "main",
    });
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
    await fs.writeFile(event, JSON.stringify(pullRequestEvent(3, `Kanmer: ${blockedTicket.id}`, "a".repeat(40), "blocked")));
    const blocked = run(board, event);
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /\[DEPENDENCY_BLOCKED\]/);
    assert.equal(JSON.parse(blocked.stdout).checks.find((check) => check.code === "WRONG_STAGE").outcome, "pass");

    const danglingTicket = await store.createItem({ type: "ticket", title: "dangling blocker", status: "review" });
    await store.updateItem(danglingTicket.id, { blocks: ["MISSING-ID"] });
    await fs.writeFile(event, JSON.stringify(pullRequestEvent(6, `Kanmer: ${danglingTicket.id}`, "a".repeat(40), "dangling-blocker")));
    const dangling = run(board, event);
    assert.equal(dangling.status, 1);
    assert.match(dangling.stderr, /\[DEPENDENCY_BLOCKED\].*MISSING-ID/);
    const danglingResult = JSON.parse(dangling.stdout);
    assert.deepEqual(danglingResult.checks.find((check) => check.code === "DEPENDENCY_BLOCKED"), {
      code: "DEPENDENCY_BLOCKED",
      level: "error",
      outcome: "fail",
      message: `Kanmer ticket ${danglingTicket.id} has live blockers: MISSING-ID`,
      details: { blockers: ["MISSING-ID"] },
    });

    const cleanTicket = await store.createItem({ type: "ticket", title: "review record", status: "review" });
    await store.setDoc(cleanTicket.id, "scratch/review", "---\nkind: wrong-record\nhead_sha: abc\n---\n");
    await fs.writeFile(event, JSON.stringify(pullRequestEvent(4, `Kanmer: ${cleanTicket.id}`, "a".repeat(40), "review-record")));
    const invalidReview = run(board, event);
    assert.equal(invalidReview.status, 0);
    assert.match(invalidReview.stderr, /\[STALE_REVIEW\]/);

    await store.setDoc(cleanTicket.id, "scratch/review", "---\nkind: [broken\n---\n");
    const malformedReview = run(board, event);
    assert.equal(malformedReview.status, 0);
    assert.match(malformedReview.stderr, /\[STALE_REVIEW\]/);

    await fs.writeFile(event, JSON.stringify(pullRequestEvent(2, null, "def", "feature/no-ticket")));
    const noTicket = run(board, event);
    assert.equal(noTicket.status, 1);
    assert.equal(JSON.parse(noTicket.stdout).findings[0].code, "NO_TICKET");

    const infra = spawnSync(process.execPath, [cli, "--unknown"], { cwd: repoRoot, encoding: "utf8" });
    assert.equal(infra.status, 2);
    assert.equal(JSON.parse(infra.stdout).infrastructureError, true);
    assert.doesNotMatch(infra.stderr, /node_modules|[A-Za-z]:\\/);
  } finally {
    await removeTreeWithRetry(board);
  }
});

test("strict flag parsing accepts only explicit truthy values", () => {
  for (const value of ["1", "true", "TRUE", "yes", " on "]) assert.equal(readStrictFlag({ KANMER_GATE_STRICT: value }), true, value);
  for (const value of ["", "0", "false", "no", undefined, "strict"]) assert.equal(readStrictFlag({ KANMER_GATE_STRICT: value }), false, String(value));
});

test("attestation checks warn by default and block under KANMER_GATE_STRICT", async () => {
  const { board, store, ticket, event } = await fixture();
  try {
    const head = "a".repeat(40);
    await fs.writeFile(event, JSON.stringify(pullRequestEvent(7, `Kanmer: ${ticket.id}`, head, "strict")));

    // Missing attestation: warning by default, error under strict.
    const missingLenient = run(board, event);
    assert.equal(missingLenient.status, 0);
    assert.match(missingLenient.stderr, /::warning title=kanmer\/gate \[NO_REVIEW_RECORD\]::/);
    const missingStrict = runWithEnv({ KANMER_GATE_STRICT: "1" }, board, event);
    assert.equal(missingStrict.status, 1);
    assert.match(missingStrict.stderr, /::error title=kanmer\/gate \[NO_REVIEW_RECORD\]::/);
    assert.equal(JSON.parse(missingStrict.stdout).strict, true);

    // needs-changes bound to the exact head: still not an approval.
    await store.setDoc(ticket.id, "scratch/review", attestation(head, "needs-changes"));
    const needsChangesLenient = run(board, event);
    assert.equal(needsChangesLenient.status, 0);
    assert.match(needsChangesLenient.stderr, /::warning title=kanmer\/gate \[STALE_REVIEW\]::.*needs-changes/);
    const needsChangesStrict = runWithEnv({ KANMER_GATE_STRICT: "true" }, board, event);
    assert.equal(needsChangesStrict.status, 1);
    assert.match(needsChangesStrict.stderr, /::error title=kanmer\/gate \[STALE_REVIEW\]::.*needs-changes/);
    assert.deepEqual(JSON.parse(needsChangesStrict.stdout).findings.map((finding) => finding.code), ["STALE_REVIEW"]);

    // A passing attestation without board_sha is unrecorded, never stale — and
    // a plain directory board (not a Git checkout) yields no board tip.
    await store.setDoc(ticket.id, "scratch/review", attestation(head));
    const passStrict = runWithEnv({ KANMER_GATE_STRICT: "1" }, board, event);
    assert.equal(passStrict.status, 0);
    const passResult = JSON.parse(passStrict.stdout);
    assert.equal(passResult.ok, true);
    assert.equal(passResult.boardSha, null);
    assert.deepEqual(passResult.checks.find((check) => check.code === "SYNC_REQUIRED"), {
      code: "SYNC_REQUIRED",
      level: "error",
      outcome: "pass",
      message: "review attestation records no board_sha; board sync was not verified",
      details: { state: "unrecorded", boardSha: null, diagnostic: passResult.checks.find((check) => check.code === "SYNC_REQUIRED").details.diagnostic },
    });
    assert.equal(passResult.checks.at(-1).code, "SYNC_REQUIRED");
  } finally {
    await removeTreeWithRetry(board);
  }
});

test("strict check-pr accepts only the complete frozen batch with per-member PR/head attestations", async () => {
  const board = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-check-pr-batch-"));
  try {
    const store = new KanmerStore(board, { actor: "batch-controller" });
    await store.init();
    const free = { type: "ticket", profile: "custom", requires: {}, status: "implementing" };
    const tickets = [];
    for (const title of ["A", "B", "C"]) tickets.push(await store.createItem({ ...free, title }));
    for (const ticket of tickets) {
      await store.setDoc(ticket.id, "plan", `# Plan — ${ticket.id}\n`);
    }
    await store.takeTicket(tickets[0].id, {
      branch: "batch-pr",
      worktree: ".worktrees/batch-pr",
      actor: "batch-controller",
      controllerRun: "batch-controller-run",
      batch: "batch-pr",
      batchMembers: tickets.map((ticket) => ticket.id),
    });
    for (const ticket of tickets.slice(1)) {
      await store.takeTicket(ticket.id, {
        branch: "batch-pr",
        worktree: ".worktrees/batch-pr",
        actor: "batch-controller",
        controllerRun: "batch-controller-run",
        batch: "batch-pr",
      });
    }
    const head = "a".repeat(40);
    const writeMemberReview = async (ticket, overrides = {}) => {
      const current = await store.getItem(ticket.id);
      const plan = await store.getDocWithVersion(ticket.id, "plan");
      const body = attestation(head, "pass", "", {
        ticketUpdated: overrides.ticketUpdated ?? current.updated,
        planHash: overrides.planHash ?? plan.version,
      }).replace(
        'pr: "1"',
        `pr: "${overrides.pr ?? "https://github.com/collisionengineers/kanmer/pull/1"}"`,
      );
      await store.setDoc(ticket.id, "scratch/review", body);
    };
    for (const ticket of tickets) {
      await store.updateItem(ticket.id, { prs: ["1"] });
      await store.moveItem(ticket.id, { status: "review" });
      await writeMemberReview(ticket);
    }
    const event = path.join(board, "event.json");
    const body = tickets.map((ticket) => `Kanmer: ${ticket.id}`).join("\n");
    const repositoryEvent = pullRequestEvent(
      1,
      body,
      head,
      "batch-pr",
      "b".repeat(40),
      { repository: "collisionengineers/kanmer", headRepository: "collisionengineers/kanmer" },
    );
    await fs.writeFile(event, JSON.stringify(repositoryEvent));
    const lenientPass = run(board, event);
    assert.equal(lenientPass.status, 0, lenientPass.stderr);
    const pass = runWithEnv({ KANMER_GATE_STRICT: "1" }, board, event);
    assert.equal(pass.status, 0, pass.stderr);
    const result = JSON.parse(pass.stdout);
    assert.equal(result.ticketId, null);
    assert.equal(result.batchId, "batch-pr");
    assert.deepEqual(result.ticketIds, tickets.map((ticket) => ticket.id).sort());
    assert.equal(result.findings.length, 0);

    const assertBatchProvenanceFailure = async (identity, expected) => {
      await fs.writeFile(event, JSON.stringify(pullRequestEvent(
        1,
        body,
        head,
        "batch-pr",
        "b".repeat(40),
        identity,
      )));
      for (const env of [{}, { KANMER_GATE_STRICT: "1" }]) {
        const adverse = runWithEnv(env, board, event);
        assert.equal(adverse.status, 1, adverse.stderr);
        const findings = JSON.parse(adverse.stdout).findings;
        assert.equal(findings.length, 1);
        assert.deepEqual(
          {
            code: findings[0].code,
            level: findings[0].level,
            outcome: findings[0].outcome,
            batchId: findings[0].details.batchId,
            ...Object.fromEntries(Object.keys(expected).map((key) => [key, findings[0].details[key]])),
          },
          {
            code: "BATCH_ROSTER",
            level: "error",
            outcome: "fail",
            batchId: "batch-pr",
            ...expected,
          },
        );
      }
    };

    await assertBatchProvenanceFailure(
      { repository: "collisionengineers/kanmer", headRepository: "collisionengineers/kanmer", baseRef: null },
      { expectedTarget: "main", baseRef: null },
    );
    await assertBatchProvenanceFailure(
      { repository: "collisionengineers/kanmer", headRepository: "collisionengineers/kanmer", baseRef: "dev" },
      { expectedTarget: "main", baseRef: "dev" },
    );
    await assertBatchProvenanceFailure(
      { headRepository: "collisionengineers/kanmer" },
      { repository: null, headRepository: "collisionengineers/kanmer" },
    );
    await assertBatchProvenanceFailure(
      { repository: "collisionengineers/kanmer" },
      { repository: "collisionengineers/kanmer", headRepository: null },
    );
    await assertBatchProvenanceFailure(
      { repository: "collisionengineers/kanmer", headRepository: "foreign/fork" },
      { repository: "collisionengineers/kanmer", headRepository: "foreign/fork" },
    );

    const caseVariantEvent = pullRequestEvent(
      1,
      body,
      head,
      "batch-pr",
      "b".repeat(40),
      { repository: "collisionengineers/kanmer", headRepository: "COLLISIONENGINEERS/KANMER" },
    );
    await fs.writeFile(event, JSON.stringify(caseVariantEvent));
    for (const env of [{}, { KANMER_GATE_STRICT: "1" }]) {
      const caseVariant = runWithEnv(env, board, event);
      assert.equal(caseVariant.status, 0, caseVariant.stderr);
    }

    await fs.writeFile(event, JSON.stringify(repositoryEvent));

    await writeMemberReview(tickets[1], { ticketUpdated: "2026-01-01T00:00:00.000Z" });
    for (const env of [{}, { KANMER_GATE_STRICT: "1" }]) {
      const staleTicket = runWithEnv(env, board, event);
      assert.equal(staleTicket.status, 1, staleTicket.stderr);
      const finding = JSON.parse(staleTicket.stdout).findings.find((entry) =>
        entry.code === "STALE_REVIEW" && entry.details.ticketId === tickets[1].id
      );
      assert.equal(finding?.level, "error");
      assert.equal(finding?.details.attestedTicketUpdated, "2026-01-01T00:00:00.000Z");
    }
    await writeMemberReview(tickets[1]);

    await store.setDoc(tickets[1].id, "plan", `# Plan — ${tickets[1].id}\n\nChanged after review.\n`);
    for (const env of [{}, { KANMER_GATE_STRICT: "1" }]) {
      const stalePlan = runWithEnv(env, board, event);
      assert.equal(stalePlan.status, 1, stalePlan.stderr);
      const finding = JSON.parse(stalePlan.stdout).findings.find((entry) =>
        entry.code === "STALE_REVIEW" && entry.details.ticketId === tickets[1].id
      );
      assert.equal(finding?.level, "error");
      assert.notEqual(finding?.details.attestedPlanHash, finding?.details.planVersion);
    }
    await writeMemberReview(tickets[1]);

    await store.updateItem(tickets[1].id, { prs: ["2"] });
    for (const env of [{}, { KANMER_GATE_STRICT: "1" }]) {
      const wrongMemberPr = runWithEnv(env, board, event);
      assert.equal(wrongMemberPr.status, 1, wrongMemberPr.stderr);
      const findings = JSON.parse(wrongMemberPr.stdout).findings;
      assert.equal(findings.length, 1);
      assert.equal(findings[0].code, "BATCH_ROSTER");
      assert.deepEqual(findings[0].details.missingPrTrace, [tickets[1].id]);
    }
    await store.updateItem(tickets[1].id, { prs: ["1"] });
    await writeMemberReview(tickets[1]);

    await fs.writeFile(
      event,
      JSON.stringify(pullRequestEvent(
        1,
        body,
        head,
        "different-source-branch",
        "b".repeat(40),
        { repository: "collisionengineers/kanmer", headRepository: "collisionengineers/kanmer" },
      )),
    );
    const wrongBranch = run(board, event);
    assert.equal(wrongBranch.status, 1);
    assert.match(wrongBranch.stderr, /::error title=kanmer\/gate \[BATCH_ROSTER\]::/);
    const wrongBranchFinding = JSON.parse(wrongBranch.stdout).findings;
    assert.equal(wrongBranchFinding.length, 1);
    assert.deepEqual(
      {
        code: wrongBranchFinding[0].code,
        level: wrongBranchFinding[0].level,
        outcome: wrongBranchFinding[0].outcome,
        batchId: wrongBranchFinding[0].details.batchId,
        batchBranch: wrongBranchFinding[0].details.batchBranch,
        prBranch: wrongBranchFinding[0].details.prBranch,
      },
      {
        code: "BATCH_ROSTER",
        level: "error",
        outcome: "fail",
        batchId: "batch-pr",
        batchBranch: "batch-pr",
        prBranch: "different-source-branch",
      },
    );

    await fs.writeFile(event, JSON.stringify(repositoryEvent));
    await store.updateBoard((boardConfig) => ({
      ...boardConfig,
      delivery: {
        integrationBranch: "dev",
        releaseBranch: "main",
        releaseCandidatePattern: "release/*",
        hotfixBackport: true,
      },
    }));
    await store.updateItem(tickets[1].id, { delivery_branch: "main" });
    const mixedTargets = run(board, event);
    assert.equal(mixedTargets.status, 1);
    assert.match(mixedTargets.stderr, /::error title=kanmer\/gate \[BATCH_ROSTER\]::/);
    const mixedTargetFindings = JSON.parse(mixedTargets.stdout).findings;
    assert.equal(mixedTargetFindings.length, 1);
    assert.deepEqual(
      {
        code: mixedTargetFindings[0].code,
        level: mixedTargetFindings[0].level,
        outcome: mixedTargetFindings[0].outcome,
        batchId: mixedTargetFindings[0].details.batchId,
        targets: mixedTargetFindings[0].details.targets,
      },
      {
        code: "BATCH_ROSTER",
        level: "error",
        outcome: "fail",
        batchId: "batch-pr",
        targets: tickets.map((ticket, index) => ({
          ticketId: ticket.id,
          prTarget: index === 1 ? "main" : "dev",
        })).sort((a, b) => a.ticketId.localeCompare(b.ticketId)),
      },
    );
    await store.updateItem(tickets[1].id, { delivery_branch: "" });
    await store.updateBoard(({ delivery: _delivery, ...boardConfig }) => boardConfig);

    await fs.writeFile(
      event,
      JSON.stringify(pullRequestEvent(
        1,
        `Kanmer: ${tickets[0].id}`,
        head,
        "batch-pr",
        "b".repeat(40),
        { repository: "collisionengineers/kanmer", headRepository: "collisionengineers/kanmer" },
      )),
    );
    const incomplete = runWithEnv({ KANMER_GATE_STRICT: "1" }, board, event);
    assert.equal(incomplete.status, 1);
    assert.deepEqual(JSON.parse(incomplete.stdout).findings.map((finding) => finding.code), ["BATCH_ROSTER"]);

    await fs.writeFile(event, JSON.stringify(repositoryEvent));

    await store.setDoc(
      tickets[1].id,
      "scratch/review",
      attestation(head).replace('pr: "1"', 'pr: "https://github.com/foreign/repository/pull/1"'),
    );
    const fail = runWithEnv({ KANMER_GATE_STRICT: "1" }, board, event);
    assert.equal(fail.status, 1);
    const adverse = JSON.parse(fail.stdout);
    assert.deepEqual(adverse.findings.map((finding) => [finding.code, finding.details.ticketId]), [
      ["STALE_REVIEW", tickets[1].id],
    ]);
    const failLenient = run(board, event);
    assert.equal(failLenient.status, 1);
    assert.match(failLenient.stderr, /::error title=kanmer\/gate \[STALE_REVIEW\]::/);
    assert.deepEqual(JSON.parse(failLenient.stdout).findings.map((finding) => [finding.code, finding.details.ticketId]), [
      ["STALE_REVIEW", tickets[1].id],
    ]);
  } finally {
    await removeTreeWithRetry(board);
  }
});

test("SYNC_REQUIRED compares the attested board_sha with the fetched board tip", async () => {
  const { board, store, ticket, event } = await fixture();
  try {
    gitIn(board, "init", "--initial-branch=kanmer-board");
    gitIn(board, "config", "user.email", "gate@example.com");
    gitIn(board, "config", "user.name", "Gate");
    gitIn(board, "add", "--", ".kanmer");
    gitIn(board, "commit", "-q", "-m", "board v1");
    const first = gitIn(board, "rev-parse", "HEAD");
    const head = "a".repeat(40);
    await fs.writeFile(event, JSON.stringify(pullRequestEvent(8, `Kanmer: ${ticket.id}`, head, "sync")));

    // Attest to the current tip: current, and the verdict records that tip.
    await store.setDoc(ticket.id, "scratch/review", attestation(head, "pass", `board_sha: ${first}\n`));
    const current = runWithEnv({ KANMER_GATE_STRICT: "1" }, board, event);
    assert.equal(current.status, 0, current.stderr);
    const currentResult = JSON.parse(current.stdout);
    assert.equal(currentResult.checks.find((check) => check.code === "SYNC_REQUIRED").outcome, "pass");
    assert.equal(currentResult.checks.find((check) => check.code === "SYNC_REQUIRED").details.state, "current");

    // The board moved on after the review but the attested SHA is still an
    // ancestor: the reviewer read a pushed board, so that is still current.
    gitIn(board, "add", "--", ".kanmer");
    gitIn(board, "commit", "-q", "--allow-empty", "-m", "board v2");
    const second = gitIn(board, "rev-parse", "HEAD");
    const ancestor = runWithEnv({ KANMER_GATE_STRICT: "1" }, board, event);
    assert.equal(ancestor.status, 0, ancestor.stderr);
    assert.equal(JSON.parse(ancestor.stdout).boardSha, second);
    assert.equal(JSON.parse(ancestor.stdout).checks.find((check) => check.code === "SYNC_REQUIRED").details.state, "current");

    // An attested SHA the fetched board has never seen (a local board that was
    // never pushed) is SYNC_REQUIRED: a warning by default, blocking under strict.
    await store.setDoc(ticket.id, "scratch/review", attestation(head, "pass", `board_sha: ${"b".repeat(40)}\n`));
    const unknownLenient = run(board, event);
    assert.equal(unknownLenient.status, 0);
    assert.match(unknownLenient.stderr, /::warning title=kanmer\/gate \[SYNC_REQUIRED\]::.*push the board branch/);
    const unknownStrict = runWithEnv({ KANMER_GATE_STRICT: "1" }, board, event);
    assert.equal(unknownStrict.status, 1);
    assert.match(unknownStrict.stderr, /::error title=kanmer\/gate \[SYNC_REQUIRED\]::/);
    const unknownResult = JSON.parse(unknownStrict.stdout);
    assert.deepEqual(unknownResult.findings.map((finding) => finding.code), ["SYNC_REQUIRED"]);
    assert.equal(unknownResult.checks.find((check) => check.code === "SYNC_REQUIRED").details.state, "unknown");
    assert.equal(unknownResult.boardSha, second);

    // A real divergence: the attested commit exists but is not an ancestor.
    // Built with commit-tree so the checkout (and its uncommitted board
    // writes) never moves: a sibling of v2 hanging off v1.
    const divergedSha = gitIn(board, "commit-tree", `${first}^{tree}`, "-p", first, "-m", "diverged board");
    gitIn(board, "update-ref", "refs/heads/diverged", divergedSha);
    await store.setDoc(ticket.id, "scratch/review", attestation(head, "pass", `board_sha: ${divergedSha}\n`));
    const stale = runWithEnv({ KANMER_GATE_STRICT: "1" }, board, event);
    assert.equal(stale.status, 1);
    const staleResult = JSON.parse(stale.stdout);
    assert.equal(staleResult.checks.find((check) => check.code === "SYNC_REQUIRED").details.state, "stale");
    assert.equal(staleResult.checks.find((check) => check.code === "SYNC_REQUIRED").details.attestedBoardSha, divergedSha);

    // Optional fields travel with the review evidence without changing the verdict.
    await store.setDoc(ticket.id, "scratch/review", attestation(head, "pass", `board_sha: ${second}\nexpected_reviewers:\n  - copilot\nthreads_snapshot: []\n`));
    const carried = runWithEnv({ KANMER_GATE_STRICT: "1" }, board, event);
    assert.equal(carried.status, 0, carried.stderr);
    assert.equal(parseReviewEvidence(attestation(head, "pass", `board_sha: ${second}\nexpected_reviewers:\n  - copilot\n`)).details.expectedReviewers[0], "copilot");
    await store.setDoc(ticket.id, "scratch/review", attestation(head, "pass", "board_sha: short\n"));
    const malformed = run(board, event);
    assert.equal(malformed.status, 0);
    assert.match(malformed.stderr, /\[STALE_REVIEW\]::review attestation is invalid%3A board_sha/);
  } finally {
    await removeTreeWithRetry(board);
  }
});

test("check-pr fails closed when board item input is malformed", async () => {
  const { board, store, ticket, event } = await fixture();
  try {
    const malformedDir = path.join(board, ".kanmer", "areas", "_none", "BROKEN-001");
    await fs.mkdir(malformedDir, { recursive: true });
    await fs.writeFile(path.join(malformedDir, "BROKEN-001.md"), "not valid ticket frontmatter", "utf8");
    await fs.writeFile(event, JSON.stringify(pullRequestEvent(5, `Kanmer: ${ticket.id}`, "a".repeat(40), "malformed-board")));
    const result = run(board, event);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).infrastructureError, true);
  } finally {
    await removeTreeWithRetry(board);
  }
});

test("git reachability uses argv-safe bounded ancestry checks and preserves states", async () => {
  const calls = [];
  const a = "a".repeat(40);
  const b = "b".repeat(40);
  const c = "c".repeat(40);
  const base = "d".repeat(40);
  const evidence = await collectCommitReachability({
    commits: [b, a, b, "not-a-sha", c, base],
    headSha: a,
    baseSha: base,
    cwd: "C:\\hostile root\\$() `tick`; &",
    run: async (file, args, options) => {
      calls.push({ file, args, options });
      if (args[0] === "rev-parse") return { stdout: ".git" };
      if (args[2] === b) throw Object.assign(new Error("not ancestor"), { code: 1 });
      if (args[2] === c) throw Object.assign(new Error("missing object"), { code: 128, stderr: "missing object" });
      if (args[2] === a && args[3] === base) throw Object.assign(new Error("not ancestor of base"), { code: 1 });
      if (args[2] === base && args[3] === base) return {};
      return {};
    },
  });
  assert.deepEqual(evidence, [
    { sha: "a".repeat(40), state: "reachable" },
    { sha: "b".repeat(40), state: "unreachable" },
    { sha: "c".repeat(40), state: "indeterminate", diagnostic: "missing object" },
    { sha: "d".repeat(40), state: "unreachable", diagnostic: "commit is reachable from the PR base and is outside the base..head range" },
    { sha: "not-a-sha", state: "indeterminate", diagnostic: "ticket commit is not a valid hexadecimal Git object id or abbreviation" },
  ]);
  assert.equal(calls.every((call) => call.file === "git" && call.args[0] === "merge-base" && Array.isArray(call.args)), true);
  assert.equal(calls.every((call) => call.options.cwd.includes("$()")), true);
  await assertGitRepository({ cwd: "C:\\hostile root", run: async (file, args) => {
    assert.equal(file, "git");
    assert.deepEqual(args, ["rev-parse", "--git-dir"]);
    return { stdout: ".git" };
  } });
});

test("accepts abbreviated commit ids and excludes the PR base from the range", async () => {
  const short = "a1b2c3d";
  const base = "b".repeat(40);
  const head = "c".repeat(40);
  const calls = [];
  const evidence = await collectCommitReachability({
    commits: [short, base, head],
    headSha: head,
    baseSha: base,
    cwd: "C:\\repo",
    run: async (file, args, options) => {
      calls.push({ file, args, options });
      if (args[2] === short && args[3] === base) throw Object.assign(new Error("not ancestor of base"), { code: 1 });
      if (args[2] === head && args[3] === base) throw Object.assign(new Error("not ancestor of base"), { code: 1 });
      return {};
    },
  });
  assert.deepEqual(evidence, [
    { sha: short, state: "reachable" },
    { sha: base, state: "unreachable", diagnostic: "commit is reachable from the PR base and is outside the base..head range" },
    { sha: head, state: "reachable" },
  ]);
  assert.equal(calls.filter((call) => call.args[2] === short).length, 2);
});
