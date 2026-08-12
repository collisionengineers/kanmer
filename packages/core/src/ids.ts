import fs from "node:fs/promises";
import { pathExists, readText, writeFileAtomic } from "./io.js";
import { typeDir, type KanmerPaths } from "./paths.js";
import type { ItemType } from "./types.js";

type Counters = Partial<Record<ItemType, number>>;

async function readCounters(paths: KanmerPaths): Promise<Counters> {
  if (!(await pathExists(paths.countersFile))) return {};
  try {
    return JSON.parse(await readText(paths.countersFile)) as Counters;
  } catch {
    return {};
  }
}

async function writeCounters(paths: KanmerPaths, counters: Counters): Promise<void> {
  await writeFileAtomic(paths.countersFile, `${JSON.stringify(counters, null, 2)}\n`);
}

/** Highest numeric suffix already present on disk for a prefix (0 if none). */
async function maxOnDisk(paths: KanmerPaths, type: ItemType, prefix: string): Promise<number> {
  const dir = typeDir(paths, type);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return 0;
  }
  const re = new RegExp(`^${escapeRegExp(prefix)}-(\\d+)\\.md$`);
  let max = 0;
  for (const name of entries) {
    const m = re.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

/** Format an id from its prefix and number, e.g. `TICK-004`. */
export function formatId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

/**
 * The next id number a fresh allocation would use: one past the highest of
 * the counter, the on-disk max, and `atLeast`. Read-only — the caller claims
 * the id by exclusively creating the item file, then records the counter.
 */
export async function nextIdNumber(
  paths: KanmerPaths,
  type: ItemType,
  prefix: string,
  atLeast = 0,
): Promise<number> {
  const counters = await readCounters(paths);
  const fromCounter = counters[type] ?? 0;
  const fromDisk = await maxOnDisk(paths, type, prefix);
  return Math.max(fromCounter, fromDisk, atLeast) + 1;
}

/**
 * Best-effort counter bump after a successful exclusive file claim. Failure
 * is swallowed: the counter is an optimisation, and allocation reconciles
 * against the on-disk max anyway, so a stale counter self-heals.
 */
export async function recordAllocatedId(
  paths: KanmerPaths,
  type: ItemType,
  n: number,
): Promise<void> {
  try {
    const counters = await readCounters(paths);
    counters[type] = Math.max(counters[type] ?? 0, n);
    await writeCounters(paths, counters);
  } catch {
    // counters.json is derived state — see above.
  }
}

/**
 * Allocate the next id for a type, e.g. `TICK-004`. Uses counters.json but
 * reconciles against files already on disk so a manually-added file can never
 * be overwritten by a fresh allocation. Note: this reserves the id in the
 * counter only — racing callers can still collide, which is why `createItem`
 * uses `nextIdNumber` + exclusive file creation instead.
 */
export async function allocateId(
  paths: KanmerPaths,
  type: ItemType,
  prefix: string,
): Promise<string> {
  const next = await nextIdNumber(paths, type, prefix);
  await recordAllocatedId(paths, type, next);
  return formatId(prefix, next);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
