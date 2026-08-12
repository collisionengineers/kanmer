import path from "node:path";
import type { ItemType } from "./types.js";

export const KANMER_DIR = ".kanmer";

/** Subfolder name for each item type. */
export const TYPE_DIRS: Record<ItemType, string> = {
  ticket: "tickets",
  plan: "plans",
  research: "research",
};

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

/** Full path to an item file, given its type and id. */
export function itemFile(paths: KanmerPaths, type: ItemType, id: string): string {
  return path.join(typeDir(paths, type), `${id}.md`);
}
