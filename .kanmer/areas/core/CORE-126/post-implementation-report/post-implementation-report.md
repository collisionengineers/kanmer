# Post-implementation report — CORE-126

## Exact identities

- Base: `c1bc3be8532150832328a6d7f62ecd94cdcf6220`
- Initial implementation head: `13938b440b37a67ddc27373138e14dd6a4daa395`
- Consolidated remediation head: `405a65c2736001de4adfa97f5b4a999f57348054`
- Pull request: collisionengineers/kanmer#306
- Branch/worktree: `core-126-batch-merge-path` / `.worktrees/core-126`

## Delivered

- Extended the existing protected merge gate from one representative ticket to an exact complete frozen batch roster while preserving ordinary single-ticket output and behavior.
- Captured roster-wide Review stage, question, blocker, PR/head attestation, commit reachability, target, and board-freshness evidence from one warning-free snapshot.
- Added a strict batch-specific pending/active/releasing sidecar. Declaration plus first take is recoverable by hash-bound roll-forward; active manifests retain the immutable roster; releasing clears only after every original member is terminal.
- Bound declaration recovery, later member take, renewal, and execution packets to the exact pair of the actual MCP request actor and a required durable nonempty `controller_run`.
- Required both current lease CAS fields for every modern manifest-backed batch renewal; isolated compatibility behavior remains unchanged.
- Projected authoritative active/releasing manifest state, complete members, workspace, and branch through final unlink, so a fresh closeout can recover even after every ticket-local projection is clear.
- Kept terminal all-member release deliberately actor-neutral after implementation ownership ends, allowing a fresh closeout agent to converge an interrupted release.
- Refused pending, malformed, overlapping, inconsistent, foreign-actor/run, unexpected-member, unsafe mutation, transfer, reconciliation, and deletion paths before unsafe writes.
- Updated execute/review/closeout, AGENTS, tool-reference, glossary, manual, prose tests, and the shipped bundle.
- Added no tool, dependency, stage, format migration, service, database, provider abstraction, hand-written GUI behavior, Infisical change, or credential rotation.

## Consolidated review remediation

The initial exact-head review found three majors and one minor:

- F-001 fixed: actor plus durable controller-run authority now survives every manifest phase and is exact-matched across every controller operation.
- F-002 fixed: modern batch renewals cannot omit lease id or revision; refusal paths are byte-stable, and concurrent same-revision renewal yields one winner.
- F-003 fixed: list/search summaries retain the complete releasing manifest and shared Git path until unlink; a fresh MCP closeout proves recovery.
- F-004 fixed: this report and the canonical closeout contract no longer overclaim that terminal release is actor-bound.

## Verification

Focused checks passed at the remediation source:

- `npm run build`
- 694 core tests, including 68 claim/transaction and 27 merge-gate tests
- 9 real check-pr tests
- 360 MCP smoke checks
- 50 protocol checks
- all workspace typechecks
- `npm run verify:skills`
- 157 script tests
- generated manual and documentation verification
- plugin source/bundle byte identity and isolated 41-tool handshake

Two non-passing fixture attempts are retained rather than erased:

- The first broader core run passed 683/694 and failed 11 merge-gate cases because their shared valid-batch fixture had not yet supplied the newly mandatory `controller_run`. The fixture was corrected without weakening assertions; the full rerun passed 694/694.
- The first script rerun passed 156/157 because an existing negative fixture still targeted a pre-wrap closeout sentence. Its exact regression anchor was corrected; the focused regressions passed 2/2 and the full script rerun passed 157/157.

The single authoritative Windows `npm run verify` rail then passed end to end from a clean worktree at exact commit `405a65c2736001de4adfa97f5b4a999f57348054`. It passed build, 694 core tests, 524 GUI tests, 171 MCP HTTP/integration tests, 157 script tests, 360 MCP smoke checks, 50 protocol checks, types, docs, headless/discovery, MCPB packaging, AGENTS verification, and plugin byte identity. No overlapping full rail ran on this host.

## Acceptance correction

The plan originally named 39 tools. Exact base `c1bc3be8532150832328a6d7f62ecd94cdcf6220` already exposed 41, so the durable plan was corrected before acceptance. CORE-126 retains that 41-tool roster unchanged and proves source/bundle identity.

## Delta-review focus

Review exact head `405a65c2736001de4adfa97f5b4a999f57348054` only for the four recorded findings, changed lines, affected callers/contracts, and relevant tests. The complete-roster gate, declaration WAL, isolated-ticket compatibility, and other already-passed areas are unchanged except where required by those findings.
