import { describe, expect, it } from "vitest";
import type { ActivityEntry, BoardConfig, Item, ItemWarning } from "@kanmer/core";
import { buildStandup, standupMarkdown, type StandupInput } from "./standup.js";

const NOW = Date.parse("2026-08-13T12:00:00.000Z");
const ago = (ms: number): string => new Date(NOW - ms).toISOString();
const DAY = 24 * 60 * 60 * 1000;

// Stages are constants in format 3, so the fixture board carries only what a
// board still configures.
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

const titles = (r: ReturnType<typeof build>): string[] => r.sections.map((s) => s.title);
const section = (r: ReturnType<typeof build>, t: string) =>
  r.sections.find((s) => s.title === t);
const allLines = (r: ReturnType<typeof build>, t: string): string[] =>
  section(r, t)?.groups.flatMap((g) => g.lines.map((l) => l.text)) ?? [];

/** A board exercising all eight sections at once. */
function fullInput(): Partial<StandupInput> {
  const items: Item[] = [
    item({ id: "TICK-001", status: "implementing", assignee: "alex", taken_at: ago(DAY), branch: "feat/x" }),
    item({ id: "TICK-002", status: "implementing", assignee: "sam" }),
    item({ id: "TICK-003", status: "review", assignee: "alex" }),
    item({ id: "TICK-004", status: "backlog" }),
    item({ id: "TICK-005", status: "done", updated: ago(3 * DAY) }),
    item({ id: "TICK-006", status: "backlog", blocks: ["TICK-007"] }),
    item({ id: "TICK-007", status: "backlog" }),
    item({ id: "TICK-008", status: "backlog" }),
    item({ id: "TICK-009", status: "nowhere" }),
  ];
  const activity: ActivityEntry[] = [
    { ts: ago(2 * 60 * 60 * 1000), id: "TICK-001", op: "create", to: "backlog", actor: "claude" },
    {
      ts: ago(60 * 60 * 1000),
      id: "TICK-003",
      op: "update",
      field: "status",
      from: "implementing",
      to: "review",
      actor: "gui",
    },
    { ts: ago(3 * DAY), id: "TICK-005", op: "update", field: "status", from: "review", to: "done", actor: "codex" },
  ];
  const warnings: ItemWarning[] = [
    { file: "C:/p/.kanmer/areas/api/BAD/BAD.md", message: "failed to parse: bad yaml" },
  ];
  return { items, activity, warnings };
}

describe("buildStandup", () => {
  it("emits the skill's seven sections in the skill's order", () => {
    const r = build(fullInput());
    expect(titles(r)).toEqual([
      "In flight",
      "In review",
      "Up next",
      "Recently done",
      "Blocked",
      "What happened since yesterday",
      "Flags",
    ]);
  });

  it("omits empty sections", () => {
    const r = build({ items: [item({ id: "TICK-001", status: "backlog" })] });
    expect(titles(r)).toEqual(["Up next"]);
  });

  it("groups In flight by assignee only when more than one is present", () => {
    const two = build({
      items: [
        item({ id: "A", status: "implementing", assignee: "alex" }),
        item({ id: "B", status: "implementing", assignee: "sam" }),
        item({ id: "C", status: "implementing" }),
      ],
    });
    expect(section(two, "In flight")?.groups.map((g) => g.label)).toEqual([
      "alex",
      "sam",
      "unassigned",
    ]);

    const one = build({
      items: [
        item({ id: "A", status: "implementing", assignee: "alex" }),
        item({ id: "B", status: "implementing", assignee: "alex" }),
      ],
    });
    expect(section(one, "In flight")?.groups.map((g) => g.label)).toEqual([null]);
  });

  it("groups What happened since yesterday by actor only when more than one was active", () => {
    const base = { items: [item({ id: "A" })] };
    const two = build({
      ...base,
      activity: [
        { ts: ago(3600_000), id: "A", op: "create", actor: "claude" },
        { ts: ago(3600_000), id: "B", op: "create", actor: "codex" },
      ] as ActivityEntry[],
    });
    expect(
      section(two, "What happened since yesterday")?.groups.map((g) => g.label),
    ).toEqual(["claude", "codex"]);

    const one = build({
      ...base,
      activity: [
        { ts: ago(3600_000), id: "A", op: "create", actor: "claude" },
        { ts: ago(3600_000), id: "B", op: "create", actor: "claude" },
      ] as ActivityEntry[],
    });
    expect(
      section(one, "What happened since yesterday")?.groups.map((g) => g.label),
    ).toEqual([null]);
  });

  it("collapses repeated activity on one item to a single line", () => {
    const r = build({
      items: [item({ id: "A" })],
      activity: [
        { ts: ago(5 * 3600_000), id: "A", op: "update", field: "status", from: "backlog", to: "preparing", actor: "claude" },
        { ts: ago(3600_000), id: "A", op: "update", field: "status", from: "preparing", to: "review", actor: "claude" },
      ] as ActivityEntry[],
    });
    expect(allLines(r, "What happened since yesterday")).toEqual([
      "A moved Preparing → Review",
    ]);
  });

  it("uses a 7-day recently-done window, not 48 hours", () => {
    const r = build({
      items: [
        item({ id: "NEAR", status: "done", updated: ago(3 * DAY) }),
        item({ id: "FAR", status: "done", updated: ago(9 * DAY) }),
      ],
    });
    const lines = allLines(r, "Recently done").join(" ");
    expect(lines).toContain("NEAR");
    expect(lines).not.toContain("FAR");
  });

  it("carries the actor on a recently-done line when it was not the GUI", () => {
    const r = build({
      items: [item({ id: "A", status: "done", updated: ago(2 * DAY) })],
      activity: [
        { ts: ago(2 * DAY), id: "A", op: "update", field: "status", from: "review", to: "done", actor: "codex" },
      ] as ActivityEntry[],
    });
    expect(allLines(r, "Recently done")[0]).toContain("(codex)");
  });

  it("flags off-board stages, stale items, area-less tickets, long-taken tickets and file warnings", () => {
    const r = build({
      items: [
        item({ id: "OFF", status: "nowhere" }),
        item({ id: "STALE", updated: ago(9 * DAY) }),
        item({ id: "NOAREA", area: "" }),
        item({ id: "TAKEN", status: "implementing", taken_at: ago(5 * DAY) }),
      ],
      warnings: [{ file: "bad.md", message: "failed to parse" }],
      activity: [],
    });
    const lines = allLines(r, "Flags");
    expect(lines.some((l) => l.includes("bad.md"))).toBe(true);
    expect(lines.some((l) => /OFF is in "nowhere"/.test(l))).toBe(true);
    expect(lines.some((l) => l.startsWith("STALE has not changed since"))).toBe(true);
    expect(lines.some((l) => l === "NOAREA has no area")).toBe(true);
    expect(lines.some((l) => /TAKEN has been taken since .* with no activity since/.test(l))).toBe(
      true,
    );
    // The file warning is not about an item, so it carries no id.
    expect(section(r, "Flags")?.groups[0].lines.find((l) => l.text.includes("bad.md"))?.id).toBe(
      null,
    );
  });

  it("does not flag a taken ticket that has had activity since it was taken", () => {
    const takenAt = ago(5 * DAY);
    const r = build({
      items: [item({ id: "A", status: "implementing", taken_at: takenAt })],
      activity: [{ ts: ago(2 * DAY), id: "A", op: "doc", field: "plan", actor: "claude" }] as ActivityEntry[],
    });
    expect(allLines(r, "Flags").some((l) => l.includes("taken since"))).toBe(false);
  });

  it("marks a stale in-flight ticket and shows its branch", () => {
    const r = build({
      items: [
        item({
          id: "A",
          status: "implementing",
          updated: ago(9 * DAY),
          taken_at: ago(9 * DAY),
          branch: "feat/a",
          worktree: "C:/wt/a",
        }),
      ],
    });
    expect(allLines(r, "In flight")[0]).toBe(
      "A A (Implementing, api) — ⛏ feat/a (C:/wt/a) — *stale*",
    );
  });

  it("shows checklist progress when it is supplied", () => {
    const r = build({
      items: [item({ id: "A", status: "implementing" })],
      checklists: { A: { checked: 3, total: 7 } },
    });
    expect(allLines(r, "In flight")[0]).toContain("— 3/7");
  });

  it("caps Up next at five and excludes archived and non-ticket items", () => {
    const r = build({
      items: [
        ...Array.from({ length: 7 }, (_, n) => item({ id: `T-${n}` })),
        item({ id: "ARCHIVED", archived: true }),
      ],
    });
    expect(allLines(r, "Up next")).toHaveLength(5);
    expect(allLines(r, "Up next").join(" ")).not.toContain("ARCHIVED");
  });
});

describe("standupMarkdown", () => {
  it("matches the skill's shape", () => {
    const md = standupMarkdown(build(fullInput()));
    expect(md.startsWith("### Board: scratch\n\n")).toBe(true);
    expect(md).toContain("**In flight**");
    expect(md).toContain("**Flags**");
    // grouped sections carry italic labels
    expect(md).toMatch(/_alex_/);
    expect(md).toMatch(/^- /m);
    // no empty section headings
    expect(md).not.toContain("**In flight**\n\n**");
  });

  it("emits only the board heading when nothing is reportable", () => {
    expect(standupMarkdown(build())).toBe("### Board: scratch");
  });
});
