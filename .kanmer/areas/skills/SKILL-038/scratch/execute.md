## Rebase onto CORE-128 (deviation, controller-directed)

Branched from `70d23efd` per the packet. Mid-implementation the controller
reported CORE-128 merged as `d523a293`. Rebased cleanly (no conflicts):

- `git -C .worktrees/skill-038 fetch origin` → exit 0
- `git -C .worktrees/skill-038 rebase origin/main` → exit 0, "Successfully rebased"

**Finding surfaced by the rebase.** CORE-128 removed the `rmSync` import from
`scripts/verify-skill-prose.test.mjs` while converting its 10 teardowns to
`removeTreeWithRetrySync`. SKILL-036 merged first and added 15 *new* bare
`rmSync(fixture, …)` calls. On `origin/main` at `d523a293` those 15 calls
therefore reference an **unimported identifier**: all 15 goal-contract tests
throw `ReferenceError: rmSync is not defined` in their `finally` blocks. This
is not merely "unprotected against Windows contention" — the file is broken on
main today.

Converted all 20 bare calls (SKILL-036's 15 + my 5 new ones) to
`removeTreeWithRetrySync(fixture)`, per AGENTS.md §8 gotcha 20(a). Mechanical,
one regex, no behaviour change.

**Consequence for the environment note in the plan.** CORE-128's import is
`../packages/core/dist/index.js`, so this file now requires a *built* core.
The plan's "no npm ci needed" holds for `verify:skills` but no longer for
`node --test scripts/verify-skill-prose.test.mjs`. `npm ci` + `npm run
build:core` run in the lane worktree rather than fabricating a pass.

## Anti-absorption sweep (9 mutations, run against the lane worktree)

Each mutation deletes exactly one added or repaired clause and records the
**complete** FAIL set, not just the expected one. 9/9 produced exactly one FAIL:

| Mutation | FAIL count | The check that failed |
|---|---|---|
| N-1 preflight board-worktree bullet deleted | 1 | `kanmer-auto preflights identity, delivery target and board health` |
| `blocked` flag board-wide clause deleted | 1 | `kanmer-auto judges a blocked flag against the frozen roster, not the whole board` |
| in-roster retain bullet deleted | 1 | `kanmer-auto keeps a dependent whose every live blocker is inside the roster` |
| out-of-roster exclude bullet deleted | 1 | `kanmer-auto excludes only a dependent blocked from outside the roster, with its reason` |
| transient budget heading deleted | 1 | `kanmer-auto bounds transient re-runs with a number and blocks with the exact refusal` |
| transient budget **number** removed | 1 | same |
| transient refusal text paraphrased | 1 | same |
| `transient_retry_limit:` renamed in template | 1 | `run-state template records transient_retry_limit:` |
| `\| Transient \|` renamed in template ledger | 1 | `run-state ledger counts transient re-runs per ticket` |

N-1 specifically: the bullet deletion leaves
`kanmer-auto pushes the board before it trusts a gate result` **PASSing**, which
is the point — the two clauses both mention `get_status.boardWorktree` and the
old anchor could not tell them apart.

The four new forbidden-claim phrasings were each checked against the new
positive prose: all four report "no match", so the negative rule cannot be
satisfied by the fix it protects.

## Hand-off

- PR: https://github.com/collisionengineers/kanmer/pull/304
- Head SHA: `8a909ee97d95a0c50e5102c3c7f88d4c575614ba`
- Base: `main` (`d523a293`), branch `skill-038-blocked-dependents`,
  worktree `.worktrees/skill-038`
- `mergeStateStatus: BLOCKED` — `required_conversation_resolution: true` on
  `main`, the reviewer's obligation, not a defect in the work.
- Ticket moved Implementing → Review. Author does not review, resolve threads or
  merge.

### Commands and exit codes (all from the lane worktree, absolute paths)

| Command | Exit | Result |
|---|---|---|
| `git worktree add … -b skill-038-blocked-dependents 70d23efd` | 0 | HEAD `70d23efd` confirmed |
| `node scripts/verify-skill-prose.mjs` (baseline) | 0 | ALL CHECKS PASSED, check 19 = **31** |
| `node --test scripts/verify-skill-prose.test.mjs` (baseline) | 0 | 28 pass / 0 fail |
| `git fetch origin` | 0 | `70d23efd..d523a293` |
| `git rebase origin/main` | 0 | "Successfully rebased", no conflicts |
| `npm ci` | 0 | needed only because CORE-128's test imports built core |
| `npm run build:core` | 0 | `packages/core/dist/index.js` produced |
| `node scripts/verify-skill-prose.mjs` | 0 | ALL CHECKS PASSED, check 19 = **38** |
| `node --test scripts/verify-skill-prose.test.mjs` | 0 | **33 pass / 0 fail** |
| anti-absorption sweep (9 mutations) | 1 each | exactly one FAIL each, its own named check |
| `npm run test:scripts` | 0 | 141 pass / 0 fail |
| `npm run verify` | **0** | full rail green end to end |
| `npm run plugin:check` (inside verify) | 0 | `plugin-sync OK — 40 tools match, bundle bytes match, 12 skill frontmatters parse` |
| `git push -u origin skill-038-blocked-dependents` | 0 | new branch |
| `gh pr create` | 0 | PR #304 |

Inside `npm test`: core **562 passed**, gui **524 passed** (54 files),
mcp-server http **144 passed**, scripts **141 passed**, 0 failed.

**Nothing is INCONCLUSIVE.** The plan predicted `plugin:check` and
`auto-run-state.test.mjs` would be INCONCLUSIVE from a worktree; after `npm ci`
the worktree owns its own `@kanmer/core` resolution, so `check-plugin-sync`'s
guard was satisfied and it genuinely ran and passed. `auto-run-state.test.mjs`
ran inside `test:scripts` and passed. No red run was recorded, so no
flake-discharge argument was needed.

`## 4. Mandatory stop predicates`: 1877 bytes, sha256
`03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38` — re-verified
after the rebase and after the final reflow. `## 1.`–`## 11.` byte-identical.
`git diff --name-only origin/main` lists exactly four files, none under
`packages/`.
