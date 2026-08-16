import { describe, expect, it } from "vitest";
import { MANUAL_CHAPTERS } from "./chapters.generated.js";
import { SHORTCUTS } from "../../../shared/shortcuts.js";

const byId = (id: string) => MANUAL_CHAPTERS.find((c) => c.id === id);

/** The manual in reading order. Ids are the deep-link surface — see below. */
const EXPECTED_IDS = [
  "getting-started",
  "install",
  "connect",
  "first-ticket",
  "stages",
  "profiles",
  "gates",
  "documents",
  "references",
  "proof",
  "groups",
  "dispatch",
  "board-sync",
  "sync",
  "settings",
  "shortcuts",
  "updates",
  "troubleshooting",
  "glossary",
];

describe("the generated manual", () => {
  it("is the expected chapters, in reading order", () => {
    expect(MANUAL_CHAPTERS.map((c) => c.id)).toEqual(EXPECTED_IDS);
  });

  it("opens on getting-started", () => {
    // Load-bearing, not cosmetic: Manual.tsx opens MANUAL_CHAPTERS[0] when no
    // chapter is named, which is every Help-menu and F1 entry.
    expect(MANUAL_CHAPTERS[0]?.id).toBe("getting-started");
  });

  it("still has a troubleshooting chapter", () => {
    // It used to be pinned at index 1. Reading order puts it near the end,
    // where a reference chapter belongs — so assert it exists, not where.
    expect(MANUAL_CHAPTERS.some((c) => c.id === "troubleshooting")).toBe(true);
  });

  it("has no empty chapter", () => {
    for (const c of MANUAL_CHAPTERS) {
      expect(c.title.trim(), c.id).not.toBe("");
      // The old floor was 80, and every FRD-derived stub cleared it at 82.
      // The generated shortcuts chapter is a table by design and is checked
      // row-for-row against SHORTCUTS below, which is stronger than a length.
      const floor = c.id === "shortcuts" ? 400 : 1500;
      expect(c.body.trim().length, c.id).toBeGreaterThan(floor);
    }
  });

  it("shows the reader nothing from our specification documents", () => {
    // The bug this ticket fixes: nine of twelve chapters were FRD prose, one of
    // them a verbatim requirement list. The build refuses these too — asserted
    // here as well so a hand-edit to the generated file cannot reintroduce it.
    for (const c of MANUAL_CHAPTERS) {
      for (const [what, text] of [
        ["title", c.title],
        ["body", c.body],
      ] as const) {
        expect(text, `${c.id} ${what}: names a spec document`).not.toMatch(
          /\b(?:FRD|ADR|PRD)-/,
        );
        expect(
          text,
          `${c.id} ${what}: points into /docs/, which the packaged app does not ship`,
        ).not.toMatch(/\bdocs\/[\w.-]/);
        expect(text, `${c.id} ${what}: has a requirement list`).not.toMatch(
          /^\s*(?:[-*]\s*)?(?:R|AC)\d+\.\s/m,
        );
      }
    }
  });

  it("has no body-level H1 — the viewer renders the title itself", () => {
    for (const c of MANUAL_CHAPTERS) {
      expect(c.body, c.id).not.toMatch(/^#\s+\S/m);
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
    // The bug this test was written for: Ctrl+1..3 against four views, so
    // Archived had no shortcut and Ctrl+2 opened the wrong one. GUI-070 removed
    // the Backlog view, so the set is three again — the assertion has to shrink
    // with it, but it must still name every view, which is the actual check.
    const entry = SHORTCUTS.find((s) => s.keys.startsWith("Ctrl+1"));
    expect(entry, "a view-switch shortcut must exist").toBeDefined();
    for (const view of ["Board", "Standup", "Archived"]) {
      expect(entry!.label, view).toContain(view);
    }
  });
});
