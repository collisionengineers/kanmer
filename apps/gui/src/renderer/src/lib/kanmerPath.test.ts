import { describe, expect, it } from "vitest";
import { classifyKanmerPath } from "../../../shared/kanmerPath.js";

describe("classifyKanmerPath", () => {
  it.each([
    [".kanmer/data/board.yml", { key: "board", kind: "board" }],
    [".kanmer/tickets/TICK-001.md", { key: "TICK-001", kind: "item" }],
    [".kanmer\\areas\\api\\API-001\\API-001.md", { key: "API-001", kind: "item" }],
    [".kanmer/areas/api/API-001/post-implementation-report.md", { key: "API-001", kind: "document" }],
    [".kanmer/areas/api/API-001/open-questions.md", { key: "API-001", kind: "document" }],
    [".kanmer/areas/api/API-001/scratch-dispatch.md", { key: "API-001", kind: "document" }],
  ])("classifies %s", (path, expected) => expect(classifyKanmerPath(path)).toEqual(expected));

  it("rejects malformed and unrelated paths", () => {
    expect(classifyKanmerPath(".kanmer/areas/api/API-001/child/plan.md")).toBeNull();
    expect(classifyKanmerPath(".kanmer/data/activity.jsonl")).toBeNull();
  });
});
