# 6.2 `apps/gui/release-notes.md`

**File (new), committed.** Seed with a `## 0.1.0` heading and a one-line note. The convention: the top section names the version being released; the script's check 4 enforces that it was updated.

**Verify Phase 6:** `node scripts/release.mjs 0.1.1 --dry-run` runs the whole gate and stops before writing anything; then `git status --porcelain` must still be empty. Also verify each refusal fires: dirty tree, `v0.1.1`, `0.1.0-beta.1`, unset token, stale release notes.

---
