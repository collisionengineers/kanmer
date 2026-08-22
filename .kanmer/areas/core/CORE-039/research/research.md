# CORE-039 research

The hosted verify failure is distinct from the Windows glob failure fixed by CORE-038. The test invokes release-notes.mjs with only --since v0.3.2. The script discovers the board at .worktrees/kanmer relative to the checkout, but a clean CI checkout has no board worktree, so it exits before producing PR links. The test should provide an isolated fixture or explicit supported input without changing production failure semantics.
