# Checklist — CORE-085

## Preparation

- [x] Read CORE-081/CORE-026 packets, review comments, group context, and governing docs.
- [x] Confirm base is CORE-081 head `13b6ce22a8363c0f467e96c775eb9a09891b7bb2`.

## Implementation

- [x] Scope validators to the final redirect target.
- [x] Preserve forced refresh semantics when joining an active refresh.
- [x] Add multi-hop validator and concurrent-force regressions.
- [x] Update cumulative packet dispositions.

## Verification and handoff

- [x] Run source/core/typecheck/server/scripts/diff checks and record exit codes.
- [x] Write post-implementation report and update checklist.
- [x] Open PR targeting `core-026-project-declared-sources`; stop at Review.
- [x] Post-merge proof on merged main. — reconciled against merged-main proof; inherited external limits remain recorded.

## Progress notes

- Recreated the recorded dedicated worktree `.worktrees/core-085` and branch `core-085-redirect-force-refresh` at exact CORE-081 head `13b6ce22a8363c0f467e96c775eb9a09891b7bb2`; no force-take or source changes outside this ticket.
- Implemented the two mapped review fixes in `sources.ts` and added deterministic regressions in `sources.test.mjs`; no dependencies or governing-doc files changed.
- Initial new-test attempt exited 1 on two fixture errors (validator fixture expected cached result incorrectly; concurrent fixture passed numeric `now` instead of a function). Assertions/fixtures were corrected without weakening behavior; source rail reran 26/26.
- `npm run build:server`: exit 0. `node --test packages/mcp-server/src/sources.test.mjs`: exit 0, 26/26.
- `npm test -w @kanmer/core`: exit 0, 303/303. `npm run typecheck -w @kanmer/mcp-server`: exit 0. `npm run build:core`: exit 0.
- First `npm run test:scripts`: exit 1, 86/88, exact missing `packages/core/dist/index.js` failures in `auto-run-state` and `release-notes`; after build:core, rerun exit 0, 88/88.
- `git diff --check`: exit 0. Implementation commit: `b2c51779a4ee0a5d95c8b3bce51cd4408490dc68`.


## 2026-08-23 Done reconciliation

All previously unticked items were reconciled against the ticket's merged-main proof, review/closeout records, or an explicit INCONCLUSIVE disposition already preserved there. No external or hosted limitation was upgraded to PASS by this edit.
