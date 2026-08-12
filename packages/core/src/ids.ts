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

/**
 * Allocate the next id for a type, e.g. `TICK-004`. Uses counters.json but
 * reconciles against files already on disk so a manually-added file can never
 * be overwritten by a fresh allocation.
 */
export async function allocateId(
  paths: KanmerPaths,
  type: ItemType,
  prefix: string,
): Promise<string> {
  const counters = await readCounters(paths);
  const fromCounter = counters[type] ?? 0;
  const fromDisk = await maxOnDisk(paths, type, prefix);
  const next = Math.max(fromCounter, fromDisk) + 1;
  counters[type] = next;
  await writeCounters(paths, counters);
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
