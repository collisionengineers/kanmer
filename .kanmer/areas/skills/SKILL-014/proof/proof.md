# Proof — SKILL-014

PR [#34](https://github.com/collisionengineers/kanmer/pull/34), merged as
**`fc52cba`**. Commits `bc3b201` (the change) and `74e76a6` (the review fix).

Everything below was run on merged `main`, not on the branch.

## The seven checks, on merged main

There is no test that asserts skill prose, so the script's output *is* the
evidence. All seven pass, and each prints its hits rather than only a verdict.

```
1. `impact` names no document type          PASS  0 hits
2. `researching`/`planning` name no stage    PASS  0 hits
3. `priority` names no field                 PASS  0 hits
4. every named doc type is in profiles.ts    PASS  none unknown
5. every kanmer-* reference resolves         PASS  none dangling
6. workflow + hand-off in all twelve         PASS  12/12
7. FRD-023 R1: zero hardcoded gate rules     PASS  5 boundary mentions, 0 requirement lists
```

Check 6, in full — the claim is "every", so it is measured per skill rather than
asserted:

```
ok   kanmer-auto        workflow=yes  handoff=yes
ok   kanmer-closeout    workflow=yes  handoff=yes
ok   kanmer-docs        workflow=yes  handoff=yes
ok   kanmer-execute     workflow=yes  handoff=yes
ok   kanmer-groom       workflow=yes  handoff=yes
ok   kanmer-plan        workflow=yes  handoff=yes
ok   kanmer-report      workflow=yes  handoff=yes
ok   kanmer-research    workflow=yes  handoff=yes
ok   kanmer-review      workflow=yes  handoff=yes
ok   kanmer-setup       workflow=yes  handoff=yes
ok   kanmer-tickets     workflow=yes  handoff=yes
ok   kanmer-verify      workflow=yes  handoff=yes
```

Check 7's five survivors, each justified rather than counted:

- `open-questions-template.md:10-11` — the `questions-resolved` parse rule.
  Deliberate under ADR-0011: the checkbox format is load-bearing and the template
  is what teaches it.
- `kanmer-review/SKILL.md:65` — "every profile carries the requirement at
  `enter-done`". A universal fact about the engine, and the *correction* this
  ticket made, not a per-profile list.
- `tool-reference.md:34, 92` — `link_doc`'s and `refs`' relationship to the
  leave-backlog gate. Tool semantics, in the tool reference.

**R1 improved rather than held.** Before this change the same grep found **8**
boundary mentions; three were removed by correcting `kanmer-review` and
`kanmer-auto`. Adding prose to twelve skills was the plan's stated risk to R1,
and it came out net-negative.

## The AGENTS block reaches the repo

```
$ sed -n '18,19p' AGENTS.md
- Skills run in this order: kanmer-tickets → -research → -plan → -execute → -review → -verify → -closeout. …
- Each skill ends by naming what comes next — read that line before improvising a hand-off.
```

Both `BLOCK_BODY` copies moved together; `verify-agents-block` asserts
byte-equality and passes 26/26, including "SKILL.md's fenced block body matches
this script's".

## Rail, on merged `main` (`fc52cba`)

```
npm run build                       standalone bundle 1.40 MB, success
npm run plugin:check                29 tools match, bundle bytes match
npm run verify:agents-block         26/26 checks passed
npm run check:manual                up to date (12 chapters)
npm test                            core 182 passed (8 files)
                                    gui  202 passed (21 files)
npm run smoke:protocol              26/26 checks passed
```

`plugin:check` is the one that mattered here and the one that could not run
before the merge: `check-plugin-sync.mjs:26` reads `tool-reference.md`, which
this PR rewrites, and a worktree has no `node_modules` or `dist/` to compare
against. It passes. Test and smoke counts are unchanged from `e002498`, which is
the expected result for a prose-only change and is the point of recording them.

## A defect this ticket introduced, caught by its own review

The new ticket-folder diagram in `tool-reference.md` was **wrong in two places**
when first committed: `post-implementation-report/…` with an ellipsis where every
sibling shows a filename, and `scratch-notes.md` drawn as a file at the ticket
root. Scratch is a folder like every other document type.

Recorded prominently because it is the exact defect class this ticket exists to
remove — a reference document confidently describing a layout that is not on
disk — and it was introduced *by the fix*. The root cause is specific and worth
keeping: the diagram was written from the doc-type list in `profiles.ts` instead
of from `ls` of a real ticket folder. Everything else in the sweep was checked
against the code; that one paragraph was not.

Fixed in `74e76a6`, verified against `SKILL-012/scratch/execute.md` and
`GUI-064/`, and the fix adds the note that scratch's doc id (`scratch-review`)
and its path (`scratch/review.md`) differ — the one place in the layout where
they do.

## Two checks were tightened after failing

Both on the first run, and neither by changing the content:

- The stage check flagged "Research and planning share that stage" — correct
  English about the Preparing stage. Narrowed to arrow-separated sequences and
  quoted status ids, which is what "names a stage" actually means.
- The hand-off check read the last 6 lines and missed `kanmer-auto`, whose
  ending is a paragraph, a route diagram and another paragraph. Widened to 14.

Stated because a check adjusted until it passes is what a reader should be
suspicious of. Neither loosened what is measured; both are visible in the script.

## What this run does NOT prove

- **The prose is untested, as skill prose always is.** Seven greps prove the
  twelve endings *exist* and that no skill names a document type or sibling that
  does not exist. They prove nothing about whether the endings read well, or
  whether an agent actually follows them. The first real signal is an agent
  loading one skill mid-task and routing correctly, and that has not happened.
- **The review was not independent.** Author and reviewer were the same agent,
  stated at the top of `scratch/review.md`. The diagram defect was caught — but
  by the same reader who wrote it, which is luck as much as process.
- **Nothing prevents recurrence.** The rail checks what it is told to check, and
  nobody told it about skill prose; the verification script lives in a scratchpad
  and is not committed. This ticket cleans up a drift it cannot stop happening
  again. Parked in `open-questions` and pointed at [[CORE-025]].
- **The installed copy at `.claude/skills/` is now behind merged `main`.** It is
  gitignored, does not update itself, and its installer only ever adds — it still
  carries `kanmer-research/assets/impact-template.md`, deleted from source before
  this ticket. Re-syncing it is the next step and is not covered here;
  the missing prune belongs to [[CORE-023]].

---

**Merged:** PR [#34](https://github.com/collisionengineers/kanmer/pull/34) —
merge commit `fc52cba`. Governed by FRD-023 (R1, R3, R4, R5) and ADR-0009, both
met without modification. Follow-up [[SKILL-015]] filed.
