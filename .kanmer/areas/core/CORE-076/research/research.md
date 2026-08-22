# Research — CORE-076

CORE-072 review found that orphan migration can commit and push the board before source cleanup fails. On a later retry, `resumeOrphanMigration` returns early because the board already has `HEAD`, leaving the source `.kanmer/` tree as a stale second board.

The bounded fix is to separate board finalization from source cleanup: detect an orphan board with copied state, commit/push it only when it has no head, and retry cleanup whenever the source board remains. Cleanup must remain idempotent and must surface errors rather than claiming migration complete. Existing append-only ignore reconciliation and symlink refusal stay unchanged.
