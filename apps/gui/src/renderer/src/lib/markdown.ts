import { marked, Renderer } from "marked";

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Item bodies are agent- and human-written Markdown, not trusted HTML: raw
// HTML blocks/inlines render as escaped text instead of live markup (this
// output goes through dangerouslySetInnerHTML; CSP is the backstop).
const renderer = new Renderer();
renderer.html = ({ text }) => escapeHtml(text);

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
  return marked.parse(withLinks, { async: false, renderer }) as string;
}
