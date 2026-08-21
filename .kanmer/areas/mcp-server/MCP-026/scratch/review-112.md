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

# Re-review update — PR #112 remediation

Date: 2026-08-21
Reviewed head f1027ae1fccf9d727e2f3b8459691142b4d379f2 (full PR #112, including b3b62f8 and dd52486c).

## Verdict

**PASS — prior blocking finding resolved.** PR #112 is mergeable from the MCP-026 security/protocol review. No proof or stage update was performed.

The earlier finding was that closeSession() used Promise.allSettled() and discarded transport/server close failures. f1027ae changes this to fail-visible Promise.all. rotateBearerVerifier() now observes a real close rejection, revokes the active verifier, and rethrows; the regression test patches the actual live session.server.close() and proves both old and replacement credentials fail closed. Async sweep/onclose paths catch and emit only redacted bounded diagnostics, and shutdown records close failure, forces socket cleanup, emits stopped, then rethrows the close error.

Checked again with no remaining finding: immutable verifier snapshots and digest zeroing; persistence before activation and old-verifier retention on persistence failure; protected token-file and Windows residual handling; raw CLI/env rejection; diagnostic redaction/aggregate auth failures; no tunnel/GUI/OAuth/dispatch/stdio/tool-surface/plugin source drift.

## Reproducible checks for f1027ae

- npm run test:http -w @kanmer/mcp-server — PASS, 10/10.
- npm run typecheck -w @kanmer/mcp-server — PASS.
- node packages/mcp-server/src/smoke-http.mjs — PASS.
- npm run test:http includes a fresh MCP-server build and standalone build — PASS.
- git diff --check origin/main...HEAD — PASS.
- PR #112 is OPEN and MERGEABLE at f1027ae1fccf9d727e2f3b8459691142b4d379f2.

Earlier broader rails remain recorded in this review: all-workspace build/typecheck, stdio 184/184, protocol 42/42, and discovery 13/13 passed; root npm test had unrelated Windows core timeout/ENOTEMPTY failures. No plugin files are in the PR diff and plugin:check was blocked only by linked-worktree dependency resolution.

PASS authorizes merging PR #112. Do not write proof or move ticket stages.

Merge record: PR #112 merged into main at 78e3faf14f9abfe2fe5cce0f38de3b72163489d6 (2026-08-21T12:58:43Z). No proof or ticket stage change performed.
