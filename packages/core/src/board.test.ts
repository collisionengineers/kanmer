import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { defaultBoardConfig, lastStageId, writeBoard } from "./board.js";
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
