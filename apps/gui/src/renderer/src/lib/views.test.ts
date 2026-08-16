import { describe, expect, it } from "vitest";
import type { Item } from "@kanmer/core";
import { VIEWS, VIEW_IDS, type View, viewCount, viewCounts, viewItemsFor } from "./views.js";

function item(partial: Partial<Item> & { id: string }): Item {
  return {
    type: "ticket",
    title: partial.id,
    status: "todo",
    area: "",
    priority: "medium",
    assignee: "",
    labels: [],
    links: [],
    archived: false,
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-01T00:00:00.000Z",
    body: "",
    ...partial,
  } as Item;
}

/**
 * A board with one of everything that has ever been miscounted: work spread
 * across stages, a finished ticket, a non-ticket item (the board renders no
 * card for it), an archived ticket and an archived non-ticket item.
 */
function board(): Item[] {
  return [
    item({ id: "T-1", status: "backlog" }),
    item({ id: "T-2", status: "implementing" }),
    item({ id: "T-3", status: "done" }),
    item({ id: "P-1", type: "plan" }),
    item({ id: "T-4", archived: true }),
    item({ id: "R-1", type: "research", archived: true }),
  ];
}

describe("the Board tab's badge", () => {
  it("counts every non-archived ticket, Done included", () => {
    // Operator decision, 2026-08-16: "all non-archived tickets", not
    // "not-done". A board dominated by finished work still reports all of it.
    expect(viewCount("ticket", board())).toBe(3);
  });

  it("does not count non-ticket items, which the board renders no card for", () => {
    const withDocs = [...board(), item({ id: "R-2", type: "research" })];
    expect(viewCount("ticket", withDocs)).toBe(3);
  });

  it("does not count archived tickets", () => {
    expect(viewItemsFor("ticket", board()).map((i) => i.id)).toEqual(["T-1", "T-2", "T-3"]);
  });
});

describe("the Archived tab's badge", () => {
  it("counts every archived item, non-tickets included, because the view renders them", () => {
    // The asymmetry with Board is each view telling the truth about itself,
    // not an oversight. Asserted so it does not get normalised away.
    expect(viewCount("archived", board())).toBe(2);
    expect(viewItemsFor("archived", board()).map((i) => i.id)).toEqual(["T-4", "R-1"]);
  });
});

describe("the Standup tab", () => {
  it("has no badge", () => {
    expect(viewCount("standup", board())).toBeNull();
    expect(VIEWS.standup.counted).toBe(false);
  });
});

describe("the counts track the board", () => {
  it("is unmoved by a ticket changing stage — Board counts every stage", () => {
    const before = viewCount("ticket", board());
    const moved = board().map((i) => (i.id === "T-1" ? { ...i, status: "done" } : i));
    expect(viewCount("ticket", moved)).toBe(before);
  });

  it("moves one from Board to Archived when a ticket is archived", () => {
    const after = board().map((i) => (i.id === "T-2" ? { ...i, archived: true } : i));
    expect(viewCount("ticket", after)).toBe(2);
    expect(viewCount("archived", after)).toBe(3);
  });

  it("reports zero rather than throwing on an empty board", () => {
    expect(viewCounts([])).toEqual({ ticket: 0, standup: null, archived: 0 });
  });
});

describe("the badge equals the rows the view shows", () => {
  // GUI-071's verification criterion, and the reason the rule was extracted
  // here at all. Asserted across every view rather than one at a time, so a
  // view added later is covered without anyone remembering to edit this file.
  //
  // "The rows the view shows" means with **no filter applied** (operator
  // answer, 2026-08-16): a badge counts what lives in the view, while the
  // board's per-column counts respond to the active filter. FRD-019 R5.
  // `viewItemsFor`/`viewCount` take no filter argument, so the badge cannot
  // see one even by accident.
  const cases: Item[][] = [[], board(), board().map((i) => ({ ...i, archived: true }))];

  for (const view of VIEW_IDS) {
    it(`holds for the ${view} view`, () => {
      for (const items of cases) {
        const count = viewCount(view, items);
        if (count === null) {
          expect(VIEWS[view].counted).toBe(false);
        } else {
          expect(count).toBe(viewItemsFor(view, items).length);
        }
      }
    });
  }

  it("covers every view the shell can show, with no view left unspecified", () => {
    expect(VIEW_IDS).toEqual(["ticket", "standup", "archived"]);
    for (const view of VIEW_IDS) {
      expect(typeof VIEWS[view].label).toBe("string");
      expect(VIEWS[view].label.length).toBeGreaterThan(0);
    }
  });

  it("agrees with the per-view helpers when read as a map", () => {
    const counts = viewCounts(board());
    for (const view of VIEW_IDS) {
      expect(counts[view as View]).toBe(viewCount(view, board()));
    }
  });
});
