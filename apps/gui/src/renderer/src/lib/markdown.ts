import { Marked, type TokenizerAndRendererExtension, type Tokens } from "marked";

/** Anchored: inline extensions are asked to match at the current offset. */
const WIKILINK_RE = /^\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A `[[id]]` / `[[id|alias]]` reference, recognised during tokenization. */
interface WikiLinkToken extends Tokens.Generic {
  type: "wikilink";
  raw: string;
  id: string;
  label: string;
}

// renderMarkdown is synchronous end to end (async: false), so a module-scoped
// "current known ids" is safe — no two parses can interleave.
let currentKnownIds: Set<string> = new Set();

const wikiLink: TokenizerAndRendererExtension = {
  name: "wikilink",
  level: "inline",
  start(src: string) {
    const i = src.indexOf("[[");
    return i === -1 ? undefined : i;
  },
  tokenizer(src: string) {
    const m = WIKILINK_RE.exec(src);
    if (!m) return undefined;
    const id = m[1].trim();
    if (!id) return undefined;
    const token: WikiLinkToken = {
      type: "wikilink",
      raw: m[0],
      id,
      label: (m[2] ?? m[1]).trim(),
    };
    return token;
  },
  renderer(token: Tokens.Generic) {
    const { id, label } = token as WikiLinkToken;
    const cls = currentKnownIds.has(id) ? "wikilink" : "wikilink missing";
    // We generate this markup, so we escape it ourselves — the id goes into an
    // attribute and the label into text; neither may inject.
    return `<a href="kanmer:${escapeHtml(id)}" class="${cls}">${escapeHtml(label)}</a>`;
  },
};

// Item bodies are agent- and human-written Markdown, not trusted HTML: raw
// HTML blocks/inlines render as escaped text instead of live markup (this
// output goes through dangerouslySetInnerHTML; CSP is the backstop). Wiki
// links are *tokens*, not HTML spliced into the source before parsing — so
// they never pass through that escaping, and `[[id]]` inside a code span or a
// fenced block stays literal because those are tokenized first.
const md = new Marked({
  extensions: [wikiLink],
  renderer: { html: ({ text }: Tokens.HTML | Tokens.Tag) => escapeHtml(text) },
});

/**
 * Render a markdown body to HTML, turning [[id]] / [[id|alias]] wiki-links into
 * clickable anchors (href="kanmer:<id>"). Known ids get a solid link; unknown
 * ids are flagged so a dangling reference is visible.
 */
export function renderMarkdown(body: string, knownIds: Set<string>): string {
  currentKnownIds = knownIds;
  return md.parse(body, { async: false }) as string;
}
