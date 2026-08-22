# GUI-112 open questions

## Resolved choices

- [x] Should Kanmer mutate GitHub protection or repository variables? No. ADR-0016 excludes that integration; preserve the retarget-first operator boundary and retain old refs until the operator updates the hosted variable.
- [x] Should custom-to-custom rename remain automatic? Yes. Preflight the live worktree against the cached current branch, then use the existing push-before-delete/retained-ref path.
- [x] Should an unexpected live branch be accepted as a completed handoff? No. Only the exact requested destination is accepted; any other branch remains paused and fail-closed.
- [x] Should an unavailable board-root reconciliation error be treated as a non-Git project? No. Preserve the board root/error as a visible failed-Git state and make Retry re-run reconciliation.
- [x] Which ticket owns local MCP branch propagation and managed AGENTS wording? MCP-044 owns review findings 3836189723 and 3836130705; GUI-112 links it and does not duplicate that implementation.

## Parked (explicitly deferred)

- [x] Live GitHub protection retargeting, Actions-variable mutation, hosted branch deletion, and real multi-machine proof are deferred to an authorized repository-owner operation; local tests record this boundary as INCONCLUSIVE.
- [x] A GitHub API/App or automatic variable updater is a separate follow-up outside ADR-0016 and GUI-112.
