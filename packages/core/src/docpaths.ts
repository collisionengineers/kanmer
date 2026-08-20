/**
 * Format-3 document storage: containment defines type (ADR-0004, FRD-003).
 *
 * Every document type is a *folder* inside the ticket folder, and anything
 * beneath it is that type — recursively, so `research/azure/tokens.md` is
 * research. v2 checked fixed filenames, which capped each type at one document
 * and made typing a naming convention agents could drift on. A folder cannot be
 * drifted on: the path either is under `research/` or it is not.
 *
 * Folders are created on first write, never at ticket creation — a chore is
 * not born with nine empty directories.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { GATE_EXEMPT_DIRS, TICKET_DIRS, isTicketDir } from "./profiles.js";

/** A path segment safe inside a ticket folder: no separators, no traversal. */
const SAFE_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Split and validate a type-relative document path (`research/azure/x.md`).
 *
 * Returns the top-level type folder and the remaining segments. Rejects an
 * unknown top-level folder — the type vocabulary is fixed, and silently
 * accepting `reserch/` would produce a document that satisfies no gate and
 * that nobody would find.
 */
export function parseDocPath(rel: string): { type: string; segments: string[] } {
  const norm = rel.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!norm) throw new Error("Document path is empty");

  const segments = norm.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === "." || seg === ".." || !SAFE_SEGMENT_RE.test(seg)) {
      throw new Error(`Invalid segment "${seg}" in document path "${rel}"`);
    }
  }

  const [type, ...rest] = segments;
  if (!isTicketDir(type)) {
    throw new Error(
      `Unknown document folder "${type}" — valid: ${TICKET_DIRS.join(", ")}`,
    );
  }
  return { type, segments: rest };
}

/**
 * Absolute path for a type-relative document path inside a ticket folder.
 *
 * A bare type (`research`) resolves to `research/research.md`, the folder's
 * index — so `set_ticket_doc(id, "research", …)` keeps working the way the v2
 * call did, which is what makes the migration a move rather than a rewrite.
 */
export function docPathIn(ticketDir: string, rel: string): string {
  const { type, segments } = parseDocPath(rel);
  const parts = segments.length ? segments : [`${type}.md`];
  const last = parts[parts.length - 1];
  if (!last.includes(".")) parts[parts.length - 1] = `${last}.md`;
  return path.join(ticketDir, type, ...parts);
}

/** The folder holding one document type. */
export function docDirIn(ticketDir: string, type: string): string {
  if (!isTicketDir(type)) throw new Error(`Unknown document folder "${type}"`);
  return path.join(ticketDir, type);
}

/** Whether this type folder can ever satisfy a gate (FRD-003 T5). */
export function isGateExempt(type: string): boolean {
  return (GATE_EXEMPT_DIRS as readonly string[]).includes(type);
}

/**
 * Every file beneath `dir`, as paths relative to it, POSIX-separated.
 * Missing directory reads as empty — folders are lazily created, so absence is
 * the normal state, not an error.
 */
export async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(cur: string, prefix: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(cur, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) await walk(path.join(cur, e.name), rel);
      else out.push(rel);
    }
  }
  await walk(dir, "");
  return out.sort();
}

/** Markdown documents beneath a type folder — what a gate counts. */
export async function listDocs(ticketDir: string, type: string): Promise<string[]> {
  const files = await listFilesRecursive(docDirIn(ticketDir, type));
  return files.filter((f) => f.toLowerCase().endsWith(".md"));
}

/**
 * Every readable Markdown document in a ticket, as a type-relative path.
 *
 * These are the exact paths callers pass to `get_ticket_doc`: for example,
 * `research/azure/tokens.md`. A bare type still means that folder's index
 * document, so callers need this inventory to discover named documents.
 */
export async function listDocumentPaths(ticketDir: string): Promise<string[]> {
  const byType = await Promise.all(
    TICKET_DIRS.map(async (type) => (await listDocs(ticketDir, type)).map((rel) => `${type}/${rel}`)),
  );
  return byType.flat().sort();
}

/**
 * Whether a type's requirement is satisfied: at least one markdown document
 * anywhere beneath its folder, and the folder is not gate-exempt.
 */
export async function typeSatisfied(ticketDir: string, type: string): Promise<boolean> {
  if (isGateExempt(type)) return false;
  return (await listDocs(ticketDir, type)).length > 0;
}

/** Whether a specific named document exists (`research/auth` → any match). */
export async function namedSatisfied(
  ticketDir: string,
  type: string,
  named: string,
): Promise<boolean> {
  if (isGateExempt(type)) return false;
  const want = named.toLowerCase().replace(/\.md$/, "");
  const docs = await listDocs(ticketDir, type);
  return docs.some((d) => d.toLowerCase().replace(/\.md$/, "") === want);
}

/**
 * A `- [ ]` / `- [x]` line. One regex, used by both callers below, because two
 * copies of it would drift and the checklist and open-questions conventions are
 * meant to be the same convention.
 */
const CHECKBOX_RE = /^\s*[-*]\s+\[( |x|X)\]/;

/**
 * The heading below which questions are **parked**, not open (ADR-0011).
 *
 * Load-bearing: the `questions-resolved` requirement stops counting here, which
 * is what makes kanmer-research's "answered or explicitly parked" mechanical
 * rather than aspirational. Renaming this in the template silently changes what
 * the gate counts, so a test asserts the exact string.
 */
export const PARKED_HEADING_RE = /^\s{0,3}#{1,6}\s+parked\b/i;

export interface CheckboxCount {
  checked: number;
  total: number;
}

/**
 * Count checkbox lines across every markdown document of a type.
 *
 * `stopAtParked` halts counting at the parked heading *within each file*, so a
 * question moved below it stops being open without being falsely marked
 * answered. Absent folder → zeroes; "no questions" is not a failure state.
 */
export async function countCheckboxes(
  ticketDir: string,
  type: string,
  opts: { stopAtParked?: boolean } = {},
): Promise<CheckboxCount> {
  let checked = 0;
  let total = 0;
  for (const rel of await listDocs(ticketDir, type)) {
    let text: string;
    try {
      text = await fs.readFile(docPathIn(ticketDir, `${type}/${rel}`), "utf8");
    } catch {
      continue; // vanished between listing and reading — not this function's problem
    }
    for (const line of text.split("\n")) {
      if (opts.stopAtParked && PARKED_HEADING_RE.test(line)) break;
      const m = CHECKBOX_RE.exec(line);
      if (!m) continue;
      total++;
      if (m[1] !== " ") checked++;
    }
  }
  return { checked, total };
}

/** Per-type document counts for an item summary (FRD-003 T7). */
export async function docCounts(ticketDir: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const type of TICKET_DIRS) {
    const files = await listFilesRecursive(docDirIn(ticketDir, type));
    // reference/ and assets/ hold arbitrary files; the doc types hold markdown.
    const n = isGateExempt(type) && type !== "scratch"
      ? files.length
      : files.filter((f) => f.toLowerCase().endsWith(".md")).length;
    if (n) counts[type] = n;
  }
  return counts;
}

/**
 * Human-provided inputs (FRD-004 R3): names plus absolute paths, so an agent
 * whose host can read files directly can open a binary the tools cannot return.
 */
export async function listReferences(
  ticketDir: string,
): Promise<{ name: string; path: string }[]> {
  const dir = docDirIn(ticketDir, "reference");
  const files = await listFilesRecursive(dir);
  return files.map((f) => ({ name: f, path: path.join(dir, ...f.split("/")) }));
}
