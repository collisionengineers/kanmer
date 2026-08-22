import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { evaluateMergeGate, mergeGateOk, resolveMergeGateTicket } from "./merge-gate.js";
import { linkItems } from "./links.js";

let root: string;
let store: KanmerStore;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-merge-gate-"));
  store = new KanmerStore(root);
  await store.init();
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("resolveMergeGateTicket", () => {
  it("uses a whole-line footer, normalizes it, and gives it priority over the branch", () => {
    expect(resolveMergeGateTicket("Summary\r\nKanmer: core-024\r\n", "CORE-999-fix")).toEqual({
      ticketId: "CORE-024",
      source: "footer",
    });
  });

  it("accepts identical repeated footers and rejects distinct or invalid explicit footers", () => {
    expect(resolveMergeGateTicket("Kanmer: CORE-024\nKanmer: core-024", "CORE-999").ticketId).toBe("CORE-024");
    expect(resolveMergeGateTicket("Kanmer: CORE-024\nKanmer: CORE-025", "CORE-999")).toMatchObject({
      ticketId: null,
      source: null,
      error: expect.stringContaining("ambiguous"),
    });
    expect(resolveMergeGateTicket("Kanmer: CORE_024", "CORE-024-fix")).toMatchObject({
      ticketId: null,
      source: null,
      error: expect.stringContaining("invalid"),
    });
  });

  it("falls back only to an anchored alphanumeric branch prefix", () => {
    expect(resolveMergeGateTicket(null, "core-024-check-pr")).toEqual({
      ticketId: "CORE-024",
      source: "branch",
    });
    expect(resolveMergeGateTicket(null, "feature/core-024").ticketId).toBeNull();
    expect(resolveMergeGateTicket(null, "C-1-fix").ticketId).toBeNull();
  });
});

describe("KanmerStore.getOpenQuestionCount and evaluateMergeGate", () => {
  it("keeps future warning findings non-blocking while errors remain blocking", () => {
    expect(mergeGateOk([{ code: "NO_TICKET", level: "warning", message: "advisory" }])).toBe(true);
    expect(mergeGateOk([{ code: "NO_TICKET", level: "error", message: "blocking" }])).toBe(false);
  });

  it("counts absent, checked, open, parked, nested, and multi-file questions with no second parser", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "Gate ticket" });
    expect(await store.getOpenQuestionCount(ticket.id)).toEqual({ checked: 0, total: 0, open: 0 });

    await store.setDoc(
      ticket.id,
      "open-questions/first",
      "- [x] answered\n- [ ] still open\n## Parked (explicitly deferred)\n- [ ] deferred",
    );
    await store.setDoc(ticket.id, "open-questions/second", "- [X] another answer\n- [ ] another open");
    expect(await store.getOpenQuestionCount(ticket.id)).toEqual({ checked: 2, total: 4, open: 2 });
  });

  it("returns null for missing and legacy items instead of initializing or treating them as zero", async () => {
    expect(await store.getOpenQuestionCount("CORE-404")).toBeNull();
    const legacyDir = path.join(root, ".kanmer", "plans");
    await fs.mkdir(legacyDir, { recursive: true });
    await fs.writeFile(path.join(legacyDir, "PLAN-001.md"), "legacy", "utf8");
    expect(await store.getOpenQuestionCount("PLAN-001")).toBeNull();
  });

  it("passes a ticket with no questions, including parked-only questions", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "Clean ticket" });
    await store.setDoc(ticket.id, "open-questions", "# Questions\n\n## Parked (explicitly deferred)\n- [ ] later");
    const result = await evaluateMergeGate(store, {
      number: 12,
      headSha: "abc123",
      branch: "CORE-999-not-the-ticket",
      body: `Change\nKanmer: ${ticket.id}`,
    });
    expect(result.ok).toBe(true);
    expect(result.ticketId).toBe(ticket.id);
    expect(result.questions).toEqual({ checked: 0, total: 0, open: 0 });
    expect(result.findings).toEqual([]);
  });

  it("fails with the exact phase-1 OPEN_QUESTIONS error when a question is open", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "Open ticket" });
    await store.setDoc(ticket.id, "open-questions", "- [x] answered\n- [ ] decide this");
    const result = await evaluateMergeGate(store, {
      number: 13,
      headSha: "def456",
      branch: "unused-branch",
      body: `Kanmer: ${ticket.id}`,
    });
    expect(result.ok).toBe(false);
    expect(result.findings).toEqual([
      {
        code: "OPEN_QUESTIONS",
        level: "error",
        outcome: "fail",
        message: `Kanmer ticket ${ticket.id} has 1 open question (1/2 checked)`,
      },
    ]);
  });

  it("reports NO_TICKET for missing, ambiguous, invalid, and non-ticket references without branch fallback", async () => {
    const missing = await evaluateMergeGate(store, {
      number: 1,
      headSha: "a",
      branch: "CORE-404-fix",
      body: "Kanmer: CORE-405",
    });
    expect(missing.findings[0]).toMatchObject({ code: "NO_TICKET", level: "error", outcome: "fail" });

    const ambiguous = await evaluateMergeGate(store, {
      number: 2,
      headSha: "b",
      branch: "CORE-024-fix",
      body: "Kanmer: CORE-001\nKanmer: CORE-002",
    });
    expect(ambiguous.ticketId).toBeNull();
    expect(ambiguous.findings[0]?.message).toMatch(/ambiguous/);

    const invalid = await evaluateMergeGate(store, {
      number: 3,
      headSha: "c",
      branch: "CORE-024-fix",
      body: "Kanmer: CORE_024",
    });
    expect(invalid.ticketId).toBeNull();
    expect(invalid.findings[0]?.message).toMatch(/invalid/);
  });

  it("does not write board bytes or activity while evaluating", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "Read-only ticket" });
    const boardFile = path.join(root, ".kanmer", "data", "board.yml");
    const activityFile = path.join(root, ".kanmer", "data", "activity.jsonl");
    const before = {
      board: await fs.readFile(boardFile, "utf8"),
      activity: await fs.readFile(activityFile, "utf8"),
    };
    await evaluateMergeGate(store, {
      number: 4,
      headSha: "d",
      branch: "CORE-024-fix",
      body: null,
    });
    expect(await fs.readFile(boardFile, "utf8")).toBe(before.board);
    expect(await fs.readFile(activityFile, "utf8")).toBe(before.activity);
    expect(await store.getItem(ticket.id)).not.toBeNull();
  });
});

describe("phase-2 merge-gate evidence", () => {
  const head = "a".repeat(40);
  const evidence = (overrides: Record<string, unknown> = {}) => ({
    reviewStageId: "review",
    finalStageId: "done",
    blockers: [],
    review: { state: "valid", headSha: head, verdict: "pass" },
    commits: [],
    ...overrides,
  });

  it("fails every non-review stage and passes the exact semantic review stage", async () => {
    for (const status of ["backlog", "preparing", "implementing", "review", "verifying", "done"]) {
      const ticket = await store.createItem({ type: "ticket", title: status, status });
      const result = await evaluateMergeGate(store, { number: 20, headSha: head, branch: "x", body: `Kanmer: ${ticket.id}` }, evidence());
      const check = result.checks?.find((entry) => entry.code === "WRONG_STAGE");
      expect(check?.outcome, status).toBe(status === "review" ? "pass" : "fail");
    }
    const archived = await store.createItem({ type: "ticket", title: "archived", status: "review" });
    await store.updateItem(archived.id, { archived: true });
    const archivedResult = await evaluateMergeGate(store, { number: 21, headSha: head, branch: "x", body: `Kanmer: ${archived.id}` }, evidence());
    expect(archivedResult.checks?.find((entry) => entry.code === "WRONG_STAGE")).toMatchObject({ outcome: "fail", details: { archived: true } });
  }, 30_000);

  it("filters done and archived blockers, reports all live and dangling blockers, and keeps direction correct", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "target", status: "review" });
    const live = await store.createItem({ type: "ticket", title: "live", status: "implementing" });
    const done = await store.createItem({ type: "ticket", title: "done", status: "done" });
    const archived = await store.createItem({ type: "ticket", title: "archived", status: "implementing" });
    await store.updateItem(archived.id, { archived: true });
    await linkItems(store, live.id, ticket.id, "add", "blocks");
    await linkItems(store, done.id, ticket.id, "add", "blocks");
    await linkItems(store, archived.id, ticket.id, "add", "blocks");

    const result = await evaluateMergeGate(store, { number: 22, headSha: head, branch: "x", body: `Kanmer: ${ticket.id}` }, evidence({
      blockers: [
        { id: live.id, status: live.status, archived: false, exists: true },
        { id: done.id, status: done.status, archived: false, exists: true },
        { id: archived.id, status: archived.status, archived: true, exists: true },
        { id: "TICK-404", exists: false },
      ],
    }));
    expect(result.checks?.find((entry) => entry.code === "DEPENDENCY_BLOCKED")).toMatchObject({
      outcome: "fail",
      details: { blockers: [live.id, "TICK-404"] },
    });

    const noOutgoingPrerequisite = await evaluateMergeGate(store, { number: 23, headSha: head, branch: "x", body: `Kanmer: ${done.id}` }, evidence());
    expect(noOutgoingPrerequisite.checks?.find((entry) => entry.code === "DEPENDENCY_BLOCKED")).toMatchObject({ outcome: "pass", details: { blockers: [] } });
  }, 30_000);

  it("returns every check in stable order and distinguishes review/commit warning states", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "evidence", status: "review" });
    const absent = await evaluateMergeGate(store, { number: 24, headSha: head, branch: "x", body: `Kanmer: ${ticket.id}` }, evidence({ review: { state: "absent" } }));
    expect(absent.checks?.map((entry) => entry.code)).toEqual([
      "NO_TICKET", "OPEN_QUESTIONS", "WRONG_STAGE", "DEPENDENCY_BLOCKED", "NO_REVIEW_RECORD", "STALE_REVIEW", "COMMITS_UNREACHABLE",
    ]);
    expect(absent.findings.map((entry) => entry.code)).toEqual(["NO_REVIEW_RECORD"]);
    expect(absent.ok).toBe(true);

    const stale = await evaluateMergeGate(store, { number: 25, headSha: head, branch: "x", body: `Kanmer: ${ticket.id}` }, evidence({
      review: { state: "valid", headSha: "b".repeat(40), verdict: "needs-changes" },
      commits: [
        { sha: "d".repeat(40), state: "unreachable" },
        { sha: "c".repeat(40), state: "indeterminate", diagnostic: "missing object" },
        { sha: "d".repeat(40), state: "unreachable" },
      ],
    }));
    expect(stale.findings.map((entry) => entry.code)).toEqual(["STALE_REVIEW", "COMMITS_UNREACHABLE"]);
    expect(stale.findings.find((entry) => entry.code === "STALE_REVIEW")?.details).toMatchObject({ verdict: "needs-changes" });
    expect(stale.checks?.find((entry) => entry.code === "COMMITS_UNREACHABLE")).toMatchObject({ outcome: "warn", details: { unreachable: ["d".repeat(40)], indeterminate: ["c".repeat(40)] } });

    const prefix = await evaluateMergeGate(store, { number: 27, headSha: head, branch: "x", body: `Kanmer: ${ticket.id}` }, evidence({ review: { state: "valid", headSha: head.slice(0, 8), verdict: "pass" } }));
    expect(prefix.checks?.find((entry) => entry.code === "STALE_REVIEW")).toMatchObject({ outcome: "warn" });
  });

  it("marks ticket-dependent checks skipped when linkage fails", async () => {
    const result = await evaluateMergeGate(store, { number: 26, headSha: head, branch: "no-ticket", body: null }, evidence());
    expect(result.checks?.map((entry) => entry.outcome)).toEqual(["fail", "skipped", "skipped", "skipped", "skipped", "skipped", "skipped"]);
    expect(result.ok).toBe(false);
  });
});
