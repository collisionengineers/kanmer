import { describe, expect, it } from "vitest";
import { MANUAL_CHAPTERS } from "./chapters.generated.js";
import { SHORTCUTS } from "../../../shared/shortcuts.js";

const byId = (id: string) => MANUAL_CHAPTERS.find((c) => c.id === id);

describe("the generated manual", () => {
  it("has the hand-written chapters first, then the reference ones", () => {
    expect(MANUAL_CHAPTERS[0]?.id).toBe("getting-started");
    expect(MANUAL_CHAPTERS[1]?.id).toBe("troubleshooting");
    expect(MANUAL_CHAPTERS.length).toBeGreaterThan(5);
  });

  it("has no empty chapter", () => {
    for (const c of MANUAL_CHAPTERS) {
      expect(c.title.trim(), c.id).not.toBe("");
      expect(c.body.trim().length, c.id).toBeGreaterThan(80);
    }
  });

  it("has unique ids", () => {
    const ids = MANUAL_CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the shortcuts chapter matches the binding table", () => {
  const chapter = byId("shortcuts");

  it("exists", () => {
    expect(chapter).toBeDefined();
  });

  it("lists every shortcut, with its keys, label and context", () => {
    // The ticket's named criterion. It proves the CHAPTER matches the TABLE.
    // It does not prove the table matches App.tsx's handler — that is still an
    // if/else chain, and the gap is recorded in shortcuts.ts and the report.
    for (const s of SHORTCUTS) {
      expect(chapter!.body, s.keys).toContain(s.keys);
      expect(chapter!.body, s.label).toContain(s.label);
      expect(chapter!.body, s.context).toContain(s.context);
    }
  });

  it("lists nothing that is not in the table", () => {
    // Every table row in the chapter body must correspond to a SHORTCUTS entry,
    // so a hand-edit to the generated file is caught rather than tolerated.
    const rows = chapter!.body
      .split("\n")
      .filter((l) => l.startsWith("| `"))
      .map((l) => l.split("|")[1].trim().replace(/`/g, ""));
    expect(rows.sort()).toEqual(SHORTCUTS.map((s) => s.keys).sort());
  });

  it("documents a view shortcut covering every view", () => {
    // The bug this ticket found: Ctrl+1..3 against four views, so Archived had
    // no shortcut and Ctrl+2 opened the wrong one.
    const entry = SHORTCUTS.find((s) => s.keys.startsWith("Ctrl+1"));
    expect(entry, "a view-switch shortcut must exist").toBeDefined();
    for (const view of ["Board", "Backlog", "Standup", "Archived"]) {
      expect(entry!.label, view).toContain(view);
    }
  });
});
