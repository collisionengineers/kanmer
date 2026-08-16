/**
 * The six fixed stages, mirrored for the renderer.
 *
 * The renderer may only `import type` from `@kanmer/core` — core pulls in
 * Node-only dependencies (gray-matter, chokidar, node:crypto) and the renderer
 * is a browser context, so a runtime import breaks the build (AGENTS.md §7).
 * Stages are pure data with no Node dependency, but they live inside that
 * bundle, so the renderer needs its own copy.
 *
 * This is the same deliberate duplication as `lib/board.ts`'s `blockedIds`
 * against core's `computeBlockedIds` — with one improvement: `stages.test.ts`
 * asserts this file and `core`'s `STAGES` agree, so the pair cannot drift
 * silently. Change one, and the test names the other.
 */

export interface UiStage {
  id: string;
  name: string;
  color: string;
}

export const UI_STAGES: readonly UiStage[] = Object.freeze([
  { id: "backlog", name: "Backlog", color: "#6b7280" },
  { id: "preparing", name: "Preparing", color: "#5b8cff" },
  { id: "implementing", name: "Implementing", color: "#9fe870" },
  { id: "review", name: "Review", color: "#ffcf7a" },
  { id: "verifying", name: "Verifying", color: "#c8a2ff" },
  { id: "done", name: "Done", color: "#5bd1c9" },
]);

export const UI_STAGE_IDS: readonly string[] = UI_STAGES.map((s) => s.id);

/** Where new tickets land. */
export const UI_FIRST_STAGE = UI_STAGE_IDS[0];

/** The final stage — a constant now, not derived from the board. */
export const UI_LAST_STAGE = UI_STAGE_IDS[UI_STAGE_IDS.length - 1];

/**
 * Display name for a stage id, falling back to the raw id so a ticket on an
 * unmigrated board still renders something meaningful rather than blank.
 */
export function uiStageName(id: string): string {
  return UI_STAGES.find((s) => s.id === id)?.name ?? id;
}
