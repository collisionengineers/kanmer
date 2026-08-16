## Review — MCP-007 / PR #48 — 2026-08-17

**I am both author and reviewer. This is not an independent review and should not
be read as one.** What follows is a self-check against the plan, the report, the
files document's ripple list and the operator's answers; a second pair of eyes
would still be worth having on the governing-doc edit called out below.

### Changes (reviewer's reading of the diff, not the author's summary)

Three files, +70/−5 against `origin/main` @ `efdc9f3`.

- **`scripts/check-plugin-sync.mjs`** — the whole of the behaviour change. A
  `refuse(why, fix)` copied in shape (not imported — `release.mjs`'s is a local
  function) from `release.mjs:41-45`, printing `plugin:check refused: <why>` and
  an indented `  fix:` line before `process.exit(1)`. An `isLinkedWorktree(dir)`
  that shells `git rev-parse --git-dir` and `--git-common-dir` with `cwd: dir`,
  `resolve`s both against `dir`, and compares; `catch` falls back to
  `statSync(dir/.git).isFile()`, and a second `catch` returns `false`. `stdio:
  ["ignore","pipe","ignore"]` keeps git's own stderr out of the output. The guard
  runs immediately after `root`, ahead of every existing assertion. The header
  comment block gains a paragraph; imports gain `execFileSync` and `statSync`,
  both core modules. Nothing else in the file moves — the tool-name check, the
  sha256 byte comparison and SKILL-018's `checkSkillFrontmatter` are untouched.
- **`AGENTS.md`** — three one-hunk edits: §6's `plugin:check` row, §8 gotcha 8's
  second paragraph (6 lines → 2), §10 item 6. The managed
  `kanmer:instructions` block (lines 1-20) is byte-identical.
- **`docs/functional/frd/FRD-022-mcp-server-surface.md`** — one clause appended
  to R6.

### Comments

1. **(blocking, fixed-in-PR) `execFileSync` inherits stderr.** The first commit
   would have printed git's `fatal: not a git repository` from any non-repo
   directory before the `statSync` fallback quietly handled it — noise that reads
   like the failure it isn't, in a script whose entire job this ticket is making
   legible. Fixed in `c6120b9` and **verified against the actual case**: a copy
   of the script run from a scratch non-git directory is silent, does not refuse,
   and falls through to the normal `Missing file:` error.
2. **(non-blocking, won't-do) No unit test.** `origin/main` gained
   `test:scripts` → `node --test "scripts/*.test.mjs"` via GUI-066 while this
   ticket was in flight, and `scripts/verify-release-assets.test.mjs` now
   establishes the convention — so the premise in `files.md` ("no test file
   covers `scripts/`") expired mid-ticket. `isLinkedWorktree` is a good candidate
   and would now have somewhere to live. Not done here: the operator specified a
   hand-run command log as this ticket's verification, the guard's two branches
   are proved in the log below including the fallback, and a test asserting "we
   are not in a worktree" is awkward to write from inside one. Recorded as a
   follow-up in the report rather than smuggled in.
3. **(non-blocking, won't-do) The fallback over-fires.** `statSync(.git).isFile()`
   is also true for submodules and `git clone --separate-git-dir`, so with `git`
   off PATH those would be refused too. Deliberate and documented in the JSDoc:
   over-refusing a check that names its own fix is the safe direction, and the
   primary signal handles both cases correctly whenever git is available.
4. **(non-blocking, disclosed) FRD-022 R6 was edited on the strength of the
   `files` document, not a separate operator authorization.** `files.md` asks for
   it explicitly and the edit is additive — it records a precondition on an
   existing requirement and removes nothing. R6 had *also* been extended on main
   by MCP-012 while this branch was open; the rebase conflict was resolved by
   keeping **both** clauses (main's R5b/R5c determinism sentence, then this
   ticket's worktree sentence), not by overwriting. Flagged rather than assumed:
   if the operator wants governing-doc edits gated on an explicit yes, this is
   the one to point at.
5. **(non-blocking, disposition: none needed) Scope discipline held.**
   `plugin:build` is untouched, per Q1's answer (c). No env-var hatch exists
   anywhere in the diff, per Q2 — `grep -i "KANMER_ALLOW\|process.env"` over the
   changed file returns nothing. The rejected `.worktrees/` path-segment test
   appears nowhere. No `scripts/lib/` was created; the parked
   helper-vs-duplication question is moot at one call site.

### Checks performed

- **Report against diff** — every file in the diff appears in the report's
  Changes table with a rationale that matches what the hunk does; nothing in the
  diff is unlisted, and nothing listed is absent. The report's headline claim
  (bundle unchanged) is independently true: `git diff origin/main --name-only`
  does not contain `plugins/kanmer/mcp/kanmer-mcp.cjs`.
- **Governing docs** — the plan's Governing-docs section claims R6 "modified,
  additively" and that is what the diff does. No new ADR was claimed and none is
  needed: the decision is a guard condition on an existing rail, and both
  questions that could have made it architectural were answered *no* by the
  operator. No other `ref` is linked.
- **`files.md` ripple list, item by item** — release rail: unaffected by
  inspection (`release.mjs` `run()` defaults `cwd = root`) *and* by the passing
  root run below; AGENTS block: `npm run verify:agents-block` 26/26; committed
  bundle: absent from the diff; no tests to update (see comment 2); human-facing
  docs: `docs/manual/troubleshooting.md` left alone — `plugin:check` is a
  maintainer command, not an end-user one, which is where `files.md` leaned.
- **Code** — the two failure directions are the right way round (refuse on
  worktree, proceed otherwise), the guard cannot be reached after a partial
  result has been printed, and `resolve()`-before-compare is present on both
  sides, which is the specific trap the research flagged.

### Verification log

Guard **refusing** — in `.worktrees/mcp-007`:

```
$ git rev-parse --git-dir
C:/Users/PC/Documents/GitHub/kanmer/.git/worktrees/mcp-007
$ git rev-parse --git-common-dir
C:/Users/PC/Documents/GitHub/kanmer/.git
$ node scripts/check-plugin-sync.mjs
plugin:check refused: this is a linked git worktree (C:\Users\PC\Documents\GitHub\kanmer\.worktrees\mcp-007), where the bundle check cannot mean anything — a worktree has no node_modules of its own, so @kanmer/core resolves up to the main checkout and the committed bundle and the fresh build are produced the same wrong way, agree, and pass
  fix: run `npm run plugin:check` from the main checkout instead (the repo root that owns node_modules); if the committed bundle needs refreshing, `npm run plugin:build` there too
exit=1
```

Guard **passing** — main checkout @ `efdc9f3`, guarded script staged in and
restored byte-for-byte afterwards (`git status` clean), after `npm run build`:

```
$ git rev-parse --git-dir ; git rev-parse --git-common-dir
.git
.git
$ node scripts/check-plugin-sync.mjs
plugin-sync OK — 29 tools match, bundle bytes match, 12 skill frontmatters parse
exit=0
```

Fallback, exercised: `env PATH=/nonexistent node scripts/check-plugin-sync.mjs`
in the worktree still refuses; `statSync(".git").isFile()` is `false` at the root
and `true` in the worktree. Non-git directory: silent, no refusal, falls through
to `Missing file:`.

Rail on the rebased branch: `npm test` → core 9 files/193 tests, gui 21
files/232 tests, `test:scripts` green. `npm run typecheck` → all four workspaces
clean. `npm run verify:agents-block` → 26/26.

**Noted, not attributed to this change:** on an earlier run `kanmerGit.test.ts`
failed one case with `Test timed out in 5000ms` under concurrent agent load.
Rerun alone with `--testTimeout=30000`: 7/7 pass in 29.9s. It also passed twice in
full-suite runs. Known flake; this ticket touches no GUI code.

**Also noted:** the main checkout moved from `c81063e` to `efdc9f3` mid-ticket
and its `dist/` went stale, which made `plugin:check` fail the byte comparison at
the root for reasons unrelated to this change. `npm run build` at the root
resolved it — recorded because it is exactly the contended-checkout hazard, and
because a reader of this log should not mistake that intermediate failure for the
guard misfiring. The guard passed in that run too; it was the sha256 step that
failed, downstream of it.

### Verdict

**PASS**, with the author-is-reviewer caveat above and comment 4 flagged for the
operator's attention. Merging and moving to Verifying under standing delegation.
