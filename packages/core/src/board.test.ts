import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { defaultBoardConfig, lastStageId, resolveProfiles, writeBoard } from "./board.js";
import { QUESTIONS_RESOLVED } from "./profiles.js";
import { resolvePaths, type KanmerPaths } from "./paths.js";

let root: string;
let paths: KanmerPaths;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-board-"));
  paths = resolvePaths(root);
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("board prefix uniqueness", () => {
  it("rejects two idPrefixes entries sharing a value", async () => {
    const board = defaultBoardConfig();
    board.idPrefixes = { ticket: "FOO", plan: "FOO", research: "RES" };
    board.areas = [];
    await expect(writeBoard(paths, board)).rejects.toThrow(
      /idPrefixes\.plan.*"FOO".*idPrefixes\.ticket/s,
    );
  });

  it("rejects an area prefix that collides with a type prefix", async () => {
    const board = defaultBoardConfig();
    board.areas = [{ id: "tickets", name: "Tickets", prefix: "TICK" }];
    await expect(writeBoard(paths, board)).rejects.toThrow(/already uses/);
  });

  it("rejects two areas that derive the same prefix", async () => {
    const board = defaultBoardConfig();
    board.areas = [
      { id: "api", name: "API" },
      { id: "api-x", name: "API extras", prefix: "API" },
    ];
    await expect(writeBoard(paths, board)).rejects.toThrow(/already uses/);
  });

  it("accepts the default board", async () => {
    await expect(writeBoard(paths, defaultBoardConfig())).resolves.toBeUndefined();
    const yaml = await fs.readFile(paths.boardFile, "utf8");
    // Format 3 writes no stage or priority dimension at all (ADR-0002/0006).
    expect(yaml).not.toContain("statuses:");
    expect(yaml).not.toContain("priorities:");
    expect(yaml).toContain("profiles:");
    expect(yaml).toContain("proofTypes:");
    expect(yaml).toContain("groupKinds:");
  });

  it("lastStageId is a constant, independent of the board", () => {
    expect(lastStageId(defaultBoardConfig())).toBe("done");
    // The whole point of ADR-0002: no board shape can change the answer.
    expect(lastStageId({ ...defaultBoardConfig(), statuses: [] })).toBe("done");
    expect(lastStageId()).toBe("done");
  });

  it("the default board ships the five profiles and a sane default", () => {
    const board = defaultBoardConfig();
    expect(Object.keys(board.profiles ?? {}).sort()).toEqual([
      "capture",
      "chore",
      "custom",
      "feature",
      "fix",
      "spike",
    ]);
    expect(board.defaultProfile).toBe("fix");
    expect(board.groupKinds?.map((k) => k.id)).toEqual(["epic", "horizon"]);
  });
});

describe("resolveProfiles injects questions-resolved (ADR-0011)", () => {
  it("adds it to a board that carries its own profiles table", () => {
    // The case the shipped-defaults edit misses entirely: every board written by
    // setup or migration has its own `profiles:` block, so `board.profiles ??
    // DEFAULT_PROFILES` never falls through again.
    const board = {
      profiles: {
        feature: { "leave-preparing": ["plan"], "enter-done": ["proof"] },
      },
    } as never;
    expect(resolveProfiles(board).feature).toEqual({
      "leave-preparing": ["plan", QUESTIONS_RESOLVED],
      "enter-done": ["proof", QUESTIONS_RESOLVED],
    });
  });

  it("leaves boundaries a profile does not declare undeclared", () => {
    const board = { profiles: { spike: { "enter-done": ["research"] } } } as never;
    expect(Object.keys(resolveProfiles(board).spike)).toEqual(["enter-done"]);
  });

  it("keeps a vacuous boundary vacuous", () => {
    // `custom: {}` and `custom: { "leave-backlog": [] }` must stay equivalent,
    // and historical backfill must keep being nagged about nothing.
    const board = { profiles: { custom: { "leave-backlog": [] } } } as never;
    expect(resolveProfiles(board).custom["leave-backlog"]).toEqual([]);
  });

  it("does not double up when the requirement is already declared", () => {
    const board = {
      profiles: { fix: { "enter-done": ["proof", QUESTIONS_RESOLVED] } },
    } as never;
    expect(resolveProfiles(board).fix["enter-done"]).toEqual(["proof", QUESTIONS_RESOLVED]);
  });
});

describe("resolveProfiles never gates leaving Backlog on questions", () => {
  it("skips leave-backlog", () => {
    // Questions are raised during research, which happens after Backlog.
    // Gating entry to the stage where questions get worked would trap the
    // ticket outside it.
    const board = {
      profiles: { feature: { "leave-backlog": ["governing-doc"], "enter-done": ["proof"] } },
    } as never;
    const p = resolveProfiles(board).feature;
    expect(p["leave-backlog"]).toEqual(["governing-doc"]);
    expect(p["enter-done"]).toEqual(["proof", QUESTIONS_RESOLVED]);
  });

  it("adds no boundary a profile did not already declare", () => {
    // Adding one would change which multi-stage moves are legal:
    // collapsesPipeline counts gated boundaries, so a spike gaining a gated
    // leave-preparing and enter-review would turn its Backlog → Done jump from
    // one gated boundary into three and refuse it.
    const board = { profiles: { spike: { "enter-done": ["research"] } } } as never;
    expect(Object.keys(resolveProfiles(board).spike)).toEqual(["enter-done"]);
  });
});

describe("resolveProfiles gives fix an enter-review (ADR-0014)", () => {
  it("adds it to a board whose profiles table predates the decision", () => {
    // The SKILL-012 lesson applied a second time: editing DEFAULT_PROFILES
    // alone reaches new boards only. This is a board written before ADR-0014.
    const board = {
      profiles: { fix: { "leave-preparing": ["files", "plan"], "enter-done": ["proof"] } },
    } as never;
    expect(resolveProfiles(board).fix["enter-review"]).toEqual([
      "post-implementation-report",
      QUESTIONS_RESOLVED,
    ]);
  });

  it("orders the two injections so the new boundary also checks questions", () => {
    // If the fix injection ran *after* the questions pass, `fix` would gain a
    // review gate that does not check open questions — the exact gap ADR-0011
    // records and this change is partly here to close.
    const board = { profiles: { fix: { "enter-done": ["proof"] } } } as never;
    expect(resolveProfiles(board).fix["enter-review"]).toContain(QUESTIONS_RESOLVED);
  });

  it("leaves an operator's own enter-review alone", () => {
    const board = {
      profiles: { fix: { "enter-review": ["plan"], "enter-done": ["proof"] } },
    } as never;
    expect(resolveProfiles(board).fix["enter-review"]).toEqual(["plan", QUESTIONS_RESOLVED]);
  });

  it("keeps an explicitly vacuous enter-review vacuous", () => {
    // Same rule the questions pass follows: an empty list is a deliberate
    // "this boundary is free", not an absent one.
    const board = { profiles: { fix: { "enter-review": [], "enter-done": ["proof"] } } } as never;
    expect(resolveProfiles(board).fix["enter-review"]).toEqual([]);
  });

  it("touches no other profile", () => {
    // The operator's decision was `fix` only: chore and spike keep their
    // one-jump to Done, and feature already had the boundary.
    const board = {
      profiles: {
        chore: { "enter-done": ["proof"] },
        spike: { "enter-done": ["research"] },
      },
    } as never;
    const resolved = resolveProfiles(board);
    expect(Object.keys(resolved.chore)).toEqual(["enter-done"]);
    expect(Object.keys(resolved.spike)).toEqual(["enter-done"]);
  });

  it("does not invent the profile back on a board that removed fix", () => {
    const board = { profiles: { chore: { "enter-done": ["proof"] } } } as never;
    expect(resolveProfiles(board).fix).toBeUndefined();
  });
});
