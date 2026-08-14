import type { BoardColumn, Item, MovePosition } from "@kanmer/core";

/** Find a column by id. */
export function findColumn(cols: BoardColumn[], id: string): BoardColumn | undefined {
  return cols.find((c) => c.id === id);
}

/** A column's display name, falling back to its id. */
export function columnName(cols: BoardColumn[], id: string): string {
  return findColumn(cols, id)?.name ?? id;
}

/** A column's colour, if configured. */
export function columnColor(cols: BoardColumn[], id: string): string | undefined {
  return findColumn(cols, id)?.color;
}

/** Distinct non-empty values of a field across items, sorted. */
export function distinct(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort();
}

/**
 * Live-blocker rule, mirroring core's computeBlockedIds (links.ts:61-73).
 * The renderer may only `import type` from @kanmer/core (AGENTS.md §7), so
 * this is a deliberate second copy — kept here rather than in Standup.tsx so
 * the board badges and the standup share exactly one of them.
 *
 * A blocker stops counting once it is archived or has reached the final
 * stage, and an edge pointing at an id that no longer exists blocks nothing.
 */
export function blockedIds(items: Item[], lastStage: string | undefined): Set<string> {
  const present = new Set(items.map((i) => i.id));
  const blocked = new Set<string>();
  for (const item of items) {
    if (item.archived || item.status === lastStage) continue;
    for (const target of item.blocks ?? []) if (present.has(target)) blocked.add(target);
  }
  return blocked;
}

/** Core's ordering rule: by `order`, unordered last, ties broken by id. */
function byOrderThenId(a: Item, b: Item): number {
  const ao = a.order ?? Number.POSITIVE_INFINITY;
  const bo = b.order ?? Number.POSITIVE_INFINITY;
  if (ao !== bo) return ao < bo ? -1 : 1;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

/**
 * The cards of one stage, in the order the store would return them
 * (store.ts:422 sorts by order-then-id).
 *
 * COLUMN-scoped, not area-scoped: `order` is a column-wide key —
 * computeOrder filters on `i.status === status` with no area filter
 * (store.ts:692) — while the board renders cards grouped by area. "Before the
 * first card of the API group" is therefore NOT "top of the column" when the
 * No-area group renders above it. Drop-neighbour computation must always come
 * from here, never from a rendered group's cards.
 */
export function columnCards(items: Item[], statusId: string): Item[] {
  return items.filter((i) => i.status === statusId).sort(byOrderThenId);
}

/**
 * Translate a drop onto a card edge into a core MovePosition.
 *  `edge: "after"`  → `{ after: targetId }`
 *  `edge: "before"` → `{ after: <the card above targetId> }`, or "top" when
 *                     the target is the column's first card.
 *
 * The moving card is excluded from the neighbour search — core's computeOrder
 * does the same (store.ts:695) — which is what makes "drag one slot down"
 * actually move rather than resolve to the card itself. An unknown target
 * (including dropping a card on itself) falls back to "bottom".
 */
export function positionForDrop(
  column: Item[],
  targetId: string,
  edge: "before" | "after",
  movingId: string,
): MovePosition {
  const others = column.filter((i) => i.id !== movingId);
  const idx = others.findIndex((i) => i.id === targetId);
  if (idx === -1) return "bottom";
  if (edge === "after") return { after: targetId };
  return idx === 0 ? "top" : { after: others[idx - 1].id };
}

/**
 * The `order` an optimistic update should give the moving card so the board
 * re-sorts to the dropped position before the write lands. Mirrors
 * computeOrder's arithmetic (store.ts:692-729) without its persistence: a
 * column holding any unordered card is treated as if it had just been
 * materialised to 10, 20, 30…
 *
 * Returns undefined when the position cannot be resolved (an `after` target
 * that is not in the column) — the caller should then leave `order` alone and
 * let the real write decide.
 */
export function optimisticOrder(
  column: Item[],
  position: MovePosition,
  movingId: string,
): number | undefined {
  const others = column.filter((i) => i.id !== movingId);
  const orders = others.some((i) => i.order === undefined)
    ? others.map((_, n) => (n + 1) * 10)
    : others.map((i) => i.order as number);
  if (position === "top") return orders.length ? orders[0] - 10 : 10;
  if (position === "bottom") return orders.length ? orders[orders.length - 1] + 10 : 10;
  const idx = others.findIndex((i) => i.id === position.after);
  if (idx === -1) return undefined;
  const before = orders[idx];
  const successor = orders[idx + 1];
  return successor === undefined ? before + 10 : (before + successor) / 2;
}
