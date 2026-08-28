/**
 * Groups: cross-cutting, kind-typed collections of tickets (FRD-001, ADR-0001).
 *
 * Real boards were faking this with labels doing triple duty — epic membership,
 * horizon, and state, all in one flat string list, with nothing validating any
 * of it. A group is the thing those labels were pretending to be: it has an id,
 * a kind, a folder, and shared context that every member's agent can read.
 *
 * **Membership lives on the ticket** (`groups: []`), never on the group. Member
 * lists and progress are derived on read. Storing them would create a second
 * place for the truth to live, and the two would disagree the first time a
 * ticket moved — which is exactly the failure `blocks:`/blocked-by already
 * avoids by deriving one direction from the other.
 */

import path from "node:path";
import fs from "node:fs/promises";
import matter from "gray-matter";
import { z } from "zod";
import { pathExists, readText, writeFileAtomic } from "./io.js";
import type { KanmerPaths } from "./paths.js";
import { assertSafeId } from "./paths.js";
export { deriveMembers } from "./group-members.js";

/** Folder holding every group, one directory each. */
export const GROUPS_DIR = "groups";

export const GroupFrontmatterSchema = z
  .object({
    id: z.string().min(1),
    kind: z.string().min(1),
    title: z.string().default(""),
    /** Archived groups drop out of chips and filters but stay readable. */
    archived: z.boolean().default(false),
    created: z.string().default(""),
    updated: z.string().default(""),
  })
  .passthrough();

export type GroupFrontmatter = z.infer<typeof GroupFrontmatterSchema>;

/** A group as stored: frontmatter plus the body, which is the goal. */
export interface Group extends GroupFrontmatter {
  body: string;
}

/** A group with everything derived from its members (never stored). */
export interface GroupWithMembers extends Group {
  /** Every member, captures included — membership is visibility, not workload. */
  members: { id: string; title: string; status: string; archived: boolean; profile?: string }[];
  /** Non-archived, non-capture members per stage — the progress bar's input. */
  progress: Record<string, number>;
  /** Non-archived, non-capture member count (FRD-032). */
  total: number;
  /** Non-archived, non-capture members in the final stage. */
  complete: number;
}

/** The groups root for a project. */
export function groupsRoot(paths: KanmerPaths): string {
  return path.join(paths.kanmer, GROUPS_DIR);
}

/** One group's folder. */
export function groupDir(paths: KanmerPaths, id: string): string {
  assertSafeId(id);
  return path.join(groupsRoot(paths), id);
}

/** The group's own markdown file, `groups/<ID>/<ID>.md`. */
export function groupFile(paths: KanmerPaths, id: string): string {
  return path.join(groupDir(paths, id), `${id}.md`);
}

export function parseGroup(raw: string): Group {
  const parsed = matter(raw);
  const fm = GroupFrontmatterSchema.parse(parsed.data);
  return { ...fm, body: parsed.content.replace(/^\s+/, "") };
}

const KEY_ORDER = ["id", "kind", "title", "archived", "created", "updated"];

export function serialiseGroup(group: Group): string {
  const { body, ...fm } = group;
  const data: Record<string, unknown> = {};
  for (const key of KEY_ORDER) {
    if (fm[key as keyof typeof fm] !== undefined) data[key] = fm[key as keyof typeof fm];
  }
  // Hand-added keys survive a round-trip, same contract as items.
  for (const [k, v] of Object.entries(fm)) if (!(k in data)) data[k] = v;
  return matter.stringify(`${body.trim()}\n`, data);
}

/** Read one group, or null. */
export async function readGroup(paths: KanmerPaths, id: string): Promise<Group | null> {
  const file = groupFile(paths, id);
  if (!(await pathExists(file))) return null;
  return parseGroup(await readText(file));
}

/** Every group on the board, sorted by id. */
export async function listGroups(
  paths: KanmerPaths,
  opts: { kind?: string; includeArchived?: boolean } = {},
): Promise<Group[]> {
  let names: string[];
  try {
    names = await fs.readdir(groupsRoot(paths));
  } catch {
    return [];
  }
  const out: Group[] = [];
  for (const name of names.sort()) {
    const group = await readGroup(paths, name).catch(() => null);
    if (!group) continue;
    if (opts.kind && group.kind !== opts.kind) continue;
    if (group.archived && !opts.includeArchived) continue;
    out.push(group);
  }
  return out;
}

export async function writeGroup(paths: KanmerPaths, group: Group): Promise<void> {
  await fs.mkdir(groupDir(paths, group.id), { recursive: true });
  await writeFileAtomic(groupFile(paths, group.id), serialiseGroup(group));
}

/**
 * A path inside a group's folder, validated the same way ticket document paths
 * are: no traversal, no separators in a segment. Group docs are free-form —
 * there is no type vocabulary here, because a group's context is whatever the
 * work needs it to be.
 */
export function groupDocPath(paths: KanmerPaths, id: string, rel: string): string {
  const norm = rel.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!norm) throw new Error("Group document path is empty");
  const segments = norm.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === "." || seg === ".." || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(seg)) {
      throw new Error(`Invalid segment "${seg}" in group document path "${rel}"`);
    }
  }
  const last = segments[segments.length - 1];
  if (!last.includes(".")) segments[segments.length - 1] = `${last}.md`;
  // The group's own file is not a context doc — refuse to overwrite it here.
  if (segments.length === 1 && segments[0] === `${id}.md`) {
    throw new Error(`"${rel}" is the group's own file; edit it with update_group instead.`);
  }
  return path.join(groupDir(paths, id), ...segments);
}

/** Highest group number already on disk for a prefix — the counters' safety net. */
export async function maxGroupNumberForPrefix(
  paths: KanmerPaths,
  prefix: string,
): Promise<number> {
  let names: string[];
  try {
    names = await fs.readdir(groupsRoot(paths));
  } catch {
    return 0;
  }
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  for (const name of names) {
    const m = re.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}
