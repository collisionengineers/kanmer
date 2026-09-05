---
kind: review-attestation
pr: "324"
head_sha: "2e44b8059c5bc238a98ccf3ba6f5d3fb81fe4241"
verdict: pass
reviewer: "independent-reviewer"
independent: true
plan_hash: "9f943cb91bf945c1"
ticket_updated: "2026-09-05T03:30:59.587Z"
board_sha: "ea3038205afd07423aede2e0da66e66046cd3ca8"
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
    summary: "The ticket Outcome sentence 'leaves no expected red required check' is only met for the implementing snapshot. Between `gh pr ready` and each reviewer attestation push the gate is expected-red — NO_REVIEW_RECORD on run 33941257446, STALE_REVIEW on 33942062209 and again on 33943839974 after the update-branch."
    disposition: accepted-risk
    reason: "Inherent and correct gate semantics: an unreviewed or stale-reviewed PR should not be green. AGENTS.md states the narrower, truthful claim ('no expected red required check ever sits against an implementing snapshot'), and the red clears once the current-head record is on the pushed board and the gate re-runs — demonstrated live on run 33942062209, which went from failure to full success after the round-2 board push."
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
    reason: "Correct record-keeping, not a live claim. commits[] and scratch/notes.md are clean, and the gate reads commits[] frontmatter, not document prose — confirmed by runs 33942062209 and 33943839974, where COMMITS_UNREACHABLE no longer appears."
  - id: F-010
    severity: note
    summary: "Round 2: the head 99256964 did not carry CORE-140's node-version 24, because its merge parent 32aa54fc predated CORE-140 (#322, landed on main at 94165031). The round-2 record predicted the pending update-branch would take those lines cleanly since this PR never edits them."
    disposition: fixed
  - id: F-011
    severity: note
    summary: "commits[] names 93e59f93 and 99256964 but not the current head 2e44b805, which the update-branch produced."
    disposition: accepted-risk
    reason: "Both recorded commits remain reachable from 2e44b805 (99256964 is its first parent), so the reachability check passes — confirmed on run 33943839974, whose only gate error is STALE_REVIEW. kanmer-verify binds to the GitHub merge SHA, not to commits[], so nothing downstream depends on the merge head being listed."
---

# Review — CORE-138 (PR #324), round 3 (delta re-bind)

Delta re-bind of PR #324 to head `2e44b8059c5bc238a98ccf3ba6f5d3fb81fe4241`,
branch `CORE-138-gate-handoff`. Board tip reviewed against
`ea3038205afd07423aede2e0da66e66046cd3ca8` (local == remote, ahead 0). This
record replaces the round-2 `pass` attestation bound to
`992569647df7ceaac058d949cf93a8bc01b02314`. Reviewer is not the author.

**Verdict: pass — unchanged.** The only delta since round 2 is
`gh pr update-branch`: a merge of `main` (`e474f317`) that contributes no new
work of this ticket's own. No `move_item` back to Implementing has been made in
any round, so no remediation budget has been consumed and the ticket's
`review_round` is unchanged.

## 1. The delta is exactly the merge of main

`2e44b805` is a merge commit whose parents are
`992569647df7ceaac058d949cf93a8bc01b02314 e474f317eaf7d7989667d8b44442d7845953956d`.
Main now carries CORE-140 (`94165031` #322), DOC-026 (`37b83b14` #326) and
MCP-057 (`e474f317` #325) on top of the previously merged GUI-152/DOC-028.

`git diff e474f317...2e44b805 --stat` — this PR's contribution measured against
the main it just merged — is **exactly the seven seam files**:

```
 .github/workflows/pr.yml                      | 24 ++++++++---
 AGENTS.md                                     | 30 ++++++++++++--
 packages/mcp-server/src/check-pr.mjs          | 44 +++++++++++++++++++-
 packages/mcp-server/src/check-pr.test.mjs     | 59 +++++++++++++++++++++++++++
 plugins/kanmer/skills/kanmer-execute/SKILL.md | 24 +++++++++--
 plugins/kanmer/skills/kanmer-review/SKILL.md  |  7 ++++
 scripts/pr-workflow.test.mjs                  | 29 ++++++++++++-
 7 files changed, 202 insertions(+), 15 deletions(-)
```

Identical totals to round 2 (202 insertions, 15 deletions). Nothing outside the
ticket's seam is contributed by this PR, and no ticket-owned content was added
or lost in the update-branch.

## 2. Seam blob hashes, `99256964` → `2e44b805`

| file | 99256964 | 2e44b805 | |
|---|---|---|---|
| `.github/workflows/pr.yml` | `bfee54d3` | `acb46e84` | changed (both sides touched) |
| `AGENTS.md` | `5da1bed6` | `f66d3a03` | changed (both sides touched) |
| `packages/mcp-server/src/check-pr.mjs` | `d3421952` | `d3421952` | identical |
| `packages/mcp-server/src/check-pr.test.mjs` | `651ee474` | `651ee474` | identical |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | `4f71596f` | `4f71596f` | identical |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | `20083f6d` | `20083f6d` | identical |
| `scripts/pr-workflow.test.mjs` | `6bca7970` | `6bca7970` | identical |

Exactly the two expected exceptions, and both resolve correctly.

### `pr.yml` — merged correctly

`git diff 99256964..2e44b805 -- .github/workflows/pr.yml` is **only** CORE-140's
two `node-version: 20 → 24` lines, at the `setup-node` steps of `verify` and
`kanmer-gate`. Nothing else moved. The merged file at `2e44b805` carries, in one
place:

- line 32 — `group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.event.action == 'edited' && 'meta-' || '' }}${{ github.event.pull_request.number || github.ref }}`
- lines 58 and 76 — `node-version: 24` (both jobs)
- line 114 — `… --event "$GITHUB_EVENT_PATH" ${{ github.event.pull_request.draft && '--draft' || '' }}`
- line 164 — `timeout 900 gh run watch "$run_id" --exit-status >/dev/null 2>&1 || true`

The round-1 prediction that CORE-140 and CORE-138 touch disjoint hunks of
`pr.yml` is now confirmed by the actual merge. F-010 is `fixed`.

### `AGENTS.md` — merged correctly

`git diff 99256964..2e44b805 -- AGENTS.md` has four hunks, at `@@ -97,6 +97,22 @@`,
`@@ -227,12 +243,11 @@`, `@@ -489,11 +504,11 @@` and `@@ -501,7 +516,7 @@`. Its
added/removed content lines are **byte-identical** to main's own
`32aa54fc..e474f317` `AGENTS.md` delta, so the merge took main's changes verbatim
and invented nothing:

- DOC-026's new `## 0.1 Operating index and historical documents` section
  (line 100) and the retired-`CLOSEOUT_PLAN.md` pointer (line 107);
- CORE-140's rewritten `npm test` / `npm run verify` command rows describing
  `dist/verify-stamp.json`, the `:built` variants and the refuse-rather-than-
  rebuild rule (lines 507, 511);
- the repository-layout row adjustment at line 243.

All four hunks are above §6. This ticket's `### Pull-request merge gate` section
survives intact at line 533, with every marker present: the `meta-`-prefixed
carve-out paragraph (555), the regate `gh run watch … --exit-status`, up to 15
minutes sentence (572), the `ADVISORY (draft):` / `$GITHUB_STEP_SUMMARY`
paragraph (584), and the `--draft` command block (611).

## 3. Checks on the re-merged tree (worktree at `2e44b805`, clean)

```
npm run build:core                                                    exit 0
node --test scripts/pr-workflow.test.mjs check-pr.test.mjs            14 pass, 0 fail
npm run test:scripts                                                  193 pass, 13 suites, 0 fail
npm run verify:skills                                                 ALL CHECKS PASSED
npm run verify:docs                                                   PASS, manual up to date (22 chapters)
npm run check:manual                                                  manual up to date
```

`test:scripts` rose 184 → 193 across 13 suites: CORE-140's `verify-steps.test.mjs`
and the other newly merged suites run alongside this ticket's assertions and all
pass. `pr-workflow.test.mjs` passes on the merged tree, so the concurrency,
`--draft` and `regate` assertions still hold against a `pr.yml` that now also
carries Node 24. The test file's blob is unchanged from the round-1 reviewed
content, so round 1's mutation testing of those assertions (three independent
mutations, each caught) still stands.

## 4. CI

Run **33942062209** (previous head `99256964`) finished **fully green** after the
round-2 board push — `kanmer-gate` success, `verify` success, `regate` skipped.
That is live confirmation that a current-head `pass` attestation on the pushed
board clears this gate.

Run **33943839974** (`pull_request`, head `2e44b805`) is in progress: `verify`
pending, `regate` skipped by design, `kanmer-gate` **failure** whose sole error is
`STALE_REVIEW` — the round-2 record bound to `99256964`. `COMMITS_UNREACHABLE`,
`WRONG_STAGE` and `NO_REVIEW_RECORD` are all absent. This record clears
`STALE_REVIEW` once the board is pushed and the gate is re-run.

`mergeStateStatus` is `BLOCKED`, `mergeable: MERGEABLE` — the block is the red
gate, not a conflict.

## 5. Threads and expected reviewers

`reviewThreads.totalCount: 0`, 0 reviews, 0 issue comments on PR #324, so
`threads_snapshot` is an empty list as a truthful value. The single named
independent reviewer has settled on this exact head. No bot threads exist on any
head of this PR.

## 6. Findings

Every finding carries forward with its round-2 disposition, with two changes:
F-010 becomes `fixed` (the update-branch brought Node 24 in cleanly, exactly as
predicted) and F-011 is added as a note for `commits[]` not naming the merge
head. Nothing is `open` at any severity. F-003 stays deferred to CORE-142; F-004
and F-007 remain optional, unaddressed, accepted risks; F-005, F-006, F-008,
F-009 and F-011 are accepted risks with reasons.

No new defect was found in the delta. No security, data-loss or destructive risk
exists in this PR: no `pull_request_target`, no privileged token surface, no
branch-protection or repository-variable change, and no user-controlled data
reaching a shell.

## 7. Remaining merge precondition (not part of this verdict)

`kanmer-gate` must be re-gated green on `2e44b805`, and `verify` must finish
green on run 33943839974. Both are the merger's confirmation steps. Nothing in
this PR's content blocks the merge.
