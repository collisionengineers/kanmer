# Plan — MCP-007: Make `plugin:check` refuse to validate a bundle built inside a worktree

Written FROM `files.md` and the evidence log in `scratch/notes.md`, and around
the operator's answers recorded in `scratch/operator-answers.md`.

## Approach

Add a single guard at the top of `scripts/check-plugin-sync.mjs` — before any
existing assertion — that refuses when the tree the script belongs to is a
**linked git worktree**, using the house `refuse(why, fix)` idiom from
`release.mjs:41-45`. `plugin:build` stays unguarded: the operator chose option
(c) in Q1, so the artifact can still be *produced* wrong but can no longer be
*validated* wrong, and validation is the failure that actually shipped
(SKILL-011). That choice also fixes the signal: the guard keys on "is this a
worktree", **not** on "is `node_modules` missing" — the latter was only the right
question under option (b), which was rejected. The signal is
`git rev-parse --git-dir` !== `git rev-parse --git-common-dir`, run with
`cwd = root` and both sides `path.resolve`d against `root` (git returns one
relative and one absolute across the two cases, so a naive string compare is
accidentally right at the root and wrong elsewhere), falling back to
`statSync(root/.git).isFile()` when the `git` spawn throws. The `.worktrees/`
path-segment test the ticket body proposed stays rejected — it only recognises
worktrees this repo's own naming convention created. **No escape hatch** (Q2):
no env var, now or later; an unforeseen legitimate case means editing the script
and justifying it in review, because an env var is exactly how a future agent
makes the refusal go away at 2am instead of fixing the cause.

Because the guard lands in **one** script, the parked "shared helper vs.
duplication" question does not arise: no `scripts/lib/` is created, and
`scripts/` stays flat and dependency-free per the `release.mjs` header policy.
The guard uses `node:child_process` + `node:fs` only.

Alternatives beaten: *warn instead of refuse* — rejected by the ticket's own
argument, a passing check that cannot be true is worse than no check; *guard
`plugin:build` too* — rejected by the operator, it would close the only way a
ticket branch can refresh its bundle and would need the hatch Q2 forbids;
*assert the bundle's embedded `../../node_modules` comment depth* — parked, it
answers "was this built wrong", not "am I able to judge it", and is tsup-format
dependent.

## Governing docs

`refs`: `docs/functional/frd/FRD-022-mcp-server-surface.md`.

- **R6 — Modifies (additive clarification).** R6 currently states the release
  rail as "`tool-reference.md` rows must match tool names (`plugin:check`), the
  bundled `kanmer-mcp.cjs` must be byte-current (`plugin:build`)". The byte
  comparison is only meaningful when the artifact was produced where the check
  runs, and R6 does not say so. Step 4 adds one clause recording that
  `plugin:check` refuses in a linked worktree rather than reporting a pass it
  cannot support. This is the documentation touch `files.md` calls for
  ("Skipping it leaves the governing doc describing a rail the code no longer
  matches, which the review step checks for"); it strengthens an existing
  requirement and removes nothing. No other requirement changes; no new ADR — the
  design decision here is a guard condition on an existing rail, not a new
  architectural direction.
- Line 52's verification note ("R6 — the rail is real") is the sentence the guard
  makes true; it is a Phase 0.2 log entry and is left as written.
- No other `refs` are linked.

## Steps

1. **Worktree and branch.** `take_ticket MCP-007 branch:"mcp-007-worktree-guard"
   worktree:".worktrees/mcp-007"`, off `origin/main` (`c81063e`, which already
   carries SKILL-018's `checkSkillFrontmatter`). Read
   `scripts/check-plugin-sync.mjs` as it now stands, not from the line numbers in
   `files.md`.
2. **The guard**, in `scripts/check-plugin-sync.mjs`:
   - a local `refuse(why, fix)` matching `release.mjs:41-45` in shape, printing
     `plugin:check refused: <why>` then an indented `  fix: <fix>` and exiting 1;
   - `isLinkedWorktree(root)`: `execFileSync("git", ["rev-parse", "--git-dir"])`
     and `--git-common-dir` with `{ cwd: root }`, `resolve(root, …)` both, compare;
     on throw, fall back to `statSync(join(root, ".git")).isFile()`, and on a
     throw there too return `false` (a missing `.git` is not a worktree);
   - call it immediately after `root` is computed, before the `existsSync` loop.
     The refusal names the cause (a worktree has no `node_modules`, so
     `@kanmer/core` resolves up to the main checkout and both sides of the byte
     comparison are built the same wrong way) and the fix (run it from the repo
     root);
   - extend the file's existing header comment block rather than starting a rival
     one — its last clause already says the comparison "is only meaningful when
     the artifact was built where the check runs", which is this guard written
     down before it was enforced;
   - **no env-var bypass.**
3. **`AGENTS.md`**, three touchpoints, all outside the managed
   `kanmer:instructions` block (lines 1-20), so `verify:agents-block` is
   unaffected:
   - §8 gotcha 8 — shrink the second paragraph (currently ~6 lines narrating
     SKILL-011) to about two lines pointing at the guard (Q3, endorsed). A gotcha
     that narrates at length a trap the tooling now catches trains people to skim
     §8.
   - §6 command table, `plugin:check` row — note it refuses in a worktree.
   - §10 item 6 — a short parenthetical that the pair runs at the repo root.
4. **`FRD-022` R6** — the one additive clause described under Governing docs.
5. **Verification command log** (see below), then `post-implementation-report`
   and the PR.

**`plugins/kanmer/mcp/kanmer-mcp.cjs` must show NO DIFF.** This ticket changes no
server or core source, so the committed bundle's correct state is byte-identical
to what is on `origin/main`. If it appears in the diff, stop and find out why.

## Verification

There is no CI (`.github/workflows` does not exist) and no test covers
`scripts/`, so proof is a **hand-run command log** (`command-log`), not a suite.
A guard that has never been seen to refuse is not a guard, so the log must show
both directions:

- **Refusing** — `node scripts/check-plugin-sync.mjs` from inside
  `.worktrees/mcp-007`, exiting 1 with the cause and the fix. Captured verbatim,
  with the exit code.
- **Passing** — the same script from the main checkout, printing
  `plugin-sync OK — 29 tools match, bundle bytes match, 12 skill frontmatters
  parse` (after `npm run build`, which the byte check requires), exit 0.
- **The signal itself** — `git rev-parse --git-dir` / `--git-common-dir` in both
  roots, so the log shows *why* the guard decided what it decided rather than
  only that it did.
- **`git diff --stat`** showing `plugins/kanmer/mcp/kanmer-mcp.cjs` absent.
- **Rail** — `npm test`, `npm run typecheck`, `npm run plugin:check`.
- **Release rail unaffected** — `release.mjs` runs `plugin:check` via `run()`,
  which defaults `cwd = root`, so a root-derived guard is a no-op there. Stated
  from source rather than re-proved by a dry-run release, which bumps versions.

## Risks / open questions

- **Q1, Q2 answered by the operator** (`scratch/operator-answers.md`): guard
  `plugin:check` only; no escape hatch. Not reopened.
- **Q3 decided here**: shrink §8 gotcha 8 to ~2 lines pointing at the guard.
- **Risk: the guard misfires at the root.** Mitigated by `{ cwd: root }` plus
  `resolve()` on both sides, and proved by the passing half of the command log.
- **Risk: `git` off PATH.** Mitigated by the `statSync(root/.git).isFile()`
  fallback; a superset (also fires for submodules and `--separate-git-dir`),
  which is the safe direction for a refusal that has a documented fix.
- **Risk: a stale v2 `kanmer:instructions` block gets written into `AGENTS.md`
  by Connect** (live bug on this machine). Mitigated by inspecting
  `git diff AGENTS.md` before committing and keeping only the §6/§8/§10 edits.
- **Known flake, not a regression:** `apps/gui`'s `kanmerGit.test.ts` spawns real
  git and intermittently times out at vitest's 5s default under concurrent agent
  load. If hit, rerun that file alone with `--testTimeout=30000` and record the
  result rather than treating it as caused by this change.
