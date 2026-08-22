# Checklist — GUI-108

- [x] Read the complete ticket packet, HZN-007 context, linked GUI-009/GUI-023/GUI-087 history, and governing FRD-002/FRD-006.
- [x] Confirm the existing `CH.getGateStatus` path remains authoritative; do not add a parallel gate resolver or IPC channel.
- [x] Forward drop anchors from card and empty-column Board paths while preserving optimistic rollback and existing gated-column tint/tooltips.
- [x] Add and test a pure mapper for missing-document, questions-resolved, named-requirement, multi-boundary, and non-gate rejection shapes.
- [x] Request authoritative gate status after a rejected move and render an anchored target/boundary/requirements popover.
- [x] Add an Open missing document action that uses the existing Ticket Editor/create-document affordance; keep a Ticket fallback for non-tab requirements.
- [x] Preserve existing friendly error behavior when gate status cannot be read or the rejection is not a recognized single-boundary gate.
- [x] Add renderer tests for mapper behavior, anchor forwarding, and initial document selection.
- [x] Add responsive light/dark styling for the anchored feedback popover.
- [x] Run focused GUI tests: 25/25 passed.
- [x] Run manual freshness: `npm run check:manual` passed.
- [x] Run `git diff --check`: passed.
- [x] Run full GUI tests and retain the existing stale-core/antigravity baseline failures in the report (284/285 tests, 39/43 files passed).
- [x] Run standard GUI typecheck/build and retain the stale shared-core failures; rerun against branch-local core resolution with web/node tsc and GUI build passing.

## Parked (explicitly deferred)

- [x] Packaged Electron visual drag/drop inspection and real pointer/manual evidence are unavailable in this environment; marked INCONCLUSIVE rather than claimed as PASS.

## Closeout — GUI-108

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; ticket worktree removed
- [x] branch removed after merged PR
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
