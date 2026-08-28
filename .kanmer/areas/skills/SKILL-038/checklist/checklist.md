# Checklist — SKILL-038

*One independently tickable box per ordered plan step or acceptance check.*

- [ ] Create `.worktrees/skill-038` on branch `skill-038` from `70d23efd`; confirm `git -C <worktree> rev-parse HEAD` == `70d23efd`.
- [ ] Record the baseline: `verify:skills` exit 0, check-19 assertion count (31), `node --test scripts/verify-skill-prose.test.mjs` pass count (28), and `## 4.`'s sha256 + byte count.
- [ ] Rewrite `kanmer-auto/SKILL.md` §1 step 2: drop only archived tickets and captures; state that `blocked: true` is a board fact; resolve blockers via `get_links.blockedBy` judging liveness from each blocker's own item.
- [ ] Add the in-roster bullet: every live blocker inside the roster being frozen ⇒ keep the dependent as queued work, ordered by §2 into one serial lane behind its blockers.
- [ ] Add the out-of-roster bullet: any live blocker outside the roster ⇒ exclude, reporting the blocking ids and where they sit.
- [ ] Add `### The transient retry budget` to §3 with `transient_retry_limit` (default 2), the `Transient` ledger counter, and the verbatim refusal quoted in the skill.
- [ ] Add `transient_retry_limit: 2`, the Run-invariant line, and the `Transient` ledger column to `run-state-template.md`, keeping `| Replan |` and all 11 pinned frontmatter fields.
- [ ] [pre-review] Confirm `## 4. Mandatory stop predicates` is still 1877 bytes / sha256 `03796a0e…` and `## 1.`–`## 11.` are byte-identical to `70d23efd`.
- [ ] Repair check 19's board-health regex (N-1) so it pins the `- **Board worktree.**` preflight bullet and nothing the push-the-board section satisfies.
- [ ] Add the four new `goalContract` entries (board-wide flag, in-roster retain, out-of-roster exclude, transient budget).
- [ ] Add `transient_retry_limit:` to the run-state field loop and the `| Transient |` ledger assertion; add the `roster that drops every blocked ticket board-wide` forbidden-claim entry with all four phrasings.
- [ ] [pre-review] `node scripts/verify-skill-prose.mjs` exits 0 and check 19 prints 38 assertion lines.
- [ ] Add the five mutation fixtures to `verify-skill-prose.test.mjs` using the existing `goalFixture`/`edit`/`expectFail`/`expectPass` helpers.
- [ ] [pre-review] `node --test scripts/verify-skill-prose.test.mjs` reports 33 passing, 0 failing, with no pre-existing test modified or weakened.
- [ ] [pre-review] Anti-absorption sweep: delete each added/repaired clause in turn and record that the FAIL set is exactly its own named check.
- [ ] [pre-review] Confirm the new forbidden-claim regexes do not match the new positive prose.
- [ ] [pre-review] `git diff --name-only 70d23efd` lists exactly the four expected files and no `packages/` path.
- [ ] [pre-review] Run `npm run verify` and `npm run test:scripts`; record exact exit codes and classify each failure (in scope / known out-of-scope antigravity `EBUSY` / INCONCLUSIVE).
- [ ] [pre-review] Record `npm run plugin:check` and `auto-run-state.test.mjs` as INCONCLUSIVE with the reason, never as a pass.
- [ ] Commit with the `Kanmer: SKILL-038` trailer, push `skill-038`, open the PR with a `Kanmer: SKILL-038` footer.
- [ ] [post-merge] Re-check PR checks at the head SHA; discharge any Windows-timing red with a same-SHA re-run, a diff-untouched confirmation and a mechanism argument, retaining the first failure.
- [ ] Write the post-implementation report and move SKILL-038 to Review. Do not review, resolve threads, merge, or start another ticket.

## Progress notes
