# GUI-112 open questions

## Resolved choices

- [x] Should Kanmer mutate GitHub protection or repository variables? No. ADR-0016 excludes that integration; preserve the retarget-first operator boundary and retain old refs until the operator updates the hosted variable.
- [x] Should custom-to-custom rename remain automatic? Yes. Preflight the live worktree against the cached current branch, then use the existing push-before-delete/retained-ref path.
- [x] Should an unexpected live branch be accepted as a completed handoff? No. Only the exact requested destination is accepted; any other branch remains paused and fail-closed.
- [x] Should an unavailable board-root reconciliation error be treated as a non-Git project? No. Preserve the board root/error as a visible failed-Git state and make Retry re-run reconciliation.
- [x] Should the default portable MCP descriptor gain a machine-specific path? No. Keep rootless/portable invocation and add only the configured branch environment required for local expected-branch identity.

## Parked (explicitly deferred)

- [x] Live GitHub protection retargeting, Actions-variable mutation, hosted branch deletion, and real multi-machine proof are deferred to an authorized repository-owner operation; local tests record this boundary as INCONCLUSIVE.
- [x] A GitHub API/App or automatic variable updater is a separate follow-up outside ADR-0016 and GUI-112.
