# Open questions — GUI-104

No unresolved implementation choice is being silently assumed: the plan uses environment-reference credentials, app-global non-secret metadata, and GUI-owned child processes only.

## Parked (explicitly deferred)

- Governing-document authoring and approval must be completed through `kanmer-docs` before implementation.
- Programmatic OpenAI tunnel/app provisioning is excluded because the operator and workspace own it.
