/**
 * Quick capture and deliberate promotion (CORE-117, FRD-032).
 *
 * The whole point of a capture is that it is *cheap to record and impossible to
 * accidentally deliver*, so these tests are written around the two halves of
 * that: what a capture owes (nothing but a title and an observation) and what it
 * cannot do (leave Backlog, be taken, be handed to a worker) until somebody
 * records a decision about it.
 *
 * A separate file rather than additions to `store.test.ts` / `docs.test.ts`,
 * deliberately: those are being edited concurrently by CORE-128.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { removeTreeWithRetry } from "./io.js";
import { KanmerStore } from "./store.js";
import { parseItem, serialiseItem } from "./frontmatter.js";
import { resolveProfiles } from "./board.js";
import { deriveMembers } from "./group-members.js";
import { CAPTURE_DISPOSITIONS, isCaptureItem } from "./profiles.js";
import type { BoardConfig, Item } from "./types.js";

let root: string;
let store: KanmerStore;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-capture-"));
  store = new KanmerStore(root, { actor: "test-actor" });
  await store.init();
});

afterEach(async () => {
  await removeTreeWithRetry(root);
});

const OBSERVATION = "The board flickers when a lease is renewed mid-drag.";

async function capture(overrides: Record<string, unknown> = {}): Promise<Item> {
  return store.createItem({
    type: "ticket",
    title: "Board flickers on lease renewal",
    profile: "capture",
    body: OBSERVATION,
    ...overrides,
  } as never);
}

/**
 * A board written before FRD-032 existed: its own `profiles:` block, exactly
 * the four the live board carries, and no `capture`.
 */
function legacyBoard(): BoardConfig {
  return {
    areas: [{ id: "core", name: "Core", prefix: "CORE" }],
    profiles: {
      feature: {
        "leave-backlog": ["governing-doc"],
        "leave-preparing": ["research", "files", "plan", "checklist"],
        "enter-review": ["post-implementation-report"],
        "enter-done": ["proof"],
      },
      fix: { "leave-preparing": ["files", "plan"], "enter-done": ["proof"] },
      chore: { "leave-preparing": ["plan"], "enter-done": ["proof"] },
      spike: { "enter-done": ["research"] },
      custom: {},
    },
    defaultProfile: "fix",
  } as BoardConfig;
}

describe("the capture profile reaches boards that predate it", () => {
  it("injects `capture` into a board carrying its own profiles block", () => {
    const resolved = resolveProfiles(legacyBoard());
    expect(Object.keys(resolved)).toContain("capture");
    expect(resolved.capture).toEqual({});
  });

  it("injection is exactly equivalent to the board declaring `capture: {}` itself", () => {
    // The real assertion here is the *absence* of collateral: adding a profile
    // must not perturb any other profile's boundaries, because `collapsesPipeline`
    // counts gated boundaries and ADR-0011's limit exists to protect that count.
    const declared = legacyBoard();
    declared.profiles = { ...declared.profiles, capture: {} };
    expect(resolveProfiles(legacyBoard())).toEqual(resolveProfiles(declared));
  });

  it("leaves a board that defines its own `capture` alone", () => {
    const board = legacyBoard();
    board.profiles = { ...board.profiles, capture: { "enter-done": ["proof"] } };
    expect(resolveProfiles(board).capture).toEqual({ "enter-done": ["proof", "questions-resolved"] });
  });

  it("gives `capture` no `questions-resolved`, because it declares no boundary to hang it on", () => {
    expect(resolveProfiles(legacyBoard()).capture).toEqual({});
  });
});

describe("FRD-032 acceptance 1 — record and find a capture, with no document debt", () => {
  it("creates one from a title and an observation alone", async () => {
    const item = await capture();
    expect(item.profile).toBe("capture");
    expect(isCaptureItem(item)).toBe(true);
    expect(item.body).toBe(OBSERVATION);
    // The area is "known" but not demanded: an observation you cannot place yet
    // is still worth recording.
    expect(item.docs_todo).toBeUndefined();
    expect(item.refs).toBeUndefined();
    expect(item.status).toBe("backlog");
  });

  it("owes no document at any boundary", async () => {
    const item = await capture();
    const gates = await store.getDocGates(item.id);
    expect(gates?.profile).toBe("capture");
    expect(gates?.boundaries).toEqual([]);
    expect(gates?.blockedBy).toEqual({});
  });

  it("is found by the words of its observation, because the observation is the body", async () => {
    const item = await capture();
    const hits = await store.searchItems("flickers");
    expect(hits.map((i) => i.id)).toContain(item.id);
  });

  it("is filterable by profile, in both directions", async () => {
    const cap = await capture();
    const work = await store.createItem({ type: "ticket", title: "A real fix", profile: "fix" });
    expect((await store.listItems({ profile: "capture" })).map((i) => i.id)).toEqual([cap.id]);
    expect((await store.listItems({ profile: "fix" })).map((i) => i.id)).toEqual([work.id]);
    // Unfiltered, a capture is still on the board: it is hidden from selection,
    // not from sight.
    expect((await store.listItems({})).map((i) => i.id).sort()).toEqual([cap.id, work.id].sort());
    expect((await store.searchItems("a", { profile: "capture" })).map((i) => i.id)).toEqual([cap.id]);
  });

  it("stamps who observed it, and keeps the created timestamp it was given", async () => {
    const item = await capture();
    expect(item.capture_actor).toBe("test-actor");
    expect(item.created).toBe(item.updated);
    const explicit = await capture({ capture_actor: "alex" });
    expect(explicit.capture_actor).toBe("alex");
  });
});

describe("FRD-032 edge cases — what is optional and what is not", () => {
  it("accepts absent and empty evidence", async () => {
    expect((await capture()).capture_evidence).toBeUndefined();
    expect((await capture({ capture_evidence: [] })).capture_evidence).toBeUndefined();
  });

  it("keeps evidence when it is given", async () => {
    const item = await capture({ capture_evidence: ["docs/shot.png", "https://example.test/x"] });
    expect(item.capture_evidence).toEqual(["docs/shot.png", "https://example.test/x"]);
  });

  it("refuses a capture with no title", async () => {
    await expect(capture({ title: "   " })).rejects.toThrow(/CAPTURE_OBSERVATION_REQUIRED.*a title/s);
  });

  it("refuses a capture with no observation", async () => {
    await expect(capture({ body: "" })).rejects.toThrow(/CAPTURE_OBSERVATION_REQUIRED.*observation/s);
    await expect(capture({ body: undefined })).rejects.toThrow(/CAPTURE_OBSERVATION_REQUIRED/);
  });

  it("refuses emptying a capture's observation after the fact", async () => {
    const item = await capture();
    await expect(store.updateItem(item.id, { body: "  " })).rejects.toThrow(
      /CAPTURE_OBSERVATION_REQUIRED/,
    );
    await expect(store.updateItem(item.id, { title: "" })).rejects.toThrow(
      /CAPTURE_OBSERVATION_REQUIRED/,
    );
  });

  it("refuses turning an empty ticket into a capture", async () => {
    const empty = await store.createItem({ type: "ticket", title: "Nothing said", profile: "fix" });
    await expect(store.updateItem(empty.id, { profile: "capture" })).rejects.toThrow(
      /CAPTURE_OBSERVATION_REQUIRED/,
    );
  });

  it("sits in Backlog indefinitely without ever becoming an expired claim", async () => {
    const item = await capture();
    // It cannot be taken at all, so `taken_at` — the field every lease and
    // claim classifier keys on — is never written.
    await expect(store.takeTicket(item.id, { branch: "x" })).rejects.toThrow(/CAPTURE_NOT_PROMOTED/);
    const after = await store.getItem(item.id);
    expect(after?.taken_at).toBeUndefined();
    expect(after?.claim_expires_at).toBeUndefined();
    expect(after?.lease_id).toBeUndefined();
  });
});

describe("FRD-032 acceptance 2 — a capture is never selected for delivery", () => {
  it("refuses every move out of Backlog", async () => {
    const item = await capture();
    for (const stage of ["preparing", "implementing", "review", "verifying", "done"]) {
      await expect(store.moveItem(item.id, { status: stage })).rejects.toThrow(
        /CAPTURE_NOT_PROMOTED/,
      );
    }
    expect((await store.getItem(item.id))?.status).toBe("backlog");
  });

  it("refuses a stage change made through update_item too", async () => {
    const item = await capture();
    await expect(store.updateItem(item.id, { status: "implementing" })).rejects.toThrow(
      /CAPTURE_NOT_PROMOTED/,
    );
  });

  it("still allows an ordinary ticket through the same gate", async () => {
    const work = await store.createItem({
      type: "ticket",
      title: "A real fix",
      profile: "fix",
      body: "x",
    });
    const moved = await store.moveItem(work.id, { status: "preparing" });
    expect(moved.status).toBe("preparing");
  });

  it("does not count toward a group's readiness, but stays visible in it", () => {
    const group = { id: "HZN-001", kind: "horizon", title: "H", body: "" } as never;
    const items = [
      { id: "A-1", title: "cap", status: "backlog", archived: false, groups: ["HZN-001"], profile: "capture" },
      { id: "A-2", title: "work", status: "done", archived: false, groups: ["HZN-001"], profile: "fix" },
    ];
    const derived = deriveMembers(group, items, "done");
    expect(derived.members.map((m) => m.id)).toEqual(["A-1", "A-2"]);
    expect(derived.total).toBe(1);
    expect(derived.complete).toBe(1);
    expect(derived.progress.backlog).toBe(0);
  });
});

describe("FRD-032 acceptance 3 — every promotion records its disposition", () => {
  it("covers exactly the six outcomes the FRD names", () => {
    expect([...CAPTURE_DISPOSITIONS]).toEqual([
      "duplicate",
      "already-fixed",
      "batch",
      "promoted",
      "retained",
      "not-required",
    ]);
  });

  it("duplicate: links the ticket it merges into and archives", async () => {
    const target = await store.createItem({ type: "ticket", title: "The original", profile: "fix" });
    const item = await capture();
    const promoted = await store.updateItem(item.id, {
      capture_disposition: "duplicate",
      capture_result: target.id,
    });
    expect(promoted.capture_disposition).toBe("duplicate");
    expect(promoted.capture_result).toBe(target.id);
    expect(promoted.links).toContain(target.id);
    expect(promoted.archived).toBe(true);
    expect(promoted.capture_decided_by).toBe("test-actor");
    expect(promoted.capture_decided_at).toBeTruthy();
  });

  it("duplicate: refuses without a result, and refuses a result that does not exist", async () => {
    const item = await capture();
    await expect(store.updateItem(item.id, { capture_disposition: "duplicate" })).rejects.toThrow(
      /CAPTURE_RESULT_REQUIRED/,
    );
    await expect(
      store.updateItem(item.id, { capture_disposition: "duplicate", capture_result: "NOPE-9" }),
    ).rejects.toThrow(/CAPTURE_RESULT_REQUIRED/);
  });

  it("already-fixed and not-required archive with the reason recorded", async () => {
    for (const disposition of ["already-fixed", "not-required"] as const) {
      const item = await capture();
      const done = await store.updateItem(item.id, { capture_disposition: disposition });
      expect(done.capture_disposition).toBe(disposition);
      expect(done.archived).toBe(true);
      expect(done.profile).toBe("capture");
    }
  });

  it("batch: records the batch it joins and the profile it now carries", async () => {
    const item = await capture();
    const promoted = await store.updateItem(item.id, {
      capture_disposition: "batch",
      capture_result: "small-fixes-2026-08",
      profile: "chore",
    });
    expect(promoted.capture_result).toBe("small-fixes-2026-08");
    expect(promoted.profile).toBe("chore");
    expect(promoted.archived).toBe(false);
  });

  it("batch: refuses without a batch id, and without a profile", async () => {
    const a = await capture();
    await expect(
      store.updateItem(a.id, { capture_disposition: "batch", profile: "chore" }),
    ).rejects.toThrow(/CAPTURE_RESULT_REQUIRED/);
    const b = await capture();
    await expect(
      store.updateItem(b.id, { capture_disposition: "batch", capture_result: "batch-1" }),
    ).rejects.toThrow(/CAPTURE_PROMOTION_NEEDS_PROFILE/);
  });

  it("promoted: refuses unless the same decision names the profile it becomes", async () => {
    const item = await capture();
    await expect(store.updateItem(item.id, { capture_disposition: "promoted" })).rejects.toThrow(
      /CAPTURE_PROMOTION_NEEDS_PROFILE/,
    );
    await expect(
      store.updateItem(item.id, { capture_disposition: "promoted", profile: "capture" }),
    ).rejects.toThrow(/CAPTURE_PROMOTION_NEEDS_PROFILE/);
  });

  it("retained: keeps it a capture, and is the only decision that may be revisited", async () => {
    const item = await capture();
    const kept = await store.updateItem(item.id, { capture_disposition: "retained" });
    expect(kept.profile).toBe("capture");
    expect(kept.archived).toBe(false);
    const later = await store.updateItem(item.id, {
      capture_disposition: "promoted",
      profile: "fix",
    });
    expect(later.capture_disposition).toBe("promoted");
    expect(later.profile).toBe("fix");
  });

  it("retained: cannot smuggle a profile change in with it", async () => {
    const item = await capture();
    await expect(
      store.updateItem(item.id, { capture_disposition: "retained", profile: "fix" }),
    ).rejects.toThrow(/CAPTURE_DISPOSITION_INVALID/);
  });

  it("refuses a second decision once one is recorded", async () => {
    const item = await capture();
    await store.updateItem(item.id, { capture_disposition: "already-fixed" });
    await expect(store.updateItem(item.id, { capture_disposition: "not-required" })).rejects.toThrow(
      /CAPTURE_ALREADY_DISPOSED/,
    );
  });

  it("refuses an unknown disposition, a disposition on a non-capture, and a bare result", async () => {
    const item = await capture();
    await expect(store.updateItem(item.id, { capture_disposition: "maybe" })).rejects.toThrow(
      /CAPTURE_DISPOSITION_INVALID/,
    );
    await expect(store.updateItem(item.id, { capture_result: "X-1" })).rejects.toThrow(
      /CAPTURE_DISPOSITION_INVALID/,
    );
    const work = await store.createItem({ type: "ticket", title: "Work", profile: "fix" });
    await expect(store.updateItem(work.id, { capture_disposition: "retained" })).rejects.toThrow(
      /CAPTURE_DISPOSITION_INVALID/,
    );
  });
});

describe("FRD-032 acceptance 4 — the promoted profile applies from the decision onward", () => {
  it("owes nothing before the decision and the full pipeline after it", async () => {
    const item = await capture();
    expect((await store.getDocGates(item.id))?.boundaries).toEqual([]);

    const promoted = await store.updateItem(item.id, {
      capture_disposition: "promoted",
      profile: "feature",
    });
    expect(promoted.profile).toBe("feature");
    expect(promoted.capture_disposition).toBe("promoted");

    const gates = await store.getDocGates(item.id);
    expect(gates?.profile).toBe("feature");
    expect(gates?.boundaries.map((b) => b.boundary)).toContain("leave-backlog");
    // The refusal is now an ordinary unmet gate, not the capture bar — which is
    // what "normal gate requirements from that decision onward" has to mean.
    await expect(store.moveItem(item.id, { status: "preparing" })).rejects.toThrow(
      /leaving Backlog requires governing-doc/,
    );
  });

  it("demands nothing retroactively for the time it was a capture", async () => {
    const item = await capture();
    const promoted = await store.updateItem(item.id, {
      capture_disposition: "promoted",
      profile: "fix",
      body: `${OBSERVATION}\n\nNow sized.`,
    });
    // `fix` gates start at leave-preparing, so a promoted capture in Backlog is
    // immediately movable: no document is owed for its time as an observation.
    expect(promoted.profile).toBe("fix");
    const moved = await store.moveItem(item.id, { status: "preparing" });
    expect(moved.status).toBe("preparing");
    // The audit trail survives the promotion.
    expect(moved.capture_disposition).toBe("promoted");
    expect(moved.capture_actor).toBe("test-actor");
  });

  it("can be taken once it is promoted", async () => {
    const item = await capture();
    // `spike` because the take moves the ticket to Implementing, and this test
    // is about the capture bar lifting rather than about which documents the
    // chosen profile then asks for — an observation that turns out to need
    // investigation is a realistic promotion anyway.
    await store.updateItem(item.id, { capture_disposition: "promoted", profile: "spike" });
    const taken = await store.takeTicket(item.id, { branch: "cap-1", stage: "implementing" });
    expect(taken.taken_at).toBeTruthy();
    expect(taken.status).toBe("implementing");
  });
});

describe("capture frontmatter is additive and stable", () => {
  it("round-trips through parse/serialise in canonical key order", async () => {
    const item = await capture({ capture_evidence: ["a.png"] });
    const promoted = await store.updateItem(item.id, {
      capture_disposition: "retained",
    });
    const text = serialiseItem(promoted);
    const keys = text
      .split("\n---")[0]
      .split("\n")
      .map((l) => l.match(/^([a-z_]+):/i)?.[1])
      .filter((k): k is string => Boolean(k));
    const at = (k: string) => keys.indexOf(k);
    expect(at("capture_evidence")).toBeGreaterThan(at("prs") === -1 ? at("links") : at("prs"));
    expect(at("capture_evidence")).toBeLessThan(at("archived"));
    expect(at("capture_actor")).toBeGreaterThan(at("capture_evidence"));
    expect(at("capture_decided_by")).toBeLessThan(at("archived"));
    expect(parseItem(text).capture_disposition).toBe("retained");
  });

  it("keys a reader that predates them would not know are preserved, not dropped", async () => {
    // The mirror image of the compatibility claim: this store keeps unknown
    // keys, which is the same passthrough that lets an older Kanmer keep ours.
    const item = await capture();
    const file = path.join(root, ".kanmer", "areas", "_none", item.id, `${item.id}.md`);
    const raw = await fs.readFile(file, "utf8");
    await fs.writeFile(file, raw.replace("\n---\n", "\nsome_future_field: 1\n---\n"), "utf8");
    const updated = await store.updateItem(item.id, { labels: ["ux"] });
    expect((updated as unknown as Record<string, unknown>).some_future_field).toBe(1);
    expect(await fs.readFile(file, "utf8")).toContain("some_future_field: 1");
  });
});
