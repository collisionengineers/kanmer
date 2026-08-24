# Plan — SKILL-033: clarify agent-role review independence

## Objective

Remove ambiguity from Kanmer’s review instructions: the author and independent reviewer must be distinct agents, but they may operate through the same GitHub account. GitHub’s own branch rules still govern whether that account can merge.

## Evidence

- The current review skill requires that the reviewer is not the author and does not require a distinct GitHub identity.
- The project AGENTS rule says an author must not merge its own PR.
- During DOC-021, this was incorrectly interpreted as requiring another GitHub account. GitHub subsequently exposed the actual blocker: one actionable review thread must be resolved before the protected main branch can merge.

## Change

1. Add a precise shared-credential sentence next to the independent-review rule in plugins/kanmer/skills/kanmer-review/SKILL.md.
2. Add the same contributor-facing clarification outside AGENTS.md’s managed block, preserving the managed content.
3. State that GitHub permissions, required approvals, conversations, and merge settings remain authoritative technical constraints.
4. Run skill-prose validation, the affected review-skill checks, and the project verification rail; open a normal PR and stop for independent review.

## Boundaries

- Do not weaken author/reviewer separation.
- Do not change GitHub branch protection, permissions, merge modes, Actions, or Kanmer engine gates.
- Do not change DOC-021, release source, ticket data model, or release semantics.

## Acceptance

- Both sources expressly define independence as a distinct agent role rather than distinct GitHub credentials.
- Both preserve the rule that an author may not review or merge its own work.
- Both defer actual GitHub merge ability to GitHub policy.
- The diff contains only the skill and contributor-guidance text, and verification is green.

## Stop condition

Stop in Review after the PR is open and all implementation checks have passed.
