Focused `node --test scripts/release-notes.test.mjs` first run: exit 1 before assertions because isolated worktree lacked `packages/core/dist/index.js` (`ERR_MODULE_NOT_FOUND`). This is a clean-worktree build prerequisite, not a source/test failure; build Core then rerun unchanged.

Opened PR #246 at head `8a71a423c9dd3e210367af5a26357a6c52e6f364`; post-implementation report is written and DOC-022 moved to Review. Stop condition reached: independent review/merge only.
