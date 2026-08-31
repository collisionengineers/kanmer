import { z } from "zod";

/** The three kinds of item Kanmer stores, each in its own subfolder. */
export const ItemTypeSchema = z.enum(["ticket", "plan", "research"]);
export type ItemType = z.infer<typeof ItemTypeSchema>;

/** Read-only open-question totals used by the phase-1 merge gate. */
export interface OpenQuestionCount {
  checked: number;
  total: number;
  open: number;
}

/**
 * Priority is a string id into `board.priorities` (configurable). The default
 * board seeds low/medium/high/urgent, but users can rename/add their own.
 */
export type Priority = string;

/** An area entry in board.yml (the only column kind in format 3). */
export const BoardColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
  /**
   * Areas only (format 2): the id prefix for tickets born in this area,
   * e.g. `API` → `API-001`. Uppercase alphanumeric, 2–6 chars. When unset,
   * derived from the area id. A ticket's prefix is a birth certificate, not
   * a live address — moving the ticket to another area never changes its id.
   */
  prefix: z
    .string()
    .regex(/^[A-Z0-9]{2,6}$/, "prefix must be 2-6 uppercase alphanumerics")
    .optional(),
  /**
   * The requirement profile tickets in this area get when they do not name one
   * — the middle link of FRD-002 P6's resolution chain (ticket → area → board).
   */
  defaultProfile: z.string().optional(),
});
export type BoardColumn = z.infer<typeof BoardColumnSchema>;

/**
 * A ticket document name. The doc set is per-area configurable data now (see
 * `board.docs` and `resolveDocTypes` in docs.ts), so this is just a string; the
 * store validates a write against the ticket area's configured set. The shipped
 * default set lives in `DEFAULT_DOC_TYPES` (docs.ts).
 */
export type TicketDoc = string;

/** One requested ticket document together with its exact-content version. */
export interface TicketDocumentWithVersion {
  doc: string;
  exists: boolean;
  content: string | null;
  version: string | null;
}

/** Options for writing a ticket's pipeline document. */
export interface SetDocOptions {
  /** Append below the existing content instead of replacing it. */
  append?: boolean;
  /**
   * Optimistic concurrency, opt-in exactly like `expectedUpdated` on an item
   * patch: `undefined` skips the check (last-write-wins, the historical
   * behaviour); a string is the `version` the caller last read; `null` means
   * the caller expects the document not to exist yet.
   */
  expectedVersion?: string | null;
  /**
   * Document-inclusive ticket revision CAS (FRD-029): the `revision` last
   * read for the whole ticket. Refused with `Conflict:` when any pipeline
   * document or the ticket file changed since. `undefined` skips the check.
   */
  expectedRevision?: string;
}

/** Options for opening/initialising a board (`KanmerStore.init`). */
export interface InitOptions {
  /**
   * The machine-local fingerprint the board was addressed by before it had a
   * logical identity. Recorded as auditable evidence when a legacy board
   * receives its one-time identity migration; core never computes it.
   */
  fallbackFingerprint?: string;
}

/** A ticket's document-inclusive revision (FRD-029), computed on read. */
export interface TicketRevision {
  /** `rev1:<digest>` over the ticket file and every counted document. */
  revision: string;
  /** The item's `updated` stamp at the same read, for callers that use both. */
  updated: string;
  /** How many documents (excluding scratch/reference) the revision covers. */
  documents: number;
}

/** Which pipeline docs exist for a ticket, plus checklist progress if present. */
export interface TicketDocsInfoV3Extras {
  /** Documents per type folder, counted recursively (FRD-003 T7). */
  counts: Record<string, number>;
  /** Readable Markdown document paths, relative to the ticket folder (FRD-003 T6). */
  documentPaths: string[];
  /** Human-supplied inputs: name plus absolute path (FRD-004 R3). */
  references: { name: string; path: string }[];
  /** Sorted gate-exempt scratch-note slugs, without the `scratch/` prefix. */
  scratch: string[];
}

export interface TicketDocsInfo extends TicketDocsInfoV3Extras {
  /** Keyed by the ticket area's resolved doc-type ids. */
  docs: Record<string, boolean>;
  /** Parsed from `- [ ]` / `- [x]` lines in the progress doc; null when absent. */
  checklist: { checked: number; total: number } | null;
}

export const IdPrefixesSchema = z.object({
  ticket: z.string().min(1).default("TICK"),
  plan: z.string().min(1).default("PLAN"),
  research: z.string().min(1).default("RES"),
});
export type IdPrefixes = z.infer<typeof IdPrefixesSchema>;

/** Fallback priorities, used to migrate boards written before priorities existed. */
export const DEFAULT_PRIORITIES: BoardColumn[] = [
  { id: "low", name: "Low", color: "#6b7280" },
  { id: "medium", name: "Medium", color: "#5b8cff" },
  { id: "high", name: "High", color: "#ffcf7a" },
  { id: "urgent", name: "Urgent", color: "#ff6b6b" },
];

/**
 * A timestamp field. YAML parses ISO date strings into JS `Date` objects, so
 * coerce any Date back to an ISO string before validation.
 */
const TimestampSchema = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString() : v),
  z.string(),
);

// ---------------------------------------------------------------------------
// Document model (board.docs): per-area doc types, a hierarchy and hard gates.
// Everything here is optional so boards written before v2 load unchanged; the
// resolvers in docs.ts fall back to the shipped defaults when a board omits it.
// ---------------------------------------------------------------------------

/** One configurable document type in a ticket's pipeline. */
export const DocTypeSchema = z.object({
  /** Lowercase-kebab id; also the on-disk filename (`<id>.md`). */
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "doc id must be lowercase-kebab"),
  name: z.string().min(1),
  /** Doc ids that must exist before this one may be written (doc-before-doc). */
  requires: z.array(z.string()).optional(),
  /** Parse `- [ ]`/`- [x]` progress from this doc (at most one type should set it). */
  progress: z.boolean().optional(),
});
export type DocType = z.infer<typeof DocTypeSchema>;

/**
 * Validate a doc-type list: the reserved `scratch-` prefix, `requires` entries
 * that name a doc absent from the list, and `requires` cycles. Shared by config
 * parsing (below) and mirrored by the Phase 4 Settings editor's validateDraft.
 */
function refineDocTypes(types: DocType[], ctx: z.RefinementCtx): void {
  const ids = new Set(types.map((t) => t.id));
  for (const t of types) {
    if (t.id.startsWith("scratch-")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `doc id "${t.id}" must not start with "scratch-" (reserved for scratch files)`,
      });
    }
    for (const req of t.requires ?? []) {
      if (!ids.has(req)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `doc "${t.id}" requires "${req}", which is not a doc type in this set`,
        });
      }
    }
  }
  // Cycle detection over the `requires` edges (a requires b requires a).
  const edges = new Map(types.map((t) => [t.id, t.requires ?? []]));
  const state = new Map<string, 1 | 2>(); // 1 = on stack, 2 = done
  const hasCycle = (id: string): boolean => {
    if (state.get(id) === 2) return false;
    if (state.get(id) === 1) return true;
    state.set(id, 1);
    for (const next of edges.get(id) ?? []) {
      if (edges.has(next) && hasCycle(next)) return true;
    }
    state.set(id, 2);
    return false;
  };
  for (const t of types) {
    if (hasCycle(t.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `doc "${t.id}" is part of a requires cycle`,
      });
      break;
    }
  }
}

export const DocTypeArraySchema = z.array(DocTypeSchema).superRefine(refineDocTypes);

/** One hard gate: a doc (or a governing repo-doc) required to cross a stage boundary. */
export const GateRuleSchema = z
  .object({
    needs: z.string().optional(),
    needsRepoDoc: z.array(z.string()).optional(),
    before: z
      .object({ leave: z.string().optional(), enter: z.string().optional() })
      .refine((b) => (b.leave === undefined) !== (b.enter === undefined), {
        message: "gate `before` needs exactly one of `leave`/`enter`",
      }),
  })
  .refine((g) => (g.needs === undefined) !== (g.needsRepoDoc === undefined), {
    message: "gate needs exactly one of `needs`/`needsRepoDoc`",
  });
export type GateRule = z.infer<typeof GateRuleSchema>;

/** Per-area document override: its own types and/or gates (each falls back to the default). */
export const AreaDocsSchema = z.object({
  types: DocTypeArraySchema.optional(),
  gates: z.array(GateRuleSchema).optional(),
});
export type AreaDocs = z.infer<typeof AreaDocsSchema>;

/** The `docs` block on board.yml — the whole configurable document model. */
export const DocsConfigSchema = z.object({
  /** Governing-doc kind → repo-relative glob (e.g. prd → docs/prd/**). */
  repoDocs: z.record(z.string()).optional(),
  default: AreaDocsSchema.optional(),
  areas: z.record(AreaDocsSchema).optional(),
});
export type DocsConfig = z.infer<typeof DocsConfigSchema>;

// ---------------------------------------------------------------------------
// Project-declared research sources (FRD-027 / ADR-0020).
// These are preferences, never authority grants. Host availability is supplied
// by the caller at resolution time; the core schema only validates declarations.
// ---------------------------------------------------------------------------

export const SourceKindSchema = z.enum(["mcp", "plugin", "llms-txt"]);
export type SourceKind = z.infer<typeof SourceKindSchema>;

export const SourceSelectorSchema = z
  .object({
    areas: z.array(z.string().min(1).max(80)).max(32).optional(),
    labels: z.array(z.string().min(1).max(80)).max(64).optional(),
  })
  .strict()
  .superRefine((selector, ctx) => {
    for (const [key, values] of Object.entries(selector)) {
      if (!values) continue;
      if (new Set(values).size !== values.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} selector values must be unique`,
        });
      }
    }
  });
export type SourceSelector = z.infer<typeof SourceSelectorSchema>;

function isSafeHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash && !url.search;
  } catch {
    return false;
  }
}

export const SourceDeclarationSchema = z
  .object({
    kind: SourceKindSchema,
    /** MCP/plugin namespace or the canonical HTTPS llms.txt URL. */
    id: z.string().min(1).max(512),
    appliesTo: SourceSelectorSchema.optional(),
    /** Higher values win; declaration order breaks ties. */
    priority: z.number().int().min(-1000).max(1000).optional(),
  })
  .strict()
  .superRefine((source, ctx) => {
    if (source.kind === "llms-txt" && !isSafeHttpsUrl(source.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["id"],
        message: "llms-txt source id must be an HTTPS URL without credentials, query, or fragment",
      });
    }
  });
export type SourceDeclaration = z.infer<typeof SourceDeclarationSchema>;

export const SourceDeclarationArraySchema = z
  .array(SourceDeclarationSchema)
  .max(128)
  .superRefine((sources, ctx) => {
    const seen = new Set<string>();
    sources.forEach((source, index) => {
      let id = source.id;
      if (source.kind === "llms-txt") {
        try {
          const url = new URL(source.id);
          url.protocol = url.protocol.toLowerCase();
          url.hostname = url.hostname.toLowerCase();
          if (url.port === "443") url.port = "";
          url.hash = "";
          id = url.toString();
        } catch {
          // The declaration schema reports the useful URL error below.
        }
      }
      const key = `${source.kind}:${id}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `duplicate source declaration "${key}"`,
        });
      }
      seen.add(key);
    });
  });
export type SourceDeclarations = z.infer<typeof SourceDeclarationArraySchema>;

/** The `deployment` block on board.yml — absent for non-cloud projects. */
export const DeploymentConfigSchema = z.object({
  /** Ordered environments; the last one is "live". */
  environments: z.array(z.string().min(1)).min(1),
});
export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

/**
 * The `delivery` block on board.yml — the project's Git delivery policy
 * (FRD-031).
 *
 * Every key is optional so a project can declare only what differs from the
 * default, and an absent block means the default outright: integrate into
 * `main`, release from `main`, no release candidates, backport a hotfix. That
 * default *is* Kanmer's own policy, which FRD-031 forbids changing merely to
 * demonstrate another one — so Kanmer's board carries no block at all.
 *
 * Resolve it with `resolveDelivery(board)` rather than reading these fields:
 * `releaseBranch` defaults to the *integration* branch, not to a constant.
 */
export const DeliveryConfigSchema = z.object({
  /** Branch normal implementation PRs target. Absent ⇒ `main`. */
  integrationBranch: z.string().min(1).optional(),
  /** Branch releases are cut from. Absent ⇒ the integration branch (main-only). */
  releaseBranch: z.string().min(1).optional(),
  /** Glob for immutable release candidates, e.g. `release/*`. Absent/null ⇒ candidates are not enabled. */
  releaseCandidatePattern: z.string().min(1).nullable().optional(),
  /** Whether a release-branch hotfix owes a backport to the integration branch. Absent ⇒ true. */
  hotfixBackport: z.boolean().optional(),
});
export type DeliveryConfig = z.infer<typeof DeliveryConfigSchema>;

/**
 * board.yml — the status/area/priority definitions that drive tools and GUI.
 *
 * `statuses` is the single workflow dimension (the board's columns). Boards
 * written before that consolidation also carried a `phases` array; zod strips
 * that unknown key on read, so old boards load cleanly and drop it on save.
 */
/** One requirement profile: stage boundary → required document types. */
export const ProfileMapSchema = z.record(z.array(z.string()));

/** A group kind (`epic`, `horizon`, …) with the id prefix its groups get. */
export const GroupKindSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  prefix: z.string().regex(/^[A-Z0-9]{2,6}$/, "prefix must be 2-6 uppercase alphanumerics"),
  color: z.string().optional(),
});
export type GroupKind = z.infer<typeof GroupKindSchema>;

/**
 * board.yml.
 *
 * Format 3 removes `statuses` (stages are constants — ADR-0002) and
 * `priorities` (ADR-0006). Both are still *accepted* on read so an unmigrated
 * board loads without throwing; they are dropped on write. `areas` remains the
 * only editable column kind.
 */
export const BoardConfigSchema = z.object({
  areas: z.array(BoardColumnSchema).default([]),
  idPrefixes: IdPrefixesSchema,
  /** Requirement profiles (FRD-002). Absent ⇒ the shipped defaults. */
  profiles: z.record(ProfileMapSchema).optional(),
  /** The board-wide default profile when ticket and area say nothing. */
  defaultProfile: z.string().optional(),
  /** Group kinds (FRD-001 G1). Absent ⇒ shipped epic + horizon. */
  groupKinds: z.array(GroupKindSchema).optional(),
  /** Proof flavours (FRD-006 R1). Absent ⇒ visual, test-output, command-log. */
  proofTypes: z.array(z.string().min(1)).optional(),
  /** Governing-doc kind → repo-relative glob (prd → docs/product/prd/**). */
  repoDocs: z.record(z.string()).optional(),
  /** Deployment tracking. Absent ⇒ no per-ticket deployment field at all. */
  deployment: DeploymentConfigSchema.optional(),
  /** Git delivery policy (FRD-031). Absent ⇒ main-only; see `resolveDelivery`. */
  delivery: DeliveryConfigSchema.optional(),
  /** Project-declared research sources (FRD-027 / ADR-0020). */
  sources: SourceDeclarationArraySchema.optional(),
  /** Minutes before a ticket claim is considered expired (FRD-030). Absent ⇒ 30. */
  claimExpiryMinutes: z.number().int().positive().optional(),
  /** Minutes between lease heartbeats a worker is expected to keep (FRD-030). Absent ⇒ 5. */
  leaseHeartbeatMinutes: z.number().int().positive().optional(),
  /** Upper bound, in minutes, for an explicit `running-command` lease extension (FRD-030). Absent ⇒ 120. */
  leaseCommandMaxMinutes: z.number().int().positive().optional(),
  /** Legacy, read-only: present on format ≤2 boards, dropped on migration. */
  statuses: z.array(BoardColumnSchema).optional(),
  priorities: z.array(BoardColumnSchema).optional(),
  /** Legacy v2 document model, superseded by `profiles`. */
  docs: DocsConfigSchema.optional(),
});
export type BoardConfig = z.infer<typeof BoardConfigSchema>;

/**
 * The kinds of configurable column in board.yml.
 *
 * Format 3 narrows this to `area`: stages are constants (FRD-007 B3) and
 * priority is gone (FRD-008), so neither is a column anyone can add.
 */
export type ColumnKind = "area";

/**
 * The frontmatter of an item file. Unknown keys are preserved on write so a
 * human's hand-added fields survive a round-trip through an agent edit — which
 * is also why a legacy `phase:` value in an older file is harmless: it rides
 * along untouched and nothing reads it.
 */
export const ItemFrontmatterSchema = z
  .object({
    id: z.string().min(1),
    type: ItemTypeSchema,
    title: z.string().default(""),
    status: z.string().default(""),
    area: z.string().default(""),
    assignee: z.string().default(""),
    /** Requirement profile (FRD-002). Absent ⇒ area default, then board default. */
    profile: z.string().optional(),
    /** Inline requirements, honoured only when `profile` is `custom`. */
    requires: ProfileMapSchema.optional(),
    /** Group ids this ticket belongs to (FRD-001 G3). Membership lives here;
     *  member lists and progress are always derived, never stored. */
    groups: z.array(z.string()).optional(),
    /**
     * When the ticket first entered each stage, keyed by stage id. Written on
     * the way in and never overwritten, so a ticket bounced back to Review
     * keeps when it first got there.
     *
     * Committed history: the activity log carries the same moves but is
     * gitignored, so it does not survive a clone (FRD-002 G2 amendment).
     */
    stageEntered: z.record(TimestampSchema).optional(),
    /** Set while a ticket is taken (being actively worked); absent otherwise. */
    taken_at: TimestampSchema.optional(),
    /** The branch the taken work happens on. */
    branch: z.string().optional(),
    /** The worktree path the taken work happens in, if any. */
    worktree: z.string().optional(),
    /**
     * Bootstrap claim contract (CORE-121, FRD-030 partial). Absent on legacy
     * claims: expiry is then derived from `taken_at` plus the board window.
     * Expiry never releases anything by itself; it only makes `transfer` legal.
     */
    claim_expires_at: TimestampSchema.optional(),
    /** Durable controller identity behind the claim (the MCP client name in `assignee` is not durable). */
    claim_controller: z.string().optional(),
    /** How many times Review has returned this ticket to Implementing. */
    review_round: z.number().int().nonnegative().optional(),
    /** How many Review → Implementing returns are allowed before an operator must intervene (default 1). */
    remediation_budget: z.number().int().positive().optional(),
    /**
     * Renewable workspace lease (CORE-115, FRD-030). Every field is optional
     * and additive: a taken ticket without `lease_id` is a *legacy lease*
     * (CORE-121 / v0.3.12 claim) that receives its full record on its first
     * lease mutation. `taken_at` is the claimed-at instant, `claim_expires_at`
     * the expiry and `claim_controller` the controller identity of the lease.
     */
    lease_id: z.string().min(1).optional(),
    /** Lease-local revision, +1 on every lease write; renewal must name the current one. */
    lease_revision: z.number().int().positive().optional(),
    lease_controller_run: z.string().optional(),
    lease_worker_run: z.string().optional(),
    /** Normalised workspace identity (worktree, else branch) the lease owns. */
    lease_workspace: z.string().optional(),
    lease_provider: z.string().optional(),
    lease_phase: z.string().optional(),
    lease_heartbeat_at: TimestampSchema.optional(),
    /** The controller a reclaimed lease was taken over from (transfer). */
    lease_reclaimed_from: z.string().optional(),
    /**
     * Deliberate batch workspace (CORE-124, FRD-030): the batch this ticket is
     * a frozen member of. Membership is the set of tickets sharing one id; it
     * is stamped on every member by the first member take (`lease_batch_frozen_at`)
     * and only lease verbs under the lease lock write it. Isolated mode (no
     * batch) remains the default.
     */
    lease_batch: z.string().min(1).optional(),
    /** Actual controller actor that declared the frozen batch; never caller-supplied display ownership. */
    lease_batch_controller: z.string().min(1).optional(),
    lease_batch_frozen_at: TimestampSchema.optional(),
    /** Optional fractional sort key; unordered items sort after ordered ones. */
    order: z.number().optional(),
    labels: z.array(z.string()).default([]),
    links: z.array(z.string()).default([]),
    /** Ids this item blocks. Blocked-by is derived as backlinks, never stored. */
    blocks: z.array(z.string()).optional(),
    /** Repo-relative POSIX paths to governing docs (PRD/FRD/ADR) in the repo's own /docs/. */
    refs: z.array(z.string()).optional(),
    /** A governing doc is still to be created/linked — satisfies the repo-doc gate. */
    docs_todo: z.boolean().optional(),
    /** Commit SHAs associated with this ticket (emitted only when non-empty). */
    commits: z.array(z.string()).optional(),
    /** PR references — number or URL — associated with this ticket (emitted only when non-empty). */
    prs: z.array(z.string()).optional(),
    /**
     * Quick capture (CORE-117, FRD-032). Every field is optional and additive,
     * so a board written by an older Kanmer parses unchanged and re-emits these
     * untouched (`.passthrough()` below, plus `orderKeys` in frontmatter.ts).
     *
     * The observation itself is deliberately **not** here: it is the ticket
     * body, which is already searched by `searchItems` and already rendered by
     * every board GUI. What lives in frontmatter is only what a machine has to
     * reason about — the evidence list, who recorded it, and the one promotion
     * decision that took it out of capture state.
     */
    capture_evidence: z.array(z.string()).optional(),
    /** Who recorded the observation; stamped from the activity actor on create. */
    capture_actor: z.string().optional(),
    /** The recorded promotion outcome — one of `CAPTURE_DISPOSITIONS`. */
    capture_disposition: z.string().optional(),
    /** What the disposition resolved to: a ticket id, a batch id or a link. */
    capture_result: z.string().optional(),
    capture_decided_at: TimestampSchema.optional(),
    capture_decided_by: z.string().optional(),
    /** Deployment status; only meaningful when the board declares environments. */
    deployment: z.string().optional(),
    /**
     * Delivery state (CORE-116, FRD-031). Every field is optional and additive,
     * so a board written by an older Kanmer parses unchanged and re-emits these
     * untouched (`.passthrough()` below, plus `orderKeys` in frontmatter.ts).
     *
     * This is deliberately **not** the workflow stage. The stage says whether
     * the ticket was accepted against its integration target; this says how far
     * the change has actually travelled. Nothing here is ever a gate input
     * (ADR-0005), so recording a release can never stand in for proof.
     */
    delivery_state: z.string().optional(),
    /** Branch the work was integrated into — the integration branch, or the release branch for a hotfix. */
    delivery_branch: z.string().optional(),
    /** Exact merged SHA on `delivery_branch` (full 40-hex). */
    delivery_sha: z.string().optional(),
    /** Release-candidate identity this change was frozen into; minted by CORE-132. */
    delivery_candidate: z.string().optional(),
    delivery_release_branch: z.string().optional(),
    delivery_release_tag: z.string().optional(),
    /**
     * Derived, never a caller input: the integration branch a release-branch
     * hotfix owes a backport to. Cleared only by `delivery_backport_sha`.
     */
    delivery_backport_required: z.string().optional(),
    /** Exact merged SHA of the backport that discharged `delivery_backport_required`. */
    delivery_backport_sha: z.string().optional(),
    /** When any delivery field last changed; stamped by the store. */
    delivery_recorded_at: TimestampSchema.optional(),
    archived: z.boolean().default(false),
    created: TimestampSchema.default(""),
    updated: TimestampSchema.default(""),
  })
  .passthrough();
export type ItemFrontmatter = z.infer<typeof ItemFrontmatterSchema>;

/** A fully-loaded item: frontmatter + markdown body. */
export interface Item extends ItemFrontmatter {
  /** Markdown body (everything after the frontmatter block). */
  body: string;
}

/** Filters accepted by listItems / MCP list_items. */
export interface ItemFilter {
  type?: ItemType;
  status?: string;
  area?: string;
  label?: string;
  /**
   * Group id (FRD-001 G3). Membership lives on tickets and is always derived,
   * so this is a predicate over `item.groups` — nothing is read from the group.
   */
  group?: string;
  /**
   * Requirement profile (FRD-032). A predicate over the ticket's *explicit*
   * `profile`, which is what makes `profile: "capture"` the filter that shows
   * or hides quick captures. `searchItems` inherits it for free.
   */
  profile?: string;
  /** Include archived items (default false). */
  includeArchived?: boolean;
}

/** Input for creating an item. id/created/updated are allocated by the store. */
export interface CreateItemInput extends DeliveryPatch {
  type: ItemType;
  title: string;
  status?: string;
  area?: string;
  assignee?: string;
  /** Requirement profile (FRD-002); `custom` reads `requires`. */
  profile?: string;
  /** Inline requirements, honoured only when `profile` is `custom`. */
  requires?: Record<string, string[]>;
  /** Group ids this ticket belongs to (FRD-001 G3). */
  groups?: string[];
  labels?: string[];
  links?: string[];
  blocks?: string[];
  /** Repo-relative POSIX paths to governing docs (validated to exist under the project root). */
  refs?: string[];
  /** Declare that a governing doc is still to be created — satisfies the repo-doc gate. */
  docs_todo?: boolean;
  commits?: string[];
  prs?: string[];
  /** Deployment status; only accepted when the board declares environments. */
  deployment?: string;
  /** Optional capture evidence (FRD-032): screenshot paths, files or links. */
  capture_evidence?: string[];
  /** Who recorded the capture; defaults to the activity actor. */
  capture_actor?: string;
  /** The observation. Required, and refused when blank, for a `capture`. */
  body?: string;
}

/** A patch for updateItem: any frontmatter field plus body. All optional. */
export interface UpdateItemPatch extends DeliveryPatch {
  /** Document-inclusive revision CAS (FRD-029); see `SetDocOptions.expectedRevision`. */
  expectedRevision?: string;
  title?: string;
  status?: string;
  area?: string;
  assignee?: string;
  /** Requirement profile (FRD-002); `custom` reads `requires`. */
  profile?: string;
  /** Inline requirements, honoured only when `profile` is `custom`. */
  requires?: Record<string, string[]>;
  /** Group ids this ticket belongs to (FRD-001 G3). */
  groups?: string[];
  labels?: string[];
  links?: string[];
  blocks?: string[];
  /** Repo-relative POSIX paths to governing docs (validated to exist under the project root). */
  refs?: string[];
  docs_todo?: boolean;
  commits?: string[];
  prs?: string[];
  /** Deployment status; only accepted when the board declares environments. */
  deployment?: string;
  /** Capture evidence (FRD-032); `[]` clears it. */
  capture_evidence?: string[];
  /**
   * Record the promotion decision (FRD-032). Accepted only on a ticket that is
   * currently a capture, validated against `CAPTURE_DISPOSITIONS`, and applied
   * with the derived effect its outcome implies — see `store.updateItem`.
   */
  capture_disposition?: string;
  /** What that decision resolved to: a ticket id, a batch id or a link. */
  capture_result?: string;
  /** Fractional sort key (moveItem's `position` computes this for you). */
  order?: number;
  body?: string;
  archived?: boolean;
  /**
   * Optimistic-concurrency check (opt-in): the `updated` timestamp the caller
   * last read. If the item's current `updated` differs, the write is rejected
   * with a conflict error instead of silently overwriting a newer version.
   * Omit for last-write-wins (the GUI and casual calls).
   */
  expectedUpdated?: string;
  /**
   * Why a ticket is being moved backwards (CORE-121). Required for any move
   * to an earlier stage; a reason beginning with `operator:` is the human
   * override for Review → Implementing without a needs-changes attestation.
   * Recorded in the activity log and the ticket's execution scratch; never
   * stored in frontmatter.
   */
  reason?: string;
}

/** Result of deleteItem: what was removed and what referenced it. */
export interface DeleteItemResult {
  /** False if no item with that id existed. */
  deleted: boolean;
  /** Ids whose frontmatter links[] pointed at the deleted item and were rewritten. */
  cleanedLinks: string[];
  /** Ids whose markdown bodies still reference the deleted id via [[wiki]] links (left as prose). */
  bodyReferencesRemain: string[];
}

/** A problem found while reading the item folders (malformed file, id mismatch). */
export interface ItemWarning {
  /** Absolute path of the offending file. */
  file: string;
  message: string;
}

/** Where a board config came from: a real board.yml or the synthesized default. */
export type BoardSource = "file" | "default";

/** Where moveItem places an item within its target column. */
export type MovePosition = "top" | "bottom" | { after: string };

/** Input for takeTicket: who/where the work is happening. */
export interface TakeTicketInput {
  /** The branch the work happens on (required — it's the point of taking). */
  branch: string;
  /** Worktree path, when working in one. */
  worktree?: string;
  /** Stage to move to; defaults to the board's `implementing` stage if it has one. */
  stage?: string;
  assignee?: string;
  /** Durable controller identity; defaults to `assignee`. */
  controller?: string;
  /**
   * Transport-observed calling actor at the MCP boundary. Batch ownership is
   * bound to this value, never to the observable/caller-supplied controller or
   * assignee labels. Direct store callers fall back to the store's configured
   * actor identity (for example `gui`).
   */
  actor?: string;
  /** Take over a ticket that is already taken. */
  force?: boolean;
  /** Document-inclusive revision CAS (FRD-029); see `SetDocOptions.expectedRevision`. */
  expectedRevision?: string;
  /** Lease identity (FRD-030): the controller run acquiring the workspace. */
  controllerRun?: string;
  /** Lease identity (FRD-030): the worker run doing the work. */
  workerRun?: string;
  /** Provider behind the worker (e.g. claude-code, codex). */
  provider?: string;
  /** Lease phase; defaults to `implementing`. */
  phase?: LeasePhase;
  /**
   * Batch workspace (CORE-124, FRD-030). With `batchMembers`, this take
   * declares and freezes the batch in one locked write set; without them it
   * names the frozen batch the ticket already belongs to.
   */
  batch?: string;
  /** The complete membership (two or more ids, including this ticket) — accepted only before the batch is frozen. */
  batchMembers?: string[];
}

/** The lease phases FRD-030 names; `running-command` is the explicit long-command state. */
export const LEASE_PHASES = ["implementing", "running-command", "review", "verifying", "closeout"] as const;
export type LeasePhase = (typeof LEASE_PHASES)[number];

/**
 * A ticket is terminal for batch cleanup when it is Done or has been archived
 * (kanmer-closeout's two accepted terminal shapes: verified success, or a
 * retired non-success archived in Verifying).
 */
export function isTerminalTicket(item: Pick<Item, "status" | "archived">): boolean {
  return item.status === "done" || item.archived === true;
}

/** One member of a batch workspace as `KanmerStore.batchState` reports it. */
export interface BatchMemberState {
  id: string;
  exists: boolean;
  status: string;
  archived: boolean;
  terminal: boolean;
  taken: boolean;
}

/** The frozen batch a ticket belongs to (CORE-124): members, their terminal-ness and the shared workspace. */
export interface BatchState {
  id: string;
  /** Actual actor that declared the batch, or null for an inconsistent legacy record. */
  controller: string | null;
  frozenAt: string | null;
  /** Whether the declaration is complete, recoverably pending, or internally inconsistent. */
  declaration: "consistent" | "pending" | "inconsistent";
  /** The workspace the batch occupies (first taken member's lease workspace), null before any member is taken. */
  workspace: string | null;
  members: BatchMemberState[];
  /** True once every member is Done or archived — the point at which cleanup and release may proceed. */
  allTerminal: boolean;
}

/** Input for renewTicket (CORE-115): the caller's own lease, named by id and revision. */
export interface RenewTicketInput {
  /** Transport-observed renewing actor; authoritative for batch ownership. */
  actor: string;
  /** Compatibility display owner for isolated claims; never authorizes a batch. */
  owner?: string;
  /** The lease the caller holds; required once the ticket carries a lease. */
  leaseId?: string;
  /** The lease revision the caller last read; refused with `Conflict:` when stale. */
  leaseRevision?: number;
  /** New phase; unchanged when omitted. */
  phase?: LeasePhase;
  /** Explicit extension for `running-command`, clamped to `leaseCommandMaxMinutes`. */
  extendMinutes?: number;
  controllerRun?: string;
  workerRun?: string;
  provider?: string;
  /** Document-inclusive revision CAS (FRD-029); refused with `Conflict:` when stale. */
  expectedRevision?: string;
}

/**
 * What a reclaim re-read before taking over an expired lease (FRD-030). Core
 * cannot inspect Git or GitHub; the host boundary collects this and the store
 * records it — it never deletes or resets anything based on it.
 */
export interface LeaseRecoveryEvidence {
  workspace: "not-recorded" | "clean" | "dirty" | "missing" | "unavailable";
  claimIdentity: "not-applicable" | "matches-claim" | "foreign-repository" | "branch-mismatch" | "detached" | "unavailable";
  boardWorktree: boolean;
  pullRequest: "absent" | "open" | "merged" | "closed-unmerged" | "unavailable";
  commits: number;
  proof: "absent" | "pass" | "fail" | "invalid";
}

/** Input for transferTicket: hand an expired (or operator-released) claim to a new controller. */
export interface TransferTicketInput {
  /** The new assignee (MCP client name). */
  assignee: string;
  /** Durable controller identity; defaults to `assignee`. */
  controller?: string;
  /** Required to transfer a live claim: must begin with `operator:`. */
  reason?: string;
  /** Document-inclusive revision CAS (FRD-029); refused with `Conflict:` when stale. */
  expectedRevision?: string;
  controllerRun?: string;
  workerRun?: string;
  provider?: string;
  /** Evidence re-read by the host before reclaiming; recorded in the transition. */
  recovery?: LeaseRecoveryEvidence;
}

/** Bootstrap claim state (CORE-121). */
export type ClaimState = "unclaimed" | "live" | "expired";

/**
 * How far a change has actually travelled (FRD-031), in order.
 *
 * Deliberately independent of the six workflow stages: a ticket reaches Done on
 * acceptance against its *integration* target, and its inclusion in a release
 * is recorded here afterwards. `not-integrated` is the absent-field default.
 */
export const DELIVERY_STATES = [
  "not-integrated",
  "integrated",
  "release-candidate",
  "released",
  "deployed",
  "production-verified",
] as const;
export type DeliveryState = (typeof DELIVERY_STATES)[number];

/** True for one of the six recorded delivery states. */
export function isDeliveryState(value: string): value is DeliveryState {
  return (DELIVERY_STATES as readonly string[]).includes(value);
}

/**
 * Rank of a delivery state, used only to ask "is this state at or beyond X?".
 * It is not an ordering the store enforces: a real release can be rolled back,
 * so regression is legal. What is *not* legal is claiming a state without the
 * evidence that state requires — that is what `assertDeliveryAgainstBoard` checks.
 */
export function deliveryStateRank(state: DeliveryState): number {
  return DELIVERY_STATES.indexOf(state);
}

/** The integration branch assumed when board.yml declares no delivery policy. */
export const DEFAULT_INTEGRATION_BRANCH = "main";

/** A project's resolved Git delivery policy — every field decided (FRD-031). */
export interface DeliveryPolicy {
  /** Branch normal implementation PRs target and ordinary verification proves. */
  integrationBranch: string;
  /** Branch releases are cut from; equal to `integrationBranch` for a main-only project. */
  releaseBranch: string;
  /** Glob for immutable release candidates; null when candidates are not enabled. */
  releaseCandidatePattern: string | null;
  /** Whether a release-branch hotfix owes a backport to the integration branch. */
  hotfixBackport: boolean;
}

/** Whether a resolved policy came from board.yml or from the shipped default. */
export type DeliveryPolicySource = "board" | "default";

/**
 * The delivery fields a caller may set (FRD-031). `""` clears one field, the
 * same sentinel `deployment` uses.
 *
 * `delivery_backport_required` is absent on purpose: it is *derived* by the
 * store from the policy and `delivery_branch`, so a hotfix cannot record itself
 * as owing nothing. `delivery_recorded_at` is stamped, not supplied.
 */
export interface DeliveryPatch {
  delivery_state?: string;
  delivery_branch?: string;
  delivery_sha?: string;
  delivery_candidate?: string;
  delivery_release_branch?: string;
  delivery_release_tag?: string;
  delivery_backport_sha?: string;
}

/** The frontmatter keys a `DeliveryPatch` may write, plus the two derived ones. */
export const DELIVERY_PATCH_KEYS = [
  "delivery_state",
  "delivery_branch",
  "delivery_sha",
  "delivery_candidate",
  "delivery_release_branch",
  "delivery_release_tag",
  "delivery_backport_sha",
] as const satisfies readonly (keyof DeliveryPatch)[];

/** Every delivery frontmatter key, in serialisation order. */
export const DELIVERY_FIELD_KEYS = [
  "delivery_state",
  "delivery_branch",
  "delivery_sha",
  "delivery_candidate",
  "delivery_release_branch",
  "delivery_release_tag",
  "delivery_backport_required",
  "delivery_backport_sha",
  "delivery_recorded_at",
] as const;

/** Default claim window when board.yml does not set `claimExpiryMinutes`. */
export const DEFAULT_CLAIM_EXPIRY_MINUTES = 30;
/** Default heartbeat cadence when board.yml does not set `leaseHeartbeatMinutes`. */
export const DEFAULT_LEASE_HEARTBEAT_MINUTES = 5;
/** Default bound for a `running-command` extension when board.yml does not set `leaseCommandMaxMinutes`. */
export const DEFAULT_LEASE_COMMAND_MAX_MINUTES = 120;

/** Explicit, testable lease timing (FRD-030). */
export interface LeaseConfig {
  expiryMinutes: number;
  heartbeatMinutes: number;
  commandMaxMinutes: number;
}

/** Resolve the lease timing from board.yml, falling back to the FRD-030 defaults. */
export function leaseConfig(
  board: Pick<BoardConfig, "claimExpiryMinutes" | "leaseHeartbeatMinutes" | "leaseCommandMaxMinutes"> | undefined,
): LeaseConfig {
  return {
    expiryMinutes: board?.claimExpiryMinutes ?? DEFAULT_CLAIM_EXPIRY_MINUTES,
    heartbeatMinutes: board?.leaseHeartbeatMinutes ?? DEFAULT_LEASE_HEARTBEAT_MINUTES,
    commandMaxMinutes: board?.leaseCommandMaxMinutes ?? DEFAULT_LEASE_COMMAND_MAX_MINUTES,
  };
}

/** A ticket's lease as classified on read (CORE-115). */
export interface LeaseState {
  state: ClaimState;
  /** True for a taken ticket with no `lease_id` — a CORE-121 / v0.3.12 claim not yet migrated. */
  legacy: boolean;
  /** When the lease expires (derived for a legacy lease); null when unclaimed. */
  expiresAt: string | null;
  /** True when the last heartbeat (or claimed-at) is older than the heartbeat window. */
  heartbeatStale: boolean;
}

type LeaseFields = Pick<Item, "taken_at" | "claim_expires_at" | "lease_id" | "lease_heartbeat_at">;

/**
 * Classify a ticket's lease. The one expiry rule for every claim, old or new:
 * a lease with `claim_expires_at` expires at that instant; a legacy claim (no
 * `claim_expires_at`) expires `expiryMinutes` after `taken_at` — the FRD-030
 * "one migration path" for permanent claims. Expiry never releases anything.
 */
export function leaseState(
  item: LeaseFields,
  now: Date = new Date(),
  config: Partial<LeaseConfig> | number = {},
): LeaseState {
  const minutes = typeof config === "number" ? config : config.expiryMinutes ?? DEFAULT_CLAIM_EXPIRY_MINUTES;
  const heartbeat = typeof config === "number" ? DEFAULT_LEASE_HEARTBEAT_MINUTES : config.heartbeatMinutes ?? DEFAULT_LEASE_HEARTBEAT_MINUTES;
  if (!item.taken_at) return { state: "unclaimed", legacy: false, expiresAt: null, heartbeatStale: false };
  const expiresAt = item.claim_expires_at
    ? Date.parse(item.claim_expires_at)
    : Date.parse(item.taken_at) + minutes * 60_000;
  const legacy = !item.lease_id;
  const lastBeat = Date.parse(item.lease_heartbeat_at ?? item.taken_at);
  const heartbeatStale = !Number.isNaN(lastBeat) && lastBeat + heartbeat * 60_000 < now.getTime();
  // Unparseable timestamps never expire silently.
  if (Number.isNaN(expiresAt)) return { state: "live", legacy, expiresAt: null, heartbeatStale };
  return {
    state: expiresAt < now.getTime() ? "expired" : "live",
    legacy,
    expiresAt: new Date(expiresAt).toISOString(),
    heartbeatStale,
  };
}

/** True for a taken ticket that carries no lease record yet (CORE-121 / v0.3.12 claim). */
export function isLegacyLease(item: Pick<Item, "taken_at" | "lease_id">): boolean {
  return Boolean(item.taken_at) && !item.lease_id;
}

/**
 * Classify a ticket's claim (CORE-121 shape). Kept as the thin wrapper over
 * `leaseState` so nothing has two expiry rules.
 */
export function claimState(
  item: Pick<Item, "taken_at" | "claim_expires_at">,
  now: Date = new Date(),
  minutes: number = DEFAULT_CLAIM_EXPIRY_MINUTES,
): ClaimState {
  return leaseState(item, now, minutes).state;
}

/** Whether a backward-move or transfer reason is the human operator override. */
export function isOperatorReason(reason: string | undefined): boolean {
  return typeof reason === "string" && /^operator:\s*\S/u.test(reason);
}

/**
 * A legacy claim is present when any claim-owned field survives (CORE-122,
 * salvaged from PR #286). Branch/worktree-only claims from historic boards
 * are still claims for reconciliation purposes.
 */
export function hasLegacyTicketClaim(
  claim: Pick<Item, "taken_at" | "branch" | "worktree">,
): boolean {
  return Boolean(claim.taken_at || claim.branch || claim.worktree);
}

/**
 * Facts collected by an approved host boundary before the read-only
 * reconciliation policy runs (FRD-028 dry-run half, CORE-122).
 */
export interface ReconciliationEvidence {
  ticket: {
    id: string;
    status: string;
    updated: string;
    taken: boolean;
  };
  /** Bootstrap claim facts (CORE-121): `current` is a live, unexpired claim. */
  claim: {
    state: "unclaimed" | "current" | "expired";
    controller: string | null;
    worker: string | null;
    takenAt: string | null;
    expiresAt: string | null;
    branch: string | null;
    worktree: string | null;
    reviewRound: number;
    remediationBudget: number;
    /** Lease record (CORE-115); null on a legacy claim, absent from older collectors. */
    leaseId?: string | null;
    leaseRevision?: number | null;
    heartbeatAt?: string | null;
    phase?: string | null;
    legacy?: boolean;
  };
  /** Recorded ticket commits and their reachability from the exact merge target. */
  commits: {
    values: string[];
    reachability: "not-applicable" | "reachable" | "unreachable" | "unavailable";
  };
  pullRequest: {
    state: "absent" | "open" | "merged" | "closed-unmerged" | "unavailable";
    headSha?: string;
    mergeSha?: string;
    requiredChecks: "pass" | "fail" | "pending" | "unavailable" | "not-applicable";
  };
  proof: {
    state: "absent" | "pass" | "fail" | "invalid";
    mergedSha?: string;
    /**
     * The proof record's `failure_class` (SKILL-037), decoded by the host
     * boundary. A non-PASS record that names no class — or names one this
     * build does not know — is `inconclusive`, which is the skill's explicit
     * default and never means "retryable".
     */
    failureClass?: ReconciliationFailureClass;
  };
  workspace: {
    state: "not-recorded" | "clean" | "dirty" | "missing" | "unavailable";
    recordedWorktree: string | null;
    boardWorktree?: boolean;
    /** Proven via `--git-common-dir`; recovery recommendations do not infer it. */
    claimIdentity: "not-applicable" | "matches-claim" | "foreign-repository" | "branch-mismatch" | "detached" | "unavailable";
  };
  /**
   * Release-attempt observation (CORE-132). Produced by
   * `classifyReleaseEvidence` over the persisted `.kanmer/releases/` records:
   * `superseded` when the ticket's release evidence has been archived behind a
   * successor, `contended` when its ownership is ambiguous, `unavailable` when
   * a bounded retry schedule is live or a record cannot be read, and
   * `not-applicable` when no attempt names the ticket or the attempt that does
   * is cleanly owned or cleanly finished. A finished release deliberately reads
   * `not-applicable`: an ordinary ticket must never sit waiting for one.
   */
  release: {
    state: "not-applicable" | "superseded" | "contended" | "unavailable";
  };
}

export interface ReconciliationFinding {
  code: string;
  level: "info" | "warning" | "error";
  message: string;
}

/**
 * How a verification failure is classified by the proof record it came from
 * (SKILL-037, `kanmer-verify/SKILL.md`). `implementation` and `plan` route the
 * ticket backwards; `transient` and `inconclusive` leave it in Verifying.
 */
export type ReconciliationFailureClass = "implementation" | "plan" | "transient" | "inconclusive";

/**
 * The exhaustive set of recoveries reconciliation may propose and
 * `apply_reconciliation` may perform (FRD-028 acceptance 2-4). Every member is
 * composed from an existing store verb: there is no new stage, no force-push,
 * no required-check bypass, no worktree or branch deletion and no workspace
 * cleaning.
 */
export type ReconciliationAction =
  | "MOVE_TO_IMPLEMENTING"
  | "MOVE_TO_VERIFYING"
  | "MOVE_TO_DONE"
  | "ROUTE_VERIFICATION_FAILURE"
  | "RELEASE_CLEAN_TERMINAL_CLAIM"
  | "RECOVER_EXPIRED_CLAIM";

/**
 * Advisory, and bound to the state it was computed from. `advisory: true`
 * still means nothing in core consumes it as authority — an apply is always an
 * explicit second call. `revision` is the ticket's document-inclusive revision
 * (FRD-029) at collection time and is what `apply_reconciliation` compares
 * `expected_revision` against, so a proof rewritten between the dry run and the
 * apply is refused rather than acted on (CORE-113 F-015). The pure classifier
 * cannot read a store, so it emits `revision: null` and the host boundary that
 * collected the evidence stamps the real value.
 */
export interface ReconciliationRecommendation {
  action: ReconciliationAction;
  targetStatus?: string;
  advisory: true;
  /** The ticket this recommendation was computed for. */
  ticketId: string;
  /** Document-inclusive revision it was computed from; null on a legacy-layout ticket. */
  revision: string | null;
}

/**
 * One explicit, revision-bound apply of a reconciliation action. The action
 * and `targetStatus` come from a freshly re-collected recommendation, never
 * from the caller's memory; `expectedRevision` is the freshness token and is
 * passed straight into the store verb's own locked CAS.
 */
export interface ReconciliationApplyInput {
  action: ReconciliationAction;
  targetStatus?: string;
  /** Document-inclusive revision CAS; refused with `Conflict:` when stale. */
  expectedRevision: string;
  /** Judged by the existing backward-move contract; never synthesised as `operator:` here. */
  reason?: string;
  /** Durable controller identity recorded by a claim recovery. */
  controller?: string;
  /** Who the audit line names; defaults to the store's activity actor. */
  actor?: string;
  /** Host-collected re-read recorded by a claim recovery (never acted on). */
  recovery?: LeaseRecoveryEvidence;
}

/** Who was responsible, and at what stage, on either side of an applied action. */
export interface ReconciliationResponsibility {
  status: string;
  controller: string | null;
}

export interface ReconciliationApplyResult {
  item: Item;
  action: ReconciliationAction;
  from: ReconciliationResponsibility;
  to: ReconciliationResponsibility;
  /** The durable `## Transitions` line this apply appended. */
  transition: string;
}

export interface ReconciliationResult {
  evidence: ReconciliationEvidence;
  findings: ReconciliationFinding[];
  recommendation: ReconciliationRecommendation | null;
}

/** Forward + backward relations for one item (get_links). */
export interface LinkGraph {
  id: string;
  /** ids this item points at (frontmatter links[] ∪ [[wiki]] in body). */
  links: string[];
  /** ids that point at this item. */
  backlinks: string[];
  /** ids this item blocks (frontmatter blocks[]). */
  blocks: string[];
  /** ids blocking this item — derived backlinks over blocks edges. */
  blockedBy: string[];
}
