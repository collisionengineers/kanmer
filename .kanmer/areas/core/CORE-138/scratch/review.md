---
kind: review-attestation
pr: "324"
head_sha: "992569647df7ceaac058d949cf93a8bc01b02314"
verdict: pass
reviewer: "independent-reviewer"
independent: true
plan_hash: "9f943cb91bf945c1"
ticket_updated: "2026-09-05T03:30:59.587Z"
board_sha: "9373d30d43ed88e3f797723df887d8d0a048893a"
expected_reviewers:
  - "independent-reviewer"
threads_snapshot: []
findings:
  - id: F-001
    severity: blocker
    summary: "Round 1: ticket commits[], the post-implementation report and scratch/notes.md recorded head 93e59f938b3f3a52a5c17e11c6cccb1e0d2e0f6a, a commit that does not exist, producing a permanent strict COMMITS_UNREACHABLE."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Round 1: the AT-21 live-observation paragraph asserted a timeline the run/job JSON contradicted (verify allegedly alive past the edited run's completion; actually cancelled 03:13:44Z by the ready_for_review run 33941257446, before the edited run finished at 03:14:18Z)."
    disposition: fixed
  - id: F-003
    severity: note
    summary: "regate's bounded wait uses `gh run watch <run_id>`, which waits for the whole pull_request run (dominated by the Windows verify rail: 7m16s, 9m25s and 10m18s observed, 14m32s worst case) rather than the kanmer-gate job, so a slow rail can still exhaust the 900s budget and fall back to skipping; the loop also has no aggregate budget or job-level timeout-minutes across up to 100 open PRs."
    disposition: deferred-to-ticket
    ticket: CORE-142
  - id: F-004
    severity: minor
    summary: "No test asserts the GITHUB_STEP_SUMMARY output, although the acceptance criterion names the step summary explicitly; only stdout/exit code are asserted. Carried forward from round 1; the author did not take this optional item."
    disposition: accepted-risk
    reason: "Reviewer independently proved the behaviour in round 1: with GITHUB_STEP_SUMMARY set, a draft+strict run with a failing check appended '### kanmer-gate (draft PR — advisory)' plus one '- ADVISORY (draft): ...' line (132 bytes), and every non-draft variant wrote 0 bytes. Residual risk is a future silent regression of the summary path only."
  - id: F-005
    severity: note
    summary: "pr.yml's pull_request types do not include converted_to_draft, so converting a ready PR back to draft fires no re-run and leaves the previous strict result on the check; a synchronize on a draft PR replaces a strict result with an advisory green one."
    disposition: accepted-risk
    reason: "Not exploitable: GitHub refuses to merge a draft PR at all, and ready_for_review is a configured trigger type, so a strict evaluation always re-fires before the PR can be merged."
  - id: F-006
    severity: note
    summary: "The ticket Outcome sentence 'leaves no expected red required check' is only met for the implementing snapshot. Between `gh pr ready` and the reviewer's attestation push the gate is still expected-red — NO_REVIEW_RECORD on run 33941257446, then STALE_REVIEW on run 33942062209."
    disposition: accepted-risk
    reason: "Inherent and correct gate semantics: an unreviewed or stale-reviewed PR should not be green. AGENTS.md states the narrower, truthful claim ('no expected red required check ever sits against an implementing snapshot'), and the red clears via regate once this attestation's board is pushed."
  - id: F-007
    severity: minor
    summary: "kanmer-execute/SKILL.md justifies the strict binding with 'because a `pull_request` event re-evaluates the workflow file that is on the PR branch at that time'. The actual mechanism is that ready_for_review is a configured trigger type and the event payload's pull_request.draft is then false. Carried forward from round 1; the author did not take this optional reword."
    disposition: accepted-risk
    reason: "Prose-only causal imprecision in an added sentence; the operative instruction (run `gh pr ready` last) is correct, the same wording is what plan/plan.md step 5 specifies, and verify:skills is green."
  - id: F-008
    severity: note
    summary: "The AGENTS.md concurrency paragraph rewrap left ragged mid-paragraph short lines."
    disposition: accepted-risk
    reason: "Cosmetic only; content is truthful and verify:docs / check:manual are green on the merged tree."
  - id: F-009
    severity: note
    summary: "The string 93e59f938b3f3a52a5c17e11c6cccb1e0d2e0f6a still occurs once in the post-implementation report, inside the 'Review round 1 remediation' section, where it is explicitly named as the non-existent SHA that was corrected."
    disposition: accepted-risk
    reason: "Correct record-keeping, not a live claim. commits[] and scratch/notes.md are clean, and the gate reads commits[] frontmatter, not document prose — confirmed by run 33942062209, where COMMITS_UNREACHABLE no longer appears."
  - id: F-010
    severity: note
    summary: "The coordinator's round-2 brief expected the merged pr.yml to carry node-version 24. It does not, and should not: the merge parent is 32aa54fc (GUI-152 #323, on top of DOC-028 bd368549 #321); CORE-140 (#322) landed on main afterwards at 94165031 and is not an ancestor of this head, so pr.yml here still reads node-version 20 at lines 58 and 76."
    disposition: accepted-risk
    reason: "Not a defect and matches the post-implementation report's Deviations section, which states node-version was left untouched. This PR never edits those lines, so the pending update-branch onto 94165031 will take CORE-140's Node 24 change cleanly with no conflict."
---

# Review — CORE-138 (PR #324), round 2

Delta review of PR #324 at head `992569647df7ceaac058d949cf93a8bc01b02314`,
branch `CORE-138-gate-handoff`. Board tip reviewed against
`9373d30d43ed88e3f797723df887d8d0a048893a` (local == remote, ahead 0). This
record replaces the round-1 `needs-changes` attestation bound to
`93e59f93e7f1ef1550c99d0af5268b8cca05dd42`. Reviewer is not the author.

No `move_item` back to Implementing was made in round 1 (the coordinator
handled remediation in place), so no remediation budget was consumed and the
ticket's `review_round` is unchanged. Scope of this round is the delta only:
the two remediated board documents, `commits[]`, and the merge commit.

**Verdict: pass.** F-001 and F-002 are `fixed`; nothing else regressed; the
code, workflow and tests are byte-identical to the round-1 reviewed content.

## 1. `commits[]` and the fabricated SHA

`commits[]` is now
`["93e59f93e7f1ef1550c99d0af5268b8cca05dd42", "992569647df7ceaac058d949cf93a8bc01b02314"]`.
Both are real objects (`git cat-file -t` → `commit`) and both are reachable
from the PR head — `93e59f93` is the first parent of the merge commit
`99256964`, whose parents are
`93e59f93e7f1ef1550c99d0af5268b8cca05dd42 32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507`.

`93e59f938b3f3a52a5c17e11c6cccb1e0d2e0f6a` is gone from `commits[]` and from
`scratch/notes.md`. It survives once in the post-implementation report as an
explicitly labelled historical citation (F-009), which is correct
record-keeping.

**CI confirms the fix mechanically.** On run 33942062209 (this head), the
`kanmer-gate` findings no longer include `COMMITS_UNREACHABLE`; the sole
remaining error is `STALE_REVIEW`, which is the round-1 attestation being
bound to the old head and is exactly what this record clears.

## 2. The rewritten AT-21 paragraph vs `gh run view --json jobs`

Every timestamp the rewritten report and `scratch/notes.md` quote was read back
and matches:

| claim | source |
|---|---|
| 33941013906 `verify` startedAt `03:08:15Z`, completedAt `03:13:44Z`, `cancelled` | `gh run view 33941013906 --json jobs` |
| 33941099168 createdAt `03:10:06Z`; `kanmer-gate` completedAt `03:14:18Z`, success; `verify` skipped | `gh run view 33941099168 --json createdAt,jobs` |
| 33941257446 createdAt `03:13:32Z` | `gh run view 33941257446 --json createdAt` |
| 3m38s survival (`03:10:06Z` → `03:13:44Z`) | arithmetic on the above |
| ~12s same-group cancellation (`03:13:32Z` → `03:13:44Z`) | arithmetic on the above |

The corrected narrative is accurate on every point, including the attribution
of the cancellation to the `ready_for_review` run sharing the ordinary
(non-`meta-`) per-PR group rather than to the `edited` run. It also adds the
stronger structural argument — an `edited` run never holds a slot in the
original run's group, so it cannot cancel it on any timescale — which is the
property the fix actually guarantees. It no longer overstates what was
observed. F-002 is fixed.

## 3. The merge changed nothing this ticket owns

`git diff 93e59f93...99256964 --stat` brings in 23 files, all from DOC-028
(`bd368549` #321) and GUI-152 (`32aa54fc` #323): `apps/gui/**`,
`docs/functional/frd/FRD-036-focus-board.md`, both `agents-block-body.mjs`
mirrors, `kanmer-setup/SKILL.md`, `scripts/agents-block-routing.test.mjs`,
`scripts/verify-agents-block.mjs`, and `AGENTS.md`.

Blob hashes of the seven seam files between `93e59f93` and `99256964`:

| file | 93e59f93 | 99256964 | |
|---|---|---|---|
| `.github/workflows/pr.yml` | `bfee54d3` | `bfee54d3` | identical |
| `AGENTS.md` | `1a2caaaf` | `5da1bed6` | changed |
| `packages/mcp-server/src/check-pr.mjs` | `d3421952` | `d3421952` | identical |
| `packages/mcp-server/src/check-pr.test.mjs` | `651ee474` | `651ee474` | identical |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | `4f71596f` | `4f71596f` | identical |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | `20083f6d` | `20083f6d` | identical |
| `scripts/pr-workflow.test.mjs` | `6bca7970` | `6bca7970` | identical |

`AGENTS.md` is the one expected exception, because both branches edited it.
The delta is a single hunk at `@@ -15,17 +15,19 @@` — the "Agent conduct"
bullets — and it is byte-identical to DOC-028's own `c088be13..bd368549`
`AGENTS.md` hunk. Section 6 "Pull-request merge gate" (line 516 onwards), which
is what this ticket edits, is untouched by the merge. The auto-merge is correct.

Decisive check: `git diff 32aa54fc...99256964 --stat` — this PR's contribution
measured against the main it merged — is **exactly the seven seam files**, 202
insertions, 15 deletions. Nothing outside the ticket's seam is contributed by
this PR.

The merged `pr.yml` keeps all three of this ticket's edits: the `meta-`
concurrency expression (line 32), the conditional `--draft` argument (line 114)
and `timeout 900 gh run watch` (line 164). It carries `node-version: 20` at
lines 58 and 76 — see F-010; CORE-140 was not in the merged main and this is
not a defect.

## 4. Checks on the merged tree (worktree at 99256964, clean)

```
npm run build:core                                                    exit 0
node --test scripts/pr-workflow.test.mjs check-pr.test.mjs            14 pass, 0 fail
npm run test:scripts                                                  184 pass, 11 suites, 0 fail
npm run verify:skills                                                 ALL CHECKS PASSED
npm run verify:docs                                                   PASS, manual up to date (22 chapters)
npm run check:manual                                                  manual up to date
```

`test:scripts` rose 180 → 184: DOC-028's `agents-block-routing.test.mjs` came in
with the merge and passes alongside this ticket's assertions. `pr-workflow.test.mjs`
still passes on the merged tree, so the concurrency, `--draft` and `regate`
assertions survive the merge intact. The round-1 mutation testing of those
assertions (three independent mutations, each caught) stands — the test file's
blob is unchanged.

## 5. CI on the reviewed head

Run **33942062209** (`pull_request`, head `99256964`, created 03:30:55Z):

| job | result |
|---|---|
| `verify` | **success**, 03:30:58Z → 03:41:16Z (10m18s) |
| `kanmer-gate` | **failure**, sole error `STALE_REVIEW` |
| `regate` | skipped (by design for a `pull_request` event) |

`kanmer-gate` is red only because it was evaluated against the round-1
`needs-changes` record bound to the previous head. `COMMITS_UNREACHABLE`,
`WRONG_STAGE` and `NO_REVIEW_RECORD` are all absent. Once this record is on the
pushed board and the gate is re-run, the expected result is green — that
re-gate is the merger's confirmation step, not part of this verdict.

## 6. Threads and expected reviewers

`reviewThreads.totalCount: 0`, 0 reviews, 0 issue comments on PR #324, so
`threads_snapshot` is an empty list as a truthful value. The single named
independent reviewer has settled on this exact head. No bot threads exist.

## 7. Residual risk

Unchanged from round 1 and all dispositioned: the regate wait can still time out
on an unusually slow rail (F-003, deferred to CORE-142); the step-summary
surface is untested though proved by hand (F-004); a draft-converted PR keeps a
stale strict result while remaining unmergeable (F-005); an unreviewed or
stale-reviewed ready PR is expected-red (F-006); one imprecise causal clause in
`kanmer-execute` prose (F-007); cosmetic AGENTS.md wrapping (F-008). No
security, data-loss or destructive risk. No `pull_request_target`, no privileged
token surface, no user-controlled data reaching a shell.

## 8. Merge preconditions still outstanding (not part of this verdict)

1. `main` has moved again to `94165031` (CORE-140 #322). This PR is `BEHIND`;
   an `update-branch` will produce a new head and invalidate this record. A
   delta re-bind and a replacement attestation are required before merge — the
   coordinator has said it will request that separately.
2. `kanmer-gate` must be re-gated green on whatever head is merged.

Both are sequencing, not defects. Nothing in this PR's content blocks the merge.
