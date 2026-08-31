import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DISPATCH_TASKS, KanmerStore, deliveryTargets, removeTreeWithRetry, resolveDelivery } from "../../core/dist/index.js";
import { collectReconciliationEvidence } from "../dist/reconciliation.js";
import {
  RELEASE_ACTIONS,
  releaseChannelAction,
  releaseStatus,
  resolveIntegrationSha,
  validateReleaseChannelRequest,
} from "../dist/release.js";
import { failCoded } from "../dist/errors.js";

// CORE-132: the host half of release serialization. The collect/verb seam
// (everything git-shaped outside the lock, exactly as CORE-131 placed it), the
// `reconcile_ticket` release wiring that replaces the old `not-applicable`
// stub, and the carried-in F-001 regression from CORE-116's review.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

const DEV_TO_MAIN = {
  integrationBranch: "dev",
  releaseBranch: "main",
  releaseCandidatePattern: "release/*",
  hotfixBackport: true,
};

async function fixture(delivery) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-release-mcp-"));
  const store = new KanmerStore(root, { actor: "test-actor" });
  await store.init();
  if (delivery) await store.updateBoard((board) => ({ ...board, delivery }));
  return { root, store };
}

/** An injected `run` that answers one `git rev-parse` without spawning anything. */
function fakeGit(stdout, beforeReturn = async () => {}) {
  const calls = [];
  return {
    calls,
    run: async (command, args, options) => {
      calls.push({ command, args: [...args], options });
      if (stdout === null) throw new Error("fatal: Needed a single revision");
      await beforeReturn();
      return { stdout };
    },
  };
}

test("the action set is exactly the six release verbs", () => {
  assert.deepEqual([...RELEASE_ACTIONS], ["acquire", "renew", "record", "supersede", "complete", "fail"]);
});

test("action-specific release fields are refused instead of silently ignored", async () => {
  const values = {
    integrationSha: SHA_A,
    integrationRef: "refs/heads/main",
    leaseId: "lease-1",
    leaseRevision: 1,
    reason: "operator: bounded takeover",
    releaseTag: "v1.0.0",
    verificationState: "passed",
    includedPrs: ["303"],
    includedTickets: ["CORE-132"],
    artifactManifest: ["kanmer.exe"],
    serviceUnavailable: "registry unavailable",
    serviceRecovered: true,
  };
  const allowed = {
    acquire: ["integrationSha", "integrationRef", "includedPrs", "includedTickets"],
    renew: ["leaseId", "leaseRevision"],
    record: ["leaseId", "leaseRevision", "releaseTag", "verificationState", "includedPrs", "includedTickets", "artifactManifest", "serviceUnavailable", "serviceRecovered"],
    supersede: ["integrationSha", "integrationRef", "leaseId", "leaseRevision", "reason", "includedPrs", "includedTickets"],
    complete: ["leaseId", "leaseRevision", "releaseTag", "artifactManifest"],
    fail: ["leaseId", "leaseRevision", "reason"],
  };
  for (const action of RELEASE_ACTIONS) {
    for (const [field, value] of Object.entries(values)) {
      if (allowed[action].includes(field)) continue;
      assert.throws(
        () => validateReleaseChannelRequest({ action, [field]: value }),
        new RegExp(`RELEASE_INPUT_INVALID: action "${action}" does not accept`),
        `${action} must reject ${field}`,
      );
    }
  }

  assert.throws(
    () => validateReleaseChannelRequest({ action: "acquire", integrationSha: SHA_A, integrationRef: "refs/heads/main" }),
    /pass integration_sha or integration_ref, not both/,
  );
  assert.throws(
    () => validateReleaseChannelRequest({
      action: "record",
      leaseId: "lease-1",
      leaseRevision: 1,
      serviceUnavailable: "registry unavailable",
      serviceRecovered: true,
    }),
    /cannot report service_unavailable and service_recovered together/,
  );
  assert.throws(
    () => validateReleaseChannelRequest({ action: "record", leaseId: "lease-1", leaseRevision: 1 }),
    /record needs at least one progress field/,
  );

  const { root, store } = await fixture();
  const git = fakeGit(`${SHA_A}\n`);
  await assert.rejects(
    () => releaseChannelAction(store, { action: "renew", serviceUnavailable: "registry unavailable" }, git.run),
    /RELEASE_INPUT_INVALID:/,
  );
  assert.equal(git.calls.length, 0, "invalid action fields are refused before Git");
  assert.deepEqual((await store.releaseSnapshot()).attempts, [], "invalid action fields write no release record");
  await removeTreeWithRetry(root);
});

test("resolveIntegrationSha uses an explicit SHA without spawning git at all", async () => {
  const { root, store } = await fixture();
  const git = fakeGit(`${SHA_B}\n`);
  assert.equal(await resolveIntegrationSha(store, { integrationSha: SHA_A }, git.run), SHA_A);
  assert.equal(git.calls.length, 0);
  await removeTreeWithRetry(root);
});

test("resolveIntegrationSha resolves the integration branch with ONE bounded git call", async () => {
  const { root, store } = await fixture(DEV_TO_MAIN);
  const git = fakeGit(`${SHA_B}\n`);
  assert.equal(await resolveIntegrationSha(store, {}, git.run), SHA_B);
  assert.equal(git.calls.length, 1);
  const [call] = git.calls;
  assert.equal(call.command, "git");
  // The project's integration branch, not a hardcoded `main`.
  assert.deepEqual(call.args, ["rev-parse", "--verify", "refs/heads/dev^{commit}"]);
  assert.equal(call.options.cwd, store.paths.repoRoot);
  assert.equal(call.options.windowsHide, true);
  assert.ok(call.options.timeout > 0, "the subprocess is bounded by a timeout");
  assert.ok(call.options.maxBuffer > 0, "the subprocess is bounded by maxBuffer");
  await removeTreeWithRetry(root);
});

test("resolveIntegrationSha preserves an explicit fully-qualified ref", async () => {
  const { root, store } = await fixture(DEV_TO_MAIN);
  const git = fakeGit(`${SHA_B}\n`);
  assert.equal(await resolveIntegrationSha(store, { integrationRef: "refs/tags/dev" }, git.run), SHA_B);
  assert.deepEqual(git.calls[0].args, ["rev-parse", "--verify", "refs/tags/dev^{commit}"]);
  await removeTreeWithRetry(root);
});

test("resolveIntegrationSha REFUSES rather than manufacturing a candidate SHA", async () => {
  const { root, store } = await fixture();
  await assert.rejects(
    () => resolveIntegrationSha(store, { integrationRef: "no-such-ref" }, fakeGit(null).run),
    /RELEASE_SHA_UNAVAILABLE:[\s\S]*never minted from a guessed SHA/,
  );
  // A non-SHA answer is refused too, so a stubbed git cannot smuggle one in.
  await assert.rejects(
    () => resolveIntegrationSha(store, {}, fakeGit("not-a-sha\n").run),
    /RELEASE_SHA_UNAVAILABLE:/,
  );
  assert.deepEqual((await store.releaseSnapshot()).attempts, []);
  await removeTreeWithRetry(root);
});

test("releaseChannelAction refuses delivery-policy drift between SHA resolution and mint", async () => {
  const { root, store } = await fixture(DEV_TO_MAIN);
  const changed = {
    integrationBranch: "next",
    releaseBranch: "stable",
    releaseCandidatePattern: "candidate/*",
    hotfixBackport: false,
  };
  const git = fakeGit(`${SHA_A}\n`, async () => {
    await store.updateBoard((board) => ({ ...board, delivery: changed }));
  });
  await assert.rejects(
    () => releaseChannelAction(store, { action: "acquire" }, git.run),
    /RELEASE_POLICY_DRIFT:[\s\S]*resolve the SHA again/,
  );
  assert.deepEqual((await store.releaseSnapshot()).attempts, []);
  await removeTreeWithRetry(root);
});

test("releaseChannelAction drives a whole release cycle through the locked store verbs", async () => {
  const { root, store } = await fixture(DEV_TO_MAIN);
  const git = fakeGit(`${SHA_A}\n`);

  const taken = await releaseChannelAction(store, { action: "acquire", includedTickets: ["CORE-1"] }, git.run);
  assert.equal(taken.attempt.attempt_id, "main@1");
  assert.equal(taken.attempt.integration_sha, SHA_A);
  assert.equal(taken.attempt.candidate_ref, "release/main-1");

  const recorded = await releaseChannelAction(store, {
    action: "record",
    leaseId: taken.lease.lease_id,
    leaseRevision: taken.lease.lease_revision,
    verificationState: "passed",
    artifactManifest: ["kanmer.exe"],
  });
  assert.equal(recorded.attempt.verification_state, "passed");

  const superseded = await releaseChannelAction(store, {
    action: "supersede",
    leaseId: recorded.lease.lease_id,
    leaseRevision: recorded.lease.lease_revision,
    integrationSha: SHA_B,
    includedTickets: ["CORE-1"],
  });
  assert.equal(superseded.attempt.attempt_id, "main@2");
  assert.notEqual(superseded.attempt.candidate_id, taken.attempt.candidate_id);
  assert.deepEqual(superseded.attempt.artifact_manifest, [], "a successor inherits no evidence");

  const done = await releaseChannelAction(store, {
    action: "complete",
    leaseId: superseded.lease.lease_id,
    leaseRevision: superseded.lease.lease_revision,
    releaseTag: "v1.2.3",
  });
  assert.equal(done.lease, null);
  assert.equal(done.leaseState, "cleared");

  const status = await releaseStatus(store);
  assert.deepEqual(status.channels, [], "the release-channel lease is clear");
  assert.equal(status.attemptCount, 2, "both immutable attempts are retained");
  assert.deepEqual(status.attempts.map((attempt) => attempt.attemptId), ["main@1", "main@2"]);
  assert.deepEqual(status.pendingTransactions, []);
  assert.equal(status.unreadable, false);

  await removeTreeWithRetry(root);
});

test("releaseStatus exposes retained current and terminal evidence after reconnect", async () => {
  const { root, store } = await fixture();
  const taken = await releaseChannelAction(store, {
    action: "acquire",
    integrationSha: SHA_A,
    includedPrs: ["303"],
    includedTickets: ["CORE-132"],
  });
  const recorded = await releaseChannelAction(store, {
    action: "record",
    leaseId: taken.lease.lease_id,
    leaseRevision: taken.lease.lease_revision,
    verificationState: "failed",
    releaseTag: "v0.3.13-rc.1",
    artifactManifest: ["Kanmer Setup 0.3.13.exe"],
    serviceUnavailable: "publisher unavailable",
  });
  const failed = await releaseChannelAction(store, {
    action: "fail",
    leaseId: recorded.lease.lease_id,
    leaseRevision: recorded.lease.lease_revision,
    reason: "candidate promotion failed",
  });

  const reopened = new KanmerStore(root, { actor: "reconnected-owner" });
  const status = await releaseStatus(reopened);
  assert.equal(status.attemptCount, 1);
  assert.equal(status.channels[0].outcome, "failed");
  assert.deepEqual(status.attempts[0], {
    attemptId: "main@1",
    channel: "main",
    ordinal: 1,
    candidateId: taken.attempt.candidate_id,
    candidateRef: null,
    integrationSha: SHA_A,
    releaseBranch: "main",
    deliveryPolicyVersion: taken.attempt.delivery_policy_version,
    owner: "test-actor",
    createdAt: taken.attempt.created_at,
    outcome: "failed",
    terminalAt: status.attempts[0].terminalAt,
    failureReason: "candidate promotion failed",
    verificationState: "failed",
    retry: recorded.attempt.retry,
    includedPrs: ["303"],
    includedTickets: ["CORE-132"],
    releaseTag: "v0.3.13-rc.1",
    artifactManifest: ["Kanmer Setup 0.3.13.exe"],
    predecessor: null,
    successor: null,
  });
  assert.match(status.attempts[0].terminalAt, /^\d{4}-\d{2}-\d{2}T/);

  await releaseChannelAction(store, {
    action: "supersede",
    leaseId: failed.lease.lease_id,
    leaseRevision: failed.lease.lease_revision,
    integrationSha: SHA_B,
  });
  const afterSuccessor = await releaseStatus(reopened);
  assert.equal(afterSuccessor.attempts[0].outcome, "failed");
  assert.equal(afterSuccessor.attempts[0].successor, "main@2", "reverse link is derived without rewriting failed history");
  assert.equal(afterSuccessor.attempts[1].predecessor, "main@1");
  await removeTreeWithRetry(root);
});

test("every action but acquire needs the channel's current lease id and revision", async () => {
  const { root, store } = await fixture();
  const git = fakeGit(`${SHA_A}\n`);
  await releaseChannelAction(store, { action: "acquire" }, git.run);
  const requests = [
    { action: "renew" },
    { action: "record", verificationState: "passed" },
    { action: "supersede", integrationSha: SHA_B },
    { action: "complete" },
    { action: "fail", reason: "why" },
  ];
  for (const request of requests) {
    await assert.rejects(
      () => releaseChannelAction(store, request, git.run),
      /LEASE_ID_REQUIRED:/,
      `${request.action} without a lease`,
    );
  }
  await removeTreeWithRetry(root);
});

test("supersede validates its lease CAS before resolving Git", async () => {
  const { root, store } = await fixture();
  const git = fakeGit(null);
  await assert.rejects(
    () => releaseChannelAction(store, { action: "supersede" }, git.run),
    /LEASE_ID_REQUIRED:/,
  );
  assert.equal(git.calls.length, 0, "a malformed supersede request spawns no Git subprocess");
  await removeTreeWithRetry(root);
});

test("a failed attempt must say why, because it keeps its proof forever", async () => {
  const { root, store } = await fixture();
  const taken = await releaseChannelAction(store, { action: "acquire", integrationSha: SHA_A });
  await assert.rejects(
    () => releaseChannelAction(store, {
      action: "fail",
      leaseId: taken.lease.lease_id,
      leaseRevision: taken.lease.lease_revision,
      reason: "   ",
    }),
    /RELEASE_REASON_REQUIRED:/,
  );
  await removeTreeWithRetry(root);
});

test("RELEASE_CHANNEL_HELD is classified as its own structured error code", async () => {
  const { root, store } = await fixture();
  await releaseChannelAction(store, { action: "acquire", integrationSha: SHA_A });
  await assert.rejects(
    async () => {
      try {
        await releaseChannelAction(store, { action: "acquire", integrationSha: SHA_B });
      } catch (error) {
        const result = failCoded(error);
        assert.equal(result.structuredContent.error.code, "RELEASE_CHANNEL_HELD");
        assert.match(result.structuredContent.error.message, /one release owns a channel at a time/i);
        throw error;
      }
    },
    /RELEASE_CHANNEL_HELD:/,
  );
  await removeTreeWithRetry(root);
});

test("an immutability refusal classifies as a lease conflict, not as a silent success", async () => {
  const { root, store } = await fixture();
  const taken = await releaseChannelAction(store, { action: "acquire", integrationSha: SHA_A });
  const failed = await releaseChannelAction(store, {
    action: "fail",
    leaseId: taken.lease.lease_id,
    leaseRevision: taken.lease.lease_revision,
    reason: "signing failed",
  });
  try {
    await releaseChannelAction(store, {
      action: "record",
      leaseId: failed.lease.lease_id,
      leaseRevision: failed.lease.lease_revision,
      verificationState: "passed",
    });
    assert.fail("a terminal attempt accepted a write");
  } catch (error) {
    assert.equal(failCoded(error).structuredContent.error.code, "LEASE_CONFLICT");
  }
  await removeTreeWithRetry(root);
});

// ---------------------------------------------------------------------------
// reconcile_ticket's release evidence — the stub this ticket replaces
// ---------------------------------------------------------------------------

async function ticketFixture(delivery) {
  const { root, store } = await fixture(delivery);
  const ticket = await store.createItem({ type: "ticket", title: "release fixture", status: "review" });
  return { root, store, ticket };
}

const noRun = async () => {
  throw new Error("no subprocess in this test");
};

async function releaseEvidence(store, id) {
  const evidence = await collectReconciliationEvidence(store, id, noRun, { resolveCommonDir: async () => ({ ok: false }) });
  return evidence.release.state;
}

test("release evidence is not-applicable on a board that has never released", async () => {
  const { root, store, ticket } = await ticketFixture();
  assert.equal(await releaseEvidence(store, ticket.id), "not-applicable");
  await removeTreeWithRetry(root);
});

test("release evidence is not-applicable for a ticket a live attempt cleanly owns", async () => {
  const { root, store, ticket } = await ticketFixture();
  await releaseChannelAction(store, { action: "acquire", integrationSha: SHA_A, includedTickets: [ticket.id] });
  assert.equal(await releaseEvidence(store, ticket.id), "not-applicable");
  await removeTreeWithRetry(root);
});

test("release evidence is unavailable while a bounded retry schedule is live, and only for that attempt's tickets", async () => {
  const { root, store, ticket } = await ticketFixture();
  const other = await store.createItem({ type: "ticket", title: "unrelated", status: "review" });
  const taken = await releaseChannelAction(store, { action: "acquire", integrationSha: SHA_A, includedTickets: [ticket.id] });
  await releaseChannelAction(store, {
    action: "record",
    leaseId: taken.lease.lease_id,
    leaseRevision: taken.lease.lease_revision,
    serviceUnavailable: "artifact registry unreachable",
  });
  assert.equal(await releaseEvidence(store, ticket.id), "unavailable");
  assert.equal(await releaseEvidence(store, other.id), "not-applicable", "other work continues independently");
  await removeTreeWithRetry(root);
});

test("a ticket removed from a successor's fresh scope is not frozen behind the predecessor", async () => {
  const { root, store, ticket } = await ticketFixture();
  const taken = await releaseChannelAction(store, { action: "acquire", integrationSha: SHA_A, includedTickets: [ticket.id] });
  const successor = await releaseChannelAction(store, {
    action: "supersede",
    leaseId: taken.lease.lease_id,
    leaseRevision: taken.lease.lease_revision,
    integrationSha: SHA_B,
    includedTickets: [],
  });
  assert.equal(await releaseEvidence(store, ticket.id), "not-applicable", "the active successor deliberately dropped the ticket");
  await releaseChannelAction(store, {
    action: "complete",
    leaseId: successor.lease.lease_id,
    leaseRevision: successor.lease.lease_revision,
  });
  assert.equal(await releaseEvidence(store, ticket.id), "not-applicable", "completed successor keeps workflow reconciliation live");
  await removeTreeWithRetry(root);
});

test("release evidence is contended when a live attempt no longer holds its channel", async () => {
  const { root, store, ticket } = await ticketFixture();
  await releaseChannelAction(store, { action: "acquire", integrationSha: SHA_A, includedTickets: [ticket.id] });
  // Remove the lease without terminating the attempt: an abandoned owner.
  await fs.unlink(path.join(root, ".kanmer", "releases", "channels", "main.json"));
  assert.equal(await releaseEvidence(store, ticket.id), "contended");
  await removeTreeWithRetry(root);
});

test("an unreadable release record is unavailable, never a manufactured not-applicable", async () => {
  const { root, store, ticket } = await ticketFixture();
  await releaseChannelAction(store, { action: "acquire", integrationSha: SHA_A, includedTickets: [ticket.id] });
  await fs.writeFile(path.join(root, ".kanmer", "releases", "attempts", "main@1.json"), "{ truncated", "utf8");
  assert.equal(await releaseEvidence(store, ticket.id), "unavailable");
  await removeTreeWithRetry(root);
});

// ---------------------------------------------------------------------------
// F-001, carried in from CORE-116's review
// ---------------------------------------------------------------------------

test("a hotfix ticket's verify prompt names the hotfix verification target, not the integration branch", async () => {
  const { root, store } = await fixture(DEV_TO_MAIN);
  const verify = DISPATCH_TASKS.find((task) => task.id === "verify");
  const policy = resolveDelivery(await store.getBoard());

  const hotfix = await store.createItem({ type: "ticket", title: "hotfix", status: "review" });
  await store.updateItem(hotfix.id, { delivery_state: "integrated", delivery_branch: "main", delivery_sha: SHA_A });
  const recordedHotfix = await store.getItem(hotfix.id);

  const ordinary = await store.createItem({ type: "ticket", title: "ordinary", status: "review" });
  await store.updateItem(ordinary.id, { delivery_state: "integrated", delivery_branch: "dev", delivery_sha: SHA_B });
  const recordedOrdinary = await store.getItem(ordinary.id);

  // The expression the dispatch_task handler now uses.
  const hotfixTarget = deliveryTargets(policy, recordedHotfix).verificationTarget;
  const ordinaryTarget = deliveryTargets(policy, recordedOrdinary).verificationTarget;
  assert.equal(hotfixTarget, "main");
  assert.equal(ordinaryTarget, "dev");
  assert.match(verify.prompt(hotfix.id, hotfixTarget), /on merged main\b/);
  assert.match(verify.prompt(ordinary.id, ordinaryTarget), /on merged dev\b/);

  // The defect: the old expression pointed the hotfix's verifier at `dev`.
  assert.equal(policy.integrationBranch, "dev");
  assert.notEqual(policy.integrationBranch, hotfixTarget);

  await removeTreeWithRetry(root);
});

test("dispatch_task no longer resolves its verification target from the integration branch", async () => {
  const source = await fs.readFile(path.join(repoRoot, "packages", "mcp-server", "src", "index.ts"), "utf8");
  assert.ok(
    !source.includes("resolveDelivery(await store.getBoard()).integrationBranch"),
    "the F-001 expression is gone",
  );
  assert.ok(
    source.includes("deliveryTargets(resolveDelivery(await store.getBoard()), candidate.item).verificationTarget"),
    "the verification target routes through deliveryTargets, the single definition of a hotfix",
  );
  const approval = source.indexOf("server.server.elicitInput", source.indexOf('"dispatch_task"'));
  const freshRead = source.indexOf("candidate = await inspectCandidate()", approval);
  const target = source.indexOf("deliveryTargets(resolveDelivery(await store.getBoard()), candidate.item)", freshRead);
  assert.ok(approval >= 0 && freshRead > approval && target > freshRead, "ticket feasibility and delivery state are re-read after approval and before dispatch");
  // And there is still exactly one definition of "hotfix" in the product.
  const board = await fs.readFile(path.join(repoRoot, "packages", "core", "src", "board.ts"), "utf8");
  assert.equal((board.match(/const hotfix =/g) ?? []).length, 1);
});
