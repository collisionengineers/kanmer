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

# Re-review — MCP-025 PR #90 after 987fe05

## Verdict

**PASS — merge approved.**

## Remediation verified

Commit 987fe05 disables ESM splitting for the MCP server's multiple entries. The rebuilt dist/index.js is again self-contained, so runtime self-identity and bundled-skill discovery resolve from the actual spawned entry rather than a generated chunk.

- PASS: fresh MCP workspace typecheck.
- PASS: fresh built standard stdio smoke, **175/175**. It verifies server path/hash/size/build shape and managed-block staleness discovery from the linked worktree.
- PASS: fresh HTTP smoke, including two independently negotiated sessions: session A keeps its own client identity and no-elicitation destructive capability after session B initializes.
- PASS: protocol smoke, 30/30.
- PASS: discovery smoke, 13/13.
- PASS: diff check.

The fail-closed CLI remains non-listening without an injected production authorizer. The PR remains transport-only: no MCP-026 bearer parsing, storage/reference, constant-time comparison, generation, rotation, or lifecycle code was added.

## Disposition

MCP-032 is fixed in this PR; its blocker link was removed and the remediation ticket archived. MCP-025 now satisfies the review evidence against FRD-025/ADR-0017's transport seam, preserving stdio compatibility and the no-bearer/no-tunnel boundaries.

# Independent review — MCP-025 PR #107 (2026-08-21)

## Changes reviewed

The PR adds the HTTP lifecycle test rail and hardening changes in `packages/mcp-server/src/http.ts`, wires it into `test:http`, bounds native Node HTTP header/body/connection/request/keep-alive/session/in-flight/TTL/shutdown settings, validates exact origins and UUID session ids, adds supported protocol metadata and one redacted stopped event, and adds official HTTP-client parity/concurrency/expiry/forced-shutdown tests. `http-cli.ts` now emits structured events and bounds fatal diagnostics. `index.ts` makes the ready fingerprint use the canonical project identity; the generated plugin bundle is refreshed from that legitimate shared-source change. No tunnel or bearer parsing/storage/comparison/generation/rotation implementation was added.

## Checks

- PASS — `npm run test:http -w @kanmer/mcp-server`: 6/6 tests.
- PASS — `npm run build`: core and MCP ESM/standalone builds.
- PASS — `node packages/mcp-server/src/smoke-http.mjs`.
- PASS — `node packages/mcp-server/src/smoke.mjs`: 184/184.
- PASS — `node packages/mcp-server/src/smoke-protocol.mjs`: 42/42.
- PASS — `node packages/mcp-server/src/smoke-discovery.mjs`: 13/13.
- PASS — `npm run typecheck`: exit 0 across all workspaces.
- PASS — `git diff --check origin/main...HEAD`.
- FAIL (unrelated/environmental, retained as a failure) — root `npm test`: core 255/255 and GUI 317/318; `apps/gui/src/main/kanmerGit.test.ts` failed `renameBoardBranch > keeps the history, the path and the remote consistent` with a 10s hook timeout and cleanup EPERM in `C:\Users\Alex\AppData\Local\Temp\kanmer-git-6wewS2`. The failure is outside this PR's files and was not counted as a pass.
- NOT RUN — `npm run plugin:check` is intentionally refused in a linked worktree; the generated artifact is committed and must be checked from normal merged main.
- UNAVAILABLE — `npm run verify` is not defined on this base, as recorded by the implementation report.

## Blocking comment

1. **Blocking — resolve/validate the project before binding.** `KanmerHttpHost.start()` calls `httpServer.listen()` and only then awaits `projectFingerprint()`. `projectFingerprint()` is the first operation that calls `resolveRoot()`, so the listener can bind before board/root resolution and fingerprint validation. A runtime probe from a temp cwd with no board produced `FAILED no Kanmer board found...` after the listener had already bound; closing the failed host left the temp directory busy until the orphaned listener/socket cleanup completed. This violates MCP-025 checklist #62, FRD-025 RA-PROJECT-1/2 startup sequencing, and the ADR lifecycle's resolve-before-bind contract; it also leaves an embedded host with a partial-start resource leak. Resolve/capture the immutable project before `listen()`, and make failed startup roll back listener/timer/socket state. Regression-test the no-board/fingerprint-failure path.

   Disposition: filed blocking review-follow-up ticket [[MCP-036]], which blocks MCP-025. No merge or stage move performed.

## Non-blocking observations

- The prior MCP-031 per-session identity/capability isolation and MCP-032 self-identifying stdio bundle fixes remain covered by the current two-session HTTP smoke and 184/184 stdio smoke.
- The remote exclusion set remains empty because MCP-020 dispatch tools are not present in this base; the named policy and exact parity test are appropriate for this sequencing.
- The implementation correctly leaves bearer lifecycle to MCP-026 and tunnel lifecycle to MCP-021.

## Verdict

**NEEDS CHANGES — do not merge PR #107 or move MCP-025 to Verifying until MCP-036 is fixed, independently reviewed, and verified.**

# Final independent re-review after MCP-036/MCP-037 — 2026-08-21

## Remediation disposition

MCP-036's project-before-bind fix and MCP-037's timer rollback fix are both present in the final transport branch at merge commit `d189cbc46bc440ee3d24b7045306bdfbe84997a7`. The no-board regression proves no listener, destroyed timer, and repeated-close safety. PR #108 is superseded by PR #109 and requires no separate merge.

## Final review scope

The combined branch preserves the canonical shared registry, loopback-only `/mcp`, injected fail-closed authorizer seam, exact origin/method/path checks, principal-bound sessions, bounded limits/expiry/disconnect/DELETE/shutdown behavior, readiness metadata, per-session isolation, stdio identity/plugin behavior, and the no-bearer/no-tunnel boundary.

## Final verdict

**PASS — merge PR #107 to main.**
