# Plan

1. Track the canonical board-root path once the existing worktree location is resolved.
2. Return `{ available: false, paused: true, boardRoot, error }` when rename succeeds but ignore reconciliation fails.
3. Add a deterministic real-Git regression that forces `.gitignore` reconciliation to fail after branch rename and proves the path/paused state.
4. Run focused GUI tests, typecheck, build, scripts, manual/docs checks, and diff validation.
