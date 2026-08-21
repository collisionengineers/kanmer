# Checklist — MCP-026

## Predecessor contract

- [x] Read accepted remote-access FRD/ADR and requirement ids.
- [x] Read MCP-025 implementation/tests/readiness/config/session/authorizer contracts; HTTP boundary and session contracts re-read on 2026-08-21.
- [x] Confirm auth can run before body parsing and session lookup.
- [x] Confirm stdio has no HTTP-auth import/config dependency.
- [x] Reuse canonical coded errors/process conventions and one HTTP allowlisted redactor (`http-diagnostics.ts`); no second logger or raw-object serializer.
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
- [x] Keep deterministic entropy injection test-only via the explicitly named `generateBearerTokenForTest`; production generation always calls `crypto.randomBytes`.
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
- [x] Test concurrent authorization, persistence rollback, repeated rotation/revoke, and idempotency (HTTP/auth unit and integration tests).
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
- [x] Return safe metadata only from token-file loading; the raw token is never returned by load/status/CLI paths.
- [x] Test symlink, non-regular, mode (POSIX), bounded size, encoding, cleanup, race-consistency code path, and canary errors; Windows mode/ACL residual is recorded.

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
- [x] Persist new protected secret before activation through the parent `persist` callback; persistence failure retains the old verifier and is tested.
- [x] Atomically replace verifier and invalidate sessions.
- [x] Emit redacted rotation event.
- [x] Prove old token/session fail immediately.
- [x] Require fresh initialization with new token.
- [x] Not applicable: the MCP-025 host has an in-process rotation owner; controlled restart equivalence is covered by fresh-host/session invalidation tests.
- [x] Revoke clears sessions/verifier without silently deleting user secret storage.
- [x] Test persistence failure, fail-safe invalidation failure, fresh-host restart equivalent, repeated revoke, and session revocation.

## Redaction and security tests

- [x] Reuse one allowlisted structured redactor (`http-diagnostics.ts`) for CLI and observer diagnostics.
- [x] Redact Authorization/Bearer variants, token/secret/verifier/digest fields, file content, bearer canaries, UUID session ids, and long opaque values.
- [x] Never serialize arbitrary request/config/error objects; HTTP events are allowlisted and thrown diagnostics pass through the redactor.
- [x] Aggregate repetitive auth failures into bounded first/32nd checkpoints while every request still returns the same generic 401.
- [x] Canary scan covers ready/stopped/security events, CLI stdout/stderr, error paths, HTTP responses, MCP results, and token/board process fixtures; no raw secret surface was observed.
- [x] Test thrown secret-bearing errors.
- [x] Test no/wrong/malformed/query/cookie/digest/duplicate credentials all fail identically.
- [x] Test invalid auth before malformed/oversized body parsing.
- [x] Test valid initialize/discovery/safe read.
- [x] Test auth on every subsequent method.
- [x] Test wrong token cannot probe/close a session.
- [x] Test rotation and revocation end-to-end.
- [x] Test request/session/in-flight caps plus bounded auth-failure checkpoints; invalid auth cannot create or refresh session state.
- [x] Protocol/discovery/HTTP tests confirm project resolution, normal write gates, and remote dispatch exclusion remain unchanged.
- [x] Test stdio source/built/provider behavior unchanged.

## Verification

- [x] Update safe CLI help/config wording only.
- [x] Confirm no MCP tool/reference/count change.
- [x] Run auth unit tests.
- [x] Run secret-file unit tests.
- [x] Run HTTP integration tests.
- [x] Run packaged HTTP smoke.
- [x] Run stdio protocol/discovery smokes.
- [x] Run `npm test`.
- [x] Run `npm run typecheck` — all workspaces pass on the implementation worktree.
- [x] Run `npm run build`.
- [x] `npm run verify` disposition recorded: script is not present in this repository (CORE-031 follow-up); no result is claimed.
- [x] Windows verification disposition recorded: local Windows build/typecheck/full tests pass; hosted PR/CI evidence remains the platform residual.
- [x] HTTP-only change leaves canonical stdio plugin bytes untouched; plugin check is reserved for merged normal-main verification.
- [x] Run `git diff --check` and inspect status/temporary artifacts.
- [x] Record format 3, source `mcp-026-bearer-auth-finish`, token-file source, negative/positive/rotation/revoke matrix, canary scan, Windows ACL residual, and stdio compatibility in the updated report.
- [x] Stop before tunnel exposure or merge.

## Closeout — MCP-026

- [x] PR merge verified (`gh pr view --json state,mergedAt`): PR #112 MERGED at `78e3faf14f9abfe2fe5cce0f38de3b72163489d6` — https://github.com/collisionengineers/kanmer/pull/112
- [x] proof.md finalised on merged main (PR #112 URL + merge commit `78e3faf` recorded)
- [x] Moved through Verifying to final stage
- [x] Outcome recorded in ticket body with PR #112, merged-main proof, and [[GUI-095]], [[MCP-021]], and [[MCP-028]] follow-ups
- [x] cd out of worktree; clean implementation worktree `.worktrees/mcp-026-finish` removed after verification
- [x] `git branch -d mcp-026-bearer-auth-finish` (merged branch deleted safely)
- [x] `git fetch --prune` + `git worktree prune` (remote branch deleted too)
- [x] `take_ticket action: "release"`
