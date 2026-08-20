import { describe, expect, it } from "vitest";
import type { RepoStaleness } from "@kanmer/core";
import { needsStalenessAttention } from "./repoStaleness.js";

const compensated: RepoStaleness = {
  upToDate: true,
  stale: [{ artefact: "board-config", state: "compensated", detail: "runtime covers it", fix: "none" }],
};

describe("needsStalenessAttention", () => {
  it("does not turn a compensated-only report into a permanent warning", () => {
    expect(needsStalenessAttention(compensated)).toBe(false);
  });

  it("surfaces a report with an actionable behind row", () => {
    expect(
      needsStalenessAttention({
        upToDate: false,
        stale: [...compensated.stale, { artefact: "skills", state: "behind", detail: "old", fix: "reconnect" }],
      }),
    ).toBe(true);
  });

  it("does not render before the cold-path read completes", () => {
    expect(needsStalenessAttention(null)).toBe(false);
  });
});
