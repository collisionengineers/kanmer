# Checklist — GUI-129

- [ ] [pre-review] Run and record the focused baseline settings test in the dedicated worktree.
- [ ] [pre-review] Add the bounded Windows-only transient rename retry helper and wire `writeSettings` through it.
- [ ] [pre-review] Preserve the temporary-write then rename atomicity and final error propagation.
- [ ] [pre-review] Isolate the settings test fixture root and add deterministic recovery, retry-bound, non-retry, persistent-error, and success-cleanup coverage.
- [ ] [pre-review] Run the focused settings tests repeatedly and record every exit.
- [ ] [pre-review] Run GUI typecheck and the applicable root verification rail without weakening assertions.
- [ ] [pre-review] Write the post-implementation report, commit, push, and open a PR with `Kanmer: GUI-129`.
- [ ] [pre-review] Stop in Review for independent review; do not self-review or merge.
- [ ] [post-merge] On merged main, rerun the focused settings test and an applicable verification rail; record evidence in proof.

## Progress notes

- 2026-08-24 — Planning used the source at `origin/main` `9a75bd690a80bf070bb8ddc372b3a95fa03ec789`; no real Windows file lock was fabricated during research.
