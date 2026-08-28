/**
 * Compiling an approved plan into one bounded step packet (FRD-033, CORE-118).
 *
 * A whole-ticket execution packet answers "what is this ticket?". A *step*
 * packet answers the narrower question a constrained worker needs: which files
 * and symbols am I allowed to touch, what exactly must change, which tests and
 * commands prove it, what output do I expect, and where do I stop? The worker
 * returns after one step; the controller reconciles the actual changes before
 * another packet is issued.
 *
 * Pure: this module reads no file, runs no command and touches no store. The
 * caller supplies the already-read plan, checklist, identity, workspace and
 * evidence versions, and gets back either a packet or a refusal with the same
 * validation report attached to both.
 */

import { createHash } from "node:crypto";
import {
  validatePlan,
  type ParsedPlan,
  type PlanStep,
  type PlanValidation,
} from "./plan.js";

/** The wire version of the compiled packet. Bump when its shape changes. */
export const STEP_PACKET_VERSION = "step-packet/1";

/** The boundary every step packet carries, whatever the plan's own wording. */
export const STEP_RETURN_STOP =
  "Complete only this step, then stop and report. The controller reconciles the actual changes and " +
  "evidence before another packet is issued; do not begin the next step, merge, or start another ticket.";

/**
 * One evidence document the packet was compiled against.
 *
 * FRD-033 keeps two layers apart: `group` is the shared research a whole batch
 * of tickets relies on, `ticket` is this ticket's own impact research.
 */
export interface StepPacketEvidence {
  layer: "group" | "ticket";
  /** Group id for the shared layer; null for ticket-scoped evidence. */
  group: string | null;
  /** `<group-id>/context.md` for the shared layer, else a ticket-relative document path. */
  path: string;
  version: string;
}

/** Logical project identity (FRD-029) carried by the packet. */
export interface StepPacketProject {
  /** Null until the board's one-time logical-identity migration has run. */
  project_id: string | null;
  board_id: string | null;
  /** The machine-local fingerprint, always present as the auditable fallback. */
  fingerprint: string;
}

/** The one workspace this packet authorises work in. */
export interface StepPacketWorkspace {
  branch: string | null;
  worktree: string | null;
}

/** Everything {@link compileStepPacket} needs. All of it is already-read data. */
export interface StepPacketInput {
  plan: ParsedPlan;
  planPath: string;
  planVersion: string | null;
  project: StepPacketProject;
  ticket: { id: string; revision: string | null };
  /** Batch id when this ticket shares a frozen batch workspace, else null. */
  batch: string | null;
  workspace: StepPacketWorkspace | null;
  evidence: readonly StepPacketEvidence[];
  /** The checklist document, used to resolve `select: "next"`. */
  checklist: string | null;
  /** A 1-based step index, or `"next"` for the first unfinished step. */
  select: number | "next";
  /** The plan-wide stop condition the caller already resolved. */
  stopCondition: string;
}

/** The compiled, versioned packet a constrained worker executes. */
export interface StepPacket {
  packetVersion: string;
  /** Deterministic identity of this exact packet content. */
  packetId: string;
  project: StepPacketProject;
  ticket: { id: string; revision: string | null };
  batch: string | null;
  workspace: StepPacketWorkspace | null;
  plan: { path: string; version: string | null };
  step: { index: number; total: number; id: string; title: string };
  allowedFiles: string[];
  allowedSymbols: string[];
  forbiddenFiles: string[];
  preconditions: string | null;
  requiredBehaviour: string | null;
  preservedBehaviour: string | null;
  forbiddenBehaviour: string | null;
  negativeCases: string[];
  tests: string[];
  commands: string[];
  expectedOutput: string | null;
  doneCondition: string | null;
  deviationStop: string | null;
  stopCondition: string;
  evidence: { group: StepPacketEvidence[]; ticket: StepPacketEvidence[] };
}

/** Compilation either produces a packet or refuses; both carry the report. */
export type StepPacketResult =
  | { ok: true; packet: StepPacket; validation: PlanValidation }
  | { ok: false; reason: string; validation: PlanValidation };

/** The ticked state of each `- [ ]` box of a checklist, in document order. */
export function checklistBoxes(checklist: string | null): boolean[] {
  if (!checklist) return [];
  return [...checklist.matchAll(/^[ \t]*[-*+][ \t]*\[([ xX])\]/gm)].map((match) => match[1].toLowerCase() === "x");
}

/** Checklist lines that name a step, paired with their ticked state. */
function boxesByStep(checklist: string | null): Map<number, boolean[]> {
  const byStep = new Map<number, boolean[]>();
  if (!checklist) return byStep;
  for (const line of checklist.replace(/\r\n?/g, "\n").split("\n")) {
    const box = /^[ \t]*[-*+][ \t]*\[([ xX])\][ \t]*(.*)$/.exec(line);
    if (!box) continue;
    const named = /\bstep[\s ]+(\d+)\b/i.exec(box[2]);
    if (!named) continue;
    const index = Number(named[1]);
    const ticked = box[1].toLowerCase() === "x";
    byStep.set(index, [...(byStep.get(index) ?? []), ticked]);
  }
  return byStep;
}

/**
 * The first step that is not yet finished.
 *
 * A checklist that names its steps ("Step 3 — …") is read by name, because real
 * checklists carry more boxes than steps. One that names none is read
 * positionally. No checklist at all means step 1.
 */
export function nextStepIndex(plan: ParsedPlan, checklist: string | null): number | null {
  if (plan.steps.length === 0) return null;
  const named = boxesByStep(checklist);
  if (named.size > 0) {
    for (const step of plan.steps) {
      const boxes = named.get(step.index);
      if (!boxes || boxes.some((ticked) => !ticked)) return step.index;
    }
    return null;
  }
  const boxes = checklistBoxes(checklist);
  if (boxes.length === 0) return 1;
  for (const step of plan.steps) {
    if (!boxes[step.index - 1]) return step.index;
  }
  return null;
}

function stepField(
  step: PlanStep,
  field: "preconditions" | "change" | "preserved" | "forbidden" | "expected" | "done" | "deviation",
): string | null {
  return step.fields[field] ?? null;
}

/** Canonical, key-ordered JSON so the same content always hashes the same. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function refusalReason(validation: PlanValidation): string {
  const blockers = validation.findings.filter((finding) => finding.severity === "blocker");
  return `The plan cannot be compiled into a bounded step packet: ${blockers.map((finding) => finding.message).join(" ")}`;
}

/**
 * Compile one ordered step into a versioned, bounded packet.
 *
 * Refusal is a normal return value with the same validation report a ready
 * packet carries; nothing here mutates anything, so a refusal leaves board
 * stage, claim and workspace untouched by construction.
 */
export function compileStepPacket(input: StepPacketInput): StepPacketResult {
  const { plan, checklist, select } = input;
  const liveEvidence = input.evidence.map((entry) => ({ path: entry.path, version: entry.version }));
  // A ticket that carries its own impact research is expected to pin it; a
  // trivial one carries none and must not accrue invented research debt.
  const requireEvidencePin = input.evidence.some(
    (entry) => entry.layer === "ticket" && /^(?:research|files)\//.test(entry.path),
  );

  const resolved = select === "next" ? nextStepIndex(plan, checklist) : select;
  if (resolved === null) {
    const validation = validatePlan(plan, { liveEvidence, requireEvidencePin });
    return {
      ok: false,
      reason:
        plan.steps.length === 0
          ? "The plan has no ordered steps, so there is no next step to compile."
          : "Every ordered step is already ticked in the checklist; there is no next step to compile.",
      validation,
    };
  }

  const validation = validatePlan(plan, { step: resolved, liveEvidence, requireEvidencePin });
  if (!validation.ok) return { ok: false, reason: refusalReason(validation), validation };

  const step = plan.steps[resolved - 1];
  const evidence = {
    group: input.evidence.filter((entry) => entry.layer === "group"),
    ticket: input.evidence.filter((entry) => entry.layer === "ticket"),
  };
  const body = {
    packetVersion: STEP_PACKET_VERSION,
    project: input.project,
    ticket: input.ticket,
    batch: input.batch,
    workspace: input.workspace,
    plan: { path: input.planPath, version: input.planVersion },
    step: { index: step.index, total: plan.steps.length, id: step.id, title: step.title },
    allowedFiles: step.files,
    allowedSymbols: step.symbols,
    forbiddenFiles: plan.doNotModify,
    preconditions: stepField(step, "preconditions"),
    requiredBehaviour: stepField(step, "change"),
    preservedBehaviour: stepField(step, "preserved"),
    forbiddenBehaviour: stepField(step, "forbidden"),
    negativeCases: step.negativeCases,
    tests: step.tests,
    commands: step.commands,
    expectedOutput: stepField(step, "expected"),
    doneCondition: stepField(step, "done"),
    deviationStop: stepField(step, "deviation"),
    stopCondition: `${input.stopCondition.trim()}\n\n${STEP_RETURN_STOP}`,
    evidence,
  };

  return {
    ok: true,
    packet: { ...body, packetId: createHash("sha256").update(canonicalJson(body), "utf8").digest("hex").slice(0, 16) },
    validation,
  };
}
