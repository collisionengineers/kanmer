# GUI-116 open questions

## Resolved

- [x] Should reopen invoke native Grok/Antigravity installation automatically? No. Their plugins are user-scoped; automatic mutation is unsafe without an explicit user action and host proof.
- [x] How should stale native staged branch state be handled? Persist a per-project, per-provider reconnect requirement and show it in Settings until that provider is explicitly reconnected.
- [x] Which provider registration seam should reopen use? The existing provider-owned `reconcileProviderRegistration` helper for Codex, Claude, and OpenCode.

## Parked (explicitly deferred)

- [ ] Live Grok/Antigravity CLI availability, credentials, and hosted plugin proof — INCONCLUSIVE in this deterministic lane; verify through the explicit Connect flow on a real host.
- [ ] Automatic user-scoped native refresh — deferred because it would mutate external user/plugin state during project reopen and is not required by the ticket when explicit reconnect is clear.
