/**
 * The four-profile move matrix, measured against the real gate engine.
 *
 * Every multi-stage move, every shipped profile, with **every document present**
 * — so the only thing that can refuse a move is the structural anti-collapse
 * rule (`collapsesPipeline`), which counts *gated boundaries*. That makes this
 * file the answer to "which moves does each profile allow?", and it answers it
 * by asking the engine rather than by restating a table someone wrote once.
 *
 * It exists because SKILL-013 changed the answer: `fix` gained a gated
 * `enter-review` (ADR-0013), taking it from 2 gated boundaries to 3. The
 * operator's instruction was that every other multi-stage `fix` move be
 * **re-measured, not assumed** — two earlier claims about this same machinery
 * were wrong before measurement caught them (SKILL-012).
 *
 * Run with `PRINT_MATRIX=1` to dump the table this test asserts.
 */

import { describe, expect, it } from "vitest";
import { defaultBoardConfig, resolveProfiles } from "./board.js";
import { DEFAULT_PROFILES } from "./profiles.js";
import { collapsesPipeline, evaluateGateReport, type EvidenceProbe } from "./gates.js";
import { STAGE_IDS } from "./stages.js";
import type { BoardConfig } from "./types.js";

/** Everything a gate could ask for, present. Isolates the structural rule. */
const allPresent: EvidenceProbe = {
  hasType: async () => true,
  hasNamed: async () => true,
  hasGoverningDoc: () => true,
  hasProofImages: async () => true,
  unresolvedQuestions: async () => 0,
};

/** ALLOWED / REFUSED for one move, asking the real engine. */
async function verdict(
  profiles: Record<string, ReturnType<typeof resolveProfiles>[string]>,
  profileId: string,
  from: string,
  to: string,
): Promise<"ALLOWED" | "REFUSED"> {
  const report = await evaluateGateReport({
    profiles,
    profileId,
    stage: from,
    evidence: allPresent,
  });
  const fromIdx = STAGE_IDS.indexOf(from as never);
  const toIdx = STAGE_IDS.indexOf(to as never);
  if (collapsesPipeline(report.boundaries, fromIdx, toIdx)) return "REFUSED";
  return report.reachable.includes(to) ? "ALLOWED" : "REFUSED";
}

/** Every forward move of more than one stage — where collapse can happen. */
const MULTI_STAGE: Array<[string, string]> = [];
for (let f = 0; f < STAGE_IDS.length; f++) {
  for (let t = f + 1; t < STAGE_IDS.length; t++) {
    MULTI_STAGE.push([STAGE_IDS[f], STAGE_IDS[t]]);
  }
}

const PROFILES = ["feature", "fix", "chore", "spike"] as const;

async function matrix(profiles: Record<string, never>): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const p of PROFILES) {
    for (const [from, to] of MULTI_STAGE) {
      out[`${p} ${from}->${to}`] = await verdict(profiles as never, p, from, to);
    }
  }
  return out;
}

describe("the four-profile move matrix", () => {
  it("matches what the engine actually allows, on a default board", async () => {
    const resolved = resolveProfiles(defaultBoardConfig()) as never;
    const result = await matrix(resolved);

    if (process.env.PRINT_MATRIX) {
      const rows = MULTI_STAGE.map(([from, to]) => {
        const cells = PROFILES.map((p) => result[`${p} ${from}->${to}`].padEnd(8));
        return `${`${from} -> ${to}`.padEnd(28)} ${cells.join(" ")}`;
      });
      console.log(`\n${"move".padEnd(28)} ${PROFILES.map((p) => p.padEnd(8)).join(" ")}`);
      console.log(rows.join("\n"));
    }

    // The single row this ticket exists to change. Stated on its own so a
    // regression names itself rather than hiding in a large object diff.
    expect(result["fix implementing->done"]).toBe("REFUSED");
    // Unchanged by ADR-0013, and the operator said keep them that way.
    expect(result["chore implementing->done"]).toBe("ALLOWED");
    expect(result["spike implementing->done"]).toBe("ALLOWED");
    expect(result["feature implementing->done"]).toBe("REFUSED");

    // The acceptance case FRD-002 exists to protect: a spike goes Backlog to
    // Done in one move, across exactly one gated boundary.
    expect(result["spike backlog->done"]).toBe("ALLOWED");
    // And chore's one-jump into Implementing.
    expect(result["chore backlog->implementing"]).toBe("ALLOWED");

    expect(result).toMatchSnapshot();
  });

  it("reaches a board whose profiles: block predates ADR-0013", async () => {
    // The SKILL-012 lesson: editing DEFAULT_PROFILES alone reaches new boards
    // only. A board written by setup or migration carries its own frozen
    // profiles: block, and `board.profiles ?? …` means the defaults are never
    // consulted again. This is that board, built from the pre-change shape.
    const legacyFix = {
      "leave-preparing": ["files", "plan"],
      "enter-done": ["proof"],
    };
    const board = {
      profiles: { ...structuredClone(DEFAULT_PROFILES), fix: legacyFix },
    } as unknown as BoardConfig;

    const resolved = resolveProfiles(board);
    expect(resolved.fix["enter-review"]).toBeDefined();
    expect(await verdict(resolved as never, "fix", "implementing", "done")).toBe("REFUSED");
  });
});
