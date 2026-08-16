import { describe, expect, it } from "vitest";
import { collapsesPipeline, evaluateGateReport, type BoundaryStatus } from "./gates.js";
import { DEFAULT_PROFILES } from "./profiles.js";
import { stageIndex } from "./stages.js";

/**
 * Every requirement satisfied. This rule is about the *shape* of a move, and
 * has to fire even when no document is missing — that is exactly the case it
 * exists for.
 */
const ALL_PRESENT = {
  hasType: async () => true,
  hasNamed: async () => true,
  hasGoverningDoc: () => true,
  hasProofImages: async () => true,
};

async function boundariesFor(
  profileId: string,
  profiles: Record<string, unknown> = DEFAULT_PROFILES,
): Promise<BoundaryStatus[]> {
  const report = await evaluateGateReport({
    profiles: profiles as never,
    profileId,
    stage: "backlog",
    evidence: ALL_PRESENT,
  });
  return report.boundaries;
}

const at = (stage: string): number => stageIndex(stage);

describe("one gated boundary per move (FRD-002 G2, amended)", () => {
  it("refuses a feature collapsing Backlog straight to Done", async () => {
    const crossed = collapsesPipeline(await boundariesFor("feature"), at("backlog"), at("done"));
    expect(crossed).not.toBeNull();
    // leave-backlog, leave-preparing, enter-review, enter-done
    expect(crossed!.length).toBe(4);
  });

  it("allows every single step of the feature pipeline", async () => {
    const b = await boundariesFor("feature");
    const steps: [string, string][] = [
      ["backlog", "preparing"],
      ["preparing", "implementing"],
      ["implementing", "review"],
      ["review", "verifying"],
      ["verifying", "done"],
    ];
    for (const [from, to] of steps) {
      expect(collapsesPipeline(b, at(from), at(to)), `${from} -> ${to}`).toBeNull();
    }
  });

  it("keeps the chore one-jump to Implementing", async () => {
    // Two stages, one gated boundary: chore asks for nothing at leave-backlog.
    // Counting stages instead of gated boundaries would break this.
    expect(
      collapsesPipeline(await boundariesFor("chore"), at("backlog"), at("implementing")),
    ).toBeNull();
  });

  it("keeps a spike going straight to Done", async () => {
    // Five stages, one gated boundary: spike only asks for research at
    // enter-done. The other shipped acceptance case a stage count would break.
    expect(collapsesPipeline(await boundariesFor("spike"), at("backlog"), at("done"))).toBeNull();
  });

  it("ignores boundaries a profile declares with no requirements", async () => {
    const b = await boundariesFor("custom", {
      ...DEFAULT_PROFILES,
      custom: { "leave-backlog": [], "leave-preparing": [] },
    });
    // Declared but vacuous: an empty list must behave like an absent key, or
    // `custom: {}` and `custom: { "leave-backlog": [] }` would differ.
    expect(collapsesPipeline(b, at("backlog"), at("implementing"))).toBeNull();
  });

  it("never fires on a backwards move", async () => {
    expect(
      collapsesPipeline(await boundariesFor("feature"), at("done"), at("backlog")),
    ).toBeNull();
  });

  it("fires on a two-gate move even when it is only two stages", async () => {
    // preparing → review crosses leave-preparing and enter-review.
    const crossed = collapsesPipeline(
      await boundariesFor("feature"),
      at("preparing"),
      at("review"),
    );
    expect(crossed).not.toBeNull();
    expect(crossed!.map((b) => b.boundary)).toEqual(["leave-preparing", "enter-review"]);
  });
});
