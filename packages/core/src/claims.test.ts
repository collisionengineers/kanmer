import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { removeTreeWithRetry } from "./io.js";
import { KanmerStore } from "./store.js";
import { parseItem, serialiseItem } from "./frontmatter.js";
import { claimState, isLegacyLease, isOperatorReason, leaseConfig, leaseState } from "./types.js";
import { parseReviewAttestation } from "./review-attestation.js";

let root: string;
let store: KanmerStore;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-claims-"));
  store = new KanmerStore(root, { actor: "test-actor" });
  await store.init();
});

afterEach(async () => {
  await removeTreeWithRetry(root);
});

const ticketFile = (id: string) => path.join(root, ".kanmer", "areas", "_none", id, `${id}.md`);

/** Age a claim in place, optionally dropping `claim_expires_at` to simulate a v0.3.12 legacy claim. */
async function ageClaim(id: string, minutesAgo: number, dropExpiry = false): Promise<void> {
  const file = ticketFile(id);
  let raw = await fs.readFile(file, "utf8");
  const old = new Date(Date.now() - minutesAgo * 60_000).toISOString();
  raw = raw.replace(/^taken_at: .*$/mu, `taken_at: '${old}'`);
  raw = dropExpiry
    ? raw.replace(/^claim_expires_at: .*\n/mu, "")
    : raw.replace(/^claim_expires_at: .*$/mu, `claim_expires_at: '${old}'`);
  await fs.writeFile(file, raw, "utf8");
}

function attestation(pr: string, verdict: string): string {
  return [
    "---",
    "kind: review-attestation",
    `pr: "${pr}"`,
    `head_sha: "${"a".repeat(40)}"`,
    `verdict: ${verdict}`,
    'reviewer: "reviewer-run"',
    "independent: true",
    'plan_hash: "abc"',
    'ticket_updated: "2026-01-01T00:00:00.000Z"',
    "findings: []",
    "---",
    "",
    "Review.",
  ].join("\n");
}

describe("claimState / isOperatorReason", () => {
  const now = new Date("2026-08-27T10:00:00.000Z");
  it("classifies unclaimed, live and expired claims", () => {
    expect(claimState({}, now)).toBe("unclaimed");
    expect(claimState({ taken_at: "2026-08-27T09:50:00.000Z", claim_expires_at: "2026-08-27T10:20:00.000Z" }, now)).toBe("live");
    expect(claimState({ taken_at: "2026-08-27T09:00:00.000Z", claim_expires_at: "2026-08-27T09:30:00.000Z" }, now)).toBe("expired");
  });
  it("derives legacy expiry from taken_at plus the window", () => {
    expect(claimState({ taken_at: "2026-08-27T09:45:00.000Z" }, now)).toBe("live");
    expect(claimState({ taken_at: "2026-08-27T09:00:00.000Z" }, now)).toBe("expired");
    expect(claimState({ taken_at: "2026-08-27T09:45:00.000Z" }, now, 5)).toBe("expired");
  });
  it("never expires an unparseable timestamp silently", () => {
    expect(claimState({ taken_at: "not-a-date" }, now)).toBe("live");
  });
  it("recognises only a substantive operator reason", () => {
    expect(isOperatorReason("operator: crashed")).toBe(true);
    expect(isOperatorReason("operator:")).toBe(false);
    expect(isOperatorReason("Operator: x")).toBe(false);
    expect(isOperatorReason(undefined)).toBe(false);
  });
});

describe("parseReviewAttestation", () => {
  it("accepts the kanmer-review shape and normalises the SHA", () => {
    const parsed = parseReviewAttestation(attestation("286", "needs-changes").replace("a".repeat(40), "A".repeat(40)));
    expect(parsed.state).toBe("valid");
    if (parsed.state === "valid") {
      expect(parsed.pr).toBe("286");
      expect(parsed.verdict).toBe("needs-changes");
      expect(parsed.headSha).toBe("a".repeat(40));
    }
  });
  it("reports absent and invalid documents", () => {
    expect(parseReviewAttestation(null)).toEqual({ state: "absent" });
    expect(parseReviewAttestation("---\nkind: proof-record\n---\n").state).toBe("invalid");
    expect(parseReviewAttestation(attestation("286", "maybe")).state).toBe("invalid");
    const badFinding = attestation("286", "pass").replace("findings: []", "findings:\n  - id: X-1\n    severity: major\n    summary: s\n    disposition: open");
    expect(parseReviewAttestation(badFinding)).toMatchObject({ state: "invalid", reason: expect.stringContaining("findings[0].id") });
  });
});

describe("bootstrap claim contract (CORE-121)", () => {
  it("take stamps an expiry and a controller; release clears both", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const taken = await store.takeTicket(t.id, { branch: "feat/x", worktree: "wt/x", assignee: "ctl-a" });
    expect(taken.claim_expires_at).toBeTruthy();
    expect(Date.parse(taken.claim_expires_at!)).toBeGreaterThan(Date.now() + 29 * 60_000);
    expect(taken.claim_controller).toBe("ctl-a");
    const raw = await fs.readFile(ticketFile(t.id), "utf8");
    expect(raw.indexOf("worktree:")).toBeLessThan(raw.indexOf("claim_expires_at:"));
    expect(raw.indexOf("claim_expires_at:")).toBeLessThan(raw.indexOf("labels:"));
    const released = await store.releaseTicket(t.id);
    expect(released.claim_expires_at).toBeUndefined();
    expect(released.claim_controller).toBeUndefined();
  });

  it("honours board claimExpiryMinutes", async () => {
    const boardFile = path.join(root, ".kanmer", "data", "board.yml");
    await fs.writeFile(boardFile, `${await fs.readFile(boardFile, "utf8")}\nclaimExpiryMinutes: 5\n`, "utf8");
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const taken = await store.takeTicket(t.id, { branch: "feat/x" });
    const delta = Date.parse(taken.claim_expires_at!) - Date.now();
    expect(delta).toBeGreaterThan(4 * 60_000);
    expect(delta).toBeLessThan(6 * 60_000);
  });

  it("refuses to transfer a live claim and leaves the file untouched", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    await store.takeTicket(t.id, { branch: "feat/x", worktree: "wt/x", assignee: "ctl-a" });
    const before = await fs.readFile(ticketFile(t.id), "utf8");
    await expect(store.transferTicket(t.id, { assignee: "ctl-b" })).rejects.toThrow(/^CLAIM_LIVE:/u);
    expect(await fs.readFile(ticketFile(t.id), "utf8")).toBe(before);
  });

  it("transfers an expired claim, keeping branch/worktree and recording old → new", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    await store.takeTicket(t.id, { branch: "feat/x", worktree: "wt/x", assignee: "ctl-a" });
    await ageClaim(t.id, 45);
    const aged = (await store.getItem(t.id))!;
    const activityBefore = (await store.getActivity({ id: t.id })).length;
    const moved = await store.transferTicket(t.id, { assignee: "ctl-b" });
    expect(moved.assignee).toBe("ctl-b");
    expect(moved.claim_controller).toBe("ctl-b");
    expect(moved.branch).toBe("feat/x");
    expect(moved.worktree).toBe("wt/x");
    expect(moved.taken_at).toBe(aged.taken_at);
    expect(Date.parse(moved.claim_expires_at!)).toBeGreaterThan(Date.now());
    const activity = (await store.getActivity({ id: t.id })).slice(activityBefore);
    expect(activity.some((e) => e.op === "take" && e.field === "controller" && e.from === "ctl-a" && e.to === "ctl-b")).toBe(true);
    const scratch = await store.getDoc(t.id, "scratch/execution");
    expect(scratch).toContain("## Transitions");
    expect(scratch).toContain("claim-transfer ctl-a → ctl-b (expired");
    expect(scratch).toContain("worktree wt/x");
  });

  it("treats a legacy claim without claim_expires_at as expired only after the window", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    await store.takeTicket(t.id, { branch: "feat/x", assignee: "ctl-a" });
    await ageClaim(t.id, 10, true);
    await expect(store.transferTicket(t.id, { assignee: "ctl-b" })).rejects.toThrow(/^CLAIM_LIVE:/u);
    await ageClaim(t.id, 31, true);
    const moved = await store.transferTicket(t.id, { assignee: "ctl-b" });
    expect(moved.assignee).toBe("ctl-b");
  });

  it("transfers a live claim only with a substantive operator reason", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    await store.takeTicket(t.id, { branch: "feat/x", assignee: "ctl-a" });
    await expect(store.transferTicket(t.id, { assignee: "ctl-b", reason: "operator:" })).rejects.toThrow(/^CLAIM_LIVE:/u);
    const moved = await store.transferTicket(t.id, { assignee: "ctl-b", reason: "operator: controller crashed mid-run" });
    expect(moved.claim_controller).toBe("ctl-b");
    expect(await store.getDoc(t.id, "scratch/execution")).toContain("operator: controller crashed mid-run");
  });

  it("renews only the owner's claim", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const taken = await store.takeTicket(t.id, { branch: "feat/x", assignee: "ctl-a", controller: "run-1" });
    expect(taken.claim_controller).toBe("run-1");
    await expect(store.renewTicket(t.id, "ctl-b")).rejects.toThrow(/^CLAIM_NOT_OWNED:/u);
    await new Promise((r) => setTimeout(r, 5));
    const renewed = await store.renewTicket(t.id, "run-1");
    expect(Date.parse(renewed.claim_expires_at!)).toBeGreaterThanOrEqual(Date.parse(taken.claim_expires_at!));
    const untaken = await store.createItem({ type: "ticket", title: "B", status: "implementing" });
    await expect(store.renewTicket(untaken.id, "ctl-a")).rejects.toThrow(/^CLAIM_NOT_TAKEN:/u);
    await expect(store.transferTicket(untaken.id, { assignee: "ctl-a" })).rejects.toThrow(/^CLAIM_NOT_TAKEN:/u);
  });

  it("a v0.3.12 ticket without claim fields takes, moves and releases unchanged", async () => {
    const t = await store.createItem({ type: "ticket", title: "Legacy", status: "implementing" });
    let raw = await fs.readFile(ticketFile(t.id), "utf8");
    expect(raw).not.toMatch(/claim_|review_round|remediation_budget/u);
    const taken = await store.takeTicket(t.id, { branch: "feat/legacy" });
    raw = await fs.readFile(ticketFile(t.id), "utf8");
    raw = raw.replace(/^claim_expires_at: .*\n/mu, "").replace(/^claim_controller: .*\n/mu, "");
    await fs.writeFile(ticketFile(t.id), raw, "utf8");
    const reloaded = await store.getItem(t.id);
    expect(reloaded?.taken_at).toBe(taken.taken_at);
    expect(reloaded?.claim_expires_at).toBeUndefined();
    // Forward moves need no reason and never touch the claim fields.
    await store.setDoc(t.id, "post-implementation-report", "# Report");
    const moved = await store.moveItem(t.id, { status: "review" });
    expect(moved.status).toBe("review");
    expect(moved.review_round).toBeUndefined();
    const released = await store.releaseTicket(t.id);
    expect(released.taken_at).toBeUndefined();
    expect(await fs.readFile(ticketFile(t.id), "utf8")).not.toMatch(/claim_|review_round/u);
  });
});

describe("audited backward moves (CORE-121)", () => {
  it("refuses any backward move without a reason, before touching siblings", async () => {
    const t = await store.createItem({ type: "ticket", title: "T", status: "review" });
    const s1 = await store.createItem({ type: "ticket", title: "S1", status: "implementing" });
    const before = (await store.getItem(s1.id))!.updated;
    await expect(store.moveItem(t.id, { status: "implementing" })).rejects.toThrow(/^BACKWARD_MOVE_NEEDS_REASON:/u);
    await expect(store.moveItem(t.id, { status: "implementing", position: "top" })).rejects.toThrow(/^BACKWARD_MOVE_NEEDS_REASON:/u);
    await expect(store.updateItem(t.id, { status: "preparing" })).rejects.toThrow(/^BACKWARD_MOVE_NEEDS_REASON:/u);
    expect((await store.getItem(s1.id))!.order).toBeUndefined();
    expect((await store.getItem(s1.id))!.updated).toBe(before);
    expect((await store.getItem(t.id))!.status).toBe("review");
  });

  it("allows a non-review backward move with a reason and audits it", async () => {
    const t = await store.createItem({ type: "ticket", title: "T", status: "implementing" });
    const moved = await store.moveItem(t.id, { status: "preparing", reason: "plan needs a second look" });
    expect(moved.status).toBe("preparing");
    expect(moved.review_round).toBeUndefined();
    const activity = await store.getActivity({ id: t.id });
    expect(activity.some((e) => e.field === "status-reason" && e.to === "plan needs a second look")).toBe(true);
    expect(await store.getDoc(t.id, "scratch/execution")).toContain("stage implementing → preparing by test-actor");
  });

  it("returns Review → Implementing only against a needs-changes attestation for this ticket's PR", async () => {
    const t = await store.createItem({ type: "ticket", title: "T", status: "review", prs: ["286"] });
    const attempt = () => store.moveItem(t.id, { status: "implementing", reason: "fix F-015" });
    await expect(attempt()).rejects.toThrow(/^REVIEW_RETURN_NEEDS_ATTESTATION: .*no scratch\/review\.md/u);
    await store.setDoc(t.id, "scratch/review", attestation("999", "needs-changes"));
    await expect(attempt()).rejects.toThrow(/^REVIEW_RETURN_NEEDS_ATTESTATION: .*not in this ticket's prs/u);
    await store.setDoc(t.id, "scratch/review", attestation("286", "pass"));
    await expect(attempt()).rejects.toThrow(/^REVIEW_RETURN_NEEDS_ATTESTATION: .*"pass", not "needs-changes"/u);
    await store.setDoc(t.id, "scratch/review", "---\nkind: review-attestation\nverdict: needs-changes\n---\n");
    await expect(attempt()).rejects.toThrow(/^REVIEW_RETURN_NEEDS_ATTESTATION: .*not a valid attestation/u);
    expect((await store.getItem(t.id))!.status).toBe("review");
    await store.setDoc(t.id, "scratch/review", attestation("286", "needs-changes"));
    const current = (await store.getItem(t.id))!;
    const moved = await store.moveItem(t.id, { status: "implementing", reason: "fix F-015", expectedUpdated: current.updated });
    expect(moved.status).toBe("implementing");
    expect(moved.review_round).toBe(1);
    expect(moved.remediation_budget).toBeUndefined();
    expect(await store.getDoc(t.id, "scratch/execution")).toContain("review_round 1");
  });

  it("accepts a PR URL in prs against a numeric attestation pr", async () => {
    const t = await store.createItem({ type: "ticket", title: "T", status: "review", prs: ["https://github.com/o/r/pull/286"] });
    await store.setDoc(t.id, "scratch/review", attestation("286", "needs-changes"));
    expect((await store.moveItem(t.id, { status: "implementing", reason: "fix" })).review_round).toBe(1);
  });

  it("exhausts the remediation budget and lets only an operator re-open", async () => {
    const t = await store.createItem({ type: "ticket", title: "T", status: "review", prs: ["286"] });
    await store.setDoc(t.id, "scratch/review", attestation("286", "needs-changes"));
    await store.moveItem(t.id, { status: "implementing", reason: "round 1" });
    await store.setDoc(t.id, "post-implementation-report", "# Report");
    await store.moveItem(t.id, { status: "review" });
    await expect(store.moveItem(t.id, { status: "implementing", reason: "round 2" })).rejects.toThrow(
      /^REMEDIATION_BUDGET_EXHAUSTED: .*1 time\(s\) against a budget of 1/u,
    );
    expect((await store.getItem(t.id))!.status).toBe("review");
    const reopened = await store.moveItem(t.id, { status: "implementing", reason: "operator: F-015 fix authorised" });
    expect(reopened.review_round).toBe(2);
    expect(reopened.remediation_budget).toBe(2);
    expect(await store.getDoc(t.id, "scratch/execution")).toContain("remediation_budget 2");
  });

  it("an operator override needs no attestation", async () => {
    const t = await store.createItem({ type: "ticket", title: "T", status: "review" });
    const moved = await store.moveItem(t.id, { status: "implementing", reason: "operator: superseded review" });
    expect(moved.review_round).toBe(1);
  });

  it("forward moves ignore the rule", async () => {
    const t = await store.createItem({ type: "ticket", title: "T", status: "backlog", profile: "chore", docs_todo: true });
    expect((await store.moveItem(t.id, { status: "preparing" })).status).toBe("preparing");
  });

  it("the GUI actor is the operator: its backward moves carry an implicit operator reason", async () => {
    const gui = new KanmerStore(root); // default actor "gui", exactly as the Electron main process constructs it
    const t = await gui.createItem({ type: "ticket", title: "T", status: "review", prs: ["286"] });
    const moved = await gui.moveItem(t.id, { status: "implementing" });
    expect(moved.status).toBe("implementing");
    expect(moved.review_round).toBe(1);
    expect(await gui.getDoc(t.id, "scratch/execution")).toContain("operator: moved on the board");
    expect((await gui.moveItem(t.id, { status: "backlog" })).status).toBe("backlog");
  });
});

describe("claim frontmatter round trip (CORE-121)", () => {
  const sample = [
    "---",
    "id: TICK-001",
    "type: ticket",
    "title: Sample",
    "status: implementing",
    "taken_at: '2026-08-27T10:00:00.000Z'",
    "worktree: .worktrees/x",
    "labels: []",
    "links: []",
    "created: '2026-08-27T09:00:00.000Z'",
    "updated: '2026-08-27T10:00:00.000Z'",
    "---",
    "",
    "Body.",
    "",
  ].join("\n");

  it("serialises claim fields after worktree and round-trips them", () => {
    const item = { ...parseItem(sample), claim_expires_at: "2026-08-27T10:30:00.000Z", claim_controller: "run-1", review_round: 1, remediation_budget: 2 };
    const text = serialiseItem(item);
    const order = ["worktree:", "claim_expires_at:", "claim_controller:", "review_round:", "remediation_budget:", "labels:"]
      .map((k) => text.indexOf(k));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const back = parseItem(text);
    expect(back.review_round).toBe(1);
    expect(back.remediation_budget).toBe(2);
    expect(back.claim_controller).toBe("run-1");
  });

  it("rejects malformed claim numbers", () => {
    expect(() => parseItem(sample.replace("updated:", "review_round: -1\nupdated:"))).toThrow();
    expect(() => parseItem(sample.replace("updated:", "remediation_budget: 0\nupdated:"))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Renewable workspace leases (CORE-115, FRD-030)
// ---------------------------------------------------------------------------

/** Strip every lease field so a taken ticket looks like a CORE-121 / v0.3.12 claim. */
async function stripLease(id: string): Promise<void> {
  const file = ticketFile(id);
  const raw = await fs.readFile(file, "utf8");
  // Lazy up to the next key: YAML may fold a long lease_workspace value over several lines.
  await fs.writeFile(file, raw.replace(/^lease_[a-z_]+: [\s\S]*?\n(?=[a-z_]+: |---)/gmu, ""), "utf8");
}

async function setBoardLine(line: string): Promise<void> {
  const boardFile = path.join(root, ".kanmer", "data", "board.yml");
  await fs.writeFile(boardFile, `${await fs.readFile(boardFile, "utf8")}\n${line}\n`, "utf8");
}

describe("leaseState / leaseConfig (CORE-115)", () => {
  const now = new Date("2026-08-27T10:00:00.000Z");
  it("resolves the FRD-030 defaults and board overrides", () => {
    expect(leaseConfig(undefined)).toEqual({ expiryMinutes: 30, heartbeatMinutes: 5, commandMaxMinutes: 120 });
    expect(leaseConfig({ claimExpiryMinutes: 10, leaseHeartbeatMinutes: 2, leaseCommandMaxMinutes: 15 })).toEqual({ expiryMinutes: 10, heartbeatMinutes: 2, commandMaxMinutes: 15 });
  });
  it("classifies legacy and leased claims with one expiry rule and a heartbeat flag", () => {
    expect(leaseState({}, now)).toEqual({ state: "unclaimed", legacy: false, expiresAt: null, heartbeatStale: false });
    const legacy = leaseState({ taken_at: "2026-08-27T09:50:00.000Z" }, now);
    expect(legacy).toMatchObject({ state: "live", legacy: true, expiresAt: "2026-08-27T10:20:00.000Z", heartbeatStale: true });
    const leased = leaseState({ taken_at: "2026-08-27T09:00:00.000Z", claim_expires_at: "2026-08-27T10:30:00.000Z", lease_id: "L1", lease_heartbeat_at: "2026-08-27T09:58:00.000Z" }, now);
    expect(leased).toMatchObject({ state: "live", legacy: false, heartbeatStale: false });
    expect(leaseState({ taken_at: "2026-08-27T09:00:00.000Z", claim_expires_at: "2026-08-27T09:30:00.000Z", lease_id: "L1" }, now).state).toBe("expired");
    expect(claimState({ taken_at: "2026-08-27T09:00:00.000Z" }, now)).toBe("expired");
    expect(isLegacyLease({ taken_at: "x" })).toBe(true);
    expect(isLegacyLease({ taken_at: "x", lease_id: "L1" })).toBe(false);
    expect(isLegacyLease({})).toBe(false);
  });
});

describe("renewable leases (CORE-115)", () => {
  it("take mints a lease record in KEY_ORDER position and release clears it", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const taken = await store.takeTicket(t.id, {
      branch: "feat/x", worktree: "wt/x", assignee: "ctl-a", controllerRun: "run-c1", workerRun: "run-w1", provider: "claude-code",
    });
    expect(taken.lease_id).toMatch(/^[0-9a-f-]{36}$/u);
    expect(taken.lease_revision).toBe(1);
    expect(taken.lease_phase).toBe("implementing");
    expect(taken.lease_heartbeat_at).toBe(taken.taken_at);
    expect(taken.lease_workspace).toMatch(/^worktree:/u);
    expect(taken.lease_controller_run).toBe("run-c1");
    expect(taken.lease_worker_run).toBe("run-w1");
    expect(taken.lease_provider).toBe("claude-code");
    const raw = await fs.readFile(ticketFile(t.id), "utf8");
    expect(raw.indexOf("claim_controller:")).toBeLessThan(raw.indexOf("lease_id:"));
    expect(raw.indexOf("lease_id:")).toBeLessThan(raw.indexOf("lease_revision:"));
    expect(raw.indexOf("lease_heartbeat_at:")).toBeLessThan(raw.indexOf("labels:"));
    const released = await store.releaseTicket(t.id);
    for (const key of Object.keys(released)) expect(key.startsWith("lease_")).toBe(false);
    expect(await fs.readFile(ticketFile(t.id), "utf8")).not.toMatch(/^lease_/mu);
  });

  it("AC1: a competing controller cannot acquire a live lease, and an expired one only via transfer", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    await store.takeTicket(t.id, { branch: "feat/x", worktree: "wt/x", assignee: "ctl-a" });
    const before = await fs.readFile(ticketFile(t.id), "utf8");
    await expect(store.takeTicket(t.id, { branch: "feat/y", worktree: "wt/y", assignee: "ctl-b" })).rejects.toThrow(/^LEASE_LIVE:.*already taken.*live/u);
    expect(await fs.readFile(ticketFile(t.id), "utf8")).toBe(before);
    await ageClaim(t.id, 31);
    await expect(store.takeTicket(t.id, { branch: "feat/y", worktree: "wt/y", assignee: "ctl-b" })).rejects.toThrow(/^LEASE_LIVE:.*expired.*action "transfer"/u);
  });

  it("one live writer per workspace: the same worktree or branch on another taken ticket is refused, even with force", async () => {
    const a = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const b = await store.createItem({ type: "ticket", title: "B", status: "implementing" });
    await store.takeTicket(a.id, { branch: "feat/a", worktree: ".worktrees/a", assignee: "ctl-a" });
    await expect(store.takeTicket(b.id, { branch: "feat/b", worktree: ".worktrees\\a\\", assignee: "ctl-b" })).rejects.toThrow(/^WORKSPACE_OCCUPIED:.*worktree.*"TICK-001"/u);
    await expect(store.takeTicket(b.id, { branch: "feat/a", assignee: "ctl-b" })).rejects.toThrow(/^WORKSPACE_OCCUPIED:.*branch feat\/a/u);
    await expect(store.takeTicket(b.id, { branch: "feat/a", assignee: "ctl-b", force: true })).rejects.toThrow(/^WORKSPACE_OCCUPIED:/u);
    // An expired but unreleased lease still owns its workspace (a final claim remains until closeout).
    await ageClaim(a.id, 31);
    await expect(store.takeTicket(b.id, { branch: "feat/b", worktree: ".worktrees/a", assignee: "ctl-b" })).rejects.toThrow(/^WORKSPACE_OCCUPIED:/u);
    expect((await store.getItem(b.id))!.taken_at).toBeUndefined();
    await store.releaseTicket(a.id);
    const taken = await store.takeTicket(b.id, { branch: "feat/b", worktree: ".worktrees/a", assignee: "ctl-b" });
    expect(taken.lease_id).toBeTruthy();
  });

  it("AC2: renewal needs the current lease id and revision; a stale one writes nothing", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const taken = await store.takeTicket(t.id, { branch: "feat/x", assignee: "ctl-a" });
    const before = await fs.readFile(ticketFile(t.id), "utf8");
    await expect(store.renewTicket(t.id, { actor: "ctl-a", leaseId: "not-the-lease", leaseRevision: 1 })).rejects.toThrow(/^LEASE_EXPIRED:.*no longer current/u);
    await expect(store.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id, leaseRevision: 7 })).rejects.toThrow(/^Conflict:.*lease revision changed/u);
    await expect(store.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id })).rejects.toThrow(/^LEASE_REVISION_REQUIRED:/u);
    await expect(store.renewTicket(t.id, { actor: "ctl-a", leaseRevision: 1 })).rejects.toThrow(/^LEASE_ID_REQUIRED:/u);
    await expect(store.renewTicket(t.id, { actor: "ctl-b", leaseId: "stale", leaseRevision: 1 })).rejects.toThrow(/^LEASE_EXPIRED:/u);
    expect(await fs.readFile(ticketFile(t.id), "utf8")).toBe(before);
    const renewed = await store.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id!, leaseRevision: 1, workerRun: "run-w2" });
    expect(renewed.lease_id).toBe(taken.lease_id);
    expect(renewed.lease_revision).toBe(2);
    expect(renewed.lease_worker_run).toBe("run-w2");
    expect(Date.parse(renewed.lease_heartbeat_at!)).toBeGreaterThanOrEqual(Date.parse(taken.lease_heartbeat_at!));
    // The old revision is now stale for everyone, including the owner.
    await expect(store.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id!, leaseRevision: 1 })).rejects.toThrow(/^Conflict:/u);
    // The compatibility lane (no lease named) still applies the owner check only.
    await expect(store.renewTicket(t.id, "ctl-b")).rejects.toThrow(/^CLAIM_NOT_OWNED:/u);
    expect((await store.renewTicket(t.id, "ctl-a")).lease_revision).toBe(3);
  });

  it("an expired lease nobody reclaimed still renews for its holder: expiry is not deletion", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const taken = await store.takeTicket(t.id, { branch: "feat/x", assignee: "ctl-a" });
    await ageClaim(t.id, 45);
    expect(claimState((await store.getItem(t.id))!)).toBe("expired");
    const renewed = await store.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id!, leaseRevision: 1 });
    expect(claimState(renewed)).toBe("live");
    expect(renewed.lease_id).toBe(taken.lease_id);
  });

  it("running-command is the only phase that extends beyond the window, and it is bounded", async () => {
    await setBoardLine("leaseCommandMaxMinutes: 10");
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const taken = await store.takeTicket(t.id, { branch: "feat/x", assignee: "ctl-a" });
    await expect(store.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id!, leaseRevision: 1, extendMinutes: 60 })).rejects.toThrow(/^LEASE_EXTENSION_NEEDS_RUNNING_COMMAND:/u);
    await expect(store.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id!, leaseRevision: 1, phase: "bogus" as never })).rejects.toThrow(/^LEASE_PHASE_INVALID:/u);
    const running = await store.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id!, leaseRevision: 1, phase: "running-command", extendMinutes: 60 });
    expect(running.lease_phase).toBe("running-command");
    const delta = Date.parse(running.claim_expires_at!) - Date.now();
    expect(delta).toBeGreaterThan(9 * 60_000);
    expect(delta).toBeLessThan(11 * 60_000);
    const back = await store.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id!, leaseRevision: 2, phase: "implementing" });
    expect(back.lease_phase).toBe("implementing");
    expect(Date.parse(back.claim_expires_at!) - Date.now()).toBeLessThan(31 * 60_000);
    expect(await store.getDoc(t.id, "scratch/execution")).toMatch(/lease-phase implementing → running-command[\s\S]*lease-phase running-command → implementing/u);
  });

  it("one migration path: a legacy claim keeps its derived expiry and receives its lease record on first renew", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    await store.takeTicket(t.id, { branch: "feat/x", worktree: "wt/x", assignee: "ctl-a" });
    await stripLease(t.id);
    await ageClaim(t.id, 10, true);
    const legacy = (await store.getItem(t.id))!;
    expect(legacy.lease_id).toBeUndefined();
    expect(leaseState(legacy)).toMatchObject({ state: "live", legacy: true });
    await expect(store.renewTicket(t.id, "ctl-b")).rejects.toThrow(/^CLAIM_NOT_OWNED:/u);
    const migrated = await store.renewTicket(t.id, "ctl-a");
    expect(migrated.lease_id).toBeTruthy();
    expect(migrated.lease_revision).toBe(1);
    expect(migrated.lease_workspace).toMatch(/^worktree:/u);
    expect(migrated.claim_controller).toBe("ctl-a");
    expect(migrated.branch).toBe("feat/x");
    expect(migrated.worktree).toBe("wt/x");
    expect(await store.getDoc(t.id, "scratch/execution")).toMatch(/lease-migrate legacy claim → lease/u);
  });

  it("one migration path: a legacy claim past its derived window is reclaimed like any expired lease", async () => {
    const u = await store.createItem({ type: "ticket", title: "B", status: "implementing" });
    await store.takeTicket(u.id, { branch: "feat/u", assignee: "ctl-a" });
    await stripLease(u.id);
    await ageClaim(u.id, 31, true);
    const reclaimed = await store.transferTicket(u.id, { assignee: "ctl-c" });
    expect(reclaimed.lease_id).toBeTruthy();
    expect(reclaimed.lease_revision).toBe(1);
    expect(reclaimed.lease_reclaimed_from).toBe("ctl-a");
  });

  describe("AC3: reclaiming an expired lease records the evidence and preserves the work", () => {
    const cases = [
      { name: "dirty worktree", recovery: { workspace: "dirty", claimIdentity: "matches-claim", boardWorktree: false, pullRequest: "absent", commits: 0, proof: "absent" } },
      { name: "committed, no PR", recovery: { workspace: "clean", claimIdentity: "matches-claim", boardWorktree: false, pullRequest: "absent", commits: 3, proof: "absent" } },
      { name: "branch with missing worktree", recovery: { workspace: "missing", claimIdentity: "unavailable", boardWorktree: false, pullRequest: "open", commits: 2, proof: "absent" } },
    ] as const;
    it.each(cases)("$name", async (c) => {
      const t = await store.createItem({ type: "ticket", title: c.name, status: "implementing" });
      const taken = await store.takeTicket(t.id, { branch: `feat/${t.id}`, worktree: `.worktrees/${t.id}`, assignee: "ctl-a", controller: "run-old" });
      await store.updateItem(t.id, { commits: ["abc1234"] });
      await ageClaim(t.id, 31);
      const aged = (await store.getItem(t.id))!;
      const next = await store.transferTicket(t.id, { assignee: "ctl-b", controller: "run-new", controllerRun: "run-new", recovery: c.recovery });
      expect(next.branch).toBe(`feat/${t.id}`);
      expect(next.worktree).toBe(`.worktrees/${t.id}`);
      expect(next.taken_at).toBe(aged.taken_at);
      expect(next.commits).toEqual(["abc1234"]);
      expect(next.lease_id).not.toBe(taken.lease_id);
      expect(next.lease_revision).toBe(2);
      expect(next.lease_reclaimed_from).toBe("run-old");
      expect(next.claim_controller).toBe("run-new");
      expect(next.lease_controller_run).toBe("run-new");
      expect(claimState(next)).toBe("live");
      const log = await store.getDoc(t.id, "scratch/execution");
      expect(log).toMatch(new RegExp(`claim-transfer run-old → run-new \\(expired; lease ${taken.lease_id} → ${next.lease_id} rev 2;.*evidence: workspace ${c.recovery.workspace} \\(${c.recovery.claimIdentity}\\), pr ${c.recovery.pullRequest}, commits ${c.recovery.commits}, proof absent`, "u"));
      // The old lease is dead: its holder cannot renew any more.
      await expect(store.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id!, leaseRevision: 1 })).rejects.toThrow(/^LEASE_EXPIRED:/u);
    });
  });

  it("reclaim refuses a board-worktree, foreign-repository or branch-mismatched workspace without writing", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    await store.takeTicket(t.id, { branch: "feat/x", worktree: "wt/x", assignee: "ctl-a" });
    await ageClaim(t.id, 31);
    const before = await fs.readFile(ticketFile(t.id), "utf8");
    const base = { workspace: "clean", pullRequest: "absent", commits: 0, proof: "absent" } as const;
    await expect(store.transferTicket(t.id, { assignee: "ctl-b", recovery: { ...base, claimIdentity: "unavailable", boardWorktree: true } })).rejects.toThrow(/^RECOVERY_REFUSED:.*board worktree/u);
    await expect(store.transferTicket(t.id, { assignee: "ctl-b", recovery: { ...base, claimIdentity: "foreign-repository", boardWorktree: false } })).rejects.toThrow(/^RECOVERY_REFUSED:.*different repository/u);
    await expect(store.transferTicket(t.id, { assignee: "ctl-b", recovery: { ...base, claimIdentity: "branch-mismatch", boardWorktree: false } })).rejects.toThrow(/^RECOVERY_REFUSED:.*not checked out on the recorded branch/u);
    expect(await fs.readFile(ticketFile(t.id), "utf8")).toBe(before);
  });

  it("serialises the lease writes across store instances: concurrent renewals from one revision yield exactly one success", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const taken = await store.takeTicket(t.id, { branch: "feat/x", assignee: "ctl-a" });
    const stores = Array.from({ length: 6 }, () => new KanmerStore(root, { actor: "racer" }));
    const results = await Promise.allSettled(
      stores.map((s) => s.renewTicket(t.id, { actor: "ctl-a", leaseId: taken.lease_id!, leaseRevision: 1 })),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const conflicts = results.filter((r) => r.status === "rejected" && /^Conflict:/u.test(String((r as PromiseRejectedResult).reason?.message)));
    expect(ok).toHaveLength(1);
    expect(conflicts).toHaveLength(5);
    expect((await store.getItem(t.id))!.lease_revision).toBe(2);
    expect(await fs.readdir(path.join(root, ".kanmer"))).not.toContain("leases.lock");
  });
});

describe("non-lease writers share the lease lock (CORE-125)", () => {
  it("loses neither the lease record nor a concurrent updateItem from another store", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    const taken = await store.takeTicket(t.id, { branch: "feat/x", assignee: "ctl-a" });
    const renewer = new KanmerStore(root, { actor: "ctl-a" });
    const writer = new KanmerStore(root, { actor: "ctl-b" });
    // renewTicket re-reads the ticket and then awaits getBoard() before it
    // writes, both inside its lock: wrapping getBoard on this one instance
    // parks a real renewal in the middle of its critical section, so the
    // interleaving under test is exact rather than hoped for.
    let parkedInLock = false;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const realGetBoard = renewer.getBoard.bind(renewer);
    renewer.getBoard = async () => {
      if (!parkedInLock) {
        parkedInLock = true;
        await held;
      }
      return realGetBoard();
    };
    const renewal = renewer.renewTicket(t.id, {
      actor: "ctl-a",
      leaseId: taken.lease_id!,
      leaseRevision: 1,
    });
    while (!parkedInLock) await new Promise((r) => setTimeout(r, 5));
    // A second store mutates the same ticket file while the renewal holds the
    // lock. Unserialised, it completes inside this window and the renewal then
    // renames its own pre-read copy over the edit (and, with the opposite
    // scheduling, the edit reverts the lease record).
    const edit = writer.updateItem(t.id, { title: "edited during the renewal" });
    await new Promise((r) => setTimeout(r, 50));
    release();
    const renewed = await renewal;
    await edit;
    const after = (await store.getItem(t.id))!;
    expect(renewed.lease_revision).toBe(2);
    expect(after.lease_id).toBe(taken.lease_id);
    expect(after.lease_revision).toBe(2);
    expect(after.claim_controller).toBe("ctl-a");
    expect(after.taken_at).toBe(taken.taken_at);
    expect(after.title).toBe("edited during the renewal");
    expect(await fs.readdir(path.join(root, ".kanmer"))).not.toContain("leases.lock");
  });

  it("keeps a lease renewal that lands mid-updateItem: the stale writer never reverts the lease record", async () => {
    const t = await store.createItem({ type: "ticket", title: "T", status: "review", prs: ["286"] });
    await store.setDoc(t.id, "scratch/review", attestation("286", "needs-changes"));
    const taken = await store.takeTicket(t.id, { branch: "feat/t", assignee: "ctl-a", stage: "review" });
    const writer = new KanmerStore(root, { actor: "ctl-b" });
    // The audited Review → Implementing return reads the attestation with the
    // public getDoc after updateItem has read the ticket and before it writes
    // it: parking there is the exact window an unlocked writer leaves open.
    let parkedMidWrite = false;
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const realGetDoc = writer.getDoc.bind(writer);
    writer.getDoc = async (...args: Parameters<typeof realGetDoc>) => {
      if (!parkedMidWrite) {
        parkedMidWrite = true;
        await held;
      }
      return realGetDoc(...args);
    };
    const back = writer.updateItem(t.id, { status: "implementing", reason: "fix F-001" });
    while (!parkedMidWrite) await new Promise((r) => setTimeout(r, 5));
    const renewal = store.renewTicket(t.id, {
      actor: "ctl-a",
      leaseId: taken.lease_id!,
      leaseRevision: 1,
    });
    await new Promise((r) => setTimeout(r, 50));
    release();
    await back;
    const renewed = await renewal;
    const after = (await store.getItem(t.id))!;
    expect(renewed.lease_revision).toBe(2);
    expect(after.lease_revision).toBe(2);
    expect(after.lease_id).toBe(taken.lease_id);
    expect(after.status).toBe("implementing");
    expect(after.review_round).toBe(1);
  });

  it("re-enters the lock on nested writes instead of deadlocking, and leaves no lock behind", async () => {
    const free = { type: "ticket" as const, profile: "custom", requires: {} };
    const a = await store.createItem({ ...free, title: "A", status: "implementing" });
    const b = await store.createItem({ ...free, title: "B", status: "implementing" });
    // moveItem → computeOrder → updateItem per sibling, then the moved ticket.
    await store.moveItem(b.id, { status: "implementing", position: "top" });
    expect((await store.getItem(b.id))!.order).toBeLessThan((await store.getItem(a.id))!.order!);
    // updateItem → appendTransition → setDoc on an audited backward move.
    await store.moveItem(a.id, { status: "review", position: "bottom" });
    const back = await store.updateItem(a.id, { status: "implementing", reason: "operator: re-open" });
    expect(back.status).toBe("implementing");
    expect(await store.getScratch(a.id, "execution")).toMatch(/stage review → implementing/u);
    // A lease verb → appendTransition → setDoc, with the lock already held.
    const taken = await store.takeTicket(a.id, { branch: "feat/a", assignee: "ctl-a" });
    const renewed = await store.renewTicket(a.id, {
      actor: "ctl-a",
      leaseId: taken.lease_id!,
      leaseRevision: 1,
      phase: "running-command",
      extendMinutes: 45,
    });
    expect(renewed.lease_phase).toBe("running-command");
    expect(await store.getScratch(a.id, "execution")).toMatch(/lease-phase implementing → running-command/u);
    expect(await fs.readdir(path.join(root, ".kanmer"))).toEqual(
      expect.not.arrayContaining(["leases.lock"]),
    );
    expect((await fs.readdir(path.join(root, ".kanmer"))).filter((f) => f.includes("leases.lock"))).toEqual([]);
  });
});

describe("batch workspaces (CORE-124)", () => {
  /** Gate-free tickets so the fixture can walk every stage without pipeline documents. */
  const free = { type: "ticket" as const, profile: "custom", requires: {}, status: "implementing" };
  const batchWorkspace = {
    branch: "batch-a",
    worktree: ".worktrees/batch-a",
    controllerRun: "controller-run",
  };
  const HEAD = "b".repeat(40);
  const sharedAttestation = (pr: string) => attestation(pr, "pass").replace(`head_sha: "${"a".repeat(40)}"`, `head_sha: "${HEAD}"`);

  async function walkToDone(id: string): Promise<void> {
    for (const status of ["review", "verifying", "done"]) await store.moveItem(id, { status });
  }

  async function threeMemberBatch() {
    const a = await store.createItem({ ...free, title: "A" });
    const b = await store.createItem({ ...free, title: "B" });
    const c = await store.createItem({ ...free, title: "C" });
    const first = await store.takeTicket(a.id, { ...batchWorkspace, assignee: "ctl-a", batch: "batch-a", batchMembers: [a.id, b.id, c.id] });
    return { a, b, c, first };
  }

  async function onlyManifestFile(): Promise<string> {
    const dir = path.join(root, ".kanmer", "batches", "transactions");
    const files = (await fs.readdir(dir)).filter((name) => name.endsWith(".json"));
    expect(files).toHaveLength(1);
    return path.join(dir, files[0]!);
  }

  async function retryFirstTake(a: { id: string }, b: { id: string }, c: { id: string }) {
    return store.takeTicket(a.id, {
      ...batchWorkspace,
      assignee: "ctl-a",
      batch: "batch-a",
      batchMembers: [a.id, b.id, c.id],
    });
  }

  const digest = (value: string): string => createHash("sha256").update(value, "utf8").digest("hex");
  const batchManifestFile = (batchId: string): string => path.join(
    root,
    ".kanmer",
    "batches",
    "transactions",
    `${digest(batchId)}.json`,
  );

  async function snapshotBoardFiles(): Promise<Record<string, string>> {
    const base = path.join(root, ".kanmer");
    const out: Record<string, string> = {};
    const walk = async (dir: string): Promise<void> => {
      for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(file);
        else out[path.relative(base, file).replaceAll("\\", "/")] = await fs.readFile(file, "utf8");
      }
    };
    await walk(base);
    return out;
  }

  /**
   * Derive a strict pending-WAL fixture from bytes produced by the real
   * declaration once, then restore the exact pre-declaration board. The WAL
   * retains only hashes and the frozen take fingerprint, never ticket bodies.
   */
  async function manualPendingFixture(batchId: string, worktree = `.worktrees/${batchId}`) {
    const a = await store.createItem({ ...free, title: `${batchId} A` });
    const b = await store.createItem({ ...free, title: `${batchId} B` });
    const c = await store.createItem({ ...free, title: `${batchId} C` });
    const ids = [a.id, b.id, c.id];
    const before = new Map(await Promise.all(ids.map(async (id) => [id, await fs.readFile(ticketFile(id), "utf8")] as const)));
    const activityFile = path.join(root, ".kanmer", "data", "activity.jsonl");
    const activityBefore = await fs.readFile(activityFile, "utf8");
    const take = {
      branch: `${batchId}-branch`,
      worktree,
      assignee: "ctl-a",
      controller: "visible-controller",
      controllerRun: "controller-run",
      workerRun: "worker-run",
      provider: "test-provider",
      phase: "implementing" as const,
      batch: batchId,
      batchMembers: [c.id, a.id, b.id],
    };
    await store.takeTicket(a.id, take);
    const manifestFile = batchManifestFile(batchId);
    const active = JSON.parse(await fs.readFile(manifestFile, "utf8"));
    const after = new Map(await Promise.all(active.members.map(async (id: string) => [id, await fs.readFile(ticketFile(id), "utf8")] as const)));
    const declaring = parseItem(after.get(a.id)!);
    const pending = {
      schema: 1,
      state: "pending",
      transaction_id: "00000000-0000-4000-8000-000000000001",
      request_sha256: active.request_sha256,
      batch_id: active.batch_id,
      controller: active.controller,
      controller_run: active.controller_run,
      frozen_at: active.frozen_at,
      members: active.members,
      workspace: active.workspace,
      branch: active.branch,
      take: {
        ticket_id: a.id,
        branch: take.branch,
        worktree: declaring.worktree ?? null,
        stage: "implementing",
        from_stage: "implementing",
        assignee: take.assignee,
        controller_label: take.controller,
        controller_run: take.controllerRun,
        worker_run: take.workerRun,
        provider: take.provider,
        phase: take.phase,
        expected_revision: null,
        force: false,
      },
      lease_id: declaring.lease_id,
      claim_expires_at: declaring.claim_expires_at,
      documents_sha256: digest(JSON.stringify([])),
      writes: active.members.map((id: string) => ({
        id,
        before_sha256: digest(before.get(id)!),
        after_sha256: digest(after.get(id)!),
      })),
    };
    for (const id of active.members) await fs.writeFile(ticketFile(id), before.get(id)!, "utf8");
    await fs.writeFile(activityFile, activityBefore, "utf8");
    await fs.writeFile(manifestFile, `${JSON.stringify(pending, null, 2)}\n`, "utf8");
    return {
      a, b, c, ids: active.members as string[], before, after, pending, manifestFile,
      take: { ...take, batchMembers: active.members as string[] },
    };
  }

  async function retryPending(fixture: Awaited<ReturnType<typeof manualPendingFixture>>) {
    return store.takeTicket(fixture.a.id, fixture.take);
  }

  it("binds admission, renewal and transfer to the observed batch actor", async () => {
    const { a, b, first } = await threeMemberBatch();
    const foreign = new KanmerStore(root, { actor: "foreign-actor" });
    const competingRun = new KanmerStore(root, { actor: "test-actor" });
    const before = await fs.readFile(ticketFile(b.id), "utf8");
    await expect(foreign.takeTicket(b.id, {
      ...batchWorkspace,
      actor: "foreign-actor",
      assignee: "ctl-a",
      controller: "test-actor",
    })).rejects.toThrow(/^BATCH_OWNER_MISMATCH:.*belongs to test-actor/u);
    await expect(competingRun.takeTicket(b.id, {
      ...batchWorkspace,
      controllerRun: "competing-controller-run",
      assignee: "ctl-a",
      controller: "test-actor",
    })).rejects.toThrow(/^BATCH_OWNER_MISMATCH:.*belongs to controller run controller-run/u);
    await expect(competingRun.takeTicket(b.id, {
      branch: batchWorkspace.branch,
      worktree: batchWorkspace.worktree,
      assignee: "ctl-a",
    })).rejects.toThrow(/^BATCH_RUN_REQUIRED:/u);
    await expect(store.renewTicket(a.id, {
      actor: "ctl-a",
      leaseId: first.lease_id,
      leaseRevision: first.lease_revision,
    })).rejects.toThrow(/^BATCH_OWNER_MISMATCH:.*belongs to test-actor/u);
    const batchCas = {
      actor: " test-actor ",
      controllerRun: "controller-run",
      leaseId: first.lease_id,
      leaseRevision: first.lease_revision,
    };
    const firstBeforeRenew = await fs.readFile(ticketFile(a.id), "utf8");
    await expect(store.renewTicket(a.id, {
      actor: "test-actor",
      leaseId: first.lease_id,
      leaseRevision: first.lease_revision,
    })).rejects.toThrow(/^BATCH_RUN_REQUIRED:/u);
    await expect(store.renewTicket(a.id, {
      actor: "test-actor",
      controllerRun: "competing-controller-run",
      leaseId: first.lease_id,
      leaseRevision: first.lease_revision,
    })).rejects.toThrow(/^BATCH_OWNER_MISMATCH:.*controller run controller-run/u);
    await expect(store.renewTicket(a.id, {
      actor: "test-actor",
      controllerRun: "controller-run",
    })).rejects.toThrow(/^LEASE_ID_REQUIRED:.*modern batch lease/u);
    await expect(store.renewTicket(a.id, {
      actor: "test-actor",
      controllerRun: "controller-run",
      leaseId: first.lease_id,
    })).rejects.toThrow(/^LEASE_REVISION_REQUIRED:/u);
    await expect(store.renewTicket(a.id, {
      actor: "test-actor",
      controllerRun: "controller-run",
      leaseRevision: first.lease_revision,
    })).rejects.toThrow(/^LEASE_ID_REQUIRED:/u);
    await expect(store.renewTicket(a.id, {
      actor: "test-actor",
      controllerRun: "controller-run",
      leaseId: "not-current",
      leaseRevision: first.lease_revision,
    })).rejects.toThrow(/^LEASE_EXPIRED:/u);
    expect(await fs.readFile(ticketFile(a.id), "utf8")).toBe(firstBeforeRenew);
    const raced = await Promise.allSettled([
      store.renewTicket(a.id, batchCas),
      store.renewTicket(a.id, batchCas),
    ]);
    expect(raced.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(raced.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((raced.find((result) => result.status === "rejected") as PromiseRejectedResult).reason.message)
      .toMatch(/^Conflict:/u);
    expect((await store.getItem(a.id))!.lease_revision).toBe(2);
    await expect(store.transferTicket(a.id, { assignee: "test-actor" })).rejects.toThrow(/^BATCH_INVALID:.*per-member transfer/u);
    expect(await fs.readFile(ticketFile(b.id), "utf8")).toBe(before);
  });

  it("persists the canonical controller run after a padded renewal and keeps the batch operable", async () => {
    const { a, b, c, first } = await threeMemberBatch();
    const renewed = await store.renewTicket(a.id, {
      actor: " test-actor ",
      controllerRun: " controller-run ",
      leaseId: first.lease_id,
      leaseRevision: first.lease_revision,
    });

    expect(renewed.lease_controller_run).toBe("controller-run");
    expect((await store.batchState(a.id))?.declaration).toBe("consistent");
    await expect(store.takeTicket(b.id, {
      ...batchWorkspace,
      assignee: "ctl-a",
      batch: "batch-a",
    })).resolves.toMatchObject({ lease_controller_run: "controller-run" });

    for (const id of [a.id, b.id, c.id]) await walkToDone(id);
    for (const id of [a.id, b.id, c.id]) await store.releaseTicket(id);
    expect(await store.batchState(a.id)).toBeNull();
  });

  it("requires a durable controller run before writing a batch declaration", async () => {
    const a = await store.createItem({ ...free, title: "A" });
    const b = await store.createItem({ ...free, title: "B" });
    const before = await snapshotBoardFiles();
    await expect(store.takeTicket(a.id, {
      branch: "batch-no-run",
      worktree: ".worktrees/batch-no-run",
      assignee: "ctl-a",
      batch: "batch-no-run",
      batchMembers: [a.id, b.id],
    })).rejects.toThrow(/^BATCH_RUN_REQUIRED:/u);
    expect(await snapshotBoardFiles()).toEqual(before);
  });

  it("requires a concrete batch worktree before any declaration write while preserving isolated branch-only takes", async () => {
    const a = await store.createItem({ ...free, title: "Missing worktree A" });
    const b = await store.createItem({ ...free, title: "Missing worktree B" });
    const transactionDir = path.join(root, ".kanmer", "batches", "transactions");
    const before = await snapshotBoardFiles();
    const declaration = {
      branch: "batch-missing-worktree",
      assignee: "ctl-a",
      controllerRun: "controller-run",
      batch: "batch-missing-worktree",
      batchMembers: [a.id, b.id],
    };

    await expect(store.takeTicket(a.id, declaration)).rejects.toThrow(/^BATCH_WORKSPACE_INVALID:/u);
    await expect(store.takeTicket(a.id, { ...declaration, worktree: "   " })).rejects.toThrow(/^BATCH_WORKSPACE_INVALID:/u);
    expect(await snapshotBoardFiles()).toEqual(before);
    await expect(fs.stat(transactionDir)).rejects.toMatchObject({ code: "ENOENT" });

    const isolated = await store.createItem({ ...free, title: "Isolated branch-only" });
    const isolatedTake = await store.takeTicket(isolated.id, {
      branch: "isolated-branch-only",
      assignee: "ctl-isolated",
    });
    expect(isolatedTake.branch).toBe("isolated-branch-only");
    expect(isolatedTake.worktree).toBeUndefined();
    expect(isolatedTake.lease_batch).toBeUndefined();
  });

  it("retains only a compact authoritative manifest and includes the caller in the all-terminal release gate", async () => {
    const { a, b, c } = await threeMemberBatch();
    const manifestDir = path.join(root, ".kanmer", "batches", "transactions");
    const files = (await fs.readdir(manifestDir)).filter((name) => name.endsWith(".json"));
    expect(files).toHaveLength(1);
    const manifest = JSON.parse(await fs.readFile(path.join(manifestDir, files[0]!), "utf8"));
    expect(Object.keys(manifest).sort()).toEqual([
      "batch_id", "branch", "controller", "controller_run", "declaring_ticket", "frozen_at", "members",
      "request_sha256", "schema", "state", "workspace",
    ].sort());
    expect(manifest).toMatchObject({ state: "active", batch_id: "batch-a", controller: "test-actor", declaring_ticket: a.id });
    await expect(store.releaseTicket(a.id)).rejects.toThrow(
      new RegExp(`^BATCH_ACTIVE:.*"${a.id}" [(]implementing[)].*"${b.id}" [(]implementing[)].*"${c.id}" [(]implementing[)]`, "u"),
    );
  });

  it("an active response-loss retry validates every direct roster endpoint and refuses a contradictory member without writing", async () => {
    const { a, b, c } = await threeMemberBatch();
    const manifestFile = await onlyManifestFile();
    const broken = parseItem(await fs.readFile(ticketFile(b.id), "utf8"));
    broken.lease_batch_controller = "different-controller";
    await fs.writeFile(ticketFile(b.id), serialiseItem(broken), "utf8");
    const paths = [ticketFile(a.id), ticketFile(b.id), ticketFile(c.id), manifestFile];
    const before = await Promise.all(paths.map((file) => fs.readFile(file, "utf8")));

    await expect(retryFirstTake(a, b, c)).rejects.toThrow(/^BATCH_INCONSISTENT:.*complete roster/u);
    expect(await Promise.all(paths.map((file) => fs.readFile(file, "utf8")))).toEqual(before);
  });

  it("an active response-loss retry refuses a missing member and retains every surviving byte", async () => {
    const { a, b, c } = await threeMemberBatch();
    const manifestFile = await onlyManifestFile();
    await fs.rm(path.dirname(ticketFile(c.id)), { recursive: true, force: true });
    const paths = [ticketFile(a.id), ticketFile(b.id), manifestFile];
    const before = await Promise.all(paths.map((file) => fs.readFile(file, "utf8")));

    await expect(retryFirstTake(a, b, c)).rejects.toThrow(new RegExp(`^BATCH_INCONSISTENT:.*"${c.id}" is missing`, "u"));
    expect(await Promise.all(paths.map((file) => fs.readFile(file, "utf8")))).toEqual(before);
  });

  it("an active response-loss retry refuses an extra stamped member and retains all bytes", async () => {
    const { a, b, c } = await threeMemberBatch();
    const manifestFile = await onlyManifestFile();
    const outsider = await store.createItem({ ...free, title: "Outsider" });
    const extra = parseItem(await fs.readFile(ticketFile(outsider.id), "utf8"));
    extra.lease_batch = "batch-a";
    extra.lease_batch_controller = "test-actor";
    extra.lease_batch_frozen_at = (await store.getItem(a.id))!.lease_batch_frozen_at;
    await fs.writeFile(ticketFile(outsider.id), serialiseItem(extra), "utf8");
    const paths = [ticketFile(a.id), ticketFile(b.id), ticketFile(c.id), ticketFile(outsider.id), manifestFile];
    const before = await Promise.all(paths.map((file) => fs.readFile(file, "utf8")));

    await expect(retryFirstTake(a, b, c)).rejects.toThrow(/^BATCH_INCONSISTENT:.*extra stamped member/u);
    expect(await Promise.all(paths.map((file) => fs.readFile(file, "utf8")))).toEqual(before);
  });

  it("an active response-loss retry fails closed on a census warning without writing", async () => {
    const { a, b, c } = await threeMemberBatch();
    const manifestFile = await onlyManifestFile();
    const badDir = path.join(root, ".kanmer", "areas", "_none", "BROKEN-001");
    const badFile = path.join(badDir, "BROKEN-001.md");
    await fs.mkdir(badDir, { recursive: true });
    await fs.writeFile(badFile, "---\nid: BROKEN-001\ntype: ticket\nstatus: [\n---\n", "utf8");
    const paths = [ticketFile(a.id), ticketFile(b.id), ticketFile(c.id), manifestFile, badFile];
    const before = await Promise.all(paths.map((file) => fs.readFile(file, "utf8")));

    await expect(retryFirstTake(a, b, c)).rejects.toThrow(/^BATCH_INCONSISTENT: complete ticket census has 1 unreadable item file/u);
    expect(await Promise.all(paths.map((file) => fs.readFile(file, "utf8")))).toEqual(before);
  });

  it("rejects padded workspace inputs and an invalid in-memory pending journal before creating the WAL", async () => {
    const a = await store.createItem({ ...free, title: "A" });
    const b = await store.createItem({ ...free, title: "B" });
    const transactionDir = path.join(root, ".kanmer", "batches", "transactions");
    const paths = [ticketFile(a.id), ticketFile(b.id)];
    const before = await Promise.all(paths.map((file) => fs.readFile(file, "utf8")));
    const declaration = {
      assignee: "ctl-a",
      controllerRun: "controller-run",
      batch: "batch-a",
      batchMembers: [a.id, b.id],
    };

    await expect(store.takeTicket(a.id, {
      ...declaration,
      branch: " batch-a ",
      worktree: ".worktrees/batch-a",
    })).rejects.toThrow(/^WORKSPACE_INVALID: branch/u);
    await expect(store.takeTicket(a.id, {
      ...declaration,
      branch: "batch-a",
      worktree: " .worktrees/batch-a ",
    })).rejects.toThrow(/^WORKSPACE_INVALID: worktree/u);
    const invalidActorStore = new KanmerStore(root, { actor: "   " });
    await expect(invalidActorStore.takeTicket(a.id, {
      ...declaration,
      branch: "batch-a",
      worktree: ".worktrees/batch-a",
    })).rejects.toThrow(/^BATCH_TRANSACTION_INVALID: derived declaration journal/u);

    expect(await Promise.all(paths.map((file) => fs.readFile(file, "utf8")))).toEqual(before);
    await expect(fs.stat(transactionDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects an out-of-repository batch worktree before writing a manifest or ticket", async () => {
    const a = await store.createItem({ ...free, title: "Outside A" });
    const b = await store.createItem({ ...free, title: "Outside B" });
    const transactionDir = path.join(root, ".kanmer", "batches", "transactions");
    const before = await snapshotBoardFiles();

    await expect(store.takeTicket(a.id, {
      branch: "outside-batch",
      worktree: path.resolve(root, "..", `${path.basename(root)}-outside`, "batch"),
      assignee: "ctl-a",
      controllerRun: "controller-run",
      batch: "outside-batch",
      batchMembers: [a.id, b.id],
    })).rejects.toThrow(/^BATCH_WORKSPACE_INVALID:.*outside this repository/u);

    expect(await snapshotBoardFiles()).toEqual(before);
    await expect(fs.stat(transactionDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects a mixed delivery-target roster before writing a manifest or ticket", async () => {
    await store.updateBoard((board) => ({
      ...board,
      delivery: {
        integrationBranch: "dev",
        releaseBranch: "main",
        releaseCandidatePattern: "release/*",
        hotfixBackport: true,
      },
    }));
    const ordinary = await store.createItem({ ...free, title: "Ordinary" });
    const hotfix = await store.createItem({ ...free, title: "Hotfix" });
    await store.updateItem(hotfix.id, { delivery_branch: "main" });
    const transactionDir = path.join(root, ".kanmer", "batches", "transactions");
    const before = await snapshotBoardFiles();

    await expect(store.takeTicket(ordinary.id, {
      branch: "mixed-target-batch",
      worktree: ".worktrees/mixed-target-batch",
      assignee: "ctl-a",
      controllerRun: "controller-run",
      batch: "mixed-target-batch",
      batchMembers: [ordinary.id, hotfix.id],
    })).rejects.toThrow(/^BATCH_INVALID:.*incompatible PR targets.*dev.*main.*one frozen batch must share one PR target/su);

    expect(await snapshotBoardFiles()).toEqual(before);
    await expect(fs.stat(transactionDir)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps an active batch portable across a repository copy and accepts an absolute local retry and later member take", async () => {
    const a = await store.createItem({ ...free, title: "Portable active A" });
    const b = await store.createItem({ ...free, title: "Portable active B" });
    const c = await store.createItem({ ...free, title: "Portable active C" });
    const portableWorktree = ".worktrees/portable-active";
    const declaration = {
      branch: "portable-active",
      worktree: path.join(root, ".worktrees", "portable-active"),
      assignee: "ctl-a",
      controllerRun: "controller-run",
      batch: "portable-active",
      batchMembers: [a.id, b.id, c.id],
    };
    const first = await store.takeTicket(a.id, declaration);
    const originalManifest = JSON.parse(await fs.readFile(batchManifestFile("portable-active"), "utf8"));
    expect(originalManifest.workspace).toBe(`worktree:${portableWorktree}`);
    expect(first).toMatchObject({ worktree: portableWorktree, lease_workspace: `worktree:${portableWorktree}` });

    const relocated = path.join(root, "relocated-active");
    await fs.mkdir(relocated, { recursive: true });
    await fs.cp(path.join(root, ".kanmer"), path.join(relocated, ".kanmer"), { recursive: true });
    const relocatedStore = new KanmerStore(relocated, { actor: "test-actor" });
    const relocatedWorktree = path.join(relocated, ".worktrees", "portable-active");
    const retried = await relocatedStore.takeTicket(a.id, { ...declaration, worktree: relocatedWorktree });
    expect(retried).toMatchObject({ worktree: portableWorktree, lease_workspace: `worktree:${portableWorktree}` });

    const second = await relocatedStore.takeTicket(b.id, {
      branch: declaration.branch,
      worktree: relocatedWorktree,
      assignee: "ctl-a",
      controllerRun: "controller-run",
      batch: declaration.batch,
    });
    expect(second).toMatchObject({ worktree: portableWorktree, lease_workspace: `worktree:${portableWorktree}` });
    expect((await relocatedStore.batchState(c.id))?.declaration).toBe("consistent");
    const relocatedManifest = JSON.parse(await fs.readFile(
      path.join(relocated, ".kanmer", "batches", "transactions", path.basename(batchManifestFile("portable-active"))),
      "utf8",
    ));
    expect(relocatedManifest).toMatchObject({
      workspace: `worktree:${portableWorktree}`,
      request_sha256: originalManifest.request_sha256,
    });
  });

  it.skipIf(process.platform !== "win32")("case-folds equivalent Windows batch paths into one portable identity and request fingerprint", async () => {
    const a = await store.createItem({ ...free, title: "Case A" });
    const b = await store.createItem({ ...free, title: "Case B" });
    const declaration = {
      branch: "case-batch",
      worktree: path.join(root, ".WORKTREES", "CASE-BATCH").toUpperCase(),
      assignee: "ctl-a",
      controllerRun: "controller-run",
      batch: "case-batch",
      batchMembers: [a.id, b.id],
    };
    const first = await store.takeTicket(a.id, declaration);
    const manifestBefore = JSON.parse(await fs.readFile(batchManifestFile("case-batch"), "utf8"));
    expect(first).toMatchObject({
      worktree: ".worktrees/case-batch",
      lease_workspace: "worktree:.worktrees/case-batch",
    });

    await expect(store.takeTicket(a.id, {
      ...declaration,
      worktree: path.join(root, ".worktrees", "case-batch").toLowerCase(),
    })).resolves.toMatchObject({ id: a.id, worktree: ".worktrees/case-batch" });
    const manifestAfter = JSON.parse(await fs.readFile(batchManifestFile("case-batch"), "utf8"));
    expect(manifestAfter.request_sha256).toBe(manifestBefore.request_sha256);
  });

  it("uses canonical worktree plus branch as manifest authority when a ticket-local lease_workspace is absolute", async () => {
    const { a, b, c, first } = await threeMemberBatch();
    const absoluteLeaseWorkspace = `worktree:${path.join(root, ".worktrees", "batch-a")}`;
    const changed = parseItem(await fs.readFile(ticketFile(a.id), "utf8"));
    changed.lease_workspace = absoluteLeaseWorkspace;
    await fs.writeFile(ticketFile(a.id), serialiseItem(changed), "utf8");

    expect((await store.batchState(a.id))?.declaration).toBe("consistent");
    await expect(retryFirstTake(a, b, c)).resolves.toMatchObject({
      id: a.id,
      lease_workspace: absoluteLeaseWorkspace,
    });
    const renewed = await store.renewTicket(a.id, {
      actor: "test-actor",
      controllerRun: "controller-run",
      leaseId: first.lease_id,
      leaseRevision: first.lease_revision,
    });
    expect(renewed.lease_workspace).toBe("worktree:.worktrees/batch-a");
  });

  it("recovers a pending declaration after a repository copy and retains its canonical request fingerprint", async () => {
    const fixture = await manualPendingFixture(
      "portable-pending",
      path.join(root, ".worktrees", "portable-pending"),
    );
    const portableWorktree = ".worktrees/portable-pending";
    expect(fixture.pending).toMatchObject({
      workspace: `worktree:${portableWorktree}`,
      take: { worktree: portableWorktree },
    });

    const relocated = path.join(root, "relocated-pending");
    await fs.mkdir(relocated, { recursive: true });
    await fs.cp(path.join(root, ".kanmer"), path.join(relocated, ".kanmer"), { recursive: true });
    const relocatedStore = new KanmerStore(relocated, { actor: "test-actor" });
    const relocatedWorktree = path.join(relocated, ".worktrees", "portable-pending");
    const recovered = await relocatedStore.takeTicket(fixture.a.id, {
      ...fixture.take,
      worktree: relocatedWorktree,
    });
    expect(recovered).toMatchObject({ worktree: portableWorktree, lease_workspace: `worktree:${portableWorktree}` });

    const second = await relocatedStore.takeTicket(fixture.b.id, {
      branch: fixture.take.branch,
      worktree: relocatedWorktree,
      assignee: "ctl-a",
      controllerRun: "controller-run",
      batch: "portable-pending",
    });
    expect(second).toMatchObject({ worktree: portableWorktree, lease_workspace: `worktree:${portableWorktree}` });
    const relocatedManifest = JSON.parse(await fs.readFile(
      path.join(relocated, ".kanmer", "batches", "transactions", path.basename(fixture.manifestFile)),
      "utf8",
    ));
    expect(relocatedManifest).toMatchObject({
      state: "active",
      workspace: `worktree:${portableWorktree}`,
      request_sha256: fixture.pending.request_sha256,
    });
  });

  it("rolls a hash-only pending declaration forward from the WAL and every sorted member boundary", async () => {
    for (const applied of [0, 1, 2, 3]) {
      const fixture = await manualPendingFixture(`recover-${applied}`);
      for (const id of fixture.ids.slice(0, applied)) {
        await fs.writeFile(ticketFile(id), fixture.after.get(id)!, "utf8");
      }

      const recovered = await retryPending(fixture);
      expect(recovered.id).toBe(fixture.a.id);
      expect(recovered.lease_batch).toBe(`recover-${applied}`);
      expect(await Promise.all(fixture.ids.map((id) => fs.readFile(ticketFile(id), "utf8"))))
        .toEqual(fixture.ids.map((id) => fixture.after.get(id)!));
      const active = JSON.parse(await fs.readFile(fixture.manifestFile, "utf8"));
      expect(active).toMatchObject({
        schema: 1,
        state: "active",
        batch_id: `recover-${applied}`,
        declaring_ticket: fixture.a.id,
        members: fixture.ids,
      });
      expect(Object.keys(active).sort()).toEqual([
        "batch_id", "branch", "controller", "controller_run", "declaring_ticket", "frozen_at", "members",
        "request_sha256", "schema", "state", "workspace",
      ].sort());
      const matching = [];
      for (const entry of await fs.readdir(path.dirname(fixture.manifestFile))) {
        if (!entry.endsWith(".json")) continue;
        const candidate = JSON.parse(await fs.readFile(path.join(path.dirname(fixture.manifestFile), entry), "utf8"));
        if (candidate.batch_id === `recover-${applied}`) matching.push(candidate);
      }
      expect(matching).toHaveLength(1);
    }
  });

  it("retains the pending WAL and every endpoint when actor, roster, workspace or first-take intent changes", async () => {
    const fixture = await manualPendingFixture("intent-conflict");
    const foreign = new KanmerStore(root, { actor: "foreign-actor" });
    const attempts: Array<{ name: string; run: () => Promise<unknown>; error: RegExp }> = [
      {
        name: "actor",
        run: () => foreign.takeTicket(fixture.a.id, fixture.take),
        error: /^BATCH_OWNER_MISMATCH:/u,
      },
      {
        name: "roster",
        run: () => store.takeTicket(fixture.a.id, { ...fixture.take, batchMembers: [fixture.a.id, fixture.b.id] }),
        error: /^BATCH_TRANSACTION_CONFLICT:/u,
      },
      {
        name: "workspace",
        run: () => store.takeTicket(fixture.a.id, { ...fixture.take, worktree: ".worktrees/other" }),
        error: /^BATCH_TRANSACTION_CONFLICT:/u,
      },
      {
        name: "first-take intent",
        run: () => store.takeTicket(fixture.a.id, { ...fixture.take, controllerRun: "different-controller-run" }),
        error: /^BATCH_OWNER_MISMATCH:/u,
      },
    ];
    const retained = await snapshotBoardFiles();
    for (const attempt of attempts) {
      await expect(attempt.run(), attempt.name).rejects.toThrow(attempt.error);
      expect(await snapshotBoardFiles(), attempt.name).toEqual(retained);
    }
    expect(JSON.parse(await fs.readFile(fixture.manifestFile, "utf8"))).toEqual(fixture.pending);
  });

  it("blocks every ticket mutation surface while its batch declaration is pending", async () => {
    const fixture = await manualPendingFixture("mutation-guard");
    const mutations: Array<{ name: string; run: () => Promise<unknown> }> = [
      { name: "update", run: () => store.updateItem(fixture.a.id, { priority: "high" }) },
      { name: "move", run: () => store.moveItem(fixture.a.id, { status: "review" }) },
      { name: "take", run: () => store.takeTicket(fixture.a.id, { branch: "isolated" }) },
      { name: "renew", run: () => store.renewTicket(fixture.a.id, { actor: "test-actor" }) },
      { name: "transfer", run: () => store.transferTicket(fixture.a.id, { assignee: "new-owner" }) },
      {
        name: "applyReconciliation",
        run: () => store.applyReconciliation(fixture.a.id, {
          action: "MOVE_TO_VERIFYING",
          targetStatus: "verifying",
          expectedRevision: "0".repeat(64),
        }),
      },
      { name: "setDoc", run: () => store.setDoc(fixture.a.id, "plan", "# Changed") },
      { name: "appendScratch", run: () => store.appendScratch(fixture.a.id, "execution", "changed") },
      { name: "delete", run: () => store.deleteItem(fixture.a.id) },
    ];
    const retained = await snapshotBoardFiles();
    for (const mutation of mutations) {
      await expect(mutation.run(), mutation.name).rejects.toThrow(/^(?:BATCH_TRANSACTION_PENDING|BATCH_ACTIVE|BATCH_INVALID):/u);
      expect(await snapshotBoardFiles(), mutation.name).toEqual(retained);
    }
  });

  it("fails closed and retains a malformed pending manifest", async () => {
    const fixture = await manualPendingFixture("malformed-wal");
    const malformed = `${JSON.stringify({ ...fixture.pending, unexpected: true }, null, 2)}\n`;
    await fs.writeFile(fixture.manifestFile, malformed, "utf8");
    const retained = await snapshotBoardFiles();
    await expect(retryPending(fixture)).rejects.toThrow(/^BATCH_TRANSACTION_INVALID:/u);
    expect(await snapshotBoardFiles()).toEqual(retained);
    expect(await fs.readFile(fixture.manifestFile, "utf8")).toBe(malformed);
  });

  it("fails closed and retains an unexpected transaction-directory entry", async () => {
    const fixture = await manualPendingFixture("unexpected-entry");
    const unexpected = path.join(path.dirname(fixture.manifestFile), "operator-note.txt");
    await fs.writeFile(unexpected, "retain me\n", "utf8");
    const retained = await snapshotBoardFiles();
    await expect(retryPending(fixture)).rejects.toThrow(/^BATCH_TRANSACTION_INVALID: unexpected batch declaration manifest operator-note\.txt was retained/u);
    expect(await snapshotBoardFiles()).toEqual(retained);
  });

  it("preflights all members and retains an unexpected ticket byte without rolling any member forward", async () => {
    const fixture = await manualPendingFixture("unexpected-member");
    const unexpected = `${fixture.before.get(fixture.b.id)!}\n`;
    await fs.writeFile(ticketFile(fixture.b.id), unexpected, "utf8");
    const retained = await snapshotBoardFiles();
    await expect(retryPending(fixture)).rejects.toThrow(new RegExp(
      `^BATCH_TRANSACTION_CONFLICT: member "${fixture.b.id}" differs from both the observed and intended bytes`,
      "u",
    ));
    expect(await snapshotBoardFiles()).toEqual(retained);
    expect(await fs.readFile(ticketFile(fixture.a.id), "utf8")).toBe(fixture.before.get(fixture.a.id));
  });

  it("retains the pending WAL and a declaring-document drift without writing any member", async () => {
    const fixture = await manualPendingFixture("document-drift");
    const planDir = path.join(path.dirname(ticketFile(fixture.a.id)), "plan");
    const planFile = path.join(planDir, "main.md");
    await fs.mkdir(planDir, { recursive: true });
    await fs.writeFile(planFile, "# Concurrent plan\n", "utf8");
    const retained = await snapshotBoardFiles();
    await expect(retryPending(fixture)).rejects.toThrow(/^BATCH_TRANSACTION_CONFLICT: document-inclusive evidence/u);
    expect(await snapshotBoardFiles()).toEqual(retained);
    expect(await fs.readFile(planFile, "utf8")).toBe("# Concurrent plan\n");
  });

  it("retains both authoritative records when two batch manifests overlap", async () => {
    const a = await store.createItem({ ...free, title: "Overlap A" });
    const b = await store.createItem({ ...free, title: "Overlap B" });
    const c = await store.createItem({ ...free, title: "Overlap C" });
    const d = await store.createItem({ ...free, title: "Overlap D" });
    await store.takeTicket(a.id, {
      branch: "overlap-a", worktree: ".worktrees/overlap-a", assignee: "ctl-a",
      controllerRun: "controller-run",
      batch: "overlap-a", batchMembers: [a.id, b.id],
    });
    await store.takeTicket(c.id, {
      branch: "overlap-b", worktree: ".worktrees/overlap-b", assignee: "ctl-a",
      controllerRun: "controller-run",
      batch: "overlap-b", batchMembers: [c.id, d.id],
    });
    const firstFile = batchManifestFile("overlap-a");
    const secondFile = batchManifestFile("overlap-b");
    const second = JSON.parse(await fs.readFile(secondFile, "utf8"));
    second.members = [b.id, c.id, d.id].sort((left, right) => left.localeCompare(right));
    await fs.writeFile(secondFile, `${JSON.stringify(second, null, 2)}\n`, "utf8");
    const retained = await snapshotBoardFiles();

    await expect(store.batchState(a.id)).rejects.toThrow(/^BATCH_TRANSACTION_INVALID:.*overlapping batch manifests/u);
    expect(await snapshotBoardFiles()).toEqual(retained);
    expect(await fs.readFile(firstFile, "utf8")).toBe(retained[path.relative(path.join(root, ".kanmer"), firstFile).replaceAll("\\", "/")]);
    expect(await fs.readFile(secondFile, "utf8")).toBe(retained[path.relative(path.join(root, ".kanmer"), secondFile).replaceAll("\\", "/")]);
  });

  it("release retries retain first-mutation CAS and recover after intermediate and final clears", async () => {
    const { a, b, c } = await threeMemberBatch();
    await walkToDone(a.id);
    await walkToDone(b.id);
    await walkToDone(c.id);
    const revisionA = (await store.getRevision(a.id))!.revision;
    const revisionB = (await store.getRevision(b.id))!.revision;
    const revisionC = (await store.getRevision(c.id))!.revision;
    const manifestFile = await onlyManifestFile();
    const activeManifest = await fs.readFile(manifestFile, "utf8");
    const activeA = await fs.readFile(ticketFile(a.id), "utf8");
    expect(JSON.parse(activeManifest).state).toBe("active");
    for (const id of [a.id, b.id, c.id]) {
      expect(await fs.readFile(ticketFile(id), "utf8")).toMatch(/^lease_batch: batch-a$/mu);
    }

    await expect(store.releaseTicket(a.id, { expectedRevision: "0".repeat(64) })).rejects.toThrow(/^Conflict:/u);
    expect(await fs.readFile(ticketFile(a.id), "utf8")).toBe(activeA);
    expect(await fs.readFile(manifestFile, "utf8")).toBe(activeManifest);

    await store.releaseTicket(a.id, { expectedRevision: revisionA });
    const clearedA = await fs.readFile(ticketFile(a.id), "utf8");
    const releasingManifest = await fs.readFile(manifestFile, "utf8");
    expect(JSON.parse(releasingManifest)).toMatchObject({ state: "releasing", batch_id: "batch-a" });
    await store.releaseTicket(a.id, { expectedRevision: revisionA });
    expect(await fs.readFile(ticketFile(a.id), "utf8")).toBe(clearedA);
    expect(await fs.readFile(manifestFile, "utf8")).toBe(releasingManifest);

    await store.releaseTicket(b.id, { expectedRevision: revisionB });
    expect(await fs.readFile(manifestFile, "utf8")).toBe(releasingManifest);
    expect(await fs.readFile(ticketFile(a.id), "utf8")).not.toMatch(/^lease_batch:/mu);
    expect(await fs.readFile(ticketFile(b.id), "utf8")).not.toMatch(/^lease_batch:/mu);
    expect(await fs.readFile(ticketFile(c.id), "utf8")).toMatch(/^lease_batch: batch-a$/mu);

    // Let the ordinary last clear remove the manifest, then restore only that
    // exact releasing record: this is the crash boundary after the ticket
    // rename committed but before the manifest unlink became durable.
    await store.releaseTicket(c.id, { expectedRevision: revisionC });
    const clearedC = await fs.readFile(ticketFile(c.id), "utf8");
    await expect(fs.stat(manifestFile)).rejects.toMatchObject({ code: "ENOENT" });
    await fs.writeFile(manifestFile, releasingManifest, "utf8");
    const projections = await store.batchSummaryProjections();
    for (const id of [a.id, b.id, c.id]) {
      expect(projections.get(id)).toMatchObject({
        id: "batch-a",
        state: "releasing",
        members: [a.id, b.id, c.id],
        workspace: expect.stringContaining(".worktrees"),
        branch: "batch-a",
      });
    }
    await store.releaseTicket(c.id, { expectedRevision: revisionC });
    expect(await fs.readFile(ticketFile(c.id), "utf8")).toBe(clearedC);
    await expect(fs.stat(manifestFile)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("release reports the caller when it is the only nonterminal batch member", async () => {
    const { a, b, c } = await threeMemberBatch();
    await walkToDone(b.id);
    await walkToDone(c.id);
    let message = "";
    try {
      await store.releaseTicket(a.id);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(new RegExp(`^BATCH_ACTIVE:.*"${a.id}" [(]implementing[)]`, "u"));
    expect(message).not.toContain(`"${b.id}" (done)`);
    expect(message).not.toContain(`"${c.id}" (done)`);
  });

  it("delete preflights a releasing batch referrer before removing the target", async () => {
    const target = await store.createItem({ ...free, title: "Target" });
    const { a, b, c } = await threeMemberBatch();
    await store.updateItem(b.id, { links: [target.id], blocks: [target.id] });
    await walkToDone(a.id);
    await walkToDone(b.id);
    await walkToDone(c.id);
    await store.releaseTicket(a.id);
    const manifestFile = await onlyManifestFile();
    const paths = [ticketFile(target.id), ticketFile(a.id), ticketFile(b.id), ticketFile(c.id), manifestFile];
    const before = await Promise.all(paths.map((file) => fs.readFile(file, "utf8")));

    await expect(store.deleteItem(target.id)).rejects.toThrow(new RegExp(`^BATCH_ACTIVE:.*"${b.id}" belongs to releasing batch batch-a`, "u"));
    expect(await Promise.all(paths.map((file) => fs.readFile(file, "utf8")))).toEqual(before);
  });

  it("delete preflights a pending batch referrer before removing the target", async () => {
    const target = await store.createItem({ ...free, title: "Target" });
    const { a, b, c } = await threeMemberBatch();
    await store.updateItem(b.id, { links: [target.id] });
    const manifestFile = await onlyManifestFile();
    const active = JSON.parse(await fs.readFile(manifestFile, "utf8"));
    const declaring = (await store.getItem(a.id))!;
    const pending = {
      schema: 1,
      state: "pending",
      transaction_id: "00000000-0000-4000-8000-000000000001",
      request_sha256: active.request_sha256,
      batch_id: active.batch_id,
      controller: active.controller,
      controller_run: active.controller_run,
      frozen_at: active.frozen_at,
      members: active.members,
      workspace: active.workspace,
      branch: active.branch,
      take: {
        ticket_id: a.id,
        branch: batchWorkspace.branch,
        worktree: batchWorkspace.worktree,
        stage: "implementing",
        from_stage: "implementing",
        assignee: "ctl-a",
        controller_label: null,
        controller_run: active.controller_run,
        worker_run: null,
        provider: null,
        phase: "implementing",
        expected_revision: null,
        force: false,
      },
      lease_id: declaring.lease_id,
      claim_expires_at: declaring.claim_expires_at,
      documents_sha256: "0".repeat(64),
      writes: active.members.map((member: string) => ({
        id: member,
        before_sha256: "0".repeat(64),
        after_sha256: "0".repeat(64),
      })),
    };
    await fs.writeFile(manifestFile, `${JSON.stringify(pending, null, 2)}\n`, "utf8");
    const paths = [ticketFile(target.id), ticketFile(a.id), ticketFile(b.id), ticketFile(c.id), manifestFile];
    const before = await Promise.all(paths.map((file) => fs.readFile(file, "utf8")));

    await expect(store.deleteItem(target.id)).rejects.toThrow(new RegExp(`^BATCH_TRANSACTION_PENDING:.*"${b.id}" belongs to pending batch batch-a`, "u"));
    expect(await Promise.all(paths.map((file) => fs.readFile(file, "utf8")))).toEqual(before);
  });

  it("AC4: three related tickets complete in one frozen batch workspace with one PR/head attestation and three proofs", async () => {
    const { a, b, c, first } = await threeMemberBatch();
    // The first take declares and freezes the batch: every member carries the record, only the taker has a lease.
    expect(first.lease_batch).toBe("batch-a");
    expect(first.lease_batch_frozen_at).toBe(first.taken_at);
    for (const id of [b.id, c.id]) {
      const member = (await store.getItem(id))!;
      expect(member.lease_batch).toBe("batch-a");
      expect(member.lease_batch_frozen_at).toBe(first.taken_at);
      expect(member.taken_at).toBeUndefined();
      expect(member.lease_id).toBeUndefined();
      expect(member.status).toBe("implementing");
    }
    // Members join the same worktree and branch; each gets its own lease on the shared workspace.
    const second = await store.takeTicket(b.id, { ...batchWorkspace, assignee: "ctl-a", batch: "batch-a" });
    const third = await store.takeTicket(c.id, { ...batchWorkspace, assignee: "ctl-a" }); // batch inferred from the frozen record
    expect(second.lease_workspace).toBe(first.lease_workspace);
    expect(third.lease_workspace).toBe(first.lease_workspace);
    expect(new Set([first.lease_id, second.lease_id, third.lease_id]).size).toBe(3);
    const state = (await store.batchState(c.id))!;
    expect(state).toMatchObject({ id: "batch-a", frozenAt: first.taken_at, workspace: first.lease_workspace, allTerminal: false });
    expect(state.members.map((m) => [m.id, m.taken, m.terminal])).toEqual([[a.id, true, false], [b.id, true, false], [c.id, true, false]]);
    // One PR and one review head shared by every member; review mapping and proof stay per ticket.
    for (const id of [a.id, b.id, c.id]) {
      await store.updateItem(id, { prs: ["300"] });
      await store.setDoc(id, "scratch/review", sharedAttestation("300"));
      await store.setDoc(id, "proof", `# Proof — ${id}\n\nresult: PASS at ${HEAD}\n`);
    }
    for (const id of [a.id, b.id, c.id]) {
      expect(parseReviewAttestation(await store.getDoc(id, "scratch/review"))).toMatchObject({ state: "valid", pr: "300", headSha: HEAD });
      expect(await store.getDoc(id, "proof")).toContain(`Proof — ${id}`);
    }
    // Cleanup waits for all members: a Done member cannot release while a sibling is still in flight.
    await walkToDone(a.id);
    const before = await fs.readFile(ticketFile(a.id), "utf8");
    await expect(store.releaseTicket(a.id)).rejects.toThrow(new RegExp(`^BATCH_ACTIVE:.*"${b.id}" \\(implementing\\), "${c.id}" \\(implementing\\)`, "u"));
    expect(await fs.readFile(ticketFile(a.id), "utf8")).toBe(before);
    await walkToDone(b.id);
    await walkToDone(c.id);
    expect((await store.batchState(a.id))!.allTerminal).toBe(true);
    for (const id of [a.id, b.id, c.id]) {
      const released = await store.releaseTicket(id);
      expect(released.lease_batch).toBeUndefined();
      expect(released.lease_batch_frozen_at).toBeUndefined();
      expect(await fs.readFile(ticketFile(id), "utf8")).not.toMatch(/^lease_/mu);
    }
    expect(await store.batchState(a.id)).toBeNull();
  });

  it("AC5: an unrelated ticket can neither join a started batch nor share its workspace, even with force", async () => {
    const { a, b } = await threeMemberBatch();
    const x = await store.createItem({ ...free, title: "X" });
    const snapshot = async () => Promise.all([a.id, b.id, x.id].map((id) => fs.readFile(ticketFile(id), "utf8")));
    const before = await snapshot();
    // Joining: re-declaring the frozen batch with the stranger added is refused.
    await expect(store.takeTicket(x.id, { ...batchWorkspace, assignee: "ctl-b", batch: "batch-a", batchMembers: [a.id, b.id, x.id] })).rejects.toThrow(/^BATCH_FROZEN:.*batch batch-a started when "TICK-001" was taken/u);
    // Naming the batch without being a member is refused.
    await expect(store.takeTicket(x.id, { ...batchWorkspace, assignee: "ctl-b", batch: "batch-a" })).rejects.toThrow(/^BATCH_INVALID:.*not a member of batch batch-a/u);
    // Sharing: the batch worktree and branch are occupied for every non-member.
    await expect(store.takeTicket(x.id, { branch: "x", worktree: ".worktrees\\batch-a\\", assignee: "ctl-b" })).rejects.toThrow(/^WORKSPACE_OCCUPIED:.*batch batch-a — only its frozen members may take it/u);
    await expect(store.takeTicket(x.id, { branch: "batch-a", assignee: "ctl-b", force: true })).rejects.toThrow(/^WORKSPACE_OCCUPIED:/u);
    expect(await snapshot()).toEqual(before);
    expect((await store.getItem(x.id))!.lease_batch).toBeUndefined();
    // The stranger still works in isolation.
    expect((await store.takeTicket(x.id, { branch: "x", worktree: ".worktrees/x", assignee: "ctl-b" })).lease_batch).toBeUndefined();
  });

  it("a member occupies only the batch workspace: another worktree or branch is BATCH_WORKSPACE_MISMATCH", async () => {
    const { b } = await threeMemberBatch();
    const before = await fs.readFile(ticketFile(b.id), "utf8");
    await expect(store.takeTicket(b.id, { branch: "batch-a", worktree: ".worktrees/other", assignee: "ctl-a", controllerRun: "controller-run" })).rejects.toThrow(/^BATCH_WORKSPACE_MISMATCH:.*worktree \.worktrees\/batch-a on branch batch-a/u);
    await expect(store.takeTicket(b.id, { branch: "other", worktree: ".worktrees/batch-a", assignee: "ctl-a", controllerRun: "controller-run" })).rejects.toThrow(/^BATCH_WORKSPACE_MISMATCH:/u);
    await expect(store.takeTicket(b.id, { ...batchWorkspace, assignee: "ctl-a", batch: "batch-z" })).rejects.toThrow(/^BATCH_INVALID:.*frozen member of batch batch-a, not batch-z/u);
    expect(await fs.readFile(ticketFile(b.id), "utf8")).toBe(before);
  });

  it("refuses an invalid declaration before writing: too few members, the taker missing, a taken, done or otherwise-batched member", async () => {
    const a = await store.createItem({ ...free, title: "A" });
    const b = await store.createItem({ ...free, title: "B" });
    const taken = await store.createItem({ ...free, title: "T" });
    await store.takeTicket(taken.id, { branch: "t", worktree: ".worktrees/t", assignee: "ctl-c" });
    const done = await store.createItem({ ...free, title: "D", status: "done" });
    const other = await store.createItem({ ...free, title: "O" });
    const other2 = await store.createItem({ ...free, title: "O2" });
    await store.takeTicket(other.id, { branch: "o", worktree: ".worktrees/o", assignee: "ctl-c", controllerRun: "controller-run", batch: "batch-o", batchMembers: [other.id, other2.id] });
    const before = await fs.readFile(ticketFile(a.id), "utf8");
    const attempt = (members: string[], batch = "batch-a") => store.takeTicket(a.id, { ...batchWorkspace, assignee: "ctl-a", batch, batchMembers: members });
    await expect(attempt([a.id])).rejects.toThrow(/^BATCH_INVALID:.*two or more distinct member ids/u);
    await expect(attempt([a.id, a.id])).rejects.toThrow(/^BATCH_INVALID:.*two or more distinct member ids/u);
    await expect(attempt([b.id, taken.id])).rejects.toThrow(/^BATCH_INVALID:.*must be one of the members/u);
    await expect(attempt([a.id, taken.id])).rejects.toThrow(/^BATCH_INVALID:.*already taken/u);
    await expect(attempt([a.id, done.id])).rejects.toThrow(/^BATCH_INVALID:.*already done/u);
    await expect(attempt([a.id, other2.id])).rejects.toThrow(/^BATCH_INVALID:.*already belongs to batch batch-o/u);
    await expect(attempt([a.id, "TICK-999"])).rejects.toThrow(/^BATCH_INVALID:.*not a ticket on this board/u);
    await expect(store.takeTicket(a.id, { ...batchWorkspace, assignee: "ctl-a", batchMembers: [a.id, b.id] })).rejects.toThrow(/^BATCH_INVALID:.*without a batch id/u);
    expect(await fs.readFile(ticketFile(a.id), "utf8")).toBe(before);
    expect((await store.getItem(b.id))!.lease_batch).toBeUndefined();
    // A valid declaration after the refusals still works, and the frozen batch survives a force retake of a member.
    await attempt([a.id, b.id]);
    const retaken = await store.takeTicket(a.id, { ...batchWorkspace, assignee: "ctl-a", force: true });
    expect(retaken.lease_batch).toBe("batch-a");
    expect(retaken.lease_batch_frozen_at).toBeTruthy();
  });

  it("an archived (retired) member counts as terminal for cleanup", async () => {
    const { a, b, c } = await threeMemberBatch();
    await walkToDone(a.id);
    await walkToDone(b.id);
    await expect(store.releaseTicket(a.id)).rejects.toThrow(new RegExp(`^BATCH_ACTIVE:.*"${c.id}" \\(implementing\\)`, "u"));
    await store.moveItem(c.id, { status: "review" });
    await store.moveItem(c.id, { status: "verifying" });
    await store.updateItem(c.id, { archived: true });
    const state = (await store.batchState(a.id))!;
    expect(state.members.find((m) => m.id === c.id)).toMatchObject({ archived: true, terminal: true, status: "verifying" });
    expect(state.allTerminal).toBe(true);
    expect((await store.releaseTicket(a.id)).lease_batch).toBeUndefined();
  });

  it("serialises the batch record after the lease keys and round-trips it; a v0.3.12 ticket is untouched", async () => {
    const { a, b } = await threeMemberBatch();
    const raw = await fs.readFile(ticketFile(a.id), "utf8");
    expect(raw.indexOf("lease_heartbeat_at:")).toBeLessThan(raw.indexOf("lease_batch:"));
    expect(raw.indexOf("lease_batch:")).toBeLessThan(raw.indexOf("lease_batch_frozen_at:"));
    expect(raw.indexOf("lease_batch_frozen_at:")).toBeLessThan(raw.indexOf("labels:"));
    const reparsed = parseItem(serialiseItem(parseItem(raw)));
    expect(reparsed.lease_batch).toBe("batch-a");
    expect(reparsed.lease_batch_frozen_at).toBe((await store.getItem(a.id))!.lease_batch_frozen_at);
    const sibling = await fs.readFile(ticketFile(b.id), "utf8");
    expect(sibling).toMatch(/^lease_batch: batch-a$/mu);
    expect(sibling).not.toMatch(/^lease_id:/mu);
    const legacy = await store.createItem({ ...free, title: "Legacy" });
    expect(await fs.readFile(ticketFile(legacy.id), "utf8")).not.toMatch(/^lease_/mu);
    expect(await store.batchState(legacy.id)).toBeNull();
  });
});
