---
status: draft
---

# FRD-035 — Golden boards and candidate promotion safety

**Implements:** PRD-002 requirement 8.

## Behaviour

Kanmer maintains disposable golden boards and supported-provider or simulated
provider-adapter evaluations. They cover a weak controller clearing prepared
work; disjoint and competing controllers; expired lease recovery with dirty work;
batch execution; capture exclusion/promotion; main-only and candidate-based
delivery; independent exact-head review; remediation/delta review and controlled
replan; reconciliation of invalid stages; superseded release attempts;
multi-project isolation; and stable-controlled candidate promotion/rollback.

The evaluation distinguishes controller, implementer, reviewer and verifier
capability. It records verified outcomes, human correction, unnecessary
documents, plan deviations, review cycles, stuck stages, recovered leases,
incorrect-project attempts, duplicate work and observable tool/token cost.

Stable Kanmer remains the live board control plane during candidate work.
Promotion backs up the live board, stops stable cleanly, installs the candidate,
migrates/reconciles, verifies identity, CRUD, leases, review, merge, verification,
closeout and sync, then marks the candidate stable only after all required
acceptance passes. A failure restores the previous stable release and board
backup without discarding immutable failed-attempt evidence.

## Acceptance criteria

1. Golden fixtures execute every scenario class above and retain exact command
   evidence and terminal result.
2. A candidate cannot silently become the live board authority during normal
   ticket or golden-board work.
3. Promotion verifies backup, installation, migration/reconciliation and the
   complete workflow acceptance sequence before marking a candidate stable.
4. A deliberate failed-promotion fixture restores the previous stable release
   and board backup, then records the failed candidate and rollback result.
5. Required CI and Kanmer gates are green for the candidate promotion record.

## Edge cases

- An unsupported provider capability is recorded as unavailable or simulated;
  it is never fabricated as a provider pass.
- A superseded immutable release attempt remains readable and names its
  successor.
