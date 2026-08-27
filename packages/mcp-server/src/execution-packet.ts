import type { ClaimState, GateReport, Item, KanmerStore, TicketDocumentWithVersion } from "@kanmer/core";
import { DEFAULT_CLAIM_EXPIRY_MINUTES, claimState } from "@kanmer/core";
import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { ProjectIdentity } from "./project-identity.js";
import { canonicalProjectPath } from "./project-identity.js";
import { readTicketDocuments } from "./ticket-docs.js";

const execFileAsync = promisify(execFile);

export const EXECUTION_STOP_FALLBACK = "Stop at the checklist; do not merge; do not start another ticket.";
export const EXECUTION_COMMANDS_FALLBACK =
  "Use only the commands named in the plan/checklist, record exact exit codes, and stop on a failure.";

export interface ExecutionPacketDocument {
  exists: boolean;
  content: string | null;
  version: string | null;
}

export interface ExecutionPacketExtraDoc {
  path: string;
  version: string;
}

export interface ExecutionPacketGroupContext {
  id: string;
  kind: string | null;
  title: string | null;
  body: string | null;
  context: string | null;
  warning?: string;
}

export interface ExecutionPacketTicket {
  id: string;
  title: string;
  status: string;
  profile: string;
  area: string | null;
  groups: string[] | null;
  refs: string[] | null;
  body: string;
  taken: {
    taken_at: string;
    assignee: string | null;
    branch: string | null;
    worktree: string | null;
  } | null;
}

export interface ExecutionPacketCompactTicket {
  id: string;
  title: string;
  status: string;
  profile: string;
  area: string | null;
  groups: string[] | null;
  refs: string[] | null;
  taken: ExecutionPacketTicket["taken"];
}

/** Bootstrap claim facts (CORE-121) so a resumed remediation knows its owner and budget. */
export interface ExecutionPacketClaim {
  state: ClaimState;
  expiresAt: string | null;
  controller: string | null;
  reviewRound: number;
  remediationBudget: number;
}

export interface ExecutionPacketReady {
  ready: true;
  project: ProjectIdentity;
  ticket: ExecutionPacketTicket;
  claim: ExecutionPacketClaim;
  groupContexts: ExecutionPacketGroupContext[];
  documents: {
    plan: ExecutionPacketDocument;
    checklist: ExecutionPacketDocument;
    files: ExecutionPacketDocument;
  };
  extraDocs: ExecutionPacketExtraDoc[];
  gates: GateReport;
  /** Non-blocking board hygiene issues outside this ticket's execution location. */
  warnings: string[];
  stopCondition: string;
  commandsHint: string;
}

export interface ExecutionPacketRefusal {
  ready: false;
  code: "GATE_BLOCKED";
  reason: string;
  missing: string[];
  project: ProjectIdentity;
  ticket?: ExecutionPacketCompactTicket;
  gates?: GateReport;
}

export type ExecutionPacket = ExecutionPacketReady | ExecutionPacketRefusal;

interface AtxSection {
  level: number;
  title: string;
  content: string;
}

/**
 * Read one ATX heading section, retaining nested lower-level headings and
 * stopping at the next heading at the same or a higher level.
 */
export function extractAtxSection(markdown: string, requestedTitle: string): string | null {
  const sections = parseAtxSections(markdown);
  const wanted = requestedTitle.trim().toLocaleLowerCase();
  const section = sections.find((candidate) => candidate.title.toLocaleLowerCase() === wanted);
  if (!section) return null;
  const content = section.content.trim();
  return content || null;
}

function parseAtxSections(markdown: string): AtxSection[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const headings: Array<{ index: number; level: number; title: string }> = [];
  for (const [index, line] of lines.entries()) {
    const match = /^(?: {0,3})(#{1,6})(?:[ \t]+|$)(.*)$/.exec(line);
    if (!match) continue;
    const title = match[2].trim().replace(/[ \t]+#+[ \t]*$/, "").trim();
    headings.push({ index, level: match[1].length, title });
  }

  return headings.map((heading, position) => {
    const end = headings.slice(position + 1).find((candidate) => candidate.level <= heading.level)?.index ?? lines.length;
    return {
      level: heading.level,
      title: heading.title,
      content: lines.slice(heading.index + 1, end).join("\n"),
    };
  });
}

function compactTicket(item: Item, profile: string): ExecutionPacketCompactTicket {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    profile,
    area: item.area ?? null,
    groups: item.groups ?? null,
    refs: item.refs ?? null,
    taken: takenDetails(item),
  };
}

function fullTicket(item: Item, profile: string): ExecutionPacketTicket {
  return { ...compactTicket(item, profile), body: item.body };
}

function takenDetails(item: Item): ExecutionPacketTicket["taken"] {
  return item.taken_at
    ? {
        taken_at: item.taken_at,
        assignee: item.assignee ?? null,
        branch: item.branch ?? null,
        worktree: item.worktree ?? null,
      }
    : null;
}

function isWindowsAbsolute(input: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(input) || /^\\\\/.test(input);
}

function canonicalPathFrom(base: string, input: string): string {
  const absolute = path.isAbsolute(input) || isWindowsAbsolute(input) ? input : path.join(base, input);
  return canonicalProjectPath(absolute);
}

function canonicalWorktreePath(project: ProjectIdentity, worktree: string): string {
  return canonicalPathFrom(project.repoRoot, worktree);
}

function sameWorktreePath(left: string, right: string): boolean {
  return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}

type ResolvedPath = { ok: true; path: string } | { ok: false; detail: string };

interface ResumeWorktreeSafety {
  refusal: string | null;
  warnings: string[];
}

async function physicalExistingPath(input: string): Promise<ResolvedPath> {
  try {
    return { ok: true, path: canonicalProjectPath(await realpath(input)) };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function gitWorktreeRoot(directory: string): Promise<ResolvedPath> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", directory, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const output = stdout.trim();
    if (!output) return { ok: false, detail: "Git returned an empty worktree-root path." };
    return physicalExistingPath(canonicalPathFrom(directory, output));
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function gitCommonDirectory(directory: string): Promise<ResolvedPath> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", directory, "rev-parse", "--git-common-dir"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const output = stdout.trim();
    if (!output) return { ok: false, detail: "Git returned an empty common-directory path." };
    // Git can spell the same Windows directory through an 8.3 alias in one
    // worktree and its long name in another (for example RUNNER~1 versus
    // runneradmin). Comparing those strings would reject a real worktree
    // before its resume metadata is even considered. Resolve the existing
    // common directory through the filesystem, then compare that physical
    // identity instead. A failed resolution is a refusal: resume must never
    // fall back to an unverified lexical path.
    return physicalExistingPath(canonicalPathFrom(directory, output));
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function checkedOutBranch(directory: string): Promise<{ ok: true; branch: string } | { ok: false; detail: string }> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", directory, "branch", "--show-current"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const branch = stdout.trim();
    return branch
      ? { ok: true, branch }
      : { ok: false, detail: "HEAD is detached." };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function unsafeTakenWorktree(
  store: KanmerStore,
  project: ProjectIdentity,
  item: Item,
): Promise<ResumeWorktreeSafety> {
  if (!item.taken_at || !item.worktree) return { refusal: null, warnings: [] };
  const candidateLocation = await physicalExistingPath(canonicalWorktreePath(project, item.worktree));
  if (!candidateLocation.ok) {
    return {
      refusal: `Ticket "${item.id}" records a worktree that cannot be resolved on disk: ${candidateLocation.detail}`,
      warnings: [],
    };
  }
  const candidate = await gitWorktreeRoot(candidateLocation.path);
  if (!candidate.ok) {
    return {
      refusal: `Ticket "${item.id}" records a worktree that cannot be verified as a Git checkout: ${candidate.detail}`,
      warnings: [],
    };
  }
  if (!sameWorktreePath(candidateLocation.path, candidate.path)) {
    return {
      refusal: `Ticket "${item.id}" records a path inside a Git worktree instead of that worktree's root; this is not a resumable ticket worktree.`,
      warnings: [],
    };
  }
  const boardWorktree = await gitWorktreeRoot(project.boardRoot);
  if (!boardWorktree.ok) {
    return {
      refusal: `The Kanmer board worktree cannot be resolved before resuming "${item.id}": ${boardWorktree.detail}`,
      warnings: [],
    };
  }
  if (sameWorktreePath(candidate.path, boardWorktree.path)) {
    return {
      refusal: `Ticket "${item.id}" records the board worktree as its execution worktree; this is not a resumable ticket worktree.`,
      warnings: [],
    };
  }
  const sourceCheckout = await gitWorktreeRoot(project.repoRoot);
  if (!sourceCheckout.ok) {
    return {
      refusal: `The source repository checkout cannot be resolved before resuming "${item.id}": ${sourceCheckout.detail}`,
      warnings: [],
    };
  }
  if (sameWorktreePath(candidate.path, sourceCheckout.path)) {
    return {
      refusal: `Ticket "${item.id}" records the shared source checkout as its execution worktree; this is not a resumable ticket worktree.`,
      warnings: [],
    };
  }
  const warnings: string[] = [];
  for (const other of await store.listItems()) {
    if (other.id === item.id || !other.taken_at || !other.worktree) continue;
    const otherLocation = await physicalExistingPath(canonicalWorktreePath(project, other.worktree));
    if (!otherLocation.ok) {
      warnings.push(`Active ticket "${other.id}" has an unresolved recorded worktree: ${otherLocation.detail}`);
      continue;
    }
    const otherWorktree = await gitWorktreeRoot(otherLocation.path);
    if (!otherWorktree.ok) {
      warnings.push(`Active ticket "${other.id}" has a recorded worktree that is not a resolvable Git checkout: ${otherWorktree.detail}`);
      continue;
    }
    if (sameWorktreePath(candidate.path, otherWorktree.path)) {
      return {
        refusal: `Ticket "${item.id}" records the same worktree as active ticket "${other.id}"; this is not a resumable ticket worktree.`,
        warnings,
      };
    }
  }
  const [candidateGit, sourceGit] = await Promise.all([
    gitCommonDirectory(candidate.path),
    gitCommonDirectory(project.repoRoot),
  ]);
  if (!candidateGit.ok) {
    return {
      refusal: `Ticket "${item.id}" records a worktree that cannot be verified as a Git checkout: ${candidateGit.detail}`,
      warnings,
    };
  }
  if (!sourceGit.ok) {
    return {
      refusal: `The source repository cannot be verified before resuming "${item.id}": ${sourceGit.detail}`,
      warnings,
    };
  }
  if (!sameWorktreePath(candidateGit.path, sourceGit.path)) {
    return {
      refusal: `Ticket "${item.id}" records a worktree from a different Git repository; this is not a resumable ticket worktree.`,
      warnings,
    };
  }
  const branch = await checkedOutBranch(candidate.path);
  if (!branch.ok) {
    return {
      refusal: `Ticket "${item.id}" records a worktree without a checked-out branch: ${branch.detail}`,
      warnings,
    };
  }
  if (branch.branch !== item.branch) {
    return {
      refusal: `Ticket "${item.id}" records branch "${item.branch}", but its worktree currently has "${branch.branch}" checked out; this is not a resumable ticket worktree.`,
      warnings,
    };
  }
  return { refusal: null, warnings };
}

function refuse(
  project: ProjectIdentity,
  reason: string,
  missing: string[],
  item?: Item,
  gates?: GateReport,
): ExecutionPacketRefusal {
  return {
    ready: false,
    code: "GATE_BLOCKED",
    reason,
    missing,
    project,
    ...(item && gates ? { ticket: compactTicket(item, gates.profile), gates } : {}),
  };
}

function leavePreparing(gates: GateReport) {
  return gates.boundaries.find((boundary) => boundary.boundary === "leave-preparing");
}

function missingRequirements(gates: GateReport): string[] {
  return (leavePreparing(gates)?.requirements ?? [])
    .filter((requirement) => !requirement.satisfied && requirement.type !== "questions-resolved")
    .map((requirement) => requirement.requirement);
}

function unresolvedQuestion(gates: GateReport): boolean {
  const requirements = gates.boundaries.flatMap((boundary) => boundary.requirements);
  return requirements.some((requirement) => requirement.type === "questions-resolved" && !requirement.satisfied);
}

async function groupContexts(store: KanmerStore, item: Item): Promise<ExecutionPacketGroupContext[]> {
  const groups = item.groups ?? [];
  return Promise.all(
    groups.map(async (id) => {
      const group = await store.getGroup(id);
      if (!group) {
        return {
          id,
          kind: null,
          title: null,
          body: null,
          context: null,
          warning: `Group "${id}" is missing from the board.`,
        };
      }
      const context = await store.getGroupDoc(id, "context.md");
      return {
        id,
        kind: group.kind,
        title: group.title,
        body: group.body,
        context,
        ...(context === null ? { warning: `Group "${id}" has no context.md.` } : {}),
      };
    }),
  );
}

function indexDocuments(results: TicketDocumentWithVersion[]): Record<"plan" | "checklist" | "files", ExecutionPacketDocument> {
  const byDoc = new Map(results.map((result) => [result.doc, result]));
  const entry = (doc: "plan" | "checklist" | "files"): ExecutionPacketDocument => {
    const result = byDoc.get(doc)!;
    return { exists: result.exists, content: result.content, version: result.version };
  };
  return { plan: entry("plan"), checklist: entry("checklist"), files: entry("files") };
}

function sectionFromPlan(plan: string | null, titles: string[], fallback: string): string {
  if (plan) {
    for (const title of titles) {
      const content = extractAtxSection(plan, title);
      if (content) return content;
    }
  }
  return fallback;
}

export async function getExecutionPacket(input: {
  store: KanmerStore;
  id: string;
  actor: string;
  project: ProjectIdentity;
  resume?: { branch: string; worktree: string };
}): Promise<ExecutionPacket> {
  const { store, id, actor, project, resume } = input;
  const item = await store.getItem(id);
  if (!item) return refuse(project, `No ticket with id "${id}" exists.`, []);
  if (item.type !== "ticket") {
    return refuse(project, `"${id}" is a ${item.type}, not a ticket; execution packets are ticket-only.`, []);
  }

  const gates = await store.getDocGates(id);
  if (!gates) {
    return refuse(project, `"${id}" uses a legacy layout without a format-3 ticket folder.`, [], item);
  }
  if (gates.profile === "spike") {
    return refuse(project, `Profile "spike" is research-first; execution packets are not available for spikes.`, [], item, gates);
  }

  const missing = missingRequirements(gates);
  if (missing.length) {
    return refuse(project, `Execution is blocked by unmet leave-preparing requirements: ${missing.join(", ")}.`, missing, item, gates);
  }
  if (unresolvedQuestion(gates)) {
    return refuse(project, "Execution is blocked by unresolved questions.", ["questions-resolved"], item, gates);
  }

  if (item.taken_at && (!item.branch || !item.worktree)) {
    return refuse(
      project,
      `Ticket "${id}" has incomplete taken-ticket metadata; a resumable ticket requires both branch and worktree. Restore the recorded execution location before retrying.`,
      [],
      item,
      gates,
    );
  }
  if (item.taken_at && item.status !== "implementing") {
    return refuse(
      project,
      `Ticket "${id}" is in ${item.status}, not implementing; execution resumption is available only while a ticket is implementing.`,
      [],
      item,
      gates,
    );
  }
  const worktreeSafety = await unsafeTakenWorktree(store, project, item);
  if (worktreeSafety.refusal) return refuse(project, worktreeSafety.refusal, [], item, gates);

  // MCP client names are not durable agent identities. A later session must
  // deliberately name the exact branch and worktree already recorded before
  // it may resume; every other occupied-ticket request remains refused.
  const exactRecordedResume = resume !== undefined &&
    item.branch !== undefined && resume.branch === item.branch &&
    item.worktree !== undefined && resume.worktree === item.worktree;
  const board = await store.getBoard();
  const claimMinutes = board.claimExpiryMinutes ?? DEFAULT_CLAIM_EXPIRY_MINUTES;
  const claim: ExecutionPacketClaim = {
    state: claimState(item, new Date(), claimMinutes),
    expiresAt: item.claim_expires_at
      ?? (item.taken_at ? new Date(Date.parse(item.taken_at) + claimMinutes * 60_000).toISOString() : null),
    controller: item.claim_controller ?? (item.assignee || null),
    reviewRound: item.review_round ?? 0,
    remediationBudget: item.remediation_budget ?? 1,
  };
  if (item.taken_at && item.assignee !== actor && item.claim_controller !== actor && !exactRecordedResume) {
    const owner = item.assignee || "an unknown actor";
    const location = [item.branch && `branch ${item.branch}`, item.worktree && `worktree ${item.worktree}`]
      .filter(Boolean)
      .join(", ");
    // A dead controller's claim is refused differently from a live one: the
    // remedy is a transfer, never a force retake (CORE-121, FRD-030).
    if (claim.state === "expired") {
      return refuse(
        project,
        `Ticket "${id}" is taken by ${owner}${location ? ` (${location})` : ""} but its claim expired at ${claim.expiresAt}; ` +
          `transfer it with take_ticket action "transfer", or resume with the exact recorded branch and worktree.`,
        [],
        item,
        gates,
      );
    }
    return refuse(
      project,
      `Ticket "${id}" is already taken by ${owner}${location ? ` (${location})` : ""}.`,
      [],
      item,
      gates,
    );
  }

  const [fixed, inventory] = await Promise.all([
    readTicketDocuments(store, id, ["plan", "checklist", "files"]),
    store.listTicketDocsWithVersions(id),
  ]);
  const plan = fixed.find((doc) => doc.doc === "plan")?.content ?? null;
  const extraDocs = (inventory ?? [])
    .filter((doc) => !["plan/plan.md", "checklist/checklist.md", "files/files.md"].includes(doc.doc))
    .map((doc) => ({ path: doc.doc, version: doc.version! }));

  return {
    ready: true,
    project,
    ticket: fullTicket(item, gates.profile),
    claim,
    groupContexts: await groupContexts(store, item),
    documents: indexDocuments(fixed),
    extraDocs,
    gates,
    warnings: worktreeSafety.warnings,
    stopCondition: sectionFromPlan(plan, ["Stop condition"], EXECUTION_STOP_FALLBACK),
    commandsHint: sectionFromPlan(plan, ["Commands", "Verification commands", "Verification"], EXECUTION_COMMANDS_FALLBACK),
  };
}
