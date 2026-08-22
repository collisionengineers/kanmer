# Research

Review thread 3836323269 at CORE-058 head `f0de2628` found that retry can return a different `boardRoot` than the open context, allowing store/watcher/sync to diverge across worktrees. Retry must be bound to the open root or rebuild the full context.
