# Checklist

- [x] mode table replaced by the six-step reconcile loop — statically re-read in current main; verify:skills exit 0.
- [x] format 3 handled by the format-independent reconcile loop rather than a version-specific mode — static source check; live format migration remains INCONCLUSIVE.
- [x] version steps named as the reason to re-run — static source check.
- [x] migrate_board dry-run-then-apply, safe to call unconditionally — static source check; no disposable legacy-board run was authorized.
- [x] AGENTS block refresh via the script, hand-edit fallback retained — verify:agents-block 31/31.
- [x] ingest priority: issues → plan docs → commit history, one of them — static source check; live ingestion remains INCONCLUSIVE.
- [ ] issue closing: list, confirm, close with a note, report — no discretion — INCONCLUSIVE: no authorized GitHub issue set or destructive close was exercised.
- [x] idempotency marker in the body, checked with search_items before create — static source check; second-run live duplicate prevention remains INCONCLUSIVE.
- [x] historical tickets: per item, Done, custom + empty requires — static source check; no live backfill was run.
- [x] plan content → plan/, verification → proof/ — static source check.
- [x] stage proposals removed; areas + profiles proposed instead — static source check.
- [x] greenfield brief interview retained — static source check; no interactive brief was supplied.
- [x] AGENTS managed block untouched (verify:agents-block passes) — 31/31 PASS.
- [x] description line updated — static source/diff check.

## Parked (explicitly deferred)

- [ ] Live setup run on a disposable format-3 board, including migration preview/apply and an idempotent second run — INCONCLUSIVE; no disposable fixture or authorized board mutation was available in this reconciliation.
- [ ] Live plan-document or commit-history ingestion preview and creation — INCONCLUSIVE; no source ingestion was authorized.
- [ ] Live GitHub issue list/confirm/close/comment/report sequence — INCONCLUSIVE; closing issues is destructive external state and requires explicit confirmation.
- [ ] Human greenfield interview and resulting board creation — INCONCLUSIVE; no product brief or interactive session was supplied.
