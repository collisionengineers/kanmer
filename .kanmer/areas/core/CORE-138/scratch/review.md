---
kind: review-attestation
pr: "324"
head_sha: "93e59f93e7f1ef1550c99d0af5268b8cca05dd42"
verdict: needs-changes
reviewer: "independent-reviewer"
independent: true
plan_hash: "9f943cb91bf945c1"
ticket_updated: "2026-09-05T03:09:05.355Z"
board_sha: "1b8fd8a85871658c22794e6fa810b97a9c7a472e"
expected_reviewers:
  - "independent-reviewer"
threads_snapshot: []
findings:
  - id: F-001
    severity: blocker
    summary: "Ticket commits[], the post-implementation report and scratch/notes.md all record head 93e59f938b3f3a52a5c17e11c6cccb1e0d2e0f6a, a commit that does not exist; the real PR head is 93e59f93e7f1ef1550c99d0af5268b8cca05dd42. The strict gate reports COMMITS_UNREACHABLE (\"fatal: Not a valid commit name\") on every run, so the PR cannot go green."
    disposition: open
  - id: F-002
    severity: major
    summary: "The AT-21 live-observation paragraph in the post-implementation report and scratch/notes.md states that run 33941013906's verify job stayed in_progress 'throughout and after run 33941099168 completed' and that gh run list showed 33941099168 already completed while 33941013906 was still in progress. Run JSON contradicts both: 33941099168 completed at 03:14:19Z, and 33941013906's verify was cancelled at 03:13:44Z by the ready_for_review run 33941257446. AT-21 is nonetheless genuinely proven by the same evidence, but the narration is not what was observed."
    disposition: open
  - id: F-003
    severity: note
    summary: "regate's bounded wait uses `gh run watch <run_id>`, which waits for the whole pull_request run (dominated by the Windows verify rail, observed 7m16s-9m25s typical, 14m32s worst case) rather than the kanmer-gate job, so a slow rail can still exhaust the 900s budget and fall back to skipping; the loop also has no aggregate budget or job-level timeout-minutes across up to 100 open PRs."
    disposition: deferred-to-ticket
    ticket: CORE-142
  - id: F-004
    severity: minor
    summary: "No test asserts the GITHUB_STEP_SUMMARY output, although the acceptance criterion names the step summary explicitly; only stdout/exit code are asserted."
    disposition: accepted-risk
    reason: "Reviewer independently proved the behaviour: with GITHUB_STEP_SUMMARY set, a draft+strict run with a failing check appended '### kanmer-gate (draft PR — advisory)' plus one '- ADVISORY (draft): [NO_REVIEW_RECORD] ...' line (132 bytes), and every non-draft variant wrote 0 bytes. Residual risk is a future silent regression of the summary path only."
  - id: F-005
    severity: note
    summary: "pr.yml's pull_request types do not include converted_to_draft, so converting a ready PR back to draft fires no re-run and leaves the previous strict result on the check; a synchronize on a draft PR replaces a strict result with an advisory green one."
    disposition: accepted-risk
    reason: "Not exploitable: GitHub refuses to merge a draft PR at all, and ready_for_review is a configured trigger type, so a strict evaluation always re-fires before the PR can be merged."
  - id: F-006
    severity: note
    summary: "The ticket Outcome sentence 'leaves no expected red required check' is only met for the implementing snapshot. Between `gh pr ready` and the reviewer's attestation push the gate is still expected-red with NO_REVIEW_RECORD under KANMER_GATE_STRICT — observed live on run 33941257446."
    disposition: accepted-risk
    reason: "Inherent and correct gate semantics: an unreviewed PR should not be green. AGENTS.md states the narrower, truthful claim ('no expected red required check ever sits against an implementing snapshot'), and the red clears via regate once the attestation board is pushed."
  - id: F-007
    severity: minor
    summary: "kanmer-execute/SKILL.md justifies the strict binding with 'because a `pull_request` event re-evaluates the workflow file that is on the PR branch at that time'. The actual mechanism is that ready_for_review is a configured trigger type and the event payload's pull_request.draft is then false; the workflow-file-on-the-branch fact is true but not the reason."
    disposition: accepted-risk
    reason: "Prose-only causal imprecision in an added sentence; the operative instruction (run `gh pr ready` last) is correct and verify:skills is green. Worth a one-line reword in the F-001/F-002 remediation batch."
  - id: F-008
    severity: note
    summary: "The AGENTS.md concurrency paragraph rewrap left ragged mid-paragraph short lines ('The gate reads the / remote board tip, so a / board push should also...')."
    disposition: accepted-risk
    reason: "Cosmetic only; content is truthful and verify:docs / check:manual are green."
---

# Review — CORE-138 (PR #324)

Consolidated review (`review_round` 0) of PR #324 at head
`93e59f93e7f1ef1550c99d0af5268b8cca05dd42`, branch `CORE-138-gate-handoff`,
base `main`. Board tip reviewed against: `1b8fd8a85871658c22794e6fa810b97a9c7a472e`
(local == remote, ahead 0). Reviewer is not the author.

**Verdict: needs-changes**, on F-001 (blocker) and F-002 (major). The code
change itself is correct, well-scoped and independently reproduced; the
blocking defects are in the ticket's own evidence records.

## What the PR changes

Exactly the seven files named in `files/files.md`, and nothing else:
`.github/workflows/pr.yml`, `AGENTS.md`,
`packages/mcp-server/src/check-pr.mjs`, `packages/mcp-server/src/check-pr.test.mjs`,
`plugins/kanmer/skills/kanmer-execute/SKILL.md`,
`plugins/kanmer/skills/kanmer-review/SKILL.md`, `scripts/pr-workflow.test.mjs`.
`scripts/verify.mjs`, `scripts/agents-block-body.mjs`, `kanmer-verify/SKILL.md`,
`reconciliation.ts` and `apps/gui/**` are untouched. No `pull_request_target`
appears in either workflow file (asserted by a new test). No branch-protection
or repository-variable change — the CORE-142 boundary is respected.

## Acceptance checks

**(a) Concurrency carve-out — met.** The group becomes
`${{ github.workflow }}-${{ github.event_name }}-${{ github.event.action == 'edited' && 'meta-' || '' }}${{ github.event.pull_request.number || github.ref }}`.
`github.event.action` is `edited` only for the `pull_request` `edited` type
(the only `edited` action any of this workflow's three triggers can produce),
and `event_name` is already in the key, so the carve-out is exactly `edited`
and nothing else. `cancel-in-progress: ${{ github.event_name != 'push' }}` is
unchanged. The rewritten comment is truthful, including the claim that a
superseded `edited` event still cancels only another `edited` run of the same
PR.

Live evidence (real, verified from run/job JSON, not from the report):
run 33941013906 (draft `opened`) had `verify` running from 03:08:15Z; the
`edited` run 33941099168 was created 03:10:06Z; 33941013906's `verify`
continued for a further 3m38s and was only cancelled at 03:13:44Z, 12s after
the `ready_for_review` run 33941257446 was created at 03:13:32Z. Under the old
shared group the `edited` event would have cancelled it within seconds — the
comparison case is visible in the same history (33940018610 cancelled 10s
after its successor was created). AT-21 holds.

**(b) `check-pr.mjs --draft` — met, and hardened correctly.** `parseArgs`
accepts `--draft` as a boolean; `readPrEvent` installs a non-enumerable,
non-writable `draft` property computed as `pr.draft === true`; `main()`
branches on `pr.draft === true` and never reads the CLI flag. Every check still
runs (`evaluateMergeGate` is called before the branch and the JSON verdict line
is emitted unchanged), findings are echoed as `ADVISORY (draft): [CODE] msg` on
stdout, as `::notice` on stderr, and appended to `$GITHUB_STEP_SUMMARY` when
set; `process.exitCode = 0`. The non-draft path is a pure insertion above it —
the `::error`/`::warning` loop and `process.exitCode = result.ok ? 0 : 1` are
byte-for-byte unchanged.

I attempted to construct a non-draft input that exits 0 with a failing check
and could not. Independent probe against a synthesised board and events, with
`KANMER_GATE_STRICT=1` and a real `NO_REVIEW_RECORD` failure:

| event `pull_request.draft` | argv | exit | annotations | step summary |
|---|---|---|---|---|
| `true` | `--draft` | 0 | `::notice` | 132 bytes written |
| `false` | — | 1 | `::error` | 0 bytes |
| `false` | `--draft` | 1 | `::error` | 0 bytes |
| absent | `--draft` | 1 | `::error` | 0 bytes |
| `false`, no strict | — | 0 (`ok: true`, warn) | `::warning` | 0 bytes |

The only route to exit 0 with a failing check is a payload-level `draft: true`,
which only GitHub writes and which also makes the PR unmergeable. Strict mode is
not weakened. The `${{ ... && '--draft' || '' }}` expression yields an empty
string (dropped by the shell) for every non-draft case.

**(c) `regate` — met.** The in-progress branch is now: attempt `gh run rerun`,
`continue` on success; otherwise log, `timeout 900 gh run watch "$run_id"
--exit-status >/dev/null 2>&1 || true`, then exactly one retry with distinct
success/failure echoes. The open-PR guard (`gh pr list --base main --state open`)
and the rest of the loop are untouched, `verify.if` still excludes `edited` and
`workflow_dispatch` and still includes push-to-`main`, and there is no
`pull_request_target`. No self-wait deadlock exists (regate runs in a
push/dispatch run and watches a `pull_request` run). See F-003 for the
efficacy caveat.

**(d) Skill prose — met.** `kanmer-execute` step 3 now creates the PR with
`gh pr create --draft` and spells out the handoff order draft → `update_item
prs[]` → `move_item implementing → review` → board push → `gh pr ready`,
consistent with step 2's existing forward reference. `kanmer-review` gains a
paragraph at the head of "Decide and merge" binding review to the current head
and requiring a current-head attestation, blocking under `KANMER_GATE_STRICT`
and policy-blocking otherwise. Diffs are minimal. `npm run verify:skills`
reports `ALL CHECKS PASSED`. See F-007 for one imprecise causal clause.

**(e) Tests — real, mutation-verified.** I mutated three assertions in the
worktree and restored each:

- reverting `concurrency.group` to the pre-CORE-138 expression →
  `pr-workflow.test.mjs` fails (1 fail);
- deleting the `timeout 900 gh run watch` line → `pr-workflow.test.mjs` fails;
- changing `const isDraft = pr.draft === true` to `args.draft === true` →
  `--draft mode runs every check but reports advisory and always exits 0`
  fails.

The assertions bind to the behaviour, not to incidental text. See F-004 for
the one uncovered surface.

**(f) AGENTS.md §6 — truthful (conduct rule 24).** The concurrency paragraph,
the new draft/advisory paragraph, the regate wait-then-retry sentence ("up to
15 minutes" matches `timeout 900`) and the updated command block all match the
shipped behaviour. The narrower claim "no expected red required check ever sits
against an `implementing` snapshot" is accurate (see F-006 for the broader
ticket-Outcome wording). `npm run verify:docs` and `npm run check:manual` are
green with no `docs/manual` change.

**(g) Merge cleanliness with CORE-140 (PR #322).** #322 touches `pr.yml` only
at the two `node-version: 20 → 24` lines (hunks at 49 and 67); this PR touches
lines 21-32, 111 and 149-165. In `AGENTS.md`, #322 edits lines 487-505 and this
PR edits 532-575. No overlapping hunks — the two merge cleanly in either order.

## Checks run in the worktree (scoped, not the full rail)

```
npm run build:core                                                    exit 0
node --test scripts/pr-workflow.test.mjs check-pr.test.mjs            14 pass, 0 fail
npm run test:scripts                                                  180 pass, 11 suites, 0 fail
npm run verify:skills                                                 ALL CHECKS PASSED
npm run verify:docs                                                   PASS, manual up to date (22 chapters)
npm run check:manual                                                  manual up to date
```

Worktree was clean before and after every mutation.

## CI status on the reviewed head

Run 33941257446 (`pull_request`, `ready_for_review`, created 03:13:32Z):
`verify` **success** (7m16s), `regate` skipped (by design for a `pull_request`
event), `kanmer-gate` **failure** then re-running after a regate dispatch.
Earlier runs on the same head: 33941013906 (`opened`, draft) — `kanmer-gate`
success (advisory, `::notice` lines confirmed in the job log), `verify`
cancelled at 03:13:44Z by the `ready_for_review` run; 33941099168 (`edited`) —
`verify` **skipped** (correct), `kanmer-gate` success, run success.

The `kanmer-gate` failure on the ready head has two causes:
`NO_REVIEW_RECORD` (expected until this attestation is pushed and the gate is
re-run) and `COMMITS_UNREACHABLE` — which is F-001 and will not clear on its
own.

## Root-cause classification

**RC-1 — recorded facts asserted without reading them back from the source of
truth** covers F-001 and F-002. One remedy, not one patch per example: re-derive
the recorded head from `git rev-parse HEAD` / `gh pr view --json headRefOid` and
re-derive the AT-21 timeline from `gh api .../actions/runs/<id>` and
`.../jobs`, then correct `commits[]`, the post-implementation report's live
observation section and `scratch/notes.md` together.

F-003 through F-008 are independent residual items and none of them blocks.

## Threads and expected reviewers

`expected_reviewers` is the single independent reviewer named for this ticket
and has settled on this exact head. GitHub reports 0 review threads, 0 reviews
and 0 issue comments on PR #324 (`reviewThreads.totalCount: 0`), so
`threads_snapshot` is an empty list as a truthful value. No Codex or other bot
thread exists on this head; none would be a gate in any case.

## Blocking changes required

1. Correct the ticket's `commits[]` to `93e59f93e7f1ef1550c99d0af5268b8cca05dd42`
   (F-001), and remove the non-existent `93e59f938b3f3a52a5c17e11c6cccb1e0d2e0f6a`
   from the post-implementation report, `scratch/notes.md` and anywhere else it
   is repeated.
2. Rewrite the AT-21 live-observation paragraph in the post-implementation
   report and `scratch/notes.md` from the actual run/job JSON (F-002): the
   `edited` run 33941099168 did not cancel run 33941013906's `verify`, which
   survived a further 3m38s and was later cancelled by the `ready_for_review`
   run 33941257446 at 03:13:44Z.

Optional in the same batch (non-blocking): a `GITHUB_STEP_SUMMARY` assertion
(F-004) and the one-line reword in `kanmer-execute/SKILL.md` (F-007).

## Residual risk after remediation

The regate wait can still time out on an unusually slow rail (F-003, deferred to
CORE-142, which owns the gate-only check that removes the dependency on the long
`verify` job); the draft path is untested at the step-summary surface (F-004,
proved by hand); a draft-converted PR keeps a stale strict result (F-005,
unmergeable while draft); an unreviewed ready PR is still expected-red (F-006,
correct behaviour). No security, data-loss or destructive risk was identified;
no `pull_request_target`, no privileged token surface, and no user-controlled
data reaches a shell.

## Note for the re-bind

`main` has moved to `bd368549` (DOC-028) and PR #324 is `BEHIND`. This
attestation binds to head `93e59f93e7f1ef1550c99d0af5268b8cca05dd42`. Updating
the branch with `main` produces a new head and invalidates this record; a fresh
delta review and replacement attestation are required at that point.
