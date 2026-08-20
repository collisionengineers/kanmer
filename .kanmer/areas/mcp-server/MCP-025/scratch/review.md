# Review — MCP-025 PR #90

## Verdict

**NEEDS CHANGES — blocking. Do not merge.**

## Changes reviewed

- The PR extracts a canonical createKanmerMcpServer(policy) factory, preserves local stdio startup, and adds the named remote-http-v1 policy.
- It adds a native Node loopback-only Streamable HTTP host at /mcp, injected authorizer boundary, origin gate, bounded session/in-flight/body settings, session principal binding, TTL sweep, DELETE cleanup, shutdown, readiness payload, internal fail-closed CLI, and built smoke.
- No production bearer parser, token generator/storage/comparison/rotation, tunnel, GUI, remote dispatch, or plugin bundle modification was added. The CLI exits non-zero before binding without an MCP-026 authorizer.

## Checks

- PASS: npm run typecheck -w @kanmer/mcp-server.
- PASS: npm run smoke:http (including fail-closed CLI, no-authorizer/non-loopback refusal, 401/404/405, initialize, tools/list, cross-principal rejection, DELETE, malformed JSON, idempotent close).
- PASS: node packages/mcp-server/src/smoke-protocol.mjs — 30/30.
- PASS: node packages/mcp-server/src/smoke-discovery.mjs — 13/13.
- PASS: git diff --check origin/main...HEAD.
- PASS (scope): diff matches the FRD/ADR transport seam and deliberately leaves bearer lifecycle to MCP-026.

## Blocking comments

1. **Blocking — per-session server state is not isolated.** packages/mcp-server/src/index.ts retains one module-global mutable server. createKanmerMcpServer() reassigns it on each HTTP session, while helper and handler closures (for example client identity/capability/elicitation and resource update paths) continue to dereference that global. After session B initializes, work issued through session A can read B's client identity/capabilities, causing incorrect audit attribution and potentially wrong destructive-operation elicitation behavior. Stateful HTTP must not cross session client context.

   Disposition: filed [[MCP-031]] and linked it as a blocker of MCP-025. Fix with per-server captured state/context rather than the module-global server, plus a two-session regression that proves a session-A mutation after session-B initialization still attributes/uses session A.

## Non-blocking observations

- The remote exclusion set is currently empty because MCP-020 tools do not yet exist; the named centralized policy is adequate for this sequencing but its exact-difference regression remains deferred until those tools land.
- The PR report accurately records broader lifecycle/official-client coverage as follow-up work; that is not the reason for this block.

## Governing-doc and report alignment

The report honestly describes this as a fail-closed foundation and maps it to FRD-025/ADR-0017 without claiming MCP-026's bearer lifecycle. The implementation follows the no-new-bearer/no-tunnel boundaries. The missing per-session isolation violates the accepted stateful-session/principal-bound lifecycle intent and must be corrected before merge.

# Re-review — MCP-025 PR #90 after 0a484ce

## Verdict

**NEEDS CHANGES — do not merge or move.**

## MCP-031 remediation

**Pass.** Commit 0a484ce removes the module-global mutable MCP server. The factory now creates a function-local server and its write wrapper, actor fallback, take-ticket assignee fallback, and destructive confirmation capture that exact instance. The new HTTP smoke keeps sessions A and B live with different negotiated elicitation capabilities; after B initializes, A creates an item with activity actor http-smoke and successfully completes a destructive delete under A's no-elicitation context. This validates identity and destructive-capability isolation without module-global leakage.

Disposition: MCP-031 fixed in this PR; its blocker link was removed and the duplicate remediation ticket archived.

## Security and scope

**Pass.** The CLI exits non-zero before listener bind without a production authorizer. The host stays loopback-only and requires injected authorization. The diff contains no MCP-026 production bearer parsing, token storage/reference, constant-time comparison, generation, rotation, or bearer lifecycle behavior; test-only Bearer strings remain only in the smoke authorizer.

## Checks

- PASS: MCP server workspace typecheck.
- PASS: fresh built HTTP smoke, including the new two-session isolation regression.
- PASS: protocol smoke 30/30.
- PASS: discovery smoke 13/13.
- PASS: diff check.
- FAIL: fresh normal stdio smoke: 167/175, with 8 failures.

## Blocking comment

1. **Blocking — stdio identity/staleness regression caused by this PR.** The new multi-entry tsup config makes dist/index.js a loader which imports a generated chunk. Runtime identity is then derived from the chunk: server.path, hash, short hash, size, and build classification no longer describe the spawned index.js. Bundled-skill discovery also fails, so a stale AGENTS managed block becomes unknown and repo.upToDate remains true. These are not harmless linked-worktree assumptions: before this PR the one-entry build emitted the executable server directly, while this PR introduces the splitting change. The regression changes normal stdio get_status identity/staleness behavior and violates the report's stdio-compatibility claim.

Disposition: filed and linked blocker [[MCP-032]]. Repair the entry/identity/bundled-skill resolution and re-run the complete normal stdio smoke before merge.

No merge or stage move was performed.
