# Plan — CORE-129: validated proof authority and deliberate strict cutover

> **Version 2 (2026-09-05).** Supersedes version 1, which was written against a
> "v0.3.13" roster and base `4fda54b4`. Neither exists any more. This version is
> written against `main` at `37b83b1435602dddeaea3da32668b4846d1be963`, release
> **0.4.2**, horizon **HZN-009**. The "Required changes 1–5" contract below is
> carried over unchanged in substance; what changed is the base, the roster, the
> `receipts[]` requirement and the MCP-057 interaction.

## Objective

Make the exact proof record — not file existence and not free prose — the single
authority for entering Done and for reconciliation. Preserve every historical
proof byte, census old records before cutover, and enable strict validation only
through the existing board migration path. No new tool, stage, database, workflow
engine or dependency is introduced.

## Starting state

- **Base:** branch `CORE-129-typed-proof-record` off `main` at
  `37b83b1435602dddeaea3da32668b4846d1be963` (DOC-028, GUI-152, CORE-140, DOC-026
  merged). Build-once rail (CORE-140): `npm run build && node scripts/build-stamp.mjs --write`
  once, then `npm run test:built` or focused vitest files.
- **Predecessor:** PR #325 (MCP-057, `MCP-057-evidence-first-verify`, head
  `24f22653`) merges first. `origin/main` is merged into this branch before the PR
  is opened, keeping both behaviours in `reconciliation.ts` and `types.ts`.
- Research: `research/research.md` (revalidated 2026-09-05).
- Files: `files/files.md` (version 2, 2026-09-05).
- Core gates are existence-only. MCP reconciliation separately trusts the
  top-level verdict through its own decoder.
- Existing boards have no proof-validation policy, so an absent field must keep
  behaving exactly as today.

## Governing contract

- `docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md`: amend the
  movement-gate content-reader boundary so strict typed proof validation is an
  explicit, bounded exception rather than an undocumented second content parser.
- `docs/functional/frd/FRD-002-requirement-profiles.md`: replace the existence-only
  proof requirement with explicit report/strict semantics.
- `docs/functional/frd/FRD-006-typed-proof.md`: replace the historical rule that a
  FAIL document satisfies the hard gate with the typed-proof authority and the
  compatibility cutover, and join it to the MCP-057 `receipts[]` section.
- `docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md`:
  exact merged-SHA PASS precedes Done.
- AGENTS rule 20: INCONCLUSIVE is not PASS, later evidence does not erase failure,
  and Done requires PASS.
- CORE-042 and GUI-141 are historical evidence only. Do not reopen, rewrite or add
  them to the 0.4.2 roster. The live board's strict cutover decision belongs to
  CORE-141 at the 0.4.2 cut.

## Required changes

1. **Create one versioned proof parser** — `packages/core/src/proof-record.ts`
   (+ `proof-record.test.ts`, exported from `index.ts`, not from `browser.ts`).
   - `parseProofRecord(frontmatter)` is pure (no IO, no `node:` imports) and
     mirrors `review-attestation.ts`'s style; `parseProofDocument(raw)` runs
     `gray-matter` and delegates, so no caller decodes proof frontmatter itself.
   - `proof-record/2` semantics: `kind: proof-record`, `schema: 2`, 40-hex
     `merged_sha`, non-empty `environment`, ISO `verified_at`, a `result`, and a
     non-empty `attempts[]`.
   - Every attempt carries `attempted_at`, `result` in `PASS | FAIL | INCONCLUSIVE`,
     `authority` in `authoritative | supporting`, a non-empty `summary`, a
     compatible `failure_class`, and either complete process evidence (`command`,
     `cwd`, integer `exit_code`) or the explicit manual/no-process form
     (`exit_code: null`, no `command`/`cwd`).
   - Attempt timestamps are strictly increasing; ties are refused. The final entry
     must be `authoritative`. Top-level `result`, `failure_class` and `verified_at`
     are bound to that final authoritative entry.
   - PASS requires exit `0` and no failure class; FAIL requires a non-zero exit and
     `implementation | plan | transient`; INCONCLUSIVE uses `inconclusive`.
   - `WAIVED_BY_OPERATOR` is accepted at the **top level only**, and only with the
     operator identity fields the verify skill requires (`waived_by`,
     `waiver_reason`); it is the one documented exception to top-level/final-attempt
     binding, and it is reported distinctly so reconciliation never recommends Done
     from a waiver.
   - Unknown top-level keys are **preserved and reported**, never dropped and never
     fatal.
   - `receipts[]` is parsed with MCP-057's `parseProofReceipts` (never
     re-implemented). A receipt whose `head_sha` disagrees with the record's own
     `merged_sha` makes the record **invalid**; a malformed `receipts` list is
     likewise invalid on a schema-2 record. A record with no `receipts` is
     unaffected.
   - Result: `valid-pass | valid-fail | valid-inconclusive | legacy | invalid` plus
     deterministic, ordered diagnostics. A record without `schema: 2` — which is
     every proof on the live board today, including the ones written this week by
     DOC-028/GUI-152/CORE-140 verification, whose `attempts` have no `authority` —
     is `legacy` and is never rewritten or heuristically upgraded.

2. **Make proof policy a board-owned central invariant**
   - Optional `proofValidation: { mode: "report" | "strict" }` on `BoardConfig`
     (zod, additive, `.optional()`).
   - `defaultBoardConfig()` writes `strict`. An existing board with the field absent
     resolves to `report`.
   - `resolveProofValidation(board)` returns `{ mode, source: "board" | "default" }`;
     `get_status.proofValidation` exposes it, so a stripped key is observable.
   - In `report` mode, existence still satisfies the requirement, and the parsed
     state plus its diagnostics are surfaced as `get_doc_gates` warnings (and
     therefore in the GUI).
   - In `strict` mode, the proof requirement is satisfied only by `valid-pass`. The
     visual-proof image advisory is unchanged and still runs after the hard check.
   - `setBoard`/`updateBoard`/`update_column` refuse a `report`-or-absent → `strict`
     escalation. Strict activation is available only through one dedicated
     digest-bound store method under the board write lock (used by change 3).

3. **Census before enabling strict** — extend `migrate_board`; do not add a tool.
   - Dry run censuses every canonical `proof/proof.md` into deterministic
     `valid | legacy | invalid` buckets with per-ticket diagnostics, and returns a
     digest over the parser version, the ordered ticket identity/stage, the raw
     proof size and sha256, and the parsed state.
   - Refuse to combine the proof cutover with a format migration: migrate format
     first, then operate on a current-format board.
   - Any listing or read failure marks the census incomplete and forbids cutover.
   - A real run requires the caller's exact digest, re-reads the census under the
     board write lock and writes only the board policy; a mismatch refuses without
     writing. `migrate_board` without a digest never enables strict.
   - Idempotent: an already-strict board reports no policy change and the same
     read-only census. Proofs, tickets, stages and activity are never edited.
   - The `migrate_board` tool description is updated. The tool roster stays 41.

4. **Unify Done gating and reconciliation**
   - `KanmerStore.gateReport` reads canonical proof bytes once and passes the parsed
     state into the gate engine through a new `EvidenceProbe` member.
   - Replace `packages/mcp-server/src/reconciliation.ts::proofEvidence`'s independent
     decoder with the core parser, keeping MCP-057's `receipts` surfacing and both
     receipt findings intact.
   - Valid PASS still requires the exact merge SHA. Valid FAIL keeps the existing
     `implementation | plan | transient | inconclusive` routing. Legacy, invalid,
     INCONCLUSIVE and waived records produce no Done recommendation.
   - `reconcile_ticket` stays read-only; no new action, finding-free paths unchanged.

5. **Publish the new record contract**
   - Amend ADR-0011 (bounded strict proof reader as an explicit, third exception),
     FRD-002, FRD-006, `docs/manual/proof.md`, `docs/manual/gates.md`.
   - `kanmer-verify`: write schema 2 as one whole-file record, every rerun a typed
     attempt, `authority` on every attempt. `kanmer-closeout`, `kanmer-auto`,
     `kanmer-setup` and the tool reference where they mention proof.
   - AGENTS.md §4/§5 proof lines; regenerate the manual (`npm run build:manual`) and
     the plugin bundle (`npm run plugin:build` — the bundle changes because MCP
     server source changed; commit it).
   - `scripts/verify-skill-prose.mjs` and `npm run verify:docs` must pass.

## Ordered steps

### Step 1 — the pure parser

Files: `packages/core/src/proof-record.ts`, `proof-record.test.ts`, `index.ts`.
Symbols: `parseProofRecord`, `parseProofDocument`, `ProofRecordState`,
`ProofRecord`, `PROOF_RECORD_PARSER_VERSION`.
Table-driven negative cases: missing/unknown `schema`; wrong `kind`; blank
`environment`; non-40-hex `merged_sha`; unparseable `verified_at`; empty
`attempts`; non-object attempt; unknown attempt result/authority enum; missing
`summary`; non-authoritative final entry; partial process evidence; non-null
`exit_code` on the manual form; `command`/`cwd` present with a null exit code;
PASS with non-zero exit; FAIL with zero exit; FAIL with `inconclusive` class;
INCONCLUSIVE with a failure class other than `inconclusive`; PASS carrying a
failure class; timestamp tie; timestamp reversal; `verified_at` drift from the
final attempt; top-level result/failure-class drift; `WAIVED_BY_OPERATOR` without
operator identity; a receipt whose `head_sha` ≠ `merged_sha`; a non-array
`receipts`. Preserved: a valid one-attempt authoritative PASS; unknown top-level
keys retained and reported; a legacy record (no `schema`) with today's shape.

### Step 2 — report/strict board policy

Files: `types.ts`, `board.ts`, `gates.ts`, `store.ts`, plus `board.test.ts`,
`gates.test.ts`, `profile-matrix.test.ts`, `store.test.ts`, `docs.test.ts`,
`capture.test.ts`, `claims.test.ts`, `delivery.test.ts`, `release.test.ts`,
`project.test.ts`.
Symbols: `ProofValidationSchema`, `resolveProofValidation`, `EvidenceProbe.proofState`,
`statusOf`, `gateReport`, `setBoardWithProofValidationGuard`.
Negative cases: absent policy resolves `report`/`default`; explicit policy resolves
`board`; `setBoard`/`updateBoard` escalation to strict refuses; strict blocks
legacy/invalid/FAIL/INCONCLUSIVE/waived; strict passes a valid PASS; a
non-canonical proof markdown cannot satisfy strict; visual advisory unchanged;
report mode still satisfied by existence and emits warnings.

### Step 3 — census and cutover in `migrate_board`

Files: `migrate.ts`, `migrate.test.ts`, `packages/mcp-server/src/index.ts`.
Symbols: `auditProofRecords`, `ProofCensus`, `proofCensusDigest`,
`migrateProofValidation`, `KanmerStore.activateStrictProofValidation`.
Negative cases: old-format board refuses the cutover; dry run writes nothing;
incomplete census refuses; missing/stale digest refuses without writing; drift
under the lock refuses; success changes only the board policy; repeat is
idempotent; proof/ticket bytes unchanged.

### Step 4 — reconciliation reuses the parser

Files: `packages/core/src/reconciliation.ts` (only if needed),
`packages/mcp-server/src/reconciliation.ts`, `reconciliation.test.mjs`,
`packages/mcp-server/src/smoke.mjs`, `packages/mcp-server/src/golden-board.mjs`.
Negative cases: legacy/invalid/INCONCLUSIVE/waived never recommend Done; stale-SHA
PASS/FAIL still refuse; MCP-057's `PROOF_RECEIPT_SHA_MISMATCH` and
`PROOF_RECEIPT_REJECTED` still fire; existing FAIL routes intact.

### Step 5 — prose, generated artefacts, checks

Files: ADR-0011, FRD-002, FRD-006, `docs/manual/proof.md`, `docs/manual/gates.md`,
`AGENTS.md`, `kanmer-verify`, `kanmer-closeout`, `kanmer-auto`, `kanmer-setup`,
`plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`,
`apps/gui/src/renderer/src/manual/chapters.generated.ts`,
`plugins/kanmer/mcp/kanmer-mcp.cjs`.

## Acceptance checks

- A valid schema-2 single-authoritative-PASS record is Done-eligible under strict,
  and only at the exact merge SHA.
- The final ledger entry must be authoritative, so a later FAIL or INCONCLUSIVE can
  never hide behind an earlier or top-level PASS.
- Blank environment, result/exit contradictions, timestamp ties and reversals,
  `verified_at` drift, incompatible failure classes and ambiguous manual/process
  evidence are `invalid`; unknown top-level keys are preserved and reported.
- A `receipts[]` list is validated by the same parser: well-formed entries and
  unknown fields preserved, a `head_sha` ≠ `merged_sha` receipt invalid, and a proof
  without `receipts` unaffected.
- A record without `schema: 2` is `legacy`, never rewritten, and cannot authorise a
  new Done transition under strict policy.
- Only canonical `proof/proof.md` supplies strict proof authority.
- `report` mode preserves today's existence behaviour and adds warnings only.
- Census and reconciliation are read-only; only a complete, current-format,
  digest-bound census may change the board policy, under the write lock; generic
  board writers cannot escalate to strict.
- ADR-0011 authorises the bounded strict proof reader; FRD-002, FRD-006, the manuals
  and the skills agree with the implemented behaviour; the tool roster stays 41 and
  no dependency is added.

## Deviation rules

- No free-prose heuristics that manufacture historical authority.
- No environment-variable or host-local policy that lets the GUI and MCP disagree.
- No new tool, and no proof bytes changed during the census.
- Do not touch `scripts/verify.mjs`, `scripts/agents-block-body.mjs`, `.github/workflows/pr.yml`,
  or `apps/gui/**` beyond what changed `get_doc_gates` output forces; if a GUI edit
  is needed, keep it minimal and say so in the report.

## Stop condition

Stop at Review with one draft-then-ready PR against `main`, `origin/main` merged in,
the post-implementation report written, the board updated, and the scoped checks
recorded with exit codes. Independent review, merge and exact-merge verification
remain other phases.
