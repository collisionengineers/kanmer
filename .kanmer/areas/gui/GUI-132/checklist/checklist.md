# Checklist — GUI-132

- [x] Create and validate `.worktrees/gui-132` on branch `gui-132-codex-probe-quoting` from current `origin/main`.
- [x] Add a real Windows Node → cmd.exe → batch launcher regression.
- [x] Preserve the initial failing output from the unmodified production invocation.
- [x] Correct the probe-only Windows invocation without changing the portable registration contract.
- [x] Assert the displayed fallback command is executable.
- [x] Retain failure-before-config-mutation coverage.
- [x] Run focused GUI tests with exit code 0.
- [x] Run GUI typecheck with exit code 0.
- [x] Run the full GUI suite with exit code 0.
- [x] Run `git diff --check` and inspect the scoped diff.
- [x] Commit and push the bounded change.
- [x] Open a PR containing `Kanmer: GUI-132`.
- [x] Write and read back the post-implementation report.
- [x] Move GUI-132 only from Implementing to Review and stop for independent review.
