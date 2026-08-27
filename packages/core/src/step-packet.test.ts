import { describe, expect, it } from "vitest";
import { parsePlan } from "./plan.js";
import {
  compileStepPacket,
  nextStepIndex,
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
    ticket: { id: "TICK-001", revision: "rev1:deadbeef" },
    batch: null,
    workspace: { branch: "tick-001-queue", worktree: ".worktrees/tick-001" },
    evidence: EVIDENCE,
    checklist: null,
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
    expect(result.packet.ticket).toEqual({ id: "TICK-001", revision: "rev1:deadbeef" });
    expect(result.packet.batch).toBe("batch-queue");
    expect(result.packet.workspace).toEqual({ branch: "tick-001-queue", worktree: ".worktrees/tick-001" });
    expect(result.packet.plan).toEqual({ path: "plan/plan.md", version: "1111111111111111" });
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

  it("gives identical input a stable packet id and different input a different one", () => {
    const first = compileStepPacket(input());
    const again = compileStepPacket(input());
    const other = compileStepPacket(input({ select: 2 }));
    if (!first.ok || !again.ok || !other.ok) throw new Error("expected three ready packets");
    expect(first.packet.packetId).toMatch(/^[0-9a-f]{16}$/);
    expect(again.packet.packetId).toBe(first.packet.packetId);
    expect(other.packet.packetId).not.toBe(first.packet.packetId);
  });
});

describe("compileStepPacket refusals", () => {
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

  it("starts at step 1 when there is no checklist", () => {
    expect(nextStepIndex(plan, null)).toBe(1);
    const result = compileStepPacket(input({ select: "next" }));
    if (!result.ok) throw new Error(result.reason);
    expect(result.packet.step.index).toBe(1);
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
});
