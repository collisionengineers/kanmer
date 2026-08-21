# Plan — MCP-036

1. Read MCP-025's current HTTP start/close implementation and canonical project-fingerprint caller.
2. Compute the project fingerprint before constructing/binding the listener; retain it for the ready event.
3. If any pre-bind validation fails, clear any timer and close/destroy any partially-created listener/socket; rethrow the original coded error.
4. Add a regression from an invalid/no-board root proving start rejects before an address is exposed and no resource remains; retain successful official-client/start checks.
5. Run HTTP tests, build, HTTP/stdio/protocol/discovery smokes, root typecheck/test where feasible, and diff check.
6. Write the report, open a PR, stop for an independent review.

## Acceptance

A valid host resolves one project before bind and emits the same readiness metadata. An invalid/no-board host never exposes a listener and cleanup is idempotent.
