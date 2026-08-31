# Checklist — CORE-126

- [x] [pre-review] Re-orient, obtain the execution packet first, create the exact origin/main worktree/branch, validate identity and take CORE-126.
- [x] [pre-review] Add failing roster-wide merge-gate and check-pr tests, including unchanged single-ticket behavior.
- [x] [pre-review] Implement complete-footer resolution and per-member protected evidence for the same PR/head.
- [x] [pre-review] Add failing controller, already-taken, interruption/recovery and all-terminal claims tests.
- [x] [pre-review] Implement the persistent strict batch manifest, real-actor owner, recoverable declaration-plus-first-take roll-forward, mutation/deletion guards and complete manifest-roster terminal gate under withLeaseLock.
- [x] [pre-review] Expose archived-capable batch summaries and wire execute/review/closeout/tool-reference/AGENTS/glossary contracts.
- [x] [pre-review] Run focused build, core, check-pr, smoke, protocol, type, skills, scripts, docs and plugin checks without weakening assertions.
- [x] [pre-review] Rebuild the generated manual and standalone MCP bundle; prove 41 tools and byte identity.
- [x] [pre-review] Run one complete clean Windows npm run verify rail at the exact final head and retain every exit.
- [x] [pre-review] Commit, push, open one CORE-126 PR, record commit/PR and the post-implementation report, sync the board and move to Review.
- [ ] [post-merge] Verify the exact merge SHA on a detached clean Windows worktree and write the proof before Done.
- [x] [pre-review] Stop at Review with the worktree and lease retained for independent review.

## Progress notes

Execution packet validated and CORE-126 taken on the exact recorded worktree/branch at origin/main `c1bc3be8532150832328a6d7f62ecd94cdcf6220`. Independent design audit corrected the plan before focused tests: declaration plus first take is one recoverable transaction, and its active manifest remains the immutable roster through terminal clearing.

Initial implementation head `13938b440b37a67ddc27373138e14dd6a4daa395` received one consolidated fresh exact-head review. Its three majors were fixed together on the same PR: actor-plus-controller-run authority, mandatory modern batch renewal CAS, and manifest-backed fresh-closeout discovery. The minor terminal-release report overclaim was corrected.

Focused evidence at remediation head `405a65c2736001de4adfa97f5b4a999f57348054` passed: build; 694 core tests; 9 check-pr tests; 360 MCP smoke checks; 50 protocol checks; workspace typechecks; skill prose; 157 script tests; generated-manual verification; and plugin source/bundle identity with the unchanged 41-tool roster. The one authoritative `npm run verify` Windows rail then passed end to end at that exact clean commit with no overlapping full rail. The earlier 683/694 core and 156/157 script fixture attempts are recorded in the post-implementation report with their corrected mechanisms.
