# Post-implementation report — MCP-025

## Status

Foundation implemented; **not review-ready**. The branch remains in Implementing because the ticket's 104-point checklist is deliberately not represented as complete.

## Delivered

- Extracted the existing canonical MCP registry into `createKanmerMcpServer(policy)`; stdio continues to create it with `local-stdio`.
- Added named `remote-http-v1` policy registration filtering. Its explicit excluded set is currently empty because MCP-020 dispatch tools do not exist yet.
- Added `KanmerHttpHost`, a native Node, loopback-only `/mcp` host using the pinned SDK 1.30.0 `StreamableHTTPServerTransport` in stateful mode.
- The host requires an injected authorizer before body parsing/session lookup, binds each SDK session to the returned opaque principal, enforces body/session/in-flight limits, TTL sweeps, DELETE cleanup, and idempotent close.
- Added a redacted machine-readable readiness payload (PID, loopback endpoint, short project fingerprint, remote mode, auth-required).
- Added the internal `kanmer-mcp-http` bin and a built `smoke:http` round-trip.

## Governing requirements covered

- FRD-025: RA-COMPAT-1/2, RA-PROJECT-1/2 (one process root), RA-TRANSPORT-1/2/3 foundation, RA-TRANSPORT-4/5 foundation, RA-SEC-1/2 foundation, RA-TOOLS-1/2 foundation.
- ADR-0017: canonical-registry, loopback, injected-auth boundary, and SDK-transport decisions.

## Verification

- `npm run typecheck -w @kanmer/mcp-server` — pass.
- `npm run smoke:http` — pass; asserts fail-closed constructor, non-loopback refusal, 401/404/405, SDK initialize, 30-tool list, cross-principal rejection, and DELETE.
- `node packages/mcp-server/src/smoke-protocol.mjs` — 30/30 pass across supported protocol versions.
- `node packages/mcp-server/src/smoke-discovery.mjs` — 13/13 pass before the final readiness adjustment.
- `git diff --check` — pass.
- Root `npm run typecheck` remains blocked by unrelated `packages/ui/src/demo.tsx`: its TicketDocsInfo mock lacks required `documentPaths`.

## Remaining work / handoff

- MCP-026 must supply the actual bearer authorizer. The CLI intentionally has no permissive fallback and therefore cannot serve an authenticated user by itself.
- Add full test coverage for malformed/expired/cancellation/timeout/in-flight/session-cap/shutdown cases and official client transport.
- Add the exact MCP-020 dispatch exclusions when its tools land.
- Regenerate/check the plugin artifact only through the normal main checkout after this branch is integrated; do not hand-edit it.
- Run Windows PR CI and the repository's root verification rail when its pre-existing UI type error is resolved.

## Changed files

- `packages/mcp-server/src/index.ts` — shared factory/policy/fingerprint.
- `packages/mcp-server/src/http.ts` — host and lifecycle.
- `packages/mcp-server/src/http-cli.ts` — fail-closed internal process entry.
- `packages/mcp-server/src/smoke-http.mjs` and package build scripts.

## 2026-08-21 follow-up

Commit `e59f37e` tightens transport-owned behavior: listener shutdown stops accepts before closing sessions, uses the configured bounded force-cleanup timer, and the built smoke now covers invalid port configuration, rejected Origin-before-auth behavior, malformed JSON, principal invalidation API, and idempotent repeated shutdown. MCP workspace typecheck, the built HTTP smoke, and stdio protocol smoke (30/30) pass again.

### Exact MCP-026 dependency

FRD-025 **RA-AUTH-1** requires a real `Authorization: Bearer <token>` verification for POST/GET/DELETE before parsing or session lookup. MCP-025 deliberately exposes only the injected `HttpAuthorizer -> { principal }` seam and must not parse, store, compare, generate, rotate, or log bearer material. Until MCP-026 provides that authorizer, the fail-closed CLI cannot serve a real authenticated client. This is the remaining cross-ticket blocker; no tunnel/GUI/public exposure has been added.

## Review-ready sequencing clarification

MCP-025 is review-ready as the first, fail-closed transport seam. The built production CLI now exits non-zero **before binding** when no production authorizer is configured; it no longer advertises a loopback endpoint backed by an always-denying placeholder. MCP-026 will later supply the bearer implementation through `HttpAuthorizer`; no bearer parsing/storage/token lifecycle exists here.

Rebased onto `origin/main` (current base `6dec9c5`), with commits `245656a`, `5ed4eda`, `878c99f`, and `24fed9c`. Focused verification after rebase: MCP typecheck; `npm run smoke:http`; discovery 13/13; protocol 30/30; `git diff --check`.

## MCP-031 remediation — 2026-08-21

Commit `0a484ce` removes the mutable module-global `McpServer` reference. `createKanmerMcpServer()` now creates a function-local server and its write wrapper closes over that exact instance; identity fallback, `take_ticket` assignee fallback, and destructive elicitation use the same request-server context. This prevents an HTTP session initialized later from changing another session's activity attribution or elicitation eligibility.

`smoke-http.mjs` now keeps two sessions live with different negotiated capabilities (Session B advertises elicitation). After B initializes, Session A successfully creates an item, its activity entry remains `http-smoke`, and its destructive `delete_item` call proceeds under A's no-elicitation context. This regression fails on the earlier shared-server implementation because A's write is attributed to B.

Verification after the remediation: `npm run typecheck -w @kanmer/mcp-server`, `npm run build:server`, `node packages/mcp-server/src/smoke-http.mjs`, and `npm run smoke:protocol` (30/30) pass; `git diff --check` passes. `node packages/mcp-server/src/smoke.mjs` reports 167/175: its eight failures are existing linked-worktree/build-artifact identity and bundled-skill-staleness assumptions (the tsup ESM entry delegates to a chunk and no bundled skill is discoverable from this worktree), not transport behavior. No MCP-026 bearer parsing, storage, comparison, generation, rotation, or lifecycle code was added.

MCP-025 remains in Review on PR #90; this change does not merge or move the ticket.
