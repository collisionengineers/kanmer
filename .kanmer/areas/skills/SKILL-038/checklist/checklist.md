# Checklist — SKILL-038

*One independently tickable box per ordered plan step or acceptance check.*

- [x] Create `.worktrees/skill-038` on branch `skill-038` from `70d23efd`; confirm `git -C <worktree> rev-parse HEAD` == `70d23efd`.
- [x] Record the baseline: `verify:skills` exit 0, check-19 assertion count (31), `node --test scripts/verify-skill-prose.test.mjs` pass count (28), and `## 4.`'s sha256 + byte count.
- [x] Rewrite `kanmer-auto/SKILL.md` §1 step 2: drop only archived tickets and captures; state that `blocked: true` is a board fact; resolve blockers via `get_links.blockedBy` judging liveness from each blocker's own item.
- [x] Add the in-roster bullet: every live blocker inside the roster being frozen ⇒ keep the dependent as queued work, ordered by §2 into one serial lane behind its blockers.
- [x] Add the out-of-roster bullet: any live blocker outside the roster ⇒ exclude, reporting the blocking ids and where they sit.
- [x] Add `### The transient retry budget` to §3 with `transient_retry_limit` (default 2), the `Transient` ledger counter, and the verbatim refusal quoted in the skill.
- [x] Add `transient_retry_limit: 2`, the Run-invariant line, and the `Transient` ledger column to `run-state-template.md`, keeping `| Replan |` and all 11 pinned frontmatter fields.
- [x] [pre-review] Confirm `## 4. Mandatory stop predicates` is still 1877 bytes / sha256 `03796a0e…` and `## 1.`–`## 11.` are byte-identical to `70d23efd`. Re-confirmed after the rebase onto `d523a293`.
- [x] Repair check 19's board-health regex (N-1) so it pins the `- **Board worktree.**` preflight bullet and nothing the push-the-board section satisfies.
- [x] Add the four new `goalContract` entries (board-wide flag, in-roster retain, out-of-roster exclude, transient budget).
- [x] Add `transient_retry_limit:` to the run-state field loop and the `| Transient |` ledger assertion; add the `roster that drops every blocked ticket board-wide` forbidden-claim entry with all four phrasings.
- [x] [pre-review] `node scripts/verify-skill-prose.mjs` exits 0 and check 19 prints 38 assertion lines.
- [x] Add the five mutation fixtures to `verify-skill-prose.test.mjs` using the existing `goalFixture`/`edit`/`expectFail`/`expectPass` helpers.
- [x] [pre-review] `node --test scripts/verify-skill-prose.test.mjs` reports 33 passing, 0 failing, with no pre-existing test modified or weakened.
- [x] [pre-review] Anti-absorption sweep: delete each added/repaired clause in turn and record that the FAIL set is exactly its own named check. **9/9 mutations produced exactly one FAIL, each its own named check.**
- [x] [pre-review] Confirm the new forbidden-claim regexes do not match the new positive prose. All four report "no match".
- [x] [pre-review] `git diff --name-only origin/main` lists exactly the four expected files and no `packages/` path.
- [ ] [pre-review] Run `npm run verify` and `npm run test:scripts`; record exact exit codes and classify each failure (in scope / known out-of-scope antigravity `EBUSY` / INCONCLUSIVE).
- [ ] [pre-review] Record `npm run plugin:check` and `auto-run-state.test.mjs` as INCONCLUSIVE with the reason, never as a pass.
- [ ] Commit with the `Kanmer: SKILL-038` trailer, push `skill-038`, open the PR with a `Kanmer: SKILL-038` footer.
- [ ] [post-merge] Re-check PR checks at the head SHA; discharge any Windows-timing red with a same-SHA re-run, a diff-untouched confirmation and a mechanism argument, retaining the first failure.
- [ ] Write the post-implementation report and move SKILL-038 to Review. Do not review, resolve threads, merge, or start another ticket.

## Progress notes

**Controller-directed rebase (deviation from the plan's `70d23efd` base).** CORE-128
merged as `d523a293` mid-implementation. Rebased cleanly, no conflicts. Two
consequences, both recorded in `scratch/execute.md`:

1. `scripts/verify-skill-prose.test.mjs` is **broken on `origin/main` today**:
   CORE-128 removed the `rmSync` import while converting its 10 teardowns to
   `removeTreeWithRetrySync`; SKILL-036 merged first with 15 *new* bare
   `rmSync(fixture, …)` calls. Reproduced in an isolated tree at `origin/main`
   content: **13 pass / 15 fail, every failure `ReferenceError: rmSync is not
   defined`**. All 20 bare calls (SKILL-036's 15 + this ticket's 5) are now
   `removeTreeWithRetrySync(fixture)`, per AGENTS.md §8 gotcha 20(a).
2. That import is `../packages/core/dist/index.js`, so this test file now needs
   a **built** core. `npm ci` (exit 0) and `npm run build:core` (exit 0) were run
   in the lane worktree rather than fabricating a pass. `verify:skills` alone
   still needs neither.

**Final three boxes closed.**

- [x] [pre-review] `npm run verify` exit **0** (full rail green, nothing to classify) and `npm run test:scripts` exit **0** (141/141).
- [x] [pre-review] `npm run plugin:check` and `auto-run-state.test.mjs` are **not** INCONCLUSIVE after all: with `npm ci` the worktree owns its `@kanmer/core` resolution, so `check-plugin-sync`'s guard was satisfied and it ran and passed; `auto-run-state.test.mjs` passed inside `test:scripts`.
- [x] Committed with the `Kanmer: SKILL-038` trailer (`1e128d7`, `8a909ee`), pushed `skill-038-blocked-dependents`, opened PR #304 with the `Kanmer: SKILL-038` footer.
- [x] Post-implementation report written; SKILL-038 moved Implementing → **Review**. Not reviewed, not merged, no threads resolved, no second ticket started.

The `[post-merge]` PR-check box stays for the reviewer/verifier: no red run was
produced here, so no flake-discharge evidence was needed.
