/**
 * Pure geometry and keyboard logic for the context menu.
 *
 * Lives here rather than in the component because `renderer/src/lib/` is the
 * only renderer code vitest covers (AGENTS.md §7) — and the two things most
 * likely to be wrong in a menu are where it lands near a screen edge and how
 * arrow keys skip disabled items. Both are testable without a DOM.
 */

export interface Viewport {
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

const PAD = 8;

/**
 * Where to draw a menu opened at (x, y).
 *
 * Near an edge the menu **flips** across the anchor rather than sliding along
 * it: sliding leaves the pointer sitting on top of a menu item, so the first
 * mouse-up can select something the user never aimed at. A menu too large to
 * fit either way is pinned inside the viewport with padding.
 */
export function menuPosition(
  x: number,
  y: number,
  size: Size,
  viewport: Viewport,
): { left: number; top: number } {
  let left = x + size.width + PAD > viewport.width ? x - size.width : x;
  let top = y + size.height + PAD > viewport.height ? y - size.height : y;
  left = Math.max(PAD, Math.min(left, viewport.width - size.width - PAD));
  top = Math.max(PAD, Math.min(top, viewport.height - size.height - PAD));
  return { left, top };
}

/** Where a submenu opens: to the right of its parent row, flipping if needed. */
export function submenuPosition(
  parentRect: { right: number; left: number; top: number },
  size: Size,
  viewport: Viewport,
): { left: number; top: number } {
  const wouldOverflow = parentRect.right + size.width + PAD > viewport.width;
  const x = wouldOverflow ? parentRect.left - size.width : parentRect.right;
  return menuPosition(x, parentRect.top, size, viewport);
}

/**
 * The next focusable index when arrowing through a menu, skipping disabled
 * items and wrapping. Returns the current index when every item is disabled,
 * so focus never lands somewhere unusable.
 */
export function nextEnabledIndex(
  items: { disabled?: boolean }[],
  current: number,
  direction: 1 | -1,
): number {
  if (!items.some((i) => !i.disabled)) return current;
  let next = current;
  for (let n = 0; n < items.length; n++) {
    next = (next + direction + items.length) % items.length;
    if (!items[next]?.disabled) return next;
  }
  return current;
}

/** First and last enabled index — Home and End. */
export function firstEnabledIndex(items: { disabled?: boolean }[]): number {
  return items.findIndex((i) => !i.disabled);
}
export function lastEnabledIndex(items: { disabled?: boolean }[]): number {
  for (let i = items.length - 1; i >= 0; i--) if (!items[i]?.disabled) return i;
  return -1;
}
