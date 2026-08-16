/**
 * The six fixed stages (ADR-0002, FRD-007).
 *
 * Stages are constants, not board configuration. v2 let boards define their
 * own, and real use produced boards whose custom stage sets left the default
 * doc gates pointing at stages that did not exist — the gates went silently
 * inert, so the pipeline looked enforced and was not. Fixing the set is what
 * makes every gate live on every board, and lets skills and the GUI name a
 * stage literally instead of resolving it defensively.
 *
 * Nothing may add, remove, rename or reorder these. `board.yml` has no
 * `statuses` key in format 3.
 */

/** One stage. `order` is its index; the array order is authoritative. */
export interface Stage {
  id: StageId;
  name: string;
  color: string;
  /** One line on what the stage means — surfaced by `list_board`. */
  meaning: string;
}

export const STAGE_IDS = [
  "backlog",
  "preparing",
  "implementing",
  "review",
  "verifying",
  "done",
] as const;

export type StageId = (typeof STAGE_IDS)[number];

export const STAGES: readonly Stage[] = Object.freeze([
  {
    id: "backlog",
    name: "Backlog",
    color: "#6b7280",
    meaning: "Captured, not started. The only stage a governing-doc gate can guard the exit of.",
  },
  {
    id: "preparing",
    name: "Preparing",
    color: "#5b8cff",
    meaning:
      "Research, file mapping and planning — everything before code changes. Merges v2's Researching and Planning; the documents' own requires-chain preserves their internal order.",
  },
  {
    id: "implementing",
    name: "Implementing",
    color: "#9fe870",
    meaning: "Code changes in the ticket's own worktree and branch; ends with the PR open.",
  },
  {
    id: "review",
    name: "Review",
    color: "#ffcf7a",
    meaning: "Pre-merge: the PR is checked against plan and governing docs; feedback becomes tickets; ends at merge.",
  },
  {
    id: "verifying",
    name: "Verifying",
    color: "#c8a2ff",
    meaning:
      "Post-merge: the shipped result is validated on merged main and proof is written. 'Merged but unconfirmed' is a real state worth a column.",
  },
  {
    id: "done",
    name: "Done",
    color: "#5bd1c9",
    meaning: "Verified. Closeout — records and cleanup — happens after entry.",
  },
] satisfies Stage[]);

/** The first stage; where new items land when none is given. */
export const FIRST_STAGE: StageId = STAGE_IDS[0];

/** The last stage. Constant now, where v2 had to derive it from the board. */
export const LAST_STAGE: StageId = STAGE_IDS[STAGE_IDS.length - 1];

const STAGE_SET: ReadonlySet<string> = new Set(STAGE_IDS);

/** Whether `id` is one of the six. The single membership test. */
export function isStageId(id: string): id is StageId {
  return STAGE_SET.has(id);
}

/** Position in the pipeline, or -1. Gate thresholds are computed from this. */
export function stageIndex(id: string): number {
  return (STAGE_IDS as readonly string[]).indexOf(id);
}

/** Look up a stage, or undefined. */
export function stageById(id: string): Stage | undefined {
  return STAGES.find((s) => s.id === id);
}

/** Display name, falling back to the raw id for an unmigrated legacy value. */
export function stageName(id: string): string {
  return stageById(id)?.name ?? id;
}

/**
 * The stage boundaries a profile can gate (FRD-002 P1).
 *
 * `leave-<stage>` fires when a move crosses out of that stage; `enter-<stage>`
 * when it crosses into it. Both are thresholds, not equality checks, so a
 * multi-stage jump is still caught by every boundary it crosses.
 */
export const BOUNDARIES = [
  "leave-backlog",
  "leave-preparing",
  "enter-review",
  "enter-verifying",
  "enter-done",
] as const;

export type Boundary = (typeof BOUNDARIES)[number];

const BOUNDARY_SET: ReadonlySet<string> = new Set(BOUNDARIES);

export function isBoundary(v: string): v is Boundary {
  return BOUNDARY_SET.has(v);
}

/**
 * The index a move must reach for `boundary` to have been crossed.
 *
 * `leave-X` → one past X, so any move landing at or beyond that has left X.
 * `enter-Y` → Y itself. A gate fires when `to >= threshold > from`.
 */
export function boundaryThreshold(boundary: Boundary): number {
  const [kind, stage] = splitBoundary(boundary);
  const idx = stageIndex(stage);
  return kind === "leave" ? idx + 1 : idx;
}

/** Split `leave-backlog` into `["leave", "backlog"]`. */
export function splitBoundary(boundary: Boundary): ["leave" | "enter", StageId] {
  const dash = boundary.indexOf("-");
  return [boundary.slice(0, dash) as "leave" | "enter", boundary.slice(dash + 1) as StageId];
}

/** Human phrasing for an error message: "leaving Backlog" / "entering Review". */
export function boundaryLabel(boundary: Boundary): string {
  const [kind, stage] = splitBoundary(boundary);
  return `${kind === "leave" ? "leaving" : "entering"} ${stageName(stage)}`;
}
