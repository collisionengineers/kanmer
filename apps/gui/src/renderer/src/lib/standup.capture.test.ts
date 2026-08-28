/**
 * Quick captures are excluded from the two standup sections that read as "act
 * on this" (CORE-117, FRD-032): Flags, which would otherwise nag that an
 * untouched observation has not changed in a week, and Up next, whose content
 * is precisely the Backlog captures live in.
 *
 * A separate file from `standup.test.ts` so this ticket's coverage is
 * attributable on its own and does not collide with concurrent edits there.
 */

import { describe, expect, it } from "vitest";
import type { BoardConfig, Item } from "@kanmer/core";
import { buildStandup, type StandupInput } from "./standup.js";

const NOW = Date.parse("2026-08-13T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number): string => new Date(NOW - ms).toISOString();

const BOARD: BoardConfig = {
  areas: [{ id: "api", name: "API" }],
  idPrefixes: { ticket: "TICK", plan: "PLAN", research: "RES" },
};

function item(partial: Partial<Item> & { id: string }): Item {
  return {
    type: "ticket",
    title: partial.id,
    status: "backlog",
    area: "api",
    assignee: "",
    labels: [],
    links: [],
    archived: false,
    created: ago(DAY),
    updated: ago(DAY),
    body: "",
    ...partial,
  } as Item;
}

function build(over: Partial<StandupInput> = {}) {
  return buildStandup({
    boardName: "scratch",
    board: BOARD,
    items: [],
    warnings: [],
    activity: [],
    now: NOW,
    ...over,
  });
}

// An empty section is dropped from the report entirely, so "absent" and "no
// lines" are the same answer to "what did this section say about captures".
const section = (r: ReturnType<typeof build>, title: string) =>
  (r.sections.find((s) => s.title === title)?.groups ?? []).flatMap((g) => g.lines);

describe("standup excludes unpromoted captures", () => {
  const stale = { updated: ago(30 * DAY), created: ago(30 * DAY) };

  it("keeps a stale capture out of Flags, while still flagging a stale ticket", () => {
    const report = build({
      items: [
        item({ id: "TICK-1", profile: "capture", ...stale }),
        item({ id: "TICK-2", profile: "fix", ...stale }),
      ],
    });
    const ids = section(report, "Flags").map((l) => l.id);
    expect(ids).not.toContain("TICK-1");
    expect(ids).toContain("TICK-2");
  });

  it("does not flag a capture for having no area", () => {
    const report = build({ items: [item({ id: "TICK-1", profile: "capture", area: "" })] });
    expect(section(report, "Flags")).toEqual([]);
  });

  it("keeps captures out of Up next", () => {
    const report = build({
      items: [
        item({ id: "TICK-1", profile: "capture" }),
        item({ id: "TICK-2", profile: "fix" }),
      ],
    });
    expect(section(report, "Up next").map((l) => l.id)).toEqual(["TICK-2"]);
  });

  it("leaves a promoted capture in Up next, because it is work now", () => {
    const report = build({
      items: [item({ id: "TICK-1", profile: "fix", capture_disposition: "promoted" })],
    });
    expect(section(report, "Up next").map((l) => l.id)).toEqual(["TICK-1"]);
  });
});
