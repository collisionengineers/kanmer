---
name: kanmer-review
description: Review a Kanmer ticket's PR — write the review set to scratch, check the post-implementation report and the plan's Governing-docs section against the diff, turn feedback into blocking tickets, then merge and move the ticket to Verifying. Use when the user says "review" a ticket or PR, when a ticket sits in the review stage, or when PR review comments arrive and need tracking. DO NOT USE FOR verifying the merged result (kanmer-verify), post-merge cleanup (kanmer-closeout), or implementing changes (kanmer-execute).
---

# Reviewing a Kanmer ticket

Review is where the claim ("done — see the post-implementation report") meets the
evidence. The reviewer checks that meeting actually happens, then owns the **merge
point**: a passing review merges the PR and moves the ticket to **Verifying**,
where `kanmer-verify` validates the shipped result on merged main. Review is the
sole owner of turning PR feedback into tickets.

## Gather

`get_item` for the ticket, `get_ticket_doc` for `plan` and
`post-implementation-report`, its `refs` (the governing docs the plan must meet),
and the PR itself (`gh pr view <branch> --json url,state,title`, then
`gh pr diff <branch>`; the PR URL is in the ticket's scratch/notes and the id is
in the PR body's `Kanmer:` footer).

## Write the review to scratch

**Reviews are not pipeline documents.** The legal document types are fixed
(research, files, plan, checklist, open-questions, post-implementation-report,
proof) and none of them is a review — `set_ticket_doc` rejects anything else.
That is correct rather than a gap: `enter-review` gates the author's *report*,
and a review written into the ticket's own document set would put the reviewer's
verdict in the author's folder.

Write it with `append_scratch <id> review "…"`, which is never gated, covering:

1. **Changes** — what the diff actually changes, file by file, in the reviewer's
   own words, not the author's.
2. **Comments** — every point raised, each tagged blocking / non-blocking.
3. **Disposition** — for each comment: fixed-in-PR, filed-as-ticket, or
   won't-do-because. Nothing said in review silently evaporates.
4. **Verdict** — pass or needs-changes, and what was actually checked.

## Before applying fixes: check the open questions

Read `open-questions` before changing anything in response to review, and do not
apply a fix that turns on a question still unticked — put it to the user first.

**This one is a convention, not a gate, and knowing the difference matters.**
The `questions-resolved` requirement fires on stage *transitions*; review fixes
happen inside the review stage with no `move_item`, so nothing enforces this and
nothing will. `enter-review` and `enter-done` are gated, so a question raised
during implementation cannot get past those — but a fix applied mid-review on a
guess is invisible to the engine. That gap is why it is written here.

If you are both author and reviewer, say so in the first line. It is not an
independent review and should not read as one.

## Check

1. **Report against diff.** Does `post-implementation-report.md` list every file
   change with an honest rationale, and match what the diff does?
2. **Governing docs.** Does the plan's **Governing docs** section hold against the
   change — each linked PRD/FRD/ADR met, any modification actually authorized,
   any new ADR actually written?
3. **The code** — correctness, tests, and whether the ripple effects listed in
   the ticket's `files` document (callers, docs, build artifacts) were followed
   up. Unplanned extras belong in their own tickets, not smuggled in.

## Outcomes

- **Passes** — record the verdict in scratch, then (with the user's go-ahead, or their
  standing delegation) **merge the PR** (`gh pr merge`), and `move_item <id>
  verifying`. Hand off to `kanmer-verify` to validate on merged main and write
  `proof.md`.
- **Needs changes** — file each substantive point as a ticket in the **PR Review**
  area (`kanmer-tickets`; `PR-` prefix), linked with `rel: "blocks"` so the
  original visibly can't close. Trivial nits go straight into the PR as review
  comments. The blocking tickets are worked by `kanmer-execute`; re-review when
  they land.

## Incoming PR feedback

A human's review comments on a PR you're tracking follow the same rule: each
substantive comment becomes a PR Review ticket blocking the original, captured in
the scratch review's comments and disposition sections.
