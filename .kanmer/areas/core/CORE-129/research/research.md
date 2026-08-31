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

- 80 contain a raw `attempts` field; 218 do not.
- Two attempt-bearing records ([[GUI-133]] and [[GUI-135]]) are not YAML-parseable.
- Zero records carry schema 2 or the final authority markers.
- A raw scan finds 30 top-level/last-entry differences among parseable ledgers. The earlier 28 count excluded blank or non-contract verdict shapes; neither number is authority. The implementation must emit deterministic valid/legacy/invalid buckets and a digest from the shared parser.
- Five records resemble single-attempt PASS candidates, but all remain legacy because none carries the final versioned authority contract.
- The likely final parser census is 296 legacy, two invalid and zero current-valid records: 286 Done, five live Verifying, six archived Verifying and one archived Review. Strict cutover affects future transitions only; the five live Verifying records are CORE-036, CORE-042, GUI-141, MCP-028 and MCP-051.

Historical records must not be rewritten, reopened or silently reclassified. A free-form prose heuristic is not safe enough to convert old bodies into machine authority. CORE-042 and GUI-141 must instead be reported as legacy/unvalidated by the census and refused as new Done authority once strict mode is deliberately enabled.

## Governing correction

`FRD-002` G5/AC1 and `FRD-006` R4/AC1-2 currently define proof existence—including a FAIL document—as sufficient for the structural gate. That text was correct for the earlier existence-only design but contradicts the frozen v0.3.13 acceptance and the central parser proposed here. Because FRDs outrank AGENTS, CORE-129 must update and link both FRDs in the same PR: report mode preserves historical existence compatibility, while strict mode requires canonical validated PASS authority. The user manual and kanmer-setup migration path must state the same report → census/digest → strict transition.

## Central proof-record contract

Add one core parser shared by the gate and reconciliation. A current record is versioned and contains:

- exact `kind`, schema, merged SHA, nonempty `environment`, verified timestamp and top-level `PASS | FAIL | INCONCLUSIVE`;
- a non-empty ordered `attempts[]` ledger whose final entry is authoritative; supporting entries may precede it but can never trail the verdict;
- per-attempt `attempted_at`, `result`, `authority: authoritative | supporting`, summary, compatible `failure_class`, and explicit process evidence (`command`, `cwd`, integer `exit_code`) or an explicit manual/no-process form with `exit_code: null`;
- strict objects with no unknown authority fields, valid enums, SHA/timestamps, deterministic diagnostics, all-or-none process evidence, and strictly increasing attempt timestamps with ties refused;
- exit/result consistency when a process exit is present: PASS requires zero and FAIL requires non-zero;
- `verified_at` equal to the final authoritative attempt timestamp, top-level result equal to that attempt, and any top-level `failure_class` equal to the attempt copy (PASS omits it; FAIL uses implementation, plan or transient; INCONCLUSIVE uses inconclusive).

Because the final ledger entry must be authoritative, a later FAIL or INCONCLUSIVE can never sit behind an earlier PASS as merely supporting prose: it must become the final authoritative verdict or the record is invalid. Supporting entries may appear only before that final verdict. A valid current-schema single authoritative PASS remains valid. Consistent FAIL/INCONCLUSIVE records remain writable and stay Verifying.

Natural-language proof prose remains explanatory only. Every rerun that can affect the verdict must append a typed attempt and replace the whole frontmatter-backed record.

## Compatibility and cutover

Use the existing board-upgrade path rather than a second workflow tool or a process-local flag:

- Add one optional board proof-validation policy. Fresh boards default to strict; an existing board with the field absent resolves to report mode.
- An older-format board first completes the ordinary format migration. Proof-policy cutover is never combined with a format migration.
- On a current-format board, extend the existing `migrate_board` dry run to return the proof census and exact legacy/invalid ticket diagnostics without writing.
- The digest binds a parser/census version plus each ordered ticket identity/stage, raw canonical-proof size/SHA-256, parsed state and deterministic diagnostics. Any listing, inventory or read failure makes the census incomplete and forbids cutover.
- A real report-to-strict migration requires that exact digest, repeats the census and writes the board policy under the same ticket-write lock, and refuses without writing when the digest or completeness changes. Calling `migrate_board` without the digest never silently enables strict.
- A successful real migration writes the policy only; it never rewrites proof documents, tickets, stages or activity.
- In report mode, legacy/invalid records remain visible with warnings and preserve historical Done state.
- In strict mode, entering Done requires a valid current-schema PASS. Legacy, invalid, contradictory, FAIL and INCONCLUSIVE records are not satisfied.
- Existing Done tickets are not re-opened; the gate applies only to a future transition.
- The v0.3.13 release process will run the census first on copied/live-safe board state, record it, then deliberately enable strict policy during candidate promotion.

This keeps MCP and GUI behavior identical because the policy lives in `board.yml` and the central store gate reads it; there is no host-specific environment bypass. `get_status.proofValidation` reports the resolved mode and whether its source is an explicit board field or the legacy default, so an older server stripping the key is observable.

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
- Empty attempts, no authoritative attempt, malformed entry, invalid enum/SHA/timestamp/exit pairing, result/exit contradiction, timestamp ties or reversals, and incompatible failure class are refused.
- Strict authority comes only from canonical `proof/proof.md`; another Markdown file in the proof folder cannot satisfy the gate.
- A supporting entry may precede the final authority; a trailing supporting entry is invalid because the final ledger entry must be authoritative.
- Missing/blank environment, verified/final timestamp drift, top/attempt failure-class drift, unknown keys and ambiguous manual/process evidence are invalid.
- Consistent FAIL/INCONCLUSIVE remains Verifying and existing failure-class routing remains intact.
- Legacy CORE-042-like and GUI-141-like records are reported before cutover and cannot authorise a new Done move under strict policy.
- Census/migration never changes proof bytes, ticket bytes, stages or historical Done state.
- `get_doc_gates`, GUI readiness and `reconcile_ticket` consume the same parser result.
- A report-mode board remains readable by stable v0.3.12; candidate testing occurs only on copied boards before promotion.

## Non-goals

No prose NLP, proof rewriting, extra stage/tool/database, automatic reopening of history, unrelated reconciliation behavior, provider work or release-publisher changes.
