import type { Item } from "@kanmer/core";

/**
 * Bounded column rendering (FRD-036 R2/R3).
 *
 * ## The pipeline order is fixed, and this module is always last
 *
 *     project → scope → filters/search → deterministic sort (order, then id) → page
 *
 * Paging before filtering is the defect this exists to make impossible: slice
 * four cards off an unfiltered column and then filter them, and a column whose
 * matches all live past the fourth card renders empty while holding matches.
 * That is a *false empty state* — the user is told there is nothing when there
 * is. So `pageColumn` takes the already-filtered, already-sorted cards and does
 * nothing but slice them, and every caller reaches it last.
 *
 * ## Four cards is a display bound, not a WIP limit
 *
 * It changes no stage rule and hides no work: the pager reaches every card in
 * the column, scopes reach every stage, and search reaches every ticket on the
 * board. The number lives here so there is one of it.
 */
export const PAGE_SIZE = 4;

/** How many pages a column of `total` cards has. Always at least one — an empty column is page 1 of 1. */
export function pageCount(total: number, size: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / Math.max(1, size)));
}

/**
 * A 1-based page number forced into range.
 *
 * This is the clamp that keeps a remembered page honest. A page is stored per
 * column and the column behind it changes constantly — an agent writes, a
 * filter narrows, a scope switches — so a stored `3` may address cards that no
 * longer exist. Clamping (rather than resetting to 1) is deliberate: it keeps
 * the user as close as possible to where they were looking, and it can never
 * land on an empty page because the last page of a non-empty column always
 * holds at least one card.
 */
export function clampPage(page: number, total: number, size: number = PAGE_SIZE): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.floor(page)), pageCount(total, size));
}

export interface PagedColumn<T> {
  /** The cards to render — at most `size` of them. */
  cards: T[];
  /** 1-based index of the first shown card, or 0 when the column is empty. */
  start: number;
  /** 1-based index of the last shown card, or 0 when the column is empty. */
  end: number;
  /** How many cards the column holds *after* filtering — the number the head shows. */
  total: number;
  /** The page actually used, after clamping. */
  page: number;
  pageCount: number;
}

/**
 * One column's visible slice.
 *
 * `cards` must already be scoped, filtered and sorted; this function only
 * slices. `start`/`end` are 1-based for display ("1–4 of 28") and are both 0
 * for an empty column, which is the only case where the range is not a real
 * position — so a caller can test `total === 0` rather than parsing the label.
 */
export function pageColumn<T>(
  cards: T[],
  page: number,
  size: number = PAGE_SIZE,
): PagedColumn<T> {
  const step = Math.max(1, Math.floor(size));
  const total = cards.length;
  const pages = pageCount(total, step);
  const current = clampPage(page, total, step);
  const from = (current - 1) * step;
  const slice = cards.slice(from, from + step);
  return {
    cards: slice,
    start: total === 0 ? 0 : from + 1,
    end: total === 0 ? 0 : from + slice.length,
    total,
    page: current,
    pageCount: pages,
  };
}

/**
 * Drop every remembered page that no longer addresses a card, and clamp the
 * rest — run whenever the filtered board changes.
 *
 * Returns the same object identity when nothing changed, so a `useMemo` or a
 * `setState` on the result does not re-render the board on every keystroke.
 */
export function clampPages(
  pages: Record<string, number>,
  totals: Record<string, number>,
  size: number = PAGE_SIZE,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [columnId, page] of Object.entries(pages)) {
    const clamped = clampPage(page, totals[columnId] ?? 0, size);
    // Page 1 is the default; storing it is noise that would grow settings.json
    // by one entry per column the user ever paged away from and back.
    if (clamped > 1) next[columnId] = clamped;
  }
  const keys = Object.keys(next);
  const same =
    keys.length === Object.keys(pages).length && keys.every((k) => pages[k] === next[k]);
  return same ? pages : next;
}

/** Which 1-based page of a column an item sits on, or 1 when it is not in the column. */
export function pageOf(cards: Item[], id: string, size: number = PAGE_SIZE): number {
  const index = cards.findIndex((c) => c.id === id);
  return index === -1 ? 1 : Math.floor(index / Math.max(1, Math.floor(size))) + 1;
}
