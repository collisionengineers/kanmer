# Open questions — GUI-104

No unresolved implementation choice is being silently assumed: the plan uses environment-reference credentials, app-global non-secret metadata, and GUI-owned child processes only.

## Parked (explicitly deferred)

- Existing DOC-010-linked FRD-022/FRD-024 governing docs cover the inherited MCP/manual contract; FRD-026 adds the GUI lifecycle contract in this PR.
- Programmatic OpenAI tunnel/app provisioning is excluded because the operator and workspace own it.
