import { marked } from "marked";

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g;

/**
 * Render a markdown body to HTML, turning [[id]] / [[id|alias]] wiki-links into
 * clickable anchors (href="kanmer:<id>"). Known ids get a solid link; unknown
 * ids are flagged so a dangling reference is visible.
 */
export function renderMarkdown(body: string, knownIds: Set<string>): string {
  const withLinks = body.replace(WIKILINK_RE, (_m, rawId: string, alias?: string) => {
    const id = rawId.trim();
    const label = (alias ?? id).trim();
    const cls = knownIds.has(id) ? "wikilink" : "wikilink missing";
    return `<a href="kanmer:${id}" class="${cls}">${label}</a>`;
  });
  return marked.parse(withLinks, { async: false }) as string;
}
