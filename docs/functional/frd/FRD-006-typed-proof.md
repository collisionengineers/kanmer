---
status: draft
covers: v2 proof gate (shipped) + types, sources, soft validation (v3)
---

# FRD-006 — Typed proof

## Overview

Proof is evidence the shipped result works, gathered on merged `main`. v3 types the evidence (UI work wants pixels; logic wants test output) and separates **type** from **source** — local build by default, deployed environment only by explicit opt-in — so trivial tickets never wait on release cycles.

## Requirements

- R1. Proof **types** are declared in `board.yml` (shipped defaults: `visual`, `test-output`, `command-log`), each with a template (FRD-014) and skill guidance (kanmer-verify reads the type and knows what to capture).
- R2. Proof **source** defaults to the **local build of merged `main`**. `proof:<type>@<env-id>` opts into deployed evidence and is valid only for a board-declared deployment environment.
- R3. Profiles and custom `requires:` reference proof as `proof`, `proof:visual`, or `proof:visual@staging` (FRD-002 P5).
- R4. **Hard gate:** ≥1 document under `proof/` in `report` mode; a valid `proof-record/2` **PASS** in the canonical `proof/proof.md` in `strict` mode (R7). **Soft validation:** a declared type/source whose expectations aren't met (e.g. `proof:visual` with zero image files under `proof/`) produces a visible **warning** in `get_doc_gates` and the GUI — never a block (warnings keep the human judging what machines check badly). The image advisory is unchanged by R7 and still runs after the hard check.
- R5. Visual proof convention: screenshots live under `proof/assets/` (or `assets/`), embedded from a proof markdown doc.
- R6. `deployment` remains a separate, non-gating tracker recorded at closeout (ADR-0005).
- R7. **`proof-record/2` is validated for internal consistency** (CORE-129). A record declaring `schema: 2` must carry `kind: proof-record`, a 40-hex `merged_sha`, a non-empty `environment`, an ISO `verified_at`, a `result`, and a non-empty `attempts[]`. Each attempt carries `attempted_at`, `result` (`PASS | FAIL | INCONCLUSIVE`), `authority` (`authoritative | supporting`), a `summary`, a compatible `failure_class`, and either complete process evidence (`command`, `cwd`, integer `exit_code`) or the explicit manual form (`exit_code: null`, no `command`/`cwd`). Attempt timestamps strictly increase, the **final entry must be authoritative**, and the top-level `result`, `failure_class` and `verified_at` are bound to it — so a later FAIL or INCONCLUSIVE can never sit behind an earlier PASS. `WAIVED_BY_OPERATOR` is accepted at the top level only, with the operator's identity and reason, and is the single exception to that binding. Unknown top-level keys are preserved and reported; unknown *attempt* keys are refused. A record without `schema: 2` — every proof written before this requirement — is reported **legacy**: described, never rewritten, and never authority under `strict`.

## Report and strict

`board.yml`'s optional `proofValidation.mode` decides what R4's hard gate means. Absent resolves to `report` (today's existence-only behaviour plus warnings); a board created today is written `strict`. An existing board reaches `strict` only through `migrate_board`: a dry run returns a read-only census of every canonical `proof/proof.md` bucketed `valid` / `legacy` / `invalid` / `absent`, with per-ticket diagnostics and a `digest` binding that exact reading; passing that digest back on a real run recomputes it under the board write lock and writes only the policy. The census and the cutover never touch proof bytes, tickets, stages or activity, and an ordinary `setBoard`/`updateBoard` cannot escalate to `strict` at all. `get_status.proofValidation` reports `{ mode, source }` so a stripped key is observable rather than silent.

A well-formed `WAIVED_BY_OPERATOR` record **satisfies** the strict gate. That is
not a loophole in R7 but the point of it: the waiver is the one result a machine
may not write, it must name the operator and the reason, and `kanmer-verify` has
always said that only a `PASS` or an operator's waiver permits the final move. A
waiver missing either field is `invalid` and blocks like any other broken record.
Reconciliation is the asymmetry that keeps this honest — it never recommends Done
from a waiver, because deciding to ship despite the evidence is a person's call.

Reconciliation reads the *same* parser (`packages/mcp-server/src/reconciliation.ts`'s `proofEvidence` delegates to it), so the movement gate and the read-only inspector cannot disagree about one document. There, `legacy` never yields a Done recommendation regardless of the board's mode: `report` relaxes the gate a human passes through, not the advice a machine gives.

## Acceptance criteria

1. In `report` mode, a `chore` with `proof/after.md` embedding one screenshot passes into Done with no warnings. Under `strict` the same ticket also needs a valid `proof-record/2` PASS at `proof/proof.md`; with one, it likewise passes with no warnings.
2. `proof:visual` with only a text proof doc: move succeeds under `report`, warning visible in both `get_doc_gates` and the GUI card/editor. Under `strict` the image warning still fires once the typed record satisfies the hard check.
3. `proof:visual@staging` on a board without a `staging` environment is rejected at profile/ticket validation.
4. Nothing about `deployment` ever blocks a move.
5. A record whose top-level `result` is PASS while its final authoritative attempt is FAIL is `invalid`, and under `strict` the Done refusal says the record breaks the contract rather than that proof is missing.
6. A proof written before R7 is reported `legacy` by `migrate_board`'s census, is never rewritten by it, and cannot authorise a new Done transition under `strict`.
7. `migrate_board` without a `proof_census_digest` never enables `strict`; with a stale digest, an incomplete census, or a pre-format-3 board it refuses without writing.

## Related
ADR-0005 · ADR-0011 (the bounded content readers) · D31/D32/D34 · FRD-002 · FRD-014 · CORE-129 · MCP-057 · kanmer-verify.

## Compiled-workflow end state (ADR-0016)

`proof/proof.md` is a whole-file, expected-version record with top-level ticket, merged SHA, outcome, and typed chronological attempts. An attempt records its type, command or procedure, result, timestamps, and retained output/evidence. Verification occurs in a detached worktree at the exact merged SHA, never against a moving `main`. `PASS`, `FAIL`, and other typed outcomes remain retained. A FAIL document satisfies the structural proof-exists gate in `report` mode, where skill/check choreography prevents completion from treating it as success; under `strict` (R7) it does not satisfy the gate at all, and the refusal says so. Review attestations may reference this evidence but are canonical in `scratch/review.md`.

### Receipts (MCP-057)

The proof frontmatter carries an optional `receipts[]` list beside
`attempts[]`. A receipt is typed evidence that a hosted CI run — the exact
push-to-`main` `verify` job `pr.yml` already ran for this ticket's PR merge
SHA — discharged one or more of the verification packet's obligations, so
`kanmer-verify` does not re-run them in a fresh detached worktree. A receipt
is accepted (`assessReceipt`, `packages/core/src/proof-receipts.ts`) only
when its `head_sha` exactly matches the proof's `merged_sha`, its `event` is
`push`, its `job` is exactly `verify`, its `workflow` is exactly `pr.yml`,
and its `conclusion` is `success`; a wrong or wrong-case SHA, a
`pull_request`-event run, a cancelled/skipped/timed-out run, a job or
workflow named anything else, or an unrecognised `kind` is rejected with a
reason. This is enforced at verification time, not merely documented:
`packages/core/src/reconciliation.ts` calls `assessReceipt` on every receipt
in the proof and reports a `head_sha` disagreement as
`PROOF_RECEIPT_SHA_MISMATCH` and every other rejection as
`PROOF_RECEIPT_REJECTED`, either of which blocks the Done and backward
verification-failure routes. `receipts` is purely additive: it is absent
from every proof written before MCP-057, an absent or empty list leaves
reconciliation and the Done gate exactly as they were, and no existing proof
is rewritten to add one. Manual GUI, installed-host,
Windows-lock, and provider/deployment obligations are never discharged by a
receipt — they remain the verifier's own detached-worktree evidence.

This is the typed-evidence foundation the validated `attempts[]` schema (R7)
builds on: `receipts[]` sits beside that ledger as its own typed list, not
inside it, and CORE-129's `parseProofRecord` reads both without changing
either's meaning. It adds one rule of its own, about the document rather than
the pull request: a receipt whose `head_sha` disagrees with the record's own
`merged_sha` makes the record **invalid**, because a proof that says it
verified one commit while carrying evidence about another contradicts itself.
`assessReceipt`'s comparison against the *live* merge SHA is a different
question and is unchanged.
