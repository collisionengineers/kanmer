# Post-implementation report — CORE-126

## Exact identities

- Base: `c1bc3be8532150832328a6d7f62ecd94cdcf6220`
- Initial implementation head: `13938b440b37a67ddc27373138e14dd6a4daa395`
- First consolidated remediation head: `405a65c2736001de4adfa97f5b4a999f57348054`
- Root-cause remediation head: `8665908dd21dd282823161bbeadde272b3944474`
- Final settled-review remediation head: `4ef3c8170d9ae247cf8af04fc29981b31899a048`
- Pull request: collisionengineers/kanmer#306
- Branch/worktree: `core-126-batch-merge-path` / `.worktrees/core-126`

## Delivered

- Extended the existing protected merge gate from one representative ticket to an exact complete frozen batch roster while preserving ordinary single-ticket output and behavior.
- Captured roster-wide Review stage, questions, blockers, PR/head attestations, commit reachability, delivery target, and board-freshness evidence from one warning-free snapshot.
- Added a strict batch-specific pending/active/releasing sidecar. Declaration plus first take is recoverable by hash-bound roll-forward; active manifests retain the immutable roster; releasing clears only after every original member is terminal.
- Bound declaration recovery, later member take, renewal, and execution packets to the exact pair of the actual MCP request actor and a required durable nonempty `controller_run`.
- Required current lease CAS fields for every modern manifest-backed batch renewal and persisted the canonical trimmed controller-run identity; isolated compatibility behavior remains unchanged.
- Persisted batch worktree identity canonically relative to the repository and projected authoritative active/releasing state, complete membership, workspace, and immutable branch through final unlink.
- Refused out-of-repository batch workspaces with structured `LEASE_CONFLICT` evidence and zero writes.
- Made member-owned independent PASS review evidence mandatory for every plural-roster member in both strict and lenient repository modes; singular compatibility remains unchanged.
- Refused a new mixed delivery-target roster before any WAL or ticket write, and hard-failed mixed targets after declaration to cover policy drift or corrupted historical evidence.
- Bound the hosted PR head branch to the immutable manifest branch in both strict and lenient modes.
- Treated blockers inside the exact immutable roster as in-PR ordering while preserving external, dangling, and every single-ticket blocker rule.
- Kept terminal all-member release deliberately actor-neutral after implementation ownership ends, allowing a fresh closeout agent to converge an interrupted release.
- Updated execute/review/closeout, AGENTS, tool reference, glossary, generated manual, prose tests, and the shipped bundle.
- Added no tool, dependency, stage, format migration, service, database, provider abstraction, hand-written GUI behavior, secret work, or credential rotation.

## Consolidated review remediation

The initial exact-head review found three majors and one minor:

- F-001 fixed: actor plus durable controller-run authority survives every manifest phase and is exact-matched across controller operations.
- F-002 fixed: modern batch renewals cannot omit lease id or revision; refusal paths are byte-stable, and concurrent same-revision renewal yields one winner.
- F-003 fixed: list/search summaries retain the complete releasing manifest and shared Git path until unlink; a fresh closeout can recover.
- F-004 fixed: the report and canonical closeout contract no longer overclaim that terminal release is actor-bound.

The settled review at `405a65c2736001de4adfa97f5b4a999f57348054` found two further majors and one bounded residual:

- F-005 rejected-with-reason as a source-change requirement: concurrent stable-v0.3.12 mutation of candidate-created batch state violates the fixed promotion boundary. Candidate mutations are confined to copied/disposable boards; promotion backs up the board and stops stable before candidate control; rollback restores the backup.
- F-006 fixed at the identity root: portable repository-relative manifest worktrees replace host-absolute authority, including copied-board recovery, absolute-local retry, Windows case folding, and renewal healing.
- F-007 fixed only on the plural path: an exact-roster dependency is internal ordering; external and dangling dependencies and all singular behavior remain blocking.

The settled review at `8665908dd21dd282823161bbeadde272b3944474` found two additional majors, two P2 findings confirmed as major, and one minor:

- F-008 fixed: `BATCH_WORKSPACE_INVALID` now maps to structured `LEASE_CONFLICT`; MCP smoke proves the outside-root request changes no board bytes.
- F-009 fixed: absent, invalid, stale, wrong-PR/head, non-independent, or non-PASS plural member attestations are unconditional errors in strict and lenient modes. Singular warning compatibility is unchanged.
- F-010 fixed: renewal persists the already-normalized controller run. Core lifecycle and MCP transport regressions prove later member take, packet access, and terminal release remain consistent.
- F-011 fixed: declarations preflight one shared delivery target before WAL creation, while the merge gate defensively hard-fails mixed current targets in strict and lenient modes.
- F-012 fixed: `BatchState` retains the immutable manifest branch and the gate hard-fails a different hosted PR head branch in strict and lenient modes.

No additional blocker or major was identified by the independent review at `8665908dd21dd282823161bbeadde272b3944474`.

## Verification

Focused final-head evidence:

- 105 focused core tests: 75 claims plus 30 merge-gate tests
- all workspace typechecks
- 9 real check-pr CLI tests
- 362 standalone MCP smoke checks
- 157 repository script tests
- generated manual, AGENTS, documentation, and skill verification
- plugin source/bundle byte identity with the unchanged 41-tool roster
- `git diff --check`

Retained earlier non-passing fixture evidence:

- The first broader core run passed 683/694 and failed 11 merge-gate fixtures missing newly mandatory `controller_run`; the fixture was corrected without weakening assertions, then 694/694 passed.
- The first script rerun passed 156/157 because a negative fixture targeted a pre-wrap closeout sentence; its exact regression anchor was corrected, focused regressions passed 2/2, and the full rerun passed 157/157.
- The first final-remediation focused run passed all 75 claims tests but one of 30 merge-gate tests used a deliberately minimal phase-1 store double without `getBoard`. The double was completed to expose the real read-only policy dependency, then 30/30 passed.

The first remediation's authoritative Windows `npm run verify` passed at exact clean commit `405a65c2736001de4adfa97f5b4a999f57348054`.

A second authoritative Windows `npm run verify` passed at exact clean commit `8665908dd21dd282823161bbeadde272b3944474`: 700 core, 524 GUI, 171 MCP/integration, 157 scripts, 360 MCP smoke, and 50 protocol checks.

The final authoritative Windows `npm run verify` passed end to end from the clean worktree at exact commit `4ef3c8170d9ae247cf8af04fc29981b31899a048`: build; 704 core tests; 524 GUI tests; 171 MCP HTTP/integration tests; 157 script tests; 362 MCP smoke checks; 50 protocol checks; all typechecks; docs; headless/discovery; MCPB packaging; AGENTS verification; skill verification; and plugin byte identity. No overlapping full rail ran on this host.

## Acceptance correction

The plan originally named 39 tools. Exact base `c1bc3be8532150832328a6d7f62ecd94cdcf6220` already exposed 41, so acceptance was corrected before implementation. CORE-126 retains that 41-tool roster unchanged and proves source/bundle identity.

## Exact-head review focus

Review `4ef3c8170d9ae247cf8af04fc29981b31899a048` against the complete plan, then delta-check F-001 through F-012, the final changed lines, affected callers/contracts, and relevant tests. F-005 is the explicit fixed-boundary residual-risk disposition; every other finding is implemented and covered.
