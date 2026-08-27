## CORE-125 execution hand-off (2026-08-27)

- Worktree `.worktrees/core-125`, branch `core-125-serialise-ticket-writers`, head **437772d4**, base `origin/main` **f3060b06**.
- PR: https://github.com/collisionengineers/kanmer/pull/296 (body carries the `Kanmer: CORE-125` footer).
- Stage moved Implementing → Review after `get_doc_gates` reported `enter-review` passable. Ticket stays taken for traceability; the worktree is not cleaned up by the author.
- Reviewer focus: (a) the `AsyncLocalStorage` re-entrancy guard in `withLeaseLock` and the four nested call paths it protects; (b) `moveItem` deliberately leaving `computeOrder` outside the lock; (c) lock-duration cost, measured at 6.08 → 17.34 ms per `updateItem` on this host; (d) the plugin bundle rebuild (the bundle inlines `@kanmer/core`).
- Local `npm run verify` exits 1 only on the known `scripts/antigravity-plugin-config.test.mjs` EBUSY pair, which fails identically on the unmodified main checkout. Hosted `verify` at the PR head is authoritative.

## Review + merge (2026-08-27)

- Independent review by `claude-core125-independent-reviewer` (implementer was `claude-code-core125`): **verdict pass**, attestation `scratch/review.md` **version 1** (`attestation_version: 1`, doc version `d3357fef1f79e77f`), bound to head **437772d4**, plan_hash `c18d1eb2dfcc497f`, ticket_updated `2026-08-27T22:53:19.960Z`, board_sha `56ddbe6c504027db0ca9b8b7235dd36d1a466ea0`.
- Required checks at 437772d4 (run 33124151447, conclusion success): `verify` SUCCESS, `kanmer-gate` SUCCESS (green after the board tip landed; the earlier WRONG_STAGE is F-005), `regate` skipped/not required.
- Two Codex review threads (`PRRT_kwDOT2PEds6dATwL` → F-001, `PRRT_kwDOT2PEds6dATwP` → F-002) each replied to with their finding id and disposition, then resolved. No blocker or major finding; five findings recorded (F-001/F-002/F-003 minor accepted-risk, F-004 note accepted-risk, F-005 note fixed).
- Failing-first proof reproduced independently against the pre-change store (`git show f3060b06:packages/core/src/store.ts`): exit 1 with `expected 'A' to be 'edited during the renewal'` and `expected 1 to be 2`; store restored byte-identically.
- Reviewer rail in `.worktrees/core-125`: build 0, typecheck 0, `npm test -w @kanmer/core` 0 (19 files, 420 tests), smoke 306/306, smoke:protocol 50/50, plugin:check 0 (39 tools, bundle bytes match).
- **Merged**: PR #296 squash-merged at **c6bbddd617f6c8caef782f43014ccb3dd6a7fdfa** (2026-08-27T23:07:13Z), branch retained. Ticket moved Review → Verifying only; proof belongs to `kanmer-verify` at the merge SHA.
