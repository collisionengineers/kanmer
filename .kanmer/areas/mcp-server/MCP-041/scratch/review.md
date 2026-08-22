# Independent review — MCP-041

## Verdict
PASS on patch scope; merge blocked by stacked CI dependency. The test-only change waits for the lifecycle states being asserted with a bounded timeout, retains child-count/state-sequence/stop assertions, and leaves `supervisor.ts` and retry policy untouched. Focused 7/7, 100 repeated runs, package typecheck, and eventual package test:http 61/61 support the claim.

## CI finding
PR #145 required verify is red only because its main-based checkout still reproduces the separate CORE-037 Windows path-alias assertion (`RUNNER~1` vs `runneradmin`). The original MCP supervisor failure is absent. This is a dependency cycle: CORE-037 cannot merge while MCP-041 is red, and MCP-041 cannot pass until CORE-037 is present. Resolve by stacking the already-reviewed CORE-037 commit as an explicit dependency on the MCP-041 branch/PR (no new source scope), then rerun verify; document the stack and preserve PR #144 traceability. Do not admin-merge a red check.

## CI dependency update — 2026-08-22
Stacked CORE-037 dependency removed the prior Windows path failure, and the tunnel supervisor suite/package rail passed. The required GitHub run then failed later at the unrelated Windows `npm run test:scripts` command: Node received literal `scripts/*.test.mjs` and reported the wildcard file was missing. CORE-038 was created and linked as blocking MCP-041 and CORE-037. PR #145 remains held; no admin merge.

## Stacked CI update — 2026-08-22

After CORE-041 was stacked as merge 849d912b, PR #145 run 32544808992 initially failed during npm ci with Electron ECONNRESET/EPERM cleanup; the failed attempt is recorded in the HZN-007 run ledger. Rerunning the failed job completed PASS in 2m17s (job 96961421442): checkout, Node 20, and the authoritative npm run verify rail all passed. The full stack diff remains bounded to the six recorded ticket scopes; git diff --check passes and all original implementation SHAs are ancestors of the stack head. Root final review: PASS; merge authorized with a merge commit to preserve the reachable ticket SHAs.
