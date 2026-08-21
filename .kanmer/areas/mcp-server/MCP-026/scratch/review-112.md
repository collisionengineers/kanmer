# Independent review — PR #112

Date: 2026-08-21
Reviewed revision: dd52486c093c8854e649dd1cc7e1e30b3c85d975 on mcp-026-bearer-auth-finish (commits b3b62f8, dd52486c), against MCP-026's full packet, MCP-025's transport/session contract, FRD-025, ADR-0017, and the EPIC-010/HZN-005/HZN-007 context.

## Verdict

**NEEDS CHANGES — do not merge PR #112.**

The verifier snapshot/zeroing, pre-activation persistence ordering (when the parent supplies persist), protected token-file checks, raw CLI/env rejection, redacted/bounded diagnostics, and stdio/tool-surface preservation are otherwise evidenced by the focused tests and diff.

## Finding

1. **Blocking — actual session-close failures are discarded, so the claimed fail-safe invalidation path is incomplete.**

In packages/mcp-server/src/http.ts, invalidatePrincipal() (lines 354–356) calls closeSession(), but closeSession() deletes the session and then awaits Promise.allSettled([session.transport.close(), session.server.close()]) (lines 383–389). A transport/server close rejection is therefore swallowed. rotateBearerVerifier()'s catch/revoke branch (lines 365–370) cannot observe that failure and can emit auth-rotated as if complete; revokeBearer() has the same blind spot. This does not satisfy MCP-026 plan §§6.52, 11.104/110, the complete session invalidation acceptance criterion, or the explicit stop/restart fail-safe rule when invalidation is ambiguous. Removing the map entry does not prove the underlying stream/server is closed.

The added test only monkeypatches invalidatePrincipal() itself to throw (HTTP test lines 347–355), bypassing the real closeSession() error path, so it does not cover this case.

**Disposition: NEEDS CHANGES.** Propagate/aggregate close failures from closeSession(); on rotation/revocation invalidation failure, keep authorization fail-closed and force the documented listener stop/restart (or equivalent coded failure), and add a test that makes the transport/server close reject and verifies no successful lifecycle event / no ambiguous listener remains.

## Checked with no additional finding

- BearerAuthorizer copies immutable verifier snapshots, compares fixed 32-byte SHA-256 digests with timingSafeEqual, and zeroes replaced/revoked copies.
- rotateBearerVerifier(..., { persist }) awaits persistence before replacement; persistence failure leaves the old verifier active. The callback is parent-controlled and not a remote MCP tool.
- Token files are exclusive, bounded, regular-file/symlink/identity/mode checked, and partial writes are cleaned; the Windows mode/ACL residual is documented rather than overstated.
- HTTP auth rejects raw CLI arguments and the documented raw-token environment names; diagnostics use the allowlisted redactor and bounded aggregate auth-failure events.
- No tunnel, GUI/OAuth, remote dispatch, second registry, or stdio/plugin source change is in the PR diff. Changed files are limited to HTTP auth/secret/diagnostic/CLI tests and smoke coverage.

## Reproducible checks

- npm run test:http -w @kanmer/mcp-server — PASS, 10/10.
- npm run typecheck -w @kanmer/mcp-server — PASS.
- node packages/mcp-server/src/smoke-http.mjs — PASS.
- npm run build — PASS (core + MCP server/standalone).
- npm run typecheck — PASS (all workspaces).
- node packages/mcp-server/src/smoke.mjs — PASS, 184/184.
- node packages/mcp-server/src/smoke-protocol.mjs — PASS, 42/42.
- node packages/mcp-server/src/smoke-discovery.mjs — PASS, 13/13.
- git diff --check origin/main...HEAD — PASS.
- Root npm test — FAIL in this Windows run, unrelated core timing/cleanup failures: migration idempotency timed out; concurrent ID allocation timed out with ENOTEMPTY cleanup; 254/256 core tests passed. The MCP HTTP rail itself passed.
- npm run plugin:check — not runnable from this linked ticket worktree; it refused because the workspace dependency resolved to the main checkout. git diff origin/main...HEAD -- plugins is empty, so no plugin artifact/source drift is present in this PR.

No merge was performed because of the blocking finding.
