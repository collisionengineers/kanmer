---
status: draft
---

# ADR-0005 — Proof is separated from deployment; proof has type and source axes

## Context

'Proof' risked meaning 'evidence from production', which would strand trivial tickets behind release cycles. Different work wants different evidence (UI wants pixels; logic wants test output).

## Decision

Proof **types** are declared in board.yml (`visual`, `test-output`, `command-log`, …), each with a template and skill guidance. Proof **source** defaults to the local build of merged `main`; `proof:visual@<env-id>` opts into deployed evidence, valid only for board-declared deployment environments. Enforcement is **soft**: the hard gate remains '≥1 proof doc exists'; a type/source mismatch (e.g. proof:visual with zero images) produces a visible warning, never a block. The `deployment` field remains a separate, non-gating tracker recorded at closeout.

## Alternatives considered

(a) Guidance-only — drifts (the lesson of the whole session). (b) Hard validation — gets gamed by a 1-pixel screenshot; removes the human judgment that machines check badly. (c) Folding source into the type list — combinatorial.

## Consequences

Trivial tickets verify in minutes on local main; UI work gets typed visual expectations; deployed verification is a deliberate opt-in; humans stay in the loop exactly where judgment is needed.
