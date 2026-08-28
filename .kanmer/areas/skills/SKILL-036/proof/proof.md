---
kind: proof-record
merged_sha: "70d23efda85b3d347e36ad7f1e55fa0d4d32c754"
environment: "Detached worktree .worktrees/verify-skill-036-70d23efda85b3d347e36ad7f1e55fa0d4d32c754 at exact merge SHA (symbolic-ref empty, status clean). Windows 11 (MINGW64_NT-10.0-26200), node v24.15.0, npm 11.14.1. No node_modules installed: confirmed unnecessary for the named rails, which import only node: builtins plus a local module. Hosted CI consulted for the compiled surfaces."
verified_at: "2026-08-28T07:05:00Z"
result: PASS
attempts:
  - attempted_at: "2026-08-28T06:47:00Z"
    command: "gh pr view 302 --json state,mergeCommit,url,title,mergedAt,files"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid 70d23efda85b3d347e36ad7f1e55fa0d4d32c754, mergedAt 2026-08-28T06:42:57Z. 8 files, zero paths under packages/."
  - attempted_at: "2026-08-28T06:48:00Z"
    command: "git worktree add --detach .worktrees/verify-skill-036-<sha> <sha> && git -C <wt> rev-parse HEAD && git -C <wt> symbolic-ref --short -q HEAD && git -C <wt> status --short --branch"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "rev-parse HEAD == 70d23efda85b3d347e36ad7f1e55fa0d4d32c754; symbolic-ref empty (detached, rc=1); status '## HEAD (no branch)' only — clean. Re-asserted clean and detached at the end of the run."
  - attempted_at: "2026-08-28T06:49:00Z"
    command: "git diff --stat 70d23efd^1 70d23efd; git diff --name-only 70d23efd^1 70d23efd | grep -c '^packages/'"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "8 files, 863 insertions, 42 deletions. packages/ path count = 0. Binding fact confirmed, not assumed."
  - attempted_at: "2026-08-28T06:50:00Z"
    command: "grep -n '^import' scripts/verify-skill-prose.mjs scripts/verify-agents-block.mjs scripts/verify-skill-prose.test.mjs; test -d node_modules"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "All three rails import only node: builtins plus local ./agents-block.mjs. node_modules absent. npm ci confirmed unnecessary for the named rails."
  - attempted_at: "2026-08-28T06:51:00Z"
    command: "npm run verify:skills"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "ALL CHECKS PASSED. Check block 19 'SKILL-036 durable /goal orchestration contract' present with exactly 31 PASS assertions; 19 is the last section. Check 6 lists exactly 12 skills."
  - attempted_at: "2026-08-28T06:52:00Z"
    command: "npm run verify:agents-block"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "31/31 checks passed."
  - attempted_at: "2026-08-28T06:53:00Z"
    command: "node --test scripts/verify-skill-prose.test.mjs"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "tests 28, pass 28, fail 0 (duration 49.5s)."
  - attempted_at: "2026-08-28T06:54:00Z"
    command: "grep -n 'EXPECTED_SKILLS' scripts/verify-skill-prose.mjs; git diff 70d23efd^1 70d23efd -- scripts/verify-skill-prose.mjs | grep EXPECTED_SKILLS; ls plugins/kanmer/skills | wc -l"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "EXPECTED_SKILLS = 12, untouched by the diff; 12 skill directories on disk. Roster unchanged — kanmer-auto was extended in place, no skill added."
  - attempted_at: "2026-08-28T06:55:00Z"
    command: "git show 70d23efd^1:<kanmer-auto SKILL.md> | sed -n '161,198p' | sha256sum; git show 70d23efd:<...> | sed -n '361,398p' | sha256sum"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "'## 4. Mandatory stop predicates' byte-identical: both 03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38, 1877 bytes, empty diff."
  - attempted_at: "2026-08-28T06:56:00Z"
    command: "git diff 70d23efd^1 70d23efd | grep '^[+-]## '"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "Only the unnumbered 'Orientation and durable-state resume' -> 'Orientation, scope and durable-state resume' retitle. Numbered sections 1-11 unchanged in name and order across all three skills. No renumbering. Five new ### subsections added."
  - attempted_at: "2026-08-28T06:57:00Z"
    command: "grep -rn 'failure_class' plugins/kanmer/skills/ (+ read the routing tables in kanmer-verify and kanmer-auto)"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "Exactly four classes — transient, inconclusive, implementation, plan — consistent across kanmer-verify's routing table, kanmer-auto's routing bullet, and kanmer-tickets/references/tool-reference.md (CORE-131's apply_reconciliation router). No fifth class introduced."
  - attempted_at: "2026-08-28T06:58:00Z"
    command: "Mutation battery round 1: 40 mutations of real prose against fresh copies of the merged skills tree, each run through scripts/verify-skill-prose.mjs <fixture>"
    cwd: "C:/Users/Alex/AppData/Local/Temp/skill036-battery (fixtures copied from the detached worktree)"
    exit_code: 0
    result: PASS
    summary: "Baseline clean (exit 0, no FAILs). 40/40 mutations caught, 0 problems, each by the correctly named check. Anti-absorption 5/5: deleting one scope's resolution step failed ONLY that scope's check, siblings unaffected. Negative assertions 2/2: reintroducing literal 'rebase origin/main' fired 'rebases onto the recorded delivery target, never a literal main'; reintroducing 'rev-parse origin/kanmer-board' fired the board-push check. Forbidden-claim backstops 2/2 fired on inserted affirmative claims."
  - attempted_at: "2026-08-28T06:59:00Z"
    command: "Mutation battery round 2: probe claimed weak spots (duplicated phrases; AC2 head_sha binding)"
    cwd: "C:/Users/Alex/AppData/Local/Temp/skill036-battery"
    exit_code: 0
    result: PASS
    summary: "Deleting the operative orientation freeze block, the preflight identity bullet and the budget-exhausted escalation paragraph each fired their named check. One gap found: deleting the entire '- **Board worktree.**' preflight bullet is UNDETECTED, because the assertion's /get_status\\.boardWorktree/ sub-rule is also satisfied by the push-the-board section. Same class as the reviewer's accepted F-012, new instance. Note severity; prose is present and correct as merged. Also undetected: kanmer-review's pre-existing head_sha / independent:true prose (unpinned anywhere; not added by this change)."
  - attempted_at: "2026-08-28T07:00:00Z"
    command: "Mutation battery round 3: are AC-bearing sub-clauses pinned?"
    cwd: "C:/Users/Alex/AppData/Local/Temp/skill036-battery"
    exit_code: 0
    result: PASS
    summary: "Completion definition is pinned (fired 'worker/ticket/run completion stays distinct'). Three sub-clauses are UNDETECTED when deleted: the list-scope 'unknown or archived id is a stop before the freeze' sentence, the LEASE_EXPIRED handling sentence, and kanmer-auto's same-branch/worktree/PR re-entry sentence. Note severity: check 19 pins each assertion's own named clause (proved 40/40), not every AC-bearing sentence in the changed files."
  - attempted_at: "2026-08-28T07:01:00Z"
    command: "Read section 1 step 1 of kanmer-auto/SKILL.md; read FRD-034 acceptance criteria"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "All five scopes (ticket, group, area, list, board) have distinct, executable resolution steps via get_item/list_items. List scope states 'An unknown or archived id is a stop before the freeze, never a silently dropped member' — the stop precedes the freeze sentence in the same step. Confirmed textually; the clause itself is not check-pinned (see round 3)."
  - attempted_at: "2026-08-28T07:02:00Z"
    command: "Spot-check the three stated facts by content"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "(1) list_items genuinely filters by area — smoke.mjs:1222 asserts it, backed by store.ts:2929 'if (filter.area && item.area !== filter.area) return false'. (2) index.ts:672 'process.env.KANMER_BOARD_BRANCH?.trim() || \"kanmer-board\"'. (3) No packages/ code reads the run-record schema field (only unrelated project/endpoint-registry schemas), so the schema: 2 stamp is inert at runtime. Line numbers in the brief differed from this SHA; facts confirmed by content."
  - attempted_at: "2026-08-28T07:03:00Z"
    command: "npm run verify:docs"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "verify-docs PASS — document mirror, 3 remote chapters, 26 doctor ids, links/fences/canary/provider boundaries, generated manual current."
  - attempted_at: "2026-08-28T07:03:30Z"
    command: "npm run plugin:check"
    cwd: "<detached verification worktree>"
    exit_code: 1
    result: INCONCLUSIVE
    summary: "Refused by its own isolation guard: '@kanmer/core resolves to <main checkout>/packages/core/dist/index.js, not this checkout's'. Requires npm install in the worktree. Not run rather than failed; covered by the hosted verify job, which runs this step and is green at this exact SHA."
  - attempted_at: "2026-08-28T07:03:45Z"
    command: "node --test scripts/auto-run-state.test.mjs"
    cwd: "<detached verification worktree>"
    exit_code: 1
    result: INCONCLUSIVE
    summary: "ERR_MODULE_NOT_FOUND for packages/core/dist/index.js — no build artefact in this worktree, not a logic failure. Contradicts the assumption that no install was needed for anything: the three named rails need none, but this test and plugin:check do. Covered by the hosted verify job at this exact SHA."
  - attempted_at: "2026-08-28T06:44:36Z"
    command: "Hosted CI: 'Pull request verification' workflow, run 33148871390, verify job, at merge SHA 70d23efd (first attempt)"
    cwd: "GitHub-hosted windows runner"
    exit_code: 1
    result: FAIL
    summary: "RETAINED FAILURE. packages/core src/store.test.ts > KanmerStore > 'updates fields and stamps updated' — 'Test timed out in 5000ms' (actual 8745ms) plus 'ENOTEMPTY: directory not empty, rmdir C:\\Users\\RUNNER~1\\AppData\\Local\\Temp\\kanmer-test-QLnyJZ\\.kanmer'. The known CORE-128 Windows timing/cleanup class."
  - attempted_at: "2026-08-28T06:58:56Z"
    command: "gh run rerun 33148871390 --failed  (same-SHA re-run of the verify job)"
    cwd: "GitHub-hosted windows runner"
    exit_code: 0
    result: PASS
    summary: "verify SUCCESS, regate SUCCESS, kanmer-gate skipped; run conclusion success at the identical headSha 70d23efda85b3d347e36ad7f1e55fa0d4d32c754. Red run discharged — see the three-part discharge in the body."
  - attempted_at: "2026-08-28T07:04:00Z"
    command: "grep -rn 'blockedSet|computeBlockedIds' packages/; git diff 70d23efd^1 70d23efd | grep -c 'blockedSet|computeBlockedIds'"
    cwd: "<detached verification worktree>"
    exit_code: 0
    result: PASS
    summary: "computeBlockedIds lives in packages/core/src/links.ts:61; zero occurrences in the diff. F-023 confirmed pre-existing — merging did not worsen main."
  - attempted_at: "2026-08-28T07:04:30Z"
    command: "npm run verify (full rail)"
    cwd: "<detached verification worktree>"
    exit_code: null
    result: NOT_APPLICABLE
    summary: "Not run locally: the rail is fail-fast and its build/test/typecheck steps require an install this worktree does not have, and CORE-128's antigravity EBUSY is off-limits. Every step it would skip that runs without an install was executed individually above (verify:skills, verify:agents-block, verify:docs, the fixture tests); the install-dependent remainder is covered by the green hosted verify job at this exact SHA."
---

# Proof — SKILL-036 at `70d23efda85b3d347e36ad7f1e55fa0d4d32c754`

Independent post-merge verification. I did not write or review this work. Every
result below was produced in a disposable detached worktree at the exact GitHub
`mergeCommit` SHA, or on hosted CI at that same SHA.

**Result: PASS.**

## Merge identity

`gh pr view 302` reports `state: MERGED` and
`mergeCommit.oid: 70d23efda85b3d347e36ad7f1e55fa0d4d32c754`, merged
2026-08-28T06:42:57Z. The verification worktree asserts detached
(`symbolic-ref` empty), clean (`## HEAD (no branch)` only) and exactly that SHA,
both before and after the run. The mutable `main` checkout, `.worktrees/kanmer`,
`.worktrees/skill-036` and every other worktree were left untouched; nothing was
committed, pushed, reset or branch-switched.

The diff is 8 files, 863 insertions, 42 deletions, **zero paths under
`packages/`** — confirmed, not assumed.

## What the ticket claims, and whether it holds

The claim under test is that this ticket's prose rules are *enforced by checks
that fail when the rule is deleted*. I did not re-read the reviewer's account of
that; I rebuilt the battery from the merged script.

### Rails

| Rail | Exit | Observed |
|---|---|---|
| `npm run verify:skills` | 0 | ALL CHECKS PASSED; block 19 present with exactly **31** assertions and is the last section |
| `npm run verify:agents-block` | 0 | **31/31** |
| `node --test scripts/verify-skill-prose.test.mjs` | 0 | **28** tests, 28 pass |
| `npm run verify:docs` | 0 | PASS |

### My own mutation battery

40 mutations in round 1, each deleting or corrupting real prose in a fresh copy
of the merged skills tree, then running the merged validator against that copy.
Baseline clean. **40/40 caught, every one by the correctly named check.**

- **Anti-absorption — 5/5.** Deleting the ticket, group, area, list or board
  resolution step failed **only** that scope's check; the four siblings still
  passed in every case. The checks are not entangled: they pin the per-scope
  capability, not the sentence advertising that five exist.
- **Negative assertions — 2/2, both halves verified.** For the delivery target
  I reintroduced a literal `rebase origin/main`; the negative half fired by
  name. I also confirmed the second embedded negative by reintroducing
  `rev-parse origin/kanmer-board`, which fired the board-push check. The
  negative halves are live, not decorative.
- **Forbidden-claim backstops — 2/2.** These cannot be triggered by deletion, so
  I inserted the affirmative claims ("The controller merges the PR once the
  final review passes", "the controller replans once the remediation budget is
  spent"); both fired.

The claim holds for the 31 assertions' own named clauses.

## Structural assertions

- **`## 4. Mandatory stop predicates` is byte-identical to base** — sha256
  `03796a0e…e19b38` on both sides, 1877 bytes, empty diff.
- **No section was renumbered.** The only `##` heading change in the entire diff
  is the retitle of the unnumbered `## Orientation and durable-state resume` to
  `## Orientation, scope and durable-state resume`. Numbered sections 1–11 are
  unchanged in name and order. Five new `###` subsections were added.
- **No fifth `failure_class`.** Exactly four — `transient`, `inconclusive`,
  `implementation`, `plan` — consistent across kanmer-verify's routing table,
  kanmer-auto's routing bullet and the `apply_reconciliation` reference CORE-131's
  router depends on.
- **Roster is still 12 and `EXPECTED_SKILLS` is unchanged.** The constant is not
  in the diff; 12 skill directories on disk; check 6 enumerates 12. kanmer-auto
  was extended in place, as designed.
- **Five scopes each have a real resolution procedure**, all through `get_item`
  or `list_items`. The list scope states that an unknown or archived id "is a
  stop before the freeze, never a silently dropped member", and that sentence
  precedes the freeze sentence in the same step.

## FRD-034 acceptance criteria

| # | Criterion (abridged) | Verdict | Basis |
|---|---|---|---|
| 1 | Fixture scope freezes its roster, uses leases, reaches a terminal disposition for every member without selecting unrelated captures | **Met** | Five per-scope resolution steps + one freeze rule + one readiness rule (checks 15–20); capture exclusion with `CAPTURE_NOT_PROMOTED`; lease renew/`LEASE_EXPIRED`; §8 completion requires every selected non-skipped ticket terminal (pinned). Qualified by F-023 for rosters with an internal blocker/dependent pair — pre-existing, deferred to SKILL-038. |
| 2 | Attestations prove implementation identity ≠ reviewer identity and bind to the exact PR head | **Met** | New "Independence is a distinct **run identity**, not a distinct account… Record all three in the ledger" (pinned by the merge/identity check). Head binding rests on kanmer-review's pre-existing `head_sha`/`independent` frontmatter — present and correct, but unpinned by any check (pre-existing gap, not introduced here). |
| 3 | In-scope correction stays in the original ticket/PR, one delta review | **Met** | `needs-changes` routes to `kanmer-execute` on the **same** branch, worktree and PR, then the reviewer's delta review; budget read live before dispatch. Pinned on the kanmer-review side by check 18; kanmer-auto's own sentence is unpinned. |
| 4 | Exact merged-SHA verification records PASS proof before Done and routes implementation/plan failures to the right earlier phase | **Met** | kanmer-verify's four-class routing table and PASS-only Done move; `transient` must be earned with a same-SHA re-run, a diff-untouched confirmation and a mechanism argument; distinct log paths. Controller rebases onto the recorded `delivery_target`, never literal `main` (pinned, both halves). |
| 5 | Budgets stop repeated unchanged audits while preserving minor/note dispositions and residual risk | **Met** | One automatic replan, permitted only while the budget is still available before it is spent, never resetting or incrementing `review_round`; `REMEDIATION_BUDGET_EXHAUSTED` is operator-only with no second route; minor/note/accepted-risk findings stay residual, with `deferred-to-ticket` preserved as the legal out-of-scope disposition. |
| E1 | Merged PR left in Review and PASS proof left in Verifying are reconciled before success is reported | **Met** | "Active Review and Verifying invariants": "Verifying is not a holding column", never `completed` while a selected ticket sits unexplained. |
| E2 | An owner-only decision becomes one exact question, not a retry-counter extension | **Met** | Budget-exhausted refusal quoted verbatim as an operator-only question; reopening needs a reason beginning `operator:`. |

All five criteria and both edge cases are met at this SHA.

## Hosted CI — a red run, discharged

The first `Pull request verification` run at this exact merge SHA
(33148871390) concluded **failure**. I retained it rather than re-running
silently. Discharge:

1. **Same-SHA re-run.** `gh run rerun 33148871390 --failed` re-ran `verify` at
   the identical `headSha 70d23efd…`; it concluded **success** (verify success,
   regate success). Both attempts are recorded above, in order.
2. **Diff-untouched.** The sole failing test is
   `packages/core/src/store.test.ts > KanmerStore > "updates fields and stamps
   updated"`. This change touches **zero** files under `packages/`, so the code
   under test is byte-identical to its merge base.
3. **Mechanism.** The failure signature is `Test timed out in 5000ms` (the test
   actually took 8745ms) together with `ENOTEMPTY: directory not empty, rmdir
   …\kanmer-test-QLnyJZ\.kanmer`. That is filesystem cleanup contention on a
   Windows runner exceeding vitest's 5s default — the known CORE-128 Windows
   timing/`ENOTEMPTY` class, which the operating instructions record as reaching
   hosted CI. It is a runner-timing artefact, not a logic defect, and nothing in
   this diff can reach it.

## Local rail coverage, honestly stated

The three named rails need no install — they import only `node:` builtins plus a
local module, which I verified rather than assumed. Two further steps do need
one, which the "no `npm ci` needed" expectation did not anticipate:
`npm run plugin:check` refuses via its own isolation guard, and
`scripts/auto-run-state.test.mjs` cannot resolve `packages/core/dist`. Both are
recorded as **INCONCLUSIVE** — a command that could not run, never a fabricated
pass — and both are executed by the hosted `verify` job, which is green at this
exact SHA. `npm run verify` as a whole is NOT_APPLICABLE locally for the same
reason plus the off-limits CORE-128 EBUSY step.

## Findings

No blocker or major was found that the review missed. Three note-level
observations, reported to the controller rather than filed:

- **N-1 (note).** The assertion named "kanmer-auto preflights identity, delivery
  target and board **health**" pins board health only through
  `/get_status\.boardWorktree/`, which is *also* satisfied by the
  push-the-board section. Deleting the entire `- **Board worktree.**` preflight
  bullet leaves check 19 green. Same class as the reviewer's accepted F-012, new
  instance; the check is named for more than it pins.
- **N-2 (note).** Several AC-bearing sub-clauses are unpinned when deleted: the
  list-scope "stop before the freeze" sentence, the `LEASE_EXPIRED` handling
  sentence, and kanmer-auto's same-branch/worktree/PR re-entry sentence. Check 19
  reliably pins each assertion's own named clause — proved 40/40 — but that
  guarantee does not extend to every acceptance-bearing sentence in the changed
  files.
- **N-3 (note).** The `schema: 2` requirement is prose-only. No `packages/` code
  reads the run-record `schema` field, and `scripts/auto-run-state.test.mjs`
  still builds its fixtures with `schema: 1` without complaint. The refuse-to-
  resume rule binds a controller that follows the contract; nothing enforces it
  at runtime.

Recorded, not failed for: **F-023 (major → SKILL-038)**, confirmed
pre-existing — `computeBlockedIds` is in `packages/core/src/links.ts` and appears
zero times in this diff, so merging did not worsen `main`. Accepted residuals
F-005, F-008, F-012, F-013, F-014, F-015, F-019, F-021, F-022 stand.

## F-005 and F-008 for CORE-119

The reviewer flagged these two as the ones that matter for CORE-119. **I agree,
with one amendment.**

**F-005 (no numeric verification budget) — agree, and it is the sharper of the
two.** CORE-119 is the horizon's terminal proof, so its defining property is that
it must *terminate*. Verification currently has no counter: `transient` routes to
a rerun bounded only by qualitative rules — "never automatically retry failed
verification commands" and the active-Verifying invariant. Those are judgment
gates, and a judgment gate is exactly what a terminal proof cannot rely on to
halt. This verification is itself the illustration: a genuinely flaky Windows
rail produced one red run that I discharged with three pieces of evidence, and
nothing but my own discipline bounded how many times I could have called it
transient instead.

**F-008 (`current.md` pointer race) — agree it matters, but it is conditional.**
It bites only if CORE-119 runs more than one controller against the host group.
For a single-controller terminal proof the write-then-read-back protocol plus the
"different controller owning a `running` record is a stop predicate" rule are
adequate. If CORE-119 runs concurrent lanes, the race is real and unfixable in
prose — it needs the `packages/core` change (expected-version or exclusive-create
on `set_group_doc`) correctly excluded from this ticket.

**Amendment: I would add F-023 alongside them**, as the reviewer's own closing
paragraph does. A golden-board roster for a terminal proof is very likely to
contain a blocker and its dependent, which is precisely the shape that silently
loses the dependent before the freeze and makes the `blocks`-edge ordering rule
unreachable. Of the three, F-023 is the one most likely to be exercised by
CORE-119's own fixture.

## Boundaries observed

No `packages/` file was modified. `main` was not updated, force-pushed or
branch-deleted. `.worktrees/kanmer`, `.worktrees/skill-036`, `.worktrees/core-128`,
`.worktrees/core-131` and every other `verify-*` worktree were left untouched.
The board was not committed or pushed. The ticket remains taken with its
worktree `.worktrees/skill-036`; releasing it is closeout's.
