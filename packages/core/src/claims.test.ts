import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { parseItem, serialiseItem } from "./frontmatter.js";
import { claimState, isOperatorReason } from "./types.js";
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
