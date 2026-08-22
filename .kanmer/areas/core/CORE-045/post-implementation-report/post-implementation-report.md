# Post-implementation report — CORE-045

## Outcome

CORE-045 remediates exactly the two independent CORE-044 review blockers and is ready for independent review. The branch is core-045-lock-dns-remediation in .worktrees/core-045, commit 1234264b292e574d38f276b91592ea0b8bef9361. It is based exactly on CORE-044 PR #165 head 33f32e3aae9819f1c2344863272dacb5c958fbac, not origin/main. PR #166 is stacked on core-044-source-fetch-remediation.

No merge, self-review, verify, or cleanup was performed. CORE-044 remains blocked by this linked ticket until independent review/merge.

## Scope and finding dispositions

- F-003 stale-lock recovery — FIXED. packages/core/src/io.ts now records PID/timestamp metadata, accepts only bounded test seams for age/clock/liveness/retry, and recovers a lock only when it is older than the conservative 30-second default and the owner PID is demonstrably dead. It re-reads before unlinking, preserves fresh/active/malformed/uncertain locks, handles legacy PID-only lock content, and keeps the existing bounded retry/error behavior. The original io.test.ts renameWithRetry, writeFileAtomic, and TMP_FILE_RE assertions were preserved unchanged; three deterministic lock tests were appended.
- F-009 complete public-destination classification — FIXED for the deterministic local contract. packages/mcp-server/src/sources.ts now classifies common and special-use non-global IPv4 ranges (including 192.0.0/24, 192.31.196/24, 192.52.193/24, 192.88.99/24, 192.0.2/24, 198.18/15, 198.51.100/24, 203.0.113/24, shared/private/link-local/loopback/unspecified/multicast), IPv6 unspecified/unique-local/link-local/multicast, documentation/benchmark/ORCHID/reserved blocks, IPv4-mapped IPv6 in dotted and hexadecimal form, and the 2001:0010::/28 and 2001:0020::/28 masks. DNS lookup remains before every root, redirect, and linked request; empty/failed lookup is rejected.

## Changed files

- packages/core/src/io.ts — bounded stale-lock metadata, liveness, age, race-safe re-read, and recovery.
- packages/core/src/io.test.ts — all inherited IO tests retained plus deterministic stale-lock tests.
- packages/mcp-server/src/sources.ts — dependency-free IPv4/IPv6 CIDR-family classifier and mapped conversion.
- packages/mcp-server/src/sources.test.mjs — deterministic special-use, mask, mapped, and public lookup cases.
- plugins/kanmer/mcp/kanmer-mcp.cjs — regenerated shipped bundle.

## Verification ledger

All recorded commands exited 0:

- npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts — 106/106; io.test includes 15 tests with all prior 12 coverage plus 3 lock tests.
- node --test packages/mcp-server/src/sources.test.mjs — 13/13.
- npm run test:http -w @kanmer/mcp-server — 81/81.
- npm run typecheck — all workspaces pass.
- npm run build:core, npm run build:server, npm run plugin:build — pass.
- npm run plugin:check — 37 tools, bundle bytes, 12 skill frontmatters pass.
- npm run test:scripts — 88/88.
- npm run smoke:protocol — 46/46; npm run smoke:discovery — 13/13.
- npm run verify:docs — pass; npm run verify:skills — pass; npm run verify:agents-block — 31/31.
- git diff --check — pass.

No first failure was hidden or overwritten. The prior CORE-044 full-rail environment-sensitive timeout is inherited context, not caused by this narrow change; the current authoritative HTTP rail is 81/81.

## Governing docs and evidence limits

FRD-027 remains satisfied: source retrieval stays bounded HTTPS/same-origin and remote destination checks fail closed. ADR-0020 remains satisfied: declarations remain preference-only and stale/uncertain lock ownership is never treated as permission. No live DNS rebinding, PID reuse, exact crash-point, or packaged-update proof is claimed; those boundaries remain INCONCLUSIVE and are parked in open-questions.

## Traceability

Base: 33f32e3aae9819f1c2344863272dacb5c958fbac (CORE-044 PR #165).
Implementation: 1234264b292e574d38f276b91592ea0b8bef9361.
PR: #166, core-045-lock-dns-remediation -> core-044-source-fetch-remediation.
