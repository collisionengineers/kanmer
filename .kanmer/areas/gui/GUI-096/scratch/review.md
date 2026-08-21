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

# Re-review — GUI-096 / PR #91

## Remediation

- PASS — commit `b6ad3da` removes the pre-validation `.trim()`. Validation now receives the exact user-entered scratch slug.
- PASS — the renderer regression supplies `" note "`, asserts the local validation error, and confirms no `getDoc("scratch/note")` or `setDoc` call. The original traversal rejection is retained.
- PASS — GUI-103 records this remediation and is archived, so it no longer blocks GUI-096.

## Rechecked evidence

- `npm test --workspace @kanmer/gui -- Editor.test.tsx` — 4/4 passed.
- `npm run typecheck --workspace @kanmer/gui` — passed.
- Fresh `npm test --workspace @kanmer/gui` — 30 files / 300 tests passed.
- `git diff --check origin/main...HEAD` — passed; source scope remains the six planned core/editor/style/test files.

## Remaining limitations

- Root `npm run verify` is still absent pending CORE-031, and screenshots remain unavailable in this session; neither is claimed as evidence.
- The ticket continues to document expanded new-note, dirty/conflict, and context-state coverage as unchecked. Code review plus existing versioned `DocEditor` behavior and the focused regression make those non-blocking for this targeted remediation; they remain appropriate follow-up evidence rather than invisible passes.

## Verdict

PASS — the blocking whitespace-normalization defect is fixed. Merge PR #91 and move GUI-096 to Verifying.

# Independent review — GUI-096

Disposition: PASS.

- PR #91 is MERGED on main at 6dec9c5af9731b74849115d77305bcb443b12dd1; all recorded feature/remediation commits are reachable.
- The author packet was reread: research/files/plan/checklist/open-questions/report/proof are present; checklist is 44/44 and enter-review gates pass.
- Independent merged-main run: `npm test -w @kanmer/gui` exit 0, 37 files / 338 tests passed, including Editor 10/10; no GUI-096 regression.
- Scope matches the ticket and governing docs: gate-exempt scratch tab, first-group read-only context pane, existing IPC/core document surface; no GUI-097 scope.
- The packet correctly retains unrelated shared-verify HTTP failures and unavailable screenshots; no blocking finding.

Reviewed by root controller on 2026-08-21 after the author lane stopped at Review.
