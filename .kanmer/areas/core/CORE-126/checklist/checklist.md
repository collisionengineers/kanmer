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


Final remediation progress: exact head `738e03ee2179621c347328e704134b1202ea5a8e` fixes F-013 through F-016 as one complete-roster evidence invariant; F-017 is rejected with the public-tag and stable/candidate boundary evidence recorded in the report. Focused suites and one non-overlapping authoritative clean Windows verification rail passed at that head. The ticket is ready to return to Review for the bounded exact-head delta review.

F-018 remediation progress: exact head `b51ead6e019f11d035c66f148c311a707f123bb0` validates the projected untaken-member workspace through the shared physical Git safety path before any lease mutation. Failing-first smoke evidence was 363/365; the corrected focused suite passed 365/365 with typecheck, build, plugin byte identity and diff checks. One non-overlapping authoritative clean Windows `npm run verify` rail passed at that exact commit (707 core, 524 GUI, 171 MCP/integration, 157 scripts, 365 smoke, 50 protocol). The ticket is ready for the single bounded F-018 delta review.

## Final remediation progress

Exact head `31dac12a8d6445de0c775e47bf709499830a5c4e` fixes F-019 through F-023 as the bounded protected-batch lifecycle replan. Failing-first core, smoke, and prose evidence is retained in the post-implementation report. Focused suites passed, and the single non-overlapping authoritative clean Windows `npm run verify` rail passed at that exact head with exit 0. The worktree is clean and ready for the strict exact-head delta review; post-merge detached verification remains intentionally unchecked.


## Final PR-provenance remediation progress

Exact head `213209e2a3cb5a2dd572737f1b930c846b8062e8` fixes F-024 and F-025 as one fail-closed plural-PR provenance invariant. Failing-first and final focused evidence are retained in the post-implementation report. The single non-overlapping authoritative clean Windows `npm run verify` rail passed at that exact clean commit with exit 0 (711 core, 524 GUI, 172 MCP/integration, 160 scripts, 368 smoke, 50 protocol). The ticket is ready to return to Review for the bounded exact-head delta review; post-merge detached verification remains intentionally unchecked.

## Final terminal-member remediation progress

Exact head `8965f4eb95653edc3f182ab6cafcc354ded511da` fixes F-026 and F-027. Failing-first core, MCP smoke, and prose-contract evidence is retained in the report. Corrected focused checks passed, and the single non-overlapping authoritative clean Windows `npm run verify` rail passed with exit 0 (714 core, 524 GUI, 172 MCP/integration, 160 scripts, 371 smoke, 50 protocol). The branch is pushed and current with `origin/main`; the ticket is ready for the final bounded exact-head delta review. Post-merge detached verification remains intentionally unchecked.

## Final workspace-reservation remediation progress

Exact head `54f8a2940a23847d8936e380c6f4647b7c9ec11c` fixes F-028 as the central one-writer invariant. Fresh declarations preflight the complete census before WAL creation; pending, active and releasing manifests reserve their exact branch/worktree; pending recovery rechecks before any member write; exact same-batch actor/run/workspace admission remains valid. Five failing-first collision cases became 84/84 core claims tests. One authoritative non-overlapping Windows `npm run verify` rail passed at that exact clean head (719 core, 524 GUI, 172 MCP/integration, 160 scripts, 371 smoke, 50 protocol). Post-merge detached verification remains intentionally unchecked.

## Final cleanup-order remediation progress

Exact head `7a7c0a91a8cdf4f9d368be56be973450e14a9100` fixes F-029 without adding lifecycle state or another tool. After a warning-free complete census and all-terminal proof, closeout now retains the manifest while removing the shared worktree and branch; any Git cleanup failure stops before release; only successful cleanup permits idempotent member release and final manifest unlink. The failing-first prose validator exited 1 on exactly the unsafe old ordering. Corrected focused checks passed (52/52 script tests, skill validator, verify:skills, AGENTS 31/31, diff check). One authoritative non-overlapping Windows `npm run verify` rail then passed at the exact clean head with exit 0 (719 core, 524 GUI, 172 MCP/integration, 160 scripts, 371 smoke, 50 protocol, plus all builds, typechecks, docs/manual, headless/discovery, MCPB and plugin identity). Post-merge detached verification remains intentionally unchecked.
