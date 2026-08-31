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
   - Regenerate the manual and standalone MCP bundle; keep the tool roster at 39 and prove source/bundle identity.

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

## Stop condition

One PR is open against current main with a Kanmer: CORE-126 footer, the exact implementation commit and PR are recorded, the post-implementation report is complete, the synced board has CORE-126 in Review, and the worktree/lease remain intact for independent review. Do not review, merge, verify, write proof, close out, release the lease, or start another ticket during execution.
