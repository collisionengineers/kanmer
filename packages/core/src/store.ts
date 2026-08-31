import { AsyncLocalStorage } from "node:async_hooks";
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
  deliveryTargets,
  resolveDelivery,
  resolveEnvironments,
  resolveProfiles,
  resolveProofTypes,
  writeBoard,
} from "./board.js";
import { FIRST_STAGE, STAGE_IDS, isStageId, stageIndex } from "./stages.js";
import {
  CAPTURE_DISPOSITIONS,
  CAPTURE_PROFILE_ID,
  GOVERNING_DOC,
  QUESTIONS_RESOLVED,
  isCaptureDisposition,
  isCaptureItem,
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
  RELEASE_FROZEN_FIELDS,
  RELEASE_RECORD_SCHEMA,
  assertNoReleaseChannelCollision,
  attemptIdFor,
  candidateIdentity,
  candidateRefFor,
  classifyReleaseEvidence,
  commitReleaseMutation,
  deliveryPolicyVersion,
  isTerminalAttempt,
  newReleaseLeaseId,
  nextOrdinal,
  nextRetry,
  normalizeReleaseChannel,
  readAttemptRecord,
  readChannelHeadRecord,
  readChannelRecord,
  readReleaseSnapshot,
  readReleaseStateRecord,
  recoverPendingReleaseMutation,
  recoverReleaseMutation,
  releaseEndpointConsistent,
  releaseLeaseExpired,
  type AcquireReleaseChannelInput,
  type CompleteReleaseAttemptInput,
  type FailReleaseAttemptInput,
  type RecordReleaseProgressInput,
  type ReleaseAttemptRecord,
  type ReleaseChannelCasInput,
  type ReleaseChannelHeadRecord,
  type ReleaseChannelRecord,
  type ReleaseChannelResult,
  type ReleaseSnapshot,
  type SupersedeReleaseAttemptInput,
} from "./release.js";
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
  type BatchSummaryProjection,
  type BatchState,
  type DeliveryPolicy,
  type ReconciliationApplyInput,
  type ReconciliationApplyResult,
  type ReconciliationResponsibility,
  DELIVERY_PATCH_KEYS,
  DELIVERY_STATES,
  LEASE_PHASES,
  deliveryStateRank,
  isDeliveryState,
  isLegacyLease,
  isTerminalTicket,
  isOperatorReason,
  leaseConfig,
  leaseState,
} from "./types.js";
import { createHash, randomUUID } from "node:crypto";
import { normalizeWorktreePath } from "./worktree-guard.js";
import { parseReviewAttestation } from "./review-attestation.js";

const ITEM_TYPES: ItemType[] = ["ticket", "plan", "research"];

/** Bound on exclusive-create retries; ~2× the worst realistic contention. */
const CREATE_ATTEMPTS = 20;

/**
 * The board write-lock files held by the current async execution context.
 * Read by {@link KanmerStore.withLeaseLock} to make a nested acquire a no-op
 * instead of a self-deadlock; empty for every fresh caller, so it never
 * weakens exclusion between independent operations.
 */
const heldWriteLocks = new AsyncLocalStorage<ReadonlySet<string>>();

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

const BATCH_DECLARATION_SCHEMA = 1 as const;

interface BatchDeclarationWrite {
  id: string;
  before_sha256: string;
  after_sha256: string;
}

interface BatchTakeIntent {
  ticket_id: string;
  branch: string;
  worktree: string | null;
  stage: string;
  from_stage: string;
  assignee: string | null;
  controller_label: string | null;
  controller_run: string | null;
  worker_run: string | null;
  provider: string | null;
  phase: string;
  expected_revision: string | null;
  force: boolean;
}

interface BatchManifestBase {
  schema: typeof BATCH_DECLARATION_SCHEMA;
  batch_id: string;
  controller: string;
  controller_run: string;
  frozen_at: string;
  members: string[];
  workspace: string;
  branch: string;
}

interface BatchPendingManifest extends BatchManifestBase {
  state: "pending";
  transaction_id: string;
  request_sha256: string;
  take: BatchTakeIntent;
  lease_id: string;
  claim_expires_at: string;
  documents_sha256: string;
  writes: BatchDeclarationWrite[];
}

interface BatchActiveManifest extends BatchManifestBase {
  state: "active" | "releasing";
  /** Hash of the exact request only, retained for response-loss idempotence. */
  request_sha256: string;
  declaring_ticket: string;
}

type BatchDeclarationJournal = BatchPendingManifest | BatchActiveManifest;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function batchRequestSha256(
  batchId: string,
  id: string,
  actor: string,
  controllerRun: string,
  members: string[],
  input: TakeTicketInput,
  stage: string,
): string {
  return sha256(JSON.stringify({
    batch_id: batchId,
    ticket_id: id,
    actor,
    controller_run: controllerRun,
    members,
    branch: input.branch,
    worktree: input.worktree ?? null,
    stage,
    assignee: input.assignee ?? null,
    controller_label: input.controller ?? null,
    worker_run: input.workerRun ?? null,
    provider: input.provider ?? null,
    phase: input.phase ?? "implementing",
    expected_revision: input.expectedRevision ?? null,
    force: input.force === true,
  }));
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function hasBatchOwnership(item: Item): boolean {
  return item.lease_batch !== undefined || item.lease_batch_controller !== undefined || item.lease_batch_frozen_at !== undefined;
}

function hasWorkspaceLeaseResidue(item: Item): boolean {
  return item.branch !== undefined || item.worktree !== undefined ||
    item.claim_expires_at !== undefined || item.claim_controller !== undefined ||
    item.lease_id !== undefined || item.lease_revision !== undefined || item.lease_workspace !== undefined ||
    item.lease_phase !== undefined || item.lease_heartbeat_at !== undefined || item.lease_reclaimed_from !== undefined ||
    item.lease_controller_run !== undefined || item.lease_worker_run !== undefined || item.lease_provider !== undefined;
}

function hasClaimResidue(item: Item): boolean {
  return hasWorkspaceLeaseResidue(item) || hasBatchOwnership(item);
}

function isBatchDeclarationJournal(value: unknown): value is BatchDeclarationJournal {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const state = record.state;
  const expectedKeys = state === "pending"
    ? ["schema", "state", "transaction_id", "request_sha256", "batch_id", "controller", "controller_run", "frozen_at", "members", "workspace", "branch", "take", "lease_id", "claim_expires_at", "documents_sha256", "writes"]
    : ["schema", "state", "request_sha256", "declaring_ticket", "batch_id", "controller", "controller_run", "frozen_at", "members", "workspace", "branch"];
  if (!exactKeys(record, expectedKeys)) return false;
  if (
    record.schema !== BATCH_DECLARATION_SCHEMA ||
    (state !== "pending" && state !== "active" && state !== "releasing") ||
    typeof record.batch_id !== "string" || record.batch_id.length === 0 || record.batch_id.trim() !== record.batch_id ||
    typeof record.controller !== "string" || record.controller.length === 0 || record.controller.trim() !== record.controller ||
    typeof record.controller_run !== "string" || record.controller_run.length === 0 || record.controller_run.trim() !== record.controller_run ||
    typeof record.frozen_at !== "string" || Number.isNaN(Date.parse(record.frozen_at)) || new Date(record.frozen_at).toISOString() !== record.frozen_at ||
    !Array.isArray(record.members) || record.members.length < 2 ||
    !record.members.every((id) => typeof id === "string" && id.length > 0 && id.trim() === id) ||
    typeof record.workspace !== "string" || record.workspace.length === 0 || record.workspace.trim() !== record.workspace ||
    typeof record.branch !== "string" || record.branch.length === 0 || record.branch.trim() !== record.branch ||
    typeof record.request_sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(record.request_sha256)
  ) return false;
  const members = record.members as string[];
  if (new Set(members).size !== members.length || members.some((id, index) => index > 0 && members[index - 1]!.localeCompare(id) >= 0)) return false;
  if (state !== "pending") {
    return typeof record.declaring_ticket === "string" && members.includes(record.declaring_ticket);
  }
  if (
    typeof record.transaction_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(record.transaction_id) ||
    !record.take || typeof record.take !== "object" || Array.isArray(record.take) ||
    typeof record.lease_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(record.lease_id) ||
    typeof record.claim_expires_at !== "string" || Number.isNaN(Date.parse(record.claim_expires_at)) || new Date(record.claim_expires_at).toISOString() !== record.claim_expires_at ||
    Date.parse(record.claim_expires_at) <= Date.parse(record.frozen_at) ||
    !Array.isArray(record.writes)
  ) return false;
  const take = record.take as Record<string, unknown>;
  if (!exactKeys(take, ["ticket_id", "branch", "worktree", "stage", "from_stage", "assignee", "controller_label", "controller_run", "worker_run", "provider", "phase", "expected_revision", "force"])) return false;
  if (
    typeof take.ticket_id !== "string" || !members.includes(take.ticket_id) ||
    typeof take.branch !== "string" || take.branch.length === 0 || take.branch.trim() !== take.branch || take.branch !== record.branch ||
    (take.worktree !== null && (typeof take.worktree !== "string" || take.worktree.length === 0 || take.worktree.trim() !== take.worktree)) ||
    typeof take.stage !== "string" || !isStageId(take.stage) ||
    typeof take.from_stage !== "string" || !isStageId(take.from_stage) ||
    ![take.assignee, take.controller_label, take.controller_run, take.worker_run, take.provider, take.expected_revision]
      .every((entry) => entry === null || typeof entry === "string") ||
    take.controller_run !== record.controller_run ||
    typeof take.phase !== "string" || !LEASE_PHASES.some((phase) => phase === take.phase) ||
    typeof take.force !== "boolean"
  ) return false;
  if (typeof record.documents_sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(record.documents_sha256)) return false;
  const writes = record.writes as unknown[];
  if (writes.length !== members.length) return false;
  return writes.every((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const write = entry as Record<string, unknown>;
    return exactKeys(write, ["id", "before_sha256", "after_sha256"]) &&
      write.id === members[index] &&
      typeof write.before_sha256 === "string" && /^[0-9a-f]{64}$/u.test(write.before_sha256) &&
      typeof write.after_sha256 === "string" && /^[0-9a-f]{64}$/u.test(write.after_sha256);
  });
}

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

  private async documentStateHash(loc: ItemLocation): Promise<string> {
    if (loc.kind !== "v2") return sha256("legacy");
    const { documentPaths } = await documentInventory(loc.dir);
    const documents = await Promise.all(
      documentPaths.map(async (doc) => ({ path: doc, version: contentVersion(await readText(docPathIn(loc.dir, doc))) })),
    );
    return sha256(JSON.stringify(documents));
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
    await this.withLeaseLock(() =>
      withExclusiveFileLock(`${this.paths.boardFile}.lock`, async () => {
        const previous = await this.getBoard(); // re-reads disk = the true prior state
        // A whole-board write must not strand items on a removed column — the same
        // protection removeColumn has, so no GUI/agent setBoard path can silently
        // drop a stage/area/priority that items still reference (audit A3).
        await this.assertNoStrandedColumns(previous, board);
        await writeBoard(this.paths, board);
      }),
    );
  }

  /** Read, mutate, and write the board while holding the cross-process board lock. */
  async updateBoard(mutator: (board: BoardConfig) => BoardConfig | Promise<BoardConfig>): Promise<BoardConfig> {
    return this.withLeaseLock(() =>
      withExclusiveFileLock(`${this.paths.boardFile}.lock`, async () => {
        const previous = await this.getBoard();
        const next = await mutator(structuredClone(previous));
        await this.assertNoStrandedColumns(previous, next);
        await writeBoard(this.paths, next);
        return next;
      }),
    );
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
    if (input.profile === CAPTURE_PROFILE_ID) {
      assertCaptureObservation(input.title, input.body);
    }
    if (input.groups !== undefined) await this.assertGroups(input.groups);
    if (input.refs !== undefined) await this.assertRefs(input.refs);
    if (input.deployment !== undefined) assertDeploymentAgainstBoard(board, input.deployment);
    if (input.delivery_state !== undefined && !isDeliveryState(input.delivery_state)) {
      throw new Error(
        `DELIVERY_STATE_INVALID: unknown delivery_state "${input.delivery_state}". Valid: ${DELIVERY_STATES.join(", ")}.`,
      );
    }
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
      // FRD-032: a capture never acquires document debt automatically. Nothing
      // here defaults `docs_todo`, and the `capture` profile declares no
      // `governing-doc` requirement, so the probe is never even consulted.
      if (input.capture_evidence !== undefined && input.capture_evidence.length > 0) {
        item.capture_evidence = input.capture_evidence;
      }
      if (input.profile === CAPTURE_PROFILE_ID) {
        item.capture_actor = input.capture_actor?.trim() || this.actor;
      } else if (input.capture_actor !== undefined && input.capture_actor.trim() !== "") {
        item.capture_actor = input.capture_actor.trim();
      }
      if (input.commits !== undefined && input.commits.length > 0) item.commits = input.commits;
      if (input.prs !== undefined && input.prs.length > 0) item.prs = input.prs;
      if (input.deployment !== undefined && input.deployment !== "") item.deployment = input.deployment;
      // FRD-031 delivery state. Set, derive, then validate the *merged* record,
      // so a create is judged by exactly the rule an update is.
      if (touchesDelivery(input)) {
        for (const key of DELIVERY_PATCH_KEYS) {
          const value = input[key];
          if (value !== undefined && value !== "") item[key] = value;
        }
        const policy = resolveDelivery(board);
        applyDeliveryEffects(policy, item, item.updated);
        assertDeliveryAgainstBoard(policy, item);
      }
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
      fields.deployment !== undefined ||
      touchesDelivery(fields)
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
    // CORE-125: the read, the CAS and the write are one critical section under
    // the same lock the lease verbs take, so a lease write can never be
    // renamed over by a stale read here. Argument validation above touches no
    // ticket file, so it deliberately stays outside the lock.
    return this.withLeaseLock(async () => {
      const loc = await this.locateItem(id);
      if (!loc) throw new Error(`No item with id "${id}"`);
      await this.assertNoPendingBatchMutation(id);
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
      // FRD-032. Both rules read the ticket **as currently stored**, so a
      // promotion is judged against the thing it is promoting rather than
      // against the state its own patch is trying to create.
      assertCaptureObservationRetained(current, fields);
      const captureEffects = await this.captureDecisionEffects(current, fields);
      const pruned = pruneUndefined({ ...fields, ...backwardEffects, ...captureEffects });
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
      // FRD-031. `""` clears one delivery field, the same sentinel `deployment`
      // uses; the derived fields are then recomputed and the merged record —
      // not the patch — is validated, so clearing a hotfix's branch also
      // clears the backport it owed.
      if (touchesDelivery(pruned)) {
        for (const key of DELIVERY_PATCH_KEYS) {
          if (pruned[key] === "") delete next[key];
        }
        board ??= await this.getBoard();
        const policy = resolveDelivery(board);
        applyDeliveryEffects(policy, next, next.updated);
        assertDeliveryAgainstBoard(policy, next);
      }
      if (next.docs_todo === false) delete next.docs_todo;
      if (next.refs && next.refs.length === 0) delete next.refs;
      if (next.commits && next.commits.length === 0) delete next.commits;
      if (next.prs && next.prs.length === 0) delete next.prs;
      if (next.capture_evidence && next.capture_evidence.length === 0) delete next.capture_evidence;
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
          // Re-enters the lock we are already holding (see withLeaseLock).
          await this.appendTransition(
            id,
            `stage ${current.status} → ${next.status} by ${this.actor}; reason: ${backwardReason!.trim()}` +
              (backward.review_round !== undefined ? `; review_round ${backward.review_round}` : "") +
              (backward.remediation_budget !== undefined ? `; remediation_budget ${backward.remediation_budget}` : ""),
          );
        }
      }
      return next;
    });
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
    //
    // Deliberately NOT wrapped in one write lock (CORE-125): computeOrder can
    // rewrite an entire column, and holding a board-wide lock across that would
    // serialise every other writer for far longer than the lock's own retry
    // budget. Each write it causes is serialised individually by updateItem,
    // and the final updateItem re-reads under the lock, so this ticket's CAS
    // and write remain atomic against a lease write.
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
    await this.assertNoPendingBatchMutation(id);
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
      // Refuse the whole rebalance before the first sibling write when any
      // endpoint is frozen by an interrupted declaration/release.
      for (const item of items) await this.assertNoPendingBatchMutation(item.id);
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

  /**
   * Run `work` inside this board's write lock (CORE-115, widened to every
   * ticket-file writer by CORE-125 and to board-policy/release/reconciliation
   * writers by CORE-132). A write that needs both locks always takes this lease
   * lock before `board.yml.lock`, so policy updates cannot interleave between a
   * release candidate's policy compare and its durable journal commit.
   *
   * `withExclusiveFileLock` is a cross-process exclusive-create lock and is
   * **not** re-entrant: a second acquire from the same process gets `EEXIST`,
   * cannot be recovered as stale (its own pid is alive), exhausts the retry
   * schedule and throws. Several verbs legitimately nest —
   * `updateItem` → `appendTransition` → `setDoc`, `renewTicket`/
   * `transferTicket` → `appendTransition` → `setDoc`, `moveItem` and
   * `deleteItem` → `updateItem` — so the lock files held by the current async
   * execution context are tracked and a nested acquire of one of them runs the
   * work directly. Exclusion against every other context, process and store
   * instance is unchanged; only re-acquisition inside a section this context
   * already owns is skipped. Keyed by lock-file path, so a process driving two
   * boards never aliases one board's section onto the other's.
   */
  private withLeaseLock<T>(work: () => Promise<T>): Promise<T> {
    const lockFile = this.leaseLockFile();
    const held = heldWriteLocks.getStore();
    if (held?.has(lockFile)) return work();
    const nested = new Set(held ?? []);
    nested.add(lockFile);
    return withExclusiveFileLock(lockFile, () => heldWriteLocks.run(nested, async () => {
      await this.removeStaleBatchTemps();
      return work();
    }));
  }

  private async removeStaleBatchTemps(): Promise<void> {
    let entries: string[];
    try {
      entries = await fs.readdir(this.paths.batchTransactionsDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      if (/^\.[0-9a-f]{64}\.json\.tmp-\d+-\d+$/u.test(entry)) {
        await removeFile(path.join(this.paths.batchTransactionsDir, entry));
      }
    }
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
   * never bypasses this rule. The one deliberate exception (CORE-124, FRD-030
   * batch mode) is a sibling that is a frozen member of the same batch: a batch
   * owns exactly one workspace, so a member may take the workspace its batch
   * already occupies — and only that one (`BATCH_WORKSPACE_MISMATCH`).
   */
  private async assertWorkspaceFree(
    id: string,
    worktree: string | undefined,
    branch: string | undefined,
    batchId: string | undefined,
    batchActor: string,
    batchControllerRun: string | undefined,
    siblings: Item[],
  ): Promise<void> {
    const mine = worktree ? normalizeWorktreePath(worktree, this.paths.repoRoot) : null;
    for (const other of siblings) {
      if (other.id === id || !other.taken_at) continue;
      const sameWorktree = mine !== null && other.worktree !== undefined &&
        normalizeWorktreePath(other.worktree, this.paths.repoRoot) === mine;
      const sameBranch = branch !== undefined && other.branch === branch;
      const sameBatch = batchId !== undefined && other.lease_batch === batchId;
      if (sameBatch) {
        if (other.lease_batch_controller !== batchActor) {
          throw new Error(
            `BATCH_OWNER_MISMATCH: batch ${batchId} belongs to ${other.lease_batch_controller ?? "an unknown actor"}; ` +
              `${batchActor} cannot take its shared workspace.`,
          );
        }
        if (other.lease_controller_run !== batchControllerRun) {
          throw new Error(
            `BATCH_OWNER_MISMATCH: batch ${batchId} belongs to controller run ${other.lease_controller_run ?? "an unknown run"}; ` +
              `${batchControllerRun ?? "an unknown run"} cannot take its shared workspace.`,
          );
        }
        // A ticket cannot occupy two active workspaces and a batch owns one:
        // a member must present the workspace its taken sibling recorded.
        const otherWorktree = other.worktree !== undefined ? normalizeWorktreePath(other.worktree, this.paths.repoRoot) : null;
        if (otherWorktree !== mine || other.branch !== branch) {
          throw new Error(
            `BATCH_WORKSPACE_MISMATCH: "${id}" is a member of batch ${batchId}, whose workspace is ` +
              `${other.worktree ? `worktree ${other.worktree} on ` : ""}branch ${other.branch} (recorded on "${other.id}"); ` +
              `take that exact worktree and branch — a batch owns one workspace and a ticket occupies one.`,
          );
        }
        continue;
      }
      if (!sameWorktree && !sameBranch) continue;
      const holder = other.claim_controller ?? other.assignee ?? "an unknown actor";
      throw new Error(
        `WORKSPACE_OCCUPIED: "${id}" cannot take ${sameWorktree ? `worktree ${worktree}` : `branch ${branch}`}; ` +
          `it is recorded on "${other.id}" (held by ${holder}${other.lease_id ? `, lease ${other.lease_id}` : ""}` +
          `${other.lease_batch ? `, batch ${other.lease_batch} — only its frozen members may take it` : ""}). ` +
          `One live writer owns a workspace: use an isolated worktree and branch, or close out "${other.id}" first.`,
      );
    }
  }

  // Batch workspaces (CORE-124, FRD-030): membership is the set of tickets
  // sharing one `lease_batch`; it is written only here, under the lease lock.

  /** Every ticket (archived included — they count as terminal) carrying `lease_batch === batchId`. */
  private static batchMembersOf(batchId: string, tickets: Item[]): Item[] {
    return tickets.filter((t) => t.lease_batch === batchId);
  }

  private batchTransactionFile(batchId: string): string {
    // The batch id is data, never a path component. Hash its exact (trimmed by
    // takeTicket) bytes so separators, device names and case variants cannot
    // escape or alias the transaction directory.
    return path.join(this.paths.batchTransactionsDir, `${sha256(batchId)}.json`);
  }

  private assertBatchJournalWorkspace(journal: BatchDeclarationJournal): void {
    if (journal.state !== "pending") {
      const branchWorkspace = `branch:${journal.branch}`;
      const canonicalWorktree = journal.workspace.startsWith("worktree:") &&
        this.workspaceKey(journal.workspace.slice("worktree:".length), journal.branch) === journal.workspace;
      if (journal.workspace !== branchWorkspace && !canonicalWorktree) {
        throw new Error(`BATCH_TRANSACTION_INVALID: batch ${journal.batch_id} manifest workspace is not canonical for its frozen branch.`);
      }
      return;
    }
    const expected = this.workspaceKey(journal.take.worktree ?? undefined, journal.take.branch);
    if (expected !== journal.workspace) {
      throw new Error(`BATCH_TRANSACTION_INVALID: batch ${journal.batch_id} journal workspace does not match its frozen branch/worktree intent.`);
    }
    const requestSha256 = batchRequestSha256(
      journal.batch_id,
      journal.take.ticket_id,
      journal.controller,
      journal.controller_run,
      journal.members,
      {
        branch: journal.take.branch,
        ...(journal.take.worktree !== null ? { worktree: journal.take.worktree } : {}),
        stage: journal.take.stage,
        ...(journal.take.assignee !== null ? { assignee: journal.take.assignee } : {}),
        ...(journal.take.controller_label !== null ? { controller: journal.take.controller_label } : {}),
        ...(journal.take.controller_run !== null ? { controllerRun: journal.take.controller_run } : {}),
        ...(journal.take.worker_run !== null ? { workerRun: journal.take.worker_run } : {}),
        ...(journal.take.provider !== null ? { provider: journal.take.provider } : {}),
        phase: journal.take.phase as TakeTicketInput["phase"],
        ...(journal.take.expected_revision !== null ? { expectedRevision: journal.take.expected_revision } : {}),
        force: journal.take.force,
      },
      journal.take.stage,
    );
    if (requestSha256 !== journal.request_sha256) {
      throw new Error(`BATCH_TRANSACTION_INVALID: batch ${journal.batch_id} journal request fingerprint is contradictory.`);
    }
  }

  private async readBatchJournal(batchId: string): Promise<BatchDeclarationJournal | null> {
    const file = this.batchTransactionFile(batchId);
    let raw: string;
    try {
      raw = await readText(file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw new Error(`BATCH_TRANSACTION_INVALID: declaration journal for batch ${batchId} is unreadable and was retained.`);
    }
    try {
      const value: unknown = JSON.parse(raw);
      if (!isBatchDeclarationJournal(value) || value.batch_id !== batchId) throw new Error("invalid");
      this.assertBatchJournalWorkspace(value);
      return value;
    } catch {
      throw new Error(`BATCH_TRANSACTION_INVALID: declaration journal for batch ${batchId} is malformed and was retained.`);
    }
  }

  private async listBatchManifests(): Promise<BatchDeclarationJournal[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(this.paths.batchTransactionsDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new Error(`BATCH_TRANSACTION_INVALID: batch declaration manifests are unreadable.`);
    }
    const manifests: BatchDeclarationJournal[] = [];
    const owners = new Map<string, string>();
    for (const entry of entries.sort()) {
      // Atomic/exclusive writers may leave their narrowly named adjacent temp
      // after a hard process stop. It is never authoritative; every other
      // unexpected entry still fails closed.
      if (/^\.[0-9a-f]{64}\.json\.tmp-\d+-\d+$/u.test(entry)) continue;
      if (!/^[0-9a-f]{64}\.json$/u.test(entry)) {
        throw new Error(`BATCH_TRANSACTION_INVALID: unexpected batch declaration manifest ${entry} was retained.`);
      }
      let raw: string;
      try {
        raw = await readText(path.join(this.paths.batchTransactionsDir, entry));
      } catch {
        throw new Error(`BATCH_TRANSACTION_INVALID: batch declaration manifest ${entry} is unreadable and was retained.`);
      }
      let value: BatchDeclarationJournal;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isBatchDeclarationJournal(parsed) || `${sha256(parsed.batch_id)}.json` !== entry) throw new Error("invalid");
        this.assertBatchJournalWorkspace(parsed);
        value = parsed;
      } catch {
        throw new Error(`BATCH_TRANSACTION_INVALID: batch declaration manifest ${entry} is malformed and was retained.`);
      }
      // Cross-record ownership is a valid-record conflict, not malformed JSON.
      // Keep its durable diagnosis outside the parse catch so operators know
      // which two manifests must be preserved and reconciled.
      for (const member of value.members) {
        const prior = owners.get(member);
        if (prior && prior !== value.batch_id) {
          throw new Error(`BATCH_TRANSACTION_INVALID: "${member}" is named by overlapping batch manifests ${prior} and ${value.batch_id}; both were retained.`);
        }
        owners.set(member, value.batch_id);
      }
      manifests.push(value);
    }
    return manifests;
  }

  private async assertNoPendingBatchMutation(id: string): Promise<void> {
    const pending = (await this.listBatchManifests()).find((manifest) => manifest.state !== "active" && manifest.members.includes(id));
    if (pending) {
      throw new Error(
        `${pending.state === "pending" ? "BATCH_TRANSACTION_PENDING" : "BATCH_ACTIVE"}: "${id}" belongs to ${pending.state} batch ` +
          `${pending.batch_id}; ${pending.state === "pending" ? "retry the exact declaring take" : "finish idempotent release"} before mutating member evidence.`,
      );
    }
  }

  private async batchTicketCensus(): Promise<Item[]> {
    const listed = await this.listItemsWithWarnings({ type: "ticket", includeArchived: true });
    if (listed.warnings.length > 0) {
      throw new Error(
        `BATCH_INCONSISTENT: complete ticket census has ${listed.warnings.length} unreadable item file(s): ` +
          listed.warnings.map((warning) => `${warning.file}: ${warning.message}`).join("; "),
      );
    }
    return listed.items;
  }

  private async readManifestMembers(manifest: BatchDeclarationJournal, census?: Item[]): Promise<Item[]> {
    // A census proves no hidden duplicate/extra stamp; direct reads bind every
    // authoritative endpoint to bytes observed inside the caller's lock.
    if (!census) await this.batchTicketCensus();
    const members: Item[] = [];
    for (const id of manifest.members) {
      const loc = await this.locateItem(id);
      if (!loc) throw new Error(`BATCH_INCONSISTENT: manifest member "${id}" is missing from batch ${manifest.batch_id}.`);
      const member = parseItem(await readText(loc.file));
      if (member.id !== id || member.type !== "ticket") {
        throw new Error(`BATCH_INCONSISTENT: manifest member "${id}" is not a readable ticket endpoint for batch ${manifest.batch_id}.`);
      }
      members.push(member);
    }
    return members;
  }

  private batchStateOf(
    batchId: string,
    tickets: Item[],
    journal: BatchDeclarationJournal | null = null,
  ): BatchState {
    const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
    const memberIds = journal?.members ?? KanmerStore.batchMembersOf(batchId, tickets).map((member) => member.id).sort((a, b) => a.localeCompare(b));
    const members = memberIds.map((id) => byId.get(id));
    const taken = members.find((member) => member?.taken_at);
    const present = members.filter((member): member is Item => member !== undefined);
    const controllers = new Set(present.map((m) => m.lease_batch_controller).filter((value): value is string => Boolean(value)));
    const controllerRuns = new Set(present.map((m) => m.lease_controller_run).filter((value): value is string => Boolean(value)));
    const frozen = new Set(present.map((m) => m.lease_batch_frozen_at).filter((value): value is string => Boolean(value)));
    const fullyStamped = present.length > 0 && present.every((member) =>
      member.lease_batch === batchId &&
      member.lease_batch_controller !== undefined &&
      member.lease_batch_frozen_at !== undefined
    );
    const manifestConsistent = (journal?.state === "active" || journal?.state === "releasing") && members.every((member) => {
      if (!member) return false;
      const activeLease = member.taken_at
        ? Boolean(
            member.branch === journal.branch && member.lease_workspace === journal.workspace &&
            this.workspaceKey(member.worktree, member.branch) === journal.workspace &&
            member.lease_id && member.lease_revision && member.claim_expires_at &&
            member.lease_phase && member.lease_heartbeat_at &&
            member.lease_controller_run === journal.controller_run
          )
        : !hasWorkspaceLeaseResidue(member);
      const stamped = member.lease_batch === batchId &&
        member.lease_batch_controller === journal.controller &&
        member.lease_batch_frozen_at === journal.frozen_at &&
        activeLease;
      const clearedTerminal = journal.state === "releasing" && isTerminalTicket(member) &&
        !member.taken_at && !hasClaimResidue(member);
      return stamped || clearedTerminal;
    }) && KanmerStore.batchMembersOf(batchId, tickets).every((member) => journal.members.includes(member.id));
    const consistent = journal ? manifestConsistent : (fullyStamped && controllers.size === 1 && frozen.size === 1);
    return {
      id: batchId,
      controller: journal?.controller ?? (controllers.size === 1 ? [...controllers][0]! : null),
      controllerRun: journal?.controller_run ?? (controllerRuns.size === 1 ? [...controllerRuns][0]! : null),
      frozenAt: journal?.frozen_at ?? (frozen.size === 1 ? [...frozen][0]! : null),
      declaration: journal?.state === "pending" ? "pending" : (consistent ? "consistent" : "inconsistent"),
      workspace: journal?.workspace ?? taken?.lease_workspace ?? (taken?.branch ? `branch:${taken.branch}` : null),
      members: memberIds.map((id, index) => {
        const member = members[index];
        return {
          id,
          exists: Boolean(member),
          status: member?.status ?? "missing",
          archived: member?.archived === true,
          terminal: member ? isTerminalTicket(member) : false,
          taken: Boolean(member?.taken_at),
        };
      }),
      allTerminal: members.length > 0 && members.every((member) => member !== undefined && isTerminalTicket(member)),
    };
  }

  /** The frozen batch a ticket belongs to, or null in isolated mode. Read-only. */
  async batchStateFromSnapshot(id: string, tickets: Item[]): Promise<BatchState | null> {
    const item = tickets.find((ticket) => ticket.id === id && ticket.type === "ticket");
    const manifests = await this.listBatchManifests();
    const manifest = manifests.find((entry) => entry.members.includes(id)) ??
      (item?.lease_batch ? manifests.find((entry) => entry.batch_id === item.lease_batch) : undefined) ?? null;
    if (manifest) return this.batchStateOf(manifest.batch_id, tickets, manifest);
    if (item?.lease_batch) {
      return { ...this.batchStateOf(item.lease_batch, tickets), declaration: "inconsistent" };
    }
    if (item && hasBatchOwnership(item)) {
      throw new Error(`BATCH_INCONSISTENT: "${id}" has batch ownership fields without a resolvable batch id and authoritative manifest.`);
    }
    return null;
  }

  /** The frozen batch a ticket belongs to, or null in isolated mode. Read-only. */
  async batchState(id: string): Promise<BatchState | null> {
    const item = await this.getItem(id);
    if (!item || item.type !== "ticket") return null;
    const tickets = await this.batchTicketCensus();
    const manifests = await this.listBatchManifests();
    if (item.lease_batch) {
      const manifest = manifests.find((entry) => entry.batch_id === item.lease_batch) ?? null;
       const direct = manifest ? await this.readManifestMembers(manifest, tickets) : [];
      const directById = new Map(direct.map((member) => [member.id, member]));
      const state = this.batchStateOf(
        item.lease_batch,
        tickets.map((ticket) => directById.get(ticket.id) ?? ticket),
        manifest,
      );
      return manifest ? state : { ...state, declaration: "inconsistent" };
    }
    for (const manifest of manifests) {
      if (manifest.members.includes(id)) {
        const direct = await this.readManifestMembers(manifest, tickets);
        const directById = new Map(direct.map((member) => [member.id, member]));
        return this.batchStateOf(
          manifest.batch_id,
          tickets.map((ticket) => directById.get(ticket.id) ?? ticket),
          manifest,
        );
      }
    }
    if (hasBatchOwnership(item)) {
      throw new Error(`BATCH_INCONSISTENT: "${id}" has batch ownership fields without a resolvable batch id and authoritative manifest.`);
    }
    return null;
  }

  /**
   * One authoritative manifest projection per member for list/search results.
   * The manifest remains visible through the final-clear interruption, after
   * every ticket-local batch/workspace field has already been removed.
   */
  async batchSummaryProjections(): Promise<Map<string, BatchSummaryProjection>> {
    const projected = new Map<string, BatchSummaryProjection>();
    for (const manifest of await this.listBatchManifests()) {
      const summary: BatchSummaryProjection = {
        id: manifest.batch_id,
        controller: manifest.controller,
        frozenAt: manifest.frozen_at,
        state: manifest.state,
        members: [...manifest.members],
        workspace: manifest.workspace,
        branch: manifest.branch,
      };
      for (const member of manifest.members) projected.set(member, summary);
    }
    return projected;
  }

  /**
   * Validate a batch declaration: the taker names the complete membership
   * (two or more distinct ids including itself); every member must be an
   * existing, unarchived, non-terminal, untaken ticket that belongs to no
   * other batch; and the batch id must not already be frozen. Returns the
   * sibling items to stamp. Refuses before anything is written.
   */
  private static validateBatchDeclaration(id: string, batchId: string, memberIds: string[], tickets: Item[]): Item[] {
    const ids = Array.from(new Set(memberIds.map((m) => m.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    if (ids.length < 2) {
      throw new Error(`BATCH_INVALID: batch ${batchId} needs two or more distinct member ids (got ${ids.length}); isolated mode needs no batch.`);
    }
    if (!ids.includes(id)) {
      throw new Error(`BATCH_INVALID: "${id}" must be one of the members of batch ${batchId} it declares (${ids.join(", ")}).`);
    }
    const byId = new Map(tickets.map((t) => [t.id, t]));
    const members: Item[] = [];
    for (const memberId of ids) {
      const member = byId.get(memberId);
      if (!member) throw new Error(`BATCH_INVALID: batch ${batchId} names "${memberId}", which is not a ticket on this board.`);
      if (member.archived) throw new Error(`BATCH_INVALID: batch ${batchId} names archived ticket "${memberId}".`);
      if (isTerminalTicket(member)) throw new Error(`BATCH_INVALID: batch ${batchId} names "${memberId}", which is already ${member.status}.`);
      if (member.lease_batch !== undefined && member.lease_batch !== batchId) {
        throw new Error(`BATCH_INVALID: "${memberId}" already belongs to batch ${member.lease_batch}; a ticket is a member of one batch.`);
      }
      if (member.taken_at) {
        throw new Error(`BATCH_INVALID: "${memberId}" is already taken (${member.branch ?? "no branch"}); a batch is declared before its members start.`);
      }
      if (hasClaimResidue(member)) {
        throw new Error(`BATCH_INVALID: "${memberId}" has residual claim, workspace, lease or batch ownership fields; reconcile it before declaring a batch.`);
      }
      members.push(member);
    }
    return members;
  }

  private static batchAfterItem(manifest: BatchPendingManifest, observed: Item, id: string): Item {
    const next: Item = {
      ...observed,
      lease_batch: manifest.batch_id,
      lease_batch_controller: manifest.controller,
      lease_batch_frozen_at: manifest.frozen_at,
      updated: manifest.frozen_at,
    };
    if (id !== manifest.take.ticket_id) return next;
    next.status = manifest.take.stage;
    next.taken_at = manifest.frozen_at;
    next.branch = manifest.branch;
    if (manifest.take.worktree !== null) next.worktree = manifest.take.worktree;
    else delete next.worktree;
    if (manifest.take.assignee !== null) next.assignee = manifest.take.assignee;
    next.claim_expires_at = manifest.claim_expires_at;
    const visibleController = manifest.take.controller_label ?? manifest.take.assignee ?? next.assignee;
    if (visibleController) next.claim_controller = visibleController;
    else delete next.claim_controller;
    next.lease_id = manifest.lease_id;
    next.lease_revision = 1;
    next.lease_workspace = manifest.workspace;
    next.lease_phase = manifest.take.phase;
    next.lease_heartbeat_at = manifest.frozen_at;
    delete next.lease_reclaimed_from;
    const set = (key: "lease_controller_run" | "lease_worker_run" | "lease_provider", value: string | null) => {
      if (value) next[key] = value;
      else delete next[key];
    };
    set("lease_controller_run", manifest.take.controller_run);
    set("lease_worker_run", manifest.take.worker_run);
    set("lease_provider", manifest.take.provider);
    return next;
  }

  private static assertBatchAfterItem(manifest: BatchPendingManifest, intended: Item, id: string): void {
    const isTaker = id === manifest.take.ticket_id;
    if (
      intended.id !== id || intended.lease_batch !== manifest.batch_id ||
      intended.lease_batch_controller !== manifest.controller ||
      intended.lease_batch_frozen_at !== manifest.frozen_at ||
      (isTaker && (
        intended.taken_at !== manifest.frozen_at || intended.branch !== manifest.branch ||
        intended.lease_workspace !== manifest.workspace || intended.status !== manifest.take.stage ||
        intended.lease_phase !== manifest.take.phase || intended.lease_id !== manifest.lease_id ||
        intended.claim_expires_at !== manifest.claim_expires_at || intended.lease_revision !== 1 ||
        intended.lease_controller_run !== manifest.controller_run
      )) ||
      (!isTaker && (
        intended.taken_at !== undefined || intended.branch !== undefined || intended.worktree !== undefined ||
        intended.claim_expires_at !== undefined || intended.claim_controller !== undefined ||
        intended.lease_id !== undefined || intended.lease_revision !== undefined || intended.lease_workspace !== undefined ||
        intended.lease_phase !== undefined || intended.lease_heartbeat_at !== undefined || intended.lease_reclaimed_from !== undefined ||
        intended.lease_controller_run !== undefined || intended.lease_worker_run !== undefined || intended.lease_provider !== undefined
      ))
    ) {
      throw new Error(`BATCH_TRANSACTION_INVALID: batch ${manifest.batch_id} contains an invalid intended record for "${id}" and was retained.`);
    }
  }

  private async applyBatchDeclaration(journal: BatchPendingManifest, tickets: Item[]): Promise<void> {
    if (journal.state !== "pending") {
      throw new Error(`BATCH_TRANSACTION_INVALID: batch ${journal.batch_id} transaction ${journal.transaction_id} is not pending.`);
    }
    const frozen = KanmerStore.batchMembersOf(journal.batch_id, tickets);
    const extras = frozen.filter((member) => !journal.members.includes(member.id)).map((member) => member.id).sort();
    if (extras.length > 0) {
      throw new Error(
        `BATCH_TRANSACTION_CONFLICT: batch ${journal.batch_id} has members outside transaction ${journal.transaction_id}: ${extras.join(", ")}. The journal was retained.`,
      );
    }

    // Preflight every member before the first write. A current file must be
    // either the exact bytes observed by the intent or the exact intended
    // result of a prior interrupted roll-forward.
    const states: Array<{ file: string; write: BatchDeclarationWrite; state: "before" | "after"; after?: string }> = [];
    for (const write of journal.writes) {
      const loc = await this.locateItem(write.id);
      if (!loc) {
        throw new Error(`BATCH_TRANSACTION_CONFLICT: member "${write.id}" disappeared during batch ${journal.batch_id} declaration. The journal was retained.`);
      }
      const raw = await readText(loc.file);
      const digest = sha256(raw);
      const state = digest === write.before_sha256 ? "before" : digest === write.after_sha256 ? "after" : null;
      if (!state) {
        throw new Error(`BATCH_TRANSACTION_CONFLICT: member "${write.id}" differs from both the observed and intended bytes for batch ${journal.batch_id}. The journal was retained.`);
      }
      const observed = parseItem(raw);
      if (state === "before" && write.id === journal.take.ticket_id && observed.status !== journal.take.from_stage) {
        throw new Error(
          `BATCH_TRANSACTION_CONFLICT: declaring ticket "${write.id}" is no longer in frozen source stage ${journal.take.from_stage}; the journal was retained.`,
        );
      }
      const intended = state === "before"
        ? KanmerStore.batchAfterItem(journal, observed, write.id)
        : observed;
      KanmerStore.assertBatchAfterItem(journal, intended, write.id);
      if (write.id === journal.take.ticket_id) {
        if (await this.documentStateHash(loc) !== journal.documents_sha256) {
          throw new Error(`BATCH_TRANSACTION_CONFLICT: document-inclusive evidence for "${write.id}" changed during batch ${journal.batch_id} declaration.`);
        }
        if (loc.kind === "v2" && journal.take.stage !== journal.take.from_stage) {
          await this.assertDocGate(
            loc.dir,
            await this.getBoard(),
            { ...intended, status: journal.take.from_stage },
            journal.take.from_stage,
            journal.take.stage,
          );
        }
      }
      const after = state === "before" ? serialiseItem(intended) : undefined;
      if (after !== undefined && sha256(after) !== write.after_sha256) {
        throw new Error(`BATCH_TRANSACTION_INVALID: derived after-image for "${write.id}" does not match batch ${journal.batch_id}'s frozen hash.`);
      }
      states.push({ file: loc.file, write, state, after });
    }
    for (const entry of states) {
      if (entry.state === "before") await writeFileAtomic(entry.file, entry.after!);
    }
    for (const entry of states) {
      if (sha256(await readText(entry.file)) !== entry.write.after_sha256) {
        throw new Error(`BATCH_TRANSACTION_CONFLICT: member "${entry.write.id}" did not reach the intended bytes for batch ${journal.batch_id}. The journal was retained.`);
      }
    }
    // The same durable record becomes the active authoritative manifest. It
    // is retained through sequential release so a cleared ticket cannot make
    // the original roster shrink.
    const active: BatchActiveManifest = {
      schema: journal.schema,
      state: "active",
      request_sha256: journal.request_sha256,
      declaring_ticket: journal.take.ticket_id,
      batch_id: journal.batch_id,
      controller: journal.controller,
      controller_run: journal.controller_run,
      frozen_at: journal.frozen_at,
      members: journal.members,
      workspace: journal.workspace,
      branch: journal.branch,
    };
    await writeFileAtomic(this.batchTransactionFile(journal.batch_id), `${JSON.stringify(active, null, 2)}\n`);
  }

  private async declareBatchAndTake(
    id: string,
    batchId: string,
    memberIds: string[],
    actor: string,
    input: TakeTicketInput,
    stage: string,
    expiryMinutes: number,
  ): Promise<{ item: Item; activated: boolean }> {
    const requested = Array.from(new Set(memberIds.map((member) => member.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const workspace = this.workspaceKey(input.worktree, input.branch)!;
    const manifests = await this.listBatchManifests();
    const existingJournal = manifests.find((manifest) => manifest.batch_id === batchId) ?? null;
    const controllerRun = input.controllerRun?.trim() || "";
    if (!controllerRun) {
      throw new Error(`BATCH_RUN_REQUIRED: batch ${batchId} requires the durable controller_run on declaration and every member operation.`);
    }
    const requestSha256 = batchRequestSha256(batchId, id, actor, controllerRun, requested, input, stage);
    const currentForIntent = await this.getItem(id);
    const intent: BatchTakeIntent = {
      ticket_id: id,
      branch: input.branch,
      worktree: input.worktree ?? null,
      stage,
      from_stage: existingJournal?.state === "pending" ? existingJournal.take.from_stage : (currentForIntent?.status ?? stage),
      assignee: input.assignee ?? null,
      controller_label: input.controller ?? null,
      controller_run: controllerRun,
      worker_run: input.workerRun ?? null,
      provider: input.provider ?? null,
      phase: input.phase ?? "implementing",
      expected_revision: input.expectedRevision ?? null,
      force: input.force === true,
    };
    if (existingJournal) {
      if (existingJournal.controller !== actor) {
        throw new Error(
          `BATCH_OWNER_MISMATCH: batch ${batchId} belongs to ${existingJournal.controller}; ${actor} cannot resume or redeclare it.`,
        );
      }
      if (existingJournal.controller_run !== controllerRun) {
        throw new Error(
          `BATCH_OWNER_MISMATCH: batch ${batchId} belongs to controller run ${existingJournal.controller_run}; ` +
            `${controllerRun} cannot resume or redeclare it.`,
        );
      }
      if (
        existingJournal.members.join("\0") !== requested.join("\0") ||
        existingJournal.workspace !== workspace || existingJournal.branch !== input.branch ||
        existingJournal.request_sha256 !== requestSha256
      ) {
        if (existingJournal.state === "pending") {
          throw new Error(
            `BATCH_TRANSACTION_CONFLICT: batch ${batchId} transaction ${existingJournal.transaction_id} belongs to ` +
              `${existingJournal.controller} with roster ${existingJournal.members.join(", ")} and a different first-take intent; the journal was retained.`,
          );
        }
        throw new Error(
          `BATCH_FROZEN: batch ${batchId} started when "${existingJournal.declaring_ticket}" was taken; ` +
            `its actor, sorted roster, workspace, branch and first-take intent are immutable.`,
        );
      }
      if (existingJournal.state === "pending") {
        await this.applyBatchDeclaration(existingJournal, await this.batchTicketCensus());
        const item = await this.getItem(id);
        if (!item) throw new Error(`BATCH_TRANSACTION_CONFLICT: declaring ticket "${id}" disappeared after batch ${batchId} activation.`);
        return { item, activated: true };
      }
      if (existingJournal.state !== "active") {
        throw new Error(
          `BATCH_FROZEN: batch ${batchId} is ${existingJournal.state}; its declaring take is no longer an idempotent response-loss retry target.`,
        );
      }
      if (existingJournal.declaring_ticket !== id) {
        throw new Error(`BATCH_FROZEN: batch ${batchId} was declared by "${existingJournal.declaring_ticket}"; "${id}" is not its response-loss retry target.`);
      }
      const tickets = await this.batchTicketCensus();
      const direct = await this.readManifestMembers(existingJournal, tickets);
      const directById = new Map(direct.map((member) => [member.id, member]));
      const state = this.batchStateOf(
        batchId,
        tickets.map((ticket) => directById.get(ticket.id) ?? ticket),
        existingJournal,
      );
      if (state.declaration !== "consistent") {
        throw new Error(
          `BATCH_INCONSISTENT: batch ${batchId}'s complete roster is missing, contradictory or has an extra stamped member; the manifest was retained.`,
        );
      }
      const current = directById.get(id)!;
      if (
        current.lease_batch !== batchId || current.lease_batch_controller !== actor ||
        current.lease_batch_frozen_at !== existingJournal.frozen_at || current.taken_at !== existingJournal.frozen_at ||
        current.branch !== existingJournal.branch || current.lease_workspace !== existingJournal.workspace ||
        current.lease_controller_run !== existingJournal.controller_run
      ) {
        throw new Error(`BATCH_FROZEN: batch ${batchId} is already active and its declaring take is no longer an idempotent retry target.`);
      }
      if (current.updated !== existingJournal.frozen_at) {
        throw new Error(`BATCH_FROZEN: batch ${batchId} is already active and its declaring take is no longer an idempotent retry target.`);
      }
      return { item: current, activated: false };
    }

    const overlap = manifests.find((manifest) =>
      manifest.batch_id !== batchId && manifest.members.some((member) => requested.includes(member))
    );
    if (overlap) {
      const members = overlap.members.filter((member) => requested.includes(member));
      throw new Error(
        `BATCH_INVALID: "${members[0]}" already belongs to batch ${overlap.batch_id}; ` +
          `batch ${batchId} was not created.`,
      );
    }
    const tickets = await this.batchTicketCensus();
    const frozen = KanmerStore.batchMembersOf(batchId, tickets);
    if (frozen.length > 0) {
      throw new Error(`BATCH_INCONSISTENT: batch ${batchId} has ticket stamps but no authoritative manifest; no declaration bytes were changed.`);
    }

    const members = KanmerStore.validateBatchDeclaration(id, batchId, requested, tickets);
    const frozenAt = nowIso();
    const leaseId = randomUUID();
    const claimExpiresAt = new Date(Date.parse(frozenAt) + expiryMinutes * 60_000).toISOString();
    const declaringLoc = await this.locateItem(id);
    if (!declaringLoc) throw new Error(`BATCH_INVALID: declaring ticket "${id}" disappeared while batch ${batchId} was being declared.`);
    const documentsSha256 = await this.documentStateHash(declaringLoc);
    const writes: BatchDeclarationWrite[] = [];
    const journal: BatchPendingManifest = {
      schema: BATCH_DECLARATION_SCHEMA,
      state: "pending",
      transaction_id: randomUUID(),
      request_sha256: requestSha256,
      batch_id: batchId,
      controller: actor,
      controller_run: controllerRun,
      frozen_at: frozenAt,
      members: requested,
      workspace,
      branch: input.branch,
      take: intent,
      lease_id: leaseId,
      claim_expires_at: claimExpiresAt,
      documents_sha256: documentsSha256,
      writes,
    };
    for (const member of members) {
      const loc = await this.locateItem(member.id);
      if (!loc) throw new Error(`BATCH_INVALID: member "${member.id}" disappeared while batch ${batchId} was being declared.`);
      const before = await readText(loc.file);
      const observed = parseItem(before);
      if (
        observed.id !== member.id || observed.taken_at || observed.lease_batch || hasClaimResidue(observed) ||
        (observed.id === id && observed.status !== intent.from_stage)
      ) {
        throw new Error(`BATCH_INVALID: member "${member.id}" changed while batch ${batchId} was being declared; retry from a fresh board read.`);
      }
      const afterItem = KanmerStore.batchAfterItem(journal, observed, member.id);
      const after = serialiseItem(afterItem);
      writes.push({ id: member.id, before_sha256: sha256(before), after_sha256: sha256(after) });
    }
    if (!isBatchDeclarationJournal(journal)) {
      throw new Error(
        `BATCH_TRANSACTION_INVALID: derived declaration journal for batch ${batchId} failed validation before any durable intent was written.`,
      );
    }
    this.assertBatchJournalWorkspace(journal);
    await ensureDir(this.paths.batchTransactionsDir);
    try {
      await writeFileExclusive(this.batchTransactionFile(batchId), `${JSON.stringify(journal, null, 2)}\n`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Error(`BATCH_TRANSACTION_PENDING: batch ${batchId} gained another declaration journal; retry so its exact owner and roster can be verified.`);
      }
      throw error;
    }
    await this.applyBatchDeclaration(journal, tickets);
    const item = await this.getItem(id);
    if (!item) throw new Error(`BATCH_TRANSACTION_CONFLICT: declaring ticket "${id}" disappeared after batch ${batchId} activation.`);
    return { item, activated: true };
  }

  private static clearLeaseFields(next: Item): void {
    delete next.lease_batch;
    delete next.lease_batch_controller;
    delete next.lease_batch_frozen_at;
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
    if (!input.branch || input.branch.trim() !== input.branch) {
      throw new Error(`WORKSPACE_INVALID: branch must be non-empty and must not have leading or trailing whitespace.`);
    }
    if (input.worktree !== undefined && (!input.worktree || input.worktree.trim() !== input.worktree)) {
      throw new Error(`WORKSPACE_INVALID: worktree must be non-empty and must not have leading or trailing whitespace.`);
    }
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
      let loc = await this.locateItem(id);
      if (!loc) throw new Error(`No item with id "${id}"`);
      let current = parseItem(await readText(loc.file));
      if (current.type !== "ticket") {
        throw new Error(`Only tickets can be taken; "${id}" is a ${current.type}`);
      }
      // FRD-032. `assertDocGate` below already refuses a capture any move into
      // a working stage, but a take naming the stage the capture is already in
      // never reaches it — and a taken capture is exactly what would then start
      // appearing as an expired claim. So refuse the take itself.
      if (isCaptureItem(current)) {
        throw new Error(
          `CAPTURE_NOT_PROMOTED: "${id}" is a quick capture and cannot be taken. ` +
            `Promote it first with update_item capture_disposition ("promoted" or "batch", ` +
            `together with the profile it should carry); until then it holds no claim, ` +
            `no workspace and no lease.`,
        );
      }
      const board = await this.getBoard();
      const timing = leaseConfig(board);
      const batchActor = input.actor?.trim() || this.actor;
      const batchId = input.batch?.trim() || undefined;
      if (input.batchMembers !== undefined && batchId === undefined) {
        throw new Error(`BATCH_INVALID: "${id}" declares batch members without a batch id.`);
      }
      let stage = input.stage;
      if (stage !== undefined) assertStage(stage);
      else stage = "implementing";
      const declarationManifest = batchId === undefined ? null : await this.readBatchJournal(batchId);
      if (input.batchMembers !== undefined) {
        // On a fresh declaration the caller's revision and document gate are
        // preconditions to the complete transaction. On recovery, those exact
        // preconditions are already frozen in the pending intent and current
        // bytes may legitimately be an after-image.
        if (!declarationManifest) {
          await this.assertRevision(loc, id, input.expectedRevision);
          if (stage !== current.status && loc.kind === "v2") {
            await this.assertDocGate(loc.dir, board, current, current.status, stage);
          }
        }
        const declared = await this.declareBatchAndTake(
          id,
          batchId!,
          input.batchMembers,
          batchActor,
          input,
          stage,
          timing.expiryMinutes,
        );
        if (declared.activated) {
          await appendActivity(this.paths, [
            this.activity(id, "take", { field: "branch", to: input.branch }),
            ...(declared.item.status !== current.status
              ? [this.activity(id, "update", { field: "status", from: current.status, to: declared.item.status })]
              : []),
          ]);
        }
        return declared.item;
      }
      await this.assertRevision(loc, id, input.expectedRevision);
      await this.assertNoPendingBatchMutation(id);
      if (!current.lease_batch && (current.lease_batch_controller || current.lease_batch_frozen_at)) {
        throw new Error(`BATCH_INCONSISTENT: "${id}" has orphan batch ownership fields; no workspace lease was written.`);
      }
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
      // Batch workspace (CORE-124): resolve the batch this take belongs to and,
      // when the membership is declared here, validate it before any write.
      if (batchId !== undefined && current.lease_batch !== undefined && current.lease_batch !== batchId) {
        throw new Error(`BATCH_INVALID: "${id}" is a frozen member of batch ${current.lease_batch}, not ${batchId}.`);
      }
      if (batchId !== undefined && declarationManifest?.state === "pending") {
        throw new Error(
          `BATCH_TRANSACTION_PENDING: batch ${batchId} has an interrupted declaration; retry with the exact batch_members roster so its owner and intended bytes can be verified.`,
        );
      }
      const effectiveBatch = current.lease_batch ?? batchId;
      const batchControllerRun = effectiveBatch === undefined ? undefined : input.controllerRun?.trim();
      if (effectiveBatch !== undefined && !batchControllerRun) {
        throw new Error(
          `BATCH_RUN_REQUIRED: batch ${effectiveBatch} requires the durable controller_run on declaration and every member operation.`,
        );
      }
      const tickets = effectiveBatch === undefined
        ? await this.listItems({ type: "ticket", includeArchived: true })
        : await this.batchTicketCensus();
      if (batchId !== undefined && current.lease_batch === undefined) {
        throw new Error(
          `BATCH_INVALID: "${id}" is not a member of batch ${batchId}; membership was frozen when the batch started, ` +
          `so declare the full membership with batch_members on the first take or take this ticket in isolation.`,
        );
      }
      if (effectiveBatch !== undefined) {
        const manifest = declarationManifest?.batch_id === effectiveBatch
          ? declarationManifest
          : await this.readBatchJournal(effectiveBatch);
        if (!manifest) {
          throw new Error(`BATCH_INCONSISTENT: batch ${effectiveBatch} has no authoritative manifest; no lease was written.`);
        }
        const direct = await this.readManifestMembers(manifest, tickets);
        const directById = new Map(direct.map((member) => [member.id, member]));
        const state = this.batchStateOf(
          effectiveBatch,
          tickets.map((ticket) => directById.get(ticket.id) ?? ticket),
          manifest,
        );
        if (state.declaration !== "consistent") {
          throw new Error(`BATCH_INCONSISTENT: batch ${effectiveBatch}'s membership, controller or frozen timestamp is incomplete; no lease was written.`);
        }
        if (state.controller !== batchActor) {
          throw new Error(`BATCH_OWNER_MISMATCH: batch ${effectiveBatch} belongs to ${state.controller ?? "an unknown actor"}; ${batchActor} cannot take a member.`);
        }
        if (state.controllerRun !== batchControllerRun) {
          throw new Error(
            `BATCH_OWNER_MISMATCH: batch ${effectiveBatch} belongs to controller run ${state.controllerRun ?? "an unknown run"}; ` +
              `${batchControllerRun} cannot take a member.`,
          );
        }
        const requestedWorkspace = this.workspaceKey(input.worktree, input.branch);
        if (input.branch !== manifest.branch || requestedWorkspace !== manifest.workspace) {
          const recordedWorkspace = manifest.workspace.startsWith("worktree:")
            ? `worktree ${path.relative(this.paths.repoRoot, manifest.workspace.slice("worktree:".length)).replaceAll("\\", "/")} on branch ${manifest.branch}`
            : `branch ${manifest.branch}`;
          throw new Error(
            `BATCH_WORKSPACE_MISMATCH: batch ${effectiveBatch} owns ${recordedWorkspace}; ` +
              `the requested ${requestedWorkspace ?? "workspace"} on branch ${input.branch} is not its frozen workspace.`,
          );
        }
      }
      await this.assertWorkspaceFree(id, input.worktree, input.branch, effectiveBatch, batchActor, batchControllerRun, tickets);
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
      KanmerStore.applyRunIdentity(next, {
        ...input,
        ...(batchControllerRun !== undefined ? { controllerRun: batchControllerRun } : {}),
      }, false);
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
      const manifests = await this.listBatchManifests();
      let manifest = manifests.find((entry) => entry.members.includes(id)) ?? null;
      if (manifest?.state === "pending") {
        throw new Error(`BATCH_TRANSACTION_PENDING: batch ${manifest.batch_id}'s declaration must be recovered before a member can be released.`);
      }
      const clearedReleaseRetry = manifest?.state === "releasing" && isTerminalTicket(current) &&
        !current.taken_at && !hasClaimResidue(current);
      // The first clear remains revision-bound. Once a releasing manifest and
      // the member's fully cleared terminal bytes prove that clear committed,
      // a response-loss retry may finish manifest cleanup with the original
      // (now necessarily stale) revision without rewriting the ticket.
      if (!clearedReleaseRetry) await this.assertRevision(loc, id, opts.expectedRevision);
      if (!manifest && hasBatchOwnership(current)) {
        throw new Error(`BATCH_INCONSISTENT: "${id}" records batch ownership fields but its authoritative manifest is missing; no release fields were cleared.`);
      }
      if (manifest) {
        // Cleanup is bound to the immutable manifest roster, including this
        // caller and members whose own batch fields were cleared by an earlier
        // sequential release.
        const tickets = await this.batchTicketCensus();
        const direct = await this.readManifestMembers(manifest, tickets);
        const directById = new Map(direct.map((member) => [member.id, member]));
        const state = this.batchStateOf(
          manifest.batch_id,
          tickets.map((ticket) => directById.get(ticket.id) ?? ticket),
          manifest,
        );
        if (state.declaration !== "consistent") {
          throw new Error(`BATCH_INCONSISTENT: batch ${manifest.batch_id} has a missing or contradictory manifest member; no release fields were cleared.`);
        }
        const pending = state.members.filter((m) => !m.terminal);
        if (pending.length > 0) {
          throw new Error(
            `BATCH_ACTIVE: "${id}" shares batch ${manifest.batch_id}'s workspace with ${pending.map((m) => `"${m.id}" (${m.status})`).join(", ")}; ` +
              `release and cleanup wait until every member is Done or archived.`,
          );
        }
        if (manifest.state === "active") {
          manifest = { ...manifest, state: "releasing" };
          await writeFileAtomic(this.batchTransactionFile(manifest.batch_id), `${JSON.stringify(manifest, null, 2)}\n`);
        }
        if (clearedReleaseRetry) {
          const allCleared = direct.every((member) => isTerminalTicket(member) &&
            !member.taken_at && !hasClaimResidue(member));
          if (allCleared) await removeFile(this.batchTransactionFile(manifest.batch_id));
          return current;
        }
      }
      if (!current.taken_at && !current.branch && !current.worktree && !current.lease_id && !current.lease_batch && !manifest) return current;
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
      if (manifest) {
        const members = await this.readManifestMembers(manifest);
        const allCleared = members.every((member) => member && isTerminalTicket(member) &&
          !member.taken_at && !hasClaimResidue(member));
        if (allCleared) await removeFile(this.batchTransactionFile(manifest.batch_id));
      }
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
      await this.assertNoPendingBatchMutation(id);
      const current = parseItem(await readText(loc.file));
      if (current.type !== "ticket") {
        throw new Error(`Only tickets can be transferred; "${id}" is a ${current.type}`);
      }
      const batch = (await this.listBatchManifests()).find((manifest) => manifest.members.includes(id));
      if (hasBatchOwnership(current) && !batch) {
        throw new Error(`BATCH_INCONSISTENT: "${id}" has batch ownership fields without an authoritative manifest; transfer is refused.`);
      }
      if (batch) {
        throw new Error(
          `BATCH_INVALID: "${id}" belongs to batch ${batch.batch_id}; per-member transfer and reconciliation recovery are refused ` +
            `until a batch-wide transfer policy exists.`,
        );
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
   * Apply ONE reconciliation action proposed by the FRD-028 inspector
   * (CORE-131). This is a dispatcher, not a mutation path: every branch reaches
   * an existing verb — `moveItem`, `releaseTicket` or `transferTicket` — and
   * hands it the caller's `expectedRevision`. The dispatcher holds the same
   * re-entrant `withLeaseLock` section as release and ticket writes. The full
   * release snapshot is read outside that lock and bracketed by the constant-size
   * transaction epoch; the exact epoch is rechecked inside before the existing
   * verb runs. This makes release observation, ticket CAS and mutation one
   * consistency boundary without an unbounded history scan in the critical section.
   *
   * `expectedRevision` still comes from the caller — bound to the evidence the
   * recommendation was computed from — and the existing verb re-reads and
   * re-checks it while re-entering this lock. No Git/GitHub work is moved into
   * the critical section; only local release and ticket evidence is read here.
   *
   * Authority is unchanged: `review → implementing` is still judged by
   * `backwardMoveEffects`, so it needs a `needs-changes` attestation bound to
   * this ticket's PR or a caller-supplied reason beginning `operator:`. This
   * code never synthesises one, never passes `force`, never deletes a branch or
   * worktree and never cleans a workspace.
   */
  async applyReconciliation(id: string, input: ReconciliationApplyInput): Promise<ReconciliationApplyResult> {
    const stateToken = (state: Awaited<ReturnType<typeof readReleaseStateRecord>>): string => JSON.stringify(state);
    for (let sample = 0; sample < 3; sample += 1) {
      let beforeState: Awaited<ReturnType<typeof readReleaseStateRecord>>;
      let snapshot: ReleaseSnapshot;
      let afterState: Awaited<ReturnType<typeof readReleaseStateRecord>>;
      try {
        beforeState = await readReleaseStateRecord(this.paths);
        snapshot = await this.releaseSnapshot();
        afterState = await readReleaseStateRecord(this.paths);
      } catch (error) {
        throw new Error(
          `RECONCILIATION_DRIFT: "${id}" release transaction state is unreadable; ` +
            `re-run reconcile_ticket after the release records are repaired (${error instanceof Error ? error.message : String(error)}).`,
        );
      }
      if (stateToken(beforeState) !== stateToken(afterState)) continue;

      let release = classifyReleaseEvidence(snapshot, id);
      if (afterState === null && snapshot.pending.length === 0 &&
          (snapshot.channels.length > 0 || snapshot.heads.length > 0 || snapshot.attempts.length > 0)) {
        release = { state: "unavailable" };
      }
      let changed = false;
      const result = await this.withLeaseLock(async () => {
        if (await recoverPendingReleaseMutation(this.paths)) {
          changed = true;
          return null;
        }
        const currentState = await readReleaseStateRecord(this.paths);
        if (stateToken(currentState) !== stateToken(afterState)) {
          changed = true;
          return null;
        }
        return this.applyReconciliationLocked(id, input, release.state);
      });
      if (!changed) return result!;
    }
    throw new Error(
      `RECONCILIATION_DRIFT: "${id}" release evidence changed while the recommendation was being applied; ` +
        `re-run reconcile_ticket against the current release state.`,
    );
  }

  /** The local-only reconciliation body; callers hold the re-entrant board write lock. */
  private async applyReconciliationLocked(
    id: string,
    input: ReconciliationApplyInput,
    releaseState: ReturnType<typeof classifyReleaseEvidence>["state"],
  ): Promise<ReconciliationApplyResult> {
    if (releaseState !== "not-applicable") {
      throw new Error(
        `RECONCILIATION_DRIFT: "${id}" release evidence is now ${releaseState}; ` +
          `the previously collected recommendation is no longer safe. Re-run reconcile_ticket.`,
      );
    }
    const loc = await this.locateItem(id);
    if (!loc) throw new Error(`No item with id "${id}"`);
    const current = parseItem(await readText(loc.file));
    if (current.type !== "ticket") {
      throw new Error(`Only tickets can be reconciled; "${id}" is a ${current.type}`);
    }
    const batch = (await this.listBatchManifests()).find((manifest) => manifest.members.includes(id));
    if (batch || current.lease_batch || current.lease_batch_controller || current.lease_batch_frozen_at) {
      throw new Error(
        `BATCH_INVALID: "${id}" belongs to ${batch ? `${batch.state} batch ${batch.batch_id}` : "an inconsistent batch"}; ` +
          `per-member reconciliation is refused until a batch-wide recovery policy exists.`,
      );
    }
    const actor = input.actor?.trim() || this.actor;
    const target = input.targetStatus;
    const requireStatus = (expected: string): void => {
      if (current.status !== expected) {
        throw new Error(
          `RECONCILIATION_PRECONDITION_FAILED: "${id}" is ${current.status}, but ${input.action} applies only to a ticket in ${expected}.`,
        );
      }
    };
    const requireTarget = (expected: string): void => {
      if (target !== expected) {
        throw new Error(
          `RECONCILIATION_PRECONDITION_FAILED: ${input.action} on "${id}" targets ${expected}, not ${target ?? "(none)"}.`,
        );
      }
    };
    const requireNoTarget = (): void => {
      if (target !== undefined) {
        throw new Error(
          `RECONCILIATION_PRECONDITION_FAILED: ${input.action} on "${id}" is a claim action and takes no target status (got ${target}).`,
        );
      }
    };

    let next: Item;
    switch (input.action) {
      case "MOVE_TO_VERIFYING": {
        requireStatus("review");
        requireTarget("verifying");
        next = await this.moveItem(id, { status: "verifying", expectedRevision: input.expectedRevision });
        break;
      }
      case "MOVE_TO_DONE": {
        requireStatus("verifying");
        requireTarget("done");
        next = await this.moveItem(id, { status: "done", expectedRevision: input.expectedRevision });
        break;
      }
      case "MOVE_TO_IMPLEMENTING": {
        requireStatus("review");
        requireTarget("implementing");
        // Deliberately NOT defaulted. Review → Implementing is CORE-121's
        // audited authority: only the caller's own reason can satisfy it, and
        // an absent one must reach `backwardMoveEffects` and be refused with
        // BACKWARD_MOVE_NEEDS_REASON rather than papered over here.
        next = await this.moveItem(id, {
          status: "implementing",
          expectedRevision: input.expectedRevision,
          ...(input.reason !== undefined ? { reason: input.reason } : {}),
        });
        break;
      }
      case "ROUTE_VERIFICATION_FAILURE": {
        requireStatus("verifying");
        if (target !== "implementing" && target !== "preparing") {
          throw new Error(
            `RECONCILIATION_PRECONDITION_FAILED: ${input.action} on "${id}" routes to implementing or preparing, not ${target ?? "(none)"}.`,
          );
        }
        // An ordinary backward move out of Verifying: a reason alone authorises
        // it. The default quotes the proof in `kanmer-verify/SKILL.md`'s
        // grammar so the audit reads the same whoever moved the ticket.
        const failureClass = target === "implementing" ? "implementation" : "plan";
        const reason = input.reason?.trim()
          || `proof FAIL ${failureClass}: routed by apply_reconciliation from the ticket's recorded proof record`;
        next = await this.moveItem(id, { status: target, expectedRevision: input.expectedRevision, reason });
        break;
      }
      case "RELEASE_CLEAN_TERMINAL_CLAIM": {
        requireStatus("done");
        requireNoTarget();
        // Releases the CLAIM, never the workspace: FRD-028 acceptance 4's
        // "cleanup" is removing an owner from a terminal, clean, explicitly
        // authorised target. Removing a worktree or branch stays in closeout.
        next = await this.releaseTicket(id, { expectedRevision: input.expectedRevision });
        break;
      }
      case "RECOVER_EXPIRED_CLAIM": {
        requireNoTarget();
        if (!current.taken_at) {
          throw new Error(`CLAIM_NOT_TAKEN: "${id}" is not taken; there is no claim to recover.`);
        }
        const lease = leaseState(current, new Date(), leaseConfig(await this.getBoard()));
        if (lease.state !== "expired") {
          throw new Error(
            `CLAIM_LIVE: "${id}" is held by ${current.assignee || "an unknown actor"} until ${lease.expiresAt ?? "(unknown)"}. ` +
              `Reconciliation recovers only an expired claim; a live one is an operator transfer.`,
          );
        }
        // No reason is passed, ever: an `operator:` reason synthesised here
        // would let this path reclaim a live lease, and `transferTicket` must
        // stay free to refuse that with CLAIM_LIVE. Dirty work is preserved —
        // a transfer changes who is responsible, never where the work is.
        const controller = input.controller?.trim();
        next = await this.transferTicket(id, {
          assignee: controller || actor,
          ...(controller ? { controller } : {}),
          expectedRevision: input.expectedRevision,
          ...(input.recovery ? { recovery: input.recovery } : {}),
        });
        break;
      }
      default: {
        const exhaustive: never = input.action;
        throw new Error(`Unknown reconciliation action: ${String(exhaustive)}`);
      }
    }

    const from = KanmerStore.responsibilityOf(current);
    const to = KanmerStore.responsibilityOf(next);
    const claimAction = input.action === "RELEASE_CLEAN_TERMINAL_CLAIM" || input.action === "RECOVER_EXPIRED_CLAIM";
    const transition = `reconcile ${input.action} by ${actor}`
      + (claimAction ? `; controller ${from.controller ?? "(none)"} → ${to.controller ?? "(none)"}` : `; stage ${from.status} → ${to.status}`)
      + `; revision ${input.expectedRevision}`;
    // The durable audit record (FRD-028 acceptance 2). `## Transitions` is
    // committed to the board branch and is itself part of the ticket's
    // document-inclusive revision. The verbs above write their own lines for
    // what THEY did; this one records why reconciliation acted.
    if (loc.kind === "v2") await this.appendTransition(id, transition);
    // Secondary index only: appendActivity is best-effort and self-truncating
    // (activity.ts), which is exactly why it is not the audit record.
    await appendActivity(this.paths, [
      this.activity(id, "update", { field: "reconciliation", from: from.status, to: input.action }),
    ]);
    return { item: next, action: input.action, from, to, transition };
  }

  /** Who is responsible for a ticket right now; null once nothing holds it. */
  private static responsibilityOf(item: Item): ReconciliationResponsibility {
    return {
      status: item.status,
      controller: item.taken_at ? (item.claim_controller ?? item.assignee ?? null) : null,
    };
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
    const requestActor = request.actor.trim();
    const ownerActor = request.owner?.trim() || requestActor;
    if (request.phase !== undefined && !LEASE_PHASES.includes(request.phase)) {
      throw new Error(`LEASE_PHASE_INVALID: "${request.phase}" is not one of ${LEASE_PHASES.join(", ")}.`);
    }
    return this.withLeaseLock(async () => {
      const loc = await this.locateItem(id);
      if (!loc) throw new Error(`No item with id "${id}"`);
      await this.assertNoPendingBatchMutation(id);
      const current = parseItem(await readText(loc.file));
      if (!current.taken_at) {
        throw new Error(`CLAIM_NOT_TAKEN: "${id}" is not taken; there is no claim to renew.`);
      }
      const batch = (await this.listBatchManifests()).find((manifest) => manifest.members.includes(id));
      if (hasBatchOwnership(current) && !batch) {
        throw new Error(`BATCH_INCONSISTENT: "${id}" has batch ownership fields without an authoritative manifest; renewal is refused.`);
      }
      if (batch && requestActor !== batch.controller) {
        throw new Error(
          `BATCH_OWNER_MISMATCH: batch ${batch.batch_id} belongs to ${batch.controller}; ${requestActor || "an unknown actor"} cannot renew its member lease.`,
        );
      }
      const controllerRun = request.controllerRun?.trim();
      if (batch && !controllerRun) {
        throw new Error(`BATCH_RUN_REQUIRED: batch ${batch.batch_id} requires controller_run on every renewal.`);
      }
      if (batch && controllerRun !== batch.controller_run) {
        throw new Error(
          `BATCH_OWNER_MISMATCH: batch ${batch.batch_id} belongs to controller run ${batch.controller_run}; ` +
            `${controllerRun} cannot renew its member lease.`,
        );
      }
      await this.assertRevision(loc, id, request.expectedRevision);
      const legacy = isLegacyLease(current);
      if (request.leaseRevision !== undefined && request.leaseId === undefined) {
        throw new Error(`LEASE_ID_REQUIRED: "${id}" lease_revision is only meaningful with lease_id; pass both from your packet or last take.`);
      }
      if (batch && !legacy && request.leaseId === undefined) {
        throw new Error(
          `LEASE_ID_REQUIRED: "${id}" is a modern batch lease; renew with both lease_id and lease_revision from the current packet.`,
        );
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
      } else if (!batch && (!ownerActor || (current.assignee !== ownerActor && current.claim_controller !== ownerActor))) {
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
      if (legacy && !next.claim_controller && ownerActor) next.claim_controller = ownerActor;
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
            ? `lease-migrate legacy claim → lease ${next.lease_id} rev ${next.lease_revision} by ${requestActor} (phase ${phase}; expires ${next.claim_expires_at})`
            : `lease-phase ${current.lease_phase ?? "implementing"} → ${phase} (lease ${next.lease_id} rev ${next.lease_revision}; expires ${next.claim_expires_at})`,
        );
      }
      return next;
    });
  }


  // ---------------------------------------------------------------------------
  // Release-channel leases and immutable candidate identity (CORE-132, FRD-031)
  //
  // The same mechanism the ticket lease uses — one board-wide `withLeaseLock`
  // critical section, records re-read inside it, a `lease_revision` CAS and a
  // renewable expiry — applied to a different record, because a release channel
  // is owned by a release *attempt* and has no ticket to hang off.
  //
  // Every verb below is pure filesystem work inside the lock. Nothing here
  // spawns a subprocess or contacts a release service: the integration SHA and
  // the "release service was unavailable" observation are both collected at the
  // MCP boundary and passed in, exactly as CORE-131 collects Git/GitHub
  // evidence before delegating to a locked store verb.
  //
  // These verbs append no activity op and write no ticket file. The records are
  // themselves the durable audit — each carries its owner, its timestamps and
  // its successor chain, and an attempt record is never deleted.
  // ---------------------------------------------------------------------------

  /** The channel a request names, defaulting to the board's resolved release branch. */
  private async resolveReleaseChannel(channel: string | undefined): Promise<string> {
    const named = channel?.trim();
    const resolved = named || resolveDelivery(await this.getBoard()).releaseBranch;
    return normalizeReleaseChannel(resolved);
  }

  /** Every release record on this board, read without a lock and never throwing. */
  async releaseSnapshot(): Promise<ReleaseSnapshot> {
    return readReleaseSnapshot(this.paths);
  }

  /**
   * Finish the one already-authorised release transaction before an explicit
   * reconciliation apply performs its fresh read. The read-only inspector never
   * calls this; the write tool does, under the same board lock as release verbs.
   */
  async recoverPendingReleaseForWrite(): Promise<boolean> {
    return this.withLeaseLock(() => recoverPendingReleaseMutation(this.paths));
  }

  /** How long a freshly taken or renewed release lease runs for. */
  private async releaseLeaseExpiry(now: Date): Promise<string> {
    const { expiryMinutes } = leaseConfig(await this.getBoard());
    return new Date(now.getTime() + expiryMinutes * 60_000).toISOString();
  }

  /** Complete an interrupted write set, or fail closed, before reading ownership. */
  private async prepareReleaseMutation(channel: string): Promise<void> {
    await recoverPendingReleaseMutation(this.paths);
    await recoverReleaseMutation(this.paths, channel);
  }

  /**
   * Re-read the policy inside the lock and bind it to the version collected
   * alongside Git resolution. This prevents a SHA resolved under policy A from
   * being minted with the release branch/candidate pattern from policy B.
   */
  private async releasePolicy(expectedVersion: string): Promise<{ policy: DeliveryPolicy; version: string }> {
    const policy = resolveDelivery(await this.getBoard());
    const version = deliveryPolicyVersion(policy);
    if (expectedVersion !== version) {
      throw new Error(
        `RELEASE_POLICY_DRIFT: delivery policy changed after the integration SHA was collected ` +
          `(${expectedVersion} → ${version}). Re-read the policy and resolve the SHA again.`,
      );
    }
    return { policy, version };
  }

  /**
   * Re-read the channel lease and its attempt inside the lock and check the
   * caller's authority and CAS. `lease_id` is identity (a mismatch means the lease was
   * reclaimed — `LEASE_EXPIRED`, the same wording `renewTicket` uses) and
   * `lease_revision` is the compare-and-swap (`Conflict:`, classified as
   * `REVISION_CONFLICT` at the MCP boundary).
   */
  private async readHeldChannel(
    channel: string,
    leaseId: string,
    leaseRevision: number,
    options: { allowForeignOwner?: boolean } = {},
  ): Promise<{ lease: ReleaseChannelRecord; head: ReleaseChannelHeadRecord; attempt: ReleaseAttemptRecord }> {
    const lease = await readChannelRecord(this.paths, channel);
    if (!lease) {
      throw new Error(
        `LEASE_EXPIRED: release channel "${channel}" holds no lease; it was cleared by a successful or superseded ` +
          `attempt, or never acquired. Acquire it before recording anything against it.`,
      );
    }
    const attempt = await readAttemptRecord(this.paths, lease.attempt_id);
    const head = await readChannelHeadRecord(this.paths, channel);
    if (!head || !attempt || !releaseEndpointConsistent(head, lease, attempt)) {
      throw new Error(
        `RELEASE_RECORD_UNREADABLE: release channel "${channel}" does not agree with its durable head and ` +
          `immutable attempt ownership. Inspect and restore the records before mutation.`,
      );
    }
    if (lease.lease_id !== leaseId) {
      throw new Error(
        `LEASE_EXPIRED: release channel "${channel}" is now held by lease ${lease.lease_id} (attempt ${lease.attempt_id}), ` +
          `not ${leaseId}. The channel was reclaimed — stop and re-read it.`,
      );
    }
    if (!options.allowForeignOwner && lease.owner !== this.actor) {
      throw new Error(
        `CLAIM_NOT_OWNED: release channel "${channel}" is held by ${lease.owner}; the actual caller is ${this.actor}. ` +
          `Lease id and revision are concurrency checks, not authority. Only the owner may renew, record, complete or fail; ` +
          `use supersede for an expired or explicitly operator-authorised takeover.`,
      );
    }
    if (lease.lease_revision !== leaseRevision) {
      throw new Error(
        `Conflict: release channel "${channel}" changed since you read it ` +
          `(lease_revision is now ${lease.lease_revision}, you expected ${leaseRevision}).`,
      );
    }
    return { lease, head, attempt };
  }

  /** Refuse any write to an attempt that has already reached a terminal outcome. */
  private static assertAttemptWritable(attempt: ReleaseAttemptRecord): void {
    if (isTerminalAttempt(attempt)) {
      throw new Error(
        `RELEASE_ATTEMPT_TERMINAL: release attempt ${attempt.attempt_id} is ${attempt.outcome} and is frozen. ` +
          `A terminal attempt keeps its proof forever; mint a successor with supersede instead.`,
      );
    }
  }

  private static assertIntegrationSha(sha: string): string {
    const value = sha.trim();
    if (!/^[0-9a-f]{40}$/i.test(value)) {
      throw new Error(`Invalid integration SHA "${sha}": a release attempt names the exact 40-hex integration SHA.`);
    }
    return value.toLowerCase();
  }

  /** Every identity field is compared, so an immutable candidate stays immutable. */
  private static assertCandidateImmutable(before: ReleaseAttemptRecord, after: ReleaseAttemptRecord): void {
    for (const field of RELEASE_FROZEN_FIELDS) {
      if (before[field] !== after[field]) {
        throw new Error(
          `RELEASE_CANDIDATE_IMMUTABLE: release attempt ${before.attempt_id} cannot change "${field}" ` +
            `("${String(before[field])}" → "${String(after[field])}"). A changed candidate needs a new identity: supersede it.`,
        );
      }
    }
  }

  private static mintAttempt(input: {
    channel: string;
    ordinal: number;
    integrationSha: string;
    policy: DeliveryPolicy;
    policyVersion: string;
    owner: string;
    at: string;
    supersedes: string | null;
    includedPrs: readonly string[];
    includedTickets: readonly string[];
  }): ReleaseAttemptRecord {
    return {
      schema: RELEASE_RECORD_SCHEMA,
      attempt_id: attemptIdFor(input.channel, input.ordinal),
      channel: input.channel,
      ordinal: input.ordinal,
      candidate_id: candidateIdentity(input.channel, input.integrationSha, input.ordinal),
      candidate_ref: candidateRefFor(input.policy, input.channel, input.ordinal),
      integration_sha: input.integrationSha,
      release_branch: input.policy.releaseBranch,
      delivery_policy_version: input.policyVersion,
      created_at: input.at,
      owner: input.owner,
      supersedes: input.supersedes,
      // A successor NEVER inherits evidence (FRD-031 AC3): included PRs and
      // tickets describe intended scope and are supplied afresh, while the
      // artifact manifest and verification state start empty because they
      // belong to the candidate SHA that produced them.
      release_tag: null,
      included_prs: [...input.includedPrs],
      included_tickets: [...input.includedTickets],
      artifact_manifest: [],
      verification_state: "pending",
      retry: null,
      outcome: "active",
      terminal_at: null,
      successor: null,
      failure_reason: null,
    };
  }

  /** The durable high-water endpoint committed with a newly minted attempt. */
  private static releaseHead(attempt: ReleaseAttemptRecord): ReleaseChannelHeadRecord {
    return {
      schema: RELEASE_RECORD_SCHEMA,
      channel: attempt.channel,
      latest_attempt_id: attempt.attempt_id,
      next_ordinal: attempt.ordinal + 1,
    };
  }

  /**
   * Take a release channel: mint an immutable candidate identity for the exact
   * integration SHA and record the lease that serialises the channel.
   *
   * A channel that already carries a lease record is refused with
   * `RELEASE_CHANNEL_HELD` whether that lease is live **or** expired. Expiry
   * never releases anything here for the same reason `assertWorkspaceFree`
   * ignores it for workspaces: an abandoned lease still owns its channel until
   * somebody explicitly takes responsibility for the evidence it left behind.
   * The reclaim is `supersedeReleaseAttempt`, which archives the incumbent with
   * a successor rather than pretending it never happened.
   */
  async acquireReleaseChannel(input: AcquireReleaseChannelInput): Promise<ReleaseChannelResult> {
    const sha = KanmerStore.assertIntegrationSha(input.integrationSha);
    const channel = await this.resolveReleaseChannel(input.channel);
    await assertNoReleaseChannelCollision(this.paths, channel);
    return this.withLeaseLock(async () => {
      await this.prepareReleaseMutation(channel);
      const now = input.now ?? new Date();
      const existing = await readChannelRecord(this.paths, channel);
      if (existing) {
        const state = releaseLeaseExpired(existing, now) ? "expired" : "live";
        throw new Error(
          `RELEASE_CHANNEL_HELD: release channel "${channel}" is already held by lease ${existing.lease_id} ` +
            `(attempt ${existing.attempt_id}, held by ${existing.owner}, ${state}` +
            `${existing.expires_at ? ` until ${existing.expires_at}` : ""}). ` +
            (state === "expired"
              ? `An expired release lease is reclaimed with supersede, never re-acquired: that archives the incumbent attempt with a successor and keeps its evidence.`
              : `One release owns a channel at a time — complete, fail or supersede the current attempt first.`),
        );
      }
      const at = now.toISOString();
      const owner = this.actor;
      const { policy, version: policyVersion } = await this.releasePolicy(input.expectedPolicyVersion);
      const previousHead = await readChannelHeadRecord(this.paths, channel);
      const ordinal = await nextOrdinal(this.paths, channel);
      const previousAttempt = previousHead
        ? await readAttemptRecord(this.paths, previousHead.latest_attempt_id)
        : null;
      if (previousHead && (!previousAttempt || previousAttempt.outcome !== "released")) {
        throw new Error(
          `RELEASE_RECORD_UNREADABLE: channel "${channel}" has no lease but its durable head is not a ` +
            `completed release. Restore its ownership evidence before acquiring a successor.`,
        );
      }
      const attempt = KanmerStore.mintAttempt({
        channel,
        ordinal,
        integrationSha: sha,
        policy,
        policyVersion,
        owner,
        at,
        supersedes: null,
        includedPrs: input.includedPrs ?? [],
        includedTickets: input.includedTickets ?? [],
      });
      const lease: ReleaseChannelRecord = {
        schema: RELEASE_RECORD_SCHEMA,
        channel,
        attempt_id: attempt.attempt_id,
        lease_id: newReleaseLeaseId(),
        lease_revision: 1,
        owner,
        acquired_at: at,
        expires_at: await this.releaseLeaseExpiry(now),
        heartbeat_at: at,
      };
      await commitReleaseMutation(this.paths, {
        channel,
        now,
        attempts: [
          ...(previousAttempt ? [{ before: previousAttempt, after: previousAttempt }] : []),
          { before: null, after: attempt },
        ],
        head_record: { before: previousHead, after: KanmerStore.releaseHead(attempt) },
        channel_record: { before: null, after: lease },
      });
      return { channel, lease, attempt, leaseState: "current" };
    });
  }

  /** Heartbeat and extend a release lease. The renewable half of the renewable expiry. */
  async renewReleaseChannel(input: ReleaseChannelCasInput): Promise<ReleaseChannelResult> {
    const channel = await this.resolveReleaseChannel(input.channel);
    await assertNoReleaseChannelCollision(this.paths, channel);
    return this.withLeaseLock(async () => {
      await this.prepareReleaseMutation(channel);
      const { lease, head, attempt } = await this.readHeldChannel(channel, input.leaseId, input.leaseRevision);
      const now = input.now ?? new Date();
      const next: ReleaseChannelRecord = {
        ...lease,
        lease_revision: lease.lease_revision + 1,
        heartbeat_at: now.toISOString(),
        expires_at: await this.releaseLeaseExpiry(now),
      };
      await commitReleaseMutation(this.paths, {
        channel,
        now,
        attempts: [{ before: attempt, after: attempt }],
        head_record: { before: head, after: head },
        channel_record: { before: lease, after: next },
      });
      return { channel, lease: next, attempt, leaseState: "current" };
    });
  }

  /**
   * Record progress against the channel's current attempt: verification state,
   * the release tag, included PRs and tickets, the artifact manifest, or one
   * bounded "the release service was unavailable" observation.
   *
   * The attempt's identity fields are not accepted here, and
   * `assertCandidateImmutable` proves that rather than trusting the signature —
   * a changed integration SHA must mint a new candidate identity through
   * supersede (FRD-031 AC3), never quietly re-point an existing one.
   */
  async recordReleaseProgress(input: RecordReleaseProgressInput): Promise<ReleaseChannelResult> {
    const serviceUnavailable = input.serviceUnavailable?.trim();
    if (input.serviceUnavailable !== undefined && !serviceUnavailable) {
      throw new Error(`RELEASE_INPUT_INVALID: serviceUnavailable must describe the observed release-service failure.`);
    }
    if (input.serviceUnavailable !== undefined && input.serviceRecovered === true) {
      throw new Error(
        `RELEASE_INPUT_INVALID: one record action cannot report serviceUnavailable and serviceRecovered together.`,
      );
    }
    if (input.serviceRecovered !== undefined && input.serviceRecovered !== true) {
      throw new Error(`RELEASE_INPUT_INVALID: serviceRecovered is an observation flag and, when supplied, must be true.`);
    }
    if (
      input.verificationState === undefined && input.releaseTag === undefined &&
      input.includedPrs === undefined && input.includedTickets === undefined &&
      input.artifactManifest === undefined && serviceUnavailable === undefined &&
      input.serviceRecovered !== true
    ) {
      throw new Error(
        `RELEASE_INPUT_INVALID: record needs at least one progress field; use renew for a heartbeat with no progress.`,
      );
    }
    const channel = await this.resolveReleaseChannel(input.channel);
    await assertNoReleaseChannelCollision(this.paths, channel);
    return this.withLeaseLock(async () => {
      await this.prepareReleaseMutation(channel);
      const { lease, head, attempt } = await this.readHeldChannel(channel, input.leaseId, input.leaseRevision);
      KanmerStore.assertAttemptWritable(attempt);
      const now = input.now ?? new Date();
      const next: ReleaseAttemptRecord = {
        ...attempt,
        ...(input.verificationState !== undefined ? { verification_state: input.verificationState } : {}),
        ...(input.releaseTag !== undefined ? { release_tag: input.releaseTag.trim() || null } : {}),
        ...(input.includedPrs !== undefined ? { included_prs: [...input.includedPrs] } : {}),
        ...(input.includedTickets !== undefined ? { included_tickets: [...input.includedTickets] } : {}),
        ...(input.artifactManifest !== undefined ? { artifact_manifest: [...input.artifactManifest] } : {}),
        ...(serviceUnavailable !== undefined
          ? { retry: nextRetry(attempt.retry, serviceUnavailable, now) }
          : {}),
        ...(input.serviceRecovered === true ? { retry: null } : {}),
      };
      KanmerStore.assertCandidateImmutable(attempt, next);
      const nextLease: ReleaseChannelRecord = {
        ...lease,
        lease_revision: lease.lease_revision + 1,
        heartbeat_at: now.toISOString(),
        expires_at: await this.releaseLeaseExpiry(now),
      };
      await commitReleaseMutation(this.paths, {
        channel,
        now,
        attempts: [{ before: attempt, after: next }],
        head_record: { before: head, after: head },
        channel_record: { before: lease, after: nextLease },
      });
      return { channel, lease: nextLease, attempt: next, leaseState: "current" };
    });
  }

  /**
   * Archive the channel's current attempt with a successor and hand the lease
   * to a freshly minted candidate (FRD-031 AC3 and AC4).
   *
   * This is one verb for two situations that are the same underneath:
   * remediation at a new SHA, and reclaiming a lease whose owner has gone.
   * The incumbent record is left intact apart from its terminal fields, so a
   * failed or abandoned attempt keeps its proof, and the successor starts with
   * empty evidence so candidate 1's evidence can never be read as candidate 2's.
   */
  async supersedeReleaseAttempt(input: SupersedeReleaseAttemptInput): Promise<ReleaseChannelResult> {
    const sha = KanmerStore.assertIntegrationSha(input.integrationSha);
    const channel = await this.resolveReleaseChannel(input.channel);
    await assertNoReleaseChannelCollision(this.paths, channel);
    return this.withLeaseLock(async () => {
      await this.prepareReleaseMutation(channel);
      const { lease, head, attempt } = await this.readHeldChannel(
        channel,
        input.leaseId,
        input.leaseRevision,
        { allowForeignOwner: true },
      );
      const now = input.now ?? new Date();
      const at = now.toISOString();
      const owner = this.actor;
      // The same rule `transferTicket` applies to a live ticket lease: a live
      // release lease is not taken from its owner without an operator saying so.
      if (!releaseLeaseExpired(lease, now) && lease.owner !== owner && !isOperatorReason(input.reason)) {
        throw new Error(
          `CLAIM_LIVE: release channel "${channel}" is held by ${lease.owner} until ${lease.expires_at} and you are ${owner}. ` +
            `Wait for expiry, ask the owner to supersede, or pass a reason beginning "operator:".`,
        );
      }
      if (isTerminalAttempt(attempt) && attempt.outcome !== "failed") {
        throw new Error(
          `RELEASE_ATTEMPT_TERMINAL: release attempt ${attempt.attempt_id} is ${attempt.outcome} and is frozen; ` +
            `only a retained failed attempt can mint a successor.`,
        );
      }
      const { policy, version: policyVersion } = await this.releasePolicy(input.expectedPolicyVersion);
      const successor = KanmerStore.mintAttempt({
        channel,
        ordinal: head.next_ordinal,
        integrationSha: sha,
        policy,
        policyVersion,
        owner,
        at,
        supersedes: attempt.attempt_id,
        includedPrs: input.includedPrs ?? [],
        includedTickets: input.includedTickets ?? [],
      });
      // A failed attempt is already terminal and frozen whole. Its successor
      // names the predecessor, while status derives the reverse relationship;
      // failed history is never rewritten into "superseded".
      const archived: ReleaseAttemptRecord = attempt.outcome === "failed"
        ? attempt
        : {
            ...attempt,
            outcome: "superseded",
            terminal_at: at,
            successor: successor.attempt_id,
            ...(input.reason !== undefined && attempt.failure_reason === null ? { failure_reason: input.reason } : {}),
          };
      const nextLease: ReleaseChannelRecord = {
        schema: RELEASE_RECORD_SCHEMA,
        channel,
        attempt_id: successor.attempt_id,
        lease_id: newReleaseLeaseId(),
        lease_revision: 1,
        owner,
        acquired_at: at,
        expires_at: await this.releaseLeaseExpiry(now),
        heartbeat_at: at,
      };
      await commitReleaseMutation(this.paths, {
        channel,
        now,
        attempts: [
          { before: attempt, after: archived },
          { before: null, after: successor },
        ],
        head_record: { before: head, after: KanmerStore.releaseHead(successor) },
        channel_record: { before: lease, after: nextLease },
      });
      return { channel, lease: nextLease, attempt: successor, leaseState: "current" };
    });
  }

  /**
   * Finish a release successfully. The attempt becomes terminal `released` and
   * the channel lease is **cleared** — FRD-031 AC4's "a successful terminal
   * attempt clears the lease". The attempt record itself is never removed.
   */
  async completeReleaseAttempt(input: CompleteReleaseAttemptInput): Promise<ReleaseChannelResult> {
    const channel = await this.resolveReleaseChannel(input.channel);
    await assertNoReleaseChannelCollision(this.paths, channel);
    return this.withLeaseLock(async () => {
      await this.prepareReleaseMutation(channel);
      const { lease, head, attempt } = await this.readHeldChannel(channel, input.leaseId, input.leaseRevision);
      KanmerStore.assertAttemptWritable(attempt);
      const now = input.now ?? new Date();
      const next: ReleaseAttemptRecord = {
        ...attempt,
        ...(input.releaseTag !== undefined ? { release_tag: input.releaseTag.trim() || null } : {}),
        ...(input.artifactManifest !== undefined ? { artifact_manifest: [...input.artifactManifest] } : {}),
        outcome: "released",
        terminal_at: now.toISOString(),
      };
      await commitReleaseMutation(this.paths, {
        channel,
        now,
        attempts: [{ before: attempt, after: next }],
        head_record: { before: head, after: head },
        channel_record: { before: lease, after: null },
      });
      return { channel, lease: null, attempt: next, leaseState: "cleared" };
    });
  }

  /**
   * Record a failed release. The attempt becomes terminal `failed` and keeps
   * its proof; the channel lease is deliberately **retained**.
   *
   * FRD-031 clears the lease for a successful or superseded attempt and says
   * nothing about a failed one, and goal.md says failed immutable attempts
   * retain their proof. Keeping the channel means a second owner cannot start a
   * release on top of unexamined failure evidence: the way forward is an
   * explicit supersede, which records the successor. The lease still expires on
   * the ordinary renewable rule, so nothing is wedged.
   */
  async failReleaseAttempt(input: FailReleaseAttemptInput): Promise<ReleaseChannelResult> {
    const channel = await this.resolveReleaseChannel(input.channel);
    await assertNoReleaseChannelCollision(this.paths, channel);
    return this.withLeaseLock(async () => {
      await this.prepareReleaseMutation(channel);
      const { lease, head, attempt } = await this.readHeldChannel(channel, input.leaseId, input.leaseRevision);
      KanmerStore.assertAttemptWritable(attempt);
      const now = input.now ?? new Date();
      const next: ReleaseAttemptRecord = {
        ...attempt,
        outcome: "failed",
        terminal_at: now.toISOString(),
        failure_reason: input.reason,
        verification_state: "failed",
      };
      const nextLease: ReleaseChannelRecord = {
        ...lease,
        lease_revision: lease.lease_revision + 1,
        heartbeat_at: now.toISOString(),
        expires_at: await this.releaseLeaseExpiry(now),
      };
      await commitReleaseMutation(this.paths, {
        channel,
        now,
        attempts: [{ before: attempt, after: next }],
        head_record: { before: head, after: head },
        channel_record: { before: lease, after: nextLease },
      });
      return {
        channel,
        lease: nextLease,
        attempt: next,
        leaseState: releaseLeaseExpired(nextLease, now) ? "expired" : "current",
      };
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
    // CORE-125: a document write moves the ticket's document-inclusive revision
    // (FRD-029), so its CAS and its write belong in the same critical section
    // as every other ticket mutation. Reached from `appendTransition` under an
    // already-held lock, this re-enters instead of deadlocking.
    return this.withLeaseLock(async () => {
      const loc = await this.locateItem(id);
      if (!loc) throw new Error(`No item with id "${id}"`);
      await this.assertNoPendingBatchMutation(id);
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
    });
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
    return this.withLeaseLock(async () => {
      await this.assertNoPendingBatchMutation(id);
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
    });
  }

  /**
   * Delete a reference file. There is no archive for one — it is an input, not
   * a record — so callers must confirm before reaching this.
   */
  async removeReference(id: string, name: string): Promise<void> {
    return this.withLeaseLock(async () => {
      await this.assertNoPendingBatchMutation(id);
      const loc = await this.locateItem(id);
      if (!loc || loc.kind !== "v2") throw new Error(`No item with id "${id}"`);
      const dir = docDirIn(loc.dir, "reference");
      const resolved = referencePath(dir, name);
      await removeFile(resolved);
      await this.appendActivityFor(id, "reference", name);
    });
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
    return this.withLeaseLock(async () => {
      const loc = await this.locateItem(id);
      if (!loc) return { deleted: false, cleanedLinks: [], bodyReferencesRemain: [] };
      const current = parseItem(await readText(loc.file));
      const manifest = (await this.listBatchManifests()).find((entry) => entry.members.includes(id));
      if (manifest) {
        throw new Error(
          `BATCH_ACTIVE: "${id}" is an immutable member of ${manifest.state} batch ${manifest.batch_id}; ` +
            `recover or close out the complete roster before deletion.`,
        );
      }
      if (hasBatchOwnership(current)) {
        throw new Error(`BATCH_INCONSISTENT: "${id}" records batch ownership fields without an authoritative manifest; deletion is refused.`);
      }
      const remaining = (await this.listItemsWithWarnings({ includeArchived: true })).items
        .filter((item) => item.id !== id);
      const cleanup: Array<{ id: string; patch: UpdateItemPatch }> = [];
      const bodyReferencesRemain: string[] = [];
      // Preflight every derived mutation while the same board lock is held.
      // In particular, a pending/releasing batch member must refuse before the
      // target folder is deleted, otherwise backlink cleanup can leave a
      // partially applied delete transaction.
      for (const item of remaining) {
        const patch: UpdateItemPatch = {};
        if ((item.links ?? []).includes(id)) patch.links = (item.links ?? []).filter((link) => link !== id);
        if ((item.blocks ?? []).includes(id)) patch.blocks = (item.blocks ?? []).filter((link) => link !== id);
        if (Object.keys(patch).length > 0) {
          await this.assertNoPendingBatchMutation(item.id);
          cleanup.push({ id: item.id, patch });
        }
        if (parseWikiLinks(item.body).includes(id)) bodyReferencesRemain.push(item.id);
      }
      if (loc.kind === "v2") {
        await fs.rm(loc.dir, { recursive: true, force: true });
      } else {
        await removeFile(loc.file);
      }
      await appendActivity(this.paths, [this.activity(id, "delete")]);
      const cleanedLinks: string[] = [];
      for (const entry of cleanup) {
        await this.updateItem(entry.id, entry.patch);
        cleanedLinks.push(entry.id);
      }
      return { deleted: true, cleanedLinks, bodyReferencesRemain };
    });
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
   * The promotion decision (FRD-032), resolved into the frontmatter it implies.
   *
   * Promotion is deliberately a *recorded decision on the ticket* rather than a
   * new tool: a capture is already an ordinary ticket, `update_item` already
   * carries derived effects (an `area` change moves the ticket's folder), and
   * CORE-124 set the house precedent that additive frontmatter needs no new
   * verb. Returning effects rather than writing means the whole promotion —
   * disposition, link, archive and profile change — lands in the single atomic
   * write `updateItem` was already going to make, under the board write lock.
   *
   * Every refusal is a stable code, because a controller routes on them.
   */
  private async captureDecisionEffects(
    current: Item,
    fields: UpdateItemPatch,
  ): Promise<Partial<Item>> {
    const raw = fields.capture_disposition;
    if (raw === undefined) {
      if (fields.capture_result !== undefined) {
        throw new Error(
          `CAPTURE_DISPOSITION_INVALID: "${current.id}" was given capture_result without ` +
            `capture_disposition. A result only means something as part of a recorded decision.`,
        );
      }
      return {};
    }
    const disposition = raw.trim();
    if (!isCaptureDisposition(disposition)) {
      throw new Error(
        `CAPTURE_DISPOSITION_INVALID: "${disposition}" is not a promotion outcome. ` +
          `Valid: ${CAPTURE_DISPOSITIONS.join(", ")}.`,
      );
    }
    if (!isCaptureItem(current)) {
      throw new Error(
        `CAPTURE_DISPOSITION_INVALID: "${current.id}" is not a capture ` +
          `(profile "${current.profile ?? "unset"}"), so there is no capture to promote.`,
      );
    }
    // `retained` is the one decision that may be revisited: "keep it as a
    // capture for now" must not be the trap that freezes it as one forever.
    if (current.capture_disposition && current.capture_disposition !== "retained") {
      throw new Error(
        `CAPTURE_ALREADY_DISPOSED: "${current.id}" was already promoted as ` +
          `"${current.capture_disposition}"` +
          (current.capture_decided_at ? ` on ${current.capture_decided_at}` : "") +
          `. A promotion is recorded once; only "retained" may be superseded.`,
      );
    }
    const result = fields.capture_result?.trim();
    const promotesProfile =
      fields.profile !== undefined && fields.profile !== CAPTURE_PROFILE_ID;
    const requireResult = (what: string): string => {
      if (!result) {
        throw new Error(
          `CAPTURE_RESULT_REQUIRED: disposition "${disposition}" must name ${what} ` +
            `in capture_result — the outcome is what makes the decision auditable.`,
        );
      }
      return result;
    };
    const requireProfile = (): void => {
      if (!promotesProfile) {
        throw new Error(
          `CAPTURE_PROMOTION_NEEDS_PROFILE: disposition "${disposition}" turns "${current.id}" ` +
            `into deliverable work, so the same update must set a non-capture profile. ` +
            `Its gate requirements then apply from this decision onward, never retroactively.`,
        );
      }
    };

    const effects: Partial<Item> = {
      capture_disposition: disposition,
      capture_decided_at: nowIso(),
      capture_decided_by: this.actor,
    };
    if (result) effects.capture_result = result;

    switch (disposition) {
      case "duplicate": {
        const target = requireResult("the ticket this duplicates");
        if (!(await this.getItem(target))) {
          throw new Error(
            `CAPTURE_RESULT_REQUIRED: no item with id "${target}" to merge "${current.id}" into.`,
          );
        }
        const links = fields.links ?? current.links ?? [];
        if (!links.includes(target)) effects.links = [...links, target];
        effects.archived = true;
        break;
      }
      case "already-fixed":
      case "not-required":
        effects.archived = true;
        break;
      case "batch":
        requireResult("the small-fix batch it joins");
        requireProfile();
        break;
      case "promoted":
        requireProfile();
        break;
      case "retained":
        if (promotesProfile) {
          throw new Error(
            `CAPTURE_DISPOSITION_INVALID: "retained" keeps "${current.id}" a capture, ` +
              `so it cannot also set profile "${fields.profile}". Use "promoted" instead.`,
          );
        }
        break;
    }
    return effects;
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

    // FRD-032, and first because it is not a document question at all. A
    // capture owes nothing, so the gate engine — which can only ask for
    // evidence — would happily wave it all the way to Done in one move. What a
    // capture actually needs is a *decision*, and this is the single choke
    // point every stage change passes through (`updateItem`, `assertMoveAllowed`
    // for `moveItem`, and `takeTicket`), which is what makes "promotion never
    // silently selects a capture for autonomous delivery" a mechanism rather
    // than a convention in a skill.
    //
    // The resolved profile is honoured as well as the explicit field: refusing
    // more here is always safe, and it closes the area-`defaultProfile` case
    // that the explicit-field predicate deliberately does not cover.
    if (
      toStatus !== FIRST_STAGE &&
      (isCaptureItem(item) || report.profile === CAPTURE_PROFILE_ID)
    ) {
      throw new Error(
        `CAPTURE_NOT_PROMOTED: "${item.id}" is a quick capture, so it cannot move to ` +
          `"${toStatus}". A capture stays in "${FIRST_STAGE}" until it is promoted by an ` +
          `explicit recorded decision — update_item with capture_disposition ` +
          `("promoted" or "batch", together with the profile it should carry) turns it into ` +
          `deliverable work; "duplicate", "already-fixed", "not-required" close it; ` +
          `"retained" keeps it as it is.`,
      );
    }

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
    // Same critical section as setDoc (CORE-125): the revision this CAS reads
    // must not move between the check and the append.
    return this.withLeaseLock(async () => {
      const loc = await this.locateItem(id);
      if (!loc) throw new Error(`No item with id "${id}"`);
      await this.assertNoPendingBatchMutation(id);
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
    });
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
 * A capture must carry the two things that make it worth having: a concise
 * title and the observation itself (FRD-032).
 *
 * The observation is the **body**, not a frontmatter field. That is what makes
 * it searchable through the existing full-text search and visible in a board
 * GUI that knows nothing about captures — and it keeps prose out of YAML.
 * Evidence is separate and genuinely optional: an empty list is valid.
 */
function assertCaptureObservation(title: string | undefined, body: string | undefined): void {
  const missing: string[] = [];
  if (!(title ?? "").trim()) missing.push("a title");
  if (!(body ?? "").trim()) missing.push("an observation (the ticket body)");
  if (missing.length) {
    throw new Error(
      `CAPTURE_OBSERVATION_REQUIRED: a capture needs ${missing.join(" and ")}. ` +
        `Optional evidence may be empty; these two may not.`,
    );
  }
}

/** The same rule on update: a capture may not be emptied out after the fact. */
function assertCaptureObservationRetained(current: Item, fields: UpdateItemPatch): void {
  const staysCapture =
    fields.profile === CAPTURE_PROFILE_ID ||
    (fields.profile === undefined && isCaptureItem(current));
  if (!staysCapture) return;
  assertCaptureObservation(fields.title ?? current.title, fields.body ?? current.body);
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

/** A full commit SHA. Delivery evidence names an exact commit, never an abbreviation. */
const DELIVERY_SHA_RE = /^[0-9a-f]{40}$/iu;

/** Whether a caller's patch touches any delivery field at all. */
function touchesDelivery(patch: Partial<UpdateItemPatch> | Partial<CreateItemInput>): boolean {
  return DELIVERY_PATCH_KEYS.some((key) => (patch as Record<string, unknown>)[key] !== undefined);
}

/** Turn a delivery-policy branch glob into an anchored matcher (`release/*` → `release/v1`). */
function candidatePatternMatches(pattern: string, value: string): boolean {
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
    .join(".+");
  return new RegExp(`^${source}$`, "u").test(value);
}

/**
 * Derive the delivery fields that are the store's to decide, never the
 * caller's, and stamp when the record last changed (FRD-031).
 *
 * `delivery_backport_required` is recomputed from scratch every time rather
 * than toggled, so it can never be left behind by a later edit: a hotfix that
 * has its backport SHA, or whose branch is no longer the release branch, simply
 * stops owing one. That also means a caller cannot record itself as owing
 * nothing — the only way to discharge the obligation is a real backport SHA.
 */
function applyDeliveryEffects(policy: DeliveryPolicy, next: Item, stamp: string): void {
  const owesBackport =
    policy.hotfixBackport && deliveryTargets(policy, next).hotfix && next.delivery_backport_sha === undefined;
  if (owesBackport) next.delivery_backport_required = policy.integrationBranch;
  else delete next.delivery_backport_required;
  next.delivery_recorded_at = stamp;
}

/**
 * Validate a ticket's delivery record against the project's delivery policy
 * (FRD-031), reading the **merged** post-patch item so a two-call sequence is
 * judged exactly like a one-call one.
 *
 * Deliberately not enforced: forward-only progression. A real release gets
 * rolled back, so a state may move backwards. What cannot happen is a state
 * claimed without the evidence that state means — which is what this checks.
 * Nothing here is a gate input (ADR-0005): a released ticket with no proof is
 * still refused entry to Done, by the gate engine, which never reads these
 * fields.
 */
function assertDeliveryAgainstBoard(policy: DeliveryPolicy, item: Item): void {
  const state = item.delivery_state;
  if (state !== undefined && !isDeliveryState(state)) {
    throw new Error(
      `DELIVERY_STATE_INVALID: unknown delivery_state "${state}". Valid: ${DELIVERY_STATES.join(", ")}.`,
    );
  }
  const rank = state ? deliveryStateRank(state) : 0;

  for (const key of ["delivery_sha", "delivery_backport_sha"] as const) {
    const value = item[key];
    if (value !== undefined && !DELIVERY_SHA_RE.test(value)) {
      throw new Error(`DELIVERY_SHA_INVALID: ${key} "${value}" is not a full 40-character commit SHA.`);
    }
  }

  if (
    item.delivery_branch !== undefined &&
    item.delivery_branch !== policy.integrationBranch &&
    item.delivery_branch !== policy.releaseBranch
  ) {
    throw new Error(
      `DELIVERY_TARGET_INVALID: delivery_branch "${item.delivery_branch}" is neither the integration branch ` +
        `"${policy.integrationBranch}" nor the release branch "${policy.releaseBranch}".`,
    );
  }
  if (item.delivery_release_branch !== undefined && item.delivery_release_branch !== policy.releaseBranch) {
    throw new Error(
      `DELIVERY_TARGET_INVALID: delivery_release_branch "${item.delivery_release_branch}" is not this project's ` +
        `release branch "${policy.releaseBranch}".`,
    );
  }

  if (item.delivery_candidate !== undefined) {
    if (!policy.releaseCandidatePattern) {
      throw new Error(
        `DELIVERY_NO_CANDIDATE_POLICY: this project declares no delivery.releaseCandidatePattern, so it has no ` +
          `release candidates and delivery_candidate cannot be set.`,
      );
    }
    if (!candidatePatternMatches(policy.releaseCandidatePattern, item.delivery_candidate)) {
      throw new Error(
        `DELIVERY_NO_CANDIDATE_POLICY: delivery_candidate "${item.delivery_candidate}" does not match this ` +
          `project's delivery.releaseCandidatePattern "${policy.releaseCandidatePattern}".`,
      );
    }
  }

  if (rank >= deliveryStateRank("integrated")) {
    if (item.delivery_branch === undefined || item.delivery_sha === undefined) {
      throw new Error(
        `DELIVERY_EVIDENCE_MISSING: delivery_state "${state}" claims the change is integrated, so it needs both ` +
          `delivery_branch and an exact 40-character delivery_sha.`,
      );
    }
  }
  if (state === "release-candidate" && item.delivery_candidate === undefined) {
    throw new Error(
      `DELIVERY_EVIDENCE_MISSING: delivery_state "release-candidate" needs delivery_candidate naming the ` +
        `immutable candidate this change was frozen into.`,
    );
  }
  if (rank >= deliveryStateRank("released")) {
    if (item.delivery_release_branch === undefined || item.delivery_release_tag === undefined) {
      throw new Error(
        `DELIVERY_EVIDENCE_MISSING: delivery_state "${state}" claims the change is released, so it needs both ` +
          `delivery_release_branch and delivery_release_tag.`,
      );
    }
  }

  // A backport SHA is only meaningful for a real hotfix. On a main-only project
  // nothing is ever a hotfix — the release branch *is* the integration branch —
  // so `deliveryTargets` is the check, not a bare branch comparison.
  if (item.delivery_backport_sha !== undefined && !deliveryTargets(policy, item).hotfix) {
    throw new Error(
      `DELIVERY_NO_BACKPORT_REQUIRED: delivery_backport_sha is only meaningful for a hotfix delivered on a release ` +
        `branch that differs from the integration branch. This project integrates into "${policy.integrationBranch}" ` +
        `and releases from "${policy.releaseBranch}"; this record names "${item.delivery_branch ?? "(none)"}".`,
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
    } else if ((key === "deployment" || (DELIVERY_PATCH_KEYS as readonly string[]).includes(key)) && value === "") {
      if (existing !== undefined) changed.push(key); // "" clears the field
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
  // The ticket's *explicit* profile (FRD-032), which is what makes
  // `profile: "capture"` the filter that shows or hides quick captures. An
  // unset profile matches nothing here rather than matching the board default:
  // a filter asks a question about the file, it does not resolve one.
  if (filter.profile && item.profile !== filter.profile) return false;
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
