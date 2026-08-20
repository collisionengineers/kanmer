# Open questions — MCP-026

## Resolved decisions

- **What credential is accepted?** Exactly one opaque bearer token supplied in the standard `Authorization` header. No query, cookie, custom-header, Basic, JWT, or provider-identity fallback.
- **Minimum strength/encoding?** At least 32 cryptographically random bytes, encoded as unpadded base64url. Any fixed prefix carries no entropy.
- **How is it compared?** Hash the presented token with SHA-256 and compare the fixed 32-byte digest to the active verifier with `crypto.timingSafeEqual`; never compare raw strings or accept the verifier digest itself.
- **Does the HTTP child need the raw token?** No after startup. It authorizes against a verifier record containing the digest and opaque token identity.
- **When does authentication run?** After path/method/origin preflight but before body parsing, session lookup/creation, MCP initialization, discovery, or tool execution, on every POST/GET/DELETE.
- **What does failure reveal?** One generic 401 with `WWW-Authenticate: Bearer realm="kanmer"`; it does not reveal project/session/tool/token state or distinguish missing from wrong.
- **What principal is returned?** Opaque bearer-token metadata (`tokenId` plus internal verifier identity and short diagnostic fingerprint), never the token.
- **How many active tokens?** One per remote-listener configuration in version 1.
- **What happens on rotation?** New protected secret must persist first; active verifier changes atomically; all old sessions are invalidated; old token fails immediately; clients reconnect. No grace period.
- **What happens on revocation?** All sessions close and HTTP cannot start/continue without another valid verifier.
- **Where is the GUI token stored?** GUI-095 owns operating-system credential storage and retrieves it only for explicit use; the MCP package remains Electron-independent.
- **What is the headless path?** An explicitly selected protected token file or inherited secret channel. The file path may be configured; the raw token may not be an argument or ordinary setting.
- **Can a raw token be supplied through an environment variable?** Not as the documented/default path. A child may receive the non-authenticating verifier digest through protected process configuration when IPC is unavailable.
- **How is a token file created?** Exclusive create, bounded content, regular-file/symlink checks, POSIX `0600` where meaningful, no overwrite, with honest Windows ACL limitations.
- **May the generator print the token?** Default output is path and fingerprint only. Any one-time reveal/export must be explicit, intentional, non-logged, and aligned with DOC-013; routine status never reveals it.
- **Are auth failures rate-limited here?** Reuse MCP-025's bounded request/concurrency controls and aggregate logging. Do not trust tunnel forwarded IP headers or add a separate fragile lockout scheme in this ticket.
- **Does bearer possession bypass project/stage/document gates?** No. It grants access only to the approved remote tool surface; all existing safety contracts remain.
- **Does this ticket implement the tunnel or GUI?** No.
- **Does it rebuild the stdio plugin?** Only if a legitimate shared-source change alters canonical bytes; HTTP-only changes should not.

## Deferred explicitly

- `[deferred]` OAuth/OIDC, per-user identity, scopes, dynamic registration, refresh/revocation lists.
- `[deferred]` Multiple simultaneous application tokens or zero-downtime grace rotation.
- `[deferred]` Cloud secret managers/key escrow/account recovery.
- `[deferred]` Tunnel-provider access identity as a second principal.
- `[deferred]` Browser login/CORS workflow.

No unresolved implementation questions remain.
