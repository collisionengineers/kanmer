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

/** The five pipeline documents that live inside a ticket's folder (format 2). */
export const TICKET_DOCS = ["research", "impact", "plan", "checklist", "proof"] as const;
export type TicketDoc = (typeof TICKET_DOCS)[number];

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
  docs: Record<TicketDoc, boolean>;
  /** Parsed from `- [ ]` / `- [x]` lines in checklist.md; null when absent. */
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
    /** Optional date-only deadline (YYYY-MM-DD). YAML parses bare dates to Date. */
    due: z
      .preprocess(
        (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      )
      .optional(),
    /** Optional fractional sort key; unordered items sort after ordered ones. */
    order: z.number().optional(),
    labels: z.array(z.string()).default([]),
    links: z.array(z.string()).default([]),
    /** Ids this item blocks. Blocked-by is derived as backlinks, never stored. */
    blocks: z.array(z.string()).optional(),
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
  /** Only items with a due date strictly before this date (YYYY-MM-DD). */
  dueBefore?: string;
  /** Only items due before today that haven't reached the final stage. */
  overdue?: boolean;
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
  due?: string;
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
  /** YYYY-MM-DD; pass "" to clear. */
  due?: string;
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
