Verified on merged main `9ac20af` in `.worktrees/gui-080` detached at `origin/main` (the main checkout has another agent's uncommitted `AGENTS.md` change and untracked `.agents/`, `.codex/`, so it was left alone rather than pulled).

Rail on merged main: `npm test` core 193 + gui 230; `npm run typecheck` all four workspaces; `npm run verify:agents-block` 26/26. Counts are higher than the branch run (182/218) because main has since taken #38 and #39.

Demonstrations were run as a throwaway spec inside the worktree and removed afterwards — the worktree is clean. Their output is pasted verbatim into `proof`.

Read-only observation worth keeping: the main checkout's untracked `.agents/skills/.kanmer-skills-version` contains a bare `0.1.0` — a real, live, pre-roster install. Not modified. It is the exact input Evidence A reconstructs.
