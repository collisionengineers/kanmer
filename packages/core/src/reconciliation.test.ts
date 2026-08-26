import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { reconcileEvidence } from "./reconciliation.js";
import { KanmerStore } from "./store.js";
import type { ReconciliationEvidence } from "./types.js";

function evidence(overrides: Partial<ReconciliationEvidence> = {}): ReconciliationEvidence {
  return {
    ticket: { id: "TICK-001", status: "review", updated: "2026-08-26T00:00:00.000Z", taken: false, ...overrides.ticket },
    claim: { state: "unclaimed", controller: null, worker: null, takenAt: null, branch: null, worktree: null, ...overrides.claim },
    commits: [...(overrides.commits ?? [])],
    pullRequest: { state: "open", requiredChecks: "pass", ...overrides.pullRequest },
    proof: { state: "absent", ...overrides.proof },
    workspace: { state: "not-recorded", recordedWorktree: null, ...overrides.workspace },
    release: { state: "none", ...overrides.release },
  };
}

describe("reconcileEvidence", () => {
  it.each([
    ["moves merged review to verifying", evidence({ pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" } }), "MOVE_TO_VERIFYING"],
    ["returns closed unmerged review to implementing", evidence({ pullRequest: { state: "closed-unmerged", requiredChecks: "pass" } }), "MOVE_TO_IMPLEMENTING"],
    ["returns review without PR or worker to implementing", evidence({ pullRequest: { state: "absent", requiredChecks: "not-applicable" } }), "MOVE_TO_IMPLEMENTING"],
    ["moves merged PASS verification to done", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "merged", mergeSha: "b".repeat(40), requiredChecks: "pass" }, proof: { state: "pass", mergedSha: "b".repeat(40) } }), "MOVE_TO_DONE"],
    ["releases only a clean terminal claim", evidence({ ticket: { id: "TICK-001", status: "done", updated: "2026-08-26T00:00:00.000Z", taken: true }, workspace: { state: "clean" } }), "RELEASE_CLEAN_TERMINAL_CLAIM"],
  ])("%s", (_name, input, action) => {
    const before = JSON.stringify(input);
    const result = reconcileEvidence(input);
    expect(result.proposal?.action).toBe(action);
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([
    ["protects dirty work", evidence({ workspace: { state: "dirty" } }), "DIRTY_WORKSPACE_PRESERVED"],
    ["reports a missing taken workspace", evidence({ ticket: { id: "TICK-001", status: "implementing", updated: "2026-08-26T00:00:00.000Z", taken: true }, workspace: { state: "missing" } }), "WORKSPACE_MISSING"],
    ["protects the board worktree", evidence({ workspace: { state: "clean", boardWorktree: true } }), "BOARD_WORKTREE_PROTECTED"],
    ["preserves contended release evidence", evidence({ release: { state: "contended" } }), "RELEASE_EVIDENCE_PRESERVED"],
    ["does not invent unavailable GitHub evidence", evidence({ pullRequest: { state: "unavailable", requiredChecks: "unavailable" } }), "EVIDENCE_INCONCLUSIVE"],
    ["does not advance failing checks", evidence({ pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "fail" } }), "REQUIRED_CHECKS_NOT_GREEN"],
    ["refuses verifying without a merge SHA", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "merged", requiredChecks: "pass" } }), "VERIFYING_WITHOUT_MERGE_SHA"],
    ["retains failed verification for disposition", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" }, proof: { state: "fail" } }), "FAILED_VERIFICATION_REQUIRES_DISPOSITION"],
    ["rejects a stale PASS proof for a different merge", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" }, proof: { state: "pass", mergedSha: "b".repeat(40) } }), "PROOF_MERGE_SHA_MISMATCH"],
    ["preserves an incomplete legacy claim", evidence({ ticket: { id: "TICK-001", status: "implementing", updated: "2026-08-26T00:00:00.000Z", taken: true }, claim: { state: "legacy", controller: null, worker: "worker", takenAt: "2026-08-26T00:00:00.000Z", branch: "core-113", worktree: null }, workspace: { state: "not-recorded", recordedWorktree: null } }), "CLAIM_WITHOUT_RECORDED_WORKSPACE"],
  ])("%s", (_name, input, code) => {
    const result = reconcileEvidence(input);
    expect(result.proposal).toBeNull();
    expect(result.findings[0]?.code).toBe(code);
  });
});

describe("KanmerStore.applyReconciliation", () => {
  let root: string;
  let store: KanmerStore;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-reconciliation-"));
    store = new KanmerStore(root);
    await store.init();
  });

  afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

  it("uses existing stage gates and records a reconciliation audit after a current apply", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "Review", profile: "custom", requires: {}, status: "review" });
    const result = reconcileEvidence(evidence({ ticket: { id: ticket.id, status: ticket.status, updated: ticket.updated, taken: false }, pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" } }));
    const applied = await store.applyReconciliation(ticket.id, { expectedUpdated: ticket.updated, proposal: result.proposal! });
    expect(applied.status).toBe("verifying");
    expect((await store.getActivity({ id: ticket.id })).some((entry) => entry.field === "reconciliation" && entry.to === "MOVE_TO_VERIFYING")).toBe(true);
  });

  it("rejects a stale proposal before any board mutation", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "Stale", profile: "custom", requires: {}, status: "review" });
    const result = reconcileEvidence(evidence({ ticket: { id: ticket.id, status: ticket.status, updated: ticket.updated, taken: false }, pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" } }));
    await store.updateItem(ticket.id, { title: "Changed" });
    await expect(store.applyReconciliation(ticket.id, { expectedUpdated: ticket.updated, proposal: result.proposal! })).rejects.toThrow(/Conflict/);
    expect((await store.getItem(ticket.id))?.status).toBe("review");
  });

  it("releases only a current clean terminal claim", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "Terminal", profile: "custom", requires: {}, status: "done" });
    const taken = await store.takeTicket(ticket.id, { branch: "terminal", worktree: "wt/terminal", stage: "done", assignee: "worker" });
    const result = reconcileEvidence(evidence({
      ticket: { id: taken.id, status: taken.status, updated: taken.updated, taken: true },
      claim: { state: "legacy", controller: null, worker: "worker", takenAt: taken.taken_at!, branch: "terminal", worktree: "wt/terminal" },
      workspace: { state: "clean", recordedWorktree: "wt/terminal" },
    }));
    const applied = await store.applyReconciliation(ticket.id, { expectedUpdated: taken.updated, proposal: result.proposal! });
    expect(applied.taken_at).toBeUndefined();
    expect(applied.branch).toBeUndefined();
    expect(applied.worktree).toBeUndefined();
  });

  it("does not release a terminal claim after its revision changes", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "Terminal stale", profile: "custom", requires: {}, status: "done" });
    const taken = await store.takeTicket(ticket.id, { branch: "terminal-stale", worktree: "wt/terminal-stale", stage: "done", assignee: "worker" });
    const result = reconcileEvidence(evidence({
      ticket: { id: taken.id, status: taken.status, updated: taken.updated, taken: true },
      claim: { state: "legacy", controller: null, worker: "worker", takenAt: taken.taken_at!, branch: "terminal-stale", worktree: "wt/terminal-stale" },
      workspace: { state: "clean", recordedWorktree: "wt/terminal-stale" },
    }));
    await store.updateItem(ticket.id, { title: "Changed after dry run" });
    await expect(store.applyReconciliation(ticket.id, { expectedUpdated: taken.updated, proposal: result.proposal! })).rejects.toThrow(/Conflict/);
    expect((await store.getItem(ticket.id))?.taken_at).toBeDefined();
  });
});
