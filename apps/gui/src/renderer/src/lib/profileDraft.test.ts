import { describe, expect, it } from "vitest";
import type { BoardConfig } from "@kanmer/core";
import {
  applyProfileEdit,
  changedProfiles,
  parseRequirementLike,
  splitRequirements,
  ticketsAffected,
  validateProfiles,
  validateRequirement,
  type Vocabulary,
} from "./profileDraft.js";

/**
 * Stated explicitly rather than imported. If core's vocabulary changes, these
 * tests keep asserting the old one and the mirror's drift becomes visible —
 * importing the real list would make them agree by construction and prove
 * nothing.
 */
const VOCAB: Vocabulary = {
  docTypes: [
    "research", "files", "plan", "checklist", "open-questions",
    "post-implementation-report", "proof",
  ],
  proofTypes: ["visual", "test"],
  environments: ["staging", "production"],
  boundaries: ["leave-backlog", "leave-preparing", "enter-review", "enter-verifying", "enter-done"],
};

describe("parseRequirementLike — split order", () => {
  it("splits @ before : before /", () => {
    expect(parseRequirementLike("proof:visual@staging")).toEqual({
      raw: "proof:visual@staging",
      type: "proof",
      proofType: "visual",
      env: "staging",
    });
  });

  it("treats @ inside a named path as the environment, exactly as core does", () => {
    // Splitting `/` first would yield named="a@b" and no env. Core splits `@`
    // first, so this is an environment — and the mirror must agree even though
    // agreeing means accepting an odd-looking parse.
    const r = parseRequirementLike("research/notes@staging");
    expect(r.type).toBe("research");
    expect(r.env).toBe("staging");
    expect(r.named).toBe("notes");
  });

  it("handles a bare type", () => {
    expect(parseRequirementLike("plan")).toEqual({ raw: "plan", type: "plan" });
  });

  it("trims", () => {
    expect(parseRequirementLike("  proof  ").type).toBe("proof");
  });
});

describe("validateRequirement", () => {
  const ok = (s: string) => expect(validateRequirement(s, VOCAB)).toBeNull();
  const bad = (s: string, re: RegExp) => expect(validateRequirement(s, VOCAB)).toMatch(re);

  it("accepts every shipped document type", () => {
    for (const t of VOCAB.docTypes) ok(t);
  });

  it("accepts governing-doc", () => ok("governing-doc"));
  // Must stay in step with core's QUESTIONS_RESOLVED: if this mirror lags,
  // Settings rejects a profile the core happily accepts (ADR-0011).
  it("accepts questions-resolved", () => ok("questions-resolved"));
  it("accepts a typed proof with an environment", () => ok("proof:visual@staging"));
  it("accepts a named document", () => ok("research/findings"));

  it("rejects an unknown type", () => bad("impact", /unknown document type "impact"/));
  it("rejects a suffix on a non-proof type", () => bad("plan:visual", /only `proof` takes a type suffix/));
  it("rejects an undeclared proof type", () => bad("proof:audio", /unknown proof type "audio"/));
  it("rejects an undeclared environment", () => bad("proof@qa", /unknown environment "qa"/));
  it("rejects the empty string", () => bad("", /empty requirement/));

  it("says so when the board declares no environments at all", () => {
    expect(validateRequirement("proof@staging", { ...VOCAB, environments: [] })).toMatch(
      /declares none/,
    );
  });
});

describe("validateProfiles", () => {
  it("is silent on the shipped shapes", () => {
    expect(
      validateProfiles(
        {
          feature: { "leave-backlog": ["governing-doc"], "enter-done": ["proof"] },
          chore: { "leave-preparing": ["plan"] },
        },
        VOCAB,
      ),
    ).toEqual({});
  });

  it("keys errors by profile and boundary so the UI can place them", () => {
    const errs = validateProfiles({ feature: { "enter-done": ["proof:audio", "impact"] } }, VOCAB);
    expect(Object.keys(errs)).toEqual(["feature.enter-done"]);
    expect(errs["feature.enter-done"]).toHaveLength(2);
  });

  it("rejects an unknown boundary", () => {
    const errs = validateProfiles({ feature: { "leave-review": ["plan"] } }, VOCAB);
    expect(errs["feature.leave-review"][0]).toMatch(/unknown boundary/);
  });

  it("treats an empty requirement list as fine", () => {
    expect(validateProfiles({ custom: { "leave-backlog": [] } }, VOCAB)).toEqual({});
  });
});

describe("splitRequirements", () => {
  it("splits, trims and drops blanks", () => {
    expect(splitRequirements(" plan , , checklist ")).toEqual(["plan", "checklist"]);
  });
  it("an empty field is no requirements", () => {
    expect(splitRequirements("   ")).toEqual([]);
  });
});

const BOARD = {
  areas: [
    { id: "core", name: "Core", defaultProfile: "fix" },
    { id: "gui", name: "GUI" },
  ],
  defaultProfile: "feature",
  profiles: { feature: { "enter-done": ["proof"] }, fix: { "enter-done": ["proof"] } },
} as unknown as BoardConfig;

describe("applyProfileEdit", () => {
  it("does not mutate the board it is given", () => {
    const before = JSON.stringify(BOARD);
    applyProfileEdit(BOARD, "feature", "enter-done", ["proof:visual"]);
    expect(JSON.stringify(BOARD)).toBe(before);
  });

  it("removes the boundary when the list is emptied", () => {
    const next = applyProfileEdit(BOARD, "feature", "enter-done", []) as unknown as {
      profiles: Record<string, Record<string, string[]>>;
    };
    // Not stored as [] — a vacuous list would make `{}` and `{ b: [] }` differ
    // on disk while behaving identically.
    expect(next.profiles.feature).toEqual({});
  });

  it("creates a profile that did not exist", () => {
    const next = applyProfileEdit(BOARD, "spike", "enter-done", ["research"]) as unknown as {
      profiles: Record<string, Record<string, string[]>>;
    };
    expect(next.profiles.spike).toEqual({ "enter-done": ["research"] });
  });
});

describe("ticketsAffected", () => {
  const items = [
    { profile: "feature" },                 // explicit
    { area: "core" },                       // area default -> fix
    { area: "gui" },                        // board default -> feature
    { profile: "spike", area: "core" },     // explicit wins over area
  ];

  it("resolves explicit, then area default, then board default", () => {
    expect(ticketsAffected(items, BOARD, ["feature"])).toBe(2);
    expect(ticketsAffected(items, BOARD, ["fix"])).toBe(1);
    expect(ticketsAffected(items, BOARD, ["spike"])).toBe(1);
  });

  it("is zero when nothing changed", () => {
    expect(ticketsAffected(items, BOARD, [])).toBe(0);
  });
});

describe("changedProfiles", () => {
  it("names only what differs", () => {
    const next = applyProfileEdit(BOARD, "feature", "enter-done", ["proof:visual"]);
    expect(changedProfiles(BOARD, next)).toEqual(["feature"]);
  });
  it("is empty for an untouched board", () => {
    expect(changedProfiles(BOARD, structuredClone(BOARD))).toEqual([]);
  });
});
