# Checklist — MCP-026

## Predecessor contract

- [ ] Read accepted remote-access FRD/ADR and requirement ids.
- [ ] Read MCP-025 implementation/tests/readiness/config/session/authorizer contracts.
- [ ] Confirm auth can run before body parsing and session lookup.
- [ ] Confirm stdio has no HTTP-auth import/config dependency.
- [ ] Reuse canonical logger/redactor/error/process patterns.
- [ ] Align headless/GUI boundaries with GUI-095 and DOC-013.

## Types and safe metadata

- [ ] Define immutable verifier, principal, success/failure, and safe metadata types.
- [ ] Define exactly one external 401/challenge builder.
- [ ] Define coded redacted local startup/lifecycle errors.
- [ ] Bound header/token/file sizes.
- [ ] Prevent default serialization of raw token/full verifier.

## Token generation

- [ ] Use `crypto.randomBytes` with at least 32 bytes.
- [ ] Encode unpadded base64url.
- [ ] Derive SHA-256 verifier.
- [ ] Derive short non-authorizing fingerprint.
- [ ] Create stable token/generation identity without project/user data.
- [ ] Return raw token only from explicit generation API.
- [ ] Keep deterministic entropy/time injection test-only.
- [ ] Test encoding, length, digest, fingerprint, uniqueness, and safe serialization.

## Header parsing and verification

- [ ] Accept exactly one standard Authorization header.
- [ ] Match Bearer scheme case-insensitively.
- [ ] Reject missing/empty/duplicate/extra/whitespace/control/non-ASCII/oversized/other-scheme values.
- [ ] Never accept query/cookie/custom fallback credentials.
- [ ] Hash exact candidate bytes with SHA-256.
- [ ] Decode/validate one exact 32-byte expected digest.
- [ ] Compare with `crypto.timingSafeEqual`.
- [ ] Use a fixed dummy comparison path for malformed/missing candidates where practical.
- [ ] Prove configured digest itself does not authenticate.
- [ ] Include no candidate/token in errors.
- [ ] Search code for prohibited raw string equality.

## Active verifier lifecycle

- [ ] Implement absent/active/revoked state.
- [ ] Fail production authorizer construction/start without active verifier.
- [ ] Snapshot one verifier generation per request.
- [ ] Return only opaque principal metadata.
- [ ] Validate replacement before rotation.
- [ ] Invalidate all prior-generation sessions.
- [ ] Fail safe/stop if activation and invalidation become ambiguous.
- [ ] Revoke closes sessions and disables auth.
- [ ] Test concurrent authorization, rollback, repeated rotation/revoke, and idempotency.
- [ ] Emit only redacted lifecycle events.

## Protected token-file generation

- [ ] Accept an output path, never token argument.
- [ ] Validate target/parent.
- [ ] Create exclusively without overwrite.
- [ ] Request/verify POSIX `0600` where meaningful.
- [ ] Write exactly token plus final newline.
- [ ] Flush/close before success.
- [ ] Remove only newly created partial file on failure.
- [ ] Print path/fingerprint only by default.
- [ ] Omit or explicitly gate any one-time reveal according to accepted manual.
- [ ] Test existing-file refusal, spaces, mode, partial cleanup, and redaction.

## Protected token-file loading

- [ ] Accept exactly one approved secret/verifier source.
- [ ] Reject conflicting sources.
- [ ] `lstat` and reject symlink/non-regular files.
- [ ] Use no-follow/open/fstat consistency checks where supported.
- [ ] Enforce bounded file size.
- [ ] Enforce POSIX ownership/mode policy.
- [ ] Implement honest Windows checks without false POSIX assurance.
- [ ] Require exactly one valid token value/optional final newline.
- [ ] Reject blank/multiline/whitespace/invalid encoding.
- [ ] Derive verifier, close descriptor, and clear mutable raw buffers best-effort.
- [ ] Return safe metadata only.
- [ ] Test symlink, non-regular, mode, race, size, encoding, and canary errors.

## HTTP integration

- [ ] Install real authorizer at MCP-025 boundary.
- [ ] Preserve route/method/origin/limit preflight order.
- [ ] Authenticate POST, GET, and DELETE independently.
- [ ] Return exact generic 401/challenge on failure.
- [ ] Prove failed auth invokes no body parser/session/MCP/tool code.
- [ ] Pass only opaque principal after success.
- [ ] Re-authenticate every session request.
- [ ] Reject cross-generation/token session use.
- [ ] Do not refresh session on failure.
- [ ] Keep health endpoint minimal and incapable of MCP use/state disclosure.

## CLI/process configuration

- [ ] Define mutually exclusive protected verifier sources and precedence.
- [ ] Forbid `--token` and raw-token settings/environment.
- [ ] Validate/load before listener creation.
- [ ] Remove raw material from mutable config after derivation.
- [ ] Keep argv/readiness/status/stderr secret-free.
- [ ] Include only approved auth-required/token-id/fingerprint metadata.
- [ ] Exit non-zero with coded redacted startup event on failure.
- [ ] Prove stdio ignores HTTP auth configuration.
- [ ] Test process argv/environment/output with canary token.

## Rotation/revocation

- [ ] Expose local parent/in-process rotation, not a remote MCP tool.
- [ ] Persist new protected secret before activation.
- [ ] Atomically replace verifier and invalidate sessions.
- [ ] Emit redacted rotation event.
- [ ] Prove old token/session fail immediately.
- [ ] Require fresh initialization with new token.
- [ ] Use transactional controlled restart if safe in-place rotation is unavailable.
- [ ] Revoke clears sessions/verifier without silently deleting user secret storage.
- [ ] Test persistence failure, invalidation failure, restart equivalent, and revoke.

## Redaction and security tests

- [ ] Reuse one allowlisted structured logger/redactor.
- [ ] Redact Authorization variants, token/secret/verifier/digest fields, file content, bearer canary, and full session ids.
- [ ] Never serialize arbitrary request/config/error objects.
- [ ] Aggregate repetitive auth failures.
- [ ] Scan ready/stopped/status/errors/stacks/logs/diagnostics/activity/MCP/board/process surfaces for canary.
- [ ] Test thrown secret-bearing errors.
- [ ] Test no/wrong/malformed/query/cookie/digest/duplicate credentials all fail identically.
- [ ] Test invalid auth before malformed/oversized body parsing.
- [ ] Test valid initialize/discovery/safe read.
- [ ] Test auth on every subsequent method.
- [ ] Test wrong token cannot probe/close a session.
- [ ] Test rotation and revocation end-to-end.
- [ ] Test limits cannot create auth/session/log exhaustion.
- [ ] Test project/write gates and remote dispatch exclusion remain.
- [ ] Test stdio source/built/provider behavior unchanged.

## Verification

- [ ] Update safe CLI help/config wording only.
- [ ] Confirm no MCP tool/reference/count change.
- [ ] Run auth unit tests.
- [ ] Run secret-file unit tests.
- [ ] Run HTTP integration tests.
- [ ] Run packaged HTTP smoke.
- [ ] Run stdio protocol/discovery smokes.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `npm run verify`.
- [ ] Run Windows PR verification.
- [ ] Rebuild/check plugin only if canonical stdio bytes intentionally changed.
- [ ] Run `git diff --check` and inspect status/temporary artifacts.
- [ ] Record format, source, test matrix, canary scan, Windows residual risk, and compatibility evidence.
- [ ] Stop before tunnel exposure or merge.
