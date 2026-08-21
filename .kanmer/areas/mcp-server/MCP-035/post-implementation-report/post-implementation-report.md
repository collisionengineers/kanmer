# Post-implementation report — MCP-035

## Outcome

Validated every requested document path before the legacy-layout early return in the shared core batch reader. Format-1 safe requests retain their established all-missing response; malformed traversal, absolute, and backslash-escape IDs reject before any document result is returned. Format-2/3 path validation, ordering, versions, and missing-entry semantics remain unchanged.

## Changes

| Path | Change | Rationale |
|---|---|---|
| packages/core/src/store.ts | Compute docPathIn results before the format branch using a placeholder root for v1; return legacy missing records only after validation; reuse v2 paths. | Closes the MCP-019 P2 without duplicating validation or changing storage behavior. |
| packages/core/src/store.test.ts | Extend the existing format-1 fixture with safe-missing compatibility and traversal/absolute/backslash rejection assertions. | Regression coverage for the reported legacy bypass and atomic invalid batches. |
| packages/core/src/docs.test.ts | Extend current-layout batch validation coverage to traversal, absolute, and backslash-escape IDs. | Confirms the shared validator remains enforced across current layouts. |

No MCP handler/schema, migration, document-write, plugin, dependency, or unrelated-ticket changes were made. MCP-023/025/036/037 remain out of scope.

## Governing docs and traceability

- FRD-022 R1/R3/R6: the public get_ticket_doc inventory and read contract remain intact, and existing smoke/protocol rails remain green.
- MCP-019 independent review: fixes the reproduced format-1 early-return validation gap.
- HZN-007 context: narrow remediation, independent review/merge handoff, and no self-merge.
- Commit: 0593a38bd5722eeba07ed7288fb05e58e10e5c52.
- PR: to be recorded after creation.

## Verification

- npx vitest run src/docs.test.ts src/store.test.ts: 132/132 passed.
- Targeted invalid-path tests: 2/2 passed.
- npm run typecheck -w @kanmer/core: exit 0.
- npm run typecheck -w @kanmer/mcp-server: exit 0.
- npm run build: exit 0.
- node packages/mcp-server/src/smoke.mjs: 184/184 passed.
- npm run smoke:protocol: 42/42 passed.
- npm run smoke:discovery: 13/13 passed.
- git diff --check: exit 0.
- npm run plugin:check was not run in this linked worktree because the repository contract requires the normal checkout for authoritative plugin byte comparison; it should be rerun on merged main.

## Reviewer handoff

Review the three-file diff for the narrow control-flow change and regression assertions. On merged main, rerun the focused/full core tests, both typechecks, build, MCP smoke, protocol and discovery smoke, plugin:check from the normal checkout, and git diff check. Do not treat this report as proof; proof belongs to verification after merge.
