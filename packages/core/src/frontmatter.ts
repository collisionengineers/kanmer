import matter from "gray-matter";
import { ItemFrontmatterSchema, type Item, type ItemFrontmatter } from "./types.js";

/** Canonical key order so serialised frontmatter stays stable across edits. */
const KEY_ORDER = [
  "id",
  "type",
  "title",
  "status",
  "area",
  "priority",
  "assignee",
  "labels",
  "links",
  "archived",
  "created",
  "updated",
];

/** Parse raw file text into a validated Item (frontmatter + body). */
export function parseItem(raw: string): Item {
  const parsed = matter(raw);
  const fm = ItemFrontmatterSchema.parse(parsed.data ?? {});
  return { ...fm, body: parsed.content.replace(/^\s+/, "") };
}

/** Serialise an Item back to file text with a stable key order. */
export function serialiseItem(item: Item): string {
  const { body, ...fm } = item;
  const ordered = orderKeys(fm as ItemFrontmatter);
  // gray-matter stringify writes `---\n<yaml>---\n<body>`.
  const text = matter.stringify(`\n${body.trim()}\n`, ordered);
  return text.endsWith("\n") ? text : `${text}\n`;
}

function orderKeys(fm: ItemFrontmatter): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of KEY_ORDER) {
    if (key in fm) out[key] = (fm as Record<string, unknown>)[key];
  }
  // Preserve any extra (hand-added) keys after the known ones.
  for (const [key, value] of Object.entries(fm)) {
    if (!(key in out)) out[key] = value;
  }
  return out;
}
