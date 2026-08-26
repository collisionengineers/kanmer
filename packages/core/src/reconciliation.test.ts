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
    commits: { values: [...(overrides.commits?.values ?? [])], reachability: overrides.commits?.reachability ?? "not-applicable" },
    pullRequest: { state: "open", requiredChecks: "pass", ...overrides.pullRequest },
    proof: { state: "absent", ...overrides.proof },
    workspace: { state: "not-recorded", recordedWorktree: null, claimIdentity: "not-applicable", ...overrides.workspace },
    release: { state: "not-applicable", ...overrides.release },
  };
}

describe("reconcileEvidence", () => {
  it.each([
    ["moves merged review to verifying", evidence({ pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" } }), "MOVE_TO_VERIFYING"],
    ["returns closed unmerged review to implementing", evidence({ pullRequest: { state: "closed-unmerged", requiredChecks: "pass" } }), "MOVE_TO_IMPLEMENTING"],
    ["returns review without PR or worker to implementing", evidence({ pullRequest: { state: "absent", requiredChecks: "not-applicable" } }), "MOVE_TO_IMPLEMENTING"],
    ["moves merged PASS verification to done", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "merged", mergeSha: "b".repeat(40), requiredChecks: "pass" }, proof: { state: "pass", mergedSha: "b".repeat(40) } }), "MOVE_TO_DONE"],
    ["releases only an identity-matched clean terminal claim", evidence({ ticket: { id: "TICK-001", status: "done", updated: "2026-08-26T00:00:00.000Z", taken: true }, workspace: { state: "clean", claimIdentity: "matches-claim" } }), "RELEASE_CLEAN_TERMINAL_CLAIM"],
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
    ["does not advance an unreachable recorded commit", evidence({ pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" }, commits: { values: ["a".repeat(40)], reachability: "unreachable" } }), "RECORDED_COMMIT_UNREACHABLE"],
    ["does not advance unavailable commit reachability", evidence({ pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" }, commits: { values: ["a".repeat(40)], reachability: "unavailable" } }), "EVIDENCE_INCONCLUSIVE"],
    ["refuses a verifying ticket with no PR evidence and no merge SHA", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "absent", requiredChecks: "not-applicable" } }), "VERIFYING_WITHOUT_MERGE_SHA"],
    ["refuses a verifying ticket with an open pending PR and no merge SHA", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "open", requiredChecks: "pending" } }), "VERIFYING_WITHOUT_MERGE_SHA"],
    ["refuses a verifying ticket with a closed-unmerged PR and no merge SHA", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "closed-unmerged", requiredChecks: "not-applicable" } }), "VERIFYING_WITHOUT_MERGE_SHA"],
    ["refuses a verifying ticket with a merged PR and no merge SHA", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "merged", requiredChecks: "pass" } }), "VERIFYING_WITHOUT_MERGE_SHA"],
    ["retains failed verification for disposition", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" }, proof: { state: "fail" } }), "FAILED_VERIFICATION_REQUIRES_DISPOSITION"],
    ["rejects a stale PASS proof for a different merge", evidence({ ticket: { id: "TICK-001", status: "verifying", updated: "2026-08-26T00:00:00.000Z", taken: false }, pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" }, proof: { state: "pass", mergedSha: "b".repeat(40) } }), "PROOF_MERGE_SHA_MISMATCH"],
    ["preserves an incomplete legacy claim", evidence({ ticket: { id: "TICK-001", status: "implementing", updated: "2026-08-26T00:00:00.000Z", taken: true }, claim: { state: "legacy", controller: null, worker: "worker", takenAt: "2026-08-26T00:00:00.000Z", branch: "core-113", worktree: null }, workspace: { state: "not-recorded", recordedWorktree: null } }), "CLAIM_WITHOUT_RECORDED_WORKSPACE"],
    ["preserves a clean terminal claim without matching identity", evidence({ ticket: { id: "TICK-001", status: "done", updated: "2026-08-26T00:00:00.000Z", taken: true }, workspace: { state: "clean", claimIdentity: "branch-mismatch" } }), "TERMINAL_CLAIM_IDENTITY_UNVERIFIED"],
  ])("%s", (_name, input, code) => {
    const result = reconcileEvidence(input);
    expect(result.proposal).toBeNull();
    expect(result.findings[0]?.code).toBe(code);
  });

  it("moves a merged Review ticket despite a dirty workspace but preserves the warning", () => {
    const result = reconcileEvidence(evidence({
      pullRequest: { state: "merged", mergeSha: "a".repeat(40), requiredChecks: "pass" },
      workspace: { state: "dirty", claimIdentity: "matches-claim" },
    }));
    expect(result.proposal?.action).toBe("MOVE_TO_VERIFYING");
    expect(result.findings.map((entry) => entry.code)).toContain("DIRTY_WORKSPACE_PRESERVED");
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
      workspace: { state: "clean", recordedWorktree: "wt/terminal", claimIdentity: "matches-claim" },
    }));
    const applied = await store.applyReconciliation(ticket.id, { expectedUpdated: taken.updated, proposal: result.proposal! });
    expect(applied.taken_at).toBeUndefined();
    expect(applied.branch).toBeUndefined();
    expect(applied.worktree).toBeUndefined();
    const audit = (await store.getActivity({ id: ticket.id })).find((entry) => entry.field === "reconciliation-controller");
    expect(audit?.from).toBe("worker");
    expect(audit?.to).toBeNull();
  });

  it("applies the same legacy-claim predicate when taken_at is absent", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "Partial legacy claim", profile: "custom", requires: {}, status: "done" });
    const taken = await store.takeTicket(ticket.id, { branch: "legacy-branch", worktree: "wt/legacy", stage: "done", assignee: "worker" });
    const ticketPath = path.join(store.paths.areasRoot, "_none", taken.id, taken.id + ".md");
    const raw = await fs.readFile(ticketPath, "utf8");
    await fs.writeFile(ticketPath, raw.replace(/^taken_at:.*\r?\n/m, ""), "utf8");
    const partial = await store.getItem(ticket.id);
    expect(partial?.taken_at).toBeUndefined();
    const result = reconcileEvidence(evidence({
      ticket: { id: taken.id, status: "done", updated: partial!.updated, taken: true },
      claim: { state: "legacy", controller: "worker", worker: "worker", takenAt: null, branch: "legacy-branch", worktree: "wt/legacy" },
      workspace: { state: "clean", recordedWorktree: "wt/legacy", claimIdentity: "matches-claim" },
    }));
    expect(result.proposal?.action).toBe("RELEASE_CLEAN_TERMINAL_CLAIM");
    const released = await store.applyReconciliation(ticket.id, { expectedUpdated: partial!.updated, proposal: result.proposal! });
    expect(released.branch).toBeUndefined();
    expect(released.worktree).toBeUndefined();
  });

  it("does not release a terminal claim after its revision changes", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "Terminal stale", profile: "custom", requires: {}, status: "done" });
    const taken = await store.takeTicket(ticket.id, { branch: "terminal-stale", worktree: "wt/terminal-stale", stage: "done", assignee: "worker" });
    const result = reconcileEvidence(evidence({
      ticket: { id: taken.id, status: taken.status, updated: taken.updated, taken: true },
      claim: { state: "legacy", controller: null, worker: "worker", takenAt: taken.taken_at!, branch: "terminal-stale", worktree: "wt/terminal-stale" },
      workspace: { state: "clean", recordedWorktree: "wt/terminal-stale", claimIdentity: "matches-claim" },
    }));
    await store.updateItem(ticket.id, { title: "Changed after dry run" });
    await expect(store.applyReconciliation(ticket.id, { expectedUpdated: taken.updated, proposal: result.proposal! })).rejects.toThrow(/Conflict/);
    expect((await store.getItem(ticket.id))?.taken_at).toBeDefined();
  });
});
