import { UI_STAGE_IDS } from "../../../shared/stages.js";
import type { Item } from "@kanmer/core";

/**
 * Board **scopes** — the Focus Board's navigation axis (FRD-036 R1).
 *
 * ## Why this is not a member of `VIEWS`
 *
 * `lib/views.ts` owns the shell's three top-level views (Board, Standup,
 * Archived) and keys each one's label, item set and badge together so a badge
 * cannot drift from the view it describes (GUI-071). A scope is a *different*
 * axis: it slices the Board view without adding a tab, and Ctrl+1…9 must keep
 * meaning "switch view", not "switch scope". Adding five scopes to `VIEWS`
 * would put all five in the tab strip and in that shortcut range by
 * construction — which is exactly the coupling `views.ts` is there to provide.
 * So scopes live here, `views.ts` is untouched, and `App.tsx` composes the two:
 * `scopeItems(viewItemsFor("ticket", items), scope)`.
 *
 * ## What a scope decides, and what it deliberately does not
 *
 * A scope decides two things and no more: **which stage columns are rendered**
 * and **whether archived records are in play**. It changes no stage rule, hides
 * no work (paging and search reach everything), and can never reach a gate.
 * "Completed" names the Done *stage* for a human; it is not a delivery state
 * (FRD-031 keeps those separate — Done must not read as Deployed).
 *
 * Renderer code, so `@kanmer/core` is `import type` only (AGENTS.md §7) and the
 * stage list comes from `shared/stages.ts`.
 */
export type Scope = "active" | "all" | "backlog" | "done" | "archived";

export interface ScopeSpec {
  id: Scope;
  /** The human name in the rail. */
  label: string;
  /** One line under the heading, describing what the scope holds. */
  description: string;
}

/**
 * The scopes in rail order, exactly as the approved reference lists them
 * (`prototype.js` `focusSidebar`, CONCEPT 1).
 */
export const SCOPES: readonly ScopeSpec[] = Object.freeze([
  { id: "active", label: "Active work", description: "Preparing → Verifying" },
  { id: "all", label: "All tickets", description: "All six workflow stages" },
  { id: "backlog", label: "Backlog", description: "Not started yet" },
  { id: "done", label: "Completed", description: "Reached the final stage" },
  { id: "archived", label: "Archived", description: "Archived records" },
]);

export const SCOPE_IDS = SCOPES.map((s) => s.id);

/** The scope the board opens on when nothing has been remembered. */
export const DEFAULT_SCOPE: Scope = "active";

/** True for a value that is one of the five scopes — used to sanitise stored preferences. */
export function isScope(value: unknown): value is Scope {
  return typeof value === "string" && (SCOPE_IDS as string[]).includes(value);
}

/** The scope's human name, for headings and announcements. */
export function scopeLabel(scope: Scope): string {
  return SCOPES.find((s) => s.id === scope)?.label ?? scope;
}

/** The scope's one-line description, for the page head. */
export function scopeDescription(scope: Scope): string {
  return SCOPES.find((s) => s.id === scope)?.description ?? "";
}

/** The four stages that mean "in flight": everything between Backlog and Done. */
const ACTIVE_STAGES = Object.freeze(
  UI_STAGE_IDS.filter((id) => id !== "backlog" && id !== "done"),
);

/**
 * The stage columns a scope renders, in stage order.
 *
 * `archived` returns **no** stages on purpose: the Archived scope renders the
 * existing `ArchivedList` (the only surface in the GUI that restores or
 * permanently deletes), not a board of columns. A caller that gets an empty
 * list must render the list surface, not an empty board.
 *
 * Note for `Board.tsx`: this is the *rendered* column list only. The full
 * `UI_STAGE_IDS` must still be passed to `mergeColumns` as its `known`
 * argument, or a stage this function deliberately leaves out comes straight
 * back as an unknown-status fallback column, last and misnamed (GUI-069).
 */
export function stagesForScope(scope: Scope): string[] {
  switch (scope) {
    case "active":
      return [...ACTIVE_STAGES];
    case "all":
      return [...UI_STAGE_IDS];
    case "backlog":
      return ["backlog"];
    case "done":
      return ["done"];
    case "archived":
      return [];
  }
}

/**
 * Everything the scope holds, before search and filters.
 *
 * Archived is decided first and absolutely: `archived` returns only archived
 * items (whatever their stage or type — a retired non-PASS record is history,
 * and it keeps its real stage label rather than being dressed as complete),
 * and every other scope drops archived items before it looks at a stage.
 *
 * `all` deliberately keeps a non-archived ticket whose status matches no known
 * stage. Such a ticket exists on hand-edited or older boards and `mergeColumns`
 * gives it a fallback column; dropping it here would make "All tickets" a lie.
 */
export function scopeItems(items: Item[], scope: Scope): Item[] {
  if (scope === "archived") return items.filter((i) => i.archived);
  const live = items.filter((i) => !i.archived);
  if (scope === "all") return live;
  const stages = new Set(stagesForScope(scope));
  return live.filter((i) => stages.has(i.status));
}

/**
 * Every scope's count in one pass over the board.
 *
 * These are **badges**: they count what the scope holds and ignore the active
 * search and filters, exactly as a tab badge does (FRD-019 R5a). The board's
 * per-column counts answer the other question and do respond to filters
 * (R5b), and the pager reports a third number — what is currently shown. All
 * three appear on screen at once, so they are computed from three different
 * places on purpose and must not be collapsed into one.
 *
 * By construction this is `scopeItems(items, scope).length` for every scope;
 * `scopes.test.ts` asserts that across the whole `SCOPES` list rather than one
 * scope at a time, so a scope added later is covered without editing the test.
 */
export function scopeCounts(items: Item[]): Record<Scope, number> {
  const counts = Object.fromEntries(SCOPE_IDS.map((id) => [id, 0])) as Record<Scope, number>;
  const activeStages = new Set(ACTIVE_STAGES);
  for (const item of items) {
    if (item.archived) {
      counts.archived += 1;
      continue;
    }
    counts.all += 1;
    if (activeStages.has(item.status)) counts.active += 1;
    else if (item.status === "backlog") counts.backlog += 1;
    else if (item.status === "done") counts.done += 1;
  }
  return counts;
}

/**
 * The one group chip a compact card shows, plus how many memberships it is not
 * showing.
 *
 * Group membership is many-to-many and stays that way: this picks a *display*
 * representative and drops nothing (the implementation contract is explicit —
 * never silently delete memberships to make a card fit). The full list stays
 * one click away in the Editor, and the `+N` indicator is what says the card is
 * showing a subset.
 *
 * "Most relevant" is the ticket's own first membership. No hierarchy is
 * inferred from an id prefix, because the board has no field that records one —
 * inventing one here would display a relationship the data does not contain.
 */
export function primaryGroup(groups: string[] | undefined): {
  chip: string | null;
  extra: number;
} {
  const list = groups ?? [];
  return { chip: list[0] ?? null, extra: Math.max(0, list.length - 1) };
}
