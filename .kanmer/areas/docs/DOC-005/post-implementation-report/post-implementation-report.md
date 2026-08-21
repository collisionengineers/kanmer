# Post-implementation report — DOC-005

## Disposition

DOC-005's scoped implementation is already present on merged main from PR [#26](https://github.com/collisionengineers/kanmer/pull/26): source commit 1df633e7dd4b424ac0a7107ac08d2289c61260dd, merge commit 05a335dc0e9b4b75ef9904218c55ca643f9a519d. The fresh doc-005-operating-rule branch is clean at origin/main and has no source diff. No duplicate/no-op PR was created.

## Scope audit

| Path | Confirmed behavior |
|---|---|
| AGENTS.md | Operating rule is outside the kanmer:instructions managed markers. |
| docs/README.md | Contributor-facing rule includes reasoning and dated evidence about backfilled and collapsed history. |
| scripts/release-notes.mjs | Read-only grouped draft from stageEntered.done after a tag/date, with PR links; resolves the board through the shared git common directory so main and ticket worktrees find the board. |
| package.json | release:notes invokes scripts/release-notes.mjs. |

No files outside DOC-005's planned scope were changed.

## Governing document

ADR-0010 says setup reconciles existing reality into Kanmer and is idempotent. The implementation makes the contributor rule explicit without claiming historical tickets followed a process that did not yet exist; the release-note stretch consumes committed stage history rather than inferring shipment from updated timestamps.

## Verification evidence

- Initial node invocation of release:notes from the fresh ticket worktree — exit 1 because packages/core/dist/index.js was not built. This first failure is retained.
- npm run build:core — exit 0.
- npm run release:notes -- --since v0.3.2 from the ticket worktree — exit 0; grouped real board output, 93 tickets across 5 areas.
- npm run release:notes -- --since v0.3.2 from normal main — exit 0; same grouped real board output.
- npm run verify:agents-block — exit 0, 31/31 checks.
- npm run test:scripts — exit 0, 79/79 tests.
- npm run typecheck — exit 0 across core, mcp-server, ui and gui.
- git diff --check — exit 0.

The release-notes command printed only to stdout. No intentional source or board-worktree files were modified by the audit.

## Follow-up / verification handoff

The existing merged implementation should be independently reviewed against the packet and ADR-0010; merged-main verification should rerun verify:agents-block, the script rail, typecheck, and release:notes from both roots. External release deployment is not part of DOC-005. The historical PR #26 is the implementation PR; this lane will not fabricate a second PR for an empty branch.
