# Post-implementation report — MCP-020

## Change

Implemented the controlled background-dispatch contract across core, MCP, and GUI. Core now owns one provider registry and bounded DispatchSupervisor with project/ticket locks, concurrency and timeout bounds, descendant cancellation, sanitized recent status, and terminal scratch recording. MCP exposes dispatch_task, list_dispatches, and cancel_dispatch with a closed provider/task allowlist, fail-closed operator policy, optional elicitation approval, expected-project binding, no arbitrary command/argument/prompt input, and dispatch disabled by default. The GUI adapter reuses the same supervisor and provider registry. Documentation, tool references, generated manual, plugin bundle, and protocol/smoke coverage are synchronized.

## Traceability

- Ticket: MCP-020.
- Branch/worktree: mcp-020-controlled-dispatch / .worktrees/mcp-020.
- Commit: fb4d6397.
- PR: https://github.com/collisionengineers/kanmer/pull/137.
- Base before merge: 2ba84147.

## Verification attempts

- Initial full workspace typecheck: exit 1. The shared status contract required requestedBy and the UI demo fixture had not been updated; then the provider union exposed the register-only Antigravity target. Both were fixed in this ticket. These failures are retained.
- Core focused dispatch supervisor tests: exit 0, 4/4.
- MCP dispatch policy node tests: exit 0, 3/3.
- Core full tests with 30-second timeout: exit 0, 263/263.
- GUI focused providers/dispatch tests: exit 0, 68/68.
- GUI full tests: exit 0, 352/352.
- Workspace typecheck after fixes: exit 0.
- Core build and MCP build: exit 0.
- GUI build: exit 0.
- MCP stdio smoke: exit 0, 224/224.
- MCP protocol smoke: exit 0, 46/46 across supported protocol versions.
- Git diff check: exit 0.
- Dispatch remains default-disabled in the authoritative smoke and no child process or log is created by disabled refusal. No provider-authenticated live dispatch was attempted; this environment does not have an authorized disposable agent host/credential lane. The refusal and policy contract are what is proven.

## Scope and handoff

The implementation never accepts arbitrary executables, arguments, prompts, environment, or log paths from the caller. Remote HTTP uses the same registered surface and policy; bearer authentication is not authorization. Independent review must inspect PR 137, the shared supervisor/provider contract, the disabled-by-default behavior, and the retained initial typecheck failures. Author stops at Review; no self-review, merge, or cleanup.
