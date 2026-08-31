# Post-implementation report — CORE-126

## Exact identities

- Base: `c1bc3be8532150832328a6d7f62ecd94cdcf6220`
- Initial implementation head: `13938b440b37a67ddc27373138e14dd6a4daa395`
- First consolidated remediation head: `405a65c2736001de4adfa97f5b4a999f57348054`
- Final root-cause remediation head: `8665908dd21dd282823161bbeadde272b3944474`
- Pull request: collisionengineers/kanmer#306
- Branch/worktree: `core-126-batch-merge-path` / `.worktrees/core-126`

## Delivered

- Extended the existing protected merge gate from one representative ticket to an exact complete frozen batch roster while preserving ordinary single-ticket output and behavior.
- Captured roster-wide Review stage, question, blocker, PR/head attestation, commit reachability, target, and board-freshness evidence from one warning-free snapshot.
- Added a strict batch-specific pending/active/releasing sidecar. Declaration plus first take is recoverable by hash-bound roll-forward; active manifests retain the immutable roster; releasing clears only after every original member is terminal.
- Bound declaration recovery, later member take, renewal, and execution packets to the exact pair of the actual MCP request actor and a required durable nonempty `controller_run`.
- Required both current lease CAS fields for every modern manifest-backed batch renewal; isolated compatibility behavior remains unchanged.
- Persisted batch worktree identity canonically relative to the repository, so pending recovery, active state, later member take, renewal, summaries, and request identity survive a copied or relocated checkout.
- Kept ticket-local host-absolute `lease_workspace` as non-authoritative compatibility evidence and healed it to the portable manifest identity on renewal.
- Projected authoritative active/releasing manifest state, complete members, portable workspace, and branch through final unlink, so a fresh closeout can recover even after every ticket-local projection is clear.
- Treated blockers inside the exact immutable batch roster as in-PR ordering while preserving external, dangling, and every single-ticket blocker rule.
- Kept terminal all-member release deliberately actor-neutral after implementation ownership ends, allowing a fresh closeout agent to converge an interrupted release.
- Refused pending, malformed, overlapping, inconsistent, foreign-actor/run, unexpected-member, unsafe mutation, transfer, reconciliation, deletion, and out-of-repository workspace paths before unsafe writes.
- Updated execute/review/closeout, AGENTS, tool reference, glossary, generated manual, prose tests, and the shipped bundle.
- Added no tool, dependency, stage, format migration, service, database, provider abstraction, or hand-written GUI behavior.

## Consolidated review remediation

The initial exact-head review found three majors and one minor:

- F-001 fixed: actor plus durable controller-run authority now survives every manifest phase and is exact-matched across every controller operation.
- F-002 fixed: modern batch renewals cannot omit lease id or revision; refusal paths are byte-stable, and concurrent same-revision renewal yields one winner.
- F-003 fixed: list/search summaries retain the complete releasing manifest and shared Git path until unlink; a fresh MCP closeout proves recovery.
- F-004 fixed: the report and canonical closeout contract no longer overclaim that terminal release is actor-bound.

The settled review at `405a65c2736001de4adfa97f5b4a999f57348054` found two further majors and one bounded residual:

- F-005 rejected-with-reason as a source-change requirement: concurrent stable-v0.3.12 mutation of candidate-created batch state violates the fixed promotion boundary. Candidate mutations are confined to copied/disposable boards; live promotion backs up the board and stops stable before candidate control; rollback restores the backup.
- F-006 fixed at the identity root: portable repository-relative manifest worktrees replace host-absolute authority, including pending and active relocation recovery, absolute-local retry, later member take, Windows case folding, and renewal healing.
- F-007 fixed only on the plural path: an exact-roster dependency is internal ordering; external and dangling dependencies and all singular behavior remain blocking.

## Verification

Focused final-head checks passed:

- 101 focused core tests: 73 claims plus 28 merge-gate tests
- `npm run build` and all workspace typechecks
- 9 real check-pr tests
- 360 MCP smoke checks and 50 protocol checks
- `npm run verify:skills` and 157 script tests
- generated manual, AGENTS, and documentation verification
- plugin source/bundle byte identity with the unchanged 41-tool roster
- `git diff --check`

Retained earlier non-passing fixture evidence:

- The first broader core run passed 683/694 and failed 11 merge-gate fixtures missing the newly mandatory `controller_run`; the fixture was corrected without weakening assertions, then 694/694 passed.
- The first script rerun passed 156/157 because a negative fixture targeted a pre-wrap closeout sentence; its exact regression anchor was corrected, focused regressions passed 2/2, and the full rerun passed 157/157.

The first remediation's authoritative Windows `npm run verify` passed at exact clean commit `405a65c2736001de4adfa97f5b4a999f57348054`.

After the root-cause changes, one new authoritative Windows `npm run verify` rail passed end to end from the clean worktree at exact commit `8665908dd21dd282823161bbeadde272b3944474`: build; 700 core tests; 524 GUI tests; 171 MCP HTTP/integration tests; 157 script tests; 360 MCP smoke checks; 50 protocol checks; typechecks; docs; headless/discovery; MCPB packaging; AGENTS verification; and plugin byte identity. No overlapping full rail ran on this host.

## Acceptance correction

The plan originally named 39 tools. Exact base `c1bc3be8532150832328a6d7f62ecd94cdcf6220` already exposed 41, so acceptance was corrected before implementation. CORE-126 retains that 41-tool roster unchanged and proves source/bundle identity.

## Delta-review focus

Review exact head `8665908dd21dd282823161bbeadde272b3944474` only for F-001 through F-007, the final changed lines, affected callers/contracts, and relevant tests. F-005 is the explicit fixed-boundary residual-risk disposition; F-006 and F-007 are the only source changes after `405a65c2736001de4adfa97f5b4a999f57348054`.
