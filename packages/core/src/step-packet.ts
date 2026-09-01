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
  createPlanPathMatchBudget,
  parsePlanPath,
  planPathMatch,
  validatePlan,
  type ParsedPlan,
  type PlanStep,
  type PlanValidation,
} from "./plan.js";

/** The wire version of the compiled packet. Bump when its shape changes. */
export const STEP_PACKET_VERSION = "step-packet/2";

/** The boundary every step packet carries, whatever the plan's own wording. */
export const STEP_RETURN_STOP =
  "Complete only this step, then stop and report. The controller reconciles the actual changes and " +
  "evidence before another packet is issued; do not begin the next step, merge, or start another ticket.";

/** Hard bounds applied before packet compilation, verification or hashing. */
export const STEP_PACKET_LIMITS = {
  maxEncodedBytes: 512 * 1024,
  maxStringBytes: 64 * 1024,
  maxChecklistBytes: 128 * 1024,
  maxChecklistLines: 4_096,
  maxArrayEntries: 512,
  maxAggregateEntries: 2_048,
  maxObjectKeys: 128,
  maxAggregateKeys: 4_096,
  maxDepth: 16,
  maxDocuments: 256,
} as const;

export type StepPacketBudgetResult = { ok: true } | { ok: false; reason: string };

const budgetEncoder = new TextEncoder();

function checklistString(path: readonly string[]): boolean {
  const last = path[path.length - 1];
  return last === "checklist" || (last === "content" && path[path.length - 2] === "checklist");
}

/**
 * Bound caller-controlled packet/document material before any canonical JSON
 * construction. The estimate includes every key/value byte plus structural
 * overhead; it deliberately errs high rather than allocating an unbounded
 * serialized copy merely to measure it.
 */
export function checkStepPacketBudget(value: unknown): StepPacketBudgetResult {
  let encodedBytes = 0;
  let aggregateEntries = 0;
  let aggregateKeys = 0;
  const active = new WeakSet<object>();
  const addBytes = (count: number): StepPacketBudgetResult => {
    encodedBytes += count;
    return encodedBytes > STEP_PACKET_LIMITS.maxEncodedBytes
      ? { ok: false, reason: `step packet material exceeds ${STEP_PACKET_LIMITS.maxEncodedBytes} encoded bytes` }
      : { ok: true };
  };
  const visit = (entry: unknown, path: string[], depth: number): StepPacketBudgetResult => {
    if (depth > STEP_PACKET_LIMITS.maxDepth) return { ok: false, reason: `step packet material exceeds depth ${STEP_PACKET_LIMITS.maxDepth}` };
    if (typeof entry === "string") {
      if (entry.length > STEP_PACKET_LIMITS.maxChecklistBytes) {
        return { ok: false, reason: "step packet string exceeds its encoded-byte budget" };
      }
      const bytes = budgetEncoder.encode(entry).length;
      const limit = checklistString(path) ? STEP_PACKET_LIMITS.maxChecklistBytes : STEP_PACKET_LIMITS.maxStringBytes;
      if (bytes > limit) return { ok: false, reason: `${checklistString(path) ? "checklist" : "step packet string"} exceeds ${limit} encoded bytes` };
      if (checklistString(path)) {
        let lines = 1;
        for (let index = 0; index < entry.length; index += 1) {
          if (entry[index] === "\n" || (entry[index] === "\r" && entry[index + 1] !== "\n")) lines += 1;
          if (lines > STEP_PACKET_LIMITS.maxChecklistLines) return { ok: false, reason: `checklist exceeds ${STEP_PACKET_LIMITS.maxChecklistLines} lines` };
        }
      }
      return addBytes(bytes + 2);
    }
    if (typeof entry === "number" && !Number.isFinite(entry)) {
      return { ok: false, reason: "step packet material contains a non-finite number" };
    }
    if (entry === null || entry === undefined || typeof entry === "boolean" || typeof entry === "number") {
      return addBytes(String(entry ?? null).length + 1);
    }
    if (typeof entry !== "object") return { ok: false, reason: "step packet material contains an unsupported value" };
    if (entry instanceof Date) {
      if (Object.getPrototypeOf(entry) !== Date.prototype || !Number.isFinite(entry.getTime())) {
        return { ok: false, reason: "step packet material contains an invalid or unsupported Date" };
      }
      return addBytes(budgetEncoder.encode(entry.toISOString()).length + 16);
    }
    if (active.has(entry)) return { ok: false, reason: "step packet material is cyclic" };
    active.add(entry);
    try {
      if (Array.isArray(entry)) {
        if (Object.getPrototypeOf(entry) !== Array.prototype) {
          return { ok: false, reason: "step packet material contains an unsupported object prototype" };
        }
        if (entry.length > STEP_PACKET_LIMITS.maxArrayEntries) return { ok: false, reason: `step packet array exceeds ${STEP_PACKET_LIMITS.maxArrayEntries} entries` };
        aggregateEntries += entry.length;
        if (aggregateEntries > STEP_PACKET_LIMITS.maxAggregateEntries) return { ok: false, reason: `step packet arrays exceed ${STEP_PACKET_LIMITS.maxAggregateEntries} aggregate entries` };
        const structural = addBytes(entry.length + 2);
        if (!structural.ok) return structural;
        for (let index = 0; index < entry.length; index += 1) {
          const nested = visit(entry[index], [...path, String(index)], depth + 1);
          if (!nested.ok) return nested;
        }
        return { ok: true };
      }
      const prototype = Object.getPrototypeOf(entry);
      if ((prototype !== Object.prototype && prototype !== null) || Object.getOwnPropertySymbols(entry).length > 0) {
        return { ok: false, reason: "step packet material contains an unsupported object prototype or symbol key" };
      }
      const entries = Object.entries(entry as Record<string, unknown>);
      if (entries.length > STEP_PACKET_LIMITS.maxObjectKeys) return { ok: false, reason: `step packet object exceeds ${STEP_PACKET_LIMITS.maxObjectKeys} keys` };
      aggregateKeys += entries.length;
      if (aggregateKeys > STEP_PACKET_LIMITS.maxAggregateKeys) return { ok: false, reason: `step packet objects exceed ${STEP_PACKET_LIMITS.maxAggregateKeys} aggregate keys` };
      const structural = addBytes(entries.length + 2);
      if (!structural.ok) return structural;
      for (const [key, nestedValue] of entries) {
        const keyBudget = addBytes(budgetEncoder.encode(key).length + 3);
        if (!keyBudget.ok) return keyBudget;
        const nested = visit(nestedValue, [...path, key], depth + 1);
        if (!nested.ok) return nested;
      }
      return { ok: true };
    } finally {
      active.delete(entry);
    }
  };
  return visit(value, [], 0);
}

/** Locale-independent UTF-16 lexical order, stable across Windows and Linux. */
function lexicalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

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
  /** Exact commit checked out when the packet was issued. */
  head: string | null;
  /** Canonical dirty state present before the worker started. */
  entries: StepWorkspaceEntry[];
}

export interface StepWorkspaceEntry {
  path: string;
  /** Porcelain index state (`.` means unchanged). */
  index: string;
  /** Porcelain worktree state (`.` means unchanged). */
  worktree: string;
  /** SHA-256 of the bounded observed content/state; never raw file content. */
  content: string;
}

export interface StepPacketChecklist {
  path: string;
  version: string | null;
  /** Exact bounded baseline; needed to prove only checklist markers changed. */
  content: string | null;
  /** One completion state per ordered plan step at issuance. */
  steps: boolean[];
  /** Zero-based line indexes containing each step's checklist markers. */
  stepLines: number[][];
}

/** Ticket state bound independently from the document-inclusive revision. */
export interface StepPacketTicket {
  id: string;
  revision: string | null;
  /** Hash of all ticket fields except the explicitly renewable heartbeat projection. */
  itemAuthority: string;
  /** Complete document-inclusive revision census at issuance. */
  documents: Array<{ path: string; version: string }>;
}

/** Everything {@link compileStepPacket} needs. All of it is already-read data. */
export interface StepPacketInput {
  plan: ParsedPlan;
  planPath: string;
  planVersion: string | null;
  project: StepPacketProject;
  ticket: StepPacketTicket;
  /** Batch id when this ticket shares a frozen batch workspace, else null. */
  batch: string | null;
  workspace: StepPacketWorkspace | null;
  evidence: readonly StepPacketEvidence[];
  /** The checklist document, used to resolve `select: "next"`. */
  checklist: string | null;
  checklistPath: string;
  checklistVersion: string | null;
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
  ticket: StepPacketTicket;
  batch: string | null;
  workspace: StepPacketWorkspace;
  plan: { path: string; version: string | null };
  checklist: StepPacketChecklist;
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

export type StepPacketAuthority = Pick<StepPacket,
  | "step"
  | "allowedFiles"
  | "allowedSymbols"
  | "forbiddenFiles"
  | "preconditions"
  | "requiredBehaviour"
  | "preservedBehaviour"
  | "forbiddenBehaviour"
  | "negativeCases"
  | "tests"
  | "commands"
  | "expectedOutput"
  | "doneCondition"
  | "deviationStop"
  | "stopCondition"
>;

/** Compilation either produces a packet or refuses; both carry the report. */
export type StepPacketResult =
  | { ok: true; packet: StepPacket; validation: PlanValidation }
  | { ok: false; reason: string; validation: PlanValidation };

/** The ticked state of each `- [ ]` box of a checklist, in document order. */
export function checklistBoxes(checklist: string | null): boolean[] {
  if (!checklist) return [];
  const states: boolean[] = [];
  for (const [lineIndex, line] of checklist.replace(/\r\n?/g, "\n").split("\n").entries()) {
    const match = /^[ \t]*[-*+][ \t]*\[([ xX])\]/.exec(checklistLineForParsing(line, lineIndex));
    if (match) states.push(match[1].toLowerCase() === "x");
  }
  return states;
}

/** A UTF-8 BOM is syntax only at byte zero; exact content retains it. */
function checklistLineForParsing(line: string, lineIndex: number): string {
  return lineIndex === 0 && line.startsWith("\uFEFF") ? line.slice(1) : line;
}

/** Checklist lines that name a step, paired with their ticked state. */
function boxesByStep(checklist: string | null): Map<number, boolean[]> {
  const byStep = new Map<number, boolean[]>();
  if (!checklist) return byStep;
  for (const [lineIndex, line] of checklist.replace(/\r\n?/g, "\n").split("\n").entries()) {
    const box = /^[ \t]*[-*+][ \t]*\[([ xX])\][ \t]*(.*)$/.exec(checklistLineForParsing(line, lineIndex));
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

/** Completion state for each ordered step, using the same named/positional rule as `next`. */
export function checklistStepStates(plan: ParsedPlan, checklist: string | null): boolean[] {
  const named = boxesByStep(checklist);
  if (named.size > 0) {
    return plan.steps.map((step) => {
      const boxes = named.get(step.index);
      return Boolean(boxes?.length) && boxes!.every(Boolean);
    });
  }
  const boxes = checklistBoxes(checklist);
  return plan.steps.map((_, index) => boxes[index] === true);
}

function checklistStepLines(plan: ParsedPlan, checklist: string | null): number[][] {
  const result = plan.steps.map(() => [] as number[]);
  if (!checklist) return result;
  const lines = checklist.replace(/\r\n?/g, "\n").split("\n");
  const named = lines.some((line, lineIndex) => /^[ \t]*[-*+][ \t]*\[[ xX]\].*\bstep[\s ]+\d+\b/i.test(checklistLineForParsing(line, lineIndex)));
  let positional = 0;
  for (const [lineIndex, line] of lines.entries()) {
    const box = /^[ \t]*[-*+][ \t]*\[([ xX])\][ \t]*(.*)$/.exec(checklistLineForParsing(line, lineIndex));
    if (!box) continue;
    const stepIndex = named ? Number(/\bstep[\s ]+(\d+)\b/i.exec(box[2])?.[1] ?? 0) - 1 : positional++;
    if (stepIndex >= 0 && stepIndex < result.length) result[stepIndex].push(lineIndex);
  }
  return result;
}

export function stepChecklistSnapshot(
  plan: ParsedPlan,
  content: string | null,
  path: string,
  version: string | null,
): StepPacketChecklist {
  return { path, version, content, steps: checklistStepStates(plan, content), stepLines: checklistStepLines(plan, content) };
}

function stepField(
  step: PlanStep,
  field: "preconditions" | "change" | "preserved" | "forbidden" | "expected" | "done" | "deviation",
): string | null {
  return step.fields[field] ?? null;
}

/** Reconstruct every plan-derived authority field without trusting a packet. */
export function stepPacketAuthority(
  plan: ParsedPlan,
  index: number,
  stopCondition: string,
): StepPacketAuthority | null {
  const step = plan.steps[index - 1];
  if (!step) return null;
  return {
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
    stopCondition: `${stopCondition.trim()}\n\n${STEP_RETURN_STOP}`,
  };
}

function authorityOf(packet: StepPacket): StepPacketAuthority {
  return {
    step: packet.step,
    allowedFiles: packet.allowedFiles,
    allowedSymbols: packet.allowedSymbols,
    forbiddenFiles: packet.forbiddenFiles,
    preconditions: packet.preconditions,
    requiredBehaviour: packet.requiredBehaviour,
    preservedBehaviour: packet.preservedBehaviour,
    forbiddenBehaviour: packet.forbiddenBehaviour,
    negativeCases: packet.negativeCases,
    tests: packet.tests,
    commands: packet.commands,
    expectedOutput: packet.expectedOutput,
    doneCondition: packet.doneCondition,
    deviationStop: packet.deviationStop,
    stopCondition: packet.stopCondition,
  };
}

/** Canonical, key-ordered JSON so the same content always hashes the same. */
function canonicalJson(value: unknown): string {
  if (value instanceof Date) return `@kanmer-date:${JSON.stringify(value.toISOString())}`;
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Bind every ticket/frontmatter field that can change worker authority.
 * A normal lease heartbeat may renew only these progress fields while a worker
 * is running; lease id, owner/controller, workspace, batch and every product or
 * workflow field remain in the hash. In particular `lease_worker_run` is an
 * identity, not heartbeat timing, and cannot be replaced under an existing
 * packet. This makes the heartbeat exception explicit instead of waiving any
 * aggregate ticket revision change.
 */
export function stepTicketAuthority(value: unknown): string {
  const budget = checkStepPacketBudget(value);
  if (!budget.ok) throw new Error(`ticket authority cannot be hashed: ${budget.reason}`);
  const item = record(value);
  if (!item) throw new Error("ticket authority requires an object");
  const volatile = new Set([
    "updated",
    "claim_expires_at",
    "lease_revision",
    "lease_phase",
    "lease_heartbeat_at",
  ]);
  const authority = Object.fromEntries(Object.entries(item).filter(([key]) => !volatile.has(key)));
  return createHash("sha256").update(canonicalJson(authority), "utf8").digest("hex");
}

/** Deterministic digest of a packet body (everything except `packetId`). */
export function stepPacketDigest(body: Omit<StepPacket, "packetId">): string {
  const budget = checkStepPacketBudget(body);
  if (!budget.ok) throw new Error(`step packet cannot be hashed: ${budget.reason}`);
  return createHash("sha256").update(canonicalJson(body), "utf8").digest("hex");
}

export type StepPacketVerification =
  | { ok: true; packet: StepPacket }
  | { ok: false; reason: string };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.trim().length > 0);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function canonicalPacketPath(value: unknown, options: { allowPattern?: boolean; observed?: boolean } = {}): value is string {
  if (typeof value !== "string") return false;
  const parsed = parsePlanPath(value, options);
  return parsed.ok && parsed.path === value;
}

function checklistLineMap(content: string | null, total: number): number[][] {
  const result = Array.from({ length: total }, () => [] as number[]);
  if (content === null) return result;
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const named = lines.some((line, lineIndex) => /^[ \t]*[-*+][ \t]*\[[ xX]\].*\bstep[\s ]+\d+\b/i.test(checklistLineForParsing(line, lineIndex)));
  let positional = 0;
  for (const [lineIndex, line] of lines.entries()) {
    const box = /^[ \t]*[-*+][ \t]*\[[ xX]\][ \t]*(.*)$/.exec(checklistLineForParsing(line, lineIndex));
    if (!box) continue;
    const selected = named ? Number(/\bstep[\s ]+(\d+)\b/i.exec(box[1])?.[1] ?? 0) - 1 : positional++;
    if (selected >= 0 && selected < total) result[selected].push(lineIndex);
  }
  return result;
}

function checklistStatesFromLineMap(
  content: string | null,
  stepLines: readonly (readonly number[])[],
): { markers: boolean[][]; steps: boolean[] } | null {
  const lines = content === null ? [] : content.replace(/\r\n?/g, "\n").split("\n");
  const markers: boolean[][] = [];
  for (const mapped of stepLines) {
    const states: boolean[] = [];
    for (const lineIndex of mapped) {
      const line = lines[lineIndex];
      if (line === undefined) return null;
      const match = /^[ \t]*[-*+][ \t]*\[([ xX])\]/.exec(checklistLineForParsing(line, lineIndex));
      if (!match) return null;
      states.push(match[1].toLowerCase() === "x");
    }
    markers.push(states);
  }
  return { markers, steps: markers.map((states) => states.length > 0 && states.every(Boolean)) };
}

function nonEmptyStringOrNull(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.trim().length > 0);
}

/** Validate a complete caller-retained packet and recompute its identity. */
export function verifyStepPacket(value: unknown): StepPacketVerification {
  const packet = record(value);
  if (!packet) return { ok: false, reason: "step_packet must be a complete object" };
  const budget = checkStepPacketBudget(packet);
  if (!budget.ok) return { ok: false, reason: budget.reason };
  if (packet.packetVersion !== STEP_PACKET_VERSION) {
    return { ok: false, reason: `step_packet version must be ${STEP_PACKET_VERSION}; older packets are not normalized` };
  }
  if (!exactKeys(packet, ["packetVersion", "packetId", "project", "ticket", "batch", "workspace", "plan", "checklist", "step", "allowedFiles", "allowedSymbols", "forbiddenFiles", "preconditions", "requiredBehaviour", "preservedBehaviour", "forbiddenBehaviour", "negativeCases", "tests", "commands", "expectedOutput", "doneCondition", "deviationStop", "stopCondition", "evidence"])) {
    return { ok: false, reason: "step_packet has missing or unknown top-level fields" };
  }
  if (typeof packet.packetId !== "string" || !/^[0-9a-f]{64}$/.test(packet.packetId)) {
    return { ok: false, reason: "step_packet.packetId is missing or malformed" };
  }
  const project = record(packet.project);
  const ticket = record(packet.ticket);
  const workspace = record(packet.workspace);
  const plan = record(packet.plan);
  const checklist = record(packet.checklist);
  const step = record(packet.step);
  const evidence = record(packet.evidence);
  if (!project || !ticket || !workspace || !plan || !checklist || !step || !evidence) {
    return { ok: false, reason: "step_packet is missing a required identity, workspace, plan, checklist, step or evidence block" };
  }
  if (!exactKeys(project, ["project_id", "board_id", "fingerprint"]) || !nonEmptyStringOrNull(project.project_id) || !nonEmptyStringOrNull(project.board_id) || typeof project.fingerprint !== "string" || !project.fingerprint.trim()) {
    return { ok: false, reason: "step_packet.project is malformed" };
  }
  if (!exactKeys(ticket, ["id", "revision", "itemAuthority", "documents"]) || typeof ticket.id !== "string" || !ticket.id.trim() || !nonEmptyStringOrNull(ticket.revision) || typeof ticket.itemAuthority !== "string" || !/^[0-9a-f]{64}$/.test(ticket.itemAuthority) || !Array.isArray(ticket.documents) || ticket.documents.length > STEP_PACKET_LIMITS.maxDocuments || !nonEmptyStringOrNull(packet.batch)) {
    return { ok: false, reason: "step_packet ticket or batch identity is malformed" };
  }
  const documentKeys: string[] = [];
  for (const value of ticket.documents) {
    const document = record(value);
    if (!document || !exactKeys(document, ["path", "version"]) || !canonicalPacketPath(document.path) || typeof document.version !== "string" || !document.version.trim()) {
      return { ok: false, reason: "step_packet ticket document census is malformed" };
    }
    documentKeys.push(document.path);
  }
  if (new Set(documentKeys).size !== documentKeys.length || documentKeys.some((key, index) => index > 0 && lexicalCompare(documentKeys[index - 1]!, key) >= 0)) {
    return { ok: false, reason: "step_packet ticket documents must be unique and canonically ordered" };
  }
  if (!exactKeys(workspace, ["branch", "worktree", "head", "entries"]) || typeof workspace.branch !== "string" || !workspace.branch.trim() || !canonicalPacketPath(workspace.worktree) || typeof workspace.head !== "string" || !/^[0-9a-f]{40}$/i.test(workspace.head) || !Array.isArray(workspace.entries)) {
    return { ok: false, reason: "step_packet.workspace is malformed" };
  }
  for (const entryValue of workspace.entries) {
    const entry = record(entryValue);
    if (!entry || !exactKeys(entry, ["path", "index", "worktree", "content"]) || typeof entry.path !== "string" || typeof entry.index !== "string" || typeof entry.worktree !== "string" || typeof entry.content !== "string") {
      return { ok: false, reason: "step_packet.workspace contains a malformed entry" };
    }
    if (!canonicalPacketPath(entry.path, { observed: true }) || !/^[.MADRCU?!T]$/.test(entry.index) || !/^[.MADRCU?!T]$/.test(entry.worktree) || !/^[0-9a-f]{64}$/.test(entry.content)) {
      return { ok: false, reason: "step_packet.workspace contains an unsafe path or malformed content identity" };
    }
  }
  const workspaceKeys = (workspace.entries as Array<Record<string, unknown>>).map((entry) => `${entry.path}\0${entry.index}\0${entry.worktree}`);
  if (new Set(workspaceKeys).size !== workspaceKeys.length || workspaceKeys.some((key, index) => index > 0 && lexicalCompare(workspaceKeys[index - 1]!, key) >= 0)) {
    return { ok: false, reason: "step_packet.workspace entries must be unique and canonically ordered" };
  }
  if (!exactKeys(plan, ["path", "version"]) || !canonicalPacketPath(plan.path) || !nonEmptyStringOrNull(plan.version)) {
    return { ok: false, reason: "step_packet.plan is malformed" };
  }
  if (!exactKeys(checklist, ["path", "version", "content", "steps", "stepLines"]) || !canonicalPacketPath(checklist.path) || !nonEmptyStringOrNull(checklist.version) || !stringOrNull(checklist.content) || !Array.isArray(checklist.steps) || !checklist.steps.every((state) => typeof state === "boolean") || !Array.isArray(checklist.stepLines) || !checklist.stepLines.every((lines) => Array.isArray(lines) && lines.every((line) => Number.isInteger(line) && line >= 0))) {
    return { ok: false, reason: "step_packet.checklist is malformed" };
  }
  const checklistLineCount = typeof checklist.content === "string" ? checklist.content.replace(/\r\n?/g, "\n").split("\n").length : 0;
  const allStepLines = (checklist.stepLines as number[][]).flat();
  if (new Set(allStepLines).size !== allStepLines.length || allStepLines.some((line) => line >= checklistLineCount)) {
    return { ok: false, reason: "step_packet.checklist stepLines are duplicate or outside the baseline content" };
  }
  if (!exactKeys(step, ["index", "total", "id", "title"]) || !Number.isInteger(step.index) || !Number.isInteger(step.total) || typeof step.id !== "string" || !step.id || typeof step.title !== "string" || !step.title || Number(step.index) < 1 || Number(step.total) < Number(step.index) || checklist.steps.length !== step.total || checklist.stepLines.length !== step.total) {
    return { ok: false, reason: "step_packet.step or checklist step census is malformed" };
  }
  if (canonicalJson(checklistLineMap(checklist.content as string | null, Number(step.total))) !== canonicalJson(checklist.stepLines)) {
    return { ok: false, reason: "step_packet.checklist stepLines do not match its exact baseline checkbox mapping" };
  }
  const derivedChecklist = checklistStatesFromLineMap(
    checklist.content as string | null,
    checklist.stepLines as number[][],
  );
  if (!derivedChecklist || canonicalJson(derivedChecklist.steps) !== canonicalJson(checklist.steps)) {
    return { ok: false, reason: "step_packet.checklist stored states do not match its exact content-derived marker states" };
  }
  const selected = Number(step.index) - 1;
  if ((checklist.stepLines as number[][])[selected]!.length === 0 || derivedChecklist.steps[selected] !== false) {
    return { ok: false, reason: "step_packet selected step must have at least one mapped unchecked checklist marker" };
  }
  if (derivedChecklist.steps.slice(0, selected).some((state) => state !== true)) {
    return { ok: false, reason: "step_packet selected step must be the first unfinished checklist step" };
  }
  const checkedSuccessor = derivedChecklist.markers.slice(selected + 1).findIndex((states) => states.some(Boolean));
  if (checkedSuccessor >= 0) {
    return { ok: false, reason: `step_packet checklist successor step ${selected + checkedSuccessor + 2} already has a checked marker` };
  }
  for (const key of ["allowedFiles", "allowedSymbols", "forbiddenFiles", "negativeCases", "tests", "commands"] as const) {
    if (!stringArray(packet[key])) return { ok: false, reason: `step_packet.${key} must be a string array` };
  }
  for (const pathValue of packet.allowedFiles as string[]) if (!canonicalPacketPath(pathValue, { allowPattern: true })) return { ok: false, reason: "step_packet.allowedFiles contains an unsafe or noncanonical path" };
  for (const pathValue of packet.forbiddenFiles as string[]) if (!canonicalPacketPath(pathValue, { allowPattern: true })) return { ok: false, reason: "step_packet.forbiddenFiles contains an unsafe or noncanonical pattern" };
  for (const key of ["preconditions", "requiredBehaviour", "preservedBehaviour", "forbiddenBehaviour", "expectedOutput", "doneCondition", "deviationStop"] as const) {
    if (!nonEmptyStringOrNull(packet[key])) return { ok: false, reason: `step_packet.${key} must be a non-empty string or null` };
  }
  if (typeof packet.stopCondition !== "string" || !packet.stopCondition.trim()) return { ok: false, reason: "step_packet.stopCondition is malformed" };
  if (!exactKeys(evidence, ["group", "ticket"])) return { ok: false, reason: "step_packet.evidence has missing or unknown fields" };
  for (const layer of ["group", "ticket"] as const) {
    if (!Array.isArray(evidence[layer])) return { ok: false, reason: `step_packet.evidence.${layer} must be an array` };
    for (const entryValue of evidence[layer] as unknown[]) {
      const entry = record(entryValue);
      if (!entry || !exactKeys(entry, ["layer", "group", "path", "version"]) || entry.layer !== layer || (layer === "group" ? typeof entry.group !== "string" || !entry.group.trim() : entry.group !== null) || !canonicalPacketPath(entry.path) || typeof entry.version !== "string" || !entry.version.trim()) {
        return { ok: false, reason: `step_packet.evidence.${layer} contains a malformed entry` };
      }
    }
    const keys = (evidence[layer] as Array<Record<string, unknown>>).map((entry) => `${entry.group ?? ""}\0${entry.path}`);
    if (new Set(keys).size !== keys.length || keys.some((key, index) => index > 0 && lexicalCompare(keys[index - 1]!, key) >= 0)) {
      return { ok: false, reason: `step_packet.evidence.${layer} must be unique and canonically ordered` };
    }
  }
  const { packetId, ...body } = packet;
  if (stepPacketDigest(body as Omit<StepPacket, "packetId">) !== packetId) {
    return { ok: false, reason: "step_packet digest does not match its complete canonical content" };
  }
  return { ok: true, packet: packet as unknown as StepPacket };
}

export type StepPathClassification = "allowed" | "forbidden" | "undeclared" | "inconclusive";
export type StepReconciliationStatus = "pass" | "fail" | "inconclusive";

export interface StepReconciliationFinding {
  code: string;
  message: string;
  path?: string;
}

export interface StepReconciliationResult {
  status: StepReconciliationStatus;
  packetId: string | null;
  changedPaths: Array<{ path: string; classification: StepPathClassification }>;
  findings: StepReconciliationFinding[];
}

export interface StepReconciliationFacts {
  project: StepPacketProject;
  ticket: StepPacketTicket;
  batch: string | null;
  plan: { path: string; version: string | null; authority: StepPacketAuthority | null } | null;
  checklist: StepPacketChecklist | null;
  evidence: StepPacketEvidence[] | null;
  workspace: { snapshot: StepPacketWorkspace; headChanges: string[] | null } | null;
}

interface ExactChecklistLine {
  body: string;
  terminator: "\r\n" | "\r" | "\n" | "";
}

function exactChecklistLines(content: string | null): ExactChecklistLine[] {
  if (content === null) return [];
  const lines: ExactChecklistLine[] = [];
  let start = 0;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character !== "\r" && character !== "\n") continue;
    const terminator: ExactChecklistLine["terminator"] = character === "\r" && content[index + 1] === "\n"
      ? "\r\n"
      : character as "\r" | "\n";
    lines.push({ body: content.slice(start, index), terminator });
    if (terminator === "\r\n") index += 1;
    start = index + 1;
  }
  lines.push({ body: content.slice(start), terminator: "" });
  return lines;
}

function tickedChecklistLine(before: string, after: string): boolean {
  const beforeBom = before.startsWith("\uFEFF") ? "\uFEFF" : "";
  const afterBom = after.startsWith("\uFEFF") ? "\uFEFF" : "";
  if (beforeBom !== afterBom) return false;
  const beforeBody = before.slice(beforeBom.length);
  const afterBody = after.slice(afterBom.length);
  const marker = /^([ \t]*[-*+][ \t]*)\[ \]/.exec(beforeBody);
  if (!marker) return false;
  const suffix = beforeBody.slice(marker[0].length);
  return afterBody === `${marker[1]}[x]${suffix}` || afterBody === `${marker[1]}[X]${suffix}`;
}

function untickedChecklistLine(line: string): boolean {
  return /^[ \t]*[-*+][ \t]*\[ \]/.test(line.startsWith("\uFEFF") ? line.slice(1) : line);
}

function checklistOnlyTransition(packet: StepPacket, current: StepPacketChecklist): boolean {
  const before = exactChecklistLines(packet.checklist.content);
  const after = exactChecklistLines(current.content);
  if (before.length !== after.length) return false;
  const allowedLines = new Set(packet.checklist.stepLines[packet.step.index - 1] ?? []);
  let transitions = 0;
  for (let index = 0; index < before.length; index += 1) {
    const baseline = before[index]!;
    const observed = after[index]!;
    if (baseline.terminator !== observed.terminator) return false;
    if (!allowedLines.has(index)) {
      if (baseline.body !== observed.body) return false;
      continue;
    }
    if (untickedChecklistLine(baseline.body)) {
      if (!tickedChecklistLine(baseline.body, observed.body)) return false;
      transitions += 1;
    } else if (baseline.body !== observed.body) {
      return false;
    }
  }
  return transitions > 0;
}

function entryChanges(before: StepPacketWorkspace, after: StepPacketWorkspace): string[] {
  const identities = (workspace: StepPacketWorkspace): Map<string, string> => {
    const grouped = new Map<string, string[]>();
    for (const entry of workspace.entries) {
      const values = grouped.get(entry.path) ?? [];
      values.push(canonicalJson(entry));
      grouped.set(entry.path, values);
    }
    return new Map([...grouped].map(([path, values]) => [path, canonicalJson(values.sort(lexicalCompare))]));
  };
  // One Git path can legitimately have more than one porcelain role (for
  // example, a staged rename source recreated as an untracked file). Compare
  // the complete canonical multiset so role or cardinality changes cannot be
  // hidden by a path-keyed last-write-wins map.
  const baseline = identities(before);
  const current = identities(after);
  return [...new Set([...baseline.keys(), ...current.keys()])].filter((path) => baseline.get(path) !== current.get(path));
}

function anyPathMatch(
  patterns: readonly string[],
  observed: string,
  budget: ReturnType<typeof createPlanPathMatchBudget>,
): boolean | null {
  let inconclusive = false;
  for (const pattern of patterns) {
    if (budget.remaining <= 0) return null;
    const matched = planPathMatch(pattern, observed, budget);
    if (matched === true) return true;
    if (matched === null) inconclusive = true;
  }
  return inconclusive ? null : false;
}

/** Pure comparison of a verified immutable packet with freshly collected facts. */
export function reconcileStepPacket(value: unknown, facts: StepReconciliationFacts): StepReconciliationResult {
  const verified = verifyStepPacket(value);
  if (!verified.ok) {
    return { status: "inconclusive", packetId: null, changedPaths: [], findings: [{ code: "STEP_PACKET_INVALID", message: verified.reason }] };
  }
  const packet = verified.packet;
  const factsBudget = checkStepPacketBudget(facts);
  if (!factsBudget.ok) {
    return { status: "inconclusive", packetId: packet.packetId, changedPaths: [], findings: [{ code: "STEP_FACTS_BUDGET_EXCEEDED", message: factsBudget.reason }] };
  }
  const failures: StepReconciliationFinding[] = [];
  const inconclusive: StepReconciliationFinding[] = [];
  if (canonicalJson(packet.project) !== canonicalJson(facts.project) || packet.ticket.id !== facts.ticket.id || packet.batch !== facts.batch) {
    failures.push({ code: "STEP_IDENTITY_MISMATCH", message: "The packet project, ticket or batch identity does not match the live request." });
  }
  if (!facts.plan) inconclusive.push({ code: "STEP_PLAN_UNAVAILABLE", message: "The current plan could not be read." });
  else if (facts.plan.path !== packet.plan.path || facts.plan.version !== packet.plan.version) {
    failures.push({ code: "STEP_PLAN_STALE", message: "The plan path or version changed after packet issuance." });
  }
  else if (facts.plan.authority === null || canonicalJson(facts.plan.authority) !== canonicalJson(authorityOf(packet))) {
    failures.push({ code: "STEP_PLAN_AUTHORITY_MISMATCH", message: "The packet's worker authority does not match the selected step in the current plan." });
  }
  if (!facts.evidence) inconclusive.push({ code: "STEP_EVIDENCE_UNAVAILABLE", message: "Current research/files/group evidence could not be read." });
  else {
    const live = new Map(facts.evidence.map((entry) => [`${entry.layer}:${entry.group ?? ""}:${entry.path}`, entry.version]));
    const expected = new Set([...packet.evidence.group, ...packet.evidence.ticket].map((entry) => `${entry.layer}:${entry.group ?? ""}:${entry.path}`));
    for (const entry of [...packet.evidence.group, ...packet.evidence.ticket]) {
      const version = live.get(`${entry.layer}:${entry.group ?? ""}:${entry.path}`);
      if (version === undefined) inconclusive.push({ code: "STEP_EVIDENCE_MISSING", message: `Evidence ${entry.path} is unavailable.` });
      else if (version !== entry.version) failures.push({ code: "STEP_EVIDENCE_STALE", message: `Evidence ${entry.path} changed after packet issuance.`, path: entry.path });
    }
    for (const key of live.keys()) if (!expected.has(key)) failures.push({ code: "STEP_EVIDENCE_SET_CHANGED", message: `Unexpected current evidence ${key} was not in the packet.` });
  }
  if (!facts.checklist) inconclusive.push({ code: "STEP_CHECKLIST_UNAVAILABLE", message: "The current checklist could not be read." });
  else if (facts.checklist.path !== packet.checklist.path || facts.checklist.steps.length !== packet.checklist.steps.length) {
    failures.push({ code: "STEP_CHECKLIST_STALE", message: "The checklist identity or step census changed after packet issuance." });
  } else {
    const selected = packet.step.index - 1;
    if (packet.checklist.steps[selected] || !facts.checklist.steps[selected]) {
      failures.push({ code: "STEP_NOT_COMPLETED", message: `Authorised step ${packet.step.index} was not an unticked-to-ticked completion.` });
    }
    for (let index = 0; index < facts.checklist.steps.length; index += 1) {
      if (index === selected) continue;
      if (facts.checklist.steps[index] !== packet.checklist.steps[index]) {
        failures.push({ code: index > selected ? "STEP_LATER_ADVANCED" : "STEP_EARLIER_CHANGED", message: `Checklist step ${index + 1} changed outside the authorised marker transition.` });
      }
    }
    if (!checklistOnlyTransition(packet, facts.checklist)) failures.push({ code: "STEP_CHECKLIST_CONTENT_CHANGED", message: "Checklist content changed beyond the selected unchecked-to-checked marker(s)." });
  }
  if (facts.ticket.itemAuthority !== packet.ticket.itemAuthority) {
    failures.push({ code: "STEP_TICKET_AUTHORITY_STALE", message: "Ticket authority changed outside the renewable lease-heartbeat projection." });
  }
  // The checklist is the one counted document allowed to move, and only by
  // the exact marker transition checked above. Every other counted document —
  // including open questions, proof and post-implementation report — remains
  // bound. A final-step report is therefore written after that step reconciles,
  // not smuggled into the step's authority window.
  const withoutChecklist = (documents: StepPacketTicket["documents"]) => documents.filter((document) => document.path !== packet.checklist.path);
  if (canonicalJson(withoutChecklist(facts.ticket.documents)) !== canonicalJson(withoutChecklist(packet.ticket.documents))) {
    failures.push({ code: "STEP_TICKET_DOCUMENTS_STALE", message: "A counted non-checklist ticket document changed after packet issuance." });
  }
  const permitsRevisionChange = facts.checklist !== null &&
    checklistOnlyTransition(packet, facts.checklist) &&
    facts.ticket.itemAuthority === packet.ticket.itemAuthority &&
    canonicalJson(withoutChecklist(facts.ticket.documents)) === canonicalJson(withoutChecklist(packet.ticket.documents));
  if (facts.ticket.revision !== packet.ticket.revision && !permitsRevisionChange) {
    failures.push({ code: "STEP_TICKET_REVISION_STALE", message: "The ticket revision changed without the exact authorised checklist transition." });
  }
  const changedPaths: StepReconciliationResult["changedPaths"] = [];
  let observedChangeCount = 0;
  if (!facts.workspace) inconclusive.push({ code: "STEP_WORKSPACE_UNAVAILABLE", message: "The recorded workspace could not be inspected." });
  else if (facts.workspace.snapshot.branch !== packet.workspace.branch || facts.workspace.snapshot.worktree !== packet.workspace.worktree) {
    failures.push({ code: "STEP_WORKSPACE_MISMATCH", message: "The live workspace branch or worktree does not match the packet." });
  } else {
    if (facts.workspace.snapshot.head !== packet.workspace.head && facts.workspace.headChanges === null) {
      inconclusive.push({ code: "STEP_HEAD_DIFF_UNAVAILABLE", message: "Workspace HEAD changed but the bounded Git diff could not be read." });
    }
    const observedChanges = [
      ...entryChanges(packet.workspace, facts.workspace.snapshot),
      ...(facts.workspace.headChanges ?? []),
    ];
    const matchBudget = createPlanPathMatchBudget();
    const distinctObservedChanges = [...new Set(observedChanges)];
    observedChangeCount = distinctObservedChanges.length;
    for (const rawPath of distinctObservedChanges) {
      const observed = parsePlanPath(rawPath, { observed: true });
      if (!observed.ok) {
        inconclusive.push({ code: "STEP_CHANGED_PATH_INVALID", message: observed.reason, path: rawPath });
        continue;
      }
      const path = observed.path;
      const forbidden = anyPathMatch(packet.forbiddenFiles, path, matchBudget);
      const allowed = forbidden === false ? anyPathMatch(packet.allowedFiles, path, matchBudget) : false;
      const classification: StepPathClassification = forbidden === true
        ? "forbidden"
        : forbidden === null
          ? "inconclusive"
          : allowed === true
            ? "allowed"
            : allowed === null
              ? "inconclusive"
              : "undeclared";
      changedPaths.push({ path, classification });
      if (classification === "forbidden") failures.push({ code: "STEP_PATH_FORBIDDEN", message: `${path} is forbidden.`, path });
      else if (classification === "undeclared") failures.push({ code: "STEP_PATH_UNDECLARED", message: `${path} is undeclared.`, path });
      else if (classification === "inconclusive") inconclusive.push({
        code: "STEP_PATH_MATCH_INCONCLUSIVE",
        message: `The bounded path matcher could not prove whether ${path} is allowed or forbidden.`,
        path,
      });
    }
  }
  if (observedChangeCount > 0 && packet.allowedSymbols.length > 0) {
    inconclusive.push({
      code: "STEP_SYMBOL_SCOPE_INCONCLUSIVE",
      message:
        "The packet declares free-form symbol authority, but the language-neutral collector cannot prove changed source ranges against those symbols.",
    });
  }
  const findings = [...failures, ...inconclusive];
  return {
    status: failures.length ? "fail" : inconclusive.length ? "inconclusive" : "pass",
    packetId: packet.packetId,
    changedPaths,
    findings,
  };
}

function refusalReason(validation: PlanValidation): string {
  const blockers = validation.findings.filter((finding) => finding.severity === "blocker");
  return `The plan cannot be compiled into a bounded step packet: ${blockers.map((finding) => finding.message).join(" ")}`;
}

function budgetRefusal(reason: string): StepPacketResult {
  return {
    ok: false,
    reason: `The plan cannot be compiled into a bounded step packet: ${reason}.`,
    validation: {
      ok: false,
      blockers: 1,
      advisories: 0,
      findings: [{
        code: "PLAN_PACKET_BUDGET_EXCEEDED",
        severity: "blocker",
        section: "Ordered steps",
        message: reason,
      }],
    },
  };
}

function canonicalEvidence(input: readonly StepPacketEvidence[]):
  | { ok: true; entries: StepPacketEvidence[] }
  | { ok: false; reason: string; entries: StepPacketEvidence[] } {
  const entries = new Map<string, StepPacketEvidence>();
  for (const entry of input) {
    const key = `${entry.layer}\0${entry.group ?? ""}\0${entry.path}`;
    const previous = entries.get(key);
    if (!previous) {
      entries.set(key, entry);
      continue;
    }
    if (canonicalJson(previous) !== canonicalJson(entry)) {
      return {
        ok: false,
        reason: `Conflicting duplicate evidence was supplied for ${entry.path}.`,
        entries: [...entries.values()],
      };
    }
  }
  return { ok: true, entries: [...entries.values()] };
}

/**
 * Compile one ordered step into a versioned, bounded packet.
 *
 * Refusal is a normal return value with the same validation report a ready
 * packet carries; nothing here mutates anything, so a refusal leaves board
 * stage, claim and workspace untouched by construction.
 */
export function compileStepPacket(input: StepPacketInput): StepPacketResult {
  const inputBudget = checkStepPacketBudget(input);
  if (!inputBudget.ok) return budgetRefusal(inputBudget.reason);
  if (input.ticket.documents.length > STEP_PACKET_LIMITS.maxDocuments) {
    return budgetRefusal(`ticket document census exceeds ${STEP_PACKET_LIMITS.maxDocuments} entries`);
  }
  const { plan, checklist, select } = input;
  const normalizedEvidence = canonicalEvidence(input.evidence);
  const liveEvidence = normalizedEvidence.entries.map((entry) => ({ path: entry.path, version: entry.version }));
  // A ticket that carries its own impact research is expected to pin it; a
  // trivial one carries none and must not accrue invented research debt.
  const requireEvidencePin = normalizedEvidence.entries.some(
    (entry) => entry.layer === "ticket" && /^(?:research|files)\//.test(entry.path),
  );
  if (!normalizedEvidence.ok) {
    const validation = validatePlan(plan, { liveEvidence, requireEvidencePin });
    return { ok: false, reason: normalizedEvidence.reason, validation };
  }
  if (typeof select === "number" && (!Number.isFinite(select) || !Number.isInteger(select) || select <= 0)) {
    const validation = validatePlan(plan, { liveEvidence, requireEvidencePin });
    return { ok: false, reason: "A numeric step selection must be a finite positive integer.", validation };
  }

  if (!input.workspace?.branch || !input.workspace.worktree || !input.workspace.head || !/^[0-9a-f]{40}$/i.test(input.workspace.head)) {
    const validation = validatePlan(plan, { liveEvidence, requireEvidencePin });
    return {
      ok: false,
      reason: "A constrained step packet requires a proven recorded branch, worktree and exact 40-character HEAD.",
      validation,
    };
  }
  const workspace = input.workspace;

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

  const checklistSnapshot = stepChecklistSnapshot(plan, checklist, input.checklistPath, input.checklistVersion);
  const states = checklistSnapshot.steps;
  if (states[resolved - 1] === true) {
    return { ok: false, reason: `Ordered step ${resolved} is already complete in the checklist and cannot be re-issued.`, validation };
  }
  if ((checklistSnapshot.stepLines[resolved - 1] ?? []).length === 0) {
    return {
      ok: false,
      reason: `Ordered step ${resolved} requires at least one mapped unchecked checklist marker before a constrained packet can be issued.`,
      validation,
    };
  }
  const markerStates = checklistStatesFromLineMap(checklistSnapshot.content, checklistSnapshot.stepLines);
  const checkedSuccessor = markerStates?.markers.slice(resolved).findIndex((states) => states.some(Boolean)) ?? -1;
  if (checkedSuccessor >= 0) {
    return {
      ok: false,
      reason: `Ordered successor step ${resolved + checkedSuccessor + 1} already has a checked checklist marker and cannot bypass its own packet.`,
      validation,
    };
  }
  const currentNext = nextStepIndex(plan, checklist);
  if (typeof select === "number" && currentNext !== null && select !== currentNext) {
    return { ok: false, reason: `Ordered step ${select} cannot be issued while step ${currentNext} is the current unfinished step.`, validation };
  }

  const evidence = {
    group: normalizedEvidence.entries.filter((entry) => entry.layer === "group").sort((left, right) => lexicalCompare(`${left.group ?? ""}\0${left.path}`, `${right.group ?? ""}\0${right.path}`)),
    ticket: normalizedEvidence.entries.filter((entry) => entry.layer === "ticket").sort((left, right) => lexicalCompare(left.path, right.path)),
  };
  const authority = stepPacketAuthority(plan, resolved, input.stopCondition)!;
  const body = {
    packetVersion: STEP_PACKET_VERSION,
    project: input.project,
    ticket: input.ticket,
    batch: input.batch,
    workspace,
    plan: { path: input.planPath, version: input.planVersion },
    checklist: checklistSnapshot,
    ...authority,
    evidence,
  };
  const bodyBudget = checkStepPacketBudget(body);
  if (!bodyBudget.ok) return budgetRefusal(bodyBudget.reason);

  const packet = { ...body, packetId: stepPacketDigest(body) };
  const verified = verifyStepPacket(packet);
  if (!verified.ok) {
    return {
      ok: false,
      reason: `The compiled step packet failed its own strict verification: ${verified.reason}`,
      validation,
    };
  }
  return { ok: true, packet: verified.packet, validation };
}
