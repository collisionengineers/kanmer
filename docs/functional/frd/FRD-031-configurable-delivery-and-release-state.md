---
status: draft
---

# FRD-031 — Configurable delivery and release state

**Implements:** PRD-002 requirement 4.

## Behaviour

Each project declares Git delivery policy: integration branch, release branch,
optional release-candidate pattern, hotfix-backport rule and **verification
contract**. Normal implementation PRs target the configured integration branch.
Execution material names the exact base SHA, base branch, PR target and
verification target.

The verification contract belongs to the delivery policy rather than to a
parallel concept, because it answers the same class of question: where a change
integrates, and which hosted run proves that it did. It names the workflow, the
set of jobs that must all be completed and successful, and the triggering event
(`push`, `pull_request` or `workflow_run`); all three are declared together or
not at all. It is resolved by the same `resolveDelivery` and reported by
`get_status.delivery.verification`, with its own `verificationSource` because a
project may declare a policy and no contract. Post-merge receipts (FRD-006) are
judged against it, and the verify skill builds its run lookup from it. A project
whose contract's workflow has no run at the exact merge SHA takes the
designated-verifier fallback — every obligation run locally at the merge commit,
`receipts: []` in the proof — which is a complete outcome, not a degraded one.
The contract is deliberately excluded from the delivery-policy version that
freezes a release candidate's identity: it says which run proves a merge, not
where the merge goes.

Workflow stage represents acceptance against the integration target. Independent
delivery state records not integrated, integrated branch/SHA, release candidate,
released branch/tag, deployed and production verified. An ordinary ticket may
reach Done after exact integration verification; production release inclusion is
recorded separately.

Candidate-enabled projects create an immutable candidate identity. Remediation
creates a new candidate identity and cannot reuse changed-SHA evidence. One
renewable release lease owns a release channel at a time. A failed immutable
attempt retains its proof; an explicitly recorded successor may supersede it.
A hotfix to the release branch is ported back to the integration branch. Kanmer's
own repository policy is not changed merely to demonstrate another policy —
which applies to the verification contract too: `pr.yml`/`verify`/`push` is
Kanmer's own contract, shipped as the default, and Kanmer's board declares no
block. No other repository's workflows are renamed to satisfy Kanmer.

## Acceptance criteria

1. A main-only fixture targets and verifies `main` at its exact merged SHA.
2. A dev-to-frozen-candidate-to-main fixture targets `dev`, proves integration,
   creates an immutable candidate and records final release separately.
3. A changed candidate SHA requires a new candidate identity and new evidence.
4. A second concurrent release owner receives `RELEASE_CHANNEL_HELD`; a
   successful or superseded terminal attempt clears the lease appropriately.
5. A release-branch hotfix records its required integration backport.
6. An undeclared board resolves the shipped verification contract and reports
   `verificationSource: default`; a board declaring one resolves and reports it
   as `board`, receipts are accepted or rejected against it by name, receipts
   that leave a required job uncovered are rejected as incomplete, and a proof
   with no receipts at all reconciles exactly as a receipt-bearing one does.

## Edge cases

- An unavailable release service records a bounded retry schedule while other
  independent work continues.
- Release evidence never turns an unmerged feature branch into a verified
  ticket.
