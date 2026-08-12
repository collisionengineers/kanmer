import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  pathExists,
  removeFile,
  readText,
  writeFileAtomic,
  writeFileExclusive,
} from "./io.js";
import { itemFile, resolvePaths, typeDir, type KanmerPaths } from "./paths.js";
import { parseItem, serialiseItem } from "./frontmatter.js";
import { formatId, nextIdNumber, recordAllocatedId } from "./ids.js";
import { defaultBoardConfig, readBoard, readBoardWithSource, writeBoard } from "./board.js";
import { parseWikiLinks } from "./links.js";
import {
  ItemTypeSchema,
  type BoardColumn,
  type BoardConfig,
  type BoardSource,
  type ColumnKind,
  type CreateItemInput,
  type DeleteItemResult,
  type Item,
  type ItemFilter,
  type ItemType,
  type ItemWarning,
  type UpdateItemPatch,
} from "./types.js";

const ITEM_TYPES: ItemType[] = ["ticket", "plan", "research"];

/** Bound on exclusive-create retries; ~2× the worst realistic contention. */
const CREATE_ATTEMPTS = 20;

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * A store bound to one project root (the folder containing `.kanmer`).
 * Both the MCP server and the Electron main process construct one of these.
 */
export class KanmerStore {
  readonly paths: KanmerPaths;

  constructor(projectRoot: string) {
    this.paths = resolvePaths(projectRoot);
  }

  /** Create the `.kanmer` skeleton and default board.yml if missing. */
  async init(): Promise<void> {
    await ensureDir(this.paths.data);
    await ensureDir(this.paths.tickets);
    await ensureDir(this.paths.plans);
    await ensureDir(this.paths.research);
    if (!(await pathExists(this.paths.boardFile))) {
      await writeBoard(this.paths, defaultBoardConfig());
    }
  }

  /** True if this project already has a `.kanmer` folder. */
  async exists(): Promise<boolean> {
    return pathExists(this.paths.kanmer);
  }

  async getBoard(): Promise<BoardConfig> {
    return readBoard(this.paths);
  }

  /** Board plus whether it came from a real board.yml or the synthesized default. */
  async getBoardWithSource(): Promise<{ board: BoardConfig; source: BoardSource }> {
    return readBoardWithSource(this.paths);
  }

  async setBoard(board: BoardConfig): Promise<void> {
    await writeBoard(this.paths, board);
  }

  /** Add a stage, area or priority to the board (used by MCP add_column). */
  async addColumn(kind: ColumnKind, column: BoardColumn): Promise<BoardConfig> {
    const board = await this.getBoard();
    const list = columnList(board, kind);
    if (list.some((c) => c.id === column.id)) {
      throw new Error(`${kind} "${column.id}" already exists`);
    }
    list.push(column);
    await this.setBoard(board);
    return board;
  }

  /** Read every item (optionally filtered). Includes body. */
  async listItems(filter: ItemFilter = {}): Promise<Item[]> {
    return (await this.listItemsWithWarnings(filter)).items;
  }

  /**
   * Like listItems, but also surfaces problems that would otherwise be
   * silently swallowed: files that fail to parse, and files whose frontmatter
   * id doesn't match their filename.
   */
  async listItemsWithWarnings(
    filter: ItemFilter = {},
  ): Promise<{ items: Item[]; warnings: ItemWarning[] }> {
    const types = filter.type ? [filter.type] : ITEM_TYPES;
    const items: Item[] = [];
    const warnings: ItemWarning[] = [];
    for (const type of types) {
      const dir = typeDir(this.paths, type);
      let names: string[];
      try {
        names = await fs.readdir(dir);
      } catch {
        continue;
      }
      for (const name of names) {
        if (!name.endsWith(".md")) continue;
        const file = path.join(dir, name);
        try {
          const item = parseItem(await readText(file));
          const fromName = path.basename(name, ".md");
          if (item.id !== fromName) {
            warnings.push({
              file,
              message:
                `frontmatter id "${item.id}" doesn't match filename "${name}" — ` +
                `rename the file to ${item.id}.md or fix the id (lookups go by filename)`,
            });
          }
          items.push(item);
        } catch (err) {
          warnings.push({
            file,
            message: `failed to parse: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }
    return {
      items: items.filter((item) => matchesFilter(item, filter)).sort(byIdAsc),
      warnings,
    };
  }

  /** Locate the file for an id by checking each type folder. */
  private async findFile(id: string): Promise<{ type: ItemType; file: string } | null> {
    for (const type of ITEM_TYPES) {
      const file = itemFile(this.paths, type, id);
      if (await pathExists(file)) return { type, file };
    }
    return null;
  }

  async getItem(id: string): Promise<Item | null> {
    const found = await this.findFile(id);
    if (!found) return null;
    return parseItem(await readText(found.file));
  }

  async createItem(input: CreateItemInput): Promise<Item> {
    const type = ItemTypeSchema.parse(input.type);
    const board = await this.getBoard();
    if (input.status !== undefined) assertFieldAgainstBoard(board, "status", input.status);
    if (input.area !== undefined) assertFieldAgainstBoard(board, "area", input.area);
    if (input.priority !== undefined) assertFieldAgainstBoard(board, "priority", input.priority);
    for (const target of input.links ?? []) {
      if (!(await this.getItem(target))) {
        throw new Error(`No item with id "${target}" to link to`);
      }
    }
    // The item file itself is the allocation lock: compute a candidate id,
    // try to create the file exclusively, and on EEXIST (someone else claimed
    // it between our read and our write) recompute one number higher.
    const prefix = board.idPrefixes[type];
    let lastTried = 0;
    for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
      const n = await nextIdNumber(this.paths, type, prefix, lastTried);
      const id = formatId(prefix, n);
      const now = nowIso();
      const item: Item = {
        id,
        type,
        title: input.title,
        status: input.status ?? board.statuses[0]?.id ?? "",
        area: input.area ?? "",
        priority: input.priority ?? defaultPriority(board),
        assignee: input.assignee ?? "",
        labels: input.labels ?? [],
        links: input.links ?? [],
        archived: false,
        created: now,
        updated: now,
        body: input.body ?? "",
      };
      try {
        await writeFileExclusive(itemFile(this.paths, type, id), serialiseItem(item));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") {
          lastTried = n;
          continue;
        }
        throw err;
      }
      await recordAllocatedId(this.paths, type, n);
      return item;
    }
    throw new Error(`Could not allocate a unique ${type} id after ${CREATE_ATTEMPTS} attempts`);
  }

  async updateItem(id: string, patch: UpdateItemPatch): Promise<Item> {
    const { expectedUpdated, ...fields } = patch;
    if (fields.status !== undefined || fields.area !== undefined || fields.priority !== undefined) {
      const board = await this.getBoard();
      if (fields.status !== undefined) assertFieldAgainstBoard(board, "status", fields.status);
      if (fields.area !== undefined) assertFieldAgainstBoard(board, "area", fields.area);
      if (fields.priority !== undefined) assertFieldAgainstBoard(board, "priority", fields.priority);
    }
    const found = await this.findFile(id);
    if (!found) throw new Error(`No item with id "${id}"`);
    const current = parseItem(await readText(found.file));
    if (expectedUpdated !== undefined && current.updated !== expectedUpdated) {
      const { body: _body, ...frontmatter } = current;
      throw new Error(
        `Conflict: "${id}" changed since you read it (updated is now ${current.updated}, ` +
          `you expected ${expectedUpdated}). Re-read the item and re-apply your change. ` +
          `Current frontmatter: ${JSON.stringify(frontmatter)}`,
      );
    }
    const pruned = pruneUndefined(fields);
    if (!patchChangesItem(current, pruned)) {
      // No-op writes must not bump `updated` — staleness reporting and the
      // GUI watcher both key off it.
      return current;
    }
    const next: Item = {
      ...current,
      ...pruned,
      updated: nowIso(),
    };
    await writeFileAtomic(found.file, serialiseItem(next));
    return next;
  }

  /** Kanban-move convenience: move an item to a workflow stage. */
  async moveItem(
    id: string,
    to: { status: string; expectedUpdated?: string },
  ): Promise<Item> {
    return this.updateItem(id, to);
  }

  /**
   * Delete an item file, then rewrite the frontmatter links[] of anything
   * that pointed at it. Body [[wiki]] references are prose and stay put —
   * they're reported so the caller can mention the residue.
   */
  async deleteItem(id: string): Promise<DeleteItemResult> {
    const found = await this.findFile(id);
    if (!found) return { deleted: false, cleanedLinks: [], bodyReferencesRemain: [] };
    await removeFile(found.file);
    const remaining = (await this.listItemsWithWarnings({ includeArchived: true })).items;
    const cleanedLinks: string[] = [];
    const bodyReferencesRemain: string[] = [];
    for (const item of remaining) {
      if ((item.links ?? []).includes(id)) {
        await this.updateItem(item.id, { links: (item.links ?? []).filter((l) => l !== id) });
        cleanedLinks.push(item.id);
      }
      if (parseWikiLinks(item.body).includes(id)) {
        bodyReferencesRemain.push(item.id);
      }
    }
    return { deleted: true, cleanedLinks, bodyReferencesRemain };
  }

  /** Plain text search over id, title, body, labels, assignee. */
  async searchItems(query: string, filter: ItemFilter = {}): Promise<Item[]> {
    const q = query.trim().toLowerCase();
    if (!q) return this.listItems(filter);
    const all = await this.listItems(filter);
    return all.filter((item) => {
      const haystack = [
        item.id,
        item.title,
        item.body,
        item.assignee,
        ...(item.labels ?? []),
      ]
        .join("\n")
        .toLowerCase();
      return haystack.includes(q);
    });
  }
}

/**
 * Reject a status/area/priority id the board doesn't define — the write-path
 * guard against silent misfiling. The error lists the valid ids so a model
 * can self-correct. Areas are special: `""` (no area) is always legal, and a
 * board with no areas configured accepts anything (legacy boards tag areas
 * without declaring them).
 */
function assertFieldAgainstBoard(
  board: BoardConfig,
  kind: ColumnKind,
  value: string,
): void {
  if (kind === "area" && (value === "" || board.areas.length === 0)) return;
  const list = columnList(board, kind);
  if (!list.some((c) => c.id === value)) {
    const label = kind === "status" ? "stages" : `${kind === "area" ? "areas" : "priorities"}`;
    throw new Error(
      `Unknown ${kind} "${value}". Valid ${label}: ${list.map((c) => c.id).join(", ")}`,
    );
  }
}

/** Board-derived priority default: `medium` if defined, else the middle entry. */
function defaultPriority(board: BoardConfig): string {
  if (board.priorities.some((p) => p.id === "medium")) return "medium";
  const middle = board.priorities[Math.floor((board.priorities.length - 1) / 2)];
  return middle?.id ?? "medium";
}

/** True if applying `pruned` to `current` would actually change the file. */
function patchChangesItem(current: Item, pruned: Partial<UpdateItemPatch>): boolean {
  for (const [key, value] of Object.entries(pruned)) {
    const existing = (current as Record<string, unknown>)[key];
    if (key === "body") {
      // serialiseItem writes body.trim(), so compare what would be stored.
      if (String(value).trim() !== String(existing ?? "").trim()) return true;
    } else if (JSON.stringify(value) !== JSON.stringify(existing)) {
      return true;
    }
  }
  return false;
}

function matchesFilter(item: Item, filter: ItemFilter): boolean {
  if (!filter.includeArchived && item.archived) return false;
  if (filter.status && item.status !== filter.status) return false;
  if (filter.area && item.area !== filter.area) return false;
  if (filter.label && !(item.labels ?? []).includes(filter.label)) return false;
  return true;
}

/** The mutable column array on a board for a given kind. */
function columnList(board: BoardConfig, kind: ColumnKind): BoardColumn[] {
  switch (kind) {
    case "status":
      return board.statuses;
    case "area":
      return board.areas;
    case "priority":
      return board.priorities;
  }
}

function byIdAsc(a: Item, b: Item): number {
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

function pruneUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
