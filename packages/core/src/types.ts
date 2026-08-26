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
  /** Project-declared research sources (FRD-027 / ADR-0020). */
  sources: SourceDeclarationArraySchema.optional(),
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
    /** Deployment status; only meaningful when the board declares environments. */
    deployment: z.string().optional(),
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
  /** Include archived items (default false). */
  includeArchived?: boolean;
}

/** Input for creating an item. id/created/updated are allocated by the store. */
export interface CreateItemInput {
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
  body?: string;
}

/** A patch for updateItem: any frontmatter field plus body. All optional. */
export interface UpdateItemPatch {
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
  /** Take over a ticket that is already taken. */
  force?: boolean;
}

/** Facts collected by an approved host boundary before reconciliation policy runs. */
export interface ReconciliationEvidence {
  ticket: {
    id: string;
    status: string;
    updated: string;
    taken: boolean;
  };
  /** Legacy claim data is observed only; CORE-114/115 own replacement identity and lease schemas. */
  claim: {
    state: "unclaimed" | "legacy";
    controller: string | null;
    worker: string | null;
    takenAt: string | null;
    branch: string | null;
    worktree: string | null;
  };
  /** Recorded ticket commits, without reachability or history rewriting. */
  commits: string[];
  pullRequest: {
    state: "absent" | "open" | "merged" | "closed-unmerged" | "unavailable";
    headSha?: string;
    mergeSha?: string;
    requiredChecks: "pass" | "fail" | "pending" | "unavailable" | "not-applicable";
  };
  proof: {
    state: "absent" | "pass" | "fail" | "invalid";
    mergedSha?: string;
  };
  workspace: {
    state: "not-recorded" | "clean" | "dirty" | "missing" | "unavailable";
    recordedWorktree: string | null;
    boardWorktree?: boolean;
  };
  release: {
    state: "none" | "superseded" | "contended" | "unavailable";
  };
}

/** The only board mutations reconciliation is allowed to request. */
export type ReconciliationAction =
  | "MOVE_TO_IMPLEMENTING"
  | "MOVE_TO_VERIFYING"
  | "MOVE_TO_DONE"
  | "RELEASE_CLEAN_TERMINAL_CLAIM";

export interface ReconciliationProposal {
  /** Stable hash of the action and all evidence it was derived from. */
  id: string;
  ticketId: string;
  ticketUpdated: string;
  action: ReconciliationAction;
  targetStatus?: string;
}

export interface ReconciliationFinding {
  code: string;
  level: "info" | "warning" | "error";
  message: string;
}

export interface ReconciliationResult {
  evidence: ReconciliationEvidence;
  findings: ReconciliationFinding[];
  proposal: ReconciliationProposal | null;
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
