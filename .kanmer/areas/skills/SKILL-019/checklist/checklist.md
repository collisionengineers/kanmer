# Checklist — SKILL-019

- [x] Change OpenCode copySkills destination to .opencode/skills.
- [x] Add .opencode/skills to staleness and gitignore without removing .agents/skills.
- [x] Update provider, disconnect, and staleness tests for independent destinations.
- [x] Correct FRD-012 and ADR-0009 without changing the deferred Antigravity design; AGENTS.md contained no provider-directory claim to change.
- [x] Run focused and full verification rails.
- [x] Commit, push, open the PR, and record the implementation report.

## Progress notes

- Focused: GUI provider/connect 84 tests passed; core staleness 39 tests passed.
- Full: npm test passed (249 core, 277 GUI, 46 script tests); npm run typecheck passed all workspaces.
- Additional: npm run build, npm run verify:skills, and npm run verify:agents-block passed.
- Commits: `3e0a530`, `cc0974c`; merge: `db7ed679`. PR: #63.

## Closeout — SKILL-019

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (PR URL + merge date appended)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; `git worktree remove .worktrees/skill-019`
- [x] `git branch -d skill-019-opencode-skills-dir` (`-D` if squash/rebase-merged)
- [x] `git fetch --prune` + `git worktree prune`
- [x] `take_ticket action: "release"`
