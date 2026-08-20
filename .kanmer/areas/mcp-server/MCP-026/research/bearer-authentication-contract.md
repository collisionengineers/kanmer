# Research — MCP-026 bearer authentication contract

## Governing sources

Implementation must re-check the accepted remote-access FRD/ADR, the pinned MCP SDK transport behavior, RFC 6750 bearer-token syntax, Node.js `crypto` APIs, and the repository's existing redaction/error conventions. The decisions below are the Kanmer product contract; they are intentionally narrower than a general OAuth resource server.

## Authentication boundary

Every request to the Streamable HTTP MCP endpoint requires application authentication:

- methods: `POST`, `GET`, and `DELETE` on `/mcp`;
- authentication occurs after basic path/method/origin rejection but **before** request-body parsing, MCP initialization, session lookup/creation, or tool discovery;
- missing, malformed, duplicated, unsupported-scheme, and incorrect credentials all return the same unauthenticated outcome;
- query parameters, cookies, URL user-info, MCP params, and custom fallback headers are never accepted as credentials;
- a health endpoint, if retained by MCP-025, remains loopback-only and returns no project/tool/session detail; it does not create an alternate MCP path.

The accepted header is one syntactically valid `Authorization: Bearer <opaque-token>` value. Scheme matching is ASCII case-insensitive; token bytes are treated as opaque and are never decoded as JWTs. Reject empty values, multiple authorization fields, embedded whitespace/control characters, and values above a small explicit maximum before hashing.

## Token format and entropy

Generate a token from at least 32 cryptographically random bytes using Node's `crypto.randomBytes`. Encode it as unpadded base64url. A human-readable prefix may be added only if it is fixed, documented, and excluded from entropy calculations; no semantic user/project data is embedded.

Version-1 has one active application token per remote-listener configuration. It represents possession authority for the full approved remote tool surface; it is not a user identity, OAuth access token, JWT, or fine-grained scope.

## Verifier design

The HTTP child does not need the raw token after startup. Store and compare a fixed-length verifier:

1. normalize only the wire encoding rules; do not trim arbitrary token content after parsing;
2. calculate SHA-256 over the presented UTF-8/ASCII token bytes;
3. compare the 32-byte candidate digest with the configured 32-byte expected digest using `crypto.timingSafeEqual`;
4. use a fixed dummy digest for malformed/missing values where helpful so the comparison path does not reveal credential state through obvious branching;
5. never compare raw strings with `===` or accept the configured digest itself as a bearer credential.

SHA-256 is suitable here because the underlying token has at least 256 bits of random entropy; the digest cannot be used directly to authenticate and an offline brute-force search is infeasible. Treat the digest as security-sensitive configuration anyway and redact it except for a short display fingerprint.

The principal returned to MCP-025 is opaque operational metadata, for example:

```ts
{
  kind: "bearer-token",
  tokenId: "remote-v1",
  fingerprint: "sha256:1a2b3c4d5e6f"
}
```

The fingerprint is a short non-secret prefix of the verifier digest for diagnostics only. Session binding uses stable `tokenId`/full internal verifier identity, not the display fingerprint.

## Unauthorized response

Use one deterministic HTTP response for missing/invalid credentials:

- status `401`;
- `WWW-Authenticate: Bearer realm="kanmer"` with no token-specific explanation;
- small JSON or empty response consistent with the accepted FRD/SDK integration;
- no project id, board path, session validity, tool name, expected digest, token fingerprint, or distinction between missing and wrong.

Disallowed Origin and unsupported method/path retain their own pre-auth status contract. An authenticated MCP protocol error remains a protocol response rather than an authentication response.

## Integration with sessions

MCP-025 binds each session to the opaque authenticated principal. MCP-026 must ensure:

- a session created under the active token cannot be used with a missing/wrong token;
- a token identity change invalidates all sessions bound to the previous verifier;
- authorization is re-evaluated on every POST/GET/DELETE request, not only initialization;
- session existence is never checked before authentication;
- auth failure does not refresh session activity or create state.

Version-1 has one active token, so rotation invalidates every active HTTP session and clients must reconnect and initialize.

## Secret delivery boundaries

Never place a raw token in:

- command-line arguments;
- public URL/query string;
- ordinary environment exported by GUI settings;
- JSON settings files;
- logs, diagnostics, crash annotations, activity, board docs, or MCP results;
- generated provider registrations.

The reusable authorizer accepts a verifier record, not a raw token. Supported acquisition paths are:

- GUI-managed: GUI-095 retrieves the raw token from operating-system credential storage, derives/passes the verifier to the child through protected local process control; the child does not receive persistent settings containing the token.
- Headless: a protected token file path or inherited secret channel is read once by startup code, validated, hashed into the verifier, and the raw buffer/reference is discarded. The path may appear in configuration; the token may not.

Do not make an unprotected raw-token environment variable the documented/default path. Do not claim Windows ACL security from POSIX mode bits; use platform-specific secure storage/ACL handling where the GUI owns persistence.

## Logging and observability

Emit structured events for authorization success/failure counts, rotation, verifier load failure, and session invalidation. Log only event type, timestamp, request correlation id, method/path, principal display fingerprint after success, and generic result. Never log the authorization header, raw token, full verifier, full session id, request body, ticket document content, or secret-file content.

Do not log every failed token candidate at high volume. Reuse MCP-025 request/concurrency limits and aggregate repetitive failures to avoid turning credential probing into log exhaustion.

## Tests

Required direct tests:

- generated token uses cryptographic randomness, expected encoding, and minimum entropy;
- exact valid header succeeds;
- scheme case variants behave according to RFC syntax;
- missing, empty, wrong scheme, duplicate header, embedded whitespace/control, oversized token, wrong token, token digest used as credential, query/cookie token all fail identically;
- candidate digests of differing original lengths still use fixed-length constant-time comparison;
- authorizer returns only opaque principal metadata;
- authorizer runs before body/session/tool handling;
- every MCP method re-authenticates;
- cross-token/session and post-rotation requests fail;
- unauthorized response and all logs are redacted;
- stdio path never invokes or requires HTTP authentication.

## Non-goals

- OAuth/OIDC, JWT validation, client registration, refresh tokens, per-user accounts, scopes, multiple simultaneous application tokens, grace-period rotation, remote dispatch, browser login, or tunnel-provider identity.
- Replacing project fingerprints, stage gates, document versions, or review/proof controls with possession of a token.
