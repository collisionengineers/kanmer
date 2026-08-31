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


## Final complete-roster evidence remediation

The exact-head automated review at `4ef3c8170d9ae247cf8af04fc29981b31899a048` and the fresh independent reviewer identified four remaining major manifestations of one invariant: every frozen member must carry its own current execution, PR, workspace-acquisition, and review evidence.

- F-013 fixed: each plural attestation now exact-matches the member's current ticket `updated` value and plan-document version. Missing, stale, or padded values are hard `STALE_REVIEW` failures under strict and lenient policy; singular compatibility is unchanged.
- F-014 fixed: a consistent untaken sibling packet truthfully retains `taken: null` while projecting the immutable manifest branch and portable worktree through ticket, claim, batch, and compiled-step workspace fields. The exact actor/controller run can then take that location.
- F-015 fixed: every plural member's stored `prs` evidence must canonically identify PR #306; absent, wrong, and foreign identities fail.
- F-016 fixed: every plural roster member must report `taken: true` before protected merge.
- F-017 rejected-with-reason: public v0.3.12 commit `7eed70e` contains no `lease_batch`; the pre-manifest form first existed only in a later unreleased candidate at `9c9a698`. Stable/candidate isolation confines that state to copied or disposable boards, so no speculative live-board migration was added.

Final remediation head: `738e03ee2179621c347328e704134b1202ea5a8e`.

Changed files were confined to the affected gate, packet, tests, canonical command documentation, generated manual, and shipped bundle:

- `packages/core/src/merge-gate.ts` and `merge-gate.test.ts`
- `packages/mcp-server/src/check-pr.mjs`, `check-pr.test.mjs`, `execution-packet.ts`, and `smoke.mjs`
- `AGENTS.md`, `docs/manual/glossary.md`, the execute skill/tool reference, generated manual, and committed MCP bundle

## Final head verification

Focused evidence at `738e03ee2179621c347328e704134b1202ea5a8e`:

- core and MCP workspace typechecks passed
- merge-gate: 33/33
- real check-pr CLI: 9/9
- MCP smoke: 363/363
- repository scripts: 157/157 with terminal exit 0
- build, core build, 22-chapter manual generation, documentation, skills, plugin build/check, exact bundle bytes, and `git diff --check` passed
- plugin inventory remained 41 tools and 12 skills

Retained attempt evidence: the first final-remediation `verify:skills` run found one deterministic canonical-prose wording mismatch; the wording was corrected without weakening the assertion and the final run passed. The subagent's concurrent `test:scripts` process did not yield a terminal status, so it was recorded as inconclusive; the release controller reran that focused suite once and obtained 157/157 with exit 0.

One authoritative clean Windows `npm run verify` rail passed at the exact committed head, with no overlapping rail on the host: 707 core tests, 524 GUI tests, 171 MCP/integration tests, 157 script tests, 363 MCP smoke checks, and 50 protocol checks, plus every build, typecheck, documentation, discovery/headless, MCPB, skill, AGENTS, and plugin byte-identity check.

## F-018 packet-safety remediation

F-018 is fixed at exact commit `b51ead6e019f11d035c66f148c311a707f123bb0`.

The execution-packet validator now checks the effective batch workspace after manifest consistency and exact actor/controller-run authorization. The same physical safety path covers both already-taken tickets and projected untaken batch members: repository confinement, exact Git worktree root, source/board exclusion, active-workspace collision, Git common-directory identity, and checked-out branch. A refusal occurs before the sibling lease can be minted.

The final change is confined to:

- `packages/mcp-server/src/execution-packet.ts`
- `packages/mcp-server/src/smoke.mjs`
- regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`

Failing-first evidence retained: before the shared-validator source fix, the expanded smoke suite passed 363/365 and failed exactly the new missing/moved-worktree and wrong-branch cases because both packets incorrectly remained ready. After the fix, MCP typecheck and build passed, standalone smoke passed 365/365, plugin build/check passed with 41 tools and 12 skills plus exact bundle-byte identity, and `git diff --check` passed.

One authoritative Windows `npm run verify` rail then passed at the exact clean committed head: 707 core tests, 524 GUI tests, 171 MCP/integration tests, 157 script tests, 365 MCP smoke checks, and 50 protocol checks, plus every build, workspace typecheck, docs/manual, headless/discovery, MCPB, skills, AGENTS, and plugin byte-identity check. No overlapping full rail ran on this host.

The first command-launch attempt requested a PTY and failed in the Windows process allocator before npm started; it produced no source-test attempt. The immediate non-PTY launch at the unchanged exact commit is the authoritative passing rail.

## Final protected-batch lifecycle remediation

Exact remediation head: `31dac12a8d6445de0c775e47bf709499830a5c4e`.

F-019 through F-023 were corrected as one complete lifecycle invariant:

- F-019 fixed: a plural batch declaration without a concrete worktree is rejected as `BATCH_WORKSPACE_INVALID` before the pending WAL or any ticket/manifest write; isolated branch-only take remains compatible.
- F-020 fixed: after exact batch actor/run authorization and manifest consistency, non-authoritative display labels no longer reject the authorized controller; physical Git safety and isolated occupancy checks remain unchanged.
- F-021 fixed: the schema-3 automation ledger's immutable `run_id` is the `controller_run` for declaration/recovery, packet acquisition, later-member take, and every CAS renewal.
- F-022 fixed: after GitHub confirms the one shared PR merged, review re-reads the active manifest and idempotently advances every immutable member from Review to Verifying, stopping on any unexpected state and writing no proof.
- F-023 fixed: only the first completed member creates the shared PR; later members require and record exactly one matching open PR with the configured base, manifest branch, exact head, and complete footer roster.

The remediation changed only the 16 authorized source, test, canonical-prose, generated-manual, and committed-bundle files named by the versioned files/plan documents.

Failing-first evidence at `b51ead6e019f11d035c66f148c311a707f123bb0`:

- Core claims: 75/76, with the new worktree-required case proving the old branch-only batch declaration.
- MCP smoke: 366/368, with the new zero-write worktree refusal and authorized actor/run display-label cases exposing the two source defects.
- Three protected-batch prose negative fixtures failed until the canonical auto/execute/review contracts carried the lifecycle invariants.

Focused passing evidence at `31dac12a8d6445de0c775e47bf709499830a5c4e`:

- Core claims: 76/76.
- MCP typecheck/build and standalone smoke: 368/368.
- Skill prose and negative fixtures: 52/52.
- AGENTS verification: 31/31.
- Generated manual: 22 chapters current.
- Plugin build/check: 41 tools, 12 skills, exact source/bundle byte identity.
- `git diff --check`: PASS.

One authoritative, non-overlapping clean Windows `npm run verify` rail then passed with exit 0 at the exact committed head `31dac12a8d6445de0c775e47bf709499830a5c4e`: build; 708 core tests; 524 GUI tests; 171 MCP HTTP/integration tests; 160 repository script tests; all workspace typechecks; 368 MCP smoke checks; headless and discovery checks; 50 protocol checks; MCPB packaging; documentation/manual; skills; AGENTS; and plugin byte identity. The worktree remained clean at the exact head after the rail.


## Final PR-provenance remediation

Exact remediation head: `213209e2a3cb5a2dd572737f1b930c846b8062e8`.

F-024 and F-025 were corrected together as one protected-batch provenance invariant:

- F-024 fixed: a plural phase-2 verdict now requires the actual PR base and hard-fails in strict and lenient modes unless it equals the batch roster's one resolved delivery target. Singular target warning compatibility remains unchanged.
- F-025 fixed: a plural phase-2 verdict now requires both source and head repository evidence and hard-fails a missing or case-insensitively foreign head repository in strict and lenient modes. A same-repository case variant remains valid, and the legacy emitted PR JSON shape remains unchanged.

The remediation was confined to `packages/core/src/merge-gate.ts`, `packages/core/src/merge-gate.test.ts`, `packages/mcp-server/src/check-pr.mjs`, and `packages/mcp-server/src/check-pr.test.mjs`.

Failing-first evidence was retained: merge-gate passed 34/36 before the source fix, failing exactly the missing-base and missing-source lenient cases; the real check-pr suite passed 8/10, exposing absent head-repository capture and missing-base acceptance. One intermediate fixture run passed 9/10 because its case-variant fixture also changed the fallback review URL; the fixture was narrowed to the intended provenance case without expanding production behavior.

Final focused evidence passed: merge-gate 36/36; real check-pr CLI 10/10; core and MCP typecheck/build; independent read-only diff audit; and `git diff --check`.

One authoritative, non-overlapping clean Windows `npm run verify` rail then passed with exit 0 at exact commit `213209e2a3cb5a2dd572737f1b930c846b8062e8`: 711 core tests, 524 GUI tests, 172 MCP HTTP/integration tests, 160 repository script tests, 368 MCP smoke checks, and 50 protocol checks, plus every build, workspace typecheck, documentation/manual, headless/discovery, MCPB, skills, AGENTS, and plugin byte-identity check. The source worktree remained clean at the exact head after the rail.

## Final terminal-member remediation

Exact remediation head: `8965f4eb95653edc3f182ab6cafcc354ded511da`.

- F-026 fixed: `BatchState` exposes authoritative manifest lifecycle state; execution packets require an active manifest and a selected nonterminal, non-archived member; `takeTicket` re-reads the member and manifest inside the existing lease lock and refuses Done, archived, or releasing execution before any write.
- F-027 fixed: canonical closeout guidance names `list_items include_archived: true` as the sole complete roster census. `search_items` retains its existing non-archived search behavior and is explicitly not a complete batch census.
- No new tool, API option, stage, dependency, board schema, service, credential, or unrelated behavior was added.

Failing-first evidence at `213209e2a3cb5a2dd572737f1b930c846b8062e8`:

- Core claims exited 1 with 76/79: Done and archived members could be retaken and lifecycle state was absent.
- MCP smoke exited 1 with 368/371: archived, Done, and releasing packets/takes were incorrectly allowed.
- `verify:skills` exited 1 on the two deliberately narrowed complete-census contract checks.

Corrected focused evidence passed: core claims 79/79; core and MCP typecheck/build; MCP smoke 371/371; `verify:skills`; repository scripts 160/160; AGENTS 31/31; docs/manual; plugin build/check with 41 tools, 12 skills and exact source/bundle bytes; and `git diff --check`.

One authoritative non-overlapping clean Windows `npm run verify` rail passed with exit 0 at exact committed head `8965f4eb95653edc3f182ab6cafcc354ded511da`: 714 core tests, 524 GUI tests, 172 MCP HTTP/integration tests, 160 repository script tests, 371 standalone MCP smoke checks, and 50 protocol checks, plus builds, workspace typechecks, documentation/manual, headless/discovery, MCPB packaging, skills, AGENTS, and plugin byte identity. The source worktree was clean and current with `origin/main` after the rail.

## Final workspace-reservation remediation

Exact remediation head: `54f8a2940a23847d8936e380c6f4647b7c9ec11c`.

The exact-head automated and independent delta reviews agreed on F-028: the declaration path returned through `declareBatchAndTake` before the ordinary workspace-occupancy check, allowing a fresh batch to overlap an unrelated live branch/worktree. The root-cause correction keeps one central admission invariant:

- fresh declaration checks the warning-aware complete ticket census before persisting its WAL;
- pending, active and releasing manifests themselves reserve their exact branch/worktree;
- only the exact same batch, actor, durable controller run, branch and worktree may share that reservation;
- pending recovery rechecks occupancy before any member write, so interruption cannot roll forward into a second live writer.

Failing-first core evidence at `8965f4eb95653edc3f182ab6cafcc354ded511da` exited 1 with 5 failed / 79 passed: occupied branch and worktree declarations activated, pending WAL branch/worktree reservations admitted unrelated isolated takes, and a pending recovery rolled forward over an existing branch holder.

Corrected focused evidence passed at `54f8a2940a23847d8936e380c6f4647b7c9ec11c`: core claims 84/84; MCP smoke 371/371; core and MCP typechecks; root build; plugin rebuild/check with 41 tools, 12 skills and byte-identical source/bundle; and `git diff --check`.

The first attempt to launch the authoritative rail through the host PTY failed before PowerShell or npm started. The identical command was started without PTY. That one authoritative, non-overlapping clean Windows `npm run verify` rail completed with exit 0 at exact head `54f8a2940a23847d8936e380c6f4647b7c9ec11c`: 719 core tests, 524 GUI tests, 172 MCP HTTP/integration tests, 160 repository script tests, 371 standalone MCP smoke checks and 50 protocol checks, plus builds, workspace typechecks, docs/manual, headless/discovery, MCPB, skills, AGENTS and plugin byte identity. The worktree remained clean and based on current `origin/main`.
