import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  pathExists,
  removeFile,
  contentVersion,
  readText,
  statOrNull,
  writeFileAtomic,
  writeFileExclusive,
  withExclusiveFileLock,
} from "./io.js";
import {
  areaDir,
  areaFolderName,
  assertSafeRepoPath,
  itemFile,
  resolvePaths,
  ticketDirIn,
  ticketFileIn,
  typeDir,
  type KanmerPaths,
} from "./paths.js";
import { assertNotBoardWorktree } from "./worktree-guard.js";
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
  resolveGroupKinds,
  readBoard,
  readBoardWithSource,
  resolveEnvironments,
  resolveProfiles,
  resolveProofTypes,
  writeBoard,
} from "./board.js";
import { FIRST_STAGE, STAGE_IDS, isStageId, stageIndex } from "./stages.js";
import {
  GOVERNING_DOC,
  QUESTIONS_RESOLVED,
  resolveProfileId,
  validateProfileMap,
  type ProfileMap,
} from "./profiles.js";
import {
  collapsesPipeline,
  evaluateGateReport as evaluateProfileGates,
  firstBlocking,
  type GateReport,
} from "./gates.js";
import {
  countCheckboxes,
  documentInventory,
  docDirIn,
  docPathIn,
  listDocs,
  listFilesRecursive,
  listReferences,
  namedSatisfied,
  typeSatisfied,
} from "./docpaths.js";
import {
  deriveMembers,
  groupDocPath,
  listGroups,
  maxGroupNumberForPrefix,
  readGroup,
  serialiseGroup,
  writeGroup,
  type Group,
  type GroupWithMembers,
} from "./groups.js";
import { parseWikiLinks } from "./links.js";
import { appendActivity, readActivity, type ActivityEntry } from "./activity.js";
import { CURRENT_FORMAT, readVersion, writeVersion } from "./version.js";
import {
  allocateProjectRecord,
  computeRevision,
  readProjectRecord,
  type ProjectRecord,
} from "./project.js";
import { repoDocKindOf } from "./docs.js";
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
  type MovePosition,
  type OpenQuestionCount,
  type SetDocOptions,
  type InitOptions,
  type TicketRevision,
  type TakeTicketInput,
  type TicketDoc,
  type TicketDocumentWithVersion,
  type TicketDocsInfo,
  type TransferTicketInput,
  type RenewTicketInput,
  type UpdateItemPatch,
  LEASE_PHASES,
  isLegacyLease,
  isOperatorReason,
  leaseConfig,
  leaseState,
} from "./types.js";
import { randomUUID } from "node:crypto";
import { normalizeWorktreePath } from "./worktree-guard.js";
import { parseReviewAttestation } from "./review-attestation.js";

const ITEM_TYPES: ItemType[] = ["ticket", "plan", "research"];

/** Bound on exclusive-create retries; ~2× the worst realistic contention. */
const CREATE_ATTEMPTS = 20;

function referencePath(dir: string, name: string): string {
  const candidate = name.trim();
  if (!candidate || candidate === "." || candidate === "..") throw new Error(`Invalid reference name "${candidate}"`);
  // Validate the caller's spelling before canonicalisation.  A path such as
  // `foo/../mockup.png` resolves inside reference/ but is still a nested path,
  // which the reference-file contract explicitly forbids.
  if (path.basename(candidate) !== candidate) {
    throw new Error(`Reference name "${name}" is outside reference/; it must be a plain filename`);
  }
  const resolved = path.resolve(dir, candidate);
  const root = path.resolve(dir);
  if (resolved !== path.join(root, path.basename(resolved)) || !resolved.startsWith(root + path.sep)) {
    throw new Error(`Reference name "${name}" is outside reference/; it must be a plain filename`);
  }
  return resolved;
}

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
  private formatCache: { format: 1 | 2 | 3; stamp: string } | null = null;
  private actor = "gui";

  /**
   * `repoRoot` is the source checkout governing-doc `refs` resolve against.
   * Pass it whenever the caller knows both roots (the GUI does); omitted, it
   * is derived from a `.worktrees/<name>` board path and otherwise equals
   * `projectRoot`.
   */
  constructor(projectRoot: string, opts: { actor?: string; repoRoot?: string } = {}) {
    this.paths = resolvePaths(projectRoot, opts.repoRoot);
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
  async detectFormat(): Promise<1 | 2 | 3> {
    // version.json is authoritative. Cache it, but re-stat first: a second
    // process (the GUI) can migrate the board underneath a long-lived MCP
    // server, and the GUI's resetFormatCache() cannot reach that server's
    // instance. A stale `1` there re-issues an id that is already live.
    const st = await statOrNull(this.paths.versionFile);
    if (st === null) {
      // Half-migrated / v1 / fresh: never cache. The answer can change under
      // us, and the derivation is two cheap syscalls anyway.
      this.formatCache = null;
      if (await pathExists(this.paths.tickets)) return 1;
      // No version file and no legacy folders: a fresh board, written current.
      return (await pathExists(this.paths.areasRoot)) ? 2 : CURRENT_FORMAT;
    }
    const stamp = `${st.mtimeMs}:${st.size}`;
    if (this.formatCache && this.formatCache.stamp === stamp) return this.formatCache.format;
    const version = await readVersion(this.paths);
    const n = version?.format ?? 1;
    const format: 1 | 2 | 3 = n >= 3 ? 3 : n === 2 ? 2 : 1;
    this.formatCache = { format, stamp };
    return format;
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
  async init(opts: InitOptions = {}): Promise<void> {
    const format = await this.detectFormat();
    // Identity origin is decided BEFORE the skeleton exists: a board that
    // already has files is a legacy board receiving its one-time migration,
    // a fresh one is born with its identity (FRD-029 edge case).
    const preExisting =
      (await pathExists(this.paths.boardFile)) ||
      (await pathExists(this.paths.versionFile)) ||
      (await pathExists(this.paths.areasRoot)) ||
      (await pathExists(this.paths.tickets));
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
    await this.ensureProject({
      origin: preExisting ? "migrated" : "generated",
      fallbackFingerprint: opts.fallbackFingerprint,
    });
  }

  /** The board's logical identity record, or null before it has been allocated. */
  async getProject(): Promise<ProjectRecord | null> {
    return readProjectRecord(this.paths);
  }

  /**
   * Allocate the logical identity exactly once (FRD-029). Idempotent: an
   * existing record is returned untouched. A fresh allocation is written to
   * the activity log so a migrated board's identity is auditable — the entry
   * names the origin and, when known, the machine-local fingerprint the board
   * was previously addressed by.
   */
  async ensureProject(
    opts: { origin: ProjectRecord["origin"]; fallbackFingerprint?: string },
  ): Promise<{ record: ProjectRecord; allocated: boolean }> {
    const format = await this.detectFormat();
    await ensureDir(this.paths.kanmer);
    const result = await allocateProjectRecord(this.paths, {
      origin: opts.origin,
      format,
      fallbackFingerprint: opts.fallbackFingerprint,
    });
    if (result.allocated) {
      await appendActivity(this.paths, [
        this.activity("board", "update", {
          field: "project_id",
          from: opts.fallbackFingerprint ?? null,
          to: `${result.record.project_id} (${result.record.origin})`,
        }),
      ]);
    }
    return result;
  }

  /**
   * The document-inclusive revision of a ticket (FRD-029): changes whenever
   * the ticket file or any pipeline document (plan, proof, review record…)
   * changes; null for legacy-layout items which have no document folder.
   */
  async getRevision(id: string): Promise<TicketRevision | null> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    return this.revisionAt(loc);
  }

  private async revisionAt(loc: ItemLocation): Promise<TicketRevision | null> {
    const text = await readText(loc.file);
    const item = parseItem(text);
    if (loc.kind !== "v2") return null;
    const { documentPaths } = await documentInventory(loc.dir);
    const documents = await Promise.all(
      documentPaths.map(async (doc) => ({
        path: doc,
        version: contentVersion(await readText(docPathIn(loc.dir, doc))),
      })),
    );
    return { revision: computeRevision(text, documents), updated: item.updated, documents: documents.length };
  }

  /**
   * The revision CAS shared by every ticket mutation. Runs after validation
   * and before the first byte is written, alongside the `expectedUpdated`
   * check. The `Conflict:` prefix is the classified REVISION_CONFLICT wording.
   */
  private async assertRevision(loc: ItemLocation, id: string, expectedRevision?: string): Promise<void> {
    if (expectedRevision === undefined) return;
    const current = await this.revisionAt(loc);
    if (!current) {
      throw new Error(
        `Conflict: "${id}" is stored in the legacy layout and has no revision; ` +
          `omit expected_revision or migrate the board.`,
      );
    }
    if (current.revision !== expectedRevision) {
      throw new Error(
        `Conflict: "${id}" revision changed since you read it (revision is now ${current.revision}, ` +
          `you expected ${expectedRevision}). Re-read the item and re-apply your change.`,
      );
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
    await withExclusiveFileLock(`${this.paths.boardFile}.lock`, async () => {
      const previous = await this.getBoard(); // re-reads disk = the true prior state
      // A whole-board write must not strand items on a removed column — the same
      // protection removeColumn has, so no GUI/agent setBoard path can silently
      // drop a stage/area/priority that items still reference (audit A3).
      await this.assertNoStrandedColumns(previous, board);
      await writeBoard(this.paths, board);
    });
  }

  /** Read, mutate, and write the board while holding the cross-process board lock. */
  async updateBoard(mutator: (board: BoardConfig) => BoardConfig | Promise<BoardConfig>): Promise<BoardConfig> {
    return withExclusiveFileLock(`${this.paths.boardFile}.lock`, async () => {
      const previous = await this.getBoard();
      const next = await mutator(structuredClone(previous));
      await this.assertNoStrandedColumns(previous, next);
      await writeBoard(this.paths, next);
      return next;
    });
  }

  /** Reject a board write that removes a column still referenced by an item. */
  private async assertNoStrandedColumns(
    previous: BoardConfig,
    next: BoardConfig,
  ): Promise<void> {
    const removed = (prev: BoardColumn[], cur: BoardColumn[]) =>
      prev.filter((c) => !cur.some((n) => n.id === c.id)).map((c) => c.id);
    // Areas are the only column kind left: stages are constants (ADR-0002) and
    // priority is gone (ADR-0006), so neither can be stranded by a board edit.
    const dims: [ColumnKind, keyof Item, BoardColumn[], BoardColumn[]][] = [
      ["area", "area", previous.areas, next.areas],
    ];
    const gone = dims.flatMap(([kind, field, prev, cur]) =>
      removed(prev, cur).map((id) => ({ kind, field, id })),
    );
    if (gone.length === 0) return;
    const all = await this.listItems({ includeArchived: true });
    for (const { kind, field, id } of gone) {
      const users = all.filter((i) => (i as Record<string, unknown>)[field] === id);
      if (users.length > 0) {
        const sample = users.slice(0, 5).map((i) => i.id).join(", ");
        throw new Error(
          `Cannot remove ${kind} "${id}": ${users.length} item(s) still use it ` +
            `(${sample}${users.length > 5 ? ", …" : ""}). Move them to another ${kind} first.`,
        );
      }
    }
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
    const field = "area";
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

    const filtered = items.filter((item) => matchesFilter(item, filter));
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
    if (input.status !== undefined) assertStage(input.status);
    if (input.area !== undefined) assertFieldAgainstBoard(board, "area", input.area);
    if (input.profile !== undefined) assertProfileAgainstBoard(board, input.profile, input.requires);
    if (input.groups !== undefined) await this.assertGroups(input.groups);
    if (input.refs !== undefined) await this.assertRefs(input.refs);
    if (input.deployment !== undefined) assertDeploymentAgainstBoard(board, input.deployment);
    for (const target of [...(input.links ?? []), ...(input.blocks ?? [])]) {
      if (!(await this.getItem(target))) {
        throw new Error(`No item with id "${target}" to link to`);
      }
    }
    const format = await this.detectFormat();
    if (format >= 2 && type !== "ticket") {
      throw new Error(
        `This board stores ${type === "plan" ? "plans" : "research"} inside ticket folders, ` +
          `not as standalone items. Create a ticket, then write the document with ` +
          `set_ticket_doc(doc: "${type}").`,
      );
    }

    // Creation is deliberately ungated (D6): gates fire on transitions only, so
    // imports and backfills of already-finished work can be created directly in
    // any stage — including the final one — without the folder's docs existing
    // yet. Moving a ticket still enforces every gate.

    const area = input.area ?? "";
    const areaEntry = board.areas.find((a) => a.id === area);
    const prefix =
      format >= 2
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
        format >= 2
          ? await nextPrefixNumber(this.paths, prefix, lastTried)
          : await nextIdNumber(this.paths, type, prefix, lastTried);
      const id = formatId(prefix, n);
      // Never hand back an id that already resolves somewhere on disk.
      // Exclusive create only locks one path, so it cannot see the same id
      // living in the other layout or another area folder — which is how a
      // stale format cache re-issued a live TICK-001. Also hardens the
      // pre-existing TICK-fallback race (AGENTS.md §11).
      if (await this.locateItem(id)) {
        lastTried = n;
        continue;
      }
      const now = nowIso();
      const item: Item = {
        id,
        type,
        title: input.title,
        status: input.status ?? FIRST_STAGE,
        area,
        assignee: input.assignee ?? "",
        labels: input.labels ?? [],
        links: input.links ?? [],
        archived: false,
        created: now,
        updated: now,
        body: input.body ?? "",
      };
      if (input.profile !== undefined) item.profile = input.profile;
      if (input.requires !== undefined) item.requires = input.requires;
      if (input.groups !== undefined && input.groups.length > 0) item.groups = input.groups;
      if (input.blocks !== undefined && input.blocks.length > 0) item.blocks = input.blocks;
      if (input.refs !== undefined && input.refs.length > 0) item.refs = input.refs;
      if (input.docs_todo === true) item.docs_todo = true;
      if (input.commits !== undefined && input.commits.length > 0) item.commits = input.commits;
      if (input.prs !== undefined && input.prs.length > 0) item.prs = input.prs;
      if (input.deployment !== undefined && input.deployment !== "") item.deployment = input.deployment;
      const file =
        format >= 2
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
      if (format >= 2) await recordAllocatedPrefix(this.paths, prefix, n);
      else await recordAllocatedId(this.paths, type, n);
      await appendActivity(this.paths, [this.activity(id, "create", { to: item.status })]);
      return item;
    }
    throw new Error(`Could not allocate a unique ${type} id after ${CREATE_ATTEMPTS} attempts`);
  }

  async updateItem(id: string, patch: UpdateItemPatch): Promise<Item> {
    const { expectedUpdated, expectedRevision, reason, ...fields } = patch;
    let board: BoardConfig | null = null;
    if (
      fields.status !== undefined ||
      fields.area !== undefined ||
      fields.profile !== undefined ||
      fields.groups !== undefined ||
      fields.deployment !== undefined
    ) {
      board = await this.getBoard();
      if (fields.status !== undefined) assertStage(fields.status);
      if (fields.area !== undefined) assertFieldAgainstBoard(board, "area", fields.area);
      if (fields.profile !== undefined)
        assertProfileAgainstBoard(board, fields.profile, fields.requires);
      if (fields.groups !== undefined) await this.assertGroups(fields.groups);
      if (fields.deployment !== undefined && fields.deployment !== "")
        assertDeploymentAgainstBoard(board, fields.deployment);
    }
    if (fields.refs !== undefined) await this.assertRefs(fields.refs);
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    const current = parseItem(await readText(loc.file));
    if (expectedUpdated !== undefined && current.updated !== expectedUpdated) {
      throw this.conflictError(id, current, expectedUpdated);
    }
    await this.assertRevision(loc, id, expectedRevision);
    // A backward move is legal only with a reason, and Review → Implementing
    // only against a needs-changes attestation or an operator override
    // (CORE-121). Raised before any write, like the gate below.
    const backward =
      fields.status !== undefined && fields.status !== current.status
        ? await this.backwardMoveEffects(loc, current, fields.status, reason)
        : null;
    const { reason: backwardReason, ...backwardEffects } = backward ?? { reason: undefined };
    const pruned = pruneUndefined({ ...fields, ...backwardEffects });
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
    if (pruned.deployment === "") delete next.deployment; // "" clears deployment
    if (next.docs_todo === false) delete next.docs_todo;
    if (next.refs && next.refs.length === 0) delete next.refs;
    if (next.commits && next.commits.length === 0) delete next.commits;
    if (next.prs && next.prs.length === 0) delete next.prs;
    if (next.status !== current.status && current.type === "ticket" && loc.kind === "v2") {
      board ??= await this.getBoard();
      await this.assertDocGate(loc.dir, board, next, current.status, next.status);
    }
    if (next.status !== current.status) {
      // Stamped after the gate, so a refused move records nothing. First entry
      // only: a ticket sent back to Review and returning keeps the original,
      // which is what "when did this reach Review" should mean.
      const entered = { ...(current.stageEntered ?? {}) };
      if (!entered[next.status]) {
        entered[next.status] = next.updated;
        next.stageEntered = entered;
      }
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
    if (backward) {
      await appendActivity(this.paths, [
        this.activity(id, "update", { field: "status-reason", from: current.status, to: backwardReason }),
      ]);
      if (loc.kind === "v2") {
        await this.appendTransition(
          id,
          `stage ${current.status} → ${next.status} by ${this.actor}; reason: ${backwardReason!.trim()}` +
            (backward.review_round !== undefined ? `; review_round ${backward.review_round}` : "") +
            (backward.remediation_budget !== undefined ? `; remediation_budget ${backward.remediation_budget}` : ""),
        );
      }
    }
    return next;
  }

  /**
   * Kanban-move convenience: move an item to a workflow stage, optionally to
   * a specific position in the column (top / bottom / after another item) —
   * that computes a fractional `order` for the item.
   */
  async moveItem(
    id: string,
    to: {
      status: string;
      expectedUpdated?: string;
      expectedRevision?: string;
      position?: MovePosition;
      reason?: string;
    },
  ): Promise<Item> {
    const { position, ...patch } = to;
    if (position === undefined) return this.updateItem(id, patch);
    // Every rejection this move can suffer must be raised BEFORE computeOrder,
    // because computeOrder materialises `order` on the whole target column as
    // a side effect. Without this, a move that is then refused still rewrote
    // (and re-stamped `updated` on) every sibling and logged the activity.
    await this.assertMoveAllowed(id, to.status, to.expectedUpdated, to.reason, to.expectedRevision);
    const order = await this.computeOrder(id, to.status, position);
    return this.updateItem(id, { ...patch, order });
  }

  /**
   * The CORE-121 backward-move rule. Returns the frontmatter effects of a legal
   * backward move (`review_round`, and `remediation_budget` on an operator
   * override), `null` when the move is not backward, and throws a stable-coded
   * error when it is refused. Forward moves are untouched: their gates live in
   * `assertDocGate`, and `gates.ts` deliberately treats backward moves as
   * crossing nothing.
   */
  private async backwardMoveEffects(
    loc: ItemLocation,
    current: Item,
    to: string,
    reason: string | undefined,
  ): Promise<(Pick<Item, "review_round" | "remediation_budget"> & { reason: string }) | null> {
    if (current.type !== "ticket") return null;
    if (!isStageId(to) || !isStageId(current.status)) return null;
    if (stageIndex(to) >= stageIndex(current.status)) return null;
    const from = current.status;
    // The GUI's store actor is the human at the board: a drag backwards is an
    // operator decision by construction, so it carries an implicit operator
    // reason. Every other actor (MCP clients name themselves) must say why.
    if ((!reason || !reason.trim()) && this.actor === "gui") reason = "operator: moved on the board";
    if (!reason || !reason.trim()) {
      throw new Error(
        `BACKWARD_MOVE_NEEDS_REASON: "${current.id}" cannot move ${from} → ${to} without a reason. ` +
          `Pass reason (for Review → Implementing, a needs-changes attestation in scratch/review.md is also required, ` +
          `or a reason beginning "operator:").`,
      );
    }
    if (from !== "review" || to !== "implementing") return { reason };
    const round = current.review_round ?? 0;
    const budget = current.remediation_budget ?? 1;
    if (isOperatorReason(reason)) {
      return {
        reason,
        review_round: round + 1,
        ...(round >= budget ? { remediation_budget: round + 1 } : {}),
      };
    }
    const attestation = parseReviewAttestation(
      loc.kind === "v2" ? await this.getDoc(current.id, "scratch/review") : null,
    );
    const prs = current.prs ?? [];
    const bound =
      attestation.state === "valid" &&
      attestation.verdict === "needs-changes" &&
      prs.some((pr) => pr === attestation.pr || pr.endsWith(`/${attestation.pr}`));
    if (!bound) {
      const why =
        attestation.state === "absent"
          ? "no scratch/review.md attestation exists"
          : attestation.state === "invalid"
            ? `scratch/review.md is not a valid attestation (${attestation.reason})`
            : attestation.verdict !== "needs-changes"
              ? `the attestation verdict is "${attestation.verdict}", not "needs-changes"`
              : `the attestation names PR ${attestation.pr}, which is not in this ticket's prs`;
      throw new Error(
        `REVIEW_RETURN_NEEDS_ATTESTATION: "${current.id}" cannot return review → implementing: ${why}. ` +
          `Only a needs-changes review attestation for this ticket's PR, or a reason beginning "operator:", authorises the return.`,
      );
    }
    if (round >= budget) {
      throw new Error(
        `REMEDIATION_BUDGET_EXHAUSTED: "${current.id}" has already returned to implementing ${round} time(s) ` +
          `against a budget of ${budget}. An operator must re-open it with a reason beginning "operator:".`,
      );
    }
    return { reason, review_round: round + 1 };
  }

  /** Append one committed, human-readable transition line to the ticket's execution scratch. */
  private async appendTransition(id: string, line: string): Promise<void> {
    const existing = await this.getDoc(id, "scratch/execution");
    const entry = `- ${nowIso()} ${line}`;
    const content = existing && existing.includes("## Transitions") ? entry : `## Transitions\n\n${entry}`;
    await this.setDoc(id, "scratch/execution", content, { append: true });
  }

  private claimExpiry(minutes: number): string {
    return new Date(Date.now() + minutes * 60_000).toISOString();
  }

  /**
   * Every rejection moveItem can suffer, run before computeOrder writes
   * anything: the item must exist, `expectedUpdated` must be fresh, the
   * target stage must be on the board, and the proof gate must allow it.
   * The final updateItem re-checks — that is cheap and closes the window
   * between the two reads.
   */
  private async assertMoveAllowed(
    id: string,
    status: string,
    expectedUpdated?: string,
    reason?: string,
    expectedRevision?: string,
  ): Promise<void> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    const current = parseItem(await readText(loc.file));
    if (expectedUpdated !== undefined && current.updated !== expectedUpdated) {
      throw this.conflictError(id, current, expectedUpdated);
    }
    await this.assertRevision(loc, id, expectedRevision);
    const board = await this.getBoard();
    assertStage(status);
    if (status !== current.status) await this.backwardMoveEffects(loc, current, status, reason);
    if (status !== current.status && current.type === "ticket" && loc.kind === "v2") {
      await this.assertDocGate(loc.dir, board, current, current.status, status);
    }
  }

  /**
   * The shared stale-read rejection. The wording is matched on by tests and
   * by smoke.mjs (/Conflict/) — do not change it.
   *
   * Typed structurally rather than to `Item` so groups share it too: everything
   * it needs is `updated`, plus `body` to drop from the reported frontmatter.
   */
  private conflictError(
    id: string,
    current: { updated: string; body?: string },
    expectedUpdated: string,
  ): Error {
    const { body: _body, ...frontmatter } = current;
    return new Error(
      `Conflict: "${id}" changed since you read it (updated is now ${current.updated}, ` +
        `you expected ${expectedUpdated}). Re-read the item and re-apply your change. ` +
        `Current frontmatter: ${JSON.stringify(frontmatter)}`,
    );
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

  // ---------------------------------------------------------------------------
  // Renewable workspace leases (CORE-115, FRD-030)
  //
  // Every lease verb runs under one board-wide cross-process lock and re-reads
  // the ticket inside it, so the revision CAS and the write are one step
  // (CORE-114 F-009). The lock also covers the sibling scan that keeps one
  // live writer per workspace.
  // ---------------------------------------------------------------------------

  /** The lease lock file; gitignored on the board branch like every `.kanmer/**\/*.lock`. */
  private leaseLockFile(): string {
    return path.join(this.paths.kanmer, "leases.lock");
  }

  private withLeaseLock<T>(work: () => Promise<T>): Promise<T> {
    return withExclusiveFileLock(this.leaseLockFile(), work);
  }

  /** The normalised workspace identity a lease owns: the worktree when recorded, else the branch. */
  private workspaceKey(worktree: string | undefined, branch: string | undefined): string | undefined {
    if (worktree) return `worktree:${normalizeWorktreePath(worktree, this.paths.repoRoot)}`;
    if (branch) return `branch:${branch}`;
    return undefined;
  }

  /**
   * One live writer per workspace (FRD-030): refuse a take whose worktree or
   * branch is recorded on another taken, non-archived ticket. A lease that has
   * expired but was never released still owns its workspace — "a final claim
   * remains until closeout" — so the check does not consult expiry. `force`
   * never bypasses this rule; batch membership (CORE-124) is the only planned
   * exception.
   */
  private async assertWorkspaceFree(id: string, worktree: string | undefined, branch: string | undefined): Promise<void> {
    const mine = worktree ? normalizeWorktreePath(worktree, this.paths.repoRoot) : null;
    for (const other of await this.listItems({ type: "ticket" })) {
      if (other.id === id || !other.taken_at) continue;
      const sameWorktree = mine !== null && other.worktree !== undefined &&
        normalizeWorktreePath(other.worktree, this.paths.repoRoot) === mine;
      const sameBranch = branch !== undefined && other.branch === branch;
      if (!sameWorktree && !sameBranch) continue;
      const holder = other.claim_controller ?? other.assignee ?? "an unknown actor";
      throw new Error(
        `WORKSPACE_OCCUPIED: "${id}" cannot take ${sameWorktree ? `worktree ${worktree}` : `branch ${branch}`}; ` +
          `it is recorded on "${other.id}" (held by ${holder}${other.lease_id ? `, lease ${other.lease_id}` : ""}). ` +
          `One live writer owns a workspace: use an isolated worktree and branch, or close out "${other.id}" first.`,
      );
    }
  }

  private static clearLeaseFields(next: Item): void {
    delete next.lease_id;
    delete next.lease_revision;
    delete next.lease_controller_run;
    delete next.lease_worker_run;
    delete next.lease_workspace;
    delete next.lease_provider;
    delete next.lease_phase;
    delete next.lease_heartbeat_at;
    delete next.lease_reclaimed_from;
  }

  private static applyRunIdentity(
    next: Item,
    input: { controllerRun?: string; workerRun?: string; provider?: string },
    keepExisting: boolean,
  ): void {
    const set = (key: "lease_controller_run" | "lease_worker_run" | "lease_provider", value: string | undefined) => {
      if (value !== undefined && value !== "") next[key] = value;
      else if (!keepExisting) delete next[key];
    };
    set("lease_controller_run", input.controllerRun);
    set("lease_worker_run", input.workerRun);
    set("lease_provider", input.provider);
  }

  /**
   * Take a ticket: acquire its workspace lease — record when, on which branch
   * and (optionally) in which worktree the work happens, mint the lease record
   * and move the ticket into the working stage. The agent workflow calls this
   * before touching code so the human's board shows who is where.
   */
  async takeTicket(id: string, input: TakeTicketInput): Promise<Item> {
    if (input.worktree !== undefined) {
      assertNotBoardWorktree(input.worktree, {
        boardRoot: this.paths.projectRoot,
        repoRoot: this.paths.repoRoot,
      });
    }
    if (input.phase !== undefined && !LEASE_PHASES.includes(input.phase)) {
      throw new Error(`LEASE_PHASE_INVALID: "${input.phase}" is not one of ${LEASE_PHASES.join(", ")}.`);
    }
    return this.withLeaseLock(async () => {
      const loc = await this.locateItem(id);
      if (!loc) throw new Error(`No item with id "${id}"`);
      const current = parseItem(await readText(loc.file));
      if (current.type !== "ticket") {
        throw new Error(`Only tickets can be taken; "${id}" is a ${current.type}`);
      }
      await this.assertRevision(loc, id, input.expectedRevision);
      const board = await this.getBoard();
      const timing = leaseConfig(board);
      if (current.taken_at && !input.force) {
        const lease = leaseState(current, new Date(), timing);
        const holder = current.claim_controller ?? current.assignee;
        throw new Error(
          `LEASE_LIVE: "${id}" is already taken (taken_at ${current.taken_at}` +
            `${current.branch ? `, branch ${current.branch}` : ""}` +
            `${holder ? `, held by ${holder}` : ""}, lease ${current.lease_id ?? "legacy"} ${lease.state}` +
            `${lease.expiresAt ? ` until ${lease.expiresAt}` : ""}). ` +
            (lease.state === "expired"
              ? `An expired lease is reclaimed with take_ticket action "transfer", never retaken.`
              : `A live lease is never taken over: wait for expiry or ask the owner to release.`),
        );
      }
      await this.assertWorkspaceFree(id, input.worktree, input.branch);
      let stage = input.stage;
      if (stage !== undefined) {
        assertStage(stage);
      } else {
        stage = "implementing";
      }
      if (stage !== current.status && loc.kind === "v2") {
        await this.assertDocGate(loc.dir, board, current, current.status, stage);
      }
      const now = nowIso();
      const next: Item = {
        ...current,
        status: stage,
        taken_at: now,
        branch: input.branch,
        updated: now,
      };
      if (input.worktree !== undefined) next.worktree = input.worktree;
      else delete next.worktree; // a force-retake must not keep a stale worktree
      if (input.assignee !== undefined) next.assignee = input.assignee;
      // Lease record (FRD-030): every fresh acquisition carries an expiry, a
      // durable controller identity, a lease id/revision and its workspace.
      next.claim_expires_at = this.claimExpiry(timing.expiryMinutes);
      const controller = input.controller ?? input.assignee ?? next.assignee;
      if (controller) next.claim_controller = controller;
      else delete next.claim_controller;
      next.lease_id = randomUUID();
      next.lease_revision = 1;
      const workspace = this.workspaceKey(input.worktree, input.branch);
      if (workspace) next.lease_workspace = workspace;
      else delete next.lease_workspace;
      next.lease_phase = input.phase ?? "implementing";
      next.lease_heartbeat_at = now;
      delete next.lease_reclaimed_from;
      KanmerStore.applyRunIdentity(next, input, false);
      await writeFileAtomic(loc.file, serialiseItem(next));
      await appendActivity(this.paths, [
        this.activity(id, "take", { field: "branch", to: input.branch }),
        ...(next.status !== current.status
          ? [this.activity(id, "update", { field: "status", from: current.status, to: next.status })]
          : []),
      ]);
      return next;
    });
  }

  /** Release a taken ticket: clear taken_at / branch / worktree and the whole lease record. */
  async releaseTicket(id: string, opts: { expectedRevision?: string } = {}): Promise<Item> {
    return this.withLeaseLock(async () => {
      const loc = await this.locateItem(id);
      if (!loc) throw new Error(`No item with id "${id}"`);
      const current = parseItem(await readText(loc.file));
      await this.assertRevision(loc, id, opts.expectedRevision);
      if (!current.taken_at && !current.branch && !current.worktree && !current.lease_id) return current;
      const next: Item = { ...current, updated: nowIso() };
      delete next.taken_at;
      delete next.branch;
      delete next.worktree;
      delete next.claim_expires_at;
      delete next.claim_controller;
      KanmerStore.clearLeaseFields(next);
      await writeFileAtomic(loc.file, serialiseItem(next));
      await appendActivity(this.paths, [
        this.activity(id, "release", { field: "branch", from: current.branch }),
      ]);
      return next;
    });
  }

  /**
   * Reclaim a lease for a new controller without `force` (CORE-121 → CORE-115,
   * FRD-030). Legal only when the lease has expired or the reason is an
   * operator override; a live lease refuses with `CLAIM_LIVE`. The recorded
   * branch, worktree and `taken_at` are preserved — a transfer changes who is
   * responsible, never where the work is — and the evidence the host re-read
   * before reclaiming (workspace, PR, commits, proof) is recorded, never acted
   * on: expiry is not deletion and dirty work is preserved. A board-worktree
   * or foreign-repository workspace, or one whose checked-out branch does not
   * match the recorded branch, refuses with `RECOVERY_REFUSED`.
   */
  async transferTicket(id: string, input: TransferTicketInput): Promise<Item> {
    return this.withLeaseLock(async () => {
      const loc = await this.locateItem(id);
      if (!loc) throw new Error(`No item with id "${id}"`);
      const current = parseItem(await readText(loc.file));
      if (current.type !== "ticket") {
        throw new Error(`Only tickets can be transferred; "${id}" is a ${current.type}`);
      }
      if (!current.taken_at) {
        throw new Error(`CLAIM_NOT_TAKEN: "${id}" is not taken; use take_ticket action "take" instead of "transfer".`);
      }
      if (!input.assignee) throw new Error(`assignee is required to transfer "${id}"`);
      await this.assertRevision(loc, id, input.expectedRevision);
      const timing = leaseConfig(await this.getBoard());
      const now = new Date();
      const lease = leaseState(current, now, timing);
      const state = lease.state;
      const operator = isOperatorReason(input.reason);
      if (state === "live" && !operator) {
        const until = lease.expiresAt ?? "(unknown)";
        throw new Error(
          `CLAIM_LIVE: "${id}" is held by ${current.assignee || "an unknown actor"} until ${until}. ` +
            `A live claim is transferred only with a reason beginning "operator:"; otherwise wait for expiry or ask the owner to release.`,
        );
      }
      const recovery = input.recovery;
      if (recovery?.boardWorktree) {
        throw new Error(
          `RECOVERY_REFUSED: "${id}" records the Kanmer board worktree as its workspace; it is never reclaimed or reused as an execution target.`,
        );
      }
      if (recovery?.claimIdentity === "foreign-repository") {
        throw new Error(
          `RECOVERY_REFUSED: "${id}" records a worktree that belongs to a different repository (${current.worktree ?? "(none)"}); ` +
            `an operator must record the correct location before the lease can be reclaimed.`,
        );
      }
      if (recovery?.claimIdentity === "branch-mismatch") {
        throw new Error(
          `RECOVERY_REFUSED: "${id}" records worktree ${current.worktree ?? "(none)"} but it is not checked out on the recorded branch ${current.branch ?? "(none)"}; ` +
            `an operator must restore the branch or record the correct location before the lease can be reclaimed.`,
        );
      }
      const fromAssignee = current.assignee || null;
      const fromController = current.claim_controller ?? fromAssignee;
      const nowText = now.toISOString();
      const next: Item = {
        ...current,
        assignee: input.assignee,
        claim_controller: input.controller ?? input.assignee,
        claim_expires_at: new Date(now.getTime() + timing.expiryMinutes * 60_000).toISOString(),
        lease_id: randomUUID(),
        lease_revision: (current.lease_revision ?? 0) + 1,
        lease_phase: current.lease_phase ?? "implementing",
        lease_heartbeat_at: nowText,
        lease_reclaimed_from: fromController ?? "(none)",
        updated: nowText,
      };
      const workspace = current.lease_workspace ?? this.workspaceKey(current.worktree, current.branch);
      if (workspace) next.lease_workspace = workspace;
      KanmerStore.applyRunIdentity(next, input, false);
      await writeFileAtomic(loc.file, serialiseItem(next));
      await appendActivity(this.paths, [
        this.activity(id, "take", { field: "controller", from: fromController, to: next.claim_controller }),
        this.activity(id, "take", { field: "lease_id", from: current.lease_id ?? null, to: next.lease_id }),
        ...(fromAssignee !== next.assignee
          ? [this.activity(id, "update", { field: "assignee", from: fromAssignee, to: next.assignee })]
          : []),
      ]);
      if (loc.kind === "v2") {
        const evidence = recovery
          ? `; evidence: workspace ${recovery.workspace} (${recovery.claimIdentity}), pr ${recovery.pullRequest}, commits ${recovery.commits}, proof ${recovery.proof}`
          : "; evidence: not collected";
        await this.appendTransition(
          id,
          `claim-transfer ${fromController ?? "(none)"} → ${next.claim_controller} (${state}` +
            `${operator ? `; ${input.reason!.trim()}` : ""}; lease ${current.lease_id ?? "legacy"} → ${next.lease_id} rev ${next.lease_revision}` +
            `; branch ${current.branch ?? "(none)"}; worktree ${current.worktree ?? "(none)"}; expires ${next.claim_expires_at}${evidence})`,
        );
      }
      return next;
    });
  }

  /**
   * Renew (heartbeat) a lease (CORE-115). A leased ticket renews only with its
   * current `lease_id` and `lease_revision`: a non-current id refuses with
   * `LEASE_EXPIRED`, a stale revision with `Conflict:` (REVISION_CONFLICT),
   * and nothing is written on refusal. A lease past expiry that nobody has
   * reclaimed still renews — expiry is not deletion. A legacy claim (no
   * `lease_id`) renews by owner check (`CLAIM_NOT_OWNED`) and receives its
   * lease record then: the one migration path. `phase: "running-command"`
   * with `extendMinutes` is the explicit long-command state, bounded by
   * `leaseCommandMaxMinutes`.
   */
  async renewTicket(id: string, input: RenewTicketInput | string, legacyOpts: { expectedRevision?: string } = {}): Promise<Item> {
    const request: RenewTicketInput = typeof input === "string" ? { actor: input, ...legacyOpts } : input;
    if (request.phase !== undefined && !LEASE_PHASES.includes(request.phase)) {
      throw new Error(`LEASE_PHASE_INVALID: "${request.phase}" is not one of ${LEASE_PHASES.join(", ")}.`);
    }
    return this.withLeaseLock(async () => {
      const loc = await this.locateItem(id);
      if (!loc) throw new Error(`No item with id "${id}"`);
      const current = parseItem(await readText(loc.file));
      if (!current.taken_at) {
        throw new Error(`CLAIM_NOT_TAKEN: "${id}" is not taken; there is no claim to renew.`);
      }
      await this.assertRevision(loc, id, request.expectedRevision);
      const legacy = isLegacyLease(current);
      if (request.leaseRevision !== undefined && request.leaseId === undefined) {
        throw new Error(`LEASE_ID_REQUIRED: "${id}" lease_revision is only meaningful with lease_id; pass both from your packet or last take.`);
      }
      // Compatibility lane: a renew that names no lease (installed v0.3.12
      // skills) falls back to the CORE-121 owner check. Naming a lease is the
      // FRD-030 contract and is checked strictly.
      if (!legacy && request.leaseId !== undefined) {
        if (request.leaseId !== current.lease_id) {
          throw new Error(
            `LEASE_EXPIRED: "${id}" lease ${request.leaseId} is no longer current (current lease ${current.lease_id} is held by ` +
              `${current.claim_controller ?? current.assignee ?? "an unknown actor"}). It was reclaimed or re-acquired; ` +
              `stop working under the old lease and transfer or re-take instead of renewing.`,
          );
        }
        if (request.leaseRevision === undefined) {
          throw new Error(
            `LEASE_REVISION_REQUIRED: "${id}" lease ${current.lease_id} is at revision ${current.lease_revision}; renew with lease_revision.`,
          );
        }
        if (request.leaseRevision !== current.lease_revision) {
          throw new Error(
            `Conflict: "${id}" lease revision changed since you read it (lease revision is now ${current.lease_revision}, ` +
              `you expected ${request.leaseRevision}). Re-read the item and renew again.`,
          );
        }
      } else if (!request.actor || (current.assignee !== request.actor && current.claim_controller !== request.actor)) {
        throw new Error(
          `CLAIM_NOT_OWNED: "${id}" is held by ${current.assignee || "an unknown actor"}` +
            `${current.claim_controller ? ` (controller ${current.claim_controller})` : ""}; only the owner can renew it.`,
        );
      }
      const timing = leaseConfig(await this.getBoard());
      const phase = request.phase ?? current.lease_phase ?? "implementing";
      let minutes = timing.expiryMinutes;
      if (request.extendMinutes !== undefined) {
        if (phase !== "running-command") {
          throw new Error(
            `LEASE_EXTENSION_NEEDS_RUNNING_COMMAND: "${id}" can only extend its lease beyond the board window in phase "running-command" (requested phase "${phase}").`,
          );
        }
        if (!Number.isFinite(request.extendMinutes) || request.extendMinutes <= 0) {
          throw new Error(`LEASE_EXTENSION_INVALID: extend_minutes must be a positive number of minutes.`);
        }
        minutes = Math.min(Math.max(1, Math.floor(request.extendMinutes)), timing.commandMaxMinutes);
      }
      const now = nowIso();
      const next: Item = {
        ...current,
        claim_expires_at: this.claimExpiry(minutes),
        lease_id: current.lease_id ?? randomUUID(),
        lease_revision: (current.lease_revision ?? 0) + 1,
        lease_phase: phase,
        lease_heartbeat_at: now,
        updated: now,
      };
      if (legacy && !next.claim_controller && request.actor) next.claim_controller = request.actor;
      const workspace = current.lease_workspace ?? this.workspaceKey(current.worktree, current.branch);
      if (workspace) next.lease_workspace = workspace;
      KanmerStore.applyRunIdentity(next, request, true);
      await writeFileAtomic(loc.file, serialiseItem(next));
      await appendActivity(this.paths, [
        this.activity(id, "update", { field: "claim_expires_at", from: current.claim_expires_at ?? null, to: next.claim_expires_at }),
        ...(legacy ? [this.activity(id, "take", { field: "lease_id", from: null, to: next.lease_id })] : []),
      ]);
      if (loc.kind === "v2" && (legacy || phase !== (current.lease_phase ?? "implementing"))) {
        await this.appendTransition(
          id,
          legacy
            ? `lease-migrate legacy claim → lease ${next.lease_id} rev ${next.lease_revision} by ${request.actor} (phase ${phase}; expires ${next.claim_expires_at})`
            : `lease-phase ${current.lease_phase ?? "implementing"} → ${phase} (lease ${next.lease_id} rev ${next.lease_revision}; expires ${next.claim_expires_at})`,
        );
      }
      return next;
    });
  }

  /**
   * Read a ticket document by type-relative path; null when it doesn't exist.
   *
   * `doc` is a path now, not a fixed name: `research`, `research/azure.md`,
   * `research/azure/tokens.md` are all valid. A bare type resolves to the
   * folder's index (`research/research.md`), so v2-shaped calls keep working.
   */
  async getDoc(id: string, doc: TicketDoc): Promise<string | null> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    if (loc.kind !== "v2") return null;
    const file = docPathIn(loc.dir, doc);
    if (!(await pathExists(file))) return null;
    return readText(file);
  }

  /**
   * Read a pipeline document together with a version token for its exact
   * bytes. Pass that token back as `expectedVersion` on setDoc to be rejected
   * instead of overwriting a concurrent edit. getDoc's signature is left
   * unchanged so no existing caller breaks.
   */
  async getDocWithVersion(
    id: string,
    doc: TicketDoc,
  ): Promise<{ content: string | null; version: string | null }> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    if (loc.kind !== "v2") return { content: null, version: null };
    const file = docPathIn(loc.dir, doc);
    if (!(await pathExists(file))) return { content: null, version: null };
    const content = await readText(file);
    return { content, version: contentVersion(content) };
  }

  /**
   * Read several ticket documents after resolving the ticket and validating
   * every requested path once. Request order is retained; callers that want
   * deduplication can do that at their own protocol boundary.
   */
  async getDocsWithVersions(id: string, docs: TicketDoc[]): Promise<TicketDocumentWithVersion[]> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);

    // Calculate every path before probing any file. A malformed later entry
    // therefore cannot yield a partial batch result. Format-1 has no ticket
    // folder to read, but it still validates against a placeholder root
    // before returning its established all-missing response.
    const files = docs.map((doc) => ({
      doc,
      file: docPathIn(loc.kind === "v2" ? loc.dir : "", doc),
    }));
    if (loc.kind !== "v2") {
      return files.map(({ doc }) => ({ doc, exists: false, content: null, version: null }));
    }

    return Promise.all(
      files.map(async ({ doc, file }) => {
        if (!(await pathExists(file))) {
          return { doc, exists: false, content: null, version: null };
        }
        const content = await readText(file);
        return { doc, exists: true, content, version: contentVersion(content) };
      }),
    );
  }

  /**
   * Enumerate every Markdown ticket document with an exact-content version.
   *
   * The inventory is deliberately separate from `getDocsWithVersions`: the
   * latter is a request-ordered read for callers that already know paths,
   * while this method is the one discovery API used by execution packets.
   * Legacy items and non-ticket layouts have no ticket-folder inventory and
   * return null; no filesystem or activity-log writes occur.
   */
  async listTicketDocsWithVersions(id: string): Promise<TicketDocumentWithVersion[] | null> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    if (loc.kind !== "v2") return null;
    const item = parseItem(await readText(loc.file));
    if (item.type !== "ticket") return null;

    const { documentPaths } = await documentInventory(loc.dir);
    return Promise.all(
      documentPaths.map(async (doc) => {
        const file = docPathIn(loc.dir, doc);
        const content = await readText(file);
        return { doc, exists: true, content, version: contentVersion(content) };
      }),
    );
  }

  /**
   * Write (or append to) one of a ticket's pipeline documents. Docs are plain
   * Markdown with no frontmatter. `append` adds after a blank line so
   * progress notes never clobber existing content.
   *
   * Pass `expectedVersion` for optimistic concurrency (see SetDocOptions) —
   * omitted, this stays last-write-wins for every existing caller. Returns
   * the version token of what was actually written, so the caller's token
   * stays accurate across the trim/append normalisation.
   */
  async setDoc(
    id: string,
    doc: TicketDoc,
    content: string,
    opts: SetDocOptions = {},
  ): Promise<{ version: string }> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    if (loc.kind !== "v2") {
      throw new Error(
        `"${id}" is stored in the legacy layout, which has no ticket folders — ` +
          `migrate this board to format 2 first.`,
      );
    }
    // Containment defines type, so validation is just "is this a known folder"
    // — docPathIn rejects an unknown top-level name and any traversal. The v2
    // `requires` chain between doc types is gone: profiles express ordering as
    // boundary requirements, so a doc can be written whenever it is useful.
    const file = docPathIn(loc.dir, doc);
    // The ticket-wide revision CAS precedes the per-document one, and both
    // precede the folder creation below so a refused write leaves no trace.
    await this.assertRevision(loc, id, opts.expectedRevision);
    await ensureDir(path.dirname(file)); // folders are created on first write
    // One read serves both the version check and the append.
    const existing = (await pathExists(file)) ? await readText(file) : null;
    if (opts.expectedVersion !== undefined) {
      const actual = existing === null ? null : contentVersion(existing);
      if (actual !== opts.expectedVersion) {
        throw new Error(
          `Conflict: ${doc}.md on "${id}" changed since you read it. ` +
            `Re-read it with get_ticket_doc and re-apply your change.`,
        );
      }
    }
    let text = `${content.trim()}\n`;
    if (opts.append && existing !== null && existing.trim()) {
      text = `${existing.trimEnd()}\n\n${content.trim()}\n`;
    }
    await writeFileAtomic(file, text);
    await appendActivity(this.paths, [
      this.activity(id, "doc", { field: doc, to: opts.append ? "append" : "write" }),
    ]);
    return { version: contentVersion(text) };
  }

  /**
   * Per-type document counts, checklist progress and reference files for a
   * ticket; null for legacy items.
   *
   * v2 reported a boolean per type because a type *was* one file. Types are
   * folders now, so the useful answer is how many documents each holds
   * (FRD-003 T7) — and reference files are enumerated separately because
   * agents must be able to find human-supplied inputs (FRD-004 R3).
   */
  /**
   * Copy a file into a ticket's `reference/` folder (FRD-004 R2).
   *
   * The copy lives here rather than in the GUI's main process because
   * **containment is core's rule**. Every other path in this system is
   * validated in core — `parseDocPath`, `groupDocPath`, `assertSafeRepoPath` —
   * and doing it in main would either duplicate that check or skip it. Skipping
   * it lets a crafted name escape the ticket folder.
   *
   * `reference/` is gate-exempt (FRD-003 T5), so nothing here touches gates: a
   * reference is an input to the work, never evidence of it.
   *
   * A name already taken is suffixed `-2`, `-3`. Overwriting would discard a
   * file the user may have no other copy of, and refusing would make the
   * ordinary case — two files both called `screenshot.png` — an error.
   */
  async addReference(id: string, sourcePath: string, name?: string): Promise<{ name: string }> {
    const loc = await this.locateItem(id);
    if (!loc || loc.kind !== "v2") throw new Error(`No item with id "${id}"`);
    const dir = docDirIn(loc.dir, "reference");
    const base = (name ?? path.basename(sourcePath)).trim();
    referencePath(dir, base);

    await ensureDir(dir);
    const ext = path.extname(base);
    const stem = base.slice(0, base.length - ext.length);
    for (let n = 1; ; n++) {
      const final = n === 1 ? base : `${stem}-${n}${ext}`;
      const destination = referencePath(dir, final);
      try {
        await fs.copyFile(sourcePath, destination, fsConstants.COPYFILE_EXCL);
        await this.appendActivityFor(id, "reference", final);
        return { name: final };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      }
    }
  }

  /**
   * Delete a reference file. There is no archive for one — it is an input, not
   * a record — so callers must confirm before reaching this.
   */
  async removeReference(id: string, name: string): Promise<void> {
    const loc = await this.locateItem(id);
    if (!loc || loc.kind !== "v2") throw new Error(`No item with id "${id}"`);
    const dir = docDirIn(loc.dir, "reference");
    const resolved = referencePath(dir, name);
    await removeFile(resolved);
    await this.appendActivityFor(id, "reference", name);
  }

  /** One activity line for a reference change; kept private to this pair. */
  private async appendActivityFor(id: string, field: string, to: string): Promise<void> {
    await appendActivity(this.paths, [this.activity(id, "update", { field, to })]);
  }

  async getTicketDocsInfo(id: string): Promise<TicketDocsInfo | null> {
    const loc = await this.locateItem(id);
    if (!loc || loc.kind !== "v2") return null;

    const { counts, documentPaths } = await documentInventory(loc.dir);
    const docs: Record<string, boolean> = {};
    for (const [type, n] of Object.entries(counts)) docs[type] = n > 0;

    // Same counter the questions-resolved gate uses — one regex, one meaning.
    // The checklist counts every box; open-questions stops at the parked
    // heading, which is the only difference between the two callers.
    let checklist: TicketDocsInfo["checklist"] = null;
    if ((await listDocs(loc.dir, "checklist")).length) {
      checklist = await countCheckboxes(loc.dir, "checklist");
    }

    return {
      docs,
      counts,
      documentPaths,
      checklist,
      references: await listReferences(loc.dir),
      scratch: await this.listScratch(id),
    };
  }

  /**
   * Count unresolved open questions without initializing or mutating the
   * project.  A legacy layout, missing item, or non-ticket is deliberately
   * reported as null so callers can distinguish an unsupported board from a
   * ticket with zero questions.
   */
  async getOpenQuestionCount(id: string): Promise<OpenQuestionCount | null> {
    let loc: ItemLocation | null;
    try {
      loc = await this.locateItem(id);
    } catch {
      return null;
    }
    if (!loc || loc.kind !== "v2") return null;
    const item = parseItem(await readText(loc.file));
    if (item.type !== "ticket") return null;
    const { checked, total } = await countCheckboxes(loc.dir, "open-questions", {
      stopAtParked: true,
    });
    return { checked, total, open: total - checked };
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

  /**
   * Membership must name groups that exist (FRD-001 G3). Validated on write
   * because a dangling id would otherwise render as a chip pointing at nothing
   * — and there is no second place to check it, since membership is only ever
   * stored here.
   */
  private async assertGroups(ids: string[]): Promise<void> {
    for (const gid of ids) {
      if (!(await readGroup(this.paths, gid))) {
        const known = (await listGroups(this.paths, { includeArchived: true })).map((g) => g.id);
        throw new Error(
          known.length
            ? `No group with id "${gid}". Existing groups: ${known.join(", ")}`
            : `No group with id "${gid}" — this board has no groups yet (create one with create_group).`,
        );
      }
    }
  }

  /**
   * Validate governing-doc refs: each must resolve under the **repo** root and
   * exist. Not the project root — on a board-worktree project the store reads
   * `<repo>/.worktrees/<name>`, while `/docs/` stays in the source checkout.
   */
  private async assertRefs(refs: string[]): Promise<void> {
    for (const rel of refs) {
      const abs = assertSafeRepoPath(this.paths.repoRoot, rel);
      if (!(await pathExists(abs))) {
        throw new Error(`Referenced document "${rel}" does not exist under the repo root (${this.paths.repoRoot}).`);
      }
    }
  }

  /**
   * Hard document gates on a transition — the generalisation of the old proof
   * gate. Resolve the ticket area's gates, evaluate them against the from→to
   * move (threshold semantics in {@link evaluateGates}), and throw once listing
   * every unmet requirement. Gates whose boundary stage is absent on the board
   * are inert, so this is safe on custom and backfilled boards. The default set
   * preserves today's proof-before-final-stage behaviour exactly.
   */
  private async assertDocGate(
    ticketDir: string,
    board: BoardConfig,
    item: Item,
    fromStatus: string,
    toStatus: string,
  ): Promise<void> {
    const report = await this.gateReport(ticketDir, board, item);

    // Checked before the missing-document gate, because the two failures are
    // opposite: this one fires when every document is present. Reporting it as
    // "needs X" would name documents that are already written.
    const collapsed = collapsesPipeline(
      report.boundaries,
      stageIndex(fromStatus),
      stageIndex(toStatus),
    );
    if (collapsed) {
      const next = STAGE_IDS[stageIndex(fromStatus) + 1];
      throw new Error(
        `${item.id} cannot move from "${fromStatus}" to "${toStatus}" in one step: ` +
          `that crosses ${collapsed.length} document gates ` +
          `(${collapsed.map((b) => b.label).join(", ")}). ` +
          `A single move may cross one. Move one stage at a time` +
          (next ? ` — the next is "${next}"` : "") +
          `. Call get_doc_gates for the full picture.`,
      );
    }

    const blocking = firstBlocking(report, fromStatus, toStatus);
    if (!blocking) return;

    const missing = blocking.requirements.filter((r) => !r.satisfied).map((r) => r.requirement);
    throw new Error(
      `${item.id} cannot move from "${fromStatus}" to "${toStatus}": ` +
        `${blocking.label} requires ${missing.join(", ")} ` +
        `(profile "${report.profile}"). ` +
        `Write the missing document(s) with set_ticket_doc` +
        (missing.includes(GOVERNING_DOC)
          ? `, or link a governing doc via refs / set docs_todo`
          : "") +
        (missing.includes(QUESTIONS_RESOLVED)
          ? `. "${QUESTIONS_RESOLVED}" is not a document: open-questions/ still has ` +
            `unticked "- [ ]" lines. Answer them and tick the box, or move them under ` +
            `"## Parked (explicitly deferred)" with a reason for deferring`
          : "") +
        `, then move. Call get_doc_gates for the full picture.`,
    );
  }

  /**
   * The ticket's full gate state — the single answer MCP, the GUI and skills
   * all consume (FRD-002 G4). Profile resolution is P6: the ticket's explicit
   * profile, else its area's default, else the board's.
   */
  async gateReport(ticketDir: string, board: BoardConfig, item: Item): Promise<GateReport> {
    const area = board.areas.find((a) => a.id === item.area);
    const profileId = resolveProfileId(
      item.profile,
      (area as { defaultProfile?: string } | undefined)?.defaultProfile,
      board.defaultProfile,
    );

    return evaluateProfileGates({
      profiles: resolveProfiles(board),
      profileId,
      inlineRequires: item.requires,
      stage: item.status,
      evidence: {
        hasType: (type) => typeSatisfied(ticketDir, type),
        hasNamed: (type, named) => namedSatisfied(ticketDir, type, named),
        hasGoverningDoc: () => {
          if (item.docs_todo === true) return true;
          return (item.refs ?? []).some((rel) => repoDocKindOf(board, rel) !== null);
        },
        hasProofImages: async () => {
          const files = await listFilesRecursive(docDirIn(ticketDir, "proof"));
          return files.some((f) => /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(f));
        },
        unresolvedQuestions: async () => {
          const { checked, total } = await countCheckboxes(ticketDir, "open-questions", {
            stopAtParked: true,
          });
          return total - checked;
        },
      },
    });
  }

  /** Gate state for a ticket by id — what `get_doc_gates` returns. */
  // ---- Groups (FRD-001) ---------------------------------------------------
  // Membership lives on tickets; everything about the group's contents is
  // derived here on read, so the two can never disagree.

  /** Create a group of a board-declared kind, allocating its id from the kind's prefix. */
  async createGroup(kind: string, title: string, body = ""): Promise<Group> {
    await this.init();
    const board = await this.getBoard();
    const kinds = resolveGroupKinds(board);
    const spec = kinds.find((k) => k.id === kind);
    if (!spec) {
      throw new Error(`Unknown group kind "${kind}". Valid kinds: ${kinds.map((k) => k.id).join(", ")}`);
    }
    // Reuse the per-prefix id machinery tickets use, so group ids and ticket
    // ids can never collide and both survive a counters.json rebuild.
    // `nextPrefixNumber` scans ticket folders for the prefix; groups live
    // elsewhere, so their own on-disk maximum is passed as the floor. Counters
    // stay derived state — a deleted counters.json still cannot re-issue a live id.
    const n = await nextPrefixNumber(
      this.paths,
      spec.prefix,
      await maxGroupNumberForPrefix(this.paths, spec.prefix),
    );
    const id = formatId(spec.prefix, n);
    const now = nowIso();
    const group: Group = { id, kind, title, archived: false, created: now, updated: now, body };
    await writeGroup(this.paths, group);
    await recordAllocatedPrefix(this.paths, spec.prefix, n);
    await appendActivity(this.paths, [this.activity(id, "create", { field: "group", to: kind })]);
    return group;
  }

  async getGroup(id: string): Promise<GroupWithMembers | null> {
    const group = await readGroup(this.paths, id);
    if (!group) return null;
    const items = await this.listItems({ includeArchived: true });
    return deriveMembers(group, items, lastStageId());
  }

  async listGroups(opts: { kind?: string; includeArchived?: boolean } = {}): Promise<Group[]> {
    return listGroups(this.paths, opts);
  }

  /**
   * Patch a group's own fields. Members are not among them — they are derived.
   * `kind` is not among them either: `createGroup` allocates the id from the
   * kind's prefix, so `EPIC-`/`HZN-` encodes it permanently.
   *
   * Ordering mirrors `updateItem` and is load-bearing. `expectedUpdated` is
   * stripped first — the group frontmatter schema is `.passthrough()` and
   * `serialiseGroup` writes any hand-added key, so a token left on the patch
   * would be persisted into the file. The conflict check runs **before** the
   * no-op comparison, or a stale token would silently succeed whenever the
   * patch happened to change nothing. And the rest is pruned of `undefined`,
   * because `serialiseGroup` skips undefined values — an explicit
   * `title: undefined` would otherwise erase `title:` from the frontmatter.
   */
  async updateGroup(
    id: string,
    patch: { title?: string; body?: string; archived?: boolean; expectedUpdated?: string },
  ): Promise<Group> {
    const { expectedUpdated, ...fields } = patch;
    const current = await readGroup(this.paths, id);
    if (!current) throw new Error(`No group with id "${id}"`);
    if (expectedUpdated !== undefined && current.updated !== expectedUpdated) {
      throw this.conflictError(id, current, expectedUpdated);
    }
    const next: Group = { ...current, ...pruneUndefined(fields) };
    if (serialiseGroup(next) === serialiseGroup(current)) return current; // no-op, no write
    next.updated = nowIso();
    await writeGroup(this.paths, next);
    await appendActivity(this.paths, [this.activity(id, "update", { field: "group" })]);
    return next;
  }

  /** Shared context documents live free-form in the group's folder. */
  async getGroupDoc(id: string, rel: string): Promise<string | null> {
    const file = groupDocPath(this.paths, id, rel);
    if (!(await pathExists(file))) return null;
    return readText(file);
  }

  async setGroupDoc(id: string, rel: string, content: string): Promise<{ file: string }> {
    if (!(await readGroup(this.paths, id))) throw new Error(`No group with id "${id}"`);
    const file = groupDocPath(this.paths, id, rel);
    await ensureDir(path.dirname(file));
    await writeFileAtomic(file, `${content.trim()}\n`);
    await appendActivity(this.paths, [this.activity(id, "doc", { field: `group:${rel}` })]);
    return { file };
  }

  /** Every group a ticket belongs to, for the read-everything duty (FRD-003 T9). */
  async groupsForItem(id: string): Promise<Group[]> {
    const item = await this.getItem(id);
    if (!item?.groups?.length) return [];
    const out: Group[] = [];
    for (const gid of item.groups) {
      const g = await readGroup(this.paths, gid);
      if (g) out.push(g);
    }
    return out;
  }

  async getDocGates(id: string): Promise<GateReport | null> {
    const loc = await this.locateItem(id);
    if (!loc || loc.kind !== "v2") return null;
    const item = parseItem(await readText(loc.file));
    return this.gateReport(loc.dir, await this.getBoard(), item);
  }

  /**
   * Append a note to a per-ticket scratch note (`scratch/<slug>.md`). Uses
   * `fs.appendFile` (the true append primitive, cf. activity.ts) rather than the
   * atomic temp+rename of setDoc: scratch is a running note, not a versioned doc.
   * A blank line separates successive appends. Emits one activity line per call —
   * callers that stream must batch. Scratch is exempt from doc-type validation.
   */
  async appendScratch(
    id: string,
    slug: string,
    content: string,
    opts: { expectedRevision?: string } = {},
  ): Promise<{ file: string }> {
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    if (loc.kind !== "v2") {
      throw new Error(
        `"${id}" is stored in the legacy layout, which has no ticket folders — ` +
          `migrate this board to format 2 first.`,
      );
    }
    await this.assertRevision(loc, id, opts.expectedRevision);
    // Format 3: scratch is a folder like every other type (FRD-003 T1), so a
    // note lands at scratch/<slug>.md rather than the old scratch-<slug>.md.
    const file = docPathIn(loc.dir, `scratch/${slug}`);
    const had = await pathExists(file);
    await ensureDir(path.dirname(file));
    const block = `${content.trim()}\n`;
    await fs.appendFile(file, had ? `\n${block}` : block, "utf8");
    await appendActivity(this.paths, [
      this.activity(id, "doc", { field: `scratch/${slug}`, to: "append" }),
    ]);
    return { file };
  }

  /** Read a per-ticket scratch note back; null when it doesn't exist. */
  async getScratch(id: string, slug: string): Promise<string | null> {
    return this.getDoc(id, `scratch/${slug}`);
  }

  /** The slugs of a ticket's scratch notes (`scratch/<slug>.md` → `<slug>`), sorted. */
  async listScratch(id: string): Promise<string[]> {
    const loc = await this.locateItem(id);
    if (!loc || loc.kind !== "v2") return [];
    const files = await listDocs(loc.dir, "scratch");
    return files.map((f) => f.replace(/\.md$/, "")).sort();
  }

  // No format-3 equivalent of v2's assertFinalStageGates. That guard existed
  // only because `statuses` was editable: a board write could promote a
  // different stage into the final slot and strand proofless tickets there.
  // The final stage is now a constant (ADR-0002), so the situation it defended
  // against cannot arise.
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
  if (value === "" || board.areas.length === 0) return;
  const list = columnList(board, kind);
  if (!list.some((c) => c.id === value)) {
    throw new Error(
      `Unknown ${kind} "${value}". Valid areas: ${list.map((c) => c.id).join(", ")}`,
    );
  }
}

/**
 * Reject a status that is not one of the six (FRD-007 B1).
 *
 * Stages are constants, so this needs no board — which is the point: a gate can
 * no longer reference a stage that does not exist.
 */
function assertStage(status: string): void {
  if (!isStageId(status)) {
    throw new Error(`Unknown stage "${status}". Valid stages: ${STAGE_IDS.join(", ")}`);
  }
}

/**
 * Reject an unknown profile, or a `custom` ticket whose inline `requires`
 * names a boundary, document type, proof flavour or environment that does not
 * exist. Validating on write is what keeps `get_doc_gates` honest — an
 * unresolvable requirement would otherwise read as a permanently unmet gate.
 */
function assertProfileAgainstBoard(
  board: BoardConfig,
  profile: string,
  requires?: ProfileMap,
): void {
  const profiles = resolveProfiles(board);
  if (profile !== "custom" && !profiles[profile]) {
    throw new Error(
      `Unknown profile "${profile}". Valid: ${Object.keys(profiles).join(", ")}, custom`,
    );
  }
  const map = profile === "custom" ? (requires ?? {}) : profiles[profile];
  const errors = validateProfileMap(map, {
    proofTypes: resolveProofTypes(board),
    environments: resolveEnvironments(board),
  });
  if (errors.length) {
    throw new Error(`Invalid requirements for profile "${profile}": ${errors.join("; ")}`);
  }
}

/**
 * Validate a per-ticket deployment value against the board's declared
 * environments. `n/a` (not deployable) and `not-deployed` are always accepted;
 * any other value must be one of `board.deployment.environments`. Rejected
 * entirely when the board declares no deployment block (like an unknown field).
 */
function assertDeploymentAgainstBoard(board: BoardConfig, value: string): void {
  if (value === "") return;
  if (!board.deployment) {
    throw new Error(
      `This board has no deployment tracking, so "deployment" can't be set. ` +
        `Add a deployment block to board.yml (or leave it unset).`,
    );
  }
  if (value === "n/a" || value === "not-deployed") return;
  if (!board.deployment.environments.includes(value)) {
    throw new Error(
      `Unknown deployment "${value}". Valid: n/a, not-deployed, ${board.deployment.environments.join(", ")}.`,
    );
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
    } else if (key === "deployment" && value === "") {
      if (existing !== undefined) changed.push(key); // "" clears deployment
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
  if (filter.group && !(item.groups ?? []).includes(filter.group)) return false;
  return true;
}

/** The mutable column array on a board for a given kind. */
function columnList(board: BoardConfig, kind: ColumnKind): BoardColumn[] {
  switch (kind) {
    case "area":
      return board.areas;
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
