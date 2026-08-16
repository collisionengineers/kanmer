# Checklist — MCP-007

Derived from plan.md, one box per step.

- [x] Worktree `.worktrees/mcp-007` on branch `mcp-007-worktree-guard` off `origin/main`; re-read `scripts/check-plugin-sync.mjs` as it now stands (post-SKILL-018)
- [x] Add `refuse(why, fix)` to `check-plugin-sync.mjs`, matching `release.mjs:41-45` in shape
- [x] Add `isLinkedWorktree(root)`: `--git-dir` vs `--git-common-dir` with `{ cwd: root }`, both `resolve`d; `statSync(root/.git).isFile()` fallback on throw; `false` if that throws too
- [x] Call the guard immediately after `root`, before the existing `existsSync` loop; refusal names cause and fix; NO env-var bypass
- [x] Extend the file's existing header comment block to record the precondition (do not start a rival block)
- [x] `AGENTS.md` §8 gotcha 8 shrunk to ~2 lines pointing at the guard (Q3)
- [x] `AGENTS.md` §6 `plugin:check` row and §10 item 6 note the root requirement
- [x] `FRD-022` R6 gains the additive clause about the worktree precondition
- [x] Confirm `git diff AGENTS.md` contains only the §6/§8/§10 edits — no stale v2 managed block
- [x] Confirm `plugins/kanmer/mcp/kanmer-mcp.cjs` shows NO DIFF
- [x] Verification run: guard REFUSES in the worktree and PASSES at the root, with `git rev-parse` output for both, plus `npm test` / `npm run typecheck` / `npm run plugin:check` (this box produces proof.md)
- [x] `post-implementation-report`, PR opened

## Progress notes

**Guard proved in both directions before commit.** In `.worktrees/mcp-007`,
`git rev-parse --git-dir` → `…/.git/worktrees/mcp-007` and `--git-common-dir` →
`…/.git`; the script exits 1 naming cause and fix. In the main checkout both
answer `.git` and the script exits 0 with the full SKILL-018 success line
(`29 tools match, bundle bytes match, 12 skill frontmatters parse`). The pass
side was run by temporarily staging the guarded script into the main checkout
and restoring it byte-for-byte afterwards (`git status` clean) — a worktree
cannot demonstrate the passing branch of a worktree guard, and there is no CI to
do it instead.

**`git`-off-PATH fallback exercised**, not just written:
`env PATH=/nonexistent node scripts/check-plugin-sync.mjs` in the worktree still
refuses, and `statSync(".git").isFile()` is `false` at the root / `true` in the
worktree, so the fallback agrees with the primary signal in both directions.

**Rail green from the worktree.** `npm test` 21 files / 217 tests passed —
including `kanmerGit.test.ts`, which the brief flagged as an intermittent
timeout under concurrent load; it took 29.8s of real git but did not flake this
run. `npm run typecheck` clean across all four workspaces (core, mcp-server, ui,
gui). `npm run plugin:check` refuses in the worktree **by design** — the
meaningful run is the root one above.

**Observation, not acted on:** the main checkout carries an *uncommitted*
`package.json` adding `test:scripts` → `node --test "scripts/*.test.mjs"`.
That is another agent's in-flight work, absent from `origin/main`, and no
`scripts/*.test.mjs` exists on this branch. Left alone to avoid a collision; if
that convention lands, this guard is a good first candidate for a unit test and
would be a clean follow-up.

**Bundle untouched:** `git diff --stat` is `AGENTS.md`, `FRD-022`,
`check-plugin-sync.mjs` — `plugins/kanmer/mcp/kanmer-mcp.cjs` is absent, as
required. `git diff AGENTS.md` contains only the §6, §8 and §10 hunks; the
managed `kanmer:instructions` block (lines 1-20) is untouched, so the stale-v2
Connect hazard did not bite.

---

## Closeout — MCP-007

- [ ] PR merge verified (`gh pr view --json state,mergedAt`)
- [ ] proof.md finalised (PR URL + merge date appended)
- [ ] Moved to final stage
- [ ] Outcome recorded in ticket body (PR link, follow-ups)
- [ ] cd out of worktree; `git worktree remove .worktrees/mcp-007`
- [ ] `git branch -D mcp-007-worktree-guard` (squash-merged)
- [ ] `git fetch --prune` + `git worktree prune`
- [ ] `take_ticket action: "release"`

### Closeout done — 2026-08-16

- [x] PR merge verified — `#48` MERGED 2026-08-16T23:24:28Z, squash `bc8cde1`
- [x] proof.md finalised — PR URL and merge date appended
- [x] Moved to final stage — Done at 23:29:20Z
- [x] Outcome recorded in ticket body — PR link, the three ways the shipped work
      differs from the ticket as written, and the unfiled follow-up
- [x] `git worktree remove .worktrees/mcp-007` (tree was clean)
- [x] `git branch -d mcp-007-worktree-guard` — succeeded; git warned it was
      merged to the remote-tracking ref but not to HEAD, which is the expected
      shape after a squash-merge. `-D` was not needed.
- [x] `git push origin --delete mcp-007-worktree-guard` — the host does not
      auto-delete; remote branch removed
- [x] `git fetch --prune` + `git worktree prune` — no `mcp-007` worktree or
      branch remains, local or remote
- [x] `take_ticket action: "release"` — ⛏ badge cleared

The temporary `.worktrees/mcp-007-verify` worktree cut during verification was
also removed.
