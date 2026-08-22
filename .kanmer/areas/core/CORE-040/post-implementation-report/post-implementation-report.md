# CORE-040 post-implementation report

## Change summary

The release-notes regression now uses a deterministic ISO date cutoff instead of requiring tag v0.3.2 in the test checkout. Production release-notes tag resolution is unchanged. The test remains stacked on CORE-039 solely so it exercises the documented disposable CORE-027/PR #96 fixture.

## Files changed

- scripts/release-notes.test.mjs — one test-only cutoff argument changed from v0.3.2 to 2026-08-20T00:00:00.000Z, before CORE-027's recorded Done timestamp.

No production code, dependency, board data, or assertion changed.

## Governing-doc alignment

docs_todo is true. This is a bounded clean-CI test repair under AGENTS.md verification rules; no new FRD/ADR is needed. The production tag-based interface remains intact.

## Verification evidence

- Hosted pre-fix PR #145 run 32543948316 / job 96959018333: after CORE-039, Node 20 clean shallow checkout failed with git fatal ambiguous argument v0.3.2; scripts were 79/80.
- npm run build: exit 0.
- node --test scripts/release-notes.test.mjs: exit 0, 1/1.
- npm run test:scripts: exit 0, 80/80.
- npm run typecheck: exit 0.
- git diff --check: exit 0.
- Shared verify was not rerun after this one-line change; the prior stacked run reached this exact failure after core 263/263, GUI 352/352, HTTP 61/61, scripts 79/80, and typecheck. Rerun on the stacked PR is required; no pass is claimed.

## Risks and follow-up

The date is deliberately before the documented fixture's Done timestamp and does not depend on repository tags or network state. Future changes to fixture timestamps should update the cutoff or the focused test will fail visibly.

## Merged-main verification

After merge, rerun npm run test:scripts, npm run typecheck, git diff --check, and npm run verify on a clean shallow Windows checkout. Confirm the canonical PR link and 80/80 script rail.


## Merged-main verification addendum

PR #145 merged as 8a9eee57 after hosted run 32544808992/job 96961421442 passed the authoritative Windows verify rail in 2m17s. Local merged-main scripts 80/80, MCP smoke 224/224, and MCP server typecheck passed. A direct core suite retained the known CORE-022 migration timeout/ENOTEMPTY failure; it is preserved as a separate verification boundary.
