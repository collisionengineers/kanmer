# Checklist — GUI-132

- [ ] Create and validate `.worktrees/gui-132` on branch `gui-132-codex-probe-quoting` from current `origin/main`.
- [ ] Add a real Windows Node → cmd.exe → batch launcher regression.
- [ ] Preserve the initial failing output from the unmodified production invocation.
- [ ] Correct the probe-only Windows invocation without changing the portable registration contract.
- [ ] Assert the displayed fallback command is executable.
- [ ] Retain failure-before-config-mutation coverage.
- [ ] Run focused GUI tests with exit code 0.
- [ ] Run GUI typecheck with exit code 0.
- [ ] Run the full GUI suite with exit code 0.
- [ ] Run `git diff --check` and inspect the scoped diff.
- [ ] Commit and push the bounded change.
- [ ] Open a PR containing `Kanmer: GUI-132`.
- [ ] Write and read back the post-implementation report.
- [ ] Move GUI-132 only from Implementing to Review and stop for independent review.
