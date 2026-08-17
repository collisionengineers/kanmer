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
  QUESTIONS_RESOLVED,
  parseRequirement,
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

/**
 * Give `fix` a gated `enter-review` on boards whose `profiles:` block predates
 * ADR-0014.
 *
 * The decision: *a fix that opened a PR should not merge unreviewed.* Editing
 * `DEFAULT_PROFILES` alone reaches **new boards only** — a board written by
 * setup or migration carries its own `profiles:` block, and `board.profiles ?? …`
 * means the defaults are never consulted again. That is the SKILL-012 gap,
 * found by demonstrating a gate on a real board and watching it not fire.
 *
 * **This is deliberately kept separate from the `questions-resolved` injection
 * below, and it must stay separate.** They obey opposite rules and merging them
 * into one "inject a requirement" helper is how the difference gets lost:
 *
 * - `questions-resolved` may only touch boundaries a profile **already
 *   declares** (ADR-0011's second limit), precisely so no profile's gated-
 *   boundary count changes.
 * - This one **adds a boundary `fix` does not declare**, which changes that
 *   count from 2 to 3 — the intended effect on `implementing → done`, and the
 *   exact operation ADR-0011's limit exists to stop anyone doing by accident.
 *   ADR-0014 is the authorisation, and it carries the measured four-profile
 *   before/after table that makes it more than an assertion.
 *
 * Scope is therefore as narrow as it can be: `fix` only, `enter-review` only,
 * and a no-op when the board already says something about that boundary —
 * including an explicit empty list, which is vacuous **by design** and stays
 * vacuous, the same rule the loop below follows. An operator who has customised
 * `fix` keeps their version.
 *
 * Ordering matters: this runs **before** the `questions-resolved` pass, so the
 * new boundary inherits `questions-resolved` too. Without that ordering `fix`
 * would gain a review gate that does not check open questions, which is the
 * narrow gap ADR-0011 records and this change is partly here to close.
 */
const FIX_REVIEW_PROFILE = "fix";
const FIX_REVIEW_BOUNDARY = "enter-review";
const FIX_REVIEW_REQUIREMENTS: readonly string[] = ["post-implementation-report"];

function injectFixEnterReview(
  base: Record<string, ProfileMap>,
): Record<string, ProfileMap> {
  const profile = base[FIX_REVIEW_PROFILE];
  // A board that removed or renamed `fix` is left alone: inventing the profile
  // back would be a bigger change than the one this function is authorised for.
  if (!profile) return base;
  if (FIX_REVIEW_BOUNDARY in profile) return base;
  return {
    ...base,
    [FIX_REVIEW_PROFILE]: { ...profile, [FIX_REVIEW_BOUNDARY]: [...FIX_REVIEW_REQUIREMENTS] },
  };
}

/**
 * Profiles in force: the board's table, or the shipped defaults — with
 * `fix`'s `enter-review` added (ADR-0014, above) and then `questions-resolved`
 * injected into every boundary each profile already declares.
 *
 * The injection is what makes "existing boards inherit the requirement"
 * (ADR-0011, FRD-009 R5) actually true. Editing `DEFAULT_PROFILES` alone would
 * reach **new boards only**: a board that has ever been written by setup or
 * migration carries its own `profiles:` block, and `board.profiles ?? …` means
 * the defaults are never consulted again. That gap was found by demonstrating
 * the gate on a real board and watching it not fire.
 *
 * It is injected rather than migrated into `board.yml` so the requirement still
 * appears in `get_doc_gates` — skills derive their rules from that call and must
 * not restate them (FRD-023 R1) — without rewriting the user's configuration.
 * The trade-off, stated because it is real: `board.yml` no longer lists every
 * effective requirement. `resolveProfiles` is already the seam where board
 * config meets shipped defaults, which is why it belongs here and not deeper.
 *
 * Two limits on the `questions-resolved` pass, both load-bearing. **They are
 * stated in ADR-0011 — read it there.** They are repeated here only because this
 * is the function they constrain; the ADR is the authority, and it used to be
 * this comment, which is the wrong home for a rule that binds future work.
 *
 * **Never `leave-backlog`.** Questions are raised *during* research, which
 * happens after Backlog — gating entry to the stage where questions get worked
 * would trap a ticket outside it.
 *
 * **Only boundaries the profile already declares.** Adding a *new* gated
 * boundary would change which multi-stage moves are legal, because
 * `collapsesPipeline` counts gated boundaries: giving `spike` a gated
 * `leave-preparing` and `enter-review` would turn its Backlog → Done jump from
 * one gated boundary into three and refuse it, breaking the acceptance case
 * FRD-002 exists to protect. So a `spike` gains it at `enter-done` and nowhere
 * else, and `chore`'s one-jump to Implementing survives untouched. `chore` still
 * declares no `enter-review`, so a question raised during a chore's
 * implementation is caught at `enter-done` rather than at review; ADR-0014
 * closed that gap for `fix` and deliberately left it open for `chore`.
 *
 * A profile with no boundaries at all — `custom: {}`, used by historical
 * backfill — is untouched, so a backfilled ticket is still nagged about nothing.
 */
const QUESTIONS_BOUNDARIES: readonly string[] = ["leave-preparing", "enter-review", "enter-done"];

export function resolveProfiles(board: BoardConfig): Record<string, ProfileMap> {
  const base = injectFixEnterReview(
    (board.profiles ?? DEFAULT_PROFILES) as Record<string, ProfileMap>,
  );
  const out: Record<string, ProfileMap> = {};
  for (const [id, profile] of Object.entries(base)) {
    const next: ProfileMap = {};
    for (const [boundary, reqs] of Object.entries(profile) as [
      keyof ProfileMap,
      string[] | undefined,
    ][]) {
      // An empty list is vacuous by design and must stay vacuous, or
      // `custom: {}` and `custom: { "leave-backlog": [] }` would diverge.
      const eligible =
        QUESTIONS_BOUNDARIES.includes(boundary as string) &&
        reqs &&
        reqs.length &&
        !reqs.some((r) => parseRequirement(r).type === QUESTIONS_RESOLVED);
      next[boundary] = eligible ? [...reqs!, QUESTIONS_RESOLVED] : reqs;
    }
    out[id] = next;
  }
  return out;
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
