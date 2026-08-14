import { describe, expect, it } from "vitest";
import { progressDocId } from "./docProgress.js";

describe("progressDocId", () => {
  it("finds the default checklist document", () => {
    expect(progressDocId([{ id: "checklist", name: "Checklist", progress: true }])).toBe("checklist");
  });

  it("supports a renamed area progress document", () => {
    expect(progressDocId([{ id: "tasks", name: "Tasks", progress: true }])).toBe("tasks");
  });

  it("uses the progress document from an already resolved per-area type set", () => {
    // Editor receives the area-resolved types from getDocGates; it must not
    // fall back to the board default name when that area renamed the document.
    const apiResolvedTypes = [
      { id: "design", name: "Design" },
      { id: "api-tasks", name: "API Tasks", progress: true },
    ];
    expect(progressDocId(apiResolvedTypes)).toBe("api-tasks");
  });

  it("returns undefined when no document represents progress", () => {
    expect(progressDocId([{ id: "plan", name: "Plan" }])).toBeUndefined();
  });
});
