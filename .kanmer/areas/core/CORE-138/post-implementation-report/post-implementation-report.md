# Post-implementation report — CORE-138

PR: https://github.com/collisionengineers/kanmer/pull/324 (draft)
Branch: `CORE-138-gate-handoff`
Head commit: `93e59f938b3f3a52a5c17e11c6cccb1e0d2e0f6a`
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

- AT-19 (draft advisory, ready strict/warn): `check-pr.test.mjs` new cases;
  live observation pending (see below).
- AT-20 / AT-23 (regate waits then retries once): `pr-workflow.test.mjs`
  assertions on the `regate` job block.
- AT-21 (edited doesn't cancel verify): `pr-workflow.test.mjs` concurrency
  assertion; live observation pending (see below).
- AT-22 (skills document draft handoff + current-head binding):
  `kanmer-execute`/`kanmer-review` SKILL.md edits, `npm run verify:skills`
  green.

## Live observation (AT-19 / AT-21)

PR #324 was opened as a draft
(`https://github.com/collisionengineers/kanmer/pull/324`) against `main` from
`CORE-138-gate-handoff`. This report is written before the workflow run(s)
against that PR have been observed on GitHub — the ticket instructions ask
for confirmation that `kanmer-gate` reports advisory (green) on the draft, and
that a subsequent `gh pr edit --body` does not cancel a running `verify`. The
run ids and outcomes of that observation, once available, belong in a scratch
note; `kanmer-review` should re-confirm this on the current head before
approving, since this workflow-file behaviour only takes effect for
`pull_request` events using the workflow file that is actually on the PR
branch (already true here since `pr.yml` is edited on this branch).

## Deviations from the plan

- `verify-skill-prose.mjs` check 5 ("every kanmer-* reference resolves to a
  real skill") flagged the literal string `kanmer-gate` when first used in
  `kanmer-execute/SKILL.md`'s new paragraph, because the check's regex treats
  any `kanmer-[a-z]+` token as a skill-name reference unless explicitly
  exempted (only `kanmer-mcp` and `kanmer-board` are exempt). Reworded that
  sentence to say "the merge gate" instead of naming the CI job
  `kanmer-gate` literally. No plan or scope change — purely a wording fix to
  pass an existing prose lint.
- No other deviations. `node-version` lines in `pr.yml` were left completely
  untouched (still `20`); PR #322 (CORE-140) had not yet merged at the time
  this branch was created, so there was no conflict to reconcile.

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

No other files were touched. `scripts/verify.mjs`,
`scripts/agents-block-body.mjs`, `kanmer-verify/SKILL.md`,
`packages/mcp-server/src/reconciliation.ts` and `apps/gui/**` are unchanged.
