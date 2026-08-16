import { describe, expect, it } from "vitest";
import { STAGES, FIRST_STAGE, LAST_STAGE, stageName } from "@kanmer/core";
import { UI_STAGES, UI_FIRST_STAGE, UI_LAST_STAGE, uiStageName } from "./stages.js";

/**
 * The renderer cannot import core at runtime, so `shared/stages.ts` restates
 * the six stages. This test is what keeps the copy honest — it runs in the
 * Node-side vitest project, where importing core is allowed.
 */
describe("renderer stage mirror matches core", () => {
  it("has the same ids, names, colours and order", () => {
    expect(UI_STAGES.map((s) => ({ id: s.id, name: s.name, color: s.color }))).toEqual(
      STAGES.map((s) => ({ id: s.id, name: s.name, color: s.color })),
    );
  });

  it("agrees on the first and last stage", () => {
    expect(UI_FIRST_STAGE).toBe(FIRST_STAGE);
    expect(UI_LAST_STAGE).toBe(LAST_STAGE);
  });

  it("names stages the same way, including the unknown-id fallback", () => {
    for (const s of STAGES) expect(uiStageName(s.id)).toBe(stageName(s.id));
    expect(uiStageName("researching")).toBe(stageName("researching"));
  });
});
