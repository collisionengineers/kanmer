# Plan — CORE-126: make explicit batch workspaces pass the protected merge path

## Objective

Deliver one bounded correction on exact current main: an explicitly frozen ticket batch uses its existing one branch, worktree and PR through the real protected gate; every roster member is independently mapped to the same PR/head; declaration is same-controller and interruption-recoverable; archived members are discoverable; and no member can release the shared workspace before every member is terminal.

## Starting state

Base is origin/main c1bc3be8532150832328a6d7f62ecd94cdcf6220. The shared main checkout is intentionally left stale and dirty; implementation must start from origin/main in the recorded CORE-126 worktree.

Current production defects on that exact SHA:

- resolveMergeGateTicket rejects distinct Kanmer footers and evaluateMergeGate plus check-pr gather one ticket only. The execute skill's complete batch footer list cannot pass kanmer-gate.
- The gate checks a review head but does not aggregate Review stage, questions, blockers, attestation PR/head, commits or board sync across all frozen members.
- list_items summaries omit lease_batch and closeout does not require include_archived: true.
- assertWorkspaceFree compares same-batch workspace/branch but not the incoming real actor with the batch owner.
- validateBatchDeclaration allows the declaring member to be already taken when force is used.
- takeTicket stamps siblings sequentially before the taker and has no recovery intent, so an interruption leaves an unresumable partial roster.
- releaseTicket excludes the releasing member from BATCH_ACTIVE, contrary to the v0.3.13 acceptance that every member is terminal before cleanup.
- CORE-125 serializes most ticket writers through withLeaseLock, but deleteItem remains unlocked and document writes can alter revisions during an interrupted batch mutation. CORE-132 demonstrates a strict write-ahead/roll-forward pattern. The remaining writers must be guarded only where a pending or active batch invariant requires it; this is not a new lock architecture.

CORE-126 is the only active shared-core implementation lane; there are no open PRs.

## Governing docs

- docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md — **Meets.** One controller is bound to the frozen roster; one workspace/branch remains the only batch exception; all members retain separate outcomes, reviews and proofs; the gate validates the complete roster; cleanup waits for every Done or archived member; unrelated tickets and controllers remain refused.
- HZN-008 context.md — **Meets.** The change is additive to the file board and central TypeScript engine, uses the existing six stages and one shared subsystem PR, keeps stable v0.3.12 as live authority, and adds no scheduler, database, service or workflow abstraction.
- CORE-124 and CORE-125 durable ticket evidence — **Meets.** Discharges deferred batch findings without reopening their accepted unrelated risks, preserves the existing activity sequence and write lock, and keeps isolated mode unchanged.
- No governing document is modified and no new ADR is required: this implements already-approved FRD-030 behavior.

## Required changes

1. **Explicit complete roster resolution**
   - Extend the existing footer resolver/result to carry normalized ticketIds while preserving ticketId for the ordinary singular case.
   - A single non-batch footer behaves exactly as today.
   - Distinct valid footers are provisional until evaluation proves that their set exactly equals one frozen batch. Incomplete, extra, mixed-batch, pending, inconsistent, archived-roster, or unbatched multi-ticket input fails with one explicit batch-roster finding.
   - Duplicates normalize away; invalid explicit footer syntax never falls back to the branch.

2. **Roster-wide protected verdict**
   - check-pr reads one warning-free board snapshot including archived items and captures one board tip. It resolves every requested item, collects the union of recorded commits once, then partitions member-specific blockers, review documents, reachability and board ancestry while sharing the semantic Review/final stages and delivery policy.
   - evaluateMergeGate first compares the normalized footer set with the authoritative manifest roster. A lone reference to a frozen member is incomplete; pending/inconsistent/missing records are hard failures. An archived member remains in the roster and then fails that member's stage/archive check.
   - evaluateMergeGate checks every member: no open questions, exact Review and not archived, no live/dangling blocker, correct configured PR target, and a typed review with independent true, verdict exactly pass, exact full head SHA, and canonical PR identity. Numeric PR values match the event number; URL values must match the exact current PR URL or repository-qualified identity, never a foreign URL sharing only the number. Reachable commits and current/unrecorded board evidence retain existing strict-mode behavior.
   - A batch result uses ticketId null and exposes batchId plus complete sorted ticketIds; it never selects a leader. Checks/findings retain member identity and deterministic order, aggregate all member failures, and preserve existing hard versus lenient-warning semantics.
   - Existing single-ticket output shape, check ordering, warning/error promotion and behavior stay compatible.

3. **Recoverable controller-owned declaration**
   - Add optional lease_batch_controller to each member and place it in canonical frontmatter order. MCP passes the actual calling actor separately from caller-supplied assignee/controller labels; that actor owns the declaration and every later member take. Direct core/GUI callers use their existing actor identity as the fallback.
   - Add one strict schema-1 phase-specific sidecar under .kanmer/batches/transactions. Its filename is the full SHA-256 of the canonical trimmed batch id and the record must hash back to that filename. The pending variant is the WAL; the compact active/releasing variants are the authoritative manifest.
   - The pending WAL binds transaction id, exact batch/controller/frozen roster, shared branch/worktree/workspace, the complete first-take fingerprint and generated lease facts, plus each member's before/after SHA-256. It stores no replayable arbitrary ticket bodies. Recovery derives the only legal membership/take patches and verifies their serialized hashes.
   - Under withLeaseLock, use a warning-aware complete ticket census and then directly re-read every named member. Refuse warnings, malformed or overlapping sidecars, any taken/terminal/archived/foreign-batch member (including the declarer even with force), missing/extra member, contradictory projection, actor absence, stale document-inclusive CAS or doc-gate drift.
   - Persist the full pending WAL before the first member write. On every attempt, classify every ticket and compact-manifest endpoint as exact before or exact after before changing any byte. Only a wholly recoverable set rolls forward deterministically through all membership stamps, the declarer's complete first lease/stage/workspace write and the compact active manifest. Re-read every after-image, then atomically replace the pending record with its strict compact active form. A crash therefore leaves either recoverable pending evidence or a valid active manifest.
   - Retry identity is actual actor plus sorted roster plus complete first-take fingerprint. Any changed branch, worktree, stage, expected revision, labels, run identity, actor or roster is a retained conflict with zero additional writes. After activation but before response/activity, the exact request returns the already-committed state idempotently.
   - A pending WAL blocks every non-recovery mutation of a roster member, including item/move/take/renew/transfer/reconciliation/doc/scratch/delete paths; a malformed record fails closed. deleteItem joins the existing lock and refuses pending, active or releasing members. Raw conflicting edits retain the WAL for repair.
   - batchState reads the authoritative sidecar and reports controller plus pending/consistent/inconsistent status. Consistency requires a warning-free census, every manifest member present with matching projections, and no unexpected extra stamp; a scan cannot infer a smaller roster.
   - Same-batch workspace admission and renewal compare the actual request actor with lease_batch_controller and the manifest. Batch transfer and reconciliation claim recovery are refused until the separately out-of-scope batch-wide transfer policy exists.
   - Execution packets refuse pending/inconsistent batches and foreign actors even when they copy the exact branch/worktree resume; isolated resume behavior stays unchanged.

4. **Discoverable, terminal closeout**
   - list_items always emits batch as null or a block containing id, controller and frozenAt; include_archived: true exposes archived members.
   - kanmer-closeout resolves all summaries with include_archived: true and filters the same batch id before deleting the one worktree/branch. kanmer-review records one member-owned attestation per exact roster ticket after one fresh review of the shared head. kanmer-execute retains one footer per frozen member.
   - Before the first release, releaseTicket resolves the immutable active-manifest roster, directly re-reads every member and includes the caller in one terminal census. Any nonterminal or inconsistent member refuses with zero writes. It then atomically changes active to releasing.
   - In releasing, each endpoint may be exactly stamped or fully cleared; repeated calls clear members idempotently while retaining the manifest. The last clear removes the manifest only after all endpoints verify, including recovery after a crash between the last ticket clear and manifest removal. Moves back to nonterminal, take, renew and transfer are refused while releasing. Proof and board work are never deleted.

5. **Contracts and shipped artifacts**
   - Update AGENTS.md, tool reference, execute/review/closeout skills and glossary in the same diff.
   - Add skill-prose assertions for complete footers, per-member attestations, include_archived roster discovery and all-terminal cleanup.
   - Regenerate the manual and standalone MCP bundle; keep the exact base's 41-tool roster unchanged and prove source/bundle identity.

## Expected files

The authoritative surface is files/files.md version 9cbef350ca9468d0. It names every permitted source, test, skill, documentation and generated-artifact path. No file outside that document is authorized without a versioned plan/files correction before editing.

## Do not modify

- The live board worktree except normal project-bound Kanmer document/stage/lease operations and its later explicit sync.
- Hand-written apps/gui code, release-channel records, delivery policy, reconciliation/proof behavior owned by CORE-127/CORE-133/CORE-129, or any unrelated ticket.
- FRD-030, the six stages, isolated workspace behavior, generic force/transfer semantics, provider integration, branch protection architecture, or package dependencies.
- Infisical configuration, secrets or credential rotation.
- Existing assertions merely to make a test pass.

## Constraints

- Use one shared-core PR and one CORE-126 worktree/branch created from current origin/main; never update or clean the user's shared checkout.
- Every board write carries the live logical project fingerprint and current document/item version where available.
- All multi-ticket writes and batch deletion checks stay inside the existing board-wide withLeaseLock; every non-recovery document/item mutation that conflicts with a pending or releasing sidecar is refused before changing bytes. No lock is held over Git, GitHub, network or full-board verification.
- The manifest is a bounded batch-specific safety invariant, not a generic transaction framework. It must be strict, path-confined, roll-forward only, retained on conflict, and durable only for the lifetime of its frozen batch.
- The actual MCP caller authorizes batch membership/take. A caller-supplied visible owner string is evidence, not authority.
- Stable v0.3.12 must continue to read the board: item fields are optional and the sidecar is outside the areas item scan; no board-format bump or migration.
- The gate remains read-only and deterministic. No merge queue, extra CI framework or branch-policy bypass.
- Preserve exact failed attempts and exit codes. One deterministic failure or success mechanism is enough; do not run overlapping full Windows rails.
- No dependency addition. No secret value may enter code, fixtures, ticket docs, logs or proofs.

## Ordered steps

1. From the controller, re-read get_status and obtain CORE-126's execution packet as the first ticket-specific execution call. Fetch origin, create branch core-126-batch-merge-path and worktree .worktrees/core-126 from exact origin/main, validate branch/worktree/common-dir identity, then take CORE-126 with the real recorded values.
2. Add failing core merge-gate tests for a valid three-member complete footer roster and the incomplete, superset, mixed, unbatched, pending/inconsistent, wrong-stage, archived, question, blocker, wrong-PR/head, absent/invalid/needs-changes review and unchanged single-ticket cases.
3. Implement plural resolution and roster-wide evidence/result aggregation in merge-gate.ts and check-pr.mjs. Add the real CLI batch fixture and keep single-ticket output compatibility.
4. Add failing claims tests for controller B taking controller A's exact workspace, copied-label renewal, batch transfer/reconciliation refusal, force-retaken declaration, every pending/member/taker/activation/releasing interruption boundary, exact recovery, changed take intent, conflicting actor/roster, malformed/overlapping records, warning censuses, unexpected member bytes, concurrent item/document mutation, member deletion, missing/extra members, partial release recovery and release by a non-terminal caller.
5. Implement the additive field, path, strict pending/compact active/releasing record union, actor binding, hash-derived declaration-plus-first-take roll-forward, warning-aware manifest-driven batchState, pending mutation/deletion guards, actor-bound renew, batch transfer/reconciliation refusal and crash-safe every-original-member terminal release. Keep the existing isolated and CORE-124/125 tests unchanged.
6. Refuse pending/inconsistent/foreign-actor batch execution packets; expose archived-capable batch summaries; update smoke for actual MCP actor behavior, packet ownership and archived discovery; and update execute/review/closeout/tool-reference/AGENTS/glossary contracts. Add corresponding skill-prose regression checks.
7. Run the focused rail, fix only in-scope failures, regenerate the manual and plugin bundle, then run the complete Windows verification rail once on the clean final head.
8. Commit reachable implementation history with a Kanmer: CORE-126 footer, push the ordinary branch, open one PR against current main, record commit/PR and a complete post-implementation report, sync the board, and move CORE-126 Implementing to Review.
9. Stop execution at Review. Independent exact-head review, consolidated remediation, hosted checks, merge and exact-merge verification belong to the controller's later review/verify phases, not this implementation packet.

## Acceptance checks

- A three-member frozen batch PR with exactly one Kanmer footer per member passes strict evaluateMergeGate and the real check-pr CLI only when all three are in Review and each typed attestation is independent, has verdict pass, names that PR by canonical number or exact repository-qualified URL, and names the exact full head.
- Removing, adding or mixing one footer fails before any leader-only pass can escape; an ordinary one-ticket PR remains byte-compatible in the fields and ordered checks existing consumers use.
- Each member's open question, live/dangling blocker, target, review, commit and board-sync defect is independently visible and blocks under the established strict contract.
- Controller B cannot declare, recover or take controller A's batch even when B copies the branch, worktree, assignee or controller label; every refusal is LEASE_CONFLICT and leaves ticket/manifest bytes unchanged.
- Tests simulate interruption before the pending rename, with WAL only, after every member stamp including the taker, after all tickets before compact activation, after activation before pending cleanup/response, at active→releasing, after each clear and after the last clear before removal. Exact same-actor/same-roster/same-take-intent retry converges; any changed intent retains evidence and changes no additional ticket or manifest.
- A force-retaken isolated ticket cannot declare a batch. An unrelated ticket still cannot join or share it. A member still cannot use another workspace. A copied assignee/controller label cannot renew another actor's batch; batch transfer/reconciliation recovery is refused; and a foreign actor cannot obtain a packet via exact-path resume.
- list_items include_archived: true returns every batch member with one batch id. Closeout prose consumes that surface before the Git half.
- A non-terminal releasing member receives BATCH_ACTIVE even if all siblings are terminal. Release atomically enters a releasing phase only after the immutable manifest roster is wholly terminal, survives every partial clear and response-loss boundary, refuses missing/extra/inconsistent members, and removes the manifest only after every original member is cleared; each proof remains per ticket.
- Production wiring is direct: GitHub workflow invokes check-pr; take_ticket invokes store.takeTicket with the actual actor; list_items invokes summarise; GUI/MCP release invokes store.releaseTicket; installed MCP uses the rebuilt bundle.
- No hand-written GUI code, dependency, tool, stage, format migration, secret, Infisical or rotation change appears in the diff.
- Focused checks, npm run verify, hosted verify and kanmer-gate pass on the same exact final PR head. Exact merged-SHA verification is retained for the later verify phase.

## Commands

Run from C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\core-126:

- npm ci
- npm run build
- npm test -w @kanmer/core
- node --test packages/mcp-server/src/check-pr.test.mjs
- node packages/mcp-server/src/smoke.mjs
- npm run smoke:protocol
- npm run typecheck
- npm run verify:skills
- npm run test:scripts
- npm run build:manual
- npm run verify:docs
- npm run plugin:build
- npm run plugin:check
- npm run verify
- git status --short --branch
- gh pr checks <PR> --watch

Hosted verify and kanmer-gate must both bind to the final exact PR head after the board Review state is pushed.

## Failure and deviation rules

- If exact actor identity cannot be obtained at the MCP boundary, stop; do not authorize from assignee/controller input.
- If a sidecar is malformed, warning-tainted, overlapping or conflicts with ticket/manifest bytes, retain it and fail closed. Never guess, overwrite, silently roll back or delete ownership evidence.
- If a complete roster cannot be proven from one board snapshot, fail the gate; never select a convenient leader.
- If any existing assertion must be weakened, the plugin tool count changes, source and bundle differ, or a required check fails deterministically, stop and report the exact mechanism.
- If implementation needs a file outside files/files.md, a dependency, a generic transaction abstraction, a hand-written GUI change or another workflow surface, revise the authoritative docs before coding; do not absorb it silently.
- Known Windows host contention may receive one bounded retry only after its mechanism is identified and recorded. It never converts a deterministic source failure to PASS.
- Do not touch or report Infisical rotation; it is outside the frozen release roster.

## Acceptance correction — live-base tool inventory

The original plan named 39 tools, but exact base `c1bc3be8532150832328a6d7f62ecd94cdcf6220` already exposed 41. CORE-126 adds no tool. Acceptance therefore means retaining 41 tools and proving source/bundle identity; removing two established tools merely to satisfy the stale number would violate scope and current-base compatibility.

## Stop condition

One PR is open against current main with a Kanmer: CORE-126 footer, the exact implementation commit and PR are recorded, the post-implementation report is complete, the synced board has CORE-126 in Review, and the worktree/lease remain intact for independent review. Do not review, merge, verify, write proof, close out, release the lease, or start another ticket during execution.


## Root-cause replan after exact-head review

Exact remediation base is PR #306 head `405a65c2736001de4adfa97f5b4a999f57348054`. The settled automated review and fresh independent reviewer confirmed two new major defects and one bounded residual-risk disposition:

- F-005 is rejected as fix-required. Concurrent v0.3.12 mutation of candidate-created batch state violates HZN-008's fixed rollout boundary: candidate writes occur only on copied/disposable boards; live promotion backs up the board and stops v0.3.12 first; rollback restores that backup. Stable compatibility is read/passthrough, not mixed-version writes.
- F-006 is fixed at the workspace-identity root. Persist the manifest's worktree identity canonically relative to the repository, normalize equivalent caller paths before request hashing, and derive host-absolute identity only for local collision checks. Pending recovery, active state, later member take and summaries must remain valid after the repository root changes; persisted host-absolute `lease_workspace` is never authority.
- F-007 is fixed only in plural batch-gate evaluation. A dependency whose blocker is a member of the exact immutable roster is ordered within the shared PR and is excluded from `DEPENDENCY_BLOCKED`; external and dangling blockers, and every singular-ticket rule, remain unchanged.

Implementation stays in the already-authorized `packages/core/src/store.ts`, `packages/core/src/claims.test.ts`, `packages/core/src/merge-gate.ts`, `packages/core/src/merge-gate.test.ts`, canonical contract prose, generated manual and committed plugin bundle. Negative cases cover an out-of-repository worktree, a copied/relocated pending or active batch, an external/dangling blocker, and unchanged singular behavior. Verify with focused claims and merge-gate tests, build/check-pr/smoke/protocol/prose/plugin checks, then one clean full Windows `npm run verify` at the final head.

## Final settled-review consolidation at `8665908dd21dd282823161bbeadde272b3944474`

The expected automated reviewer settled on the exact final head and the independent delta reviewer confirmed one last bounded batch. This is a continuation of the existing root-cause remediation, not a new product replan:

- F-008 (minor) is fixed by classifying `BATCH_WORKSPACE_INVALID` as structured `LEASE_CONFLICT`; the outside-root refusal remains zero-write.
- F-009 (major) is fixed only for the validated plural batch path: missing, invalid, stale, wrong-PR/head, non-independent or non-PASS member review evidence is an unconditional error even when singular compatibility mode is lenient.
- F-010 (major) persists the already-trimmed canonical `controller_run` used for batch renewal authorization, so a padded request cannot corrupt manifest consistency.
- F-011 (major) resolves every member through the existing delivery policy and refuses a mixed PR-target roster before the pending WAL or any ticket write. The merge gate independently hard-fails a manually corrupted or policy-drifted mixed roster in both strict and non-strict modes.
- F-012 (major) projects the authoritative manifest branch through `BatchState` and hard-binds the hosted PR head branch to it in both strict and non-strict modes.

All work stays within the already-authorized `packages/core/src/types.ts`, `packages/core/src/store.ts`, `packages/core/src/claims.test.ts`, `packages/core/src/merge-gate.ts`, `packages/core/src/merge-gate.test.ts`, `packages/mcp-server/src/errors.ts`, `packages/mcp-server/src/check-pr.test.mjs`, committed bundle, and only directly affected canonical prose/generated artifacts if their contract changes. No delivery-policy redesign, new tool, stage, service, dependency or compatibility architecture is added.

Negative tests cover structured outside-root refusal with unchanged bytes; every invalid plural attestation under non-strict mode while singular compatibility remains unchanged; padded renewal followed by consistent packet/member/closeout behavior; pre-WAL mixed-target refusal plus strict/non-strict gate failure; and exact versus mismatched PR head branches in core and real check-pr fixtures. Run focused checks first, rebuild the committed bundle, commit a clean exact head, then run one authoritative Windows `npm run verify` rail. The next review is strictly a delta over F-008 through F-012 and affected callers/tests.

## Final exact-head review replan — F-013 through F-017

The automated and fresh independent exact-head reviews at `4ef3c8170d9ae247cf8af04fc29981b31899a048` exposed one remaining root invariant: a complete frozen roster must prove each member's own current execution and review evidence, not only roster membership and a shared PR/head.

1. **F-013 — bind each review to current member evidence (major, fix).**
   - Extend the existing one-snapshot gate packet so every member carries its current ticket `updated` value and current plan-document version.
   - A plural member review passes only when its parsed `ticket_updated` and `plan_hash` exactly match those current values, in addition to the already mandatory PR, head, verdict and independence checks.
   - Missing or mismatched member evidence is a hard `STALE_REVIEW` in strict and lenient modes. Preserve singular compatibility behavior.

2. **F-014 — packet-first identity for an untaken frozen sibling (major, fix).**
   - The execution packet remains the first ticket-specific implementation input.
   - For a consistent active batch member that is not yet taken, project the immutable manifest branch and portable worktree into the packet ticket/claim/compiled-step workspace fields so the batch controller can take that exact shared location.
   - Preserve actor plus controller-run checks and refuse pending, inconsistent or foreign-controller batches.

3. **F-015 — require per-member PR trace (major, fix).**
   - Include each member's `prs` evidence in the gate packet.
   - Every plural member must record the current PR using the same canonical numeric/URL identity rules as review attestations. Absence or a different PR is a hard error in strict and lenient modes.

4. **F-016 — require actual workspace acquisition before merge (major, fix).**
   - A plural roster is mergeable only when every member state reports `taken: true`.
   - An untaken member is a hard batch-roster failure in strict and lenient modes, even if board stage or copied review prose was manually advanced.

5. **F-017 — active pre-manifest v0.3.12 migration (rejected-with-reason).**
   - The public v0.3.12 tag `7eed70e` contains no `lease_batch` implementation. Pre-manifest CORE-124 batches first appear at later unreleased candidate commit `9c9a698`.
   - The fixed promotion boundary forbids candidate Kanmer from governing the live board before copied-board acceptance. Therefore no supported v0.3.12 live-board state can contain the alleged batch format.
   - Do not add a speculative migration for disposable development-era candidate state. F-005's stable/candidate isolation and backup/restore promotion proof remain the safety boundary.

### Focused proof

- Core merge-gate regressions cover copied/stale member evidence, absent/wrong member PRs, and untaken members in strict and lenient modes while preserving singular compatibility.
- Execution-packet unit and standalone MCP smoke coverage prove an untaken frozen sibling receives the exact manifest branch/worktree before take, then the same controller/run can take it.
- The public-tag history assertion is recorded in the final review disposition; no compatibility source path is added.
- Run all affected focused suites, generated-artifact checks, and one clean authoritative Windows `npm run verify` at the final new head.


## Final packet-safety remediation — F-018

The automated exact-head review at `738e03ee2179621c347328e704134b1202ea5a8e`, independently reproduced on a disposable board, found one remediation-caused major: F-014 projects the manifest workspace only after `unsafeTakenWorktree` has returned early for an untaken member. A missing, moved, wrong-branch, board/source, or foreign-repository worktree can therefore produce `ready: true`, and the later core take checks only immutable string identity rather than physical Git state.

### Root fix

- Keep physical Git validation in `packages/mcp-server/src/execution-packet.ts`; do not add filesystem/Git behavior to core.
- Refactor or reuse the existing validator so it accepts the effective branch/worktree identity.
- Resolve and authorize the consistent manifest plus exact actor/controller run first. Then validate the projected workspace with the same repository confinement, exact worktree-root, board/source exclusion, active-ticket collision, Git common-directory, and checked-out-branch checks used for an already-taken ticket.
- Return a refused packet before any member lease is minted when projected physical evidence is missing or invalid.
- Preserve the truthful untaken projection and successful later take when the shared worktree is valid.

### Files and tests

- Modify only `packages/mcp-server/src/execution-packet.ts`, `packages/mcp-server/src/smoke.mjs`, and the regenerated committed `plugins/kanmer/mcp/kanmer-mcp.cjs`, unless an existing authorized generated artifact changes mechanically.
- Add an untaken-batch regression that proves a moved/missing projected worktree is refused and the member stays untaken.
- Bridge the untaken lane to existing wrong-branch, foreign-repository, board/source-checkout, root, and alias validation through the shared helper; add focused cases where needed to prove the new call path, without duplicating the validator.
- Run MCP typecheck/build, standalone smoke, plugin build/check, `git diff --check`, and one clean non-overlapping Windows `npm run verify` rail at the committed final head.

The next review is one strict delta over F-018, its changed lines, the shared physical validator, affected packet/take callers, and the new regressions. No unrelated review ideation or release-roster expansion is authorized.

## End-to-end batch lifecycle root-cause replan — F-019 through F-023

Exact review head is `b51ead6e019f11d035c66f148c311a707f123bb0`. Hosted `verify` passed there. The expected automated reviewer settled and the independent delta reviewer confirmed F-018 fixed, then found four majors and one minor that share one root invariant: a frozen batch must remain executable and governable through declaration, every member packet/take, the one shared PR, shared merge transition, per-member verification, and terminal cleanup.

This is the one evidence-based root-cause replan after the ordinary remediation loop was spent. It does not widen the product or roster.

1. **F-019 — require a real shared worktree before freezing (major).**
   - Reject a missing or blank worktree at the start of batch declaration, before the pending WAL or any ticket byte is written, using the existing structured `BATCH_WORKSPACE_INVALID` / `LEASE_CONFLICT` path.
   - Preserve isolated branch-only take compatibility.
   - Core tests prove zero ticket/sidecar mutation; MCP smoke proves structured refusal and an unchanged board tree.

2. **F-020 — keep display labels non-authoritative (minor).**
   - After a consistent batch and exact actor/controller-run authorize the packet, bypass only the generic assignee/claim-controller display-label occupancy check.
   - Wrong actor or run remains refused even with an exact resume; F-018 physical Git validation remains mandatory; isolated occupied-ticket behavior is unchanged.
   - Smoke covers the authorized mismatched-label path plus wrong-run and isolated controls.

3. **F-021 — carry one durable run identity through `/goal` batch work (major).**
   - The existing automation run record's immutable `run_id` is the batch `controller_run`; do not mint a worker, session, or per-call substitute.
   - Canonical auto prose must pass it on declaration/recovery, packet calls, every later-member take, and every modern renewal with current CAS tokens.
   - Prose verifier and independent negative fixtures must fail when either declaration/member propagation or renewal propagation is removed.

4. **F-022 — move the complete roster after the shared merge (major).**
   - After GitHub confirms the one shared PR merged, review re-reads the authoritative active manifest and deterministically processes every immutable member.
   - For each member, re-read gates and move exactly one `Review -> Verifying` boundary. An interrupted retry skips a member already in Verifying and stops on any other unexpected stage; it never writes proof.
   - Prose verification must reject restoration of the singular-only post-merge move.

5. **F-023 — create exactly one PR and reuse it for later members (major).**
   - The first completed member creates the shared PR with the complete exact roster footer set.
   - Every later member pushes the same manifest branch, resolves exactly one existing open PR matching repository, configured base, manifest head branch, and exact footer roster, records that PR in its own `prs[]`, and never calls `gh pr create`.
   - Missing, ambiguous, closed, wrong-base/head, or wrong-roster PR evidence fails closed and leaves the member in Implementing.
   - Prose verification must reject a later-member path that creates another PR.

### Authorized files and proof

The versioned `files` document is expanded only for `plugins/kanmer/skills/kanmer-auto/SKILL.md`; all other required source, tests, canonical prose, generated manual, AGENTS contract, tool reference, and bundle paths were already authorized.

Focused failing-first and regression proof:

- `packages/core/src/claims.test.ts`: batch worktree required with no writes; isolated branch-only control.
- `packages/mcp-server/src/smoke.mjs`: structured refusal, display-label authorization, wrong-run/refusal, and unchanged isolated behavior.
- `scripts/verify-skill-prose.mjs` plus `.test.mjs`: auto run-id propagation, one shared PR reuse, and complete post-merge roster transition.
- Rebuild the generated manual and committed standalone bundle, prove 41 tools/12 skills and exact bundle identity, run affected typechecks/builds and `git diff --check`, then run one clean non-overlapping Windows `npm run verify` at the committed final head.

The next review is one strict delta over F-019 through F-023, F-018 regression safety, changed lines, affected callers/contracts, and these tests. It is not a new unrestricted repository review.

## Final PR-provenance remediation — F-024/F-025

The settled exact-head automated review and fresh independent delta review at `31dac12a8d6445de0c775e47bf709499830a5c4e` confirmed that F-019 through F-023 are fixed and F-018 remains regression-safe. They identified two remaining majors that are one protected-origin invariant:

1. **F-024 — hard-bind the actual plural PR target.**
   - Preserve singular compatibility behavior.
   - For phase-2 plural batch evaluation only, the actual PR base must be present and exactly equal the roster's one resolved delivery target in both strict and lenient modes.
   - A missing or wrong base is a hard error; a correct base passes. Member target agreement remains the earlier corruption/policy-drift guard.

2. **F-025 — hard-bind plural PR repository provenance.**
   - Capture `pull_request.head.repo.full_name` as optional non-enumerable `headRepository` evidence alongside the existing base/source repository identity, preserving the legacy emitted `result.pr` JSON shape.
   - For phase-2 plural batches only, missing base or head repository evidence and a case-normalized unequal head/source repository are hard failures in both modes.
   - Matching case variants pass because GitHub repository identity is case-insensitive. Singular fork compatibility remains unchanged.

The remediation is confined to the four already-authorized files:

- `packages/core/src/merge-gate.ts`
- `packages/core/src/merge-gate.test.ts`
- `packages/mcp-server/src/check-pr.mjs`
- `packages/mcp-server/src/check-pr.test.mjs`

Add failing-first and final strict/lenient negatives for wrong and missing base, missing and foreign head repository, plus matching target/repository controls. Retain singular lenient and fork behavior and exact legacy CLI JSON output. Run core merge-gate tests, real check-pr CLI tests, affected typechecks/builds, `git diff --check`, then one clean non-overlapping Windows `npm run verify` at the committed final head. No prose, AGENTS, manual, bundle, dependency, board-schema, credential, or unrelated change is required because the canonical batch workflow already requires exact base and same source repository.
