## CORE-125 execution hand-off (2026-08-27)

- Worktree `.worktrees/core-125`, branch `core-125-serialise-ticket-writers`, head **437772d4**, base `origin/main` **f3060b06**.
- PR: https://github.com/collisionengineers/kanmer/pull/296 (body carries the `Kanmer: CORE-125` footer).
- Stage moved Implementing → Review after `get_doc_gates` reported `enter-review` passable. Ticket stays taken for traceability; the worktree is not cleaned up by the author.
- Reviewer focus: (a) the `AsyncLocalStorage` re-entrancy guard in `withLeaseLock` and the four nested call paths it protects; (b) `moveItem` deliberately leaving `computeOrder` outside the lock; (c) lock-duration cost, measured at 6.08 → 17.34 ms per `updateItem` on this host; (d) the plugin bundle rebuild (the bundle inlines `@kanmer/core`).
- Local `npm run verify` exits 1 only on the known `scripts/antigravity-plugin-config.test.mjs` EBUSY pair, which fails identically on the unmodified main checkout. Hosted `verify` at the PR head is authoritative.
