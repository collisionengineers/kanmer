import YAML from "yaml";
import { BoardConfigSchema, type BoardConfig } from "./types.js";
import { pathExists, readText, writeFileAtomic } from "./io.js";
import type { KanmerPaths } from "./paths.js";

/**
 * The board config written into a fresh project. `statuses` is the single
 * workflow dimension — the stages a ticket moves through, left to right.
 */
export function defaultBoardConfig(): BoardConfig {
  return {
    statuses: [
      { id: "todo", name: "Todo" },
      { id: "planning", name: "Planning" },
      { id: "implementing", name: "Implementing" },
      { id: "review", name: "Review" },
      { id: "verifying", name: "Verifying" },
      { id: "done", name: "Done" },
    ],
    areas: [],
    priorities: [
      { id: "low", name: "Low", color: "#6b7280" },
      { id: "medium", name: "Medium", color: "#5b8cff" },
      { id: "high", name: "High", color: "#ffcf7a" },
      { id: "urgent", name: "Urgent", color: "#ff6b6b" },
    ],
    idPrefixes: { ticket: "TICK", plan: "PLAN", research: "RES" },
  };
}

export async function readBoard(paths: KanmerPaths): Promise<BoardConfig> {
  if (!(await pathExists(paths.boardFile))) {
    return defaultBoardConfig();
  }
  const raw = await readText(paths.boardFile);
  const data = YAML.parse(raw);
  return BoardConfigSchema.parse(data);
}

export async function writeBoard(paths: KanmerPaths, board: BoardConfig): Promise<void> {
  const validated = BoardConfigSchema.parse(board);
  await writeFileAtomic(paths.boardFile, YAML.stringify(validated));
}
