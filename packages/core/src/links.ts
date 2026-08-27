import type { KanmerStore } from "./store.js";
import type { Item, LinkGraph } from "./types.js";

/** Matches [[ID]] and [[ID|alias]] wiki-links inside a markdown body. */
const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g;

/** Extract referenced ids from a markdown body's [[...]] wiki-links. */
export function parseWikiLinks(body: string): string[] {
  const ids = new Set<string>();
  for (const match of body.matchAll(WIKILINK_RE)) {
    const id = match[1].trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

/** All ids an item points at: frontmatter links[] ∪ [[wiki]] links in body. */
export function forwardLinks(item: Item): string[] {
  const set = new Set<string>([...(item.links ?? []), ...parseWikiLinks(item.body)]);
  set.delete(item.id); // never self-link
  return [...set];
}

/**
 * Build a forward+backward link index over a set of items, with typed
 * blocks/blockedBy edges alongside the plain relations. Backlinks only
 * point back from items that exist in the set.
 */
export function buildLinkIndex(items: Item[]): Map<string, LinkGraph> {
  const index = new Map<string, LinkGraph>();
  for (const item of items) {
    index.set(item.id, {
      id: item.id,
      links: forwardLinks(item),
      backlinks: [],
      blocks: [...(item.blocks ?? [])],
      blockedBy: [],
    });
  }
  for (const item of items) {
    for (const target of forwardLinks(item)) {
      const entry = index.get(target);
      if (entry && !entry.backlinks.includes(item.id)) {
        entry.backlinks.push(item.id);
      }
    }
    for (const target of item.blocks ?? []) {
      const entry = index.get(target);
      if (entry && !entry.blockedBy.includes(item.id)) {
        entry.blockedBy.push(item.id);
      }
    }
  }
  return index;
}

/**
 * Which of `items` are currently blocked: something blocks them, and that
 * blocker is still live (not archived, not in the board's final stage).
 */
export function computeBlockedIds(items: Item[], lastStageId: string | undefined): Set<string> {
  const byId = new Map(items.map((i) => [i.id, i]));
  const blocked = new Set<string>();
  for (const item of items) {
    if (item.archived) continue;
    for (const target of item.blocks ?? []) {
      if (item.status !== lastStageId) blocked.add(target);
    }
  }
  // A blocker that no longer exists doesn't block anything.
  for (const id of [...blocked]) if (!byId.has(id)) blocked.delete(id);
  return blocked;
}

/** Forward links + backlinks for a single id (used by MCP get_links). */
export async function getLinkGraph(store: KanmerStore, id: string): Promise<LinkGraph> {
  const items = await store.listItems({ includeArchived: true });
  const index = buildLinkIndex(items);
  return index.get(id) ?? { id, links: [], backlinks: [], blocks: [], blockedBy: [] };
}

/**
 * Add or remove a structured frontmatter relation on `sourceId` → `targetId`.
 * `rel: "relates"` writes links[]; `rel: "blocks"` writes blocks[] (source
 * blocks target — blocked-by is derived, never stored).
 */
export async function linkItems(
  store: KanmerStore,
  sourceId: string,
  targetId: string,
  action: "add" | "remove",
  rel: "relates" | "blocks" = "relates",
  opts: { expectedRevision?: string } = {},
): Promise<Item> {
  const source = await store.getItem(sourceId);
  if (!source) throw new Error(`No item with id "${sourceId}"`);
  const field = rel === "blocks" ? "blocks" : "links";
  const set = new Set(source[field] ?? []);
  if (action === "add") {
    if (targetId === sourceId) throw new Error("An item cannot link to itself");
    // Adding requires a real target; removal stays permissive so dangling
    // links can always be cleaned up.
    if (!(await store.getItem(targetId))) {
      throw new Error(`No item with id "${targetId}" to link to`);
    }
    set.add(targetId);
  } else {
    set.delete(targetId);
  }
  return store.updateItem(sourceId, { [field]: [...set], expectedRevision: opts.expectedRevision });
}
