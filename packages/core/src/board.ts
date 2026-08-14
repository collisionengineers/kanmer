import YAML from "yaml";
import {
  BoardConfigSchema,
  type BoardColumn,
  type BoardConfig,
  type BoardSource,
} from "./types.js";
import { pathExists, readText, writeFileAtomic } from "./io.js";
import type { KanmerPaths } from "./paths.js";

/**
 * The board config written into a fresh project. `statuses` is the single
 * workflow dimension — the stages a ticket moves through, left to right.
 */
export function defaultBoardConfig(): BoardConfig {
  return {
    statuses: [
      { id: "backlog", name: "Backlog" },
      { id: "researching", name: "Researching" },
      { id: "planning", name: "Planning" },
      { id: "implementing", name: "Implementing" },
      { id: "review", name: "Review" },
      { id: "verifying", name: "Verifying" },
      { id: "done", name: "Done" },
    ],
    // PR Review is a default area on every new board: agents file PR feedback
    // tickets there without having to invent a home for them first.
    areas: [{ id: "pr-review", name: "PR Review", prefix: "PR", color: "#b48cff" }],
    priorities: [
      { id: "low", name: "Low", color: "#6b7280" },
      { id: "medium", name: "Medium", color: "#5b8cff" },
      { id: "high", name: "High", color: "#ffcf7a" },
      { id: "urgent", name: "Urgent", color: "#ff6b6b" },
    ],
    idPrefixes: { ticket: "TICK", plan: "PLAN", research: "RES" },
  };
}

/**
 * The board's final stage — the proof-gated one. Undefined only on a board
 * with no stages. "Last stage" is re-derived in several places (the proof
 * gate, the overdue filter, the create gate); this is the single definition
 * they share.
 */
export function lastStageId(board: BoardConfig): string | undefined {
  return board.statuses[board.statuses.length - 1]?.id;
}

/**
 * The id prefix tickets born in this area get: the explicit `prefix`, or one
 * derived from the area id (uppercased, non-alphanumerics dropped, max 6).
 */
export function areaPrefix(area: BoardColumn): string {
  if (area.prefix) return area.prefix;
  const cleaned = area.id.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length >= 2 ? cleaned.slice(0, 6) : `${cleaned}XX`.slice(0, 2);
}

/**
 * Every id prefix on the board must be unique — *within* `idPrefixes` (the
 * type prefixes `TICK`/`PLAN`/`RES` that no-area tickets and legacy items
 * use) as well as across the area prefixes (explicit or derived). Ids are
 * allocated per prefix, so two owners sharing one would collide on the same
 * id — and, during migration, on the same file path.
 */
function assertUniquePrefixes(board: BoardConfig): void {
  const seen = new Map<string, string>();
  for (const [type, prefix] of Object.entries(board.idPrefixes)) {
    const owner = `idPrefixes.${type}`;
    const holder = seen.get(prefix);
    if (holder) {
      throw new Error(
        `${owner} would use id prefix "${prefix}", which ${holder} already uses. ` +
          `Every prefix must be unique — ids are allocated per prefix, so two owners ` +
          `sharing one would collide on the same id path.`,
      );
    }
    seen.set(prefix, owner);
  }
  for (const area of board.areas) {
    const prefix = areaPrefix(area);
    const holder = seen.get(prefix);
    if (holder) {
      throw new Error(
        `Area "${area.id}" would use id prefix "${prefix}", which ${holder} already uses. ` +
          `Set a distinct "prefix" on the area.`,
      );
    }
    seen.set(prefix, `area "${area.id}"`);
  }
}

export async function readBoard(paths: KanmerPaths): Promise<BoardConfig> {
  return (await readBoardWithSource(paths)).board;
}

/**
 * Read the board plus where it came from, so callers can tell a real
 * board.yml from the synthesized default (an agent seeing `default` knows
 * the project hasn't actually configured anything yet).
 */
export async function readBoardWithSource(
  paths: KanmerPaths,
): Promise<{ board: BoardConfig; source: BoardSource }> {
  if (!(await pathExists(paths.boardFile))) {
    return { board: defaultBoardConfig(), source: "default" };
  }
  const raw = await readText(paths.boardFile);
  const data = YAML.parse(raw);
  return { board: BoardConfigSchema.parse(data), source: "file" };
}

export async function writeBoard(paths: KanmerPaths, board: BoardConfig): Promise<void> {
  const validated = BoardConfigSchema.parse(board);
  assertUniquePrefixes(validated);
  await writeFileAtomic(paths.boardFile, YAML.stringify(validated));
}
