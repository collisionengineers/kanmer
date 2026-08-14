import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import path from "node:path";
import { z } from "zod";
import {
  KanmerStore,
  computeBlockedIds,
  getLinkGraph,
  linkItems,
  migrateBoard,
  repoDocsMap,
  resolveDocTypes,
  resolveGates,
  serialiseItem,
  takeTicketPromptText,
  watchKanmer,
  type Item,
  type WatchHandle,
} from "@kanmer/core";
import { resolveProjectRoot } from "./root.js";

const projectRoot = resolveProjectRoot(process.argv.slice(2), process.env);
const store = new KanmerStore(projectRoot);

/** JSON tool result. */
function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/** Error tool result (surfaced to the model, not a protocol failure). */
function fail(message: string) {
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
}

/** Wrap a handler so thrown errors become clean isError results. */
function guard<A extends unknown[]>(fn: (...args: A) => Promise<ReturnType<typeof ok>>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }
  };
}

/** Create the .kanmer skeleton on first write — never merely because we booted. */
let initialised = false;
async function ensureInit() {
  if (initialised) return;
  await store.init();
  initialised = true;
}

/** Wrap a write handler: lazily create the .kanmer skeleton, then run it under guard(). */
function write<A extends unknown[]>(fn: (...args: A) => Promise<ReturnType<typeof ok>>) {
  return guard(async (...args: A) => {
    // Attribute this mutation in the activity log to the calling client.
    store.setActor(actorName(args[1]));
    await ensureInit();
    return fn(...args);
  });
}

/**
 * Who is calling: the per-request `_meta` client identity, else the
 * clientInfo negotiated at initialize, else "agent". Used to default
 * take_ticket's assignee and to attribute activity-log entries.
 *
 * The `io.modelcontextprotocol/client` key is the 2026-07-28 spec's client-
 * identity carrier. SDK 1.30 negotiates at most protocol 2025-11-25 and no
 * 2025-11-25 host sends that key, so in practice today the actor comes from
 * getClientVersion(). The branch is kept deliberately — it is the forward
 * path, and the SDK does deliver params._meta to handlers on every protocol
 * — and it is exercised for real by smoke-protocol.mjs.
 */
function actorName(extra?: unknown): string {
  const meta = (extra as { _meta?: Record<string, unknown> } | undefined)?._meta;
  const candidates = [
    (meta?.["io.modelcontextprotocol/client"] as { name?: string } | undefined)?.name,
    (meta?.["clientInfo"] as { name?: string } | undefined)?.name,
  ];
  for (const c of candidates) if (typeof c === "string" && c) return c;
  return server.server.getClientVersion()?.name ?? "agent";
}

/**
 * Ask the host to confirm a destructive operation when it supports
 * elicitation; hosts without the capability proceed as before (their own
 * approval flow is the gate there). Returns false only on an explicit
 * decline/cancel.
 */
async function confirmDestructive(message: string): Promise<boolean> {
  if (!server.server.getClientCapabilities()?.elicitation) return true;
  try {
    const res = await server.server.elicitInput({
      message,
      requestedSchema: {
        type: "object",
        properties: {
          confirm: { type: "boolean", description: "true to proceed" },
        },
        required: ["confirm"],
      },
    });
    return res.action === "accept" && (res.content as { confirm?: boolean })?.confirm === true;
  } catch {
    // Capability advertised but the round-trip failed — treat as unsupported.
    return true;
  }
}

/**
 * Trim an item to a list-friendly summary (no body). Every key is always
 * present so agents never have to guess whether an absent key means "no" or
 * "not reported": docs/checklist are null for legacy-layout items, taken is
 * null when the ticket isn't taken, order/refs/deployment are null when unset.
 */
async function summarise(item: Item, blockedIds: Set<string>) {
  const info = item.type === "ticket" ? await store.getTicketDocsInfo(item.id) : null;
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    status: item.status,
    area: item.area,
    priority: item.priority,
    assignee: item.assignee,
    labels: item.labels,
    order: item.order ?? null,
    blocked: blockedIds.has(item.id),
    refs: item.refs ?? null,
    deployment: item.deployment ?? null,
    created: item.created,
    updated: item.updated,
    archived: item.archived,
    taken: item.taken_at
      ? { taken_at: item.taken_at, branch: item.branch ?? null, worktree: item.worktree ?? null }
      : null,
    docs: info?.docs ?? null,
    checklist: info?.checklist ?? null,
  };
}

/** Which item ids are currently blocked (live blocker, per the whole board). */
async function blockedSet(): Promise<Set<string>> {
  const all = await store.listItems({ includeArchived: true });
  const board = await store.getBoard();
  return computeBlockedIds(all, board.statuses[board.statuses.length - 1]?.id);
}

const itemTypeEnum = z.enum(["ticket", "plan", "research"]);
// Doc names are per-area configurable data now (board.docs); core validates a
// write against the ticket area's set, so the wire type is a plain string.
const ticketDocEnum = z.string();
const columnKindEnum = z.enum(["status", "area", "priority"]);

const createFields = {
  type: itemTypeEnum.default("ticket").describe("ticket | plan | research (v2 boards: ticket only)"),
  title: z.string().describe("Short title"),
  status: z.string().optional().describe("Status id / workflow stage (defaults to the first stage)"),
  area: z.string().optional().describe("Area id (see list_board → areas)"),
  priority: z.string().optional().describe("Priority id (see list_board → priorities)"),
  assignee: z.string().optional(),
  labels: z.array(z.string()).optional(),
  links: z.array(z.string()).optional().describe("Ids of related items (must exist)"),
  blocks: z.array(z.string()).optional().describe("Ids this item blocks (must exist)"),
  refs: z
    .array(z.string())
    .optional()
    .describe("Repo-relative paths to governing docs (PRD/FRD/ADR); each must exist"),
  docs_todo: z
    .boolean()
    .optional()
    .describe("A governing doc is still to be created — satisfies the leave-backlog gate"),
  commits: z.array(z.string()).optional().describe("Commit SHAs associated with this ticket"),
  prs: z.array(z.string()).optional().describe("PR references (number or URL)"),
  deployment: z
    .string()
    .optional()
    .describe("Deployment status (only when the board declares environments): n/a | not-deployed | <env-id>"),
  body: z.string().optional().describe("Markdown body; may contain [[id]] wiki-links"),
};

const server = new McpServer({ name: "kanmer", version: "0.1.0" });

// ---------------------------------------------------------------------------
// Read tools
// ---------------------------------------------------------------------------

server.registerTool(
  "get_status",
  {
    title: "Project status",
    description:
      "Orientation call — use it first, every session. Returns the project root, whether .kanmer/ exists (this tool never creates it), the storage format version, whether the board came from a real board.yml or is the synthesized default, per-stage and per-type item counts, archived/taken counts, and how many file warnings the listing produced.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async () => {
    const exists = await store.exists();
    const format = await store.detectFormat();
    const { board, source } = await store.getBoardWithSource();
    const { items, warnings } = await store.listItemsWithWarnings({ includeArchived: true });
    const active = items.filter((i) => !i.archived);
    const byStage: Record<string, number> = {};
    for (const s of board.statuses) byStage[s.id] = 0;
    let offBoardStage = 0;
    const byType: Record<string, number> = {};
    for (const item of active) {
      if (item.status in byStage) byStage[item.status]++;
      else offBoardStage++;
      byType[item.type] = (byType[item.type] ?? 0) + 1;
    }
    return ok({
      projectRoot,
      kanmerDir: store.paths.kanmer,
      exists,
      format,
      boardSource: source,
      deploymentTracking: board.deployment !== undefined,
      counts: {
        byStage,
        byType,
        offBoardStage,
        archived: items.length - active.length,
        taken: active.filter((i) => i.taken_at).length,
      },
      warningsCount: warnings.length,
    });
  }),
);

server.registerTool(
  "list_board",
  {
    title: "List board configuration",
    description:
      "Return the board configuration: the ordered statuses (the workflow stages, which are the kanban columns), the areas (each with the id prefix its tickets are born with), the priorities, and the legacy id prefixes. Call this to learn valid status/area/priority ids before creating or moving items. The `source` field says whether this is a real board.yml (\"file\") or the synthesized default for a project with no board yet (\"default\").",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async () => {
    const { board, source } = await store.getBoardWithSource();
    // Surface the resolved document model so a skill learns the doc types +
    // gates without a bespoke call. `docModel` reflects the fallbacks too, so it
    // is populated even when board.docs is absent.
    return ok({
      ...board,
      source,
      docModel: {
        repoDocs: repoDocsMap(board),
        default: { types: resolveDocTypes(board, ""), gates: resolveGates(board, "") },
        deploymentTracking: board.deployment !== undefined,
      },
    });
  }),
);

server.registerTool(
  "list_items",
  {
    title: "List items",
    description:
      "List items as summaries (no body). Filter by type, status (workflow stage), area, label, or updated_since (ISO timestamp — only items changed after it). Sort by id (default) or updated_desc; cap with limit. Archived items are excluded unless include_archived is true (summaries carry `archived` either way). Summaries also carry `taken` (who/where, when a ticket is taken) and `docs`/`checklist` (pipeline document presence and checklist progress). Normally returns a plain array; if any files in .kanmer are malformed or misnamed, returns { items, warnings } instead so the problem is visible.",
    inputSchema: {
      type: itemTypeEnum.optional().describe("Restrict to one item type"),
      status: z.string().optional().describe("Filter by status id (workflow stage)"),
      area: z.string().optional().describe("Filter by area id"),
      label: z.string().optional().describe("Filter by a label"),
      include_archived: z.boolean().optional().describe("Include archived items"),
      updated_since: z
        .string()
        .optional()
        .describe("Only items whose `updated` is after this ISO timestamp"),
      sort: z.enum(["id", "updated_desc"]).optional().describe("Sort order (default id)"),
      limit: z.number().int().positive().optional().describe("Return at most this many"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(
    async ({ type, status, area, label, include_archived, updated_since, sort, limit }) => {
      const { items, warnings } = await store.listItemsWithWarnings({
        type,
        status,
        area,
        label,
        includeArchived: include_archived,
      });
      let selected = items;
      if (updated_since !== undefined) {
        selected = selected.filter((i) => i.updated > updated_since);
      }
      if (sort === "updated_desc") {
        selected = [...selected].sort((a, b) => (a.updated < b.updated ? 1 : -1));
      }
      if (limit !== undefined) selected = selected.slice(0, limit);
      const blocked = await blockedSet();
      const summaries = await Promise.all(selected.map((i) => summarise(i, blocked)));
      return ok(warnings.length ? { items: summaries, warnings } : summaries);
    },
  ),
);

server.registerTool(
  "get_item",
  {
    title: "Get an item",
    description:
      "Return the full frontmatter and markdown body of one item by id (e.g. API-001). For tickets this also reports which pipeline documents exist (docs) and checklist progress — read the documents themselves with get_ticket_doc.",
    inputSchema: { id: z.string().describe("Item id, e.g. API-001") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id }) => {
    const item = await store.getItem(id);
    if (!item) return fail(`No item with id "${id}"`);
    const info = await store.getTicketDocsInfo(id);
    const blocked = (await blockedSet()).has(id);
    return ok(
      info ? { ...item, blocked, docs: info.docs, checklist: info.checklist } : { ...item, blocked },
    );
  }),
);

server.registerTool(
  "get_ticket_doc",
  {
    title: "Read a ticket document",
    description:
      "Read one of a ticket's pipeline documents from its folder. `doc` is a document id from the ticket area's configured doc types (see get_doc_gates / list_board → docModel), or a scratch file as `scratch-<slug>`. Returns content: null when the document hasn't been written yet. `version` is a token for the document's current bytes — pass it back as `expected_version` on set_ticket_doc to be rejected instead of overwriting a concurrent edit.",
    inputSchema: {
      id: z.string().describe("Ticket id"),
      doc: ticketDocEnum.describe("Which document"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id, doc }) => {
    const { content, version } = await store.getDocWithVersion(id, doc);
    return ok({ id, doc, exists: content !== null, content, version });
  }),
);

server.registerTool(
  "search_items",
  {
    title: "Search items",
    description:
      "Full-text search over item id, title, body, labels and assignee. Returns matching summaries.",
    inputSchema: {
      query: z.string().describe("Text to search for"),
      type: itemTypeEnum.optional().describe("Restrict to one item type"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ query, type }) => {
    const blocked = await blockedSet();
    return ok(
      await Promise.all(
        (await store.searchItems(query, { type })).map((i) => summarise(i, blocked)),
      ),
    );
  }),
);

server.registerTool(
  "get_links",
  {
    title: "Get links and backlinks",
    description:
      "Return the items this item links to (frontmatter links[] plus [[wiki]] links in its body), the items that link back to it, plus the typed dependency edges: blocks (stored) and blockedBy (derived — never stored). Each id is annotated with its title.",
    inputSchema: { id: z.string().describe("Item id, e.g. API-001") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id }) => {
    const graph = await getLinkGraph(store, id);
    const titles = new Map(
      (await store.listItems({ includeArchived: true })).map((i) => [i.id, i.title]),
    );
    const withTitles = (ids: string[]) =>
      ids.map((linkId) => ({ id: linkId, title: titles.get(linkId) ?? null }));
    return ok({
      id: graph.id,
      links: withTitles(graph.links),
      backlinks: withTitles(graph.backlinks),
      blocks: withTitles(graph.blocks),
      blockedBy: withTitles(graph.blockedBy),
    });
  }),
);

server.registerTool(
  "get_activity",
  {
    title: "Read the activity log",
    description:
      "What actually happened on the board: one entry per mutation ({ts, id, op, field, from, to, actor}), oldest-first. Filter by item id and/or since (ISO timestamp); limit keeps the most recent N. Derived convenience, not truth — the log is safe to delete and never consulted for state.",
    inputSchema: {
      id: z.string().optional().describe("Only entries for this item"),
      since: z.string().optional().describe("Only entries after this ISO timestamp"),
      limit: z.number().int().positive().optional().describe("Most recent N entries (default 200)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id, since, limit }) =>
    ok(await store.getActivity({ id, since, limit: limit ?? 200 })),
  ),
);

server.registerTool(
  "get_doc_gates",
  {
    title: "Inspect the document model and gates",
    description:
      "With an `id`: the ticket's resolved doc types, which of them exist, its area and current status, and the per-area gate rules — enough to self-check before move_item instead of failing into a gate. Without an `id`: the board's document model (default + per-area doc types and gates, the governing-doc path globs, and whether deployment tracking is on).",
    inputSchema: {
      id: z.string().optional().describe("Ticket id to inspect; omit for the board's config"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id }) => {
    const board = await store.getBoard();
    if (id !== undefined) {
      const item = await store.getItem(id);
      if (!item) return fail(`No item with id "${id}"`);
      const info = await store.getTicketDocsInfo(id);
      return ok({
        id,
        area: item.area,
        status: item.status,
        statuses: board.statuses.map((s) => s.id),
        docTypes: resolveDocTypes(board, item.area),
        docsPresent: info?.docs ?? null,
        gates: resolveGates(board, item.area),
        refs: item.refs ?? [],
        docs_todo: item.docs_todo === true,
      });
    }
    const areas: Record<string, unknown> = {};
    for (const areaId of Object.keys(board.docs?.areas ?? {})) {
      areas[areaId] = { types: resolveDocTypes(board, areaId), gates: resolveGates(board, areaId) };
    }
    return ok({
      repoDocs: repoDocsMap(board),
      default: { types: resolveDocTypes(board, ""), gates: resolveGates(board, "") },
      areas,
      deploymentTracking: board.deployment ?? null,
    });
  }),
);

// ---------------------------------------------------------------------------
// Write tools
// ---------------------------------------------------------------------------

server.registerTool(
  "create_item",
  {
    title: "Create an item",
    description:
      "Create a ticket. Returns the created item including its allocated id — tickets born in an area get that area's prefix (e.g. API-007); area-less tickets get the fallback prefix. status defaults to the first workflow stage; status/area/priority are validated against the board and links[] targets must exist. Creation is ungated: a ticket may be created directly in any stage (imports/backfills of finished work) — the document gates apply on move_item, not creation. Link governing docs with refs (each must exist) or set docs_todo. On format-2 boards plans and research are documents inside a ticket's folder (set_ticket_doc), not standalone items.",
    inputSchema: createFields,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async (input) => ok(await store.createItem(input))),
);

server.registerTool(
  "create_items",
  {
    title: "Create several items",
    description:
      "Bulk create up to 50 items in one call (sequential, so ids stay ordered). Each entry takes the same fields as create_item, including the rule that a ticket cannot be created directly in the board's final stage — that stage requires proof.md; create it earlier and move it. Partial success is possible: the result carries one { ok, item | error } per entry, in order.",
    inputSchema: {
      items: z.array(z.object(createFields)).min(1).max(50).describe("Entries to create, in order"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ items }) => {
    const results: ({ ok: true; item: Item } | { ok: false; error: string })[] = [];
    for (const entry of items) {
      try {
        results.push({ ok: true, item: await store.createItem(entry) });
      } catch (err) {
        results.push({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return ok({
      created: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  }),
);

server.registerTool(
  "update_item",
  {
    title: "Update an item",
    description:
      "Patch a frontmatter field and/or the markdown body of an existing item. Only provided fields change; `updated` is stamped automatically (a patch that changes nothing does NOT bump `updated`). Changing a ticket's area moves its folder — the id never changes. Set archived to true to hide an item from the board without deleting it. `type` cannot be changed here — create a new item and archive the old one instead. Pass expected_updated (the `updated` you last read) when rewriting the body so a concurrent edit is rejected as a conflict instead of overwritten.",
    inputSchema: {
      id: z.string().describe("Item id to update"),
      title: z.string().optional(),
      status: z.string().optional(),
      area: z.string().optional(),
      priority: z.string().optional(),
      assignee: z.string().optional(),
      order: z.number().optional().describe("Manual sort key (move_item's position computes this)"),
      labels: z.array(z.string()).optional(),
      links: z.array(z.string()).optional(),
      blocks: z.array(z.string()).optional().describe("Ids this item blocks"),
      refs: z
        .array(z.string())
        .optional()
        .describe("Repo-relative governing-doc paths (each must exist); [] clears them"),
      docs_todo: z.boolean().optional().describe("A governing doc is still to be created"),
      commits: z.array(z.string()).optional().describe("Commit SHAs; [] clears them"),
      prs: z.array(z.string()).optional().describe("PR references; [] clears them"),
      deployment: z
        .string()
        .optional()
        .describe("Deployment status; pass \"\" to clear (only when the board declares environments)"),
      body: z.string().optional(),
      archived: z.boolean().optional(),
      expected_updated: z
        .string()
        .optional()
        .describe(
          "Optimistic concurrency: the `updated` timestamp you last read. Rejected as a conflict if the item changed since.",
        ),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ id, expected_updated, ...patch }) =>
    ok(await store.updateItem(id, { ...patch, expectedUpdated: expected_updated })),
  ),
);

server.registerTool(
  "move_item",
  {
    title: "Move an item to a workflow stage",
    description:
      "Kanban move: set an item's status, i.e. move it to a workflow stage (see list_board → statuses). Rejects a status that is not on the board. Enforces the ticket area's document gates — e.g. proof.md before the final stage, post-implementation-report before review — and on failure names every missing document/governing-doc and the boundary. Call get_doc_gates to self-check first. Optional position places the item within the column: \"top\", \"bottom\", or { after: \"API-003\" } — this maintains the manual order humans see.",
    inputSchema: {
      id: z.string().describe("Item id to move"),
      status: z.string().describe("Target status id (workflow stage)"),
      position: z
        .union([z.enum(["top", "bottom"]), z.object({ after: z.string() })])
        .optional()
        .describe("Where in the column to place the item"),
      expected_updated: z
        .string()
        .optional()
        .describe(
          "Optimistic concurrency: the `updated` timestamp you last read. Rejected as a conflict if the item changed since.",
        ),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ id, status, position, expected_updated }) =>
    ok(await store.moveItem(id, { status, position, expectedUpdated: expected_updated })),
  ),
);

server.registerTool(
  "take_ticket",
  {
    title: "Take or release a ticket",
    description:
      "Take a ticket before working it: records taken_at, the branch (required) and optionally the worktree, sets the assignee (defaults to the calling client's name), and moves the ticket to the working stage (default: the board's `implementing` stage). Errors if the ticket is already taken unless force is true. action: \"release\" clears taken_at/branch/worktree when the work ends.",
    inputSchema: {
      id: z.string().describe("Ticket id"),
      action: z.enum(["take", "release"]).default("take"),
      branch: z.string().optional().describe("Branch the work happens on (required for take)"),
      worktree: z.string().optional().describe("Worktree path, when working in one"),
      stage: z.string().optional().describe("Stage to move to (default: implementing)"),
      assignee: z.string().optional().describe("Defaults to the calling client's name"),
      force: z.boolean().optional().describe("Take over an already-taken ticket"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ id, action, branch, worktree, stage, assignee, force }, extra) => {
    if (action === "release") return ok(await store.releaseTicket(id));
    if (!branch) return fail(`branch is required when taking a ticket — it's the point of taking`);
    return ok(
      await store.takeTicket(id, {
        branch,
        worktree,
        stage,
        assignee: assignee ?? actorName(extra),
        force,
      }),
    );
  }),
);

server.registerTool(
  "set_ticket_doc",
  {
    title: "Write a ticket document",
    description:
      "Write one of a ticket's pipeline documents into its folder. `doc` is a document id from the ticket area's configured doc types (see get_doc_gates); an unknown id is rejected with the valid ids, and a doc that `requires` others is rejected until they exist. Plain Markdown, no frontmatter. Pass append: true to add below the existing content (for progress notes) instead of replacing it. For free-form notes use append_scratch instead. Pass the `version` you last read from get_ticket_doc as `expected_version` to be rejected instead of overwriting a concurrent edit; the result carries the new `version`.",
    inputSchema: {
      id: z.string().describe("Ticket id"),
      doc: ticketDocEnum.describe("Which document"),
      content: z.string().describe("Markdown content"),
      append: z.boolean().optional().describe("Append below existing content instead of replacing"),
      expected_version: z
        .string()
        .optional()
        .describe(
          "Optimistic concurrency: the `version` you last read from get_ticket_doc. " +
            "Rejected as a conflict if the document changed since. Omit for last-write-wins.",
        ),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ id, doc, content, append, expected_version }) => {
    const { version } = await store.setDoc(id, doc, content, {
      append,
      expectedVersion: expected_version,
    });
    return ok({ id, doc, written: true, appended: append === true, version });
  }),
);

server.registerTool(
  "append_scratch",
  {
    title: "Append a scratch note",
    description:
      'Append a free-form working note to a ticket\'s scratch file (scratch-<slug>.md). Separate from set_ticket_doc: scratch is never gated or validated against the doc types — it is the agent\'s running notepad. Read it back with get_ticket_doc(doc: "scratch-<slug>"). Successive appends are separated by a blank line. slug defaults to "notes".',
    inputSchema: {
      id: z.string().describe("Ticket id"),
      slug: z.string().optional().describe('Scratch slug (default "notes") → scratch-<slug>.md'),
      content: z.string().describe("Markdown to append below a blank line"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ id, slug, content }) => {
    const useSlug = slug ?? "notes";
    const { file } = await store.appendScratch(id, useSlug, content);
    return ok({ id, slug: useSlug, appended: true, file });
  }),
);

server.registerTool(
  "link_doc",
  {
    title: "Link or unlink a governing document",
    description:
      "Maintain a ticket's refs[] — repo-relative paths to governing docs (PRD/FRD/ADR) in the repo's own /docs/. add validates the path exists under the project root; remove drops it. Distinct from link_items (item↔item); this is item↔repo-file. A linked governing doc satisfies the leave-backlog gate.",
    inputSchema: {
      id: z.string().describe("Ticket id"),
      path: z.string().describe("Repo-relative path, e.g. docs/prd/checkout.md"),
      action: z.enum(["add", "remove"]).default("add"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ id, path: refPath, action }) => {
    const item = await store.getItem(id);
    if (!item) return fail(`No item with id "${id}"`);
    const refs = new Set(item.refs ?? []);
    if (action === "remove") refs.delete(refPath);
    else refs.add(refPath);
    return ok(await store.updateItem(id, { refs: [...refs] }));
  }),
);

server.registerTool(
  "link_items",
  {
    title: "Link or unlink two items",
    description:
      "Add or remove a structured relation from source_id to target_id. rel \"relates\" (default) writes the source's links[]; rel \"blocks\" writes blocks[] — meaning the source blocks the target (blocked-by is derived, never stored). Adding requires the target to exist; removal works even on dangling links.",
    inputSchema: {
      source_id: z.string().describe("The item that will hold the link"),
      target_id: z.string().describe("The item being linked to / blocked"),
      action: z.enum(["add", "remove"]).default("add"),
      rel: z.enum(["relates", "blocks"]).default("relates"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ source_id, target_id, action, rel }) =>
    ok(await linkItems(store, source_id, target_id, action, rel)),
  ),
);

server.registerTool(
  "add_column",
  {
    title: "Add a board column",
    description:
      "Add a new column to the board: a status (workflow stage), area or priority. Areas group tickets within stage columns and are colour-coded; provide a hex color, and optionally a 2-6 uppercase-alphanumeric id prefix for tickets born there (derived from the id when omitted). Returns the updated board configuration.",
    inputSchema: {
      id: z.string().describe("New column id, e.g. ui"),
      name: z.string().describe("Display name, e.g. UI"),
      kind: columnKindEnum.default("area"),
      color: z.string().optional().describe("Hex colour, e.g. #5b8cff (recommended for areas)"),
      prefix: z
        .string()
        .optional()
        .describe("Areas only: id prefix for tickets born in this area, e.g. API"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  write(async ({ id, name, kind, color, prefix }) =>
    ok(
      await store.addColumn(kind, {
        id,
        name,
        ...(color ? { color } : {}),
        ...(prefix ? { prefix } : {}),
      }),
    ),
  ),
);

server.registerTool(
  "update_column",
  {
    title: "Update a board column",
    description:
      "Rename or recolour a status/area/priority, or pin an area's id prefix. The column id itself is immutable (items reference it).",
    inputSchema: {
      kind: columnKindEnum,
      id: z.string().describe("Column id to update"),
      name: z.string().optional(),
      color: z.string().optional(),
      prefix: z.string().optional().describe("Areas only"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ kind, id, name, color, prefix }) =>
    ok(await store.updateColumn(kind, id, { name, color, prefix })),
  ),
);

server.registerTool(
  "remove_column",
  {
    title: "Remove a board column",
    description:
      "Remove a status/area/priority from the board. Refuses while items still use it unless migrate_to names another column of the same kind — then every matching item is rewritten to it first (an area migration moves ticket folders; migrating tickets into the final stage still requires their proof.md). Returns the updated board plus the ids that were migrated.",
    inputSchema: {
      kind: columnKindEnum,
      id: z.string().describe("Column id to remove"),
      migrate_to: z
        .string()
        .optional()
        .describe("Column id (same kind) to move the referencing items to"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  },
  write(async ({ kind, id, migrate_to }) => {
    if (migrate_to !== undefined) {
      const proceed = await confirmDestructive(
        `Remove ${kind} "${id}" and move every item using it to "${migrate_to}"?`,
      );
      if (!proceed) return fail("cancelled by user");
    }
    return ok(await store.removeColumn(kind, id, { migrateTo: migrate_to }));
  }),
);

server.registerTool(
  "reorder_columns",
  {
    title: "Reorder board columns",
    description:
      "Reorder the statuses, areas or priorities. `order` must be a permutation of the existing ids. Note that the FIRST status is where new items land and the LAST status is the proof-gated final stage.",
    inputSchema: {
      kind: columnKindEnum,
      order: z.array(z.string()).min(1).describe("Every existing id, in the new order"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ kind, order }) => ok(await store.reorderColumns(kind, order))),
);

server.registerTool(
  "migrate_board",
  {
    title: "Migrate / upgrade the board",
    description:
      "Bring the board fully current: run the v1→v2 migration if needed, then backfill the 7-stage default (alias-aware, additive — never renames or reorders existing stages, never touches item files). Pass dry_run: true to preview what would move and which stages would be added without writing. The agent-facing route to the same upgrade the GUI offers.",
    inputSchema: {
      dry_run: z.boolean().optional().describe("Preview without writing"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  write(async ({ dry_run }) => ok(await migrateBoard(store, { dryRun: dry_run }))),
);

server.registerTool(
  "delete_item",
  {
    title: "Delete an item",
    description:
      "Permanently delete an item by id. For tickets this removes the whole ticket folder — pipeline documents and attachments included. This cannot be undone (prefer update_item with archived: true). Frontmatter links[] in other items that pointed at the deleted id are cleaned up automatically (cleanedLinks); [[wiki]] references in bodies are prose and stay put (bodyReferencesRemain).",
    inputSchema: { id: z.string().describe("Item id to delete") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
  write(async ({ id }) => {
    const proceed = await confirmDestructive(
      `Permanently delete "${id}" (its whole folder, documents and attachments included)?`,
    );
    if (!proceed) return fail("cancelled by user");
    const result = await store.deleteItem(id);
    return result.deleted
      ? ok({
          deleted: id,
          cleanedLinks: result.cleanedLinks,
          bodyReferencesRemain: result.bodyReferencesRemain,
        })
      : fail(`No item with id "${id}"`);
  }),
);

// ---------------------------------------------------------------------------
// Resources — the board and every item, with opt-in change subscriptions
// (the same signal the GUI gets from its file watcher).
// ---------------------------------------------------------------------------

server.registerResource(
  "board",
  "kanmer://board",
  {
    title: "Kanmer board configuration",
    description: "The stages, areas and priorities driving this project's board",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(await store.getBoardWithSource(), null, 2),
      },
    ],
  }),
);

server.registerResource(
  "item",
  new ResourceTemplate("kanmer://items/{id}", {
    list: async () => ({
      resources: (await store.listItems()).map((i) => ({
        uri: `kanmer://items/${i.id}`,
        name: i.id,
        description: i.title,
        mimeType: "text/markdown",
      })),
    }),
  }),
  {
    title: "Kanmer items",
    description: "Each ticket/plan/research item as Markdown with frontmatter",
    mimeType: "text/markdown",
  },
  async (uri, variables) => {
    const id = String(variables["id"]);
    const item = await store.getItem(id);
    if (!item) throw new Error(`No item with id "${id}"`);
    return {
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: serialiseItem(item) }],
    };
  },
);

const subscriptions = new Set<string>();
let subscriptionWatch: WatchHandle | null = null;

/** Push resources/updated for subscribed URIs when the files change on disk. */
function ensureSubscriptionWatcher(): void {
  if (subscriptionWatch) return;
  subscriptionWatch = watchKanmer(projectRoot, (_event, file) => {
    const base = path.basename(file);
    if (base === "board.yml" && subscriptions.has("kanmer://board")) {
      void server.server.sendResourceUpdated({ uri: "kanmer://board" });
    }
    if (base.endsWith(".md")) {
      const uri = `kanmer://items/${base.slice(0, -3)}`;
      if (subscriptions.has(uri)) {
        void server.server.sendResourceUpdated({ uri });
      }
    }
  });
}

server.server.registerCapabilities({ resources: { subscribe: true } });
server.server.setRequestHandler(SubscribeRequestSchema, async (req) => {
  subscriptions.add(req.params.uri);
  ensureSubscriptionWatcher();
  return {};
});
server.server.setRequestHandler(UnsubscribeRequestSchema, async (req) => {
  subscriptions.delete(req.params.uri);
  return {};
});

// ---------------------------------------------------------------------------
// Prompts — host slash-command affordances for the two everyday flows.
// ---------------------------------------------------------------------------

server.registerPrompt(
  "standup",
  {
    title: "Board standup",
    description: "Summarise what happened on the Kanmer board and what needs attention",
  },
  () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Give me a standup from the Kanmer board. Call get_status first, then list_items " +
            "(sort: updated_desc) for the current picture. Group by the board's configured " +
            "stages by role — first stage is Up next, last stage is Recently done, a " +
            "review-like stage is In review, everything between is In flight (include " +
            "taken branch/worktree info). Flag stale items, off-board stages, and any " +
            "warnings. Keep it scannable: one line per item.",
        },
      },
    ],
  }),
);

server.registerPrompt(
  "take-ticket",
  {
    title: "Take a ticket",
    description: "Take a Kanmer ticket and work it through the doc pipeline",
    argsSchema: { id: z.string().describe("Ticket id to take") },
  },
  ({ id }) => ({
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text: takeTicketPromptText(id) },
      },
    ],
  }),
);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function main() {
  // No store.init() here: a read-only session in a workspace that never
  // opted into Kanmer must not create .kanmer/ just by being opened.
  // Write handlers call ensureInit() lazily instead.
  //
  // 2026-07-28 note: the whole revision — not just cacheable list results
  // (ttlMs/cacheScope on tools/list) — is unavailable in SDK 1.30. Its
  // SUPPORTED_PROTOCOL_VERSIONS tops out at 2025-11-25 and contains no
  // 2026-07-28 entry, so nothing in this repo can negotiate it. Adopt when
  // the SDK grows support; smoke-protocol.mjs covers what is reachable today.
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Never write logs to stdout — that stream is the MCP transport.
  process.stderr.write(`kanmer-mcp ready — root: ${projectRoot}\n`);
}

main().catch((err) => {
  process.stderr.write(`kanmer-mcp fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
