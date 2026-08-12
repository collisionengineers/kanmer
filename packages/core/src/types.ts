import { z } from "zod";

/** The three kinds of item Kanmer stores, each in its own subfolder. */
export const ItemTypeSchema = z.enum(["ticket", "plan", "research"]);
export type ItemType = z.infer<typeof ItemTypeSchema>;

/**
 * Priority is a string id into `board.priorities` (configurable). The default
 * board seeds low/medium/high/urgent, but users can rename/add their own.
 */
export type Priority = string;

/** A phase, status, area or priority entry in board.yml. */
export const BoardColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().optional(),
});
export type BoardColumn = z.infer<typeof BoardColumnSchema>;

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

/** board.yml — the phase/status/area/priority definitions that drive tools and GUI. */
export const BoardConfigSchema = z.object({
  phases: z.array(BoardColumnSchema).min(1),
  statuses: z.array(BoardColumnSchema).min(1),
  areas: z.array(BoardColumnSchema).default([]),
  priorities: z.array(BoardColumnSchema).min(1).default(DEFAULT_PRIORITIES),
  idPrefixes: IdPrefixesSchema,
});
export type BoardConfig = z.infer<typeof BoardConfigSchema>;

/** The kinds of configurable column in board.yml. */
export type ColumnKind = "phase" | "status" | "area" | "priority";

/**
 * The frontmatter of an item file. Unknown keys are preserved on write so a
 * human's hand-added fields survive a round-trip through an agent edit.
 */
export const ItemFrontmatterSchema = z
  .object({
    id: z.string().min(1),
    type: ItemTypeSchema,
    title: z.string().default(""),
    phase: z.string().default(""),
    status: z.string().default(""),
    area: z.string().default(""),
    priority: z.string().default("medium"),
    assignee: z.string().default(""),
    labels: z.array(z.string()).default([]),
    links: z.array(z.string()).default([]),
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
  phase?: string;
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
  phase?: string;
  status?: string;
  area?: string;
  priority?: Priority;
  assignee?: string;
  labels?: string[];
  links?: string[];
  body?: string;
}

/** A patch for updateItem: any frontmatter field plus body. All optional. */
export interface UpdateItemPatch {
  title?: string;
  phase?: string;
  status?: string;
  area?: string;
  priority?: Priority;
  assignee?: string;
  labels?: string[];
  links?: string[];
  body?: string;
  archived?: boolean;
}

/** Forward + backward relations for one item (get_links). */
export interface LinkGraph {
  id: string;
  /** ids this item points at (frontmatter links[] ∪ [[wiki]] in body). */
  links: string[];
  /** ids that point at this item. */
  backlinks: string[];
}
