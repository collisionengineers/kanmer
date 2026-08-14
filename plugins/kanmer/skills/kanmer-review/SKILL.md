---
name: kanmer-review
description: Review a Kanmer ticket's finished work — check its proof.md against the actual evidence, review the PR diff, and turn review feedback into tickets in the PR Review area. Use when the user says "review" a ticket or PR, when tickets sit in the board's review or verifying stages, or when PR review comments arrive and need tracking. DO NOT USE FOR merging and cleanup after approval (kanmer-closeout) or implementing the requested changes (kanmer-execute).
---

# Reviewing a Kanmer ticket

Review is where the claim ("done, see proof.md") meets the evidence. The
reviewer's job is to check that meeting actually happens — not to re-do the
work, and not to wave it through.

## Gather

`get_item` for the ticket, `get_ticket_doc` for `plan` and `proof`, and the
PR itself (`gh pr view <branch> --json url,state,title` then
`gh pr diff <branch>`; the PR URL is in the checklist's progress notes and
the ticket id is in the PR body's `Kanmer:` footer).

## Check

1. **Proof against evidence.** Does proof.md contain real pasted output —
   not a description of output? Do the claims cover what plan.md's
   Verification section promised? Is "Not covered" honest and acceptable?
2. **Diff against plan.** Does the change do what plan.md says, and only
   that? Unplanned extras belong in their own tickets, not smuggled in.
3. **The code itself** — correctness, tests, and whether impact.md's ripple
   effects (callers, docs, build artifacts) were actually followed up.

## Outcomes

- **Passes** — say so, with what you checked. If the board has a stage
  between review and done (fresh boards have `verifying`), move the ticket
  there; merging is the human's call unless they've delegated it, and
  cleanup after the merge is `kanmer-closeout`'s job, not yours.
- **Needs changes** — file each substantive point as a ticket in the **PR
  Review** area (`kanmer-tickets`; they get the `PR-` prefix), linked to the
  ticket under review with `rel: "blocks"` so it visibly can't close until
  they're resolved. Trivial nits can go straight into the PR as review
  comments (`gh pr review --request-changes` / `gh pr comment`) without a
  ticket. Move the reviewed ticket back to the working stage.

## Incoming PR feedback

When a human's review comments arrive on a PR you're tracking, the same
rule applies in reverse: each substantive comment becomes a PR Review area
ticket blocking the original, so nothing said in review silently evaporates.
Working those tickets is `kanmer-execute` again.
