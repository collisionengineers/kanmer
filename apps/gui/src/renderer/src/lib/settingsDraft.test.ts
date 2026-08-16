import { describe, expect, it } from "vitest";
import { boardDraftModified, reconcileBoardDraft } from "./settingsDraft.js";
const board = { areas: [{ id: "one", name: "One" }], idPrefixes: { ticket: "T", plan: "P", research: "R" } } as never;
describe("settings draft reconciliation", () => { it("detaches a refreshed board and detects later edits", () => {
  const draft = reconcileBoardDraft(board); expect(boardDraftModified(draft, board)).toBe(false);
  draft.areas.push({ id: "two", name: "Two" }); expect(boardDraftModified(draft, board)).toBe(true);
}); });
