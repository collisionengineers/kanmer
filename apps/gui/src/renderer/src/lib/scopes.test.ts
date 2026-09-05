import { describe, expect, it } from "vitest";
import type { Item } from "@kanmer/core";
import { UI_STAGE_IDS } from "../../../shared/stages.js";
import {
  DEFAULT_SCOPE,
  SCOPES,
  SCOPE_IDS,
  isScope,
  primaryGroup,
  scopeCounts,
  scopeItems,
  scopeLabel,
  stagesForScope,
  type Scope,
} from "./scopes.js";

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

/** One ticket in every stage, plus an archived one and an off-stage one. */
const board: Item[] = [
  ...UI_STAGE_IDS.map((stage) => ticket(`T-${stage}`, stage)),
  ticket("T-archived", "done", { archived: true }),
  ticket("T-archived-live", "implementing", { archived: true }),
  ticket("T-unknown", "triage"),
];

describe("stagesForScope", () => {
  it("renders Preparing → Verifying for active work", () => {
    expect(stagesForScope("active")).toEqual([
      "preparing",
      "implementing",
      "review",
      "verifying",
    ]);
  });

  it("renders all six stages, in stage order, for all tickets", () => {
    expect(stagesForScope("all")).toEqual([...UI_STAGE_IDS]);
  });

  it("renders exactly one column for backlog and for completed", () => {
    expect(stagesForScope("backlog")).toEqual(["backlog"]);
    expect(stagesForScope("done")).toEqual(["done"]);
  });

  it("renders no columns for archived, because that scope renders the list surface", () => {
    // ArchivedList is the only place the GUI restores or permanently deletes;
    // an empty column list is how Board.tsx is told not to render a board.
    expect(stagesForScope("archived")).toEqual([]);
  });

  it("never names a stage the app does not know about", () => {
    for (const scope of SCOPE_IDS) {
      for (const stage of stagesForScope(scope)) {
        expect(UI_STAGE_IDS).toContain(stage);
      }
    }
  });
});

describe("scopeItems", () => {
  it("excludes archived items from every non-archived scope", () => {
    for (const scope of SCOPE_IDS.filter((s) => s !== "archived")) {
      expect(scopeItems(board, scope).some((i) => i.archived)).toBe(false);
    }
  });

  it("returns only archived items for the archived scope, whatever their stage", () => {
    const archived = scopeItems(board, "archived");
    expect(archived.map((i) => i.id).sort()).toEqual(["T-archived", "T-archived-live"]);
    // A retired record that never reached Done keeps its real stage — it is
    // history, not a completion.
    expect(archived.find((i) => i.id === "T-archived-live")?.status).toBe("implementing");
  });

  it("keeps active work strictly between Backlog and Done", () => {
    expect(scopeItems(board, "active").map((i) => i.status).sort()).toEqual([
      "implementing",
      "preparing",
      "review",
      "verifying",
    ]);
  });

  it("keeps a non-archived ticket whose status matches no known stage in All tickets", () => {
    // Older/hand-edited boards have these; dropping it would make the scope lie.
    expect(scopeItems(board, "all").map((i) => i.id)).toContain("T-unknown");
    expect(scopeItems(board, "active").map((i) => i.id)).not.toContain("T-unknown");
  });

  it("puts every live ticket in exactly one of backlog, active and done, or in none", () => {
    const live = board.filter((i) => !i.archived);
    const partitioned = [
      ...scopeItems(board, "backlog"),
      ...scopeItems(board, "active"),
      ...scopeItems(board, "done"),
    ];
    expect(new Set(partitioned.map((i) => i.id)).size).toBe(partitioned.length);
    // The one that belongs to none is the off-stage ticket.
    expect(live.length - partitioned.length).toBe(1);
  });
});

describe("scopeCounts", () => {
  it("equals scopeItems(...).length for every scope", () => {
    // Asserted across the whole SCOPES list rather than one scope at a time, so
    // a scope added later is covered without editing this test.
    const counts = scopeCounts(board);
    for (const scope of SCOPE_IDS) {
      expect(counts[scope]).toBe(scopeItems(board, scope).length);
    }
  });

  it("reports zero for every scope of an empty board", () => {
    const counts = scopeCounts([]);
    for (const scope of SCOPE_IDS) expect(counts[scope]).toBe(0);
  });

  it("ignores search and filters by construction — it takes only the item list", () => {
    // The signature is the contract (FRD-019 R5a): a badge cannot see a filter.
    expect(scopeCounts.length).toBe(1);
  });
});

describe("scope metadata", () => {
  it("lists the five scopes in the approved rail order", () => {
    expect(SCOPES.map((s) => s.id)).toEqual([
      "active",
      "all",
      "backlog",
      "done",
      "archived",
    ]);
  });

  it("names Completed for a human without claiming a delivery state", () => {
    expect(scopeLabel("done")).toBe("Completed");
    expect(scopeLabel("done").toLowerCase()).not.toContain("deploy");
  });

  it("opens on active work", () => {
    expect(DEFAULT_SCOPE).toBe("active");
  });

  it("recognises exactly the five scopes as stored preference values", () => {
    for (const scope of SCOPE_IDS) expect(isScope(scope)).toBe(true);
    for (const junk of ["", "pinned", "unfinished", null, 3, undefined]) {
      expect(isScope(junk)).toBe(false);
    }
  });
});

describe("primaryGroup", () => {
  it("shows the first membership and counts the rest", () => {
    expect(primaryGroup(["HZN-009", "EPIC-004", "BATCH-1"])).toEqual({
      chip: "HZN-009",
      extra: 2,
    });
  });

  it("shows one chip and no indicator for a single membership", () => {
    expect(primaryGroup(["HZN-009"])).toEqual({ chip: "HZN-009", extra: 0 });
  });

  it("shows nothing for no membership", () => {
    expect(primaryGroup([])).toEqual({ chip: null, extra: 0 });
    expect(primaryGroup(undefined)).toEqual({ chip: null, extra: 0 });
  });

  it("never drops a membership — it only decides what to display", () => {
    const groups = ["A", "B", "C", "D"];
    const { chip, extra } = primaryGroup(groups);
    expect(1 + extra).toBe(groups.length);
    expect(groups).toEqual(["A", "B", "C", "D"]); // untouched
    expect(chip).toBe("A");
  });
});

describe("the scope type stays closed", () => {
  it("has no member outside the five", () => {
    const all: Scope[] = ["active", "all", "backlog", "done", "archived"];
    expect(SCOPE_IDS).toEqual(all);
  });
});
