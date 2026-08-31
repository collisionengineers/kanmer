# Post-implementation report — CORE-126

## Exact identities

- Base: `c1bc3be8532150832328a6d7f62ecd94cdcf6220`
- Implementation head: `13938b440b37a67ddc27373138e14dd6a4daa395`
- Pull request: collisionengineers/kanmer#306
- Branch/worktree: `core-126-batch-merge-path` / `.worktrees/core-126`

## Delivered

- Extended the existing protected merge gate from one representative ticket to an exact complete frozen batch roster while preserving ordinary single-ticket output and behavior.
- Captured roster-wide Review stage, question, blocker, PR/head attestation, commit reachability, target, and board-freshness evidence from one warning-free snapshot.
- Added a strict batch-specific pending/active/releasing sidecar. Declaration plus first take is recoverable by hash-bound roll-forward; active manifests retain the immutable roster; releasing clears only after every original member is terminal.
- Bound declaration, member admission, renewal, execution packets, and release to the real calling actor rather than copied visible owner fields.
- Refused pending, malformed, overlapping, inconsistent, foreign-actor, unexpected-member, unsafe mutation, transfer, reconciliation, and deletion paths before unsafe writes.
- Exposed batch identity in `list_items`, including archived members when requested, and updated execute/review/closeout, AGENTS, tool-reference, glossary, manual, prose tests, and the shipped bundle.
- Added no tool, dependency, stage, format migration, service, database, provider abstraction, or hand-written GUI behavior.

## Verification

Focused checks all passed:

- `npm run build`
- 693 core tests, including 67 claim/transaction and 27 merge-gate tests
- 9 check-pr tests
- 355 MCP smoke checks
- 50 protocol checks
- all workspace typechecks
- `npm run verify:skills`
- 156 script tests
- generated manual and documentation verification
- plugin source/bundle byte identity and isolated handshake

The single authoritative Windows `npm run verify` rail passed end to end at the exact implementation head. It additionally passed 524 GUI tests, 171 MCP HTTP/integration tests, headless/discovery checks, MCPB packaging, AGENTS block verification, and the remaining repository verification surfaces. No overlapping full rail ran on this host.

## Acceptance correction

The plan originally named 39 tools. Exact base `c1bc3be8532150832328a6d7f62ecd94cdcf6220` already exposed 41, so the durable plan was corrected before acceptance. CORE-126 retains that 41-tool roster unchanged and proves source/bundle identity.

## Review focus

Review the exact PR head for complete-roster fail-closed behavior, interruption convergence at every declaration/release boundary, actual-actor authorization, preservation of isolated-ticket compatibility, and deterministic single-ticket versus batch gate output.
