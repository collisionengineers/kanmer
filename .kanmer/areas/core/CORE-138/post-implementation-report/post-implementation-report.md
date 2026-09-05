# Post-implementation report — CORE-138

PR: https://github.com/collisionengineers/kanmer/pull/324
Branch: `CORE-138-gate-handoff`
Head commit: `992569647df7ceaac058d949cf93a8bc01b02314`
Base: `main` @ `c088be1391a1198c914fc3ef247103fd52c277c5` (`delivery.baseSha`,
`baseShaState: resolved`)

## What changed and why

1. **`.github/workflows/pr.yml` — concurrency carve-out for `edited`.**
   `concurrency.group` changed from
   `${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}`
   to
   `${{ github.workflow }}-${{ github.event_name }}-${{ github.event.action == 'edited' && 'meta-' || '' }}${{ github.event.pull_request.number || github.ref }}`.
   An `edited` PR event (body/title edit) now lands in its own
   `meta-`-prefixed group instead of sharing the PR's ordinary group, so it
   can no longer cancel an in-progress `verify`/`kanmer-gate` run for that
   same PR — closing CORE-139's accepted-risk finding F-001. `cancel-in-progress`
   is unchanged. The comment above the block was rewritten to state this
   truthfully. `opened`/`synchronize`/`reopened`/`ready_for_review` keep the
   original per-PR group and cancellation behaviour.

2. **`.github/workflows/pr.yml` — `kanmer-gate` passes `--draft` conditionally.**
   The `check-pr.mjs` invocation gained
   `${{ github.event.pull_request.draft && '--draft' || '' }}` as a trailing
   argument. The job's `if:` (`github.event_name == 'pull_request'`) is
   unchanged — a draft PR still runs the job, it just gets the `--draft` flag.

3. **`.github/workflows/pr.yml` — `regate` waits then retries once.**
   Replaced the unconditional "could not re-run … in progress or not
   permitted; skipping" branch with: attempt `gh run rerun`; on failure, log
   that the run is in progress, run
   `timeout 900 gh run watch "$run_id" --exit-status >/dev/null 2>&1 || true`,
   then retry `gh run rerun` once, with distinct echo lines for
   "waited then re-ran" vs. "still could not re-run after waiting". The
   open-PR guard (`gh pr list --base main --state open`) is untouched.

4. **`packages/mcp-server/src/check-pr.mjs` — `--draft` flag.**
   - `parseArgs` accepts `--draft` as a boolean flag (no value).
   - `readPrEvent` exposes a non-enumerable `draft` property computed as
     `pr.draft === true` straight from the event payload — this is the
     **sole authoritative source**. The CLI `--draft` flag is carried through
     `parseArgs` but is never itself consulted for the true/false decision in
     `main()`; a caller-side conditional-expression bug therefore cannot
     silently flip a draft PR to strict or a ready PR to advisory. Both
     sources are documented inline where they are read.
   - `main()`'s result-emission tail branches on `pr.draft`. When true: every
     check still runs (no shortcutting of `evaluateMergeGate`); each finding is
     additionally emitted to stdout as `ADVISORY (draft): [<code>] <message>`
     and to stderr as a `::notice` command; when `GITHUB_STEP_SUMMARY` is set,
     the same lines are appended there under a `### kanmer-gate (draft PR —
     advisory)` heading; `process.exitCode` is forced to `0` regardless of
     `result.ok`. Non-draft behaviour is the pre-existing code path, untouched.

5. **`plugins/kanmer/skills/kanmer-execute/SKILL.md`.** Step 3 of "Finish:
   report, PR, Review" now opens the PR with `gh pr create --draft`, and adds
   an explicit paragraph spelling out the full handoff order (`gh pr create
   --draft` → `update_item prs[]` → `move_item implementing → review` → board
   push, reusing the existing "GUI syncs automatically, or an explicit-grant
   push" framing from `kanmer-auto`'s board-push rule since no other exact
   board-push wording exists in the skill tree → `gh pr ready`), and states
   that the draft gate result is advisory while the binding strict/warn
   judgment applies once `gh pr ready` runs.

6. **`plugins/kanmer/skills/kanmer-review/SKILL.md`.** Added one paragraph at
   the top of "Decide and merge" stating that review binds to the PR's
   current head SHA and that a merge requires a current-head
   `scratch/review.md` attestation — blocking under `KANMER_GATE_STRICT`, and
   policy-blocking (not a mere warning to note and proceed past) until that
   variable is set.

7. **`AGENTS.md` §6 "Pull-request merge gate".** Rewrote the concurrency
   paragraph to describe the `edited` carve-out truthfully, added a paragraph
   describing the draft/advisory handoff and its exit-0 behaviour, and added a
   sentence describing regate's wait-then-retry. Updated the `check-pr.mjs`
   command-block example to include the conditional `--draft` argument. No
   `docs/manual` changes were needed — `npm run verify:docs` and
   `npm run check:manual` both reported the manual as already up to date after
   this edit (the merge-gate section in AGENTS.md is free text, not part of
   the `kanmer-setup` managed block).

8. **Tests.**
   - `scripts/pr-workflow.test.mjs`: updated the concurrency regex for the new
     group expression; added assertions that the `kanmer-gate` job block has
     no draft-skip `if:` clause and does pass the conditional `--draft`
     argument; added assertions that `regate` contains the bounded
     `gh run watch` wait and no longer contains the old unconditional
     skip-branch text; added `pull_request_target` absence checks on both
     `pr.yml` and `board-regate.yml`. All pre-existing assertions (verify.if,
     board-branch fetch, board-regate guard, AGENTS.md prose) are unchanged
     and still pass.
   - `packages/mcp-server/src/check-pr.test.mjs`: added
     `readPrEvent exposes draft from the event payload as the sole
     authoritative source`; `--draft mode runs every check but reports
     advisory and always exits 0` (draft+strict+failing-check → exit 0 with
     `ADVISORY (draft):` output and the underlying finding still present in
     the JSON; the identical fixture with `draft:false` keeps exit 1; the
     `--draft` CLI flag alone against a `draft:false` event does **not** flip
     mode, proving the payload is authoritative); `--draft mode still reports
     a stale attestation, advisory and exit 0` (head-mismatched attestation on
     a draft PR still surfaces `STALE_REVIEW`, advisory-prefixed, exit 0).
     Every pre-existing test in this file passes unmodified.

## Commands run (in `.worktrees/core-138`)

```
npm ci                                                                       exit 0
npm run build:core                                                          exit 0
node --test packages/mcp-server/src/check-pr.test.mjs                       exit 0 (10 → 13 tests, all pass)
node --test scripts/pr-workflow.test.mjs                                    exit 0 (1 test, pass)
node --test scripts/pr-workflow.test.mjs packages/mcp-server/src/check-pr.test.mjs   exit 0 (14 tests, pass)
npm run test:scripts                                                        exit 0 (180 tests, 11 suites, pass)
npm run verify:skills                                                       exit 0 (ALL CHECKS PASSED, after one fix — see Deviations)
npm run verify:docs                                                         exit 0 (manual up to date, 22 chapters)
npm run check:manual                                                        exit 0 (manual up to date)
```

## Mapping to acceptance criteria

- AT-19 (draft advisory, ready strict/warn): `check-pr.test.mjs` new cases,
  confirmed live (see below).
- AT-20 / AT-23 (regate waits then retries once): `pr-workflow.test.mjs`
  assertions on the `regate` job block. Not exercised live in this PR (no
  in-progress run existed for `regate` to wait on during this observation
  window); code path verified by unit test and manual reading.
- AT-21 (edited doesn't cancel verify): `pr-workflow.test.mjs` concurrency
  assertion, confirmed live (see below, corrected in review round 1).
- AT-22 (skills document draft handoff + current-head binding):
  `kanmer-execute`/`kanmer-review` SKILL.md edits, `npm run verify:skills`
  green.

## Live observation (AT-19 / AT-21) — confirmed, corrected in review round 1

PR #324: https://github.com/collisionengineers/kanmer/pull/324,
branch `CORE-138-gate-handoff`, original implementation head
`93e59f93e7f1ef1550c99d0af5268b8cca05dd42`.

- **Run 33941013906** (`pull_request`, opened as draft): `kanmer-gate` job
  completed `conclusion: success` (green) even though the underlying
  evaluation had real findings (`WRONG_STAGE`, `NO_REVIEW_RECORD`,
  `COMMITS_UNREACHABLE` — expected, since this run fired while the ticket was
  still `implementing`), because `--draft` was passed and the job forces exit
  0. Job log confirms `ADVISORY (draft): [...]` lines on stdout and
  `::notice` commands on stderr for each finding. **Confirms AT-19**: draft
  PR gate reports advisory/green, not red.
- Edited the PR body via `gh pr edit --body-file` with an actual content
  change (a byte-identical first edit did not trigger a new GitHub webhook —
  noted for reproducers). This fired a new `pull_request` (`action: edited`)
  run: **33941099168**, `createdAt: "2026-09-05T03:10:06Z"`, `kanmer-gate`
  `completedAt: "2026-09-05T03:14:18Z"`, `conclusion: success`; its `verify`
  job was `conclusion: skipped` (expected — `verify.if` excludes `edited`).
- **AT-21, corrected fact pattern** (see "Review round 1 remediation" below
  for the original error): run 33941013906's `verify` job
  (`startedAt: "2026-09-05T03:08:15Z"`) was cancelled at
  `completedAt: "2026-09-05T03:13:44Z"` — **after** the edited run
  (33941099168) was created (`03:10:06Z`) but **before** it finished
  (`03:14:18Z`). The cancellation was caused not by the edited run but by a
  separate `ready_for_review` event's own `pull_request` run, 33941257446
  (`createdAt: "2026-09-05T03:13:32Z"`), which shares the *ordinary* per-PR
  concurrency group with the original `opened` run (neither `ready_for_review`
  nor `opened` gets the `meta-` prefix) and legitimately cancelled it 12
  seconds after its own creation. AT-21 is still confirmed: the `edited` run
  was created at `03:10:06Z` and the original `verify` job was not cancelled
  until `03:13:44Z` — `verify` survived **3m38s past the edited run's own
  creation**, in contrast to the ~12s it took a same-group `ready_for_review`
  event to cancel the equivalent run. The `edited` run never held a slot in
  the original run's concurrency group, so it could not have cancelled it at
  any point; the group carve-out is what the fix guarantees, not a promise
  that nothing else in the workflow will ever race a long-running `verify`.
- Board push: the GUI's auto-sync had already pushed `kanmer-board` to
  `58386cb563a9cc7d9f724aae3d8687bcd64ad04c` before this observation; local
  and `origin/kanmer-board` matched throughout.

Full detail (exact `gh run view --json jobs` output, timestamps) is recorded
in this ticket's `scratch/notes.md`.

## Review round 1 remediation

Independent review (round 1) returned `needs-changes` with two blocking
findings, both from one root cause: facts asserted without reading them back
from the source of truth (Git and the GitHub Actions API).

- **F-001 (blocker) — fabricated commit SHA.** `commits[]`, the
  post-implementation report and `scratch/notes.md` recorded
  `93e59f938b3f3a52a5c17e11c6cccb1e0d2e0f6a`, a SHA that does not exist in
  this repository (a transcription error — the real head differs in its last
  several hex digits). The real PR head at the time was
  `93e59f93e7f1ef1550c99d0af5268b8cca05dd42`, confirmed against both
  `git rev-parse HEAD` in the worktree and `gh pr view 324 --json headRefOid`.
  Fixed: `update_item commits: ["93e59f93e7f1ef1550c99d0af5268b8cca05dd42"]`
  via a fresh `expected_revision`; the fabricated SHA was purged from
  `scratch/notes.md` and from this report (both now cite the real SHA), and
  `commits[]` is updated again below to the new head produced by this
  remediation's merge commit.
- **F-002 (major) — unverified AT-21 narration.** The original report claimed
  run 33941013906's `verify` job "stayed in_progress throughout" the edited
  run. Reading back `gh run view 33941013906 --json jobs` shows it was
  actually cancelled at `2026-09-05T03:13:44Z`, before the edited run
  (33941099168) completed at `2026-09-05T03:14:18Z`. The cancellation came
  from a distinct `ready_for_review` run (33941257446, created
  `2026-09-05T03:13:32Z`) sharing the *original* (non-`meta-`) concurrency
  group, not from the edited run. AT-21 remains genuinely proven — `verify`
  survived 3m38s past the edited run's own creation timestamp versus the ~12s
  it took a same-group event to cancel an equivalent run — but the paragraph
  above and the corresponding section in `scratch/notes.md` were rewritten to
  state only what the raw job JSON shows, with exact quoted timestamps, and
  to explain why the corrected fact pattern still supports the same
  conclusion for a different, more precise reason.

Remediation steps taken:
1. Fixed `commits[]` to the real original head via `update_item`
   (`expected_revision: rev1:3a3d0ec6db411b21` → succeeded).
2. Rewrote `scratch/notes.md`'s AT-21 section and this report's "Live
   observation" section from `gh run view <id> --json jobs`/`createdAt`/
   `event` output only, quoting exact timestamps; removed the fabricated SHA
   from both documents.
3. `git merge origin/main` (DOC-028 `bd368549`, GUI-152 `32aa54fc` had
   landed) — merged cleanly via the `ort` strategy with no conflicts in any
   file this ticket touches (`AGENTS.md` auto-merged; the only overlap was
   both branches independently editing different paragraphs of the file).
   New head: `992569647df7ceaac058d949cf93a8bc01b02314`.
4. Reran the scoped checks on the merged tree:
   `npm run build:core` (exit 0);
   `node --test scripts/pr-workflow.test.mjs packages/mcp-server/src/check-pr.test.mjs`
   (14/14 pass);
   `npm run verify:skills` (ALL CHECKS PASSED).
5. `commits[]` updated to the new head `992569647df7ceaac058d949cf93a8bc01b02314`
   (see below).
6. `scratch/review.md` was not touched, per the coordinator's explicit
   instruction — the reviewer owns that document.

## Deviations from the plan

- `verify-skill-prose.mjs` check 5 ("every kanmer-* reference resolves to a
  real skill") flagged the literal string `kanmer-gate` when first used in
  `kanmer-execute/SKILL.md`'s new paragraph, because the check's regex treats
  any `kanmer-[a-z]+` token as a skill-name reference unless explicitly
  exempted (only `kanmer-mcp` and `kanmer-board` are exempt). Reworded that
  sentence to say "the merge gate" instead of naming the CI job
  `kanmer-gate` literally. No plan or scope change — purely a wording fix to
  pass an existing prose lint.
- `node-version` lines in `pr.yml` were left completely untouched (still
  `20`); PR #322 (CORE-140) had not merged at the time this branch was
  created, so there was no conflict to reconcile on that front either before
  or after the round-1 merge with `origin/main`.
- Review round 1 found no defects in the code or tests themselves — only in
  two board-record claims (commit SHA, AT-21 narration). No code, workflow,
  or test file needed to change as part of remediation; only board documents
  and the merge with `origin/main`.

## What stays on CORE-142

- A distinct gate-only required check that re-evaluates a freshly fetched
  board revision, separate from `verify` (needs a branch-protection required-
  check change).
- Promoting the current-head attestation check from warn-by-default to
  blocking-by-default (`KANMER_GATE_STRICT=1` as the repository's set value,
  an administrator action).
- Both are explicitly out of scope here per the ticket body and were not
  touched: no branch-protection change, no repository-variable write, no
  `pull_request_target` anywhere (asserted by the new tests).

## Files changed

- `.github/workflows/pr.yml`
- `AGENTS.md`
- `packages/mcp-server/src/check-pr.mjs`
- `packages/mcp-server/src/check-pr.test.mjs`
- `plugins/kanmer/skills/kanmer-execute/SKILL.md`
- `plugins/kanmer/skills/kanmer-review/SKILL.md`
- `scripts/pr-workflow.test.mjs`
- (round 1 remediation: no additional source files — one merge commit from
  `origin/main` plus board-document corrections)

No other files were touched. `scripts/verify.mjs`,
`scripts/agents-block-body.mjs`, `kanmer-verify/SKILL.md`,
`packages/mcp-server/src/reconciliation.ts` and `apps/gui/**` are unchanged.
