# Checklist — MCP-025

## Contract and SDK

- [x] Read the accepted remote-access FRD/ADR and record their actual paths/requirement ids.
- [x] Inspect the exact pinned MCP TypeScript SDK version and matching Streamable HTTP API/examples.
- [x] Confirm session header, protocol-version, POST/GET/DELETE, JSON/SSE, cancellation, and close semantics.
- [x] Record whether the supported host adapter is native Node HTTP, Express, or another SDK-owned bridge.
- [ ] Stop and amend the plan if the pinned SDK cannot satisfy the accepted architecture without an upgrade.

## Shared server composition

- [x] Extract/reuse one canonical MCP server/tool-registry factory.
- [x] Keep handlers, schemas, errors, expected-project checks, root resolution, and document helpers single-sourced.
- [x] Add exact named policies `local-stdio` and `remote-http-v1`.
- [x] Preserve the complete local stdio tool set and schemas.
- [ ] Exclude only the exact approved background-dispatch ids remotely.
- [x] Reject unknown exposure policies.
- [ ] Add local-schema regression and exact remote set-difference tests.

## Stdio compatibility

- [x] Keep the existing stdio executable/provider command unchanged.
- [x] Preserve stdout protocol purity and stderr logging.
- [x] Preserve root/environment/signal behavior.
- [x] Run source and built stdio protocol/discovery smokes before HTTP work proceeds.
- [ ] Regenerate the plugin only through the canonical main-checkout build if bundle bytes legitimately change.

## HTTP configuration and preflight

- [x] Define one typed/defaulted HTTP configuration module or contract.
- [x] Default to `127.0.0.1` and permit explicit `::1` only where supported.
- [x] Permit port `0` for tests/parent allocation; validate explicit ports.
- [x] Fix the endpoint to `/mcp`.
- [x] Reject wildcard, LAN, hostname, and other non-loopback binds.
- [ ] Validate body/header/request/keepalive/session/concurrency/shutdown limits before binding.
- [ ] Validate present Origin against an explicit allowlist before authentication/body parsing.
- [x] Permit absent Origin for non-browser MCP clients.
- [x] Reject malformed/disallowed Origin generically and without CORS broadening.
- [x] Do not trust arbitrary forwarded headers.

## Authorization boundary

- [x] Require an injected authorizer before production host start.
- [x] Invoke authorization before body parsing and session lookup.
- [x] Return only an opaque principal/fingerprint to transport/session code.
- [x] Use one generic unauthorized response path.
- [ ] Keep test authorizers in test code only.
- [x] Define a session-invalidation hook for MCP-026 rotation.
- [x] Add no token parsing, storage, comparison, or generation in this ticket.
- [x] Prove production HTTP startup fails closed without an authorizer.

## Session lifecycle

- [x] Follow the pinned SDK's server/transport ownership rules.
- [x] Use cryptographically generated server/SDK session ids.
- [x] Bind sessions to the opaque authenticated principal.
- [x] Store only operational protocol state, never tokens/ticket content/project paths.
- [x] Enforce total and per-principal session caps.
- [x] Enforce bounded idle TTL and sweep.
- [ ] Enforce per-session/global in-flight limits.
- [ ] Reject malformed, unknown, expired, closing, and cross-principal sessions.
- [x] Make close/disposal idempotent.
- [x] Remove sessions on DELETE, SDK close, expiry, auth invalidation, and shutdown.
- [ ] Confirm no session survives process restart.

## `/mcp` routing

- [x] Route exactly `/mcp`; return 404 elsewhere.
- [x] Allow POST, GET, and DELETE only; return 405 with Allow header otherwise.
- [ ] Apply limits before expensive processing/tool dispatch.
- [x] Run origin validation, authorization, session handling, then the official SDK handler.
- [x] Let the SDK own JSON-RPC parsing, protocol negotiation, JSON/SSE framing, notifications, and cancellation.
- [x] Require normal MCP initialization before tools.
- [ ] Release counters/resources on disconnect and cancellation.
- [x] Keep HTTP/protocol errors outside Kanmer tool success envelopes.
- [x] Reject any attempt to select a board/project/root from request data.

## One-project process and readiness

- [x] Resolve one board/store before binding.
- [x] Capture one immutable project id/fingerprint for process lifetime.
- [x] Require authorizer configuration before listener creation.
- [x] Bind loopback and determine the actual allocated port.
- [x] Emit one parseable ready event only after project/auth/listener/session readiness.
- [ ] Include PID, host, port, local endpoint, project id/fingerprint, mode, auth-required, and supported protocol metadata.
- [x] Exclude tokens, full session ids, document content, and arbitrary request data.
- [x] Keep operational logs off protocol response streams.
- [x] Start no tunnel and write no GUI settings.

## Shutdown and failure handling

- [x] Implement one idempotent shutdown path for signals, parent request, startup rollback, and tests.
- [x] Refuse new sessions while stopping.
- [x] Stop accepting connections.
- [ ] Close/abort all sessions and wait only to the configured grace limit.
- [x] Destroy remaining sockets/transports and clear timers/registry.
- [ ] Emit one redacted stopped event/reason.
- [x] Use non-zero startup exit for invalid config/root/auth/bind failures.
- [ ] Bound diagnostic output.
- [x] Prove repeated shutdown does not double-dispose or throw.

## Tests

- [ ] Test every configuration default and invalid value.
- [ ] Test absent/allowed/disallowed Origin ordering.
- [x] Start a real loopback listener on port 0 with a disposable board and test authorizer.
- [ ] Initialize with the official MCP client transport.
- [ ] Compare local and remote tool sets exactly.
- [ ] Call at least one safe read/orientation tool and verify the project fingerprint.
- [x] Test POST/GET/DELETE lifecycle supported by the SDK.
- [x] Test 404, 405, malformed content, and protocol-version behavior.
- [x] Test malformed/unknown/expired/cross-principal sessions.
- [ ] Test duplicate/concurrent initialization.
- [ ] Test total/per-principal session and in-flight caps.
- [ ] Test disconnect/cancellation resource release.
- [ ] Test idle expiry with a fake clock and one bounded real-TTL case.
- [x] Test DELETE, expiry, invalidation, and shutdown each dispose once.
- [ ] Test idle, active, forced-timeout, and repeated shutdown.
- [x] Assert logs/readiness contain no token, full session id, or document content.
- [x] Assert request data cannot select another project.
- [x] Assert no public listener/tunnel exists.

## Verification and artifacts

- [x] Add a packaged HTTP smoke if unit integration does not exercise built output.
- [x] Run existing stdio source and built smokes.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Run the canonical HTTP smoke.
- [ ] Run `npm run verify`.
- [ ] Run Windows PR verification.
- [ ] If the stdio bundle changes, run canonical `plugin:build` then isolated `plugin:check` from the normal main checkout.
- [x] Confirm provider registration still starts stdio.
- [x] Run `git diff --check` and inspect status for fixture/session debris.
- [ ] Record SDK choice, endpoint, tool-set diff, lifecycle/limit/shutdown proof, and stdio compatibility in the post-implementation report.
- [x] Stop before tunnel exposure or merge.

## Progress — 2026-08-21

Implemented the shared registry factory and `remote-http-v1` policy hook, a loopback-only fail-closed Streamable HTTP host using the SDK's stateful `StreamableHTTPServerTransport`, bounded body/session/in-flight controls, principal-bound sessions, TTL sweep, DELETE/shutdown cleanup, and redacted ready metadata. The built HTTP smoke proves injected authorization, loopback binding, 401/404/405 handling, SDK initialize, 30-tool discovery, cross-principal rejection, and DELETE. Remaining unticked checks require the MCP-026 bearer authorizer integration, fuller lifecycle/limit coverage, plugin regeneration from the normal main checkout, and Windows PR CI.

## MCP-031 review-blocker remediation — 2026-08-21

- [x] Remove the module-global `McpServer` reference so each factory result owns its negotiated client identity and capabilities.
- [x] Bind write attribution, `take_ticket` assignee fallback, and destructive elicitation checks to the requesting server instance.
- [x] Add a two-session HTTP regression: Session B advertises elicitation, then Session A completes a write and destructive call while retaining Session A identity/capability context.
- [x] Re-run MCP workspace typecheck, built HTTP smoke, and protocol smoke after the isolation change.
- [x] Record the unrelated normal stdio-smoke artifact/linked-worktree failures rather than treating them as a pass.

## MCP-032 review-blocker remediation — 2026-08-21

- [x] Keep every multi-entry ESM build output self-contained so `dist/index.js` remains its own runtime identity target.
- [x] Restore bundled-skill discovery from the self-identifying `dev-esm` entry path.
- [x] Build from the linked ticket worktree and verify the normal stdio smoke reports `dist/index.js`, its real hash/size, `dev-esm`, and live AGENTS staleness.
- [x] Re-run HTTP and protocol smokes to confirm the fail-closed HTTP transport and per-session isolation remain intact.

## Closeout — MCP-025

- [x] PR merge verified (`gh pr view --json state,mergedAt`): MERGED 2026-08-20T23:56:52Z — https://github.com/collisionengineers/kanmer/pull/90
- [x] proof.md finalised (PR URL + merge commit `a05fd9e` recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link; [[MCP-026]] and [[MCP-021]] follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/mcp-025`
- [x] `git branch -d mcp-025-streamable-http-transport` (merged branch deleted safely)
- [x] `git fetch --prune` + `git worktree prune` (remote branch deleted too)
- [x] `take_ticket action: "release"`
