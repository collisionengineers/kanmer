import fs from "node:fs/promises";
import { ensureDir, pathExists, removeFile, readText, writeFileAtomic } from "./io.js";
import { itemFile, resolvePaths, typeDir, type KanmerPaths } from "./paths.js";
import { parseItem, serialiseItem } from "./frontmatter.js";
import { allocateId } from "./ids.js";
import { defaultBoardConfig, readBoard, writeBoard } from "./board.js";
import {
  ItemTypeSchema,
  type BoardColumn,
  type BoardConfig,
  type ColumnKind,
  type CreateItemInput,
  type Item,
  type ItemFilter,
  type ItemType,
  type UpdateItemPatch,
} from "./types.js";

const ITEM_TYPES: ItemType[] = ["ticket", "plan", "research"];

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

  async setBoard(board: BoardConfig): Promise<void> {
    await writeBoard(this.paths, board);
  }

  /** Add a phase or status to the board (used by MCP add_phase). */
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
    const types = filter.type ? [filter.type] : ITEM_TYPES;
    const items: Item[] = [];
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
        try {
          items.push(parseItem(await readText(`${dir}/${name}`)));
        } catch {
          // Skip malformed files rather than failing the whole listing.
        }
      }
    }
    return items.filter((item) => matchesFilter(item, filter)).sort(byIdAsc);
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
    const id = await allocateId(this.paths, type, board.idPrefixes[type]);
    const now = nowIso();
    const item: Item = {
      id,
      type,
      title: input.title,
      phase: input.phase ?? board.phases[0]?.id ?? "",
      status: input.status ?? board.statuses[0]?.id ?? "",
      area: input.area ?? "",
      priority: input.priority ?? "medium",
      assignee: input.assignee ?? "",
      labels: input.labels ?? [],
      links: input.links ?? [],
      archived: false,
      created: now,
      updated: now,
      body: input.body ?? "",
    };
    await writeFileAtomic(itemFile(this.paths, type, id), serialiseItem(item));
    return item;
  }

  async updateItem(id: string, patch: UpdateItemPatch): Promise<Item> {
    const found = await this.findFile(id);
    if (!found) throw new Error(`No item with id "${id}"`);
    const current = parseItem(await readText(found.file));
    const next: Item = {
      ...current,
      ...pruneUndefined(patch),
      updated: nowIso(),
    };
    await writeFileAtomic(found.file, serialiseItem(next));
    return next;
  }

  /** Kanban-move convenience: change phase and/or status. */
  async moveItem(id: string, to: { phase?: string; status?: string }): Promise<Item> {
    return this.updateItem(id, to);
  }

  async deleteItem(id: string): Promise<boolean> {
    const found = await this.findFile(id);
    if (!found) return false;
    await removeFile(found.file);
    return true;
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

function matchesFilter(item: Item, filter: ItemFilter): boolean {
  if (!filter.includeArchived && item.archived) return false;
  if (filter.phase && item.phase !== filter.phase) return false;
  if (filter.status && item.status !== filter.status) return false;
  if (filter.area && item.area !== filter.area) return false;
  if (filter.label && !(item.labels ?? []).includes(filter.label)) return false;
  return true;
}

/** The mutable column array on a board for a given kind. */
function columnList(board: BoardConfig, kind: ColumnKind): BoardColumn[] {
  switch (kind) {
    case "phase":
      return board.phases;
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
