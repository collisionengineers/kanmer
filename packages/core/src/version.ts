import { pathExists, readText, writeFileAtomic } from "./io.js";
import type { KanmerPaths } from "./paths.js";

/** Contents of `.kanmer/version.json` — the storage format marker. */
export interface KanmerVersion {
  format: number;
  /** Set by migration: the format this board was upgraded from. */
  migratedFrom?: number;
  /** Set by migration: ISO timestamp of the upgrade. */
  migratedAt?: string;
}

/** The storage format this build of core writes. */
export const CURRENT_FORMAT = 3;

/** Read version.json, or null when the board predates format versioning. */
export async function readVersion(paths: KanmerPaths): Promise<KanmerVersion | null> {
  if (!(await pathExists(paths.versionFile))) return null;
  try {
    const parsed = JSON.parse(await readText(paths.versionFile)) as KanmerVersion;
    return typeof parsed.format === "number" ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeVersion(paths: KanmerPaths, version: KanmerVersion): Promise<void> {
  await writeFileAtomic(paths.versionFile, `${JSON.stringify(version, null, 2)}\n`);
}
