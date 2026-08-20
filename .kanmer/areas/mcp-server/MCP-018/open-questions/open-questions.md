# Open questions — MCP-018

## Resolved decisions

- **What must `plugin:check` prove?** Both committed-vs-fresh artifact synchronization and isolated runtime/module resolution.
- **Where is the entry point obtained?** From the canonical installable plugin manifest/payload metadata, never a duplicated worktree source path.
- **Where does the child run?** From a fresh copied plugin payload outside the repository, with an unrelated empty cwd.
- **May root `node_modules` satisfy imports?** No. Sanitize `NODE_PATH`/loader flags and structurally isolate the payload.
- **Is starting the process enough?** No. Complete at least MCP initialization and `tools/list` so lazy/runtime imports are exercised.
- **How is escape detection proven?** Primary proof is structural isolation; add resolver instrumentation only in tests if necessary, without changing shipped behavior.
- **Should `plugin:build` run before comparison in CI?** A fresh build may be produced in a temporary/staging location for comparison, but the check must not overwrite committed bytes before comparing them.
- **Can the real committed plugin be corrupted for a negative test?** No. Use a miniature test fixture.
- **Should a new plugin verification job be added?** No. Keep one `plugin:check` step inside the shared `verify` rail.
- **Can generated bundle bytes be hand-edited?** No.
- **Does this ticket change provider registration or MCP tools?** No.

No unresolved implementation questions remain.
