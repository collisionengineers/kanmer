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
 * Build a forward+backward link index over a set of items. Backlinks only
 * point back from items that exist in the set.
 */
export function buildLinkIndex(items: Item[]): Map<string, LinkGraph> {
  const index = new Map<string, LinkGraph>();
  for (const item of items) {
    index.set(item.id, { id: item.id, links: forwardLinks(item), backlinks: [] });
  }
  for (const item of items) {
    for (const target of forwardLinks(item)) {
      const entry = index.get(target);
      if (entry && !entry.backlinks.includes(item.id)) {
        entry.backlinks.push(item.id);
      }
    }
  }
  return index;
}

/** Forward links + backlinks for a single id (used by MCP get_links). */
export async function getLinkGraph(store: KanmerStore, id: string): Promise<LinkGraph> {
  const items = await store.listItems();
  const index = buildLinkIndex(items);
  return index.get(id) ?? { id, links: [], backlinks: [] };
}

/** Add or remove a structured frontmatter link on `sourceId` → `targetId`. */
export async function linkItems(
  store: KanmerStore,
  sourceId: string,
  targetId: string,
  action: "add" | "remove",
): Promise<Item> {
  const source = await store.getItem(sourceId);
  if (!source) throw new Error(`No item with id "${sourceId}"`);
  const links = new Set(source.links ?? []);
  if (action === "add") {
    if (targetId === sourceId) throw new Error("An item cannot link to itself");
    // Adding requires a real target; removal stays permissive so dangling
    // links can always be cleaned up.
    if (!(await store.getItem(targetId))) {
      throw new Error(`No item with id "${targetId}" to link to`);
    }
    links.add(targetId);
  } else {
    links.delete(targetId);
  }
  return store.updateItem(sourceId, { links: [...links] });
}
