# Plan

1. Trace `applyGitPreferences` mismatch/refusal ordering and identify the smallest guard that prevents any rename when `branchMismatch` is true.
2. Add an integration regression using a real temporary worktree/ref that proves the unexpected branch and refs remain unchanged while the setting stays on the current preference and mismatch is surfaced.
3. Run focused GUI tests, manual/docs checks, typecheck/build as feasible, and refresh CORE-052 lineage after merge.
4. Preserve live GitHub protection evidence as INCONCLUSIVE.
