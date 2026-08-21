# Checklist — MCP-026

## Predecessor contract

- [x] Read accepted remote-access FRD/ADR and requirement ids.
- [ ] Read MCP-025 implementation/tests/readiness/config/session/authorizer contracts.
- [x] Confirm auth can run before body parsing and session lookup.
- [x] Confirm stdio has no HTTP-auth import/config dependency.
- [ ] Reuse canonical logger/redactor/error/process patterns.
- [x] Align headless/GUI boundaries with GUI-095 and DOC-013.

## Types and safe metadata

- [x] Define immutable verifier, principal, success/failure, and safe metadata types.
- [x] Define exactly one external 401/challenge builder.
- [x] Define coded redacted local startup/lifecycle errors.
- [x] Bound header/token/file sizes.
- [x] Prevent default serialization of raw token/full verifier.

## Token generation

- [x] Use `crypto.randomBytes` with at least 32 bytes.
- [x] Encode unpadded base64url.
- [x] Derive SHA-256 verifier.
- [x] Derive short non-authorizing fingerprint.
- [x] Create stable token/generation identity without project/user data.
- [x] Return raw token only from explicit generation API.
- [ ] Keep deterministic entropy/time injection test-only.
- [x] Test encoding, length, digest, fingerprint, uniqueness, and safe serialization.

## Header parsing and verification

- [x] Accept exactly one standard Authorization header.
- [x] Match Bearer scheme case-insensitively.
- [x] Reject missing/empty/duplicate/extra/whitespace/control/non-ASCII/oversized/other-scheme values.
- [x] Never accept query/cookie/custom fallback credentials.
- [x] Hash exact candidate bytes with SHA-256.
- [x] Decode/validate one exact 32-byte expected digest.
- [x] Compare with `crypto.timingSafeEqual`.
- [x] Use a fixed dummy comparison path for malformed/missing candidates where practical.
- [x] Prove configured digest itself does not authenticate.
- [x] Include no candidate/token in errors.
- [x] Search code for prohibited raw string equality.

## Active verifier lifecycle

- [x] Implement absent/active/revoked state.
- [x] Fail production authorizer construction/start without active verifier.
- [x] Snapshot one verifier generation per request.
- [x] Return only opaque principal metadata.
- [x] Validate replacement before rotation.
- [x] Invalidate all prior-generation sessions.
- [x] Fail safe/stop if activation and invalidation become ambiguous.
- [x] Revoke closes sessions and disables auth.
- [ ] Test concurrent authorization, rollback, repeated rotation/revoke, and idempotency.
- [x] Emit only redacted lifecycle events.

## Protected token-file generation

- [x] Accept an output path, never token argument.
- [x] Validate target/parent.
- [x] Create exclusively without overwrite.
- [x] Request/verify POSIX `0600` where meaningful.
- [x] Write exactly token plus final newline.
- [x] Flush/close before success.
- [x] Remove only newly created partial file on failure.
- [x] Print path/fingerprint only by default.
- [x] Omit or explicitly gate any one-time reveal according to accepted manual.
- [x] Test existing-file refusal, spaces, mode, partial cleanup, and redaction.

## Protected token-file loading

- [x] Accept exactly one approved secret/verifier source.
- [x] Reject conflicting sources.
- [x] `lstat` and reject symlink/non-regular files.
- [x] Use no-follow/open/fstat consistency checks where supported.
- [x] Enforce bounded file size.
- [x] Enforce POSIX ownership/mode policy.
- [x] Implement honest Windows checks without false POSIX assurance.
- [x] Require exactly one valid token value/optional final newline.
- [x] Reject blank/multiline/whitespace/invalid encoding.
- [x] Derive verifier, close descriptor, and clear mutable raw buffers best-effort.
- [ ] Return safe metadata only.
- [ ] Test symlink, non-regular, mode, race, size, encoding, and canary errors.

## HTTP integration

- [x] Install real authorizer at MCP-025 boundary.
- [x] Preserve route/method/origin/limit preflight order.
- [x] Authenticate POST, GET, and DELETE independently.
- [x] Return exact generic 401/challenge on failure.
- [x] Prove failed auth invokes no body parser/session/MCP/tool code.
- [x] Pass only opaque principal after success.
- [x] Re-authenticate every session request.
- [x] Reject cross-generation/token session use.
- [x] Do not refresh session on failure.
- [x] Keep health endpoint minimal and incapable of MCP use/state disclosure.

## CLI/process configuration

- [x] Define mutually exclusive protected verifier sources and precedence.
- [x] Forbid `--token` and raw-token settings/environment.
- [x] Validate/load before listener creation.
- [x] Remove raw material from mutable config after derivation.
- [x] Keep argv/readiness/status/stderr secret-free.
- [x] Include only approved auth-required/token-id/fingerprint metadata.
- [x] Exit non-zero with coded redacted startup event on failure.
- [x] Prove stdio ignores HTTP auth configuration.
- [x] Test process argv/environment/output with canary token.

## Rotation/revocation

- [x] Expose local parent/in-process rotation, not a remote MCP tool.
- [ ] Persist new protected secret before activation.
- [x] Atomically replace verifier and invalidate sessions.
- [x] Emit redacted rotation event.
- [x] Prove old token/session fail immediately.
- [x] Require fresh initialization with new token.
- [ ] Use transactional controlled restart if safe in-place rotation is unavailable.
- [x] Revoke clears sessions/verifier without silently deleting user secret storage.
- [ ] Test persistence failure, invalidation failure, restart equivalent, and revoke.

## Redaction and security tests

- [ ] Reuse one allowlisted structured logger/redactor.
- [ ] Redact Authorization variants, token/secret/verifier/digest fields, file content, bearer canary, and full session ids.
- [ ] Never serialize arbitrary request/config/error objects.
- [ ] Aggregate repetitive auth failures.
- [ ] Scan ready/stopped/status/errors/stacks/logs/diagnostics/activity/MCP/board/process surfaces for canary.
- [x] Test thrown secret-bearing errors.
- [x] Test no/wrong/malformed/query/cookie/digest/duplicate credentials all fail identically.
- [x] Test invalid auth before malformed/oversized body parsing.
- [x] Test valid initialize/discovery/safe read.
- [x] Test auth on every subsequent method.
- [x] Test wrong token cannot probe/close a session.
- [x] Test rotation and revocation end-to-end.
- [ ] Test limits cannot create auth/session/log exhaustion.
- [ ] Test project/write gates and remote dispatch exclusion remain.
- [x] Test stdio source/built/provider behavior unchanged.

## Verification

- [x] Update safe CLI help/config wording only.
- [x] Confirm no MCP tool/reference/count change.
- [ ] Run auth unit tests.
- [ ] Run secret-file unit tests.
- [x] Run HTTP integration tests.
- [x] Run packaged HTTP smoke.
- [x] Run stdio protocol/discovery smokes.
- [x] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [ ] Run `npm run verify`.
- [ ] Run Windows PR verification.
- [ ] Rebuild/check plugin only if canonical stdio bytes intentionally changed.
- [x] Run `git diff --check` and inspect status/temporary artifacts.
- [ ] Record format, source, test matrix, canary scan, Windows residual risk, and compatibility evidence.
- [x] Stop before tunnel exposure or merge.
