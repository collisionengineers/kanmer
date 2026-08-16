#!/usr/bin/env node
/**
 * Generate the in-app manual into a bundled TypeScript module.
 *
 * The renderer CSP is `default-src 'self'`, so nothing can be fetched at
 * runtime — and the packaged app does not ship `/docs/` at all. Both push to
 * the same answer: the manual is compiled in at build time, and the generated
 * file is **committed** so a build never depends on the docs tree being there.
 *
 *   node scripts/build-manual.mjs [--check]
 *
 * `--check` regenerates and fails if the committed output differs, which is how
 * CI-less repos notice a stale artifact. It runs as part of `npm test` and as
 * its own step in the release verification gate — not by hand.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "apps/gui/src/renderer/src/manual/chapters.generated.ts");

/**
 * The manual, in reading order.
 *
 * Every chapter here is **hand-written** for a reader who has never seen this
 * repository. Chapters used to be derived from the FRD set instead, and the
 * result was a user manual containing requirement ids, acceptance criteria,
 * internal source filenames and at least one feature marked "not built" — an
 * FRD is normative for an implementer, which is a different job. Only the
 * shortcuts chapter is still generated, because it is generated from the app's
 * own binding table and therefore cannot drift from what the keys do.
 *
 * Ids are the deep-link surface. `Manual.tsx` falls back to the first chapter
 * for an id it does not recognise, so a renamed id opens the *wrong* chapter
 * silently — rename one only on purpose.
 */
const CHAPTERS = [
  ["getting-started", "What Kanmer is", "getting-started.md"],
  ["install", "Install and open a project", "install.md"],
  ["connect", "Connect an agent", "connect.md"],
  ["first-ticket", "Your first ticket, end to end", "first-ticket.md"],
  ["stages", "The six stages", "stages.md"],
  ["profiles", "Profiles: what a ticket owes", "profiles.md"],
  ["gates", "Why can't I move this?", "gates.md"],
  ["documents", "Ticket documents", "documents.md"],
  ["references", "Reference files and scratch", "references.md"],
  ["proof", "Proof", "proof.md"],
  ["groups", "Areas, epics and horizons", "groups.md"],
  // No "backlog" chapter: GUI-070 withdrew the separate Backlog view, so
  // Backlog is a stage like any other and the stages chapter covers it.
  ["dispatch", "Dispatching agents", "dispatch.md"],
  ["board-sync", "Sharing a board over Git", "board-sync.md"],
  ["sync", "Staying in sync", "sync.md"],
  ["settings", "Settings, tab by tab", "settings.md"],
  // "shortcuts" is inserted here by pass 2 — generated, not authored.
  ["updates", "Keeping Kanmer up to date", "updates.md"],
  ["troubleshooting", "Troubleshooting", "troubleshooting.md"],
  ["glossary", "Glossary", "glossary.md"],
];

/** The generated chapter goes after this authored one. */
const SHORTCUTS_AFTER = "settings";

// ---------------------------------------------------------------------------
// Guards.
//
// The guard these replace was `if (!body) throw`, and it could never fire: the
// FRD lead-prose extractor trimmed the lead and *then* stripped the document's
// H1 with a regex requiring a trailing newline that trim() had just removed, so
// the heading survived and `body` was always truthy. The chapters shipped as a
// title, the same title again, and a pointer to a file the reader does not
// have.
//
// So these rules reject the *shape* of that failure, not its symptom.
// ---------------------------------------------------------------------------

/** Rule (c): the minimum prose a chapter must have to be a chapter. */
const PROSE_FLOOR = 400;

/** Rule (d): specification vocabulary. A user does not have our documents. */
const SPEC_TOKEN = /\b(?:FRD|ADR|PRD)-/;

/**
 * Rule (d2): a requirement-list line, e.g. `- R1. The board root is …`.
 *
 * The chapter that did the most damage was not a stub — it was 1761 characters
 * of a requirement list, long enough to look like documentation. Length was
 * never the measure.
 */
const REQUIREMENT_LINE = /^\s*(?:[-*]\s*)?(?:R|AC)\d+\.\s/m;

/**
 * Rule (e): a path into this repository's docs tree.
 *
 * Scoped to `docs/` on purpose, and NOT to "any path". `.kanmer/` and
 * `.worktrees/kanmer` are things on the user's own disk that the manual has to
 * be able to name; a blanket no-paths rule would fail chapters that are
 * correct.
 */
const DOCS_PATH = /\bdocs\/[\w.-]/;

/**
 * Prose only: strip the structure a chapter could otherwise pass on.
 *
 * Fenced code, table rows, headings, and blockquote/list markers all go, so a
 * chapter cannot clear the floor with a heading and a table of nothing.
 */
function proseLength(md) {
  return md
    .replace(/```[\s\S]*?```/g, "") // fenced code
    .replace(/^\s*\|.*$/gm, "") // table rows
    .replace(/^\s*#{1,6}\s+.*$/gm, "") // headings
    .replace(/^\s*[>*+-]\s+/gm, "") // quote and bullet markers
    .replace(/^\s*\d+\.\s+/gm, "") // ordered list markers
    .replace(/\s+/g, " ")
    .trim().length;
}

/** Applies to every chapter, generated ones included. */
function checkAnyChapter({ id, title, body }) {
  for (const [what, text] of [
    ["title", title],
    ["body", body],
  ]) {
    const spec = text.match(SPEC_TOKEN);
    if (spec) {
      throw new Error(
        `Chapter "${id}": ${what} names ${spec[0]}… — the manual is for users, ` +
          `who do not have our specification documents. Say what the app does instead.`,
      );
    }
    const req = text.match(REQUIREMENT_LINE);
    if (req) {
      throw new Error(
        `Chapter "${id}": ${what} contains a requirement line ("${req[0].trim()}…"). ` +
          `Requirement and acceptance-criterion lists are written for an implementer. ` +
          `Describe the behaviour a user sees instead.`,
      );
    }
    const path = text.match(DOCS_PATH);
    if (path) {
      throw new Error(
        `Chapter "${id}": ${what} points at "${path[0]}…" — /docs/ is not shipped in ` +
          `the packaged app, so that path is a dead end for a reader. ` +
          `(Paths under .kanmer/ or .worktrees/ are fine — those are on the user's disk.)`,
      );
    }
  }
}

/** Applies to hand-written chapters only. */
function checkAuthoredChapter({ id, body, file }) {
  if (/^#\s+\S/m.test(body)) {
    throw new Error(
      `Chapter "${id}" (docs/manual/${file}) has a top-level "# " heading. The ` +
        `chapter's title comes from build-manual.mjs and the viewer renders it, so an ` +
        `H1 in the body is either a duplicate title or a stub standing in for a ` +
        `chapter. Start at "## ", or with prose.`,
    );
  }
  const prose = proseLength(body);
  if (prose < PROSE_FLOOR) {
    throw new Error(
      `Chapter "${id}" (docs/manual/${file}) has ${prose} characters of prose, ` +
        `below the ${PROSE_FLOOR} floor. Headings, tables and code do not count — ` +
        `a chapter has to answer its own title for someone who has never seen this repo.`,
    );
  }
}

const chapters = [];

// 1. The authored manual.
for (const [id, title, file] of CHAPTERS) {
  const path = join(root, "docs/manual", file);
  if (!existsSync(path)) {
    throw new Error(`Missing chapter "${id}": docs/manual/${file} does not exist`);
  }
  const body = readFileSync(path, "utf8").trim();
  const chapter = { id, title, body };
  checkAuthoredChapter({ id, body, file });
  checkAnyChapter(chapter);
  chapters.push(chapter);

  // 2. Shortcuts, from the one binding table — the only generated chapter left.
  if (id === SHORTCUTS_AFTER) chapters.push(shortcutsChapter());
}

function shortcutsChapter() {
  const src = readFileSync(join(root, "apps/gui/src/shared/shortcuts.ts"), "utf8");
  const rows = [
    ...src.matchAll(
      /\{\s*keys:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*context:\s*"([^"]+)"\s*\}/g,
    ),
  ].map((m) => ({ keys: m[1], label: m[2], context: m[3] }));
  if (rows.length === 0) throw new Error("Parsed no shortcuts — the table's shape changed");

  // Exempt from the prose floor and the H1 rule: it is a table by design. It is
  // not unguarded — the row count above, and manual.test.ts compares this
  // chapter against SHORTCUTS in both directions, which is stronger than a
  // character count.
  const chapter = {
    id: "shortcuts",
    title: "Keyboard shortcuts",
    body: [
      "Generated from the app's own binding table, so it cannot drift from what",
      "the keys actually do.",
      "",
      "| Keys | Does | Where |",
      "|---|---|---|",
      ...rows.map((r) => `| \`${r.keys}\` | ${r.label} | ${r.context} |`),
    ].join("\n"),
  };
  checkAnyChapter(chapter);
  return chapter;
}

// 3. Ids are the deep-link surface — a duplicate is a silently unreachable
//    chapter, so refuse here rather than only in the test.
const seen = new Set();
for (const c of chapters) {
  if (seen.has(c.id)) throw new Error(`Duplicate chapter id "${c.id}"`);
  seen.add(c.id);
}

const out = `// GENERATED by scripts/build-manual.mjs — do not edit.
//
// Committed deliberately: the renderer CSP forbids fetching anything at
// runtime, and the packaged app does not ship /docs/. Regenerate with
// \`npm run build:manual\`; \`--check\` fails when this file is stale.

export interface ManualChapter {
  id: string;
  title: string;
  /** Markdown. */
  body: string;
}

export const MANUAL_CHAPTERS: readonly ManualChapter[] = Object.freeze(${JSON.stringify(chapters, null, 2)});
`;

if (process.argv.includes("--check")) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== out) {
    console.error("manual: chapters.generated.ts is stale — run `npm run build:manual`.");
    process.exit(1);
  }
  console.log(`manual: up to date (${chapters.length} chapters)`);
} else {
  writeFileSync(OUT, out, "utf8");
  console.log(`manual: wrote ${chapters.length} chapters -> ${OUT}`);
}
