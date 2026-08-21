# Files — MCP-026

## Modify

| Path | Exact responsibility |
|---|---|
| `packages/mcp-server/src/http.ts` | Install the real bearer authorizer at the MCP-025 pre-body/session boundary; require it for every POST/GET/DELETE request; bind returned principal to sessions; expose a controlled verifier-rotation/session-invalidation hook; preserve origin/method/limit ordering and generic 401 behavior. |
| `packages/mcp-server/src/http-cli.ts` | Load exactly one approved verifier source, fail closed on absent/conflicting/unsafe configuration, start the HTTP host with the bearer authorizer, emit redacted readiness/failure events, and never accept a raw token command-line argument. Use the actual built/source entry convention established by MCP-025. |
| `packages/mcp-server/src/http-session-registry.ts` | Bind sessions to stable token identity, invalidate all prior-token sessions on rotation/revocation, recheck principal on every method, and ensure auth failure never touches/refreshes session state. |
| `packages/mcp-server/src/http-config.ts` | Add validated auth-verifier/secret-source configuration and explicit precedence/conflict rejection only if MCP-025 created this module. Do not store or serialize raw secrets. |
| `packages/mcp-server/src/http.test.mjs` | Extend real-loopback tests for all authentication, ordering, session binding, rotation, revocation, redaction, and stdio-isolation scenarios. Keep one canonical HTTP integration suite. |
| `packages/mcp-server/src/smoke-http.mjs` | Make the built HTTP smoke generate/load a temporary protected credential, prove negative and positive authentication, rotate/reconnect where the packaged interface supports it, and scan output for a canary secret. |
| `packages/mcp-server/package.json` | Expose/wire the safe remote-token generation command and HTTP-auth tests without altering the existing stdio default bin. Add no third-party authentication dependency unless the accepted architecture changes. |
| `package.json` | Ensure auth tests and built HTTP smoke are reached by the existing root test/verify rail exactly once. |
| `scripts/verify.mjs` | Inspect CORE-031 rail and add the canonical auth/HTTP smoke only if omitted; do not create a second verification pyramid. |
| `docs/functional/frd/FRD-025-remote-access.md` | Consume the accepted bearer requirements. Modify only through an approved documentation correction if implementation proves a conflict. Use the actual accepted filename if DOC-012 numbering changed. |
| `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` | Consume the accepted auth/secret-boundary decision; do not silently diverge. |

## Add

| Path | Purpose |
|---|---|
| `packages/mcp-server/src/http-auth.ts` | Pure/reusable bearer-header parser, fixed-length SHA-256 verifier model, constant-time authorizer, opaque principal type, generic challenge builder, rotation/revocation state, safe metadata/fingerprint serialization, and session-invalidation callback contract. It must have no Electron dependency. |
| `packages/mcp-server/src/http-auth.test.mjs` | Exhaustive unit tests for token generation/verifier, header variants, malformed/duplicate/oversized credentials, digest-as-token rejection, fixed-length comparison, principal/redaction, rotation rollback, and lifecycle. |
| `packages/mcp-server/src/http-secret.ts` | Protected headless token-file create/load/validate helpers: exclusive creation, bounded regular-file reads, POSIX mode handling, symlink/race checks where supported, verifier derivation, best-effort buffer clearing, and non-secret metadata only. Keep platform limitations explicit. |
| `packages/mcp-server/src/http-secret.test.mjs` | Temp-file tests for exclusive create, mode/regular-file/symlink/size/encoding checks, conflict sources, cleanup, Windows/POSIX branches, and canary-secret absence from errors/log serialization. |
| `packages/mcp-server/src/remote-token-cli.ts` | Explicit headless command that generates a new high-entropy token into a caller-selected protected file without overwriting, prints only path/fingerprint by default, and supports any one-time reveal/export behavior only through an explicit secure contract approved by DOC-012/DOC-013. Never pass or echo a token as a command argument. |

If MCP-025 established different canonical module names, extend those files and update this ticket's `files.md` before implementation rather than retaining duplicate HTTP/auth modules.

## Inspect / reuse

| Path | Reason |
|---|---|
| `packages/mcp-server/src/index.ts` | Shared server/tool registry; authentication remains transport middleware and does not enter individual tool handlers. |
| `packages/mcp-server/src/index.ts` | Stdio must remain independent of bearer configuration. |
| `packages/mcp-server/src/errors.ts` | Reuse coded local operator/startup error conventions while keeping external 401 generic. |
| `packages/mcp-server/src/root.ts` | One-project startup and fingerprint remain separate from possession credentials. |
| `packages/mcp-server/src/logging.ts` or existing logger/redaction helper | Reuse/extend one allowlisted structured logging boundary; do not add competing redactors. |
| `packages/mcp-server/src/smoke-protocol.mjs` | Preserve stdio protocol regression and prove no HTTP secret is required. |
| `packages/mcp-server/src/smoke-discovery.mjs` | Preserve local/remote tool exposure assertions from MCP-025. |
| `apps/gui/src/main/` settings/child-process/credential modules | GUI-095 will own OS credential persistence and process delivery. Inspect interface needs only; do not add Electron dependency here. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | HTTP-only modules should not affect the stdio plugin. Regenerate only if a legitimate shared-source change alters canonical bundle output. Never hand-edit. |
| `.github/workflows/pr.yml` | Confirm root verification exercises auth on Windows without printing secrets. No public tunnel test is required. |
| `docs/manual/` or canonical manual path | DOC-013 will document safe headless/GUI setup; do not create competing user instructions in code comments. |

## Exact contracts

- Token: at least 32 random bytes, unpadded base64url, opaque.
- Verifier: 32-byte SHA-256 digest plus stable token id and short display fingerprint.
- Wire credential: exactly one `Authorization: Bearer <token>` header.
- Unauthorized: generic 401 plus `WWW-Authenticate: Bearer realm="kanmer"` and no state leakage.
- Authorizer runs before body parse/session lookup on every POST/GET/DELETE.
- Session principal uses token identity/full verifier state, not short fingerprint.
- One active token in v1; rotation/revocation invalidates every old session.
- No raw token in argv, URL, cookies, ordinary settings, logs, ready/status events, MCP output, board docs, or provider registration.
- Headless token file is bounded, regular, non-overwritten, and protected as far as the platform can verify.
- GUI persistence remains owned by GUI-095/OS credential storage.

## Do not modify

- Add OAuth/OIDC/JWT/scopes/accounts/multiple active tokens/grace period.
- Treat tunnel-provider identity as application authentication.
- Put authentication in core or individual tools.
- Accept query/cookie/custom fallback credentials.
- Accept the verifier digest as a bearer token.
- Add a raw-token CLI argument or persistent plaintext GUI setting.
- Change stdio behavior/tool surface.
- Start a tunnel or implement GUI controls.
- Log/reveal secrets in tests, errors, activity, or diagnostics.
- Hand-edit generated plugin bytes.
