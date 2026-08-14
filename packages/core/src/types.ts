import { z } from "zod";

/** The three kinds of item Kanmer stores, each in its own subfolder. */
export const ItemTypeSchema = z.enum(["ticket", "plan", "research"]);
export type ItemType = z.infer<typeof ItemTypeSchema>;

/**
 * Priority is a string id into `board.priorities` (configurable). The default
 * board seeds low/medium/high/urgent, but users can rename/add their own.
 */
export type Priority = string;

/** A status, area or priority entry in board.yml. */
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
});
export type BoardColumn = z.infer<typeof BoardColumnSchema>;

/**
 * A ticket document name. The doc set is per-area configurable data now (see
 * `board.docs` and `resolveDocTypes` in docs.ts), so this is just a string; the
 * store validates a write against the ticket area's configured set. The shipped
 * default set lives in `DEFAULT_DOC_TYPES` (docs.ts).
 */
export type TicketDoc = string;

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
export interface TicketDocsInfo {
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
export const BoardConfigSchema = z.object({
  statuses: z.array(BoardColumnSchema).min(1),
  areas: z.array(BoardColumnSchema).default([]),
  priorities: z.array(BoardColumnSchema).min(1).default(DEFAULT_PRIORITIES),
  idPrefixes: IdPrefixesSchema,
  /** The configurable document model. Absent ⇒ the shipped defaults (docs.ts). */
  docs: DocsConfigSchema.optional(),
  /** Deployment tracking. Absent ⇒ no per-ticket deployment field at all. */
  deployment: DeploymentConfigSchema.optional(),
});
export type BoardConfig = z.infer<typeof BoardConfigSchema>;

/** The kinds of configurable column in board.yml. */
export type ColumnKind = "status" | "area" | "priority";

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
    priority: z.string().default("medium"),
    assignee: z.string().default(""),
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
  /** Include archived items (default false). */
  includeArchived?: boolean;
}

/** Input for creating an item. id/created/updated are allocated by the store. */
export interface CreateItemInput {
  type: ItemType;
  title: string;
  status?: string;
  area?: string;
  priority?: Priority;
  assignee?: string;
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
  priority?: Priority;
  assignee?: string;
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
