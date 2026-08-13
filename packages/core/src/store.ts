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
import {
  areaDir,
  areaFolderName,
  docFileIn,
  itemFile,
  resolvePaths,
  ticketDirIn,
  ticketFileIn,
  typeDir,
  type KanmerPaths,
} from "./paths.js";
import { parseItem, serialiseItem } from "./frontmatter.js";
import {
  formatId,
  nextIdNumber,
  nextPrefixNumber,
  recordAllocatedId,
  recordAllocatedPrefix,
} from "./ids.js";
import {
  areaPrefix,
  defaultBoardConfig,
  lastStageId,
  readBoard,
  readBoardWithSource,
  writeBoard,
} from "./board.js";
import { parseWikiLinks } from "./links.js";
import { appendActivity, readActivity, type ActivityEntry } from "./activity.js";
import { CURRENT_FORMAT, readVersion, writeVersion } from "./version.js";
import {
  ItemTypeSchema,
  TICKET_DOCS,
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
  type MovePosition,
  type TakeTicketInput,
  type TicketDoc,
  type TicketDocsInfo,
  type UpdateItemPatch,
} from "./types.js";

const ITEM_TYPES: ItemType[] = ["ticket", "plan", "research"];

/** Bound on exclusive-create retries; ~2× the worst realistic contention. */
const CREATE_ATTEMPTS = 20;

function nowIso(): string {
  return new Date().toISOString();
}

/** Where an item's file lives: the v2 areas layout or a v1 type folder. */
type ItemLocation =
  | { kind: "v2"; file: string; dir: string; areaFolder: string }
  | { kind: "v1"; file: string; type: ItemType };

/**
 * A store bound to one project root (the folder containing `.kanmer`).
 * Both the MCP server and the Electron main process construct one of these.
 *
 * Reads are format-transparent (both layouts are always scanned); writes
 * follow the detected format, so an unmigrated v1 board keeps working.
 */
export class KanmerStore {
  readonly paths: KanmerPaths;
  private formatCache: 1 | 2 | null = null;
  private actor = "gui";

  constructor(projectRoot: string, opts: { actor?: string } = {}) {
    this.paths = resolvePaths(projectRoot);
    if (opts.actor) this.actor = opts.actor;
  }

  /** Who mutations are attributed to in the activity log (MCP sets the client name). */
  setActor(name: string): void {
    if (name) this.actor = name;
  }

  private activity(
    id: string,
    op: ActivityEntry["op"],
    extra: Partial<Pick<ActivityEntry, "field" | "from" | "to">> = {},
  ): ActivityEntry {
    return { ts: nowIso(), id, op, ...extra, actor: this.actor };
  }

  /** Read the activity log (derived convenience — never consulted for state). */
  async getActivity(
    opts: { id?: string; since?: string; limit?: number } = {},
  ): Promise<ActivityEntry[]> {
    return readActivity(this.paths, opts);
  }

  /**
   * Which storage format this board uses. version.json is authoritative;
   * without it, a legacy `tickets/` folder means format 1, and a fresh
   * project starts at the current format.
   */
  async detectFormat(): Promise<1 | 2> {
    if (this.formatCache !== null) return this.formatCache;
    const version = await readVersion(this.paths);
    if (version) {
      this.formatCache = version.format >= 2 ? 2 : 1;
    } else if (await pathExists(this.paths.tickets)) {
      this.formatCache = 1;
    } else {
      this.formatCache = 2;
    }
    return this.formatCache;
  }

  /** Forget the cached format — call after migrating this project. */
  resetFormatCache(): void {
    this.formatCache = null;
  }

  /**
   * Create the `.kanmer` skeleton and default board.yml if missing. On an
   * existing v1 board this maintains the v1 skeleton and does NOT stamp
   * version.json — upgrading a board is migration's job, never a side
   * effect of opening it.
   */
  async init(): Promise<void> {
    const format = await this.detectFormat();
    await ensureDir(this.paths.data);
    if (format === 1) {
      await ensureDir(this.paths.tickets);
      await ensureDir(this.paths.plans);
      await ensureDir(this.paths.research);
    } else {
      await ensureDir(this.paths.areasRoot);
      if (!(await readVersion(this.paths))) {
        await writeVersion(this.paths, { format: CURRENT_FORMAT });
      }
    }
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

  /**
   * Write the whole board. Every board mutation funnels through here — the
   * MCP column verbs, the GUI Settings save and migration's prefix pinning —
   * so this is where the "the last stage is proof-gated" invariant is
   * defended: a write that makes a *different* stage final must not strand
   * proofless tickets in it.
   */
  async setBoard(board: BoardConfig): Promise<void> {
    const previous = await this.getBoard(); // re-reads disk = the true prior state
    const prevLast = lastStageId(previous);
    const nextLast = lastStageId(board);
    if (nextLast !== undefined && nextLast !== prevLast) {
      await this.assertFinalStageProven(nextLast);
    }
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

  /**
   * Rename/recolour a column (and, for areas, pin its id prefix). The id
   * itself is immutable — items reference columns by id.
   */
  async updateColumn(
    kind: ColumnKind,
    id: string,
    patch: { name?: string; color?: string; prefix?: string },
  ): Promise<BoardConfig> {
    if (patch.prefix !== undefined && kind !== "area") {
      throw new Error("prefix only applies to areas");
    }
    const board = await this.getBoard();
    const list = columnList(board, kind);
    const column = list.find((c) => c.id === id);
    if (!column) {
      throw new Error(`No ${kind} "${id}". Valid ids: ${list.map((c) => c.id).join(", ")}`);
    }
    if (patch.name !== undefined) column.name = patch.name;
    if (patch.color !== undefined) column.color = patch.color;
    if (patch.prefix !== undefined) column.prefix = patch.prefix;
    await this.setBoard(board); // validates shape + prefix uniqueness
    return board;
  }

  /**
   * Remove a column. Refuses while items still reference it unless
   * `migrateTo` names another column of the same kind — then every matching
   * item is rewritten first (through updateItem, so validation, folder moves
   * and the proof gate all apply).
   */
  async removeColumn(
    kind: ColumnKind,
    id: string,
    opts: { migrateTo?: string } = {},
  ): Promise<{ board: BoardConfig; migrated: string[] }> {
    const board = await this.getBoard();
    const list = columnList(board, kind);
    if (!list.some((c) => c.id === id)) {
      throw new Error(`No ${kind} "${id}". Valid ids: ${list.map((c) => c.id).join(", ")}`);
    }
    if (opts.migrateTo !== undefined) {
      if (opts.migrateTo === id) throw new Error(`migrate_to must differ from the removed ${kind}`);
      if (!list.some((c) => c.id === opts.migrateTo)) {
        throw new Error(
          `migrate_to "${opts.migrateTo}" is not a ${kind} on this board. ` +
            `Valid ids: ${list.map((c) => c.id).join(", ")}`,
        );
      }
    }
    const field = kind === "status" ? "status" : kind === "area" ? "area" : "priority";
    const affected = (await this.listItems({ includeArchived: true })).filter(
      (i) => (i as Record<string, unknown>)[field] === id,
    );
    if (affected.length > 0 && opts.migrateTo === undefined) {
      const sample = affected.slice(0, 5).map((i) => i.id).join(", ");
      throw new Error(
        `${kind} "${id}" still has ${affected.length} item(s) (${sample}` +
          `${affected.length > 5 ? ", …" : ""}). Pass migrate_to with another ${kind} id ` +
          `to move them, or move them yourself first.`,
      );
    }
    const migrated: string[] = [];
    for (const item of affected) {
      await this.updateItem(item.id, { [field]: opts.migrateTo } as UpdateItemPatch);
      migrated.push(item.id);
    }
    const remaining = list.filter((c) => c.id !== id);
    list.splice(0, list.length, ...remaining);
    await this.setBoard(board);
    if (kind === "area") {
      // The area's folder should now be empty — clear it if so; anything a
      // human left inside keeps it alive.
      try {
        await fs.rmdir(areaDir(this.paths, id));
      } catch {
        // non-empty or already gone
      }
    }
    return { board, migrated };
  }

  /** Reorder a column list; `orderedIds` must be a permutation of the existing ids. */
  async reorderColumns(kind: ColumnKind, orderedIds: string[]): Promise<BoardConfig> {
    const board = await this.getBoard();
    const list = columnList(board, kind);
    const current = list.map((c) => c.id);
    const isPermutation =
      orderedIds.length === current.length &&
      [...orderedIds].sort().join("\n") === [...current].sort().join("\n");
    if (!isPermutation) {
      throw new Error(
        `order must be a permutation of the existing ${kind} ids: ${current.join(", ")}`,
      );
    }
    const byId = new Map(list.map((c) => [c.id, c]));
    list.splice(0, list.length, ...orderedIds.map((cid) => byId.get(cid)!));
    await this.setBoard(board);
    return board;
  }

  /** Read every item (optionally filtered). Includes body. */
  async listItems(filter: ItemFilter = {}): Promise<Item[]> {
    return (await this.listItemsWithWarnings(filter)).items;
  }

  /**
   * Like listItems, but also surfaces problems that would otherwise be
   * silently swallowed: files that fail to parse, filename/id mismatches,
   * and tickets whose folder disagrees with their frontmatter area.
   */
  async listItemsWithWarnings(
    filter: ItemFilter = {},
  ): Promise<{ items: Item[]; warnings: ItemWarning[] }> {
    const items: Item[] = [];
    const warnings: ItemWarning[] = [];

    // Format 2 layout: areas/<areaFolder>/<ticketId>/<ticketId>.md
    let areaFolders: string[] = [];
    try {
      areaFolders = await fs.readdir(this.paths.areasRoot);
    } catch {
      // no areas/ dir — v1 board or empty project
    }
    for (const areaFolder of areaFolders) {
      const areaPath = path.join(this.paths.areasRoot, areaFolder);
      let entries: string[];
      try {
        entries = await fs.readdir(areaPath, { withFileTypes: true }).then((d) =>
          d.filter((e) => e.isDirectory()).map((e) => e.name),
        );
      } catch {
        continue;
      }
      for (const ticketFolder of entries) {
        const file = path.join(areaPath, ticketFolder, `${ticketFolder}.md`);
        if (!(await pathExists(file))) continue;
        try {
          const item = parseItem(await readText(file));
          if (item.id !== ticketFolder) {
            warnings.push({
              file,
              message:
                `frontmatter id "${item.id}" doesn't match its folder "${ticketFolder}" — ` +
                `rename the folder and file to the id (lookups go by folder name)`,
            });
          }
          const expectedFolder = safeAreaFolder(item.area);
          if (expectedFolder !== null && expectedFolder !== areaFolder) {
            warnings.push({
              file,
              message:
                `ticket area is "${item.area || "(none)"}" but its folder is under ` +
                `areas/${areaFolder}/ — frontmatter wins; the folder moves on the next write`,
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

    // Format 1 legacy layout: tickets|plans|research/<id>.md
    const types = filter.type ? [filter.type] : ITEM_TYPES;
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

    let filtered = items.filter((item) => matchesFilter(item, filter));
    if (filter.overdue) {
      const board = await this.getBoard();
      const lastStage = lastStageId(board);
      const today = new Date().toISOString().slice(0, 10);
      filtered = filtered.filter(
        (i) => i.due !== undefined && i.due < today && i.status !== lastStage,
      );
    }
    return { items: filtered.sort(byOrderThenId), warnings };
  }

  /** Locate an item's file: v2 areas layout first, then the v1 type dirs. */
  private async locateItem(id: string): Promise<ItemLocation | null> {
    // itemFile/ticketDirIn validate below too, but failing fast keeps the
    // traversal guard on every path.
    itemFile(this.paths, "ticket", id);
    let areaFolders: string[] = [];
    try {
      areaFolders = await fs.readdir(this.paths.areasRoot);
    } catch {
      // fall through to v1
    }
    for (const areaFolder of areaFolders) {
      const dir = path.join(this.paths.areasRoot, areaFolder, id);
      const file = path.join(dir, `${id}.md`);
      if (await pathExists(file)) return { kind: "v2", file, dir, areaFolder };
    }
    for (const type of ITEM_TYPES) {
      const file = itemFile(this.paths, type, id);
      if (await pathExists(file)) return { kind: "v1", file, type };
    }
    return null;
  }

  async getItem(id: string): Promise<Item | null> {
    const loc = await this.locateItem(id);
    if (!loc) return null;
    return parseItem(await readText(loc.file));
  }

  async createItem(input: CreateItemInput): Promise<Item> {
    const type = ItemTypeSchema.parse(input.type);
    const board = await this.getBoard();
    if (input.status !== undefined) assertFieldAgainstBoard(board, "status", input.status);
    if (input.area !== undefined) assertFieldAgainstBoard(board, "area", input.area);
    if (input.priority !== undefined) assertFieldAgainstBoard(board, "priority", input.priority);
    if (input.due !== undefined) assertDueDate(input.due);
    for (const target of [...(input.links ?? []), ...(input.blocks ?? [])]) {
      if (!(await this.getItem(target))) {
        throw new Error(`No item with id "${target}" to link to`);
      }
    }
    const format = await this.detectFormat();
    if (format === 2 && type !== "ticket") {
      throw new Error(
        `This board stores ${type === "plan" ? "plans" : "research"} inside ticket folders, ` +
          `not as standalone items. Create a ticket, then write the document with ` +
          `set_ticket_doc(doc: "${type}").`,
      );
    }

    // A ticket cannot be born in the final stage: proof.md is required there
    // and the ticket's folder does not exist yet, so there is nothing that
    // could satisfy it. Each guard is load-bearing — v1 boards have no doc
    // folders, a default create lands in statuses[0], and on a one-stage
    // board first === last so every create would otherwise fail.
    const last = lastStageId(board);
    if (
      format === 2 &&
      type === "ticket" &&
      input.status !== undefined &&
      board.statuses.length > 1 &&
      input.status === last
    ) {
      throw new Error(
        `Cannot create "${input.title}" directly in "${input.status}": that is the board's final ` +
          `stage, which requires proof.md. Create it in an earlier stage, write the evidence with ` +
          `set_ticket_doc(doc: "proof"), then move it.`,
      );
    }

    const area = input.area ?? "";
    const areaEntry = board.areas.find((a) => a.id === area);
    const prefix =
      format === 2
        ? areaEntry
          ? areaPrefix(areaEntry)
          : board.idPrefixes.ticket
        : board.idPrefixes[type];

    // The item file itself is the allocation lock: compute a candidate id,
    // try to create the file exclusively, and on EEXIST (someone else claimed
    // it between our read and our write) recompute one number higher.
    let lastTried = 0;
    for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
      const n =
        format === 2
          ? await nextPrefixNumber(this.paths, prefix, lastTried)
          : await nextIdNumber(this.paths, type, prefix, lastTried);
      const id = formatId(prefix, n);
      const now = nowIso();
      const item: Item = {
        id,
        type,
        title: input.title,
        status: input.status ?? board.statuses[0]?.id ?? "",
        area,
        priority: input.priority ?? defaultPriority(board),
        assignee: input.assignee ?? "",
        labels: input.labels ?? [],
        links: input.links ?? [],
        archived: false,
        created: now,
        updated: now,
        body: input.body ?? "",
      };
      if (input.due !== undefined && input.due !== "") item.due = input.due;
      if (input.blocks !== undefined && input.blocks.length > 0) item.blocks = input.blocks;
      const file =
        format === 2
          ? ticketFileIn(this.paths, area, id)
          : itemFile(this.paths, type, id);
      try {
        await writeFileExclusive(file, serialiseItem(item));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EEXIST") {
          lastTried = n;
          continue;
        }
        throw err;
      }
      if (format === 2) await recordAllocatedPrefix(this.paths, prefix, n);
      else await recordAllocatedId(this.paths, type, n);
      await appendActivity(this.paths, [this.activity(id, "create", { to: item.status })]);
      return item;
    }
    throw new Error(`Could not allocate a unique ${type} id after ${CREATE_ATTEMPTS} attempts`);
  }

  async updateItem(id: string, patch: UpdateItemPatch): Promise<Item> {
    const { expectedUpdated, ...fields } = patch;
    let board: BoardConfig | null = null;
    if (fields.status !== undefined || fields.area !== undefined || fields.priority !== undefined) {
      board = await this.getBoard();
      if (fields.status !== undefined) assertFieldAgainstBoard(board, "status", fields.status);
      if (fields.area !== undefined) assertFieldAgainstBoard(board, "area", fields.area);
      if (fields.priority !== undefined)
        assertFieldAgainstBoard(board, "priority", fields.priority);
    }
    if (fields.due !== undefined && fields.due !== "") assertDueDate(fields.due);
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    const current = parseItem(await readText(loc.file));
    if (expectedUpdated !== undefined && current.updated !== expectedUpdated) {
      const { body: _body, ...frontmatter } = current;
      throw new Error(
        `Conflict: "${id}" changed since you read it (updated is now ${current.updated}, ` +
          `you expected ${expectedUpdated}). Re-read the item and re-apply your change. ` +
          `Current frontmatter: ${JSON.stringify(frontmatter)}`,
      );
    }
    const pruned = pruneUndefined(fields);
    const changed = changedFields(current, pruned);
    if (changed.length === 0) {
      // No-op writes must not bump `updated` — staleness reporting and the
      // GUI watcher both key off it.
      return current;
    }
    const next: Item = {
      ...current,
      ...pruned,
      updated: nowIso(),
    };
    if (pruned.due === "") delete next.due; // "" clears the deadline
    if (next.status !== current.status && current.type === "ticket" && loc.kind === "v2") {
      board ??= await this.getBoard();
      await this.assertProofGate(loc.dir, board, id, next.status);
    }
    let file = loc.file;
    if (loc.kind === "v2") {
      // Frontmatter `area` is authoritative over folder location: an area
      // change (or a hand-moved folder being written to) moves the folder.
      // The id — and with it every [[link]] — never changes.
      const targetFolder = safeAreaFolder(next.area ?? "");
      if (targetFolder !== null && targetFolder !== loc.areaFolder) {
        const newDir = ticketDirIn(this.paths, next.area ?? "", id);
        await ensureDir(path.dirname(newDir));
        await fs.rename(loc.dir, newDir);
        file = path.join(newDir, `${id}.md`);
      }
    }
    await writeFileAtomic(file, serialiseItem(next));
    await appendActivity(
      this.paths,
      changed.map((k) =>
        this.activity(
          id,
          "update",
          k === "body"
            ? { field: "body" } // bodies are too big for a log line
            : {
                field: k,
                from: (current as Record<string, unknown>)[k],
                to: (next as Record<string, unknown>)[k],
              },
        ),
      ),
    );
    return next;
  }

  /**
   * Kanban-move convenience: move an item to a workflow stage, optionally to
   * a specific position in the column (top / bottom / after another item) —
   * that computes a fractional `order` for the item.
   */
  async moveItem(
    id: string,
    to: { status: string; expectedUpdated?: string; position?: MovePosition },
  ): Promise<Item> {
    const { position, ...patch } = to;
    if (position === undefined) return this.updateItem(id, patch);
    const order = await this.computeOrder(id, to.status, position);
    return this.updateItem(id, { ...patch, order });
  }

  /**
   * The fractional order for placing `id` at `position` within `status`.
   * Lazily materialises orders for the whole column the first time a
   * position verb is used there, and rebalances when midpoints run dry.
   */
  private async computeOrder(
    id: string,
    status: string,
    position: MovePosition,
  ): Promise<number> {
    const column = async () =>
      (await this.listItems()).filter((i) => i.status === status && i.id !== id);
    const materialise = async (items: Item[]) => {
      let n = 10;
      for (const item of items) {
        await this.updateItem(item.id, { order: n });
        n += 10;
      }
      return column();
    };
    let items = await column();
    if (items.some((i) => i.order === undefined) && items.length > 0) {
      items = await materialise(items);
    }
    if (position === "top") return items.length ? items[0].order! - 10 : 10;
    if (position === "bottom") return items.length ? items[items.length - 1].order! + 10 : 10;
    const idx = items.findIndex((i) => i.id === position.after);
    if (idx === -1) {
      throw new Error(
        `position.after "${position.after}" is not an item in stage "${status}"`,
      );
    }
    const before = items[idx].order!;
    const successor = items[idx + 1];
    const mid = successor ? (before + successor.order!) / 2 : before + 10;
    if (mid > before && (!successor || mid < successor.order!)) return mid;
    // Midpoints exhausted between these two — rebalance and recompute.
    items = await materialise(items);
    const i2 = items.findIndex((i) => i.id === position.after);
    const s2 = items[i2 + 1];
    return s2 ? (items[i2].order! + s2.order!) / 2 : items[i2].order! + 10;
  }

  /**
   * Take a ticket: record when, on which branch and (optionally) in which
   * worktree the work happens, and move it into the working stage. The agent
   * workflow calls this before touching code so the human's board shows who
   * is where.
   */
  async takeTicket(id: string, input: TakeTicketInput): Promise<Item> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    const current = parseItem(await readText(loc.file));
    if (current.type !== "ticket") {
      throw new Error(`Only tickets can be taken; "${id}" is a ${current.type}`);
    }
    if (current.taken_at && !input.force) {
      throw new Error(
        `"${id}" is already taken (taken_at ${current.taken_at}` +
          `${current.branch ? `, branch ${current.branch}` : ""}). ` +
          `Release it first, or pass force to take it over.`,
      );
    }
    const board = await this.getBoard();
    let stage = input.stage;
    if (stage !== undefined) {
      assertFieldAgainstBoard(board, "status", stage);
    } else {
      stage = board.statuses.some((s) => s.id === "implementing")
        ? "implementing"
        : current.status;
    }
    if (stage !== current.status && loc.kind === "v2") {
      await this.assertProofGate(loc.dir, board, id, stage);
    }
    const next: Item = {
      ...current,
      status: stage,
      taken_at: nowIso(),
      branch: input.branch,
      updated: nowIso(),
    };
    if (input.worktree !== undefined) next.worktree = input.worktree;
    else delete next.worktree; // a force-retake must not keep a stale worktree
    if (input.assignee !== undefined) next.assignee = input.assignee;
    await writeFileAtomic(loc.file, serialiseItem(next));
    await appendActivity(this.paths, [
      this.activity(id, "take", { field: "branch", to: input.branch }),
      ...(next.status !== current.status
        ? [this.activity(id, "update", { field: "status", from: current.status, to: next.status })]
        : []),
    ]);
    return next;
  }

  /** Release a taken ticket: clear taken_at / branch / worktree. */
  async releaseTicket(id: string): Promise<Item> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    const current = parseItem(await readText(loc.file));
    if (!current.taken_at && !current.branch && !current.worktree) return current;
    const next: Item = { ...current, updated: nowIso() };
    delete next.taken_at;
    delete next.branch;
    delete next.worktree;
    await writeFileAtomic(loc.file, serialiseItem(next));
    await appendActivity(this.paths, [
      this.activity(id, "release", { field: "branch", from: current.branch }),
    ]);
    return next;
  }

  /** Read one of a ticket's pipeline documents; null when it doesn't exist yet. */
  async getDoc(id: string, doc: TicketDoc): Promise<string | null> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    if (loc.kind !== "v2") return null;
    const file = docFileIn(loc.dir, doc);
    if (!(await pathExists(file))) return null;
    return readText(file);
  }

  /**
   * Write (or append to) one of a ticket's pipeline documents. Docs are plain
   * Markdown with no frontmatter. `append` adds after a blank line so
   * progress notes never clobber existing content.
   */
  async setDoc(
    id: string,
    doc: TicketDoc,
    content: string,
    opts: { append?: boolean } = {},
  ): Promise<void> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    if (loc.kind !== "v2") {
      throw new Error(
        `"${id}" is stored in the legacy layout, which has no ticket folders — ` +
          `migrate this board to format 2 first.`,
      );
    }
    const file = docFileIn(loc.dir, doc);
    let text = `${content.trim()}\n`;
    if (opts.append) {
      const existing = (await pathExists(file)) ? await readText(file) : "";
      if (existing.trim()) text = `${existing.trimEnd()}\n\n${content.trim()}\n`;
    }
    await writeFileAtomic(file, text);
    await appendActivity(this.paths, [
      this.activity(id, "doc", { field: doc, to: opts.append ? "append" : "write" }),
    ]);
  }

  /** Which pipeline docs exist for a ticket + checklist progress; null for legacy items. */
  async getTicketDocsInfo(id: string): Promise<TicketDocsInfo | null> {
    const loc = await this.locateItem(id);
    if (!loc || loc.kind !== "v2") return null;
    const docs = {} as Record<TicketDoc, boolean>;
    for (const doc of TICKET_DOCS) {
      docs[doc] = await pathExists(docFileIn(loc.dir, doc));
    }
    let checklist: TicketDocsInfo["checklist"] = null;
    if (docs.checklist) {
      const text = await readText(docFileIn(loc.dir, "checklist"));
      let checked = 0;
      let total = 0;
      for (const line of text.split("\n")) {
        const m = /^\s*[-*]\s+\[( |x|X)\]/.exec(line);
        if (!m) continue;
        total++;
        if (m[1] !== " ") checked++;
      }
      checklist = { checked, total };
    }
    return { docs, checklist };
  }

  /**
   * Delete an item, then rewrite the frontmatter links[] of anything that
   * pointed at it. In the v2 layout this removes the whole ticket folder —
   * docs and attachments included. Body [[wiki]] references are prose and
   * stay put — they're reported so the caller can mention the residue.
   */
  async deleteItem(id: string): Promise<DeleteItemResult> {
    const loc = await this.locateItem(id);
    if (!loc) return { deleted: false, cleanedLinks: [], bodyReferencesRemain: [] };
    if (loc.kind === "v2") {
      await fs.rm(loc.dir, { recursive: true, force: true });
    } else {
      await removeFile(loc.file);
    }
    await appendActivity(this.paths, [this.activity(id, "delete")]);
    const remaining = (await this.listItemsWithWarnings({ includeArchived: true })).items;
    const cleanedLinks: string[] = [];
    const bodyReferencesRemain: string[] = [];
    for (const item of remaining) {
      const patch: UpdateItemPatch = {};
      if ((item.links ?? []).includes(id)) {
        patch.links = (item.links ?? []).filter((l) => l !== id);
      }
      if ((item.blocks ?? []).includes(id)) {
        patch.blocks = (item.blocks ?? []).filter((l) => l !== id);
      }
      if (Object.keys(patch).length > 0) {
        await this.updateItem(item.id, patch);
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

  /** The proof gate: a ticket may only reach the final stage with proof.md written. */
  private async assertProofGate(
    ticketDir: string,
    board: BoardConfig,
    id: string,
    nextStatus: string,
  ): Promise<void> {
    if (nextStatus !== lastStageId(board)) return;
    if (!(await pathExists(docFileIn(ticketDir, "proof")))) {
      throw new Error(
        `${id} cannot move to "${nextStatus}": proof.md is missing. ` +
          `Write the evidence first with set_ticket_doc(doc: "proof").`,
      );
    }
  }

  /**
   * Refuse a board write that would make a stage final while proofless
   * tickets sit in it. Rejecting (rather than grandfathering) matches
   * removeColumn's in-use refusal and keeps "the LAST stage is proof-gated"
   * literally true. Archived tickets are off the board and are not gated.
   */
  private async assertFinalStageProven(stageId: string): Promise<void> {
    const occupants = await this.listItems({ status: stageId }); // non-archived only
    const offenders: string[] = [];
    for (const item of occupants) {
      if (item.type !== "ticket") continue;
      const loc = await this.locateItem(item.id);
      if (!loc || loc.kind !== "v2") continue; // legacy layout has no doc folder to gate on
      if (!(await pathExists(docFileIn(loc.dir, "proof")))) offenders.push(item.id);
    }
    if (offenders.length === 0) return;
    throw new Error(
      `Cannot make "${stageId}" the final stage: ${offenders.length} ticket(s) there have no ` +
        `proof.md (${offenders.slice(0, 5).join(", ")}${offenders.length > 5 ? ", …" : ""}). ` +
        `Write the evidence with set_ticket_doc(doc: "proof"), or move them out of that stage first.`,
    );
  }
}

/** areaFolderName, but null instead of throwing (for read-side comparisons). */
function safeAreaFolder(area: string | undefined): string | null {
  try {
    return areaFolderName(area ?? "");
  } catch {
    return null;
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

/** Reject a malformed date-only deadline. */
function assertDueDate(due: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    throw new Error(`Invalid due date "${due}" — use YYYY-MM-DD`);
  }
}

/** The fields of `pruned` whose application would actually change the file. */
function changedFields(current: Item, pruned: Partial<UpdateItemPatch>): string[] {
  const changed: string[] = [];
  for (const [key, value] of Object.entries(pruned)) {
    const existing = (current as Record<string, unknown>)[key];
    if (key === "body") {
      // serialiseItem writes body.trim(), so compare what would be stored.
      if (String(value).trim() !== String(existing ?? "").trim()) changed.push(key);
    } else if (key === "due" && value === "") {
      if (existing !== undefined) changed.push(key); // "" clears an existing due
    } else if (JSON.stringify(value) !== JSON.stringify(existing)) {
      changed.push(key);
    }
  }
  return changed;
}

function matchesFilter(item: Item, filter: ItemFilter): boolean {
  if (!filter.includeArchived && item.archived) return false;
  if (filter.type && item.type !== filter.type) return false;
  if (filter.status && item.status !== filter.status) return false;
  if (filter.area && item.area !== filter.area) return false;
  if (filter.label && !(item.labels ?? []).includes(filter.label)) return false;
  if (filter.dueBefore && !(item.due !== undefined && item.due < filter.dueBefore)) return false;
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

/** Manual order first (unordered items sort last), id as the tiebreak. */
function byOrderThenId(a: Item, b: Item): number {
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao < bo ? -1 : 1;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

function pruneUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
