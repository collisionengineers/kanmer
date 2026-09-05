# Checklist — CORE-129

> Version 3 (2026-09-05, review round 1). One line per acceptance check, against
> `main` at `37b83b14` (with `origin/main` merged). Every box is ticked against a
> named test or a recorded command; see `post-implementation-report/`.
>
> **Correction in this version (F-002):** the strict-mode line below previously
> said a waived record blocks Done. It does not, and never did in the code — an
> operator waiver is an explicit human disposition and `kanmer-verify` has always
> said "only `PASS`, or an operator's `WAIVED_BY_OPERATOR`, permits the final
> move". The line is corrected to the implemented and now-tested reading.

- [x] A valid `proof-record/2` single-authoritative-PASS record parses as `valid-pass`.
- [x] The final `attempts[]` entry must be `authoritative`; a trailing supporting entry is `invalid`.
- [x] A record whose top-level `result`, `failure_class` or `verified_at` disagrees with the final authoritative attempt is `invalid`.
- [x] Frontmatter PASS with a later authoritative FAIL attempt is `invalid`, never `valid-pass`.
- [x] PASS requires exit 0 and no failure class; FAIL requires a non-zero exit and `implementation|plan|transient`; INCONCLUSIVE requires `inconclusive`.
- [x] Blank `environment`, non-40-hex `merged_sha`, unparseable `verified_at`, empty `attempts` and bad enums are `invalid`.
- [x] Attempt timestamps must strictly increase; a tie and a reversal are both `invalid`.
- [x] An attempt must carry complete process evidence (`command`, `cwd`, integer `exit_code`) or the explicit manual form (`exit_code: null`); a partial mix is `invalid`.
- [x] `WAIVED_BY_OPERATOR` is accepted only at the top level and only with `waived_by` and `waiver_reason`; without them it is `invalid`.
- [x] A well-formed waiver reaches `valid-pass` and therefore **satisfies** the strict Done gate, because it is a named human's explicit disposition; reconciliation still declines to recommend the move from one, because that decision is not a machine's to take.
- [x] Unknown top-level keys are preserved on the parsed record and reported in diagnostics, never dropped and never fatal.
- [x] `receipts[]` is parsed by the same parser via `parseProofReceipts`, unknown receipt fields preserved; a receipt whose `head_sha` ≠ `merged_sha` makes the record `invalid`; a proof with no `receipts` is unaffected.
- [x] A record without `schema: 2` (every proof written to date, including this week's) is `legacy` and is never rewritten.
- [x] Parsing is pure: the same bytes yield the same state however many times they are read in one process, so a census and its own locked re-read cannot disagree (`cache: false` on `gray-matter`; review round 1, F-001).
- [x] Two dry-run censuses over an unchanged board return the same digest and the same buckets, and that digest still authorises the cutover.
- [x] `BoardConfig.proofValidation` is optional; `defaultBoardConfig()` writes `strict`; an absent field resolves to `report` with source `default`.
- [x] `get_status.proofValidation` reports `{ mode, source }`.
- [x] `setBoard`, `updateBoard` and `update_column` refuse a report/absent → strict escalation. (`update_column` funnels through `setBoard`, so it is covered by the same guard.)
- [x] Strict activation happens only through the dedicated digest-bound store method under the board write lock.
- [x] In `report` mode proof existence still satisfies the requirement and the parsed state plus diagnostics appear as `get_doc_gates` warnings.
- [x] In `strict` mode the proof requirement is satisfied only by `valid-pass` (a PASS record, or a well-formed operator waiver); legacy, invalid, FAIL and INCONCLUSIVE records block Done.
- [x] Only canonical `proof/proof.md` supplies strict authority; another markdown under `proof/` does not.
- [x] The visual-proof image advisory is unchanged and still non-blocking.
- [x] `migrate_board` dry run returns deterministic valid/legacy/invalid buckets with per-ticket diagnostics and a digest over parser version, ordered ticket identity/stage, raw proof size/sha256 and parsed state.
- [x] The dry run writes nothing; an unreadable proof or listing failure marks the census incomplete and forbids cutover.
- [x] The cutover refuses on an older-format board, on a missing or stale digest, and on drift observed under the lock — in every case without writing.
- [x] A successful cutover writes only `board.yml`'s proof policy; proofs, tickets, stages and activity are byte-identical, and a repeat run is idempotent.
- [x] `KanmerStore.gateReport` reads the canonical proof once and the gate engine consumes the parsed state.
- [x] `packages/mcp-server/src/reconciliation.ts` uses the core parser instead of its own decoder, preserving MCP-057's `receipts` surfacing and both receipt findings.
- [x] Reconciliation recommends Done only from a `valid-pass` naming the exact merge SHA; FAIL keeps its failure-class routing; legacy/invalid/inconclusive/waived recommend nothing; `reconcile_ticket` stays read-only.
- [x] ADR-0011 records the bounded strict proof reader as an explicit exception; FRD-002, FRD-006 and the manuals match the implemented behaviour.
- [x] `kanmer-verify` documents schema 2, one typed attempt per rerun and `authority`; closeout/auto/setup and the tool reference agree; the tool roster stays 41.
- [x] Scoped checks pass: core tests, `npm run test:built`, typecheck, `check-browser.mjs`, smoke, golden, `verify:skills`, `verify:docs`, `check:manual`, `plugin:build` with the bundle committed.
- [x] The v0.4.2 census is recorded from a copy of the live board; the live board is not touched.
