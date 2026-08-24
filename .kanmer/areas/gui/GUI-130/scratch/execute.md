## 2026-08-24 — authoritative verification setup failure (preserved)

Command: `npm --prefix C:\Users\Alex\AppData\Local\Temp\kanmer-gui130-verify-de89208ed20e45328e86eb355aa78938 run verify`

Exit: 1.

The normal clone was created directly from the local GUI-130 worktree, so its `origin` remote was the local path `C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\gui-130`. The release-notes script derives the repository URL from `origin`, and `scripts/release-notes.test.mjs` therefore emitted `([PR](C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\gui-130/pull/96))` instead of the expected GitHub URL.

Before that failure, the full GUI package passed 49 files / 462 tests (214.76s), including `index.sync.test.ts` 11/11 (28.83s). The failure is retained as an invalid local-origin verification setup, not relabelled as a pass and not attributed to the GUI-130 source diff. A fresh GitHub-origin normal clone at the same commit will be used for the decisive rerun.
