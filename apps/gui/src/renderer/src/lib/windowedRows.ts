/**
 * The maths behind the Backlog table's windowing.
 *
 * No virtualization library: AGENTS.md §8 gotcha 5 means a runtime dependency
 * has to become a devDependency bundled by electron-vite, and against a fixed
 * row height the whole calculation is this file. Fixed height is the constraint
 * that makes it trivial, and a table row is naturally fixed-height.
 *
 * Pure so vitest can reach it — the boundary cases are where windowing goes
 * wrong, and they are impossible to exercise through a component.
 */

export interface Window {
  /** First row to render, inclusive. */
  start: number;
  /** Last row to render, exclusive. */
  end: number;
  /** Spacer height above, so the scrollbar keeps its true length. */
  padTop: number;
  /** Spacer height below. */
  padBottom: number;
}

export interface WindowInput {
  /** Rows in the full, already-filtered list. */
  count: number;
  /** Pixel height of one row. Must be > 0. */
  rowHeight: number;
  /** Height of the scrolling viewport. */
  viewportHeight: number;
  /** Current scrollTop. */
  scrollTop: number;
  /**
   * Extra rows rendered above and below the visible band. Without it, a fast
   * scroll paints blank space for a frame; three is enough to hide that and
   * cheap enough not to matter.
   */
  overscan?: number;
}

export function windowedRows({
  count,
  rowHeight,
  viewportHeight,
  scrollTop,
  overscan = 3,
}: WindowInput): Window {
  if (count <= 0 || rowHeight <= 0) return { start: 0, end: 0, padTop: 0, padBottom: 0 };

  // Clamp scrollTop: a shrinking list (a filter tightening) can leave the
  // viewport scrolled past the new end, and a negative start renders nothing.
  const maxScroll = Math.max(0, count * rowHeight - viewportHeight);
  const top = Math.min(Math.max(0, scrollTop), maxScroll);

  const first = Math.floor(top / rowHeight);
  const visible = Math.ceil(viewportHeight / rowHeight) + 1; // partial row at each edge

  const start = Math.max(0, first - overscan);
  const end = Math.min(count, first + visible + overscan);

  return {
    start,
    end,
    padTop: start * rowHeight,
    padBottom: Math.max(0, (count - end) * rowHeight),
  };
}

/**
 * Shift-click range selection: every id between the anchor and the clicked row
 * in *current display order*, which is why it takes the sorted ids rather than
 * the underlying list.
 */
export function rangeBetween(ids: readonly string[], anchor: string, to: string): string[] {
  const a = ids.indexOf(anchor);
  const b = ids.indexOf(to);
  if (a === -1 || b === -1) return [to];
  return ids.slice(Math.min(a, b), Math.max(a, b) + 1);
}
