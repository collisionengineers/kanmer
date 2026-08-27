import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
  await fs.rm(root, { recursive: true, force: true });
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

  it("reclaim refuses a board-worktree or foreign-repository workspace without writing", async () => {
    const t = await store.createItem({ type: "ticket", title: "A", status: "implementing" });
    await store.takeTicket(t.id, { branch: "feat/x", worktree: "wt/x", assignee: "ctl-a" });
    await ageClaim(t.id, 31);
    const before = await fs.readFile(ticketFile(t.id), "utf8");
    const base = { workspace: "clean", pullRequest: "absent", commits: 0, proof: "absent" } as const;
    await expect(store.transferTicket(t.id, { assignee: "ctl-b", recovery: { ...base, claimIdentity: "unavailable", boardWorktree: true } })).rejects.toThrow(/^RECOVERY_REFUSED:.*board worktree/u);
    await expect(store.transferTicket(t.id, { assignee: "ctl-b", recovery: { ...base, claimIdentity: "foreign-repository", boardWorktree: false } })).rejects.toThrow(/^RECOVERY_REFUSED:.*different repository/u);
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
