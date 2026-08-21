# Review — MCP-026 PR #93

## Verdict

**PASS — merge approved.**

## Changes reviewed

- Adds a 32-byte base64url bearer generator, SHA-256 verifier, and fixed-length timing-safe authentication at the Streamable HTTP pre-body/session boundary.
- Adds exclusive, bounded token-file generation/loading with POSIX permission/symlink/regular-file/fstat checks; adds headless generation and HTTP CLI entries without raw-token arguments.
- Adds parent-only rotation/revocation with session invalidation and allowlisted redacted events. No remote MCP lifecycle tool, tunnel, GUI credential store, OAuth, or second registry is added.
- Wires the MCP auth/file rail into root npm test.

## Security review

- Authorization parsing accepts exactly one standard Bearer value; malformed, Basic, duplicate, digest, query, and cookie alternatives are rejected.
- Comparison hashes candidates and uses timingSafeEqual over SHA-256 digests. Raw tokens and digest values are non-enumerable in verifier serialization and are absent from tested CLI/event output.
- HTTP authentication remains before JSON body parsing, session lookup, MCP initialization, discovery, and tool execution, and applies to POST/GET/DELETE.
- Rotation changes the active verifier, invalidates sessions by old opaque principal, and revokes fail closed. If invalidation fails after replacement, it revokes rather than retaining ambiguous access.
- Token-file partial-write cleanup passed on this Windows review environment; the report accurately limits platform credential persistence and durable GUI rotation delivery to GUI-095.

## Checks

- PASS: MCP workspace typecheck.
- PASS: MCP auth/file rail, 3/3.
- PASS: built HTTP smoke, including child CLI, unsafe file cases, pre-parse rejection, two-session isolation, rotation/revocation, and redaction checks.
- PASS: standard stdio smoke, 175/175.
- PASS: protocol smoke, 30/30; discovery smoke, 13/13.
- PASS: root npm test includes the new MCP rail.
- PASS: git diff check.

## Residual scope

The report does not claim the unavailable root verify command, Windows PR CI, GUI OS credential persistence/delivery, tunnel lifecycle, or remote integration proof as complete; those belong to CORE-031, GUI-095, MCP-021, and MCP-028. No blocking discrepancy found.
