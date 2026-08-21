# Post-implementation report — MCP-026

## Delivered

- Hardened the existing loopback Streamable HTTP bearer boundary with a 256-bit unpadded base64url token, SHA-256 fixed-length verifier, constant-time comparison, immutable verifier snapshots, and zeroing of replaced/revoked in-memory digests.
- Kept authentication before body parsing, MCP initialization, tool discovery, or session lookup for POST, GET, and DELETE; wrong/missing/malformed/query/cookie/duplicate credentials still produce one generic 401 challenge.
- Added a single allowlisted HTTP diagnostic redactor for CLI and observer failures, redacting bearer values, token/secret/verifier/digest fields, long opaque values, and full session IDs. Repetitive auth failures emit bounded aggregate checkpoints.
- Rejected raw-token CLI arguments and raw-token environment names instead of silently ignoring them. Protected token-file creation now verifies the opened regular file and effective POSIX mode after writing; loading retains lstat/no-follow/fstat identity, size, encoding, and permission checks.
- Added a parent-controlled rotation persistence callback. Protected persistence happens before activation; persistence failure retains the old verifier. Activation/invalidation failure revokes the active verifier (fail-closed). Repeated rotation/revoke remains idempotent.
- Added focused concurrent, persistence-rollback, fail-safe invalidation, redaction, aggregate-failure, unsafe-file, canary, and raw-argument tests. No tunnel, GUI credential-store dependency, OAuth, remote dispatch, or stdio tool change was introduced.

## Requirement coverage

This covers the MCP-owned bearer and headless secret boundary in FRD-025/ADR-0017, while preserving the predecessor HTTP/session contract and all existing project/write/document gates. GUI-095 remains the owner of OS credential persistence and GUI delivery; MCP-021 owns tunnel lifecycle; MCP-028 owns remote cross-component proof.

## Evidence

- `npm run test:http -w @kanmer/mcp-server` — **10/10 passed**.
- `node packages/mcp-server/src/smoke-http.mjs` — packaged loopback HTTP/token CLI smoke passed, including child startup, pre-parse auth, rotation/revoke, unsafe files, raw-argument rejection, and canary absence.
- `node packages/mcp-server/src/smoke-protocol.mjs` — **42/42 passed**.
- `node packages/mcp-server/src/smoke-discovery.mjs` — **13/13 passed**.
- `npm run build` — core and MCP ESM/standalone builds passed.
- `npm run typecheck` — core, MCP, UI, and GUI workspaces passed.
- `npm test` — after the documented build prerequisite, **core 256/256, GUI 318/318, HTTP 10/10, scripts 66/66** passed; manual check was current. The first clean-worktree attempt failed only because `test:scripts` imports `packages/core/dist` before a build; that failure is retained as verification history, then the exact command was rerun after `npm run build`.
- `git diff --check` — passed; no temporary token/board files remain.
- Canonical stdio plugin bytes were not changed by this HTTP-only diff; plugin check is intentionally reserved for normal-main merged verification because linked worktrees are not authoritative for that byte comparison.

## Platform and verification residuals

- Tests ran on Windows. POSIX mode/symlink assertions are guarded by platform; the implementation does not claim POSIX ACL semantics on Windows. Windows ACL/hosted PR evidence remains a CI/platform residual for the GUI-owned credential path.
- `npm run verify` is not present in this repository; CORE-031 owns that missing rail, so no result is claimed.

## Follow-up

- [[GUI-095]] consumes the verifier lifecycle through OS credential storage and GUI control.
- [[MCP-021]] supplies tunnel lifecycle.
- [[MCP-027]] adds diagnostics.
- [[MCP-028]] owns live remote cross-component proof.
