import { useMemo, useState } from "react";
import { MANUAL_CHAPTERS } from "../manual/chapters.generated.js";
import { renderMarkdown } from "../lib/markdown.js";

/** Manual prose has no ticket wiki-links to resolve. */
const NO_IDS: Set<string> = new Set();

/**
 * The in-app manual (FRD-024).
 *
 * Chapters are **compiled in**, not fetched. The renderer CSP is
 * `default-src 'self'` and the packaged app does not ship `/docs/`, so
 * `scripts/build-manual.mjs` generates them into a module the bundler picks up
 * like any other source.
 *
 * Search is a filter over a dozen chapters, not an index. Anything cleverer
 * would be machinery for a corpus this size.
 */
export function Manual({
  initialChapter,
  onClose,
}: {
  /** Deep-link target — a `?` elsewhere in the app names a chapter id. */
  initialChapter?: string;
  onClose: () => void;
}): JSX.Element {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(
    () => initialChapter ?? MANUAL_CHAPTERS[0]?.id ?? "",
  );

  interface Match {
    chapter: (typeof MANUAL_CHAPTERS)[number];
    /** The line that matched, when the hit was in the body rather than the title. */
    hit: string | null;
  }

  const matches = useMemo<Match[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MANUAL_CHAPTERS.map((c) => ({ chapter: c, hit: null }));
    return MANUAL_CHAPTERS.flatMap<Match>((c) => {
      if (c.title.toLowerCase().includes(q)) return [{ chapter: c, hit: null }];
      // Show the line that matched: a title-only result makes the reader hunt
      // for why it matched once they open the chapter.
      const line = c.body.split("\n").find((l) => l.toLowerCase().includes(q));
      return line ? [{ chapter: c, hit: line.trim() }] : [];
    });
  }, [query]);

  const chapter = MANUAL_CHAPTERS.find((c) => c.id === active) ?? MANUAL_CHAPTERS[0];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal manual"
        role="dialog"
        aria-modal="true"
        aria-label="Manual"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Manual</h2>
          <input
            className="manual-search"
            placeholder="Search…"
            aria-label="Search the manual"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="spacer" />
          <button className="ghost sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="manual-shell">
          <nav className="manual-rail" aria-label="Chapters">
            {matches.length === 0 && <p className="hint">No chapter mentions that.</p>}
            {matches.map(({ chapter: c, hit }) => (
              <button
                key={c.id}
                className={c.id === active ? "tab active" : "tab"}
                onClick={() => setActive(c.id)}
              >
                {c.title}
                {hit && <span className="manual-hit">{hit.slice(0, 60)}</span>}
              </button>
            ))}
          </nav>

          <article className="manual-body">
            {chapter ? (
              <>
                <h3>{chapter.title}</h3>
                <div
                  className="md"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(chapter.body, NO_IDS) }}
                />
              </>
            ) : (
              <p className="hint">The manual has no chapters — run `npm run build:manual`.</p>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}

/** Chapter ids, so a deep link can be checked rather than guessed. */
export const MANUAL_CHAPTER_IDS: readonly string[] = MANUAL_CHAPTERS.map((c) => c.id);
