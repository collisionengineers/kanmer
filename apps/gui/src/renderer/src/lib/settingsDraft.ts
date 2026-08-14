import type { BoardConfig } from "@kanmer/core";

/** A successfully re-read board replaces the Settings draft after backfill. */
export function reconcileBoardDraft(board: BoardConfig): BoardConfig {
  return structuredClone(board);
}

export function boardDraftModified(draft: BoardConfig, board: BoardConfig): boolean {
  return JSON.stringify(draft) !== JSON.stringify(board);
}
