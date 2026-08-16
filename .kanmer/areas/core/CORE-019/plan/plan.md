# 1.7 Remove `due`

- **Where (delete cleanly):** `types.ts:105-111,139-142,156,170`; `frontmatter.ts:12` (`KEY_ORDER`); `store.ts:389-396,435,485,518,542,884-889,899-900,914`; tests `store.test.ts:520,553-576,610-612`. Also remove `ItemFilter.overdue`/`dueBefore`. Legacy `due:` values in existing files are harmless — `.passthrough()` (`types.ts:122`) round-trips them untouched; they simply stop being read. Downstream `overdue`/`dueBefore` filters and the Standup "Overdue" section (Phase 3/4 GUI) go too — they have no meaning without `due`.
