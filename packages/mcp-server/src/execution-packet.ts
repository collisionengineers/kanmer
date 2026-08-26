import type { GateReport, Item, KanmerStore, TicketDocumentWithVersion } from "@kanmer/core";
import { execFile } from "node:child_process";
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

export interface ExecutionPacketReady {
  ready: true;
  project: ProjectIdentity;
  ticket: ExecutionPacketTicket;
  groupContexts: ExecutionPacketGroupContext[];
  documents: {
    plan: ExecutionPacketDocument;
    checklist: ExecutionPacketDocument;
    files: ExecutionPacketDocument;
  };
  extraDocs: ExecutionPacketExtraDoc[];
  gates: GateReport;
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

type GitCommonDirectory = { ok: true; path: string } | { ok: false; detail: string };

async function gitCommonDirectory(directory: string): Promise<GitCommonDirectory> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", directory, "rev-parse", "--git-common-dir"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const output = stdout.trim();
    if (!output) return { ok: false, detail: "Git returned an empty common-directory path." };
    return { ok: true, path: canonicalPathFrom(directory, output) };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function unsafeTakenWorktree(
  store: KanmerStore,
  project: ProjectIdentity,
  item: Item,
): Promise<string | null> {
  if (!item.taken_at || !item.worktree) return null;
  const candidate = canonicalWorktreePath(project, item.worktree);
  if (sameWorktreePath(candidate, project.boardRoot)) {
    return `Ticket "${item.id}" records the board worktree as its execution worktree; this is not a resumable ticket worktree.`;
  }
  const conflict = (await store.listItems()).find((other) =>
    other.id !== item.id && other.worktree !== undefined &&
    sameWorktreePath(candidate, canonicalWorktreePath(project, other.worktree)),
  );
  if (conflict) {
    return `Ticket "${item.id}" records the same worktree as active ticket "${conflict.id}"; this is not a resumable ticket worktree.`;
  }
  const [candidateGit, sourceGit] = await Promise.all([
    gitCommonDirectory(candidate),
    gitCommonDirectory(project.repoRoot),
  ]);
  if (!candidateGit.ok) {
    return `Ticket "${item.id}" records a worktree that cannot be verified as a Git checkout: ${candidateGit.detail}`;
  }
  if (!sourceGit.ok) {
    return `The source repository cannot be verified before resuming "${item.id}": ${sourceGit.detail}`;
  }
  return sameWorktreePath(candidateGit.path, sourceGit.path)
    ? null
    : `Ticket "${item.id}" records a worktree from a different Git repository; this is not a resumable ticket worktree.`;
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
  const unsafeWorktree = await unsafeTakenWorktree(store, project, item);
  if (unsafeWorktree) return refuse(project, unsafeWorktree, [], item, gates);

  // MCP client names are not durable agent identities. A later session must
  // deliberately name the exact branch and worktree already recorded before
  // it may resume; every other occupied-ticket request remains refused.
  const exactRecordedResume = resume !== undefined &&
    item.branch !== undefined && resume.branch === item.branch &&
    item.worktree !== undefined && resume.worktree === item.worktree;
  if (item.taken_at && item.assignee !== actor && !exactRecordedResume) {
    const owner = item.assignee || "an unknown actor";
    const location = [item.branch && `branch ${item.branch}`, item.worktree && `worktree ${item.worktree}`]
      .filter(Boolean)
      .join(", ");
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
    groupContexts: await groupContexts(store, item),
    documents: indexDocuments(fixed),
    extraDocs,
    gates,
    stopCondition: sectionFromPlan(plan, ["Stop condition"], EXECUTION_STOP_FALLBACK),
    commandsHint: sectionFromPlan(plan, ["Commands", "Verification commands", "Verification"], EXECUTION_COMMANDS_FALLBACK),
  };
}
