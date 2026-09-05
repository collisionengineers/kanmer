# Plan — CORE-138

Rescoped subset of R1-GATE (see HZN-009 context and
`you-are-in-charge-concurrent-kay.md` "R1-GATE — CORE-138 subset"). Three
workflow/CLI changes, two skill-prose updates, and their tests. CORE-142
(admin-dependent required-check + blocking attestation) is explicitly out of
scope.

## Steps

1. **`pr.yml` concurrency carve-out.** Change `concurrency.group` to fold
   `edited` PR events into their own group (prefix `meta-`) while
   `opened`/`synchronize`/`reopened`/`ready_for_review` keep the existing
   per-PR group and cancel-in-progress semantics. Rewrite the comment above the
   block so it accurately says a body edit no longer competes with a
   verify/gate run for the same PR.

2. **`check-pr.mjs --draft`.** Add the flag to `parseArgs`. Compute the
   effective "is draft" boolean from `event.pull_request.draft` (authoritative)
   — the `--draft` CLI flag itself is not separately trusted for the true/false
   decision, only used as a workflow-level signal/assertion; document this in a
   comment so a future reader knows which source wins. Wrap the existing
   `main()` result-emission tail: when draft, run every check as-is, then
   write `ADVISORY (draft): <message>` lines to stdout (in addition to the
   existing JSON line) and to `GITHUB_STEP_SUMMARY` (if set), and force
   `process.exitCode = 0`. Non-draft path is untouched code.

3. **`pr.yml` kanmer-gate step args.** Append
   `${{ github.event.pull_request.draft && '--draft' || '' }}` to the
   check-pr.mjs invocation line.

4. **`pr.yml` regate wait-then-retry.** Replace the "in progress → skip" log
   branch: attempt `gh run rerun`; if that fails because the run is in
   progress, first do a bounded wait
   (`timeout 900 gh run watch "$run_id" --exit-status >/dev/null 2>&1 || true`)
   then retry `gh run rerun "$run_id" --job "$job_id"` once, echoing a clear
   line for (a) waited-then-rerun-succeeded and (b) still-could-not-rerun.
   Keep the existing open-PR guard (`gh pr list --base main --state open`) and
   the rest of the loop as-is.

5. **`kanmer-execute/SKILL.md`.** Rewrite the "Finish: report, PR, Review"
   step 3 PR-creation block: `gh pr create --draft …` → `update_item prs:[…]`
   → `move_item implementing → review` → board push (reuse existing prose for
   *how* — GUI auto-sync or `git -C .worktrees/kanmer push`) → `gh pr ready`.
   Add one sentence: the draft-mode gate result is advisory; the strict/warn
   judgment that matters binds to the PR once `gh pr ready` runs, because
   `pull_request` events re-run the workflow file that is actually on the PR
   branch. Minimal diff — keep the rest of the section's structure.

6. **`kanmer-review/SKILL.md`.** Add one explicit sentence (placed in/near
   "Decide and merge") that: review binds to the PR's current head SHA, and a
   merge requires a current-head `scratch/review.md` attestation;
   `KANMER_GATE_STRICT` makes that blocking at the CI layer, and until it is
   set the reviewer must still treat a missing/stale current-head attestation
   as blocking by policy (not merely a warning to note and proceed past).
   Minimal diff.

7. **Tests.**
   - `scripts/pr-workflow.test.mjs`: add assertions for the new concurrency
     expression (contains the `edited`/`meta-` conditional); the `kanmer-gate`
     step's conditional `--draft` argument; that `verify.if` is unchanged
     (still excludes `edited`/`workflow_dispatch`, still includes push-to-main);
     that `regate` contains `gh run watch` and does NOT contain the old
     unconditional "could not re-run … in progress or not permitted; skipping"
     as the sole path (keep an assertion that some in-progress handling exists
     without asserting exact removed string, since the message stays as a
     fallback log on failure); and that neither workflow file contains
     `pull_request_target`.
   - `packages/mcp-server/src/check-pr.test.mjs`: add a case that runs
     check-pr with a draft event + a failing check (e.g. missing attestation
     under `KANMER_GATE_STRICT=1`) and asserts exit 0 plus `ADVISORY (draft):`
     in stdout/stderr; a case with the same fixture but `draft:false` asserting
     unchanged exit 1 behavior; a stale-attestation-on-draft case (head SHA
     mismatch) asserting the finding still appears, prefixed advisory, exit 0.

8. **AGENTS.md §6.** Update the "### Pull-request merge gate" paragraph to
   describe: the draft-first handoff and its advisory result; the `edited`
   concurrency carve-out (no more cancelling a running verify on a body edit);
   the regate bounded-wait-then-retry behavior. Run `npm run verify:docs` and
   `npm run check:manual`; touch `docs/manual` only if those demand it.

## Test matrix (acceptance mapping)

| AT | Covered by |
|---|---|
| AT-19 (draft advisory, ready strict/warn) | check-pr.test.mjs new cases |
| AT-20 (regate waits) | pr-workflow.test.mjs regate assertions |
| AT-21 (edited doesn't cancel verify) | pr-workflow.test.mjs concurrency assertion + live observation |
| AT-22 (skills document draft handoff + current-head binding) | verify:skills green + manual read |
| AT-23 (regate one retry after wait) | pr-workflow.test.mjs regate assertions |

## Commands (scoped, not the full rail)

```
npm run build:core
node --test scripts/pr-workflow.test.mjs packages/mcp-server/src/check-pr.test.mjs
npm run test:scripts
npm run verify:skills
npm run verify:docs && npm run check:manual
```

## Deviations / stop conditions

- Stop and record a deviation rather than editing `node-version` lines in
  `pr.yml` if PR #322 has not yet merged and a conflict appears; rebase onto
  latest `main` first.
- Stop and ask rather than adding a new required check, branch-protection
  change, or `KANMER_GATE_STRICT` default flip — those are CORE-142.
- Do not touch `scripts/verify.mjs`, `scripts/agents-block-body.mjs`,
  `kanmer-verify/SKILL.md`, `reconciliation.ts`, or `apps/gui/**`.
