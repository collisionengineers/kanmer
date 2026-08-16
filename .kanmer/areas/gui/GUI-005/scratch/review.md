# Review — GUI-005

**Author-reviewed.** I wrote the change and I am reviewing it. That is not an
independent review and should not be read as one.

**No `pr-review` document, by design.** v3's `DOC_TYPES` is a fixed seven
(research, files, plan, checklist, open-questions, post-implementation-report,
proof). `kanmer-review`'s 4-doc set — `pr-changes-summary`, `pr-comments`,
`pr-comment-disposition`, `pr-review` — was a v2 per-area doc set and has no
representation in format 3. Recorded against SKILL-001.

## Report against diff

`post-implementation-report.md` lists 7 files; the diff touches exactly those 7.
Rationales match what each change does.

## Governing docs

FRD-007 M3 (read-only on decline) and acceptance 6 (all five preview fields) are
both met — checked field by field against `V3Report`.

## Code — what I actually checked

**Read-only banner flash.** `format` initialises to `2`, so a format-3 board
could have rendered the read-only banner for one frame. It does not:
`openProject` sets `root`, `board`, `items` and `format` in the same batch, and
the banner only renders once a project is open. Cleared.

**Blocked writes as unhandled rejections.** `readOnlyClient` rejects rather than
throwing synchronously, so any uncaught call site would produce an unhandled
rejection instead of a message. Both reachable paths catch: card actions go
through `runCardAction` (try/catch → error banner) and `Editor`'s save wraps
`setDoc`. Cleared.

**Spread preserves the client.** `{...client}` over `makeClient`'s object
literal keeps `projectId` and every unlisted method; asserted in the tests.

## Not checked

The modal's rendering against a real format-2 board. No fixture was migrated
through this UI — that is the verify step, and the report says so.

**Verdict: pass.** Merging into `v3-phase-minus-1-prework` locally; no PR,
pending the user's decision on publishing the v3 line.
