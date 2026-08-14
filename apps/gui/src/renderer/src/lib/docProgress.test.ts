import { describe, expect, it } from "vitest";
import { progressDocId } from "./docProgress.js";

describe("progressDocId", () => {
  it("finds the default checklist document", () => {
    expect(progressDocId([{ id: "checklist", name: "Checklist", progress: true }])).toBe("checklist");
  });

  it("supports a renamed area progress document", () => {
    expect(progressDocId([{ id: "tasks", name: "Tasks", progress: true }])).toBe("tasks");
  });

  it("returns undefined when no document represents progress", () => {
    expect(progressDocId([{ id: "plan", name: "Plan" }])).toBeUndefined();
  });
});
