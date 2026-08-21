# Post-implementation report — MCP-026

## Delivered

- Added a 256-bit base64url bearer-token generator and a SHA-256 verifier with constant-time comparison. Verifier digests are non-enumerable, immutable in-process data; the routine metadata is only an opaque token id and a short fingerprint.
- Added a generic `401` / `WWW-Authenticate: Bearer realm="kanmer"` outcome before body parsing, MCP initialization, tool discovery, or session lookup for POST, GET, and DELETE.
- Added exclusive, bounded protected token-file creation/loading, POSIX permission checks, symlink/non-regular-file rejection, no-follow/fstat consistency, buffer clearing, and sanitised write errors.
- Added safe headless token generation and HTTP CLI entrypoints. They never take a raw token argument or print a raw token.
- Added local-parent-only rotation/revocation that invalidates sessions, fails closed on ambiguous lifecycle failure, and emits allowlisted lifecycle events without secret/session/body data.
- Added MCP auth/file unit rails and expanded the built HTTP smoke with real child-process startup, canary absence checks, credential rejection variants, rotation, revocation, rollback, and unsafe-file scenarios. Root `npm test` now includes the MCP rail.

## Requirement coverage

This covers FRD-025 RA-AUTH-1 through RA-AUTH-4 for the MCP-owned headless/process boundary, RA-SEC-1/2 at the HTTP boundary, and RA-COMPAT-1 by preserving the stdio server, protocol, and discovery paths. It deliberately does not add a tunnel, remote dispatch, GUI credential storage, OAuth, or a second authentication system.

## Evidence

- `npm run test:http -w @kanmer/mcp-server` — 3/3 unit tests passed.
- `npm run build:server && node packages/mcp-server/src/smoke-http.mjs` — pass; exercises built generator, listener CLI, pre-parse auth, session binding, rotation, revoke, and redaction.
- `node packages/mcp-server/src/smoke.mjs` — 175/175 passed.
- `npm run smoke:protocol` — 30/30 passed.
- `npm run smoke:discovery` — 13/13 passed.
- `npm run typecheck -w @kanmer/mcp-server` — passed.
- `npm test` exercised manual/core/GUI/MCP/script rails; core 255/255 and GUI 300/300 were green.
- `git diff --check` — passed.

## Review focus and residual evidence

- The root workspace typecheck still fails only at the pre-existing `@kanmer/ui src/demo.tsx` `TicketDocsInfo.documentPaths` mock mismatch; core, MCP, and GUI typechecks pass.
- `npm run verify` does not yet exist (CORE-031), and Windows PR evidence requires the PR/CI environment.
- GUI-095 owns OS credential persistence, protected GUI-to-child delivery, and durable rotation persistence. MCP-026 intentionally supplies the Electron-independent verifier/process primitives.
- The 21 remaining checklist entries call out these platform/integration boundaries plus further redaction/rate-limit evidence. They are not represented as passing evidence and should be assessed during review.

## Follow-up

- [[GUI-095]] consumes the verifier lifecycle through OS credential storage and GUI control.
- [[MCP-021]] supplies tunnel lifecycle.
- [[MCP-027]] adds doctor diagnostics.
- [[MCP-028]] owns real remote cross-component proof.
