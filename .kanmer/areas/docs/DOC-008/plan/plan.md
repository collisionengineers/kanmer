# Plan — DOC-008: Correct format-3 user-facing README content

*Written from this ticket’s research and files documents.*

## Approach

Make one bounded documentation-only change to `README.md`. Rewrite the user-facing format-2 remnants as a coherent format-3 explanation, using the in-app manual and shipped source as the fact base rather than applying isolated string replacements. This is safer than changing only the three reported lines because the same obsolete model appears in the storage diagram, item example, migration copy, and GUI feature bullets. Keep the explicitly excluded Layout, source-development, manual MCP-registration, Verify end-to-end, and Release sections unchanged.

## Governing docs

No governing PRD, FRD, or ADR is linked to DOC-008; `docs_todo: true` is already recorded on the ticket. This documentation correction does not introduce or modify product behaviour, so it neither creates nor changes a governing document. The implementation must instead meet the ticket’s stated acceptance criteria using these fact-checked user documents:

- `docs/manual/stages.md` for the six fixed stages and Preparing’s meaning.
- `docs/manual/documents.md` for the seven folder-based document types.
- `docs/manual/settings.md`, `profiles.md`, and `getting-started.md` for the current user-facing Settings, gates, and product vocabulary.

## Steps

1. Re-read the current README user-facing sections—the Kanmer-folder explanation, item example, workflow/migration prose, and Shared board worktree feature bullets—alongside the listed manual chapters. Mark each claim that still describes format 2, editable stages, or priority.
2. Rewrite the Kanmer-folder tree and its explanatory prose for format 3: show the format-3 marker and per-type document folders; name research, files, plan, checklist, open-questions, post-implementation-report, and proof; explain that a type can contain multiple files. Remove Impact and the old five-flat-files claim.
3. Update the sample ticket frontmatter and workflow/migration prose: remove priority from the example, name the fixed order Backlog → Preparing → Implementing → Review → Verifying → Done, explain Preparing in plain user language, and replace the obsolete format-2/migrate-to-v2 description with wording consistent with the current format-3 product.
4. Correct the affected Shared board worktree bullets: list the current document tabs without Impact, remove priority filtering, and describe Settings as areas/profiles/other current preferences rather than editable stages, priorities, or id prefixes. Preserve every feature claim that remains confirmed by the manual or shipped GUI.
5. Run a bounded residual audit over the changed user-facing README sections for legacy terms and compare every resulting product claim with the manual and source. Do not alter the excluded contributor/MCP-reference material; note it separately if its known stale tool count remains.
6. Verify the rendered Markdown and run the documentation-relevant project checks. Capture the exact commands, output, and residual-audit result for the post-implementation report and post-merge proof.

## Verification

- Read the rendered README and confirm its storage tree, sample frontmatter, stage order, document names, and GUI bullets are internally consistent.
- Search the changed user-facing sections for `Todo`, `Planning` as a stage, `impact.md`, `Impact` as a document tab, `priority`, `format: 2`, and `Migrate to v2`; each remaining match must be outside the ticket’s scoped sections or demonstrably current.
- Compare the final claims with `docs/manual/stages.md`, `documents.md`, and `settings.md`.
- Run `npm test` unless a documented repository condition prevents it; record the result. No generated artifact should change.

## Risks / open questions

- **Scope creep into the contributor/MCP reference:** README’s tool count/list is stale, but the ticket explicitly excludes manual MCP registration. Mitigation: leave that section untouched and do not claim DOC-008 repaired it.
- **Overcorrecting legacy compatibility references:** source retains priority and older-format handling for reads/migration. Mitigation: describe the shipped format-3 user experience, not implementation compatibility internals.
- **User-only questions:** none. The ticket names the authority, desired audience, and excluded sections; the plan makes no product decision.
