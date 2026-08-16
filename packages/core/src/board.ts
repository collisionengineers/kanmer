import YAML from "yaml";
import {
  BoardConfigSchema,
  type BoardColumn,
  type BoardConfig,
  type BoardSource,
} from "./types.js";
import { pathExists, readText, writeFileAtomic } from "./io.js";
import type { KanmerPaths } from "./paths.js";
import { LAST_STAGE, STAGES, type Stage } from "./stages.js";
import {
  DEFAULT_PROFILES,
  DEFAULT_PROFILE_ID,
  DEFAULT_PROOF_TYPES,
  type ProfileMap,
} from "./profiles.js";

/** Group kinds every board starts with (FRD-001 G1). */
export const DEFAULT_GROUP_KINDS = [
  { id: "epic", name: "Epic", prefix: "EPIC", color: "#b48cff" },
  { id: "horizon", name: "Horizon", prefix: "HZN", color: "#5bd1c9" },
];

/**
 * The board config written into a fresh project.
 *
 * No `statuses` and no `priorities` — stages are constants (ADR-0002) and
 * priority is gone (ADR-0006). What remains configurable is areas, profiles,
 * group kinds, proof types and deployment environments.
 */
export function defaultBoardConfig(): BoardConfig {
  return {
    // PR Review is a default area on every new board: agents file PR feedback
    // tickets there without having to invent a home for them first.
    areas: [{ id: "pr-review", name: "PR Review", prefix: "PR", color: "#b48cff" }],
    idPrefixes: { ticket: "TICK", plan: "PLAN", research: "RES" },
    profiles: structuredClone(DEFAULT_PROFILES) as Record<string, ProfileMap>,
    defaultProfile: DEFAULT_PROFILE_ID,
    groupKinds: structuredClone(DEFAULT_GROUP_KINDS),
    proofTypes: [...DEFAULT_PROOF_TYPES],
  };
}

/** Profiles in force: the board's table, or the shipped defaults. */
export function resolveProfiles(board: BoardConfig): Record<string, ProfileMap> {
  return (board.profiles ?? DEFAULT_PROFILES) as Record<string, ProfileMap>;
}

/** Proof flavours in force. */
export function resolveProofTypes(board: BoardConfig): readonly string[] {
  return board.proofTypes ?? DEFAULT_PROOF_TYPES;
}

/** Group kinds in force. */
export function resolveGroupKinds(board: BoardConfig) {
  return board.groupKinds ?? DEFAULT_GROUP_KINDS;
}

/** Declared deployment environments, or none. */
export function resolveEnvironments(board: BoardConfig): readonly string[] {
  return board.deployment?.environments ?? [];
}

/**
 * The board's final stage.
 *
 * A constant in format 3 — stages no longer come from the board (ADR-0002), so
 * this no longer depends on its argument. Kept as a function because callers
 * pass a board and the signature is load-bearing across core, the server and
 * the renderer's mirror of the blocked rule.
 */
export function lastStageId(_board?: BoardConfig): string {
  return LAST_STAGE;
}

/** The stages, in order. Constant; a board cannot change them. */
export function boardStages(): readonly Stage[] {
  return STAGES;
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
