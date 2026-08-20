# Post-implementation report — DOC-008

## Summary

Updated README.md’s user-facing product explanation from the obsolete format-2 model to the shipped format-3 experience. The storage tree, document vocabulary, sample ticket, stage sequence, migration guidance, and Editor/filter/Settings bullets now agree with the in-app manual. Contributor-layout, manual MCP-registration, verification, and release sections were deliberately left outside this ticket.

## Changes

| File | Change | Why |
|---|---|---|
| `README.md` | Replaced the format-2 tree and five flat documents with the format-3 marker and seven folder-based document types. | Users must see the current storage model and understand that a document type can contain multiple files. |
| `README.md` | Removed priority from the sample ticket; replaced Todo/Planning with the six fixed stages; explained Preparing and format-3 migration. | Corrects stale workflow, configuration, and migration claims. |
| `README.md` | Updated Editor, filter, and Settings bullets to Files/open questions/report, group filtering, fixed stages, no priority, profiles, Git, and Connect. | Prevents the surrounding user-facing overview from contradicting the manual after the original three fixes. |

## Governing docs

DOC-008 has no linked governing document and retains `docs_todo: true`. This is a documentation-only correction; it changes no product behaviour and introduces no design decision, so no governing document was modified or created. The change was checked against `docs/manual/stages.md`, `documents.md`, `settings.md`, `profiles.md`, and shipped core/GUI source as recorded in the ticket research.

## Risks / follow-ups

- README’s contributor/MCP-reference section still says the server has 20 tools and retains legacy priority wording. That section is explicitly out of scope for DOC-008; this PR does not claim to repair it.
- Source retains compatibility handling for old formats and priority on legacy reads. The README now describes the current format-3 user experience, not those internals.
- No user-only questions or new follow-up ticket emerged.

## Verification hand-off

On merged main, confirm:

1. `npm test` passes, including `check:manual`.
2. `git diff --check` is clean for the merged change.
3. A residual audit over README’s user-facing format-3 sections finds no `format: 2`, `Migrate to v2`, `impact.md`, Impact document tab, priority-filter, or Todo/Planning stage claim.
4. Render/read the README and compare its storage tree, stage order, document tabs, filters, and Settings wording with `docs/manual/stages.md`, `documents.md`, and `settings.md`.

Pre-PR evidence: `npm test` passed (manual freshness, 249 core tests, GUI suites, and script tests); `git diff --check` passed; the scoped residual audit found no obsolete user-facing claims.
