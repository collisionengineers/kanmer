import path from "node:path";
import type { ItemType } from "./types.js";

export const KANMER_DIR = ".kanmer";

/** Subfolder name for each item type (format 1 legacy layout). */
export const TYPE_DIRS: Record<ItemType, string> = {
  ticket: "tickets",
  plan: "plans",
  research: "research",
};

/** Folder under `areas/` for tickets with no area (format 2). */
export const NO_AREA_DIR = "_none";

/** Worktree directory name Kanmer parks a dedicated board branch in. */
export const WORKTREES_DIR = ".worktrees";

/**
 * Where the *source checkout* is, given the board root.
 *
 * These are the same folder for a colocated board, but not when the board
 * lives on its own branch: `ensureBoardWorktree` puts it at
 * `<repo>/.worktrees/<name>`, and the repo's own `/docs/` tree — what `refs`
 * point at — stays behind in `<repo>`. Callers that know both roots should
 * pass `repoRoot` explicitly; this recognises the shape Kanmer itself creates
 * so an already-registered server keeps working without being reconnected.
 *
 * Returns null when the board root is not a Kanmer board worktree.
 */
export function deriveRepoRoot(boardRoot: string): string | null {
  const root = path.resolve(boardRoot);
  const parent = path.dirname(root);
  if (path.basename(parent) !== WORKTREES_DIR) return null;
  const repo = path.dirname(parent);
  return repo && repo !== parent ? repo : null;
}

/**
 * Resolve all the important paths for a project root. `projectRoot` is the
 * folder that contains (or will contain) the `.kanmer` directory.
 *
 * `repoRoot` is the source checkout that governing-doc `refs` resolve against.
 * It differs from `projectRoot` only when the board lives in its own worktree;
 * when omitted it is derived from the board path, falling back to `projectRoot`.
 */
export function resolvePaths(projectRoot: string, repoRoot?: string) {
  const root = path.resolve(projectRoot);
  const kanmer = path.join(root, KANMER_DIR);
  const data = path.join(kanmer, "data");
  return {
    projectRoot: root,
    /** Root that `refs` (governing repo docs) resolve against. */
    repoRoot: repoRoot ? path.resolve(repoRoot) : (deriveRepoRoot(root) ?? root),
    kanmer,
    data,
    boardFile: path.join(data, "board.yml"),
    countersFile: path.join(data, "counters.json"),
    versionFile: path.join(kanmer, "version.json"),
    /** Logical project identity (FRD-029); absent on boards that predate it. */
    projectFile: path.join(kanmer, "project.json"),
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
 * Resolve a repo-relative path (e.g. `docs/prd/checkout.md`) to an absolute
 * path *under* the project root, or throw. Refs come from model output and the
 * create dialog, so this is the same traversal guard `itemFile` applies to ids:
 * a `../` path, or an absolute one, escapes the root and is rejected.
 */
export function assertSafeRepoPath(projectRoot: string, rel: string): string {
  const root = path.resolve(projectRoot);
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error(`Repo doc path "${rel}" escapes the project root`);
  }
  return abs;
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

/**
 * A document name safe to embed in a ticket-folder filename: lowercase-kebab,
 * no separators, no `..`. Doc names arrive from board config and model output,
 * so they get the same traversal guard as ids. Scratch files (`scratch-<slug>`)
 * are still valid kebab names — the reserved-prefix rule that keeps a *doc type*
 * from being called `scratch-*` lives in the config schema, not here.
 */
const SAFE_DOC_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertSafeDocName(doc: string): void {
  if (!SAFE_DOC_RE.test(doc) || doc.includes("..")) {
    throw new Error(`Invalid document name "${doc}"`);
  }
}

/** Format 2: one of the pipeline documents inside a ticket folder. */
export function docFileIn(ticketDir: string, doc: string): string {
  assertSafeDocName(doc);
  return path.join(ticketDir, `${doc}.md`);
}

/** Filename prefix for per-ticket scratch notes (`scratch-<slug>.md`). */
export const SCRATCH_PREFIX = "scratch-";

/**
 * Format 2: a per-ticket scratch file (`scratch-<slug>.md`) inside a ticket
 * folder. `slug` is validated like a doc name so it can't escape the folder.
 */
export function scratchFileIn(ticketDir: string, slug: string): string {
  assertSafeDocName(slug);
  return path.join(ticketDir, `${SCRATCH_PREFIX}${slug}.md`);
}

/** True for a ticket-folder filename that is a scratch note, not a pipeline doc. */
export function isScratchFile(fileName: string): boolean {
  return fileName.startsWith(SCRATCH_PREFIX) && fileName.endsWith(".md");
}
