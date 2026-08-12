import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KanmerStore, getLinkGraph, linkItems, type Item } from "@kanmer/core";
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

/** Trim an item to a list-friendly summary (no body). */
function summarise(item: Item) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    status: item.status,
    area: item.area,
    priority: item.priority,
    assignee: item.assignee,
    labels: item.labels,
    updated: item.updated,
  };
}

const itemTypeEnum = z.enum(["ticket", "plan", "research"]);

const server = new McpServer({ name: "kanmer", version: "0.1.0" });

// ---------------------------------------------------------------------------
// Read tools
// ---------------------------------------------------------------------------

server.registerTool(
  "list_board",
  {
    title: "List board configuration",
    description:
      "Return the board configuration: the ordered statuses (the workflow stages, which are the kanban columns), the areas, the priorities, and the id prefixes for each item type. Call this first to learn valid status/area/priority ids before creating or moving items.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async () => ok(await store.getBoard())),
);

server.registerTool(
  "list_items",
  {
    title: "List items",
    description:
      "List tickets, plans and research items as summaries (no body). Optionally filter by type, status (workflow stage), area or label. Archived items are excluded unless include_archived is true. Use get_item to read an item's full body.",
    inputSchema: {
      type: itemTypeEnum.optional().describe("Restrict to one item type"),
      status: z.string().optional().describe("Filter by status id (workflow stage)"),
      area: z.string().optional().describe("Filter by area id"),
      label: z.string().optional().describe("Filter by a label"),
      include_archived: z.boolean().optional().describe("Include archived items"),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ type, status, area, label, include_archived }) =>
    ok(
      (
        await store.listItems({
          type,
          status,
          area,
          label,
          includeArchived: include_archived,
        })
      ).map(summarise),
    ),
  ),
);

server.registerTool(
  "get_item",
  {
    title: "Get an item",
    description:
      "Return the full frontmatter and markdown body of one item by id (e.g. TICK-001).",
    inputSchema: { id: z.string().describe("Item id, e.g. TICK-001") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id }) => {
    const item = await store.getItem(id);
    return item ? ok(item) : fail(`No item with id "${id}"`);
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
  guard(async ({ query, type }) =>
    ok((await store.searchItems(query, { type })).map(summarise)),
  ),
);

server.registerTool(
  "get_links",
  {
    title: "Get links and backlinks",
    description:
      "Return the items this item links to (frontmatter links[] plus [[wiki]] links in its body) and the items that link back to it. Each id is annotated with its title.",
    inputSchema: { id: z.string().describe("Item id, e.g. TICK-001") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  guard(async ({ id }) => {
    const graph = await getLinkGraph(store, id);
    const titles = new Map((await store.listItems()).map((i) => [i.id, i.title]));
    const withTitles = (ids: string[]) =>
      ids.map((linkId) => ({ id: linkId, title: titles.get(linkId) ?? null }));
    return ok({
      id: graph.id,
      links: withTitles(graph.links),
      backlinks: withTitles(graph.backlinks),
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
      "Create a ticket, plan or research note. Returns the created item including its allocated id. status defaults to the first workflow stage if omitted; call list_board for valid ids. Link to other items via links[] and/or [[id]] references in the body.",
    inputSchema: {
      type: itemTypeEnum.describe("ticket | plan | research"),
      title: z.string().describe("Short title"),
      status: z.string().optional().describe("Status id / workflow stage (defaults to the first stage)"),
      area: z.string().optional().describe("Area id (see list_board → areas)"),
      priority: z.string().optional().describe("Priority id (see list_board → priorities); defaults to medium"),
      assignee: z.string().optional(),
      labels: z.array(z.string()).optional(),
      links: z.array(z.string()).optional().describe("Ids of related items"),
      body: z.string().optional().describe("Markdown body; may contain [[id]] wiki-links"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  guard(async (input) => ok(await store.createItem(input))),
);

server.registerTool(
  "update_item",
  {
    title: "Update an item",
    description:
      "Patch any frontmatter field and/or the markdown body of an existing item. Only provided fields change; `updated` is stamped automatically. Set archived to true to hide an item from the board without deleting it.",
    inputSchema: {
      id: z.string().describe("Item id to update"),
      title: z.string().optional(),
      status: z.string().optional(),
      area: z.string().optional(),
      priority: z.string().optional(),
      assignee: z.string().optional(),
      labels: z.array(z.string()).optional(),
      links: z.array(z.string()).optional(),
      body: z.string().optional(),
      archived: z.boolean().optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  guard(async ({ id, ...patch }) => ok(await store.updateItem(id, patch))),
);

server.registerTool(
  "move_item",
  {
    title: "Move an item to a workflow stage",
    description:
      "Kanban move: set an item's status, i.e. move it to a workflow stage (see list_board → statuses). Convenience wrapper over update_item.",
    inputSchema: {
      id: z.string().describe("Item id to move"),
      status: z.string().describe("Target status id (workflow stage)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  guard(async ({ id, status }) => ok(await store.moveItem(id, { status }))),
);

server.registerTool(
  "link_items",
  {
    title: "Link or unlink two items",
    description:
      "Add or remove a structured relation from source_id to target_id (stored in the source item's frontmatter links[]).",
    inputSchema: {
      source_id: z.string().describe("The item that will hold the link"),
      target_id: z.string().describe("The item being linked to"),
      action: z.enum(["add", "remove"]).default("add"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  guard(async ({ source_id, target_id, action }) =>
    ok(await linkItems(store, source_id, target_id, action)),
  ),
);

server.registerTool(
  "add_column",
  {
    title: "Add a board column",
    description:
      "Add a new column to the board: a status (workflow stage), area or priority. Areas group tickets within stage columns and are colour-coded; provide a hex color for them. Returns the updated board configuration.",
    inputSchema: {
      id: z.string().describe("New column id, e.g. ui"),
      name: z.string().describe("Display name, e.g. UI"),
      kind: z.enum(["status", "area", "priority"]).default("area"),
      color: z.string().optional().describe("Hex colour, e.g. #5b8cff (recommended for areas)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  guard(async ({ id, name, kind, color }) =>
    ok(await store.addColumn(kind, { id, name, ...(color ? { color } : {}) })),
  ),
);

server.registerTool(
  "delete_item",
  {
    title: "Delete an item",
    description:
      "Permanently delete an item file by id. This cannot be undone. Backlinks from other items are not rewritten.",
    inputSchema: { id: z.string().describe("Item id to delete") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
  guard(async ({ id }) => {
    const deleted = await store.deleteItem(id);
    return deleted ? ok({ deleted: id }) : fail(`No item with id "${id}"`);
  }),
);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function main() {
  await store.init(); // ensure the .kanmer skeleton exists for this project
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Never write logs to stdout — that stream is the MCP transport.
  process.stderr.write(`kanmer-mcp ready — root: ${projectRoot}\n`);
}

main().catch((err) => {
  process.stderr.write(`kanmer-mcp fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
