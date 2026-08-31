# Checklist — CORE-126

- [x] [pre-review] Re-orient, obtain the execution packet first, create the exact origin/main worktree/branch, validate identity and take CORE-126.
- [ ] [pre-review] Add failing roster-wide merge-gate and check-pr tests, including unchanged single-ticket behavior.
- [ ] [pre-review] Implement complete-footer resolution and per-member protected evidence for the same PR/head.
- [ ] [pre-review] Add failing controller, already-taken, interruption/recovery and all-terminal claims tests.
- [ ] [pre-review] Implement the persistent strict batch manifest, real-actor owner, recoverable declaration-plus-first-take roll-forward, mutation/deletion guards and complete manifest-roster terminal gate under withLeaseLock.
- [ ] [pre-review] Expose archived-capable batch summaries and wire execute/review/closeout/tool-reference/AGENTS/glossary contracts.
- [ ] [pre-review] Run focused build, core, check-pr, smoke, protocol, type, skills, scripts, docs and plugin checks without weakening assertions.
- [ ] [pre-review] Rebuild the generated manual and standalone MCP bundle; prove 39 tools and byte identity.
- [ ] [pre-review] Run one complete clean Windows npm run verify rail at the exact final head and retain every exit.
- [ ] [pre-review] Commit, push, open one CORE-126 PR, record commit/PR and the post-implementation report, sync the board and move to Review.
- [ ] [post-merge] Verify the exact merge SHA on a detached clean Windows worktree and write the proof before Done.
- [ ] [pre-review] Stop at Review with the worktree and lease retained for independent review.

## Progress notes

Execution packet validated and CORE-126 taken on the exact recorded worktree/branch at origin/main c1bc3be8532150832328a6d7f62ecd94cdcf6220. Independent design audit corrected the plan before focused tests: declaration plus first take is one recoverable transaction, and its active manifest remains the immutable roster through terminal clearing.
