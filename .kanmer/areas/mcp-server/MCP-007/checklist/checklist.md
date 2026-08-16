# Checklist — MCP-007

Derived from plan.md, one box per step.

- [ ] Worktree `.worktrees/mcp-007` on branch `mcp-007-worktree-guard` off `origin/main`; re-read `scripts/check-plugin-sync.mjs` as it now stands (post-SKILL-018)
- [ ] Add `refuse(why, fix)` to `check-plugin-sync.mjs`, matching `release.mjs:41-45` in shape
- [ ] Add `isLinkedWorktree(root)`: `--git-dir` vs `--git-common-dir` with `{ cwd: root }`, both `resolve`d; `statSync(root/.git).isFile()` fallback on throw; `false` if that throws too
- [ ] Call the guard immediately after `root`, before the existing `existsSync` loop; refusal names cause and fix; NO env-var bypass
- [ ] Extend the file's existing header comment block to record the precondition (do not start a rival block)
- [ ] `AGENTS.md` §8 gotcha 8 shrunk to ~2 lines pointing at the guard (Q3)
- [ ] `AGENTS.md` §6 `plugin:check` row and §10 item 6 note the root requirement
- [ ] `FRD-022` R6 gains the additive clause about the worktree precondition
- [ ] Confirm `git diff AGENTS.md` contains only the §6/§8/§10 edits — no stale v2 managed block
- [ ] Confirm `plugins/kanmer/mcp/kanmer-mcp.cjs` shows NO DIFF
- [ ] Verification run: guard REFUSES in the worktree and PASSES at the root, with `git rev-parse` output for both, plus `npm test` / `npm run typecheck` / `npm run plugin:check` (this box produces proof.md)
- [ ] `post-implementation-report`, PR opened

## Progress notes
