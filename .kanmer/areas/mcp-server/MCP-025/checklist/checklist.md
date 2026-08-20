# Checklist — MCP-025

## Contract and SDK

- [ ] Read the accepted remote-access FRD/ADR and record their actual paths/requirement ids.
- [ ] Inspect the exact pinned MCP TypeScript SDK version and matching Streamable HTTP API/examples.
- [ ] Confirm session header, protocol-version, POST/GET/DELETE, JSON/SSE, cancellation, and close semantics.
- [ ] Record whether the supported host adapter is native Node HTTP, Express, or another SDK-owned bridge.
- [ ] Stop and amend the plan if the pinned SDK cannot satisfy the accepted architecture without an upgrade.

## Shared server composition

- [ ] Extract/reuse one canonical MCP server/tool-registry factory.
- [ ] Keep handlers, schemas, errors, expected-project checks, root resolution, and document helpers single-sourced.
- [ ] Add exact named policies `local-stdio` and `remote-http-v1`.
- [ ] Preserve the complete local stdio tool set and schemas.
- [ ] Exclude only the exact approved background-dispatch ids remotely.
- [ ] Reject unknown exposure policies.
- [ ] Add local-schema regression and exact remote set-difference tests.

## Stdio compatibility

- [ ] Keep the existing stdio executable/provider command unchanged.
- [ ] Preserve stdout protocol purity and stderr logging.
- [ ] Preserve root/environment/signal behavior.
- [ ] Run source and built stdio protocol/discovery smokes before HTTP work proceeds.
- [ ] Regenerate the plugin only through the canonical main-checkout build if bundle bytes legitimately change.

## HTTP configuration and preflight

- [ ] Define one typed/defaulted HTTP configuration module or contract.
- [ ] Default to `127.0.0.1` and permit explicit `::1` only where supported.
- [ ] Permit port `0` for tests/parent allocation; validate explicit ports.
- [ ] Fix the endpoint to `/mcp`.
- [ ] Reject wildcard, LAN, hostname, and other non-loopback binds.
- [ ] Validate body/header/request/keepalive/session/concurrency/shutdown limits before binding.
- [ ] Validate present Origin against an explicit allowlist before authentication/body parsing.
- [ ] Permit absent Origin for non-browser MCP clients.
- [ ] Reject malformed/disallowed Origin generically and without CORS broadening.
- [ ] Do not trust arbitrary forwarded headers.

## Authorization boundary

- [ ] Require an injected authorizer before production host start.
- [ ] Invoke authorization before body parsing and session lookup.
- [ ] Return only an opaque principal/fingerprint to transport/session code.
- [ ] Use one generic unauthorized response path.
- [ ] Keep test authorizers in test code only.
- [ ] Define a session-invalidation hook for MCP-026 rotation.
- [ ] Add no token parsing, storage, comparison, or generation in this ticket.
- [ ] Prove production HTTP startup fails closed without an authorizer.

## Session lifecycle

- [ ] Follow the pinned SDK's server/transport ownership rules.
- [ ] Use cryptographically generated server/SDK session ids.
- [ ] Bind sessions to the opaque authenticated principal.
- [ ] Store only operational protocol state, never tokens/ticket content/project paths.
- [ ] Enforce total and per-principal session caps.
- [ ] Enforce bounded idle TTL and sweep.
- [ ] Enforce per-session/global in-flight limits.
- [ ] Reject malformed, unknown, expired, closing, and cross-principal sessions.
- [ ] Make close/disposal idempotent.
- [ ] Remove sessions on DELETE, SDK close, expiry, auth invalidation, and shutdown.
- [ ] Confirm no session survives process restart.

## `/mcp` routing

- [ ] Route exactly `/mcp`; return 404 elsewhere.
- [ ] Allow POST, GET, and DELETE only; return 405 with Allow header otherwise.
- [ ] Apply limits before expensive processing/tool dispatch.
- [ ] Run origin validation, authorization, session handling, then the official SDK handler.
- [ ] Let the SDK own JSON-RPC parsing, protocol negotiation, JSON/SSE framing, notifications, and cancellation.
- [ ] Require normal MCP initialization before tools.
- [ ] Release counters/resources on disconnect and cancellation.
- [ ] Keep HTTP/protocol errors outside Kanmer tool success envelopes.
- [ ] Reject any attempt to select a board/project/root from request data.

## One-project process and readiness

- [ ] Resolve one board/store before binding.
- [ ] Capture one immutable project id/fingerprint for process lifetime.
- [ ] Require authorizer configuration before listener creation.
- [ ] Bind loopback and determine the actual allocated port.
- [ ] Emit one parseable ready event only after project/auth/listener/session readiness.
- [ ] Include PID, host, port, local endpoint, project id/fingerprint, mode, auth-required, and supported protocol metadata.
- [ ] Exclude tokens, full session ids, document content, and arbitrary request data.
- [ ] Keep operational logs off protocol response streams.
- [ ] Start no tunnel and write no GUI settings.

## Shutdown and failure handling

- [ ] Implement one idempotent shutdown path for signals, parent request, startup rollback, and tests.
- [ ] Refuse new sessions while stopping.
- [ ] Stop accepting connections.
- [ ] Close/abort all sessions and wait only to the configured grace limit.
- [ ] Destroy remaining sockets/transports and clear timers/registry.
- [ ] Emit one redacted stopped event/reason.
- [ ] Use non-zero startup exit for invalid config/root/auth/bind failures.
- [ ] Bound diagnostic output.
- [ ] Prove repeated shutdown does not double-dispose or throw.

## Tests

- [ ] Test every configuration default and invalid value.
- [ ] Test absent/allowed/disallowed Origin ordering.
- [ ] Start a real loopback listener on port 0 with a disposable board and test authorizer.
- [ ] Initialize with the official MCP client transport.
- [ ] Compare local and remote tool sets exactly.
- [ ] Call at least one safe read/orientation tool and verify the project fingerprint.
- [ ] Test POST/GET/DELETE lifecycle supported by the SDK.
- [ ] Test 404, 405, malformed content, and protocol-version behavior.
- [ ] Test malformed/unknown/expired/cross-principal sessions.
- [ ] Test duplicate/concurrent initialization.
- [ ] Test total/per-principal session and in-flight caps.
- [ ] Test disconnect/cancellation resource release.
- [ ] Test idle expiry with a fake clock and one bounded real-TTL case.
- [ ] Test DELETE, expiry, invalidation, and shutdown each dispose once.
- [ ] Test idle, active, forced-timeout, and repeated shutdown.
- [ ] Assert logs/readiness contain no token, full session id, or document content.
- [ ] Assert request data cannot select another project.
- [ ] Assert no public listener/tunnel exists.

## Verification and artifacts

- [ ] Add a packaged HTTP smoke if unit integration does not exercise built output.
- [ ] Run existing stdio source and built smokes.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run the canonical HTTP smoke.
- [ ] Run `npm run verify`.
- [ ] Run Windows PR verification.
- [ ] If the stdio bundle changes, run canonical `plugin:build` then isolated `plugin:check` from the normal main checkout.
- [ ] Confirm provider registration still starts stdio.
- [ ] Run `git diff --check` and inspect status for fixture/session debris.
- [ ] Record SDK choice, endpoint, tool-set diff, lifecycle/limit/shutdown proof, and stdio compatibility in the post-implementation report.
- [ ] Stop before tunnel exposure or merge.
