import { describe, expect, it } from "vitest";
import { parsePlan } from "./plan.js";
import {
  compileStepPacket,
  reconcileStepPacket,
  stepChecklistSnapshot,
  stepPacketAuthority,
  stepPacketDigest,
  stepTicketAuthority,
  verifyStepPacket,
  nextStepIndex,
  STEP_PACKET_LIMITS,
  STEP_PACKET_VERSION,
  STEP_RETURN_STOP,
  type StepPacketEvidence,
  type StepPacketInput,
} from "./step-packet.js";

const PLAN = `# Plan — TICK-001

## Starting state
Verified in \`src/queue.ts:12\`.
Evidence: \`research/research.md\`@\`aaaaaaaaaaaaaaaa\`, \`HZN-009/context.md\`@\`cccccccccccccccc\`.

## Governing docs
Meets \`docs/functional/frd/FRD-001-uploads.md\`.

## Required changes
Cap the retry loop in \`src/queue.ts\`.

## Expected files
| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | \`src/queue.ts\` | retry loop |
| Add | \`src/queue.test.ts\` | retry proof |
| Modify | \`docs/queue.md\` | note |

## Do not modify
- \`src/vendor/bundle.js\` — generated output.

## Constraints
Retry count stays behind \`QUEUE_MAX_RETRIES\`.

## Ordered steps

### Step 1 — Bound the retry loop
- Preconditions: \`enqueue\` retries forever.
- Files: \`src/queue.ts\`, \`src/queue.test.ts\`
- Symbols: \`enqueue\`, \`QUEUE_MAX_RETRIES\`
- Change: cap the loop at \`QUEUE_MAX_RETRIES\`.
- Preserved behaviour: a first-attempt success returns immediately.
- Forbidden: no change to the public queue signature.
- Negative cases: a permanent failure stops after three attempts
- Tests: \`src/queue.test.ts\`
- Commands: \`npm test\`
- Expected output: the retry suite passes.
- Done when: \`npm test\` reports green.
- Deviation stop: stop if the cap must become dynamic.

### Step 2 — Document the cap
- Preconditions: step 1 landed.
- Files: \`docs/queue.md\`
- Change: record the cap.
- Preserved behaviour: no runtime change.
- Negative cases: none
- Tests: \`src/queue.test.ts\`
- Commands: \`npm test\`
- Expected output: unchanged suite result.
- Done when: the note exists.
- Deviation stop: stop on any runtime change.

## Acceptance checks
- \`npm test\` proves the cap.

## Commands
- \`npm test\`

## Stop condition
Stop when the PR is open.
`;

const EVIDENCE: StepPacketEvidence[] = [
  { layer: "group", group: "HZN-009", path: "HZN-009/context.md", version: "cccccccccccccccc" },
  { layer: "ticket", group: null, path: "research/research.md", version: "aaaaaaaaaaaaaaaa" },
];

function input(overrides: Partial<StepPacketInput> = {}): StepPacketInput {
  return {
    plan: parsePlan(PLAN),
    planPath: "plan/plan.md",
    planVersion: "1111111111111111",
    project: { project_id: "proj-1", board_id: "board-1", fingerprint: "kanmer-proj-v1:abc" },
    ticket: {
      id: "TICK-001",
      revision: "rev1:deadbeef",
      itemAuthority: stepTicketAuthority({ id: "TICK-001", status: "implementing", lease_id: "lease-1", lease_worker_run: "worker-1", claim_expires_at: "2026-08-31T10:00:00.000Z", lease_revision: 1 }),
      documents: [
        { path: "checklist/checklist.md", version: "2222222222222222" },
        { path: "plan/plan.md", version: "1111111111111111" },
        { path: "research/research.md", version: "aaaaaaaaaaaaaaaa" },
      ],
    },
    batch: null,
    workspace: { branch: "tick-001-queue", worktree: ".worktrees/tick-001", head: "a".repeat(40), entries: [] },
    evidence: EVIDENCE,
    checklist: "- [ ] Step 1 — bound the loop\n- [ ] Step 2 — document the cap\n",
    checklistPath: "checklist/checklist.md",
    checklistVersion: "2222222222222222",
    select: 1,
    stopCondition: "Stop when the PR is open.",
    ...overrides,
  };
}

describe("compileStepPacket", () => {
  it("bounds the worker to the selected step's declared files and symbols", () => {
    const result = compileStepPacket(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.allowedFiles).toEqual(["src/queue.ts", "src/queue.test.ts"]);
    expect(result.packet.allowedSymbols).toEqual(["enqueue", "QUEUE_MAX_RETRIES"]);
    expect(result.packet.forbiddenFiles).toEqual(["src/vendor/bundle.js"]);
    expect(result.packet.allowedFiles).not.toContain("docs/queue.md");
  });

  it("records the exact tests, commands, expected output and done condition", () => {
    const result = compileStepPacket(input());
    if (!result.ok) throw new Error(result.reason);
    expect(result.packet.tests).toEqual(["src/queue.test.ts"]);
    expect(result.packet.commands).toEqual(["npm test"]);
    expect(result.packet.expectedOutput).toBe("the retry suite passes.");
    expect(result.packet.doneCondition).toBe("`npm test` reports green.");
    expect(result.packet.deviationStop).toBe("stop if the cap must become dynamic.");
    expect(result.packet.requiredBehaviour).toBe("cap the loop at `QUEUE_MAX_RETRIES`.");
    expect(result.packet.preservedBehaviour).toBe("a first-attempt success returns immediately.");
    expect(result.packet.forbiddenBehaviour).toBe("no change to the public queue signature.");
    expect(result.packet.negativeCases).toEqual(["a permanent failure stops after three attempts"]);
  });

  it("carries identity, workspace, plan version and a one-step stop condition", () => {
    const result = compileStepPacket(input({ batch: "batch-queue" }));
    if (!result.ok) throw new Error(result.reason);
    expect(result.packet.packetVersion).toBe(STEP_PACKET_VERSION);
    expect(result.packet.project.project_id).toBe("proj-1");
    expect(result.packet.ticket).toEqual(input().ticket);
    expect(result.packet.batch).toBe("batch-queue");
    expect(result.packet.workspace).toEqual({ branch: "tick-001-queue", worktree: ".worktrees/tick-001", head: "a".repeat(40), entries: [] });
    expect(result.packet.plan).toEqual({ path: "plan/plan.md", version: "1111111111111111" });
    expect(result.packet.checklist).toEqual({
      path: "checklist/checklist.md",
      version: "2222222222222222",
      content: "- [ ] Step 1 — bound the loop\n- [ ] Step 2 — document the cap\n",
      steps: [false, false],
      stepLines: [[0], [1]],
    });
    expect(result.packet.step).toEqual({ index: 1, total: 2, id: "step-1", title: "Bound the retry loop" });
    expect(result.packet.stopCondition).toContain("Stop when the PR is open.");
    expect(result.packet.stopCondition).toContain(STEP_RETURN_STOP);
  });

  it("keeps the two evidence layers apart", () => {
    const result = compileStepPacket(input());
    if (!result.ok) throw new Error(result.reason);
    expect(result.packet.evidence.group.map((entry) => entry.path)).toEqual(["HZN-009/context.md"]);
    expect(result.packet.evidence.ticket.map((entry) => entry.path)).toEqual(["research/research.md"]);
  });

  it("canonicalizes exact duplicate evidence and refuses conflicting duplicate authority", () => {
    const duplicate = compileStepPacket(input({ evidence: [...EVIDENCE, structuredClone(EVIDENCE[0])] }));
    expect(duplicate.ok).toBe(true);
    if (!duplicate.ok) return;
    expect(duplicate.packet.evidence.group).toEqual([EVIDENCE[0]]);
    expect(verifyStepPacket(duplicate.packet).ok).toBe(true);

    const conflicting = compileStepPacket(input({
      evidence: [...EVIDENCE, { ...EVIDENCE[0], version: "d".repeat(16) }],
    }));
    expect(conflicting.ok).toBe(false);
    if (!conflicting.ok) expect(conflicting.reason).toMatch(/conflicting duplicate evidence/i);
  });

  it("gives identical input a stable packet id and different input a different one", () => {
    const first = compileStepPacket(input());
    const again = compileStepPacket(input());
    const other = compileStepPacket(input({ select: 2, checklist: "- [x] Step 1 — done\n- [ ] Step 2 — pending\n" }));
    if (!first.ok || !again.ok || !other.ok) throw new Error("expected three ready packets");
    expect(first.packet.packetId).toMatch(/^[0-9a-f]{64}$/);
    expect(again.packet.packetId).toBe(first.packet.packetId);
    expect(other.packet.packetId).not.toBe(first.packet.packetId);
  });

  it("round-trips a documented allowed glob through strict packet verification", () => {
    const patterned = parsePlan(
      PLAN
        .replace("| Modify | `src/queue.ts` | retry loop |", "| Modify | `src/**` | retry sources |")
        .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
        .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", "- Files: `src/*.ts`"),
    );
    const result = compileStepPacket(input({ plan: patterned }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packet.allowedFiles).toEqual(["src/*.ts"]);
    expect(verifyStepPacket(result.packet)).toMatchObject({ ok: true });
  });

  it("strictly refuses missing/extra nested keys and duplicate or noncanonical sets", () => {
    const ready = compileStepPacket(input());
    if (!ready.ok) throw new Error(ready.reason);
    const signed = (mutate: (body: any) => void) => {
      const { packetId: _ignored, ...body } = structuredClone(ready.packet);
      mutate(body);
      return { ...body, packetId: stepPacketDigest(body) };
    };
    expect(verifyStepPacket(signed((body) => { delete body.project.board_id; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.workspace.extra = true; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.evidence.extra = []; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => {
      body.workspace.entries = [
        { path: "z.ts", index: ".", worktree: "M", content: "a".repeat(64) },
        { path: "a.ts", index: ".", worktree: "M", content: "b".repeat(64) },
      ];
    })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.evidence.ticket.push(structuredClone(body.evidence.ticket[0])); })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.ticket.documents.reverse(); })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.workspace.entries = [{ path: "./x.ts", index: ".", worktree: "M", content: "a".repeat(64) }]; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.workspace.worktree = ".worktrees\\tick-001"; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.plan.path = "./plan/plan.md"; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.checklist.path = "checklist\\checklist.md"; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.ticket.documents[0].path = "./checklist/checklist.md"; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.evidence.ticket[0].path = "./research/research.md"; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.allowedFiles[0] = "./src/queue.ts"; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.forbiddenFiles[0] = "src\\vendor\\**"; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.workspace.entries = [{ path: "x.ts", index: " ", worktree: "M", content: "a".repeat(64) }]; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => { body.workspace.entries = [{ path: "x.ts", index: ".", worktree: " ", content: "a".repeat(64) }]; })).ok).toBe(false);
    expect(verifyStepPacket(signed((body) => {
      body.checklist.content = "- [ ] Step 2 — document the cap\n";
      body.checklist.steps = [false, false];
      body.checklist.stepLines = [[], [0]];
    })).ok).toBe(false);
  });

  it("refuses oversized strings and arrays before a stale digest can be considered", () => {
    const ready = compileStepPacket(input());
    if (!ready.ok) throw new Error(ready.reason);
    const oversizedString = structuredClone(ready.packet);
    oversizedString.stopCondition = "x".repeat(STEP_PACKET_LIMITS.maxStringBytes + 1);
    const stringResult = verifyStepPacket(oversizedString);
    expect(stringResult.ok).toBe(false);
    if (!stringResult.ok) expect(stringResult.reason).toMatch(/encoded bytes|budget/i);

    const oversizedArray = structuredClone(ready.packet);
    oversizedArray.negativeCases = Array.from(
      { length: STEP_PACKET_LIMITS.maxArrayEntries + 1 },
      (_, index) => `case-${index}`,
    );
    const arrayResult = verifyStepPacket(oversizedArray);
    expect(arrayResult.ok).toBe(false);
    if (!arrayResult.ok) expect(arrayResult.reason).toMatch(/array exceeds/i);
  });
});

describe("compileStepPacket refusals", () => {
  it("refuses oversized checklist material before plan compilation", () => {
    const checklist = Array.from(
      { length: STEP_PACKET_LIMITS.maxChecklistLines + 1 },
      (_, index) => `line ${index}`,
    ).join("\n");
    const result = compileStepPacket(input({ checklist }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.validation.findings).toContainEqual(expect.objectContaining({ code: "PLAN_PACKET_BUDGET_EXCEEDED", severity: "blocker" }));
    expect(result.reason).toMatch(/checklist exceeds/i);
  });

  it("refuses an oversized counted-document census before minting a packet", () => {
    const result = compileStepPacket(input({
      ticket: {
        ...input().ticket,
        documents: Array.from(
          { length: STEP_PACKET_LIMITS.maxDocuments + 1 },
          (_, index) => ({ path: `proof/attempt-${String(index).padStart(3, "0")}.md`, version: "a".repeat(16) }),
        ),
      },
    }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.validation.findings).toContainEqual(expect.objectContaining({ code: "PLAN_PACKET_BUDGET_EXCEEDED" }));
    expect(result.reason).toMatch(/document census exceeds/i);
  });

  it("refuses a step the plan does not have, and reports why", () => {
    const result = compileStepPacket(input({ select: 9 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.validation.findings.some((finding) => finding.code === "PLAN_STEP_NOT_FOUND")).toBe(true);
    expect(result.reason).toContain("step 9 does not exist");
  });

  it("refuses a step that names a forbidden file", () => {
    const plan = parsePlan(PLAN.replace("- Files: `docs/queue.md`", "- Files: `src/vendor/bundle.js`"));
    const result = compileStepPacket(input({ plan, select: 2 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.validation.findings.some((finding) => finding.code === "PLAN_STEP_FILE_FORBIDDEN")).toBe(true);
  });

  it("refuses a plan whose steps are plain list items", () => {
    const plan = parsePlan("## Ordered steps\n1. Do it all.\n\n## Stop condition\nStop.\n");
    const result = compileStepPacket(input({ plan }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.validation.findings.some((finding) => finding.code === "PLAN_STEP_UNSTRUCTURED")).toBe(true);
  });

  it("refuses when the pinned evidence has moved on", () => {
    const moved: StepPacketEvidence[] = [
      EVIDENCE[0],
      { layer: "ticket", group: null, path: "research/research.md", version: "dddddddddddddddd" },
    ];
    const result = compileStepPacket(input({ evidence: moved }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.validation.findings.some((finding) => finding.code === "PLAN_EVIDENCE_STALE")).toBe(true);
  });

  it("refuses an evidence-bearing ticket whose plan pins nothing, and accepts a trivial one", () => {
    const unpinned = parsePlan(PLAN.replace(/Evidence: .*\n/, ""));
    expect(compileStepPacket(input({ plan: unpinned })).ok).toBe(false);
    const trivial = compileStepPacket(
      input({ plan: unpinned, evidence: [EVIDENCE[0]], select: 1 }),
    );
    expect(trivial.ok).toBe(true);
  });
});

describe("selecting the next step", () => {
  const plan = parsePlan(PLAN);

  it("selects step 1 without a checklist but refuses an unreconcilable constrained packet", () => {
    expect(nextStepIndex(plan, null)).toBe(1);
    const result = compileStepPacket(input({ select: "next", checklist: null, checklistVersion: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/mapped unchecked checklist marker/i);
  });

  it("refuses unrelated or missing named markers and accepts a partially complete selected step", () => {
    const unrelated = compileStepPacket(input({ checklist: "- [ ] Step 99 — unrelated\n" }));
    expect(unrelated.ok).toBe(false);
    if (!unrelated.ok) expect(unrelated.reason).toMatch(/mapped unchecked checklist marker/i);

    const missingSelected = compileStepPacket(input({
      checklist: "- [ ] Step 2 — pending\n",
      select: 1,
    }));
    expect(missingSelected.ok).toBe(false);
    if (!missingSelected.ok) expect(missingSelected.reason).toMatch(/mapped unchecked checklist marker/i);

    const partial = compileStepPacket(input({
      checklist: "- [x] Step 1 — first half\n- [ ] Step 1 — second half\n- [ ] Step 2 — pending\n",
    }));
    expect(partial.ok).toBe(true);
    if (partial.ok) expect(partial.packet.checklist.stepLines[0]).toEqual([0, 1]);
  });

  it("reads a checklist that names its steps by name, not by position", () => {
    const checklist = [
      "- [x] Step 1 — bound the loop",
      "- [x] Step 1 — prove it with a test",
      "- [ ] Step 2 — document the cap",
      "- [ ] Run the full rail and record exit codes",
    ].join("\n");
    expect(nextStepIndex(plan, checklist)).toBe(2);
  });

  it("treats a step with one unticked named box as unfinished", () => {
    const checklist = "- [x] Step 1 — first half\n- [ ] Step 1 — second half\n- [x] Step 2 — done\n";
    expect(nextStepIndex(plan, checklist)).toBe(1);
  });

  it("falls back to position when no box names a step", () => {
    expect(nextStepIndex(plan, "- [x] first\n- [ ] second\n")).toBe(2);
  });

  it("refuses when every step is already ticked", () => {
    const checklist = "- [x] Step 1 — done\n- [x] Step 2 — done\n";
    expect(nextStepIndex(plan, checklist)).toBeNull();
    const result = compileStepPacket(input({ select: "next", checklist }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("already ticked");
  });

  it("refuses an explicitly selected step that is already complete", () => {
    const result = compileStepPacket(input({ select: 1, checklist: "- [x] Step 1 — done\n- [ ] Step 2 — pending\n" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("already complete");
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("refuses invalid direct numeric selection %s", (select) => {
    expect(compileStepPacket(input({ select })).ok).toBe(false);
  });

  it("refuses skipping the current unfinished step", () => {
    const result = compileStepPacket(input({ select: 2 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("step 1 is the current unfinished step");
  });
});

describe("reconcileStepPacket", () => {
  function packet() {
    const result = compileStepPacket(input());
    if (!result.ok) throw new Error(result.reason);
    return result.packet;
  }

  function facts(overrides = {}) {
    const value = packet();
    return {
      project: value.project,
      ticket: { ...value.ticket, revision: "rev1:after-checklist" },
      batch: value.batch,
      plan: { ...value.plan, authority: stepPacketAuthority(parsePlan(PLAN), value.step.index, "Stop when the PR is open.") },
      checklist: {
        ...value.checklist,
        version: "3333333333333333",
        content: value.checklist.content?.replace("[ ] Step 1", "[x] Step 1") ?? null,
        steps: [true, false],
      },
      evidence: [...value.evidence.group, ...value.evidence.ticket],
      workspace: { snapshot: value.workspace, headChanges: ["src/queue.ts"] },
      ...overrides,
    };
  }

  it("fails closed when actual changes have free-form symbol authority", () => {
    const result = reconcileStepPacket(packet(), facts());
    expect(result).toMatchObject({ status: "inconclusive", changedPaths: [{ path: "src/queue.ts", classification: "allowed" }] });
    expect(result.findings.map((finding) => finding.code)).toContain("STEP_SYMBOL_SCOPE_INCONCLUSIVE");
  });

  it("does not invent a symbol-scope finding when the workspace has no actual changes", () => {
    const current = facts({ workspace: { snapshot: packet().workspace, headChanges: [] } });
    const result = reconcileStepPacket(packet(), current);
    expect(result.changedPaths).toEqual([]);
    expect(result.findings.map((finding) => finding.code)).not.toContain("STEP_SYMBOL_SCOPE_INCONCLUSIVE");
  });

  it("retains file-scoped PASS when the current plan declares no symbols", () => {
    const symbolFreePlan = parsePlan(PLAN.replace("- Symbols: `enqueue`, `QUEUE_MAX_RETRIES`\n", ""));
    const compiled = compileStepPacket(input({ plan: symbolFreePlan }));
    if (!compiled.ok) throw new Error(compiled.reason);
    const current = facts({
      plan: {
        ...compiled.packet.plan,
        authority: stepPacketAuthority(symbolFreePlan, 1, "Stop when the PR is open."),
      },
    });
    expect(reconcileStepPacket(compiled.packet, current)).toMatchObject({
      status: "pass",
      changedPaths: [{ path: "src/queue.ts", classification: "allowed" }],
    });
  });

  function reconcileChecklistBytes(before: string, after: string) {
    const plan = parsePlan(PLAN);
    const compiled = compileStepPacket(input({ checklist: before }));
    if (!compiled.ok) throw new Error(compiled.reason);
    return reconcileStepPacket(compiled.packet, {
      project: compiled.packet.project,
      ticket: { ...compiled.packet.ticket, revision: "rev1:after-checklist" },
      batch: compiled.packet.batch,
      plan: {
        ...compiled.packet.plan,
        authority: stepPacketAuthority(plan, compiled.packet.step.index, "Stop when the PR is open."),
      },
      checklist: stepChecklistSnapshot(plan, after, compiled.packet.checklist.path, "3333333333333333"),
      evidence: [...compiled.packet.evidence.group, ...compiled.packet.evidence.ticket],
      workspace: { snapshot: compiled.packet.workspace, headChanges: [] },
    });
  }

  it("accepts only selected marker bytes while preserving CRLF, mixed terminators and uppercase X", () => {
    expect(reconcileChecklistBytes(
      "- [ ] Step 1 — first\r\n- [ ] Step 2 — second\r\n",
      "- [x] Step 1 — first\r\n- [ ] Step 2 — second\r\n",
    ).status).toBe("pass");
    expect(reconcileChecklistBytes(
      "- [ ] Step 1 — first\r\ncontext\r- [ ] Step 2 — second\n",
      "- [X] Step 1 — first\r\ncontext\r- [ ] Step 2 — second\n",
    ).status).toBe("pass");
  });

  it.each([
    ["CRLF to LF", "- [ ] Step 1 — first\r\n- [ ] Step 2 — second\r\n", "- [x] Step 1 — first\n- [ ] Step 2 — second\n"],
    ["CR to LF", "- [ ] Step 1 — first\r- [ ] Step 2 — second\r", "- [x] Step 1 — first\n- [ ] Step 2 — second\n"],
    ["mixed-line terminator", "- [ ] Step 1 — first\r\ncontext\r- [ ] Step 2 — second\n", "- [x] Step 1 — first\r\ncontext\n- [ ] Step 2 — second\n"],
    ["final newline removal", "- [ ] Step 1 — first\n- [ ] Step 2 — second\n", "- [x] Step 1 — first\n- [ ] Step 2 — second"],
    ["final newline addition", "- [ ] Step 1 — first\n- [ ] Step 2 — second", "- [x] Step 1 — first\n- [ ] Step 2 — second\n"],
  ])("refuses %s during a marker transition", (_label, before, after) => {
    const result = reconcileChecklistBytes(before, after);
    expect(result.status).toBe("fail");
    expect(result.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "STEP_CHECKLIST_CONTENT_CHANGED",
      "STEP_TICKET_REVISION_STALE",
    ]));
  });

  it("permits only heartbeat timing/phase churn, while binding the recorded worker run", () => {
    const base = {
      id: "TICK-001",
      status: "implementing",
      lease_id: "lease-1",
      lease_worker_run: "worker-1",
      claim_expires_at: "2026-08-31T10:00:00.000Z",
      lease_revision: 1,
      lease_phase: "implementing",
      lease_heartbeat_at: "2026-08-31T09:30:00.000Z",
      updated: "2026-08-31T09:30:00.000Z",
    };
    expect(stepTicketAuthority({
      ...base,
      claim_expires_at: "2026-08-31T12:00:00.000Z",
      lease_revision: 2,
      lease_phase: "running-command",
      lease_heartbeat_at: "2026-08-31T10:00:00.000Z",
      updated: "2026-08-31T10:00:00.000Z",
    })).toBe(stepTicketAuthority(base));
    expect(stepTicketAuthority({ ...base, lease_worker_run: "worker-2" })).not.toBe(stepTicketAuthority(base));
  });

  it("does not let an exact checklist tick mask another ticket or document mutation", () => {
    const value = packet();
    const changedItem = reconcileStepPacket(value, facts({
      ticket: { ...value.ticket, revision: "changed", itemAuthority: "e".repeat(64) },
    }));
    expect(changedItem.status).toBe("fail");
    expect(changedItem.findings.some((finding) => finding.code === "STEP_TICKET_AUTHORITY_STALE")).toBe(true);

    const changedDocument = reconcileStepPacket(value, facts({
      ticket: {
        ...value.ticket,
        revision: "changed",
        documents: [...value.ticket.documents, { path: "proof/proof.md", version: "f".repeat(16) }]
          .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0),
      },
    }));
    expect(changedDocument.status).toBe("fail");
    expect(changedDocument.findings.some((finding) => finding.code === "STEP_TICKET_DOCUMENTS_STALE")).toBe(true);
  });

  it("fails forbidden and undeclared changes with typed paths", () => {
    const value = packet();
    const result = reconcileStepPacket(value, facts({ workspace: { snapshot: value.workspace, headChanges: ["src/vendor/bundle.js", "README.md"] } }));
    expect(result.status).toBe("fail");
    expect(result.changedPaths).toEqual([
      { path: "src/vendor/bundle.js", classification: "forbidden" },
      { path: "README.md", classification: "undeclared" },
    ]);
  });

  it("classifies bounded matcher exhaustion as inconclusive with deny-first tri-state precedence", () => {
    const base = packet();
    const observed = Array.from({ length: 300 }, () => "x").join("/");
    const unknownMatch = Array.from({ length: 300 }, () => "**/x").join("/");
    const unknownMiss = `${unknownMatch}/never`;
    const reconcile = (allowedFiles: string[], forbiddenFiles: string[]) => {
      const { packetId: _ignored, ...body } = base;
      const changedBody = { ...body, allowedFiles, allowedSymbols: [], forbiddenFiles };
      const forged = { ...changedBody, packetId: stepPacketDigest(changedBody) };
      const authority = stepPacketAuthority(parsePlan(PLAN), 1, "Stop when the PR is open.");
      if (!authority) throw new Error("missing step authority");
      return reconcileStepPacket(forged, {
        project: forged.project,
        ticket: { ...forged.ticket, revision: "rev1:after-checklist" },
        batch: forged.batch,
        plan: { ...forged.plan, authority: { ...authority, allowedFiles, allowedSymbols: [], forbiddenFiles } },
        checklist: stepChecklistSnapshot(
          parsePlan(PLAN),
          base.checklist.content?.replace("[ ] Step 1", "[x] Step 1") ?? null,
          base.checklist.path,
          "3333333333333333",
        ),
        evidence: [...forged.evidence.group, ...forged.evidence.ticket],
        workspace: { snapshot: forged.workspace, headChanges: [observed] },
      });
    };

    const unknownAllowed = reconcile([unknownMatch], []);
    expect(unknownAllowed).toMatchObject({
      status: "inconclusive",
      changedPaths: [{ path: observed, classification: "inconclusive" }],
    });
    expect(unknownAllowed.findings.map((finding) => finding.code)).toContain("STEP_PATH_MATCH_INCONCLUSIVE");
    expect(unknownAllowed.findings.map((finding) => finding.code)).not.toContain("STEP_PATH_UNDECLARED");

    expect(reconcile([observed], [unknownMiss])).toMatchObject({
      status: "inconclusive",
      changedPaths: [{ path: observed, classification: "inconclusive" }],
    });
    expect(reconcile([observed], [unknownMiss, observed])).toMatchObject({
      status: "fail",
      changedPaths: [{ path: observed, classification: "forbidden" }],
    });
    expect(reconcile([unknownMiss, observed], [])).toMatchObject({
      status: "pass",
      changedPaths: [{ path: observed, classification: "allowed" }],
    });
  });

  it("charges a literal Cartesian product and keeps an unproved forbidden result ahead of an allowed literal", () => {
    const base = packet();
    const reconcile = (allowedFiles: string[], forbiddenFiles: string[], headChanges: string[]) => {
      const { packetId: _ignored, ...body } = base;
      const changedBody = { ...body, allowedFiles, forbiddenFiles };
      const forged = { ...changedBody, packetId: stepPacketDigest(changedBody) };
      const authority = stepPacketAuthority(parsePlan(PLAN), 1, "Stop when the PR is open.");
      if (!authority) throw new Error("missing step authority");
      return reconcileStepPacket(forged, {
        project: forged.project,
        ticket: { ...forged.ticket, revision: "rev1:after-checklist" },
        batch: forged.batch,
        plan: { ...forged.plan, authority: { ...authority, allowedFiles, forbiddenFiles } },
        checklist: stepChecklistSnapshot(
          parsePlan(PLAN),
          base.checklist.content?.replace("[ ] Step 1", "[x] Step 1") ?? null,
          base.checklist.path,
          "3333333333333333",
        ),
        evidence: [...forged.evidence.group, ...forged.evidence.ticket],
        workspace: { snapshot: forged.workspace, headChanges },
      });
    };

    const literals = Array.from(
      { length: STEP_PACKET_LIMITS.maxArrayEntries },
      (_, index) => `allowed/${String(index).padStart(3, "0")}-${"x".repeat(680)}.ts`,
    );
    const changes = [
      `changed/${"z".repeat(684)}.ts`,
      ...Array.from({ length: STEP_PACKET_LIMITS.maxArrayEntries - 1 }, (_, index) => `later/${index}.ts`),
    ];
    const cartesian = reconcile(literals, [], changes);
    expect(cartesian.status).toBe("inconclusive");
    expect(cartesian.findings.map((finding) => finding.code)).toContain("STEP_PATH_MATCH_INCONCLUSIVE");

    const observed = `allowed/${"z".repeat(700)}.ts`;
    const forbidden = Array.from(
      { length: STEP_PACKET_LIMITS.maxArrayEntries },
      (_, index) => `forbidden/${String(index).padStart(3, "0")}-${"x".repeat(694)}.ts`,
    );
    const denyUnknown = reconcile([observed], forbidden, [observed]);
    expect(denyUnknown).toMatchObject({
      status: "inconclusive",
      changedPaths: [{ path: observed, classification: "inconclusive" }],
    });
    expect(denyUnknown.findings.map((finding) => finding.code)).toContain("STEP_PATH_MATCH_INCONCLUSIVE");
  });

  it("classifies an exact newline-bearing Git path against a declaration glob", () => {
    const patterned = parsePlan(
      PLAN
        .replace("| Modify | `src/queue.ts` | retry loop |", "| Modify | `src/**` | retry sources |")
        .replace("| Add | `src/queue.test.ts` | retry proof |\n", "")
        .replace("- Files: `src/queue.ts`, `src/queue.test.ts`", "- Files: `src/*.ts`")
        .replace("- Symbols: `enqueue`, `QUEUE_MAX_RETRIES`\n", ""),
    );
    const compiled = compileStepPacket(input({ plan: patterned }));
    if (!compiled.ok) throw new Error(compiled.reason);
    const currentChecklist = {
      ...compiled.packet.checklist,
      version: "changed",
      content: compiled.packet.checklist.content?.replace("[ ] Step 1", "[x] Step 1") ?? null,
      steps: [true, false],
    };
    const result = reconcileStepPacket(compiled.packet, {
      project: compiled.packet.project,
      ticket: { ...compiled.packet.ticket, revision: "changed" },
      batch: null,
      plan: { ...compiled.packet.plan, authority: stepPacketAuthority(patterned, 1, "Stop when the PR is open.") },
      checklist: currentChecklist,
      evidence: [...compiled.packet.evidence.group, ...compiled.packet.evidence.ticket],
      workspace: { snapshot: compiled.packet.workspace, headChanges: ["src/雪\nqueue.ts"] },
    });
    expect(result.status).toBe("pass");
    expect(result.changedPaths).toEqual([{ path: "src/雪\nqueue.ts", classification: "allowed" }]);
  });

  it("refuses a tampered or v1 packet before trusting observations", () => {
    const tampered = { ...packet(), allowedFiles: ["README.md"] };
    expect(reconcileStepPacket(tampered, facts()).status).toBe("inconclusive");
    expect(reconcileStepPacket({ ...packet(), packetVersion: "step-packet/1" }, facts()).status).toBe("inconclusive");
  });

  it("fails independently stale plan, evidence and checklist deviation", () => {
    const value = packet();
    const result = reconcileStepPacket(value, facts({
      plan: { ...value.plan, version: "stale" },
      evidence: [...value.evidence.group, { ...value.evidence.ticket[0], version: "stale" }],
      checklist: { ...value.checklist, version: "changed", steps: [false, true] },
    }));
    expect(result.status).toBe("fail");
    expect(result.findings.map((finding) => finding.code)).toEqual(expect.arrayContaining(["STEP_PLAN_STALE", "STEP_EVIDENCE_STALE", "STEP_NOT_COMPLETED", "STEP_LATER_ADVANCED"]));
  });

  it("is inconclusive when workspace or evidence cannot be read", () => {
    expect(reconcileStepPacket(packet(), facts({ workspace: null, evidence: null })).status).toBe("inconclusive");
  });

  it("derives another change to a pre-dirty path from entry identities", () => {
    const baselineEntry = { path: "src/queue.ts", index: ".", worktree: "M", content: "a".repeat(64) };
    const result = compileStepPacket(input({ workspace: { ...input().workspace!, entries: [baselineEntry] } }));
    if (!result.ok) throw new Error(result.reason);
    const current = { ...result.packet.workspace, entries: [{ ...baselineEntry, content: "b".repeat(64) }] };
    const currentChecklist = {
      ...result.packet.checklist,
      version: "changed",
      content: result.packet.checklist.content?.replace("[ ] Step 1", "[x] Step 1") ?? null,
      steps: [true, false],
    };
    expect(reconcileStepPacket(result.packet, {
      project: result.packet.project,
      ticket: { ...result.packet.ticket, revision: "changed" },
      batch: result.packet.batch,
      plan: { ...result.packet.plan, authority: stepPacketAuthority(parsePlan(PLAN), result.packet.step.index, "Stop when the PR is open.") },
      checklist: currentChecklist,
      evidence: [...result.packet.evidence.group, ...result.packet.evidence.ticket],
      workspace: { snapshot: current, headChanges: [] },
    }).changedPaths).toEqual([{ path: "src/queue.ts", classification: "allowed" }]);
  });

  it("detects a same-path porcelain role or cardinality change", () => {
    const recreated = { path: "src/queue.ts", index: "?", worktree: "?", content: "a".repeat(64) };
    const renameSource = { path: "src/queue.ts", index: "R", worktree: ".", content: "b".repeat(64) };
    const compiled = compileStepPacket(input({
      workspace: { ...input().workspace!, entries: [recreated, renameSource] },
    }));
    if (!compiled.ok) throw new Error(compiled.reason);
    const currentChecklist = {
      ...compiled.packet.checklist,
      version: "changed",
      content: compiled.packet.checklist.content?.replace("[ ] Step 1", "[x] Step 1") ?? null,
      steps: [true, false],
    };
    const result = reconcileStepPacket(compiled.packet, {
      project: compiled.packet.project,
      ticket: { ...compiled.packet.ticket, revision: "changed" },
      batch: compiled.packet.batch,
      plan: { ...compiled.packet.plan, authority: stepPacketAuthority(parsePlan(PLAN), compiled.packet.step.index, "Stop when the PR is open.") },
      checklist: currentChecklist,
      evidence: [...compiled.packet.evidence.group, ...compiled.packet.evidence.ticket],
      workspace: { snapshot: { ...compiled.packet.workspace, entries: [renameSource] }, headChanges: [] },
    });
    expect(result.changedPaths).toEqual([{ path: "src/queue.ts", classification: "allowed" }]);
  });

  it("rejects recomputed digest authority that broadens the live plan", () => {
    const original = packet();
    const { packetId: _ignored, ...body } = original;
    const changedBody = { ...body, allowedFiles: [...body.allowedFiles, "README.md"] };
    const forged = { ...changedBody, packetId: stepPacketDigest(changedBody) };
    const result = reconcileStepPacket(forged, facts());
    expect(result.status).toBe("fail");
    expect(result.findings.some((finding) => finding.code === "STEP_PLAN_AUTHORITY_MISMATCH")).toBe(true);
  });
});
