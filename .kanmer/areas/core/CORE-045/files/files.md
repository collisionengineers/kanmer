# Files — CORE-045

## Change map

| Path | Change | Proof / risk |
|---|---|---|
| packages/core/src/io.ts | Add bounded stale-lock recovery with PID/liveness/age checks, injectable clock/liveness/retry seams, and fail-closed malformed/active-lock handling. | Core tests prove dead stale locks recover and active, malformed, fresh, and uncertain locks remain protected. |
| packages/core/src/io.test.ts | Add deterministic lock contention/recovery tests. | No sleeps or live process assumptions are needed; exact callback and lock cleanup outcomes are asserted. |
| packages/mcp-server/src/sources.ts | Complete dependency-free IPv4/IPv6 special-use and mapped-address classification while retaining DNS lookup before every fetch hop. | Source tests prove representative public, private, reserved, documentation, benchmark, multicast, IPv4-mapped, and IPv6 cases. |
| packages/mcp-server/src/sources.test.mjs | Extend injected lookup fixtures for all newly classified ranges and ensure a public address remains allowed. | The existing authoritative test:http rail executes these cases. |
| CORE-045 pipeline docs via MCP | Record the two finding dispositions, exact base, checks, report, and PR traceability. | get_doc_gates and the review handoff are read back before the one-stage move. |

## Context files

| Context | Constraint |
|---|---|
| docs/functional/frd/FRD-027-project-declared-sources.md | HTTPS, bounded retrieval, and public-destination/GUI preservation behavior must remain intact; no new source authority. |
| docs/architecture/adr/ADR-0020-project-declared-source-trust.md | Declarations are preference, not permission; fail closed at remote/cache boundaries. |
| CORE-044 post-implementation-report and scratch/review | F-003 and F-009 are the only scope; preserve CORE-044 behavior and its exact stacked base. |
| packages/core/src/io.ts and sources.ts | Reuse the existing core lock and source lookup seams; do not add a parallel cache or resolver. |
| package scripts and current source tests | Keep deterministic tests in the authoritative rails and preserve first failures. |

## Out of scope

No source schema, crawler, GUI editor, provider migration, dependency, remote transport redesign, live DNS probe, or cleanup/merge of CORE-044 is included.
