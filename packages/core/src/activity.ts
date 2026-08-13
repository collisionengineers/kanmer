import fs from "node:fs/promises";
import path from "node:path";
import { pathExists, readText, writeFileAtomic } from "./io.js";
import type { KanmerPaths } from "./paths.js";

/**
 * One line of `.kanmer/data/activity.jsonl` — a mutation that happened.
 * Derived convenience, NOT truth: the log is never consulted for state,
 * safe to delete, and plain JSONL so it stays greppable.
 */
export interface ActivityEntry {
  ts: string;
  id: string;
  op: "create" | "update" | "delete" | "take" | "release" | "doc";
  /** The changed field (update), or the document name (doc). */
  field?: string;
  from?: unknown;
  to?: unknown;
  actor: string;
}

/** Rotation: past this many lines the oldest half is dropped. */
const MAX_LINES = 5000;
/** Cheap guard so the common path never reads the file (~100 B/line). */
const SIZE_CHECK_BYTES = 512_000;

function activityFile(paths: KanmerPaths): string {
  return path.join(paths.data, "activity.jsonl");
}

/**
 * Append entries to the activity log. Append-only writes don't need the
 * atomic-rename dance; rotation (rare) rewrites atomically. Never throws —
 * a logging failure must not fail the mutation it describes.
 */
export async function appendActivity(
  paths: KanmerPaths,
  entries: ActivityEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const file = activityFile(paths);
  try {
    await fs.mkdir(paths.data, { recursive: true });
    await fs.appendFile(file, entries.map((e) => `${JSON.stringify(e)}\n`).join(""), "utf8");
    const stat = await fs.stat(file);
    if (stat.size > SIZE_CHECK_BYTES) {
      const lines = (await readText(file)).split("\n").filter(Boolean);
      if (lines.length > MAX_LINES) {
        const keep = lines.slice(-Math.floor(MAX_LINES / 2));
        await writeFileAtomic(file, `${keep.join("\n")}\n`);
      }
    }
  } catch {
    // best-effort by design
  }
}

/**
 * Read the activity log, optionally filtered by item id and/or `since`
 * (ISO timestamp, exclusive). Entries come back oldest-first; `limit`
 * keeps the most recent N after filtering. Malformed lines are skipped.
 */
export async function readActivity(
  paths: KanmerPaths,
  opts: { id?: string; since?: string; limit?: number } = {},
): Promise<ActivityEntry[]> {
  const file = activityFile(paths);
  if (!(await pathExists(file))) return [];
  const entries: ActivityEntry[] = [];
  for (const line of (await readText(file)).split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as ActivityEntry;
      if (opts.id !== undefined && parsed.id !== opts.id) continue;
      if (opts.since !== undefined && parsed.ts <= opts.since) continue;
      entries.push(parsed);
    } catch {
      // a corrupt line loses itself, not the log
    }
  }
  return opts.limit !== undefined && entries.length > opts.limit
    ? entries.slice(-opts.limit)
    : entries;
}
