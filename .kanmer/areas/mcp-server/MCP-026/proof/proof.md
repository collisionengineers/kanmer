# Proof — MCP-026

## Verified merge

- PR: #112 — https://github.com/collisionengineers/kanmer/pull/112
- Independent security/protocol review: PASS after remediation; reviewer merged the PR.
- Merged main commit: `78e3faf14f9abfe2fe5cce0f38de3b72163489d6` (2026-08-21).
- Verification was run from the normal main checkout at that merged commit. The implementation worktree was not used as proof.

## Passed merged-main evidence

| Command | Result |
|---|---|
| `npm run build` | PASS: core and MCP ESM/standalone artifacts built. |
| `npm run plugin:check` | PASS: 30 tools, bundle bytes match, 12 skill frontmatters, manifests v0.3.3, isolated handshake. |
| `npm run typecheck` | PASS: core, MCP server, UI, and GUI workspaces. |
| `npm test` | PASS: manual current; core **256/256**, GUI **318/318**, HTTP/auth **10/10**, scripts **66/66**. |
| `node packages/mcp-server/src/smoke-http.mjs` | PASS: built authenticated loopback HTTP/token CLI, pre-parse rejection, session binding, rotation/revocation, unsafe files, raw-argument rejection, and canary scan. |
| `node packages/mcp-server/src/smoke.mjs` | PASS: **184/184**; stdio tool surface and safety gates remain intact. |
| `node packages/mcp-server/src/smoke-protocol.mjs` | PASS: **42/42** across supported protocol versions. |
| `node packages/mcp-server/src/smoke-discovery.mjs` | PASS: **13/13** discovery cases. |
| `git diff --check` | PASS. |
| `git status --short` | Only the pre-existing untracked `skills-lock.json`; no generated token/board debris. |

## Security and scope confirmation

- Only one standard Authorization Bearer credential is accepted; verification uses SHA-256 fixed-length digests and `timingSafeEqual` before body/session/MCP handling for POST/GET/DELETE.
- Verifier snapshots are independent from caller buffers; replacement/revocation zero in-memory digests. Protected persistence precedes activation; transport/server close failures are visible, and rotation fails closed on incomplete invalidation.
- Token files are exclusive, bounded, regular, no-follow/fstat-checked, and POSIX-mode checked where meaningful. Raw tokens are absent from argv, URL/query, cookies, ordinary settings, readiness/status, diagnostics, board/MCP output, and provider registration surfaces exercised by the tests.
- Stdio/provider/plugin behavior is unchanged; `plugin:check` passed on normal main and no plugin bytes changed.
- No tunnel lifecycle, OAuth, GUI credential-store delivery, remote dispatch, or multi-token grace lifecycle was introduced; those remain [[MCP-021]], [[GUI-095]], and [[MCP-028]] scope.
- Windows verification ran locally; POSIX mode/symlink branches are platform-guarded and the report records the remaining Windows ACL/hosted-PR residual. `npm run verify` is not present (CORE-031).

## Review finding disposition

The initial review finding that `closeSession()` discarded close failures was fixed in `f1027ae`, covered by an actual `session.server.close()` failure regression, independently re-reviewed, and merged.
