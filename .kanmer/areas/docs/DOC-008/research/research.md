# Research — DOC-008: README user-facing accuracy audit

## Question

Which user-facing claims in README.md disagree with the shipped format-3 product and its fact-checked in-app manual, and what is the smallest documentation-only correction that removes that drift?

## Findings

- **DOC-008’s ticket folder has no existing pipeline documents or unusual nested paths.** `rg --files .worktrees/kanmer/.kanmer/areas/docs/DOC-008` found only `DOC-008.md`; no research, files, plan, checklist, or open-questions document was being hidden by an unexpected filename.
- **The linked source ticket is the authoritative provenance for this work.** [[DOC-007]] is Done and its research and open-questions record that the manual was fact-checked against shipped code and a live `get_doc_gates`; its closeout explicitly filed this README follow-up rather than folding it into the manual rewrite.
- **The README’s stage sequence is obsolete.** README line 78 says “Todo → Planning → …”; `packages/core/src/stages.ts` defines exactly Backlog → Preparing → Implementing → Review → Verifying → Done, and `docs/manual/stages.md` explains why Preparing combines research and planning.
- **The README incorrectly presents stages and priority as configurable.** Its folder, frontmatter, board, editor, filter, Settings, and MCP-summary prose still names priority and editable stages. `BoardConfigSchema` and `ColumnKind` in `packages/core/src/types.ts` retain those fields only for legacy reads; format 3 removes them. `apps/gui/src/renderer/src/components/Settings.tsx` renders areas on the Board tab and says stages/priorities are no longer board data. `FilterBar.tsx` retains a legacy `priority?` type/member but renders no priority selector.
- **The README’s storage and document model is format-2-era.** It names `format: 2`, `impact.md`, five flat sibling documents, and a migration to v2. The live board reports format 3. The manual’s `documents.md` specifies seven document types—research, files, plan, checklist, open-questions, post-implementation-report, proof—whose content lives in per-type folders and may be nested/multiple files.
- **The stale model leaks into several user-facing UI descriptions, not only the three lines named in the ticket.** README line 150 names six old editor tabs (including Impact); line 154 promises priority filtering; and line 155 promises stage/priority editing and id-prefix edits. These contradict `docs/manual/documents.md`, `settings.md`, and the shipped components, so correcting only the original three spots would fail the ticket’s “no remaining disagreement” verification criterion.
- **The audit found stale MCP-tool counts and legacy tool lists, but they lie in the explicitly excluded manual-registration/contributor section.** The server currently registers 30 tools, whereas README says 20. Do not broaden this ticket into a contributor/MCP-reference rewrite; record it as out of scope unless the later plan finds a user-facing dependency.
- **No group context adds a constraint.** DOC-008 belongs to HZN-005, but `get_group_doc(HZN-005, context.md)` returned no document. It has no dependency blockers.

## Implications

Update the user-facing README sections coherently as a format-3 description rather than performing three isolated substitutions: the storage tree, example frontmatter, workflow explanation, old-board upgrade wording, and GUI-feature bullets must agree with the manual and shipped code. Copy user language and concepts from `docs/manual/`, not FRD/ADR ids or contributor vocabulary. Keep the layout, source-development, manual MCP registration, verification, and release sections unchanged, as the ticket explicitly excludes them.

## Open questions

None. The ticket specifies the authority (the manual), the desired audience, and the excluded sections; the audit resolved the apparent scope expansion by limiting it to user-visible format-3 contradictions.
