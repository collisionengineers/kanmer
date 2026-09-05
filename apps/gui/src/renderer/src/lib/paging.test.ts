import { describe, expect, it } from "vitest";
import type { Item } from "@kanmer/core";
import { columnCards } from "./board.js";
import { scopeItems } from "./scopes.js";
import {
  PAGE_SIZE,
  clampPage,
  clampPages,
  pageColumn,
  pageCount,
  pageOf,
} from "./paging.js";

function ticket(id: string, status: string, extra: Partial<Item> = {}): Item {
  return {
    id,
    type: "ticket",
    title: id,
    status,
    area: "",
    labels: [],
    groups: [],
    archived: false,
    ...extra,
  } as unknown as Item;
}

const cards = (n: number): string[] => Array.from({ length: n }, (_, i) => `c${i + 1}`);

describe("PAGE_SIZE", () => {
  it("is four, as the approved reference specifies", () => {
    expect(PAGE_SIZE).toBe(4);
  });
});

describe("pageCount", () => {
  it("gives an empty column one page, not zero", () => {
    // "Page 1 of 0" is not a thing a user can act on.
    expect(pageCount(0)).toBe(1);
  });

  it("counts a partial last page", () => {
    expect(pageCount(4)).toBe(1);
    expect(pageCount(5)).toBe(2);
    expect(pageCount(8)).toBe(2);
    expect(pageCount(9)).toBe(3);
  });
});

describe("clampPage", () => {
  it("forces a page below one back to one", () => {
    expect(clampPage(0, 20)).toBe(1);
    expect(clampPage(-7, 20)).toBe(1);
  });

  it("forces a page past the end onto the last populated page", () => {
    // The clamp — not a reset to 1 — is what keeps the user near where they
    // were looking when a filter narrows the column under them.
    expect(clampPage(99, 20)).toBe(5);
    expect(clampPage(3, 5)).toBe(2);
  });

  it("collapses to page one when the column empties", () => {
    expect(clampPage(6, 0)).toBe(1);
  });

  it("survives a corrupt stored value", () => {
    expect(clampPage(Number.NaN, 20)).toBe(1);
    expect(clampPage(Number.POSITIVE_INFINITY, 20)).toBe(1);
    expect(clampPage(2.7, 20)).toBe(2);
  });
});

describe("pageColumn", () => {
  it("shows at most four cards and reports the unpaged total", () => {
    const page = pageColumn(cards(28), 1);
    expect(page.cards).toEqual(["c1", "c2", "c3", "c4"]);
    expect(page.start).toBe(1);
    expect(page.end).toBe(4);
    expect(page.total).toBe(28);
    expect(page.pageCount).toBe(7);
  });

  it("reports a 1-based range for a middle page", () => {
    const page = pageColumn(cards(28), 3);
    expect(page.cards).toEqual(["c9", "c10", "c11", "c12"]);
    expect(page.start).toBe(9);
    expect(page.end).toBe(12);
  });

  it("reports a short final page honestly", () => {
    const page = pageColumn(cards(6), 2);
    expect(page.cards).toEqual(["c5", "c6"]);
    expect(page.start).toBe(5);
    expect(page.end).toBe(6);
    expect(page.total).toBe(6);
  });

  it("uses a zero range only for an empty column", () => {
    const page = pageColumn([], 3);
    expect(page.cards).toEqual([]);
    expect(page.start).toBe(0);
    expect(page.end).toBe(0);
    expect(page.total).toBe(0);
    expect(page.page).toBe(1);
  });

  it("never returns an empty page for a non-empty column", () => {
    // This is the false-empty-state guarantee, asserted over every page a
    // caller could ask for rather than the one that happens to be current.
    for (const total of [1, 3, 4, 5, 17, 100]) {
      for (const asked of [-2, 0, 1, 2, 7, 1000]) {
        const page = pageColumn(cards(total), asked);
        expect(page.cards.length).toBeGreaterThan(0);
        expect(page.page).toBeLessThanOrEqual(page.pageCount);
      }
    }
  });

  it("reaches every card across its pages, exactly once", () => {
    const all = cards(23);
    const seen: string[] = [];
    const pages = pageColumn(all, 1).pageCount;
    for (let p = 1; p <= pages; p += 1) seen.push(...pageColumn(all, p).cards);
    expect(seen).toEqual(all);
  });

  it("honours a caller-supplied page size", () => {
    const page = pageColumn(cards(10), 2, 3);
    expect(page.cards).toEqual(["c4", "c5", "c6"]);
    expect(page.pageCount).toBe(4);
  });
});

describe("the pipeline pages the filtered set, never filters the page", () => {
  // A column whose matches all sit past the fourth card. Page-then-filter
  // renders it empty; filter-then-page renders the matches. This is the whole
  // reason the order is fixed.
  const column: Item[] = [
    ...Array.from({ length: 8 }, (_, i) => ticket(`NOISE-${i + 1}`, "done", { order: (i + 1) * 10 })),
    ...Array.from({ length: 3 }, (_, i) => ticket(`HIT-${i + 1}`, "done", { order: 90 + i * 10, labels: ["focus"] })),
  ];
  const matches = (items: Item[]) => items.filter((i) => i.labels.includes("focus"));

  it("shows the matches that live past the old page boundary", () => {
    const correct = pageColumn(matches(columnCards(column, "done")), 1);
    expect(correct.cards.map((c) => c.id)).toEqual(["HIT-1", "HIT-2", "HIT-3"]);
    expect(correct.total).toBe(3);
  });

  it("would have shown a false empty state the other way round", () => {
    // Documented as the defect, so a later refactor that reverses the order
    // fails this test instead of shipping.
    const wrong = matches(pageColumn(columnCards(column, "done"), 1).cards);
    expect(wrong).toEqual([]);
  });

  it("clamps the page when a filter shrinks the column under it", () => {
    const before = pageColumn(columnCards(column, "done"), 3);
    expect(before.page).toBe(3);
    const after = pageColumn(matches(columnCards(column, "done")), before.page);
    expect(after.page).toBe(1);
    expect(after.cards.length).toBe(3);
  });
});

describe("clampPages", () => {
  it("clamps every remembered page against its current column total", () => {
    expect(clampPages({ done: 9, review: 2 }, { done: 6, review: 40 })).toEqual({
      done: 2,
      review: 2,
    });
  });

  it("drops a page that has collapsed back to the first", () => {
    expect(clampPages({ done: 9 }, { done: 2 })).toEqual({});
  });

  it("keeps the same object when nothing changed, so the board does not re-render", () => {
    const pages = { done: 2 };
    expect(clampPages(pages, { done: 40 })).toBe(pages);
  });

  it("treats a column that is no longer rendered as empty", () => {
    expect(clampPages({ backlog: 4 }, {})).toEqual({});
  });
});

describe("pageOf", () => {
  const column = Array.from({ length: 30 }, (_, i) =>
    ticket(`T-${i + 1}`, "done", { order: (i + 1) * 10 }),
  );

  it("finds the page holding an item so a search result can be revealed", () => {
    expect(pageOf(column, "T-1")).toBe(1);
    expect(pageOf(column, "T-4")).toBe(1);
    expect(pageOf(column, "T-5")).toBe(2);
    expect(pageOf(column, "T-30")).toBe(8);
  });

  it("falls back to the first page for an item that is not in the column", () => {
    expect(pageOf(column, "NOPE-1")).toBe(1);
  });
});

describe("a synthetic 2,000-ticket board", () => {
  const STAGES = ["backlog", "preparing", "implementing", "review", "verifying", "done"];
  const big: Item[] = Array.from({ length: 2000 }, (_, i) =>
    ticket(`BIG-${String(i + 1).padStart(4, "0")}`, STAGES[i % STAGES.length], {
      order: (i + 1) * 10,
      archived: i % 97 === 0,
      labels: i % 5 === 0 ? ["focus"] : [],
    }),
  );

  it("scopes, sorts and pages without losing or duplicating a card", () => {
    const live = scopeItems(big, "all");
    const seen = new Set<string>();
    let counted = 0;
    for (const stage of STAGES) {
      const column = columnCards(live, stage);
      const pages = pageColumn(column, 1).pageCount;
      for (let p = 1; p <= pages; p += 1) {
        for (const card of pageColumn(column, p).cards) {
          expect(seen.has(card.id)).toBe(false);
          seen.add(card.id);
          counted += 1;
        }
      }
    }
    expect(counted).toBe(live.length);
    expect(seen.size).toBe(live.length);
  });

  it("pages a filtered scope without a false empty state anywhere", () => {
    const filtered = scopeItems(big, "done").filter((i) => i.labels.includes("focus"));
    const column = columnCards(filtered, "done");
    expect(column.length).toBeGreaterThan(0);
    const pages = pageColumn(column, 1).pageCount;
    for (let p = 1; p <= pages; p += 1) {
      expect(pageColumn(column, p).cards.length).toBeGreaterThan(0);
    }
    // And an out-of-range remembered page still lands on cards.
    expect(pageColumn(column, 10_000).cards.length).toBeGreaterThan(0);
  });

  it("keeps the archived scope out of every stage column", () => {
    const archived = scopeItems(big, "archived");
    expect(archived.length).toBeGreaterThan(0);
    const live = scopeItems(big, "all").map((i) => i.id);
    for (const item of archived) expect(live).not.toContain(item.id);
  });

  it("keeps the deterministic sort stable across pages", () => {
    const column = columnCards(scopeItems(big, "done"), "done");
    const flat = [
      ...pageColumn(column, 1).cards,
      ...pageColumn(column, 2).cards,
      ...pageColumn(column, 3).cards,
    ];
    expect(flat.map((c) => c.id)).toEqual(column.slice(0, flat.length).map((c) => c.id));
  });
});
