# Checklist — GUI-087

- [x] Locate the shared failed-move formatter and make its pure behavior directly unit-testable.
- [x] Recognize the current `cannot move from` gate errors while preserving non-gate errors unchanged.
- [x] Rewrite missing-document/ questions-resolved recovery text into Ticket-tab and readiness-panel language without MCP tool names.
- [x] Rewrite multi-boundary-jump recovery text into the human one-stage-at-a-time action without MCP tool names.
- [x] Add tests using current `store.ts`-shaped missing-document and multi-boundary messages, plus non-gate pass-through.
- [x] Update `docs/manual/gates.md` to describe the new human-facing banner wording.
- [x] Regenerate `apps/gui/src/renderer/src/manual/chapters.generated.ts` with `npm run build:manual`.
- [x] Run the focused GUI/manual tests, manual freshness check, and GUI typecheck; record results in the implementation report.

## Closeout

- [x] Confirm PR #75 merged and proof passed on merged main.
- [x] Re-inventory and read every ticket document.
- [x] Confirm a clean worktree, release the ticket, and remove the merged worktree and branch.
