# Post-implementation report — MCP-021

## Scope delivered

Implemented the provider-neutral tunnel boundary and the Cloudflare Tunnel first adapter for the release-scoped named-credentials mode.

- The generic contract accepts only a validated loopback HTTP /mcp origin, canonical HTTPS hostname, opaque project/auth metadata, and bounded restart policy.
- Cloudflared uses an operator-provisioned credential file, a protected private runtime directory, an exact hostname ingress rule, terminal http_status:404 catch-all, loopback metrics/readiness, --no-autoupdate, direct shell:false spawning, minimal environment, bounded redacted diagnostics, owned process-tree shutdown, and cleanup on every terminal path.
- Supervisor recovery is bounded (1s→30s with ±20% jitter, five retries, five-minute stable reset), rejects overlapping attempts, cancels retry generations on stop, and ignores stale exits.
- Remote-host composition starts the authenticated loopback HTTP host first, validates its auth-required/project-fingerprint readiness, runs the required authenticated local verification callback before provider spawn, forwards only origin and non-secret generation metadata, keeps public verification unknown, supports origin invalidation, and closes HTTP sessions/listener before the tunnel.
- Local ingress validation invokes only documented cloudflared tunnel --config <PATH> ingress validate and exact-host ingress rule checks; no account, DNS, login, update, service, or board mutation is performed.

Quick Tunnels, remote-managed token mode, Access, account/DNS automation, Worker hosting, executable download/packaging, and public acceptance are explicitly outside this ticket. MCP-027 owns doctor and MCP-028 owns real public proof.

## Evidence

- npm test: PASS — core 256/256, GUI 318/318, MCP HTTP/tunnel suite 52/52, scripts 66/66; manual current.
- npm run build: PASS.
- npm run typecheck: PASS for every workspace.
- Built fake-provider smoke: PASS (fake provider, no public route).
- HTTP smoke: PASS.
- Protocol smoke: PASS 42/42.
- Discovery smoke: PASS 13/13.
- git diff --check: PASS; implementation worktree clean.
- Process/temp residue check: no cloudflared process and no remaining test runtime directory after cleanup.
- plugin:check is intentionally deferred to merged main: the linked worktree resolves @kanmer/core from the main checkout, and repository instructions require the plugin byte comparison from main. No canonical stdio source changed in this ticket.
- No real cloudflared executable was installed or invoked in the controlled environment; no Cloudflare account, DNS record, public tunnel, or public acceptance request was made.

## Traceability

Implementation commits on this branch include the provider-neutral adapter, fake provider, readiness/metrics, diagnostics, lifecycle and shutdown hardening, merged MCP-026 auth lifecycle fixes, ingress validation, and process-tree ownership. The final merge commit and reachable implementation SHAs will be recorded after independent review and merge.

## Review follow-up

Commit 88911daa wires the headless remote CLI to perform an authenticated local MCP initialize/DELETE handshake before provider spawn. The protected token is used only for that local request and is never passed to the adapter or emitted in status/diagnostics. Build, typecheck, and 10 targeted auth/HTTP/remote tests passed after this follow-up.

## Evidence correction

After the final supervisor/version hardening, the focused HTTP/tunnel suite is 52/52 (the repository npm test run immediately before these final review-only commits was 43/43). The additional targeted supervisor and adapter tests also pass; build and typecheck remain green.

## Independent review remediation

The first independent review identified four blocking gaps. Commit 97f626ec addresses all four: verifyLocal is required at the exported remote-host boundary; TunnelAdapter now exposes doctor/start/status/stop/diagnostics and Cloudflared implements doctor; IP literals are rejected as public hostnames; child error/forced-silent shutdown settles with a bounded fallback; and a loopback port lease is held through the spawn boundary with idempotent release. Focused suite after remediation: 52/52.

## Re-review remediation (f6c7d196)

- Rejected bracketed IPv6 public literals in both provider-neutral target validation and Cloudflared hostname validation.
- Reserved explicit and automatic metrics ports on loopback until the direct child spawn boundary; added collision/idempotence coverage.
- Wired production supervisor exit classification so Cloudflared exit 78 is terminal and not retried.
- Made adapter readiness checks transition `connected` → `degraded` → `connected`; added flap coverage.
- Added terminal-exit production-host and selected-port regression tests.
- `npm run test:http -w @kanmer/mcp-server`: PASS (52/52).

## Final evidence supersession (f6c7d196)

The final independent re-review passed at f6c7d196c8a317f999850a4e0df40a5a5c32880a. It supersedes earlier intermediate counts: focused HTTP/tunnel rail 52/52; clean root npm test core 256/256, GUI 318/318, MCP 52/52, scripts 66/66; build, all-workspace typecheck, remote/protocol/discovery smokes, and git diff --check all passed. The four prior blockers were independently confirmed closed.
