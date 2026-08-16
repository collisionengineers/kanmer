import type { Item } from "@kanmer/core";

/**
 * The shell's top-level views, and — in one place — everything that has to
 * agree about them.
 *
 * ## Why one record instead of three parallel structures
 *
 * The tab strip needs three facts per view: what to call it, what it renders,
 * and whether its badge shows a number. Until GUI-071 those three lived apart:
 * the label in a `VIEW_LABELS` record, the item set inlined in a `useMemo`
 * keyed on the *active* view, and the count inlined a third time in the JSX as
 *
 *     v === "archived"
 *       ? items.filter((i) => i.archived).length
 *       : items.filter((i) => i.type === "ticket" && !i.archived).length
 *
 * Note what that expression does **not** do: branch on `v` except to test for
 * "archived". It is not "the count of view `v`" — it is "the archived count, or
 * the board count", handed to whichever tab asks. While a Backlog view existed
 * its badge printed the whole board, ~5× the rows behind it. GUI-070 deleted
 * that view, so the two branches now happen to coincide with the two surviving
 * counted views and the printed numbers are right — by luck, not construction.
 * Add a fourth view and the luck runs out silently.
 *
 * `App.tsx`'s Ctrl+1…9 handler carries the same lesson from GUI-070: a
 * hand-maintained array of view ids went stale the moment a view was added, and
 * deriving it from the view list removed the class of bug rather than the
 * instance. The badge was the next parallel structure that had not been
 * derived. Keying the label, the item set and the badge together means a new
 * view does not compile until it says what it contains, so the badge cannot
 * drift from the view again.
 *
 * ## Why the item set is a function of `(view, items)` and nothing else
 *
 * A tab badge counts everything that lives in that view and **ignores the
 * active search and filters** (operator decision, 2026-08-16; FRD-019 R5). A
 * badge describes the tab; a filter is a temporary lens. The Board's per-column
 * counts do the opposite — they are computed from the filtered set — so with a
 * filter on, the Board badge may read 131 while the columns beneath it sum to
 * 6. That is correct and deliberate, and FRD-019 R5 says so.
 *
 * Taking no filter argument is how that contract is kept: these functions are
 * structurally incapable of seeing a filter. `App.tsx` applies `applyFilters`
 * downstream, to what the view *renders*, never to what its badge counts.
 *
 * Renderer code, so `@kanmer/core` is `import type` only (AGENTS.md §7).
 */
export type View = "ticket" | "standup" | "archived";

export type ViewSpec = {
  /** The tab's label. */
  label: string;
  /**
   * The items this view is built from, before search and filters. The badge
   * counts these, and — for the views that render a list — these are what
   * `applyFilters` is handed. Count and contents therefore cannot disagree.
   */
  items: (items: Item[]) => Item[];
  /** Whether the tab shows a count badge at all. */
  counted: boolean;
};

/**
 * Board and Standup both work from the board's live tickets: not archived, and
 * `type === "ticket"` — `plan` and `research` items are also `Item`s, and the
 * board does not render them as cards. Archived deliberately keeps neither
 * restriction: the Archived view renders every archived item whatever its
 * type, so its badge counts them all. The asymmetry is each view telling the
 * truth about itself, not an oversight; `views.test.ts` asserts it in both
 * directions so it does not get "tidied" into a false symmetry later.
 */
const liveTickets = (items: Item[]): Item[] =>
  items.filter((i) => i.type === "ticket" && !i.archived);

export const VIEWS: Record<View, ViewSpec> = {
  ticket: {
    label: "Board",
    items: liveTickets,
    counted: true,
  },
  standup: {
    label: "Standup",
    // The standup report summarises the same working set as the board. It has
    // no badge by design — the report is a narrative, not a quantity — but it
    // still declares its item set so the record stays exhaustive and honest.
    // (`Standup` is handed the raw item list and does its own reduction in
    // `lib/standup.ts`, whose "active" predicate answers a different question
    // and is separately tested.)
    items: liveTickets,
    counted: false,
  },
  archived: {
    label: "Archived",
    items: (items) => items.filter((i) => i.archived),
    counted: true,
  },
};

/**
 * The views in tab order. The single source for the tab strip, the Ctrl+1…9
 * shortcuts and the badge map — never re-typed as a literal anywhere.
 */
export const VIEW_IDS = Object.keys(VIEWS) as View[];

/** Everything the view renders, before search and filters. */
export function viewItemsFor(view: View, items: Item[]): Item[] {
  return VIEWS[view].items(items);
}

/**
 * The tab's badge, or `null` for a view that does not show one.
 *
 * By construction this is the length of {@link viewItemsFor}'s result — the
 * rows the view shows with no filter applied. That equality is the whole
 * ticket, and `views.test.ts` asserts it across every view rather than one at
 * a time, so a view added later is covered without editing the test.
 */
export function viewCount(view: View, items: Item[]): number | null {
  const spec = VIEWS[view];
  return spec.counted ? spec.items(items).length : null;
}

/** Every tab's badge in one pass, for the tab strip to read per tab. */
export function viewCounts(items: Item[]): Record<View, number | null> {
  return Object.fromEntries(VIEW_IDS.map((v) => [v, viewCount(v, items)])) as Record<
    View,
    number | null
  >;
}
