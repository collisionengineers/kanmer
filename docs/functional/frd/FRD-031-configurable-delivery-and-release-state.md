---
status: draft
---

# FRD-031 — Configurable delivery and release state

**Implements:** PRD-002 requirement 4.

## Behaviour

Each project declares Git delivery policy: integration branch, release branch,
optional release-candidate pattern and hotfix-backport rule. Normal implementation
PRs target the configured integration branch. Execution material names the exact
base SHA, base branch, PR target and verification target.

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
own repository policy is not changed merely to demonstrate another policy.

## Acceptance criteria

1. A main-only fixture targets and verifies `main` at its exact merged SHA.
2. A dev-to-frozen-candidate-to-main fixture targets `dev`, proves integration,
   creates an immutable candidate and records final release separately.
3. A changed candidate SHA requires a new candidate identity and new evidence.
4. A second concurrent release owner receives `RELEASE_CHANNEL_HELD`; a
   successful or superseded terminal attempt clears the lease appropriately.
5. A release-branch hotfix records its required integration backport.

## Edge cases

- An unavailable release service records a bounded retry schedule while other
  independent work continues.
- Release evidence never turns an unmerged feature branch into a verified
  ticket.
