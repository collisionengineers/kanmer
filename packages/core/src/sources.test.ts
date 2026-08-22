import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { defaultBoardConfig, readBoard, writeBoard } from "./board.js";
import { resolveSources, sourceKey, validateSourceDeclarations } from "./sources.js";
import { resolvePaths } from "./paths.js";

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-sources-"));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("project-declared source schema and resolver", () => {
  it("round-trips declarations through board.yml", async () => {
    const board = defaultBoardConfig();
    board.sources = [
      { kind: "mcp", id: "microsoft-learn", appliesTo: { labels: ["azure"] }, priority: 4 },
      { kind: "llms-txt", id: "https://docs.example.test/llms.txt" },
    ];
    const paths = resolvePaths(root);
    await writeBoard(paths, board);
    const loaded = await readBoard(paths);
    expect(loaded.sources).toEqual(board.sources);
  });

  it("rejects unsafe manifests, duplicates, and unknown selector fields", () => {
    expect(() => validateSourceDeclarations([{ kind: "llms-txt", id: "http://docs.example.test/llms.txt" }])).toThrow(/HTTPS/);
    expect(() => validateSourceDeclarations([{ kind: "llms-txt", id: "https://docs.example.test/llms.txt?token=secret" }])).toThrow(/query/);
    expect(() => validateSourceDeclarations([
      { kind: "mcp", id: "same" },
      { kind: "mcp", id: "same" },
    ])).toThrow(/duplicate source declaration/);
    expect(() => validateSourceDeclarations([
      { kind: "llms-txt", id: "https://DOCS.example.test:443/llms.txt" },
      { kind: "llms-txt", id: "https://docs.example.test/llms.txt" },
    ])).toThrow(/duplicate source declaration/);
    expect(() => validateSourceDeclarations([
      { kind: "plugin", id: "p", appliesTo: { areas: ["api"], extra: ["bad"] } as never },
    ])).toThrow(/Unrecognized key/);
  });

  it("matches selectors and keeps priority/order deterministic", () => {
    const sources = [
      { kind: "mcp" as const, id: "global" },
      { kind: "plugin" as const, id: "api-plugin", appliesTo: { areas: ["api"] }, priority: 1 },
      { kind: "llms-txt" as const, id: "https://docs.example.test/llms.txt", appliesTo: { labels: ["azure"] }, priority: 1 },
    ];
    const resolved = resolveSources(sources, { area: "api", labels: ["azure"], connectedMcp: ["global"], installedPlugins: ["api-plugin"] });
    expect(resolved.map(sourceKey)).toEqual([
      "plugin:api-plugin",
      "llms-txt:https://docs.example.test/llms.txt",
      "mcp:global",
    ]);
    expect(resolved.every((source) => source.availability === "available")).toBe(true);
  });

  it("reports unavailable and unknown host capabilities without enabling them", () => {
    const sources = [
      { kind: "mcp" as const, id: "not-connected" },
      { kind: "plugin" as const, id: "not-installed" },
    ];
    expect(resolveSources(sources, { connectedMcp: [], installedPlugins: [] }).map((s) => s.availability)).toEqual([
      "unavailable",
      "unavailable",
    ]);
    expect(resolveSources(sources).map((s) => s.availability)).toEqual(["unknown", "unknown"]);
  });

  it("removes a declaration from effective resolution immediately", () => {
    const before = [{ kind: "llms-txt" as const, id: "https://docs.example.test/llms.txt" }];
    expect(resolveSources(before, { area: "api" })).toHaveLength(1);
    expect(resolveSources([], { area: "api" })).toHaveLength(0);
  });

  it("treats explicitly empty selectors as global", () => {
    const source = { kind: "mcp" as const, id: "global", appliesTo: { areas: [], labels: [] } };
    expect(resolveSources([source], { area: "api", labels: ["azure"] })).toHaveLength(1);
    expect(resolveSources([source])).toHaveLength(1);
  });
});
