# Research — MCP-026 token lifecycle and secret handling

## Lifecycle states

A remote credential has a small explicit lifecycle:

`absent → generated → active → rotated/revoked`

Only one verifier is active for one remote-listener configuration in version 1. A generated token is shown or written to its protected destination once. Kanmer must not offer a later “reveal from settings” operation unless GUI-095 retrieves it from the operating-system credential store under an explicit user action.

Recommended metadata, stored separately from the raw secret:

```yaml
kind: kanmer-remote-bearer
schema: 1
token_id: remote-v1
fingerprint: sha256:1a2b3c4d5e6f
created_at: 2026-08-20T12:00:00Z
rotated_at: null
```

The verifier record used by the server contains the full 32-byte digest in memory plus metadata. Ordinary settings persist only token id, display fingerprint, timestamps, and a credential-store/secret-file reference.

## Generation

Provide one testable helper that:

1. obtains 32 random bytes from `crypto.randomBytes`;
2. base64url-encodes without padding;
3. derives a SHA-256 verifier and short display fingerprint;
4. returns raw token plus verifier record to the immediate caller;
5. never logs either value;
6. allows deterministic randomness injection only in tests.

The generation API must make the secret-returning operation obvious in its type/name. Do not return the raw token from routine status or serialization methods.

## Protected headless token file

For a headless setup, support a narrowly defined token-file workflow rather than a raw command-line argument:

- generator creates a new file exclusively (`wx`) so an existing path is never overwritten;
- parent directory must already exist and be controlled by the user;
- POSIX file mode is `0600`; after open, verify regular-file identity and reject symlinks/non-regular files;
- bound file size and require exactly one token value with only the permitted encoding plus a final newline;
- startup reads once, derives verifier, closes the descriptor, and clears the mutable buffer best-effort;
- the HTTP process stores no file contents and status reports only the path classification/fingerprint, never the path when diagnostic policy considers it sensitive;
- deletion is an explicit operator action after clients and secure storage are configured, not an automatic surprise.

Windows does not enforce POSIX mode semantics reliably. The GUI path must use operating-system credential storage. A headless Windows file workflow must document ACL responsibility and perform available ownership/regular-file checks without claiming stronger protection than it has.

Do not follow a symlink supplied by an untrusted directory. When Node/platform support prevents an atomic no-follow open, use `lstat → open → fstat` consistency checks and document residual local-user race risk.

## GUI-managed storage boundary

GUI-095 owns platform credential persistence and UX. MCP-026 supplies reusable pure/process-safe primitives:

- generate token and verifier;
- validate/parse verifier metadata;
- create authorizer from verifier;
- rotate active verifier and notify session invalidation;
- serialize only non-secret metadata;
- load a protected headless token file.

Do not make the MCP package depend directly on Electron or one credential-store library. GUI code later adapts OS storage and passes a verifier or protected local IPC payload to the HTTP child.

## Process delivery

Preferred process-boundary options, in order:

1. inherited anonymous pipe/IPC carrying verifier configuration;
2. verifier file/descriptor readable only by the child/user;
3. environment containing the **verifier digest**, not the raw bearer token, if existing process orchestration cannot support IPC.

A verifier digest does not authenticate by itself, but still redact it and avoid exporting it into diagnostics. Never use `--token <raw-token>`.

The child must fail closed if verifier configuration is absent, malformed, wrong length/encoding, or duplicated across configuration sources. Configuration precedence must be explicit and must reject conflicting sources rather than silently choose one.

## Rotation

Rotation is an atomic application operation:

1. generate new token/verifier;
2. persist the new raw token to the selected protected destination successfully;
3. replace the in-memory active verifier in one operation;
4. invalidate all sessions attached to the old token id/verifier;
5. update non-secret metadata/fingerprint/timestamp;
6. emit one redacted rotation event;
7. remove/revoke the old protected secret reference where the owning layer can do so safely;
8. require every client to reconnect with the new token.

If protected persistence fails, retain the old verifier/session state and return failure. If verifier activation succeeds but session invalidation fails, fail safe: stop/restart the HTTP listener rather than leave ambiguous mixed authorization state. Version 1 has no dual-token grace period.

For a child-process deployment, a controlled listener restart with the new verifier is an acceptable implementation of steps 3–5 if readiness and rollback are transactional: the old healthy listener remains until the new secret is safely stored, and failure never leaves a public tunnel pointing to an unauthenticated/unknown listener.

## Revocation and stop

Stopping remote access closes sessions and removes the in-memory verifier. It does not silently delete the user's credential-store record; GUI/manual workflows offer explicit revoke/delete. Revocation without replacement disables HTTP startup and invalidates all sessions.

Project switching requires listener/tunnel restart and may reuse or rotate the credential only according to GUI policy. The token does not select or encode a project; project fingerprint remains a separate safety check.

## Redaction helper

Use a central redaction/safe-serialization helper for authentication configuration and errors. It must recognize:

- authorization headers and common case variants;
- fields named token, secret, credential, verifier, digest, rawToken;
- bearer-like token patterns in child stderr;
- token-file contents;
- full session ids.

Prefer allowlisted structured log fields over recursively logging arbitrary objects. Add canary-secret tests across success, startup failure, unauthorized request, rotation failure, thrown exceptions, child-process readiness, and diagnostic export.

## Error model

Separate external and internal errors:

- external request: generic 401 and `WWW-Authenticate` only;
- local operator/GUI: coded, actionable error such as `REMOTE_AUTH_MISSING`, `REMOTE_AUTH_INVALID_CONFIG`, `REMOTE_AUTH_SECRET_FILE_UNSAFE`, `REMOTE_AUTH_ROTATION_FAILED`, with no secret data;
- process exit: non-zero plus one redacted structured startup/stopped event.

Do not return authentication configuration through MCP tool success envelopes.

## Verification scenario

Using a disposable board and loopback port:

1. generate token to a protected temp file;
2. start HTTP host from its derived verifier;
3. prove no/wrong/query/cookie token fails before MCP parsing;
4. initialize and call a safe read with the raw token;
5. capture session id in the test harness;
6. rotate to a new token;
7. prove old token and old session fail, new token initializes;
8. inspect command line, environment snapshot exposed by test harness, logs, ready events, status objects, errors, and temp artifacts for a unique canary secret;
9. stop/revoke and prove startup fails closed without a verifier;
10. prove stdio remains unaffected.

## Non-goals

- Selecting a specific OS credential library in the MCP package.
- A cloud secret manager, key escrow, account recovery, token sharing service, multi-token support, or migration to OAuth.
- Treating a token as a project identifier or bypassing normal Kanmer write gates.
