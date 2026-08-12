import path from "node:path";
import type { ItemType, TicketDoc } from "./types.js";

export const KANMER_DIR = ".kanmer";

/** Subfolder name for each item type (format 1 legacy layout). */
export const TYPE_DIRS: Record<ItemType, string> = {
  ticket: "tickets",
  plan: "plans",
  research: "research",
};

/** Folder under `areas/` for tickets with no area (format 2). */
export const NO_AREA_DIR = "_none";

/**
 * Resolve all the important paths for a project root. `projectRoot` is the
 * folder that contains (or will contain) the `.kanmer` directory.
 */
export function resolvePaths(projectRoot: string) {
  const root = path.resolve(projectRoot);
  const kanmer = path.join(root, KANMER_DIR);
  const data = path.join(kanmer, "data");
  return {
    projectRoot: root,
    kanmer,
    data,
    boardFile: path.join(data, "board.yml"),
    countersFile: path.join(data, "counters.json"),
    versionFile: path.join(kanmer, "version.json"),
    /** Format 2: area folders live here, one per area id, plus `_none`. */
    areasRoot: path.join(kanmer, "areas"),
    tickets: path.join(kanmer, TYPE_DIRS.ticket),
    plans: path.join(kanmer, TYPE_DIRS.plan),
    research: path.join(kanmer, TYPE_DIRS.research),
  };
}

export type KanmerPaths = ReturnType<typeof resolvePaths>;

/** Directory holding items of a given type. */
export function typeDir(paths: KanmerPaths, type: ItemType): string {
  return path.join(paths.kanmer, TYPE_DIRS[type]);
}

/**
 * Ids that are safe to embed in a filename: alphanumeric start, then
 * alphanumerics, dot, underscore or dash. No separators, no `..`.
 */
const SAFE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Reject an id that could escape the item directory when joined into a path.
 * Ids arrive straight from model output, so this is a real attack surface:
 * without it, `delete_item` with a traversing id can remove files anywhere
 * the process can reach.
 */
export function assertSafeId(id: string): void {
  if (!SAFE_ID_RE.test(id) || id.includes("..")) {
    throw new Error(`Invalid item id "${id}"`);
  }
}

/** Full path to an item file, given its type and id. */
export function itemFile(paths: KanmerPaths, type: ItemType, id: string): string {
  assertSafeId(id);
  const dir = typeDir(paths, type);
  const file = path.join(dir, `${id}.md`);
  // Belt and braces: even a validated id must resolve inside the type dir.
  if (!path.resolve(file).startsWith(path.resolve(dir) + path.sep)) {
    throw new Error(`Invalid item id "${id}"`);
  }
  return file;
}

/**
 * The folder name under `areas/` for an area id (`_none` for "no area").
 * Area ids come from board.yml or model output, so they get the same
 * traversal guard as item ids.
 */
export function areaFolderName(areaId: string): string {
  if (areaId === "" || areaId === NO_AREA_DIR) return NO_AREA_DIR;
  if (!SAFE_ID_RE.test(areaId) || areaId.includes("..")) {
    throw new Error(`Invalid area id "${areaId}"`);
  }
  return areaId;
}

/** Format 2: the directory for one area's ticket folders. */
export function areaDir(paths: KanmerPaths, areaId: string): string {
  return path.join(paths.areasRoot, areaFolderName(areaId));
}

/** Format 2: a ticket's own folder inside an area (folder name = ticket id). */
export function ticketDirIn(paths: KanmerPaths, areaId: string, id: string): string {
  assertSafeId(id);
  return path.join(areaDir(paths, areaId), id);
}

/** Format 2: the ticket markdown file inside its folder. */
export function ticketFileIn(paths: KanmerPaths, areaId: string, id: string): string {
  return path.join(ticketDirIn(paths, areaId, id), `${id}.md`);
}

/** Format 2: one of the pipeline documents inside a ticket folder. */
export function docFileIn(ticketDir: string, doc: TicketDoc): string {
  return path.join(ticketDir, `${doc}.md`);
}
