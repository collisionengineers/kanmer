# Plan — CORE-129: validated proof authority and deliberate strict cutover

## Objective

Make the exact proof record—not file existence or free prose—the single authority for entering Done and reconciliation. Preserve every historical proof byte, census old records before cutover, and enable strict validation through the existing board migration path. No new tool, stage, database or workflow engine is introduced.

## Starting state

- Revalidated source base: `4fda54b4489fa4bc4b6b091c2af67715245ffa08`; implementation begins only after CORE-127 and CORE-133 merge and records their exact final base.
- Research: `research/research.md`@`03e90e244aae5d4a`.
- Files: `files/files.md`@`fffdea6e864b999c`.
- 298 historical proof files exist; 218 have no raw attempts field, 80 have one, two attempt-bearing records are not YAML-parseable, zero use schema 2, and a raw scan finds 30 parseable top-level/last-entry differences. These are census signals only; deterministic parser buckets are the authority.
- Core gates are existence-only. MCP reconciliation separately trusts the top-level verdict.
- Existing boards have no proof-validation policy. Stable v0.3.12 must remain able to read the board until candidate promotion.

## Governing contract

- `docs/functional/frd/FRD-002-requirement-profiles.md`: update the legacy existence-only proof requirement to explicit report/strict semantics.
- `docs/functional/frd/FRD-006-typed-proof.md`: replace the historical rule that FAIL satisfies the hard gate with the current typed-proof authority and compatibility cutover.
- `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md`: exact merged-SHA PASS precedes Done.
- AGENTS rule 20: INCONCLUSIVE is not PASS, later evidence does not erase failure, and Done requires PASS.
- The frozen v0.3.13 acceptance requires contradictory PASS/FAIL evidence to be unable to reach Done.
- CORE-042/GUI-141 are historical evidence only. Do not reopen, rewrite or add them to the release roster.

## Required changes

1. **Create one versioned proof parser**
   - Add `proof-record/2` semantics in core with strict top-level and attempt objects: exact kind/schema, merged SHA, nonempty environment, verified timestamp, result and non-empty attempts.
   - Each attempt carries timestamp, `PASS | FAIL | INCONCLUSIVE`, `authority: authoritative | supporting`, summary, compatible failure class, and either complete process evidence or an explicit manual/no-process form with null exit.
   - Validate required fields/enums, 40-hex merge SHA, ISO timestamps, unknown keys, process/manual evidence, strictly increasing timestamps with ties refused, and require the final ledger entry to be authoritative.
   - Bind `verified_at`, top-level result and any top-level failure class to that final authoritative entry. PASS/process requires zero and omits failure class; FAIL/process requires non-zero and uses implementation/plan/transient; INCONCLUSIVE uses inconclusive.
   - Supporting entries may precede the final verdict only. A later FAIL/INCONCLUSIVE must become final authority or the record is invalid, so it always invalidates an earlier PASS.
   - Return typed `valid-pass | valid-fail | valid-inconclusive | legacy | invalid` state plus deterministic diagnostics. Never infer authority from body prose.

2. **Make proof policy a board-owned central invariant**
   - Add optional `proofValidation.mode: report | strict` to `BoardConfig`.
   - Fresh boards write strict. Existing boards with the field absent resolve to report.
   - In report mode, proof existence retains compatibility but `get_doc_gates`/GUI surface parser warnings and the parsed state.
   - In strict mode, every proof requirement is satisfied only by a current valid PASS. Visual proof keeps its existing image advisory after that hard check.
   - Existing Done items remain untouched because gates apply only on transitions.
   - Expose `get_status.proofValidation = { mode, source }` so an absent/stripped explicit board policy is observable.

3. **Census before enabling strict**
   - Extend existing `migrate_board`; do not add a tool.
   - Refuse to combine proof cutover with an older-format migration: migrate format first, then operate only on a current-format board.
   - Dry run scans canonical `proof/proof.md` documents and returns deterministic valid/legacy/invalid buckets, ticket diagnostics and a digest binding parser/census version, ordered ticket identity/stage, raw proof size/SHA-256, parsed state and diagnostics.
   - Any listing/read/inventory failure marks the census incomplete and forbids cutover. Report-to-strict requires the caller's exact digest; census re-read and the policy write occur under the same ticket-write lock and refuse without writing on any mismatch.
   - `migrate_board` without the digest never enables strict. A successful real migration writes only the board proof policy to strict and never edits proofs, tickets, stages or activity.
   - Preserve idempotency: an already-strict board reports no policy change and the same read-only census.
   - Record the v0.3.13 live/copy census before running the real cutover.

4. **Unify Done gating and reconciliation**
   - `KanmerStore.gateReport` reads proof bytes once and passes the shared parsed result to the gate engine.
   - Remove the independent MCP proof decoder; adapt its response from the core parser.
   - Valid PASS still requires the exact selected PR merge SHA.
   - Valid FAIL still routes by the existing failure-class table and must also name the current merge SHA.
   - Valid INCONCLUSIVE, legacy or invalid evidence produces no Done recommendation.
   - Keep `reconcile_ticket` read-only and preserve all non-proof recommendation behavior.

5. **Publish the new record contract**
   - Update kanmer-verify to write schema 2 as one whole-file record, append every rerun as a typed attempt, identify supporting versus authoritative attempts, and read it back fully.
   - Update FRD-002, FRD-006, closeout/auto/setup/tool reference/AGENTS plus proof/gates/first-ticket manuals with the same authority and migration-census rules.
   - Pin the prose in existing validators and regenerate the manual and standalone MCP bundle. The tool roster remains 41.

## Ordered steps

### Step 1 — Implement and exhaustively test the pure parser

- Files: `packages/core/src/proof-record.ts`, `proof-record.test.ts`, `index.ts`.
- Symbols: `parseProofRecord`, `ProofRecordState`, schema/attempt types.
- Negative cases: missing/unknown schema, blank environment, empty attempts, non-authoritative final entry, malformed/unknown fields, SHA/time/manual/process evidence, result/exit contradiction, verified/final timestamp drift, failure-class drift, timestamp tie/reversal, top/final disagreement, PASS→FAIL and PASS→INCONCLUSIVE.
- Preserve: a valid one-attempt authoritative PASS.
- Commands: focused Vitest for proof-record, core typecheck/build.
- Done when: no caller needs to inspect raw proof frontmatter independently.

### Step 2 — Add report/strict central gate policy

- Files: `types.ts`, `board.ts`, `gates.ts`, `store.ts`, plus board/gates/profile-matrix/store/docs/claims/delivery/release tests named in `files/files.md`.
- Symbols: board policy schema/resolver, `EvidenceProbe` proof state, `statusOf`, `gateReport`.
- Negative cases: absent legacy policy reports with source `default`; explicit policy reports source `board`; stripped-key fallback is observable; strict legacy/invalid/FAIL/INCONCLUSIVE blocks; strict valid PASS passes; a noncanonical proof Markdown cannot satisfy canonical `proof/proof.md`; visual advisory unchanged; existing Done creation/backfill remains ungated.
- Commands: focused board/gates/docs/store suites and core typecheck.
- Done when: GUI and MCP observe one central gate decision.

### Step 3 — Add a byte-preserving census and cutover to migrate_board

- Files: `migrate.ts`, `migrate.test.ts`, tool description in MCP index.
- Symbols: `auditProofRecords`, proof-policy migration report, `migrateBoard`.
- Negative cases: old-format combined cutover refuses; dry run writes nothing; incomplete census, missing digest or stale digest refuses with no write; concurrent proof drift under the lock refuses; successful cutover changes only board policy; malformed/legacy records are listed; repeat is idempotent; old proofs/tickets/activity remain byte-identical.
- Commands: focused migration tests and server build.
- Done when: strict is never enabled for the release board before its durable census is recorded.

### Step 4 — Reuse the parser in reconciliation

- Files: core reconciliation/types/tests and MCP reconciliation/tests/smoke.
- Symbols: proof evidence state mapping, `reconcileEvidence`, `proofEvidence`, `reconcileTicket`.
- Negative cases: contradictory/legacy/invalid/INCONCLUSIVE never moves Done; stale-SHA PASS/FAIL refuses; valid current FAIL preserves existing implementation/plan/transient routes; packet-aware CORE-127 response remains unchanged.
- Commands: focused core/MCP reconciliation tests, server build and smoke.
- Done when: gating and reconciliation cannot disagree about the proof verdict.

### Step 5 — Update operating prose, generate artifacts and verify

- Files: FRD-002/FRD-006, AGENTS, verify/closeout/auto/setup skills, tool reference, proof/gates/first-ticket manuals and generated manual, prose validators, plugin bundle.
- Preserve: existing review/retry/closeout contracts, 41 tools and byte-identical source/bundle build.
- Commands: script tests, skill/AGENTS/manual checks, plugin build/check, typecheck, one clean non-overlapping `npm run verify`, `git diff --check`.
- Done when: one bounded PR is open at a clean exact head with current report, hosted checks and exact-head independent review.

## Acceptance checks

- A valid schema-2 single authoritative PASS is Done-eligible only at the exact merge SHA.
- The final ledger entry is authoritative; a later FAIL or INCONCLUSIVE cannot be hidden behind an earlier or top-level PASS.
- Blank environment, result/exit contradictions, timestamp ties/reversals, verified/final timestamp drift, unknown keys, ambiguous manual evidence and incompatible failure classes are invalid.
- Only canonical `proof/proof.md` can supply strict proof authority.
- Legacy/invalid proofs are fully reported before strict cutover and never rewritten.
- Strict Done refuses legacy, invalid, contradictory, FAIL and INCONCLUSIVE evidence.
- Reconciliation uses the same parser and cannot recommend Done from those states.
- Report-mode compatibility and stable-v0.3.12 board readability are preserved before promotion.
- Census and reconciliation are read-only; only a complete current-format digest-bound census may atomically change the explicit board policy under the write lock.
- FRD-002, FRD-006, setup guidance and the manuals agree with the implemented report/strict behavior.
- No historical ticket is reopened and no excluded ticket joins the v0.3.13 roster.

## Deviation rules

- Do not add free-prose heuristics to manufacture historical authority.
- Do not add an environment-only policy that lets GUI and MCP disagree.
- Do not add a tool or change proof bytes during migration.
- Any post-CORE-127/CORE-133 overlap requires re-reading their exact merge diff and a versioned plan/files correction before source work.
- One authoritative Windows rail runs only after the final source head is clean.

## Stop condition

Stop implementation at Review with one clean PR, current post-implementation report, synced board, full focused evidence and one completed exact-head Windows rail. Independent review, merge and exact-merge verification remain controller phases.
