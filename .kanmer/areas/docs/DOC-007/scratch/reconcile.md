## 2026-08-22 merged-main reconciliation

Historical PR #49 merge `19244f6` is reachable from current origin/main `af61144c`; fresh `.worktrees/doc-007` on `doc-007-manual-reconcile` is clean and has no source diff.

Current manual: `check:manual` 22 chapters exit 0; focused manual test 11/11; generated scan 21 authored/1 generated, min authored 2462, min overall 574, forbidden spec/path/requirement/H1 residue 0. Full npm test first exited 1 only at scripts because core dist was absent (78/80); build:core exit 0, scripts rerun 80/80, typecheck/build-manual/artifact diff/check-manual/diff-check exit 0; aggregate npm test rerun exit 0 with core 263/263, GUI 352/352, HTTP 61/61, scripts 80/80.

Checklist is 44/46: backlog chapter intentionally parked after GUI-070 withdrew that view; negative guard fixture not rerun in this reconciliation, historical proof records it and the guard source is unchanged. No visual/manual acceptance or independent review is claimed.
