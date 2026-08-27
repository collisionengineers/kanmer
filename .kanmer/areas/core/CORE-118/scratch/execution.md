## Execution start — 2026-08-27

- Worktree `.worktrees/core-118`, branch `core-118-step-packets`, assignee `claude-code-core118`.
- **Base moved during setup:** `git fetch origin` brought `origin/main` from
  f3060b06 to **c6bbddd6** (CORE-125 "serialise every ticket writer against the
  lease lock", PR #296). The branch is cut from c6bbddd6, so the CORE-125
  `store.ts` overlap the lane brief warned about is already merged and no longer
  a concurrent risk. This ticket still makes no `store.ts` change.
- Packet was `ready: true`, `taken: null` → fresh lane.
