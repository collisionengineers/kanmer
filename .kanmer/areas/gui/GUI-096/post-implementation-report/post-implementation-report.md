# Post-implementation report — GUI-096

## Delivered

- Extended `TicketDocsInfo` with sorted, gate-exempt scratch-note slugs populated by the existing core `listScratch` implementation.
- Added a ticket-only Scratch tab outside configured pipeline `docTypes`. It lists notes, prefers `review`, validates new lowercase-kebab names locally, and reuses the versioned `DocEditor` for create/edit/save/conflict behavior.
- Added an `onSaved` hook to refresh document info after a scratch save, preserving existing dirty-tab confirmation handling.
- Added a read-only first-group `context.md` pane immediately above the ticket Body field, with loading, missing, error, Markdown, and wiki-link navigation states. It never edits or aggregates groups.
- Added core regression coverage and jsdom Editor coverage; minimal responsive styles only.

## Governing documents

- **ADR-0016:** retains core as the workflow authority and does not create a competing renderer rule or data path.
- **FRD-003:** scratch remains gate-exempt and is accessed through the existing document surface.
- **FRD-019:** adds the planned editor-only surfaces, not a fourth application view.

## Verification

- `npm test --workspace @kanmer/core -- docs.test.ts` — 50/50.
- `npm test --workspace @kanmer/gui` — 30 files / 300 tests.
- `npm run typecheck --workspace @kanmer/core` — pass.
- `npm run typecheck --workspace @kanmer/gui` — pass.
- `npm run build --workspace @kanmer/gui` — pass.
- `git diff --check` — pass.
- `npm run verify` — unavailable: root package has no `verify` script (known CORE-031 dependency).

## Review notes and remaining evidence

PR #91 is ready for independent review. Interactive screenshots could not be captured in the current Windows session; the automated Editor tests cover the Scratch/read/save path and grouped/missing context states. The remaining unchecked checklist evidence covers expanded new-note, dirty/conflict, and context-state combinations for review to assess; no behavior is being claimed as separately test-proven beyond the listed tests.

## Verify on merged main

Run the core docs test, full GUI test suite, both typechecks, GUI build, and `git diff --check`. The root `verify` rail can only be included after CORE-031 provides it.

## Merged-main reconciliation — 2026-08-21

No new implementation is proposed. PR #91 is already merged; this pass reconciles its five stale evidence boxes against current main. Focused Editor tests passed 10/10; core docs 50/50; full GUI 338/338; all-workspace typecheck; GUI build; and diff-check all passed. The shared npm run verify rail was attempted twice and failed only in unrelated HTTP environment tests: first 60/61 (TUNNEL_READINESS_TIMEOUT), exact rerun 59/61 (same timeout plus project resolution ETIMEDOUT). Failures remain recorded and no overall verify PASS is claimed.

The implementation existing validation, versioned conflict/dirty handling, and first-group context state paths were inspected on merged main; existing tests cover core scratch/read/save, invalid no-write, and content/missing cases. Interactive screenshots unavailable in this Windows session; none claimed.
