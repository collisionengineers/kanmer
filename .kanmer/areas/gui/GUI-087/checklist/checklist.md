# Checklist — GUI-087

- [ ] Locate the shared failed-move formatter and make its pure behavior directly unit-testable.
- [ ] Recognize the current `cannot move from` gate errors while preserving non-gate errors unchanged.
- [ ] Rewrite missing-document/ questions-resolved recovery text into Ticket-tab and readiness-panel language without MCP tool names.
- [ ] Rewrite multi-boundary-jump recovery text into the human one-stage-at-a-time action without MCP tool names.
- [ ] Add tests using current `store.ts`-shaped missing-document and multi-boundary messages, plus non-gate pass-through.
- [ ] Update `docs/manual/gates.md` to describe the new human-facing banner wording.
- [ ] Regenerate `apps/gui/src/renderer/src/manual/chapters.generated.ts` with `npm run build:manual`.
- [ ] Run the focused GUI/manual tests, manual freshness check, and GUI typecheck; record results in the implementation report.
