# Research — CORE-129: proof consistency and staged strict enforcement

## Revalidation

Revalidated against exact `origin/main` `4fda54b4489fa4bc4b6b091c2af67715245ffa08` after CORE-126. The defect remains.

- `packages/core/src/gates.ts::EvidenceProbe/statusOf` and `packages/core/src/store.ts::gateReport` ask only whether `proof/` exists. They never parse the proof record before authorising Done.
- `packages/mcp-server/src/reconciliation.ts::proofEvidence` has a separate parser that accepts `attempts` merely when it is an array and trusts the top-level verdict.
- `packages/core/src/reconciliation.ts` therefore maps a top-level PASS with the matching merge SHA directly to `MOVE_TO_DONE`.
- Current tests preserve existence-only behavior: a plain `# Proof` can satisfy the gate, `attempts: []` can reconcile as PASS, and the MCP smoke explicitly allows a contradictory FAIL/PASS proof to satisfy the gate.
- CORE-126 changed only protected batch behavior and did not alter these paths.

The live examples still reproduce the unsafe authority boundary:

- [[CORE-042]] has top-level PASS but later free-form FAIL and INCONCLUSIVE evidence and says it must remain Verifying.
- [[GUI-141]] has PASS attempts but its body explicitly says installed-package acceptance is incomplete and it must remain Verifying.
- Stable v0.3.12 reports the proof requirement satisfied for these records because only existence is checked.

## Historical census

A read-only census of the live board found 298 `proof/proof.md` files:

- 80 contain an `attempts` field.
- 218 are legacy records without attempts.
- 28 have a raw top-level verdict that differs from the last physical attempt; current attempts do not identify which entries are authoritative, so this is a census signal rather than a safe verdict.
- Five records resemble valid single-attempt PASS records, but none carries the final versioned authority contract.

Historical records must not be rewritten, reopened or silently reclassified. A free-form prose heuristic is not safe enough to convert old bodies into machine authority. CORE-042 and GUI-141 must instead be reported as legacy/unvalidated by the census and refused as new Done authority once strict mode is deliberately enabled.

## Central proof-record contract

Add one core parser shared by the gate and reconciliation. A current record is versioned and contains:

- exact `kind`, schema, merged SHA, verified timestamp and top-level `PASS | FAIL | INCONCLUSIVE`;
- a non-empty ordered `attempts[]` ledger;
- per-attempt `attempted_at`, `result`, `authority: authoritative | supporting`, summary, and optional command/cwd/exit fields;
- at least one authoritative attempt;
- valid enums, SHA/timestamps, paired command/exit fields and chronological order;
- top-level result equal to the latest authoritative attempt.

A later authoritative FAIL or INCONCLUSIVE invalidates an earlier PASS. A later supporting command does not replace the authoritative verdict. A valid current-schema single authoritative PASS remains valid. Consistent FAIL/INCONCLUSIVE records remain writable and stay Verifying.

Natural-language proof prose remains explanatory only. Every rerun that can affect the verdict must append a typed attempt and replace the whole frontmatter-backed record.

## Compatibility and cutover

Use the existing board-upgrade path rather than a second workflow tool or a process-local flag:

- Add one optional board proof-validation policy. Fresh boards default to strict; an existing board with the field absent resolves to report mode.
- Extend the existing `migrate_board` dry run to return the proof census and exact legacy/invalid ticket diagnostics without writing.
- A real migration enables strict mode only after producing the same census. It writes the policy only; it never rewrites proof documents or item stages.
- In report mode, legacy/invalid records remain visible with warnings and preserve historical Done state.
- In strict mode, entering Done requires a valid current-schema PASS. Legacy, invalid, contradictory, FAIL and INCONCLUSIVE records are not satisfied.
- Existing Done tickets are not re-opened; the gate applies only to a future transition.
- The v0.3.13 release process will run the census first on copied/live-safe board state, record it, then deliberately enable strict policy during candidate promotion.

This keeps MCP and GUI behavior identical because the policy lives in `board.yml` and the central store gate reads it; there is no host-specific environment bypass.

## Reconciliation result

Replace the MCP-only proof decoder with the shared core parser.

- Valid PASS keeps the exact current merge-SHA requirement before `MOVE_TO_DONE`.
- Valid FAIL retains failure-class routing and must also name the current merge SHA.
- INCONCLUSIVE, legacy, invalid or contradictory evidence yields no Done recommendation.
- The inspector reports the proof state and diagnostics but remains read-only.
- No new reconciliation action or tool is introduced.

## Required negative cases

- Current single authoritative PASS is accepted and still requires exact merge-SHA equality.
- PASS followed by authoritative FAIL or INCONCLUSIVE is not Done-eligible.
- Top-level result disagreeing with the latest authoritative attempt is invalid.
- Empty attempts, no authoritative attempt, malformed entry, invalid enum/SHA/timestamp/exit pairing and invalid chronology are refused.
- A later supporting-only attempt does not replace the authoritative verdict.
- Consistent FAIL/INCONCLUSIVE remains Verifying and existing failure-class routing remains intact.
- Legacy CORE-042-like and GUI-141-like records are reported before cutover and cannot authorise a new Done move under strict policy.
- Census/migration never changes proof bytes, ticket bytes, stages or historical Done state.
- `get_doc_gates`, GUI readiness and `reconcile_ticket` consume the same parser result.
- A report-mode board remains readable by stable v0.3.12; candidate testing occurs only on copied boards before promotion.

## Non-goals

No prose NLP, proof rewriting, extra stage/tool/database, automatic reopening of history, unrelated reconciliation behavior, provider work or release-publisher changes.
