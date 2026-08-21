# MCP-037 plan

1. Re-read MCP-036's implementation and reviewer finding in its scratch review.
2. Wrap project fingerprint resolution in the same rollback boundary as listener bind, ensuring `rollbackStart()` clears the sweep timer and remains idempotent when no listener exists.
3. Extend the no-board child-process regression to inspect the failed host's listener and sweep timer state, and cover repeated close where practical.
4. Rebuild and run HTTP tests, HTTP smoke, stdio smoke, protocol smoke, discovery smoke, root typecheck, and `git diff --check`.
5. Write the implementation report, request independent review, and only then merge the fix into the MCP-025 transport branch.
