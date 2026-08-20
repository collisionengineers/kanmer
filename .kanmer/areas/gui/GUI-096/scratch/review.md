# Independent review — GUI-096 / PR #91

## Changes reviewed

- Core extends existing `TicketDocsInfo`/`getDocsInfo` with sorted gate-exempt scratch slugs from `listScratch`; no IPC channel, gate, or document type is added.
- Editor adds a ticket-only Scratch tab outside pipeline tabs, reuses the versioned document editor, and refreshes docs info after save.
- Editor loads only `item.groups[0]`'s `context.md`, renders it read-only above Body, and handles loading/missing/error states without a new view or group editing.
- CSS and tests are focused; no MCP, package, lockfile, or plugin change is present.

## Checks

- PASS — focused core docs test: 50/50.
- PASS — focused Editor test: 4/4.
- PASS — full GUI suite: 30 files / 300 tests.
- PASS — GUI typecheck and production build.
- PASS — `git diff --check origin/main...HEAD`; exact six planned files changed.
- PASS — governing-doc/EPIC constraints match the diff: existing document/group APIs are reused, scratch remains gate-exempt, and no fourth app view or new IPC was added.

## Blocking finding

1. **Blocking — whitespace-padded scratch names are silently normalized.** `createScratch` uses `newScratchSlug.trim()` before validation. Thus an entered `" note "` passes the lowercase-kebab check and is opened as `scratch/note`, contrary to the plan's requirement not to silently transform invalid input on write. The suite does not cover this case. Filed [[GUI-103]] blocking GUI-096; it must reject the exact padded input locally and add regression coverage.

## Evidence limitations (not passes)

- `npm run verify` is absent pending CORE-031.
- Interactive screenshots are unavailable in this Windows session.
- Checklist correctly leaves broader new-note, dirty/conflict, and first-group state combinations unchecked. The focused tests cover read/save and missing context, but do not erase the blocking whitespace validation gap.

## Verdict

NEEDS CHANGES — do not merge PR #91. Resolve [[GUI-103]], update the PR, and request an independent re-review.
