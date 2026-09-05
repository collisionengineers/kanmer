# Checklist — CORE-129

> Version 2 (2026-09-05). One line per acceptance check, against `main` at `37b83b14`.

- [ ] A valid `proof-record/2` single-authoritative-PASS record parses as `valid-pass`.
- [ ] The final `attempts[]` entry must be `authoritative`; a trailing supporting entry is `invalid`.
- [ ] A record whose top-level `result`, `failure_class` or `verified_at` disagrees with the final authoritative attempt is `invalid`.
- [ ] Frontmatter PASS with a later authoritative FAIL attempt is `invalid`, never `valid-pass`.
- [ ] PASS requires exit 0 and no failure class; FAIL requires a non-zero exit and `implementation|plan|transient`; INCONCLUSIVE requires `inconclusive`.
- [ ] Blank `environment`, non-40-hex `merged_sha`, unparseable `verified_at`, empty `attempts` and bad enums are `invalid`.
- [ ] Attempt timestamps must strictly increase; a tie and a reversal are both `invalid`.
- [ ] An attempt must carry complete process evidence (`command`, `cwd`, integer `exit_code`) or the explicit manual form (`exit_code: null`); a partial mix is `invalid`.
- [ ] `WAIVED_BY_OPERATOR` is accepted only at the top level and only with the operator identity fields; without them it is `invalid`.
- [ ] Unknown top-level keys are preserved on the parsed record and reported in diagnostics, never dropped and never fatal.
- [ ] `receipts[]` is parsed by the same parser via `parseProofReceipts`, unknown receipt fields preserved; a receipt whose `head_sha` ≠ `merged_sha` makes the record `invalid`; a proof with no `receipts` is unaffected.
- [ ] A record without `schema: 2` (every proof written to date, including this week's) is `legacy` and is never rewritten.
- [ ] `BoardConfig.proofValidation` is optional; `defaultBoardConfig()` writes `strict`; an absent field resolves to `report` with source `default`.
- [ ] `get_status.proofValidation` reports `{ mode, source }`.
- [ ] `setBoard`, `updateBoard` and `update_column` refuse a report/absent → strict escalation.
- [ ] Strict activation happens only through the dedicated digest-bound store method under the board write lock.
- [ ] In `report` mode proof existence still satisfies the requirement and the parsed state plus diagnostics appear as `get_doc_gates` warnings.
- [ ] In `strict` mode the proof requirement is satisfied only by `valid-pass`; legacy, invalid, FAIL, INCONCLUSIVE and waived records block Done.
- [ ] Only canonical `proof/proof.md` supplies strict authority; another markdown under `proof/` does not.
- [ ] The visual-proof image advisory is unchanged and still non-blocking.
- [ ] `migrate_board` dry run returns deterministic valid/legacy/invalid buckets with per-ticket diagnostics and a digest over parser version, ordered ticket identity/stage, raw proof size/sha256 and parsed state.
- [ ] The dry run writes nothing; an unreadable proof or listing failure marks the census incomplete and forbids cutover.
- [ ] The cutover refuses on an older-format board, on a missing or stale digest, and on drift observed under the lock — in every case without writing.
- [ ] A successful cutover writes only `board.yml`'s proof policy; proofs, tickets, stages and activity are byte-identical, and a repeat run is idempotent.
- [ ] `KanmerStore.gateReport` reads the canonical proof once and the gate engine consumes the parsed state.
- [ ] `packages/mcp-server/src/reconciliation.ts` uses the core parser instead of its own decoder, preserving MCP-057's `receipts` surfacing and both receipt findings.
- [ ] Reconciliation recommends Done only from a `valid-pass` naming the exact merge SHA; FAIL keeps its failure-class routing; legacy/invalid/inconclusive/waived recommend nothing; `reconcile_ticket` stays read-only.
- [ ] ADR-0011 records the bounded strict proof reader as an explicit exception; FRD-002, FRD-006 and the manuals match the implemented behaviour.
- [ ] `kanmer-verify` documents schema 2, one typed attempt per rerun and `authority`; closeout/auto/setup and the tool reference agree; the tool roster stays 41.
- [ ] Scoped checks pass: core tests, `npm run test:built`, typecheck, `check-browser.mjs`, smoke, golden, `verify:skills`, `verify:docs`, `check:manual`, `plugin:build` with the bundle committed.
- [ ] The v0.4.2 census is recorded from a copy of the live board; the live board is not touched.
