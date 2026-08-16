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

  it("the default board ships the four profiles and a sane default", () => {
    const board = defaultBoardConfig();
    expect(Object.keys(board.profiles ?? {}).sort()).toEqual([
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
