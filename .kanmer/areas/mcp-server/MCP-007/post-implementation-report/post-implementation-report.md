# Post-implementation report — MCP-007

## Summary

`scripts/check-plugin-sync.mjs` now refuses to run from a linked git worktree
instead of reporting a pass it cannot support. The byte comparison it performs
(committed `plugins/kanmer/mcp/kanmer-mcp.cjs` vs. a fresh
`packages/mcp-server/dist/standalone/kanmer-mcp.cjs`) is only meaningful where
the artifact was built: a worktree has no `node_modules` of its own, so
`@kanmer/core` resolves *up* to the main checkout's workspace symlink, tsup
bundles **main's** core, and both sides of the comparison are produced the same
wrong way — they agree, and the check prints OK. That is precisely how SKILL-011
(PR #31) merged a bundle that did not contain the feature it shipped. Scope is
`plugin:check` only, per the operator's answer to Q1: `plugin:build` stays
unguarded, so a ticket branch can still refresh its bundle. The artifact can
still be produced wrong; it can no longer be *validated* wrong, and validation is
the failure that actually shipped. Per Q2 there is **no escape hatch** — no env
var, now or later.

## Changes

| File | Change | Why |
|---|---|---|
| `scripts/check-plugin-sync.mjs` | modified (+69/−1) | Adds a local `refuse(why, fix)` matching `release.mjs:41-45` in shape (`plugin:check refused: <why>` + an indented `  fix:` line, exit 1), an `isLinkedWorktree(dir)` helper, and a guard call immediately after `root` is computed — before the existing `existsSync` loop, so nothing downstream can report a result first. Imports gain `execFileSync` from `node:child_process` and `statSync` from `node:fs`; both are core modules, so `scripts/` stays dependency-free per the `release.mjs` header policy. The file's existing header comment block is extended (not duplicated) — its last clause already said the comparison "is only meaningful when the artifact was built where the check runs", which is this guard written down before it was enforced. |
| `AGENTS.md` §6 command table, `plugin:check` row | modified (1 line) | The table is where an agent looks up what a command does; a command that can now refuse outright should say so there. |
| `AGENTS.md` §8 gotcha 8, second paragraph | modified (6 lines → 2) | Q3, operator-endorsed. The paragraph narrated the SKILL-011 failure at length and read as the *only* defence. A gotcha that describes at length a trap the tooling now catches trains people to skim §8 — which is the file agents read before debugging. It now names the trap, names the guard, and explicitly says `plugin:build` is still unguarded so nobody infers protection that does not exist. |
| `AGENTS.md` §10 item 6 | modified (1 sentence) | Item 6 is the "if the server changed" verification pair; it now says to run it from the main checkout, so the reader meets the constraint before the refusal does. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` R6 | modified (1 clause) | See Governing docs below. |

**`plugins/kanmer/mcp/kanmer-mcp.cjs` is deliberately NOT in this diff.** No
server or core source changed, so the committed bundle's correct state is
byte-identical to `origin/main`. `git diff --stat` confirms three files, and the
bundle is not among them.

## Governing docs

`refs`: `docs/functional/frd/FRD-022-mcp-server-surface.md`.

- **R6 — modified, additively.** R6 stated the release rail as "`tool-reference.md`
  rows must match tool names (`plugin:check`), the bundled `kanmer-mcp.cjs` must
  be byte-current (`plugin:build`)", with no statement of when the byte check is
  capable of meaning anything. It now records the precondition and the refusal,
  and notes that `release.mjs` runs the check from the repo root so the rail is
  unaffected. This is the touch the ticket's `files.md` calls for — "skipping it
  leaves the governing doc describing a rail the code no longer matches, which
  the review step checks for". It strengthens an existing requirement and removes
  nothing. **A reviewer should confirm they are content with a governing-doc edit
  made on the strength of the files document rather than a separate operator
  authorization**; it is additive documentation of what shipped, not a change of
  direction.
- R6's Phase 0.2 verification note ("the rail is real") is a dated log entry and
  is left as written.
- **No new ADR.** The decision here is a guard condition on an existing rail, not
  a new architectural direction, and the two questions that could have made it
  one (guard `plugin:build` too? add an escape hatch?) were both answered *no* by
  the operator.

## Risks / follow-ups

- **False positive at the root would break the release gate.** Mitigated by
  querying with `cwd: root` (so the answer describes the tree the script belongs
  to, not the shell's cwd) and `resolve()`ing both sides before comparing (git
  answers `.git` relatively at the root and absolutely in a worktree, so a raw
  string compare is accidentally right at the root and wrong elsewhere).
  **Proved, not argued** — the pass side of the command log is a real run.
- **`git` off PATH.** Falls back to `statSync(root/.git).isFile()`, a superset
  that also fires for submodules and `git clone --separate-git-dir`. That is the
  safe direction for a refusal whose message names its own fix. Exercised with
  `env PATH=/nonexistent`.
- **Non-`.worktrees/` layouts.** The git-native signal catches any linked
  worktree, wherever it lives — deliberately, since a worktree made by hand
  elsewhere is the same defect.
- **`plugin:build` remains unguarded, by design.** A wrong bundle can still be
  produced in a worktree; it just cannot be certified. Anyone wanting that closed
  is reopening Q1 with the operator, not adding it quietly.
- **Follow-up candidate (not filed):** the main checkout carries an *uncommitted*
  `package.json` adding `test:scripts` → `node --test "scripts/*.test.mjs"` —
  another agent's in-flight work, absent from `origin/main`. If that convention
  lands, `isLinkedWorktree` is a good first unit test. Not done here: no such
  script or test file exists on this branch, and inventing the convention from a
  worktree would collide with whoever is landing it.
- **Parked, unchanged:** asserting the bundle's embedded `../../node_modules`
  path-comment depth (answers "was this built wrong", not "am I able to judge
  it"), and making worktrees build correctly at all.

## Verification hand-off

There is no CI (`.github/workflows` does not exist) and no test covers
`scripts/` on `origin/main`, so this is a command log, and a guard that has never
been seen to refuse is not a guard. On merged `main`, from the **main checkout**:

1. `git rev-parse --git-dir` and `git rev-parse --git-common-dir` — both `.git`.
2. `npm run plugin:check` — exit 0, prints
   `plugin-sync OK — 29 tools match, bundle bytes match, 12 skill frontmatters parse`.
   (Needs a prior `npm run build` if `packages/mcp-server/dist/standalone/` is
   cold.) **This is the load-bearing check**: it proves the guard did not break
   the rail it is part of, which is also the ticket's fourth verification bullet.
3. From any linked worktree of the merged repo — e.g.
   `git worktree add .worktrees/mcp-007-verify origin/main` — run
   `node scripts/check-plugin-sync.mjs`: exit 1, `plugin:check refused: …` naming
   the worktree path and the fix.
4. `git show --stat HEAD` on the merge — confirm
   `plugins/kanmer/mcp/kanmer-mcp.cjs` is absent.
5. `npm test` and `npm run typecheck`.

No UI change, so no screenshots. `apps/gui`'s `kanmerGit.test.ts` spawns real git
and can time out at vitest's 5s default under concurrent agent load; it passed
here (29.8s total for 7 tests) but if it flakes on verify, rerun that file alone
with `--testTimeout=30000` rather than attributing it to this change — this
ticket touches no GUI code.
