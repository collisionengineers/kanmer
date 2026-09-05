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
- R4. **Hard gate:** ≥1 document under `proof/`. **Soft validation:** a declared type/source whose expectations aren't met (e.g. `proof:visual` with zero image files under `proof/`) produces a visible **warning** in `get_doc_gates` and the GUI — never a block (warnings keep the human judging what machines check badly).
- R5. Visual proof convention: screenshots live under `proof/assets/` (or `assets/`), embedded from a proof markdown doc.
- R6. `deployment` remains a separate, non-gating tracker recorded at closeout (ADR-0005).

## Acceptance criteria

1. A `chore` with `proof/after.md` embedding one screenshot passes into Done with no warnings.
2. `proof:visual` with only a text proof doc: move succeeds, warning visible in both `get_doc_gates` and the GUI card/editor.
3. `proof:visual@staging` on a board without a `staging` environment is rejected at profile/ticket validation.
4. Nothing about `deployment` ever blocks a move.

## Related
ADR-0005 · D31/D32/D34 · FRD-002 · FRD-014 · kanmer-verify.

## Compiled-workflow end state (ADR-0016)

`proof/proof.md` is a whole-file, expected-version record with top-level ticket, merged SHA, outcome, and typed chronological attempts. An attempt records its type, command or procedure, result, timestamps, and retained output/evidence. Verification occurs in a detached worktree at the exact merged SHA, never against a moving `main`. `PASS`, `FAIL`, and other typed outcomes remain retained; a FAIL document satisfies the structural proof-exists gate, while skill/check choreography prevents completion from treating it as success. Review attestations may reference this evidence but are canonical in `scratch/review.md`.

### Receipts (MCP-057)

The proof frontmatter carries an optional `receipts[]` list beside
`attempts[]`. A receipt is typed evidence that a hosted CI run — the exact
push-to-`main` `verify` job `pr.yml` already ran for this ticket's PR merge
SHA — discharged one or more of the verification packet's obligations, so
`kanmer-verify` does not re-run them in a fresh detached worktree. A receipt
is accepted (`assessReceipt`) only when its `head_sha` exactly matches the
proof's `merged_sha`, its `event` is `push`, its `job` is `verify`, and its
`conclusion` is `success`; a wrong SHA, a `pull_request`-event run, a
cancelled/skipped/timed-out run, a missing `verify` job, or an unrecognised
`kind` is rejected with a reason. `receipts` is purely additive: it is
absent from every proof written before MCP-057, an absent or empty list
leaves reconciliation and the Done gate exactly as they were, and no
existing proof is rewritten to add one. Manual GUI, installed-host,
Windows-lock, and provider/deployment obligations are never discharged by a
receipt — they remain the verifier's own detached-worktree evidence.

This is the typed-evidence foundation the coming validated `attempts[]`
schema (typed proof-record validation, tracked separately) builds on:
`receipts[]` sits beside that ledger as its own typed list, not inside it,
and the same parser that reads `attempts[]` is expected to read `receipts[]`
without change to either's meaning.
