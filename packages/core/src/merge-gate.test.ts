import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { removeTreeWithRetry } from "./io.js";
import { KanmerStore } from "./store.js";
import {
  evaluateMergeGate,
  mergeGateOk,
  resolveMergeGateTicket,
  type MergeGateBatchEvidence,
  type MergeGateBatchMemberEvidence,
  type MergeGateBoardEvidence,
  type MergeGateReviewEvidence,
} from "./merge-gate.js";
import { linkItems } from "./links.js";
import { resolveDelivery } from "./board.js";

let root: string;
let store: KanmerStore;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-merge-gate-"));
  store = new KanmerStore(root);
  await store.init();
});

afterEach(async () => {
  await removeTreeWithRetry(root);
});

describe("resolveMergeGateTicket", () => {
  it("uses a whole-line footer, normalizes it, and gives it priority over the branch", () => {
    expect(resolveMergeGateTicket("Summary\r\nKanmer: core-024\r\n", "CORE-999-fix")).toEqual({
      ticketId: "CORE-024",
      source: "footer",
    });
  });

  it("normalizes duplicate footers, carries a distinct provisional roster, and rejects invalid explicit footers", () => {
    expect(resolveMergeGateTicket("Kanmer: CORE-024\nKanmer: core-024", "CORE-999").ticketId).toBe("CORE-024");
    expect(resolveMergeGateTicket("Kanmer: CORE-025\nKanmer: core-024", "CORE-999")).toEqual({
      ticketId: null,
      ticketIds: ["CORE-024", "CORE-025"],
      source: "footer",
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

  it("reports linkage/roster failures for missing, distinct unproven, and invalid references without branch fallback", async () => {
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
    expect(ambiguous.findings[0]).toMatchObject({ code: "BATCH_ROSTER", level: "error", outcome: "fail" });
    expect(ambiguous.findings[0]?.message).toMatch(/missing or non-ticket members/);

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

  async function batchPacket(overrides: { member?: string; evidence?: Record<string, unknown>; questions?: Record<string, number> } = {}) {
    const free = { type: "ticket" as const, profile: "custom", requires: {}, status: "implementing" };
    const tickets = await Promise.all(["A", "B", "C"].map((title) => store.createItem({ ...free, title })));
    await store.takeTicket(tickets[0]!.id, {
      branch: "batch-gate",
      worktree: ".worktrees/batch-gate",
      actor: "gate-controller",
      controllerRun: "gate-controller-run",
      batch: "batch-gate",
      batchMembers: tickets.map((ticket) => ticket.id),
    });
    for (const ticket of tickets) await store.moveItem(ticket.id, { status: "review" });
    const listed = await store.listItemsWithWarnings({ type: "ticket", includeArchived: true });
    expect(listed.warnings).toEqual([]);
    const byId = new Map(listed.items.map((item) => [item.id, item]));
    const batch = await store.batchStateFromSnapshot(tickets[0]!.id, listed.items);
    const memberEvidence = tickets.map((ticket) => ({
      ticketId: ticket.id,
      item: byId.get(ticket.id)!,
      questions: overrides.member === ticket.id && overrides.questions
        ? { checked: overrides.questions.checked ?? 0, total: overrides.questions.total ?? 0, open: overrides.questions.open ?? 0 }
        : { checked: 0, total: 0, open: 0 },
      evidence: evidence({
        strict: true,
        review: { state: "valid", headSha: head, verdict: "pass", pr: "77", independent: true },
        board: { sha: null, state: "unrecorded" },
        ...(overrides.member === ticket.id ? overrides.evidence : {}),
      }),
    }));
    return {
      tickets,
      pr: {
        number: 77,
        headSha: head,
        branch: "batch-gate",
        body: tickets.map((ticket) => `Kanmer: ${ticket.id}`).join("\n"),
        url: "https://github.com/collisionengineers/kanmer/pull/77",
      },
      packet: {
        kind: "batch" as const,
        reviewStageId: "review",
        finalStageId: "done",
        strict: true,
        policy: resolveDelivery(await store.getBoard()),
        batch,
        members: memberEvidence,
      },
    };
  }

  const updateBatchMember = (
    packet: MergeGateBatchEvidence,
    ticketId: string,
    update: (member: MergeGateBatchMemberEvidence) => MergeGateBatchMemberEvidence,
  ): MergeGateBatchEvidence => ({
    ...packet,
    members: packet.members.map((member) => member.ticketId === ticketId ? update(member) : member),
  });

  const setBatchStrict = (packet: MergeGateBatchEvidence, strict: boolean): MergeGateBatchEvidence => ({
    ...packet,
    strict,
    members: packet.members.map((member) => ({
      ...member,
      evidence: { ...member.evidence, strict },
    })),
  });

  it("passes an exact three-member roster from a self-contained packet without rereading the store", async () => {
    const { tickets, pr, packet } = await batchPacket();
    const throwingStore = new Proxy({}, {
      get: (_target, name) => () => { throw new Error(`unexpected store read ${String(name)}`); },
    }) as KanmerStore;
    const result = await evaluateMergeGate(throwingStore, pr, packet);
    expect(result).toMatchObject({
      ok: true,
      ticketId: null,
      ticketIds: tickets.map((ticket) => ticket.id).sort(),
      batchId: "batch-gate",
      source: "footer",
      strict: true,
    });
    expect(result.findings).toEqual([]);
    expect(result.checks?.[0]).toMatchObject({ code: "BATCH_ROSTER", outcome: "pass" });
    expect(result.checks?.slice(1).every((check) => typeof check.details?.ticketId === "string")).toBe(true);
  });

  it("hard-fails superset, mixed-batch, and unbatched explicit rosters", async () => {
    const first = await batchPacket();
    const selectedId = first.tickets[1]!.id;
    const mixed = updateBatchMember(first.packet, selectedId, (member) => ({
      ...member,
      item: { ...member.item!, lease_batch: "different-batch" },
    }));
    const unbatched = updateBatchMember(first.packet, selectedId, (member) => {
      const { lease_batch: _batch, ...item } = member.item!;
      return { ...member, item };
    });
    const cases: Array<{ name: string; pr: typeof first.pr; packet: MergeGateBatchEvidence }> = [
      {
        name: "superset footer",
        pr: { ...first.pr, body: `${first.pr.body}\nKanmer: EXTRA-999` },
        packet: first.packet,
      },
      { name: "mixed batch ids", pr: first.pr, packet: mixed },
      { name: "unbatched member", pr: first.pr, packet: unbatched },
    ];

    for (const testCase of cases) {
      const result = await evaluateMergeGate({} as KanmerStore, testCase.pr, testCase.packet);
      expect(result.ok, testCase.name).toBe(false);
      expect(result.findings, testCase.name).toHaveLength(1);
      expect(result.findings[0], testCase.name).toMatchObject({
        code: "BATCH_ROSTER",
        level: "error",
        outcome: "fail",
      });
    }
  });

  it("hard-fails recoverably pending and inconsistent batch manifests", async () => {
    const first = await batchPacket();
    for (const declaration of ["pending", "inconsistent"] as const) {
      const packet: MergeGateBatchEvidence = {
        ...first.packet,
        batch: { ...first.packet.batch!, declaration },
      };
      const result = await evaluateMergeGate({} as KanmerStore, first.pr, packet);
      expect(result.ok, declaration).toBe(false);
      expect(result.findings).toEqual([
        expect.objectContaining({ code: "BATCH_ROSTER", level: "error", outcome: "fail" }),
      ]);
      expect(result.findings[0]?.details).toMatchObject({
        batchId: "batch-gate",
        declaration,
      });
    }
  });

  it("binds deterministic member identity and check order despite reversed evidence and footers", async () => {
    const first = await batchPacket();
    const ticketIds = first.tickets.map((ticket) => ticket.id).sort((a, b) => a.localeCompare(b));
    const packet: MergeGateBatchEvidence = {
      ...first.packet,
      members: [...first.packet.members].reverse(),
    };
    const result = await evaluateMergeGate({} as KanmerStore, {
      ...first.pr,
      body: [...ticketIds].reverse().map((id) => `Kanmer: ${id}`).join("\n"),
    }, packet);

    expect(result.ok).toBe(true);
    expect(result.ticketIds).toEqual(ticketIds);
    expect(result.checks?.slice(1).map((check) => check.details?.ticketId)).toEqual(
      ticketIds.flatMap((id) => Array.from({ length: 9 }, () => id)),
    );
  });

  it("blocks an incomplete roster and aggregates a non-leading member's question and canonical PR failures", async () => {
    const first = await batchPacket();
    const throwingStore = new Proxy({}, {
      get: (_target, name) => () => { throw new Error(`unexpected store read ${String(name)}`); },
    }) as KanmerStore;
    const lone = await evaluateMergeGate(throwingStore, {
      ...first.pr,
      body: `Kanmer: ${first.tickets[0]!.id}`,
    }, first.packet);
    expect(lone.findings[0]).toMatchObject({ code: "BATCH_ROSTER", level: "error" });
    expect(lone.findings[0]?.message).toContain("complete manifest roster");

    const badId = first.tickets[1]!.id;
    const badPacket = {
      ...first.packet,
      members: first.packet.members.map((member) => member.ticketId === badId
        ? {
            ...member,
            questions: { checked: 0, total: 1, open: 1 },
            evidence: {
              ...member.evidence,
              review: {
                state: "valid" as const,
                headSha: head,
                verdict: "pass",
                pr: "https://github.com/foreign/repo/pull/77",
                independent: true,
              },
            },
          }
        : member),
    };
    const adverse = await evaluateMergeGate({} as KanmerStore, first.pr, badPacket);
    expect(adverse.ok).toBe(false);
    expect(adverse.findings.map((finding) => [finding.code, finding.details?.ticketId])).toEqual([
      ["OPEN_QUESTIONS", badId],
      ["STALE_REVIEW", badId],
    ]);
  });

  it("blocks an archived or non-Review member and identifies the exact member", async () => {
    const first = await batchPacket();
    const selectedId = first.tickets[1]!.id;
    const cases = [
      { name: "archived", item: { archived: true, status: "review" } },
      { name: "non-review", item: { archived: false, status: "implementing" } },
    ];

    for (const testCase of cases) {
      const packet = updateBatchMember(first.packet, selectedId, (member) => ({
        ...member,
        item: { ...member.item!, ...testCase.item },
      }));
      const result = await evaluateMergeGate({} as KanmerStore, first.pr, packet);
      expect(result.ok, testCase.name).toBe(false);
      expect(result.findings).toContainEqual(expect.objectContaining({
        code: "WRONG_STAGE",
        level: "error",
        outcome: "fail",
        details: expect.objectContaining({ ticketId: selectedId }),
      }));
    }
  });

  it("blocks live and dangling blockers recorded for a non-leading member", async () => {
    const first = await batchPacket();
    const selectedId = first.tickets[1]!.id;
    const packet = updateBatchMember(first.packet, selectedId, (member) => ({
      ...member,
      evidence: {
        ...member.evidence,
        blockers: [
          { id: "DEP-003", status: "done", archived: false, exists: true },
          { id: "DEP-002", exists: false },
          { id: "DEP-001", status: "implementing", archived: false, exists: true },
        ],
      },
    }));
    const result = await evaluateMergeGate({} as KanmerStore, first.pr, packet);
    expect(result.ok).toBe(false);
    expect(result.findings).toContainEqual(expect.objectContaining({
      code: "DEPENDENCY_BLOCKED",
      level: "error",
      outcome: "fail",
      details: { ticketId: selectedId, blockers: ["DEP-001", "DEP-002"] },
    }));
  });

  it("requires every member's independent PASS review for this exact PR head", async () => {
    const first = await batchPacket();
    const selectedId = first.tickets[1]!.id;
    const valid = { state: "valid", headSha: head, verdict: "pass", pr: "77", independent: true } as const;
    const cases: Array<{ name: string; review: MergeGateReviewEvidence; code: "NO_REVIEW_RECORD" | "STALE_REVIEW" }> = [
      { name: "absent", review: { state: "absent" }, code: "NO_REVIEW_RECORD" },
      { name: "invalid", review: { state: "invalid", reason: "malformed attestation" }, code: "STALE_REVIEW" },
      { name: "needs changes", review: { ...valid, verdict: "needs-changes" }, code: "STALE_REVIEW" },
      { name: "non-pass", review: { ...valid, verdict: "approved" }, code: "STALE_REVIEW" },
      { name: "stale head", review: { ...valid, headSha: "b".repeat(40) }, code: "STALE_REVIEW" },
      { name: "not independent", review: { ...valid, independent: false }, code: "STALE_REVIEW" },
      { name: "wrong PR", review: { ...valid, pr: "78" }, code: "STALE_REVIEW" },
    ];

    for (const testCase of cases) {
      const packet = updateBatchMember(first.packet, selectedId, (member) => ({
        ...member,
        evidence: { ...member.evidence, review: testCase.review },
      }));
      const result = await evaluateMergeGate({} as KanmerStore, first.pr, packet);
      expect(result.ok, testCase.name).toBe(false);
      expect(result.findings, testCase.name).toContainEqual(expect.objectContaining({
        code: testCase.code,
        level: "error",
        outcome: "fail",
        details: expect.objectContaining({ ticketId: selectedId }),
      }));
    }
  });

  it("applies strict-versus-lenient reachability and board-freshness behavior per member", async () => {
    const first = await batchPacket();
    const selectedId = first.tickets[1]!.id;
    const commitSha = "c".repeat(40);

    for (const state of ["unreachable", "indeterminate"] as const) {
      for (const strict of [false, true]) {
        const base = setBatchStrict(first.packet, strict);
        const packet = updateBatchMember(base, selectedId, (member) => ({
          ...member,
          evidence: { ...member.evidence, commits: [{ sha: commitSha, state }] },
        }));
        const result = await evaluateMergeGate({} as KanmerStore, first.pr, packet);
        expect(result.ok, `${state}/${strict}`).toBe(!strict);
        expect(result.findings).toContainEqual(expect.objectContaining({
          code: "COMMITS_UNREACHABLE",
          level: strict ? "error" : "warning",
          outcome: strict ? "fail" : "warn",
          details: expect.objectContaining({ ticketId: selectedId }),
        }));
      }
    }

    const boardTip = "d".repeat(40);
    const oldTip = "e".repeat(40);
    for (const testCase of [
      { state: "stale" as const, strict: false, outcome: "warn", ok: true },
      { state: "stale" as const, strict: true, outcome: "fail", ok: false },
      { state: "unrecorded" as const, strict: false, outcome: "pass", ok: true },
      { state: "unrecorded" as const, strict: true, outcome: "pass", ok: true },
    ]) {
      const base = setBatchStrict(first.packet, testCase.strict);
      const packet: MergeGateBatchEvidence = {
        ...base,
        members: base.members.map((member) => {
          const board: MergeGateBoardEvidence = member.ticketId === selectedId
            ? {
                sha: boardTip,
                state: testCase.state,
                ...(testCase.state === "stale" ? { attestedSha: oldTip } : {}),
              }
            : { sha: boardTip, state: "current", attestedSha: boardTip };
          return { ...member, evidence: { ...member.evidence, board } };
        }),
      };
      const result = await evaluateMergeGate({} as KanmerStore, first.pr, packet);
      const check = result.checks?.find((entry) =>
        entry.code === "SYNC_REQUIRED" && entry.details?.ticketId === selectedId
      );
      expect(result.ok, `${testCase.state}/${testCase.strict}`).toBe(testCase.ok);
      expect(check, `${testCase.state}/${testCase.strict}`).toMatchObject({
        outcome: testCase.outcome,
        level: testCase.strict ? "error" : "warning",
      });
    }
  });

  it("uses the full captured census for plural phase-1 batch classification", async () => {
    const first = await batchPacket();
    const outsider = await store.createItem({ type: "ticket", title: "Unexpected stamped ticket" });
    const listed = await store.listItemsWithWarnings({ includeArchived: true });
    expect(listed.warnings).toEqual([]);
    const rogue = {
      ...outsider,
      lease_batch: first.packet.batch!.id,
      lease_batch_controller: first.packet.batch!.controller!,
      lease_batch_frozen_at: first.packet.batch!.frozenAt!,
    };
    const census = listed.items.map((item) => item.id === outsider.id ? rogue : item);
    const phase1Store = {
      listItemsWithWarnings: async () => ({ items: census, warnings: [] }),
      getOpenQuestionCount: store.getOpenQuestionCount.bind(store),
      batchStateFromSnapshot: store.batchStateFromSnapshot.bind(store),
    } as unknown as KanmerStore;

    const result = await evaluateMergeGate(phase1Store, first.pr);
    expect(result.ok).toBe(false);
    expect(result.findings[0]).toMatchObject({ code: "BATCH_ROSTER", level: "error" });
    expect(result.findings[0]?.details).toMatchObject({ declaration: "inconsistent" });
  });

  it("matches an exact canonical URL from repository plus number and rejects a foreign repository", async () => {
    const first = await batchPacket();
    const pr = {
      ...first.pr,
      url: undefined,
      repository: "collisionengineers/kanmer",
    };
    const canonical = `https://github.com/collisionengineers/kanmer/pull/${pr.number}`;
    const sameRepository = {
      ...first.packet,
      members: first.packet.members.map((member) => ({
        ...member,
        evidence: {
          ...member.evidence,
          review: { ...member.evidence.review, pr: canonical },
        },
      })),
    };
    const accepted = await evaluateMergeGate({} as KanmerStore, pr, sameRepository);
    expect(accepted.ok).toBe(true);

    const foreign = {
      ...sameRepository,
      members: sameRepository.members.map((member, index) => index === 1
        ? {
            ...member,
            evidence: {
              ...member.evidence,
              review: { ...member.evidence.review, pr: `https://github.com/foreign/repository/pull/${pr.number}` },
            },
          }
        : member),
    };
    const rejected = await evaluateMergeGate({} as KanmerStore, pr, foreign);
    expect(rejected.findings.map((finding) => finding.code)).toEqual(["STALE_REVIEW"]);
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
      "NO_TICKET", "OPEN_QUESTIONS", "WRONG_STAGE", "DEPENDENCY_BLOCKED", "WRONG_TARGET", "NO_REVIEW_RECORD", "STALE_REVIEW", "COMMITS_UNREACHABLE", "SYNC_REQUIRED",
    ]);
    expect(absent.findings.map((entry) => entry.code)).toEqual(["NO_REVIEW_RECORD"]);
    expect(absent.ok).toBe(true);
    // No board evidence supplied: the sync check is skipped, never a finding.
    expect(absent.checks?.at(-1)).toMatchObject({ code: "SYNC_REQUIRED", outcome: "skipped", level: "warning" });
    expect(absent.boardSha).toBeNull();
    expect(absent.strict).toBe(false);

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
    expect(result.checks?.map((entry) => entry.outcome)).toEqual(["fail", "skipped", "skipped", "skipped", "skipped", "skipped", "skipped", "skipped", "skipped"]);
    expect(result.ok).toBe(false);
  });

  it("keeps attestation and commit checks as warnings by default and promotes them under strict", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "strict", status: "review" });
    const pr = { number: 30, headSha: head, branch: "x", body: `Kanmer: ${ticket.id}` };
    const adverse = {
      review: { state: "valid", headSha: head, verdict: "needs-changes" },
      commits: [{ sha: "d".repeat(40), state: "unreachable" }],
    };

    const lenient = await evaluateMergeGate(store, pr, evidence(adverse));
    expect(lenient.ok).toBe(true);
    expect(lenient.findings.map((entry) => [entry.code, entry.level, entry.outcome])).toEqual([
      ["STALE_REVIEW", "warning", "warn"],
      ["COMMITS_UNREACHABLE", "warning", "warn"],
    ]);

    const strict = await evaluateMergeGate(store, pr, evidence({ ...adverse, strict: true }));
    expect(strict.ok).toBe(false);
    expect(strict.strict).toBe(true);
    expect(strict.findings.map((entry) => [entry.code, entry.level, entry.outcome])).toEqual([
      ["STALE_REVIEW", "error", "fail"],
      ["COMMITS_UNREACHABLE", "error", "fail"],
    ]);
    // Stage and dependency checks are errors regardless of the switch.
    expect(strict.checks?.find((entry) => entry.code === "WRONG_STAGE")?.level).toBe("error");
    expect(lenient.checks?.find((entry) => entry.code === "WRONG_STAGE")?.level).toBe("error");

    const missing = await evaluateMergeGate(store, pr, evidence({ review: { state: "absent" }, strict: true }));
    expect(missing.ok).toBe(false);
    expect(missing.findings.map((entry) => entry.code)).toEqual(["NO_REVIEW_RECORD"]);
    expect(missing.checks?.find((entry) => entry.code === "STALE_REVIEW")).toMatchObject({ outcome: "skipped", level: "error" });

    const noTicket = await evaluateMergeGate(store, { number: 31, headSha: head, branch: "none", body: null }, evidence({ strict: true }));
    expect(noTicket.checks?.find((entry) => entry.code === "SYNC_REQUIRED")).toMatchObject({ outcome: "skipped", level: "error" });
    expect(noTicket.strict).toBe(true);
  });

  it("evaluates SYNC_REQUIRED from board evidence and records the evaluated board tip", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "sync", status: "review" });
    const pr = { number: 32, headSha: head, branch: "x", body: `Kanmer: ${ticket.id}` };
    const tip = "e".repeat(40);
    const attested = "f".repeat(40);
    const sync = (board: Record<string, unknown>, strict = false) =>
      evaluateMergeGate(store, pr, evidence({ board, strict })).then((result) => ({
        result,
        check: result.checks?.find((entry) => entry.code === "SYNC_REQUIRED"),
      }));

    const current = await sync({ sha: tip.toUpperCase(), attestedSha: attested, state: "current" });
    expect(current.check).toMatchObject({ outcome: "pass", details: { state: "current", boardSha: tip, attestedBoardSha: attested } });
    expect(current.result.boardSha).toBe(tip.toUpperCase());
    expect(current.result.ok).toBe(true);

    const unrecorded = await sync({ sha: tip, state: "unrecorded" }, true);
    expect(unrecorded.check).toMatchObject({ outcome: "pass", level: "error" });
    expect(unrecorded.check?.message).toMatch(/records no board_sha/);
    expect(unrecorded.result.ok).toBe(true);

    const stale = await sync({ sha: tip, attestedSha: attested, state: "stale" });
    expect(stale.check).toMatchObject({ outcome: "warn", level: "warning", details: { state: "stale" } });
    expect(stale.result.findings.map((entry) => entry.code)).toEqual(["SYNC_REQUIRED"]);
    expect(stale.result.ok).toBe(true);

    const staleStrict = await sync({ sha: tip, attestedSha: attested, state: "stale" }, true);
    expect(staleStrict.check).toMatchObject({ outcome: "fail", level: "error" });
    expect(staleStrict.check?.message).toMatch(/push the board branch/);
    expect(staleStrict.result.ok).toBe(false);

    const unknown = await sync({ sha: null, attestedSha: attested, state: "unknown", diagnostic: "not a git checkout" }, true);
    expect(unknown.check).toMatchObject({ outcome: "fail", details: { state: "unknown", boardSha: null, diagnostic: "not a git checkout" } });
    expect(unknown.result.boardSha).toBeNull();
    expect(unknown.result.ok).toBe(false);
  });
});
