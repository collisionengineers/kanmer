# Proof — GUI-074

Verified on merged `main` at commit `43dcedb` (squash merge of PR #37,
`chore(gui): remove the "?" manual link from the Settings nav (#37)`),
pulled via `git pull origin main` (fast-forward `5d0e0d7..43dcedb`).

## Evidence

**`npm run typecheck`** — clean across all workspaces (`@kanmer/core`,
`@kanmer/mcp-server`, `@kanmer/ui`, `@kanmer/gui`), no errors.

**`npm test`** — all green:
- `@kanmer/core`: 8 test files, 182 tests passed
- `@kanmer/gui`: 21 test files, 201 tests passed, including
  `src/renderer/src/manual/manual.test.ts` — 7 tests (down from 8; the
  removed `describe("deep-link targets")` block is gone, all remaining
  manual tests pass)
- Combined: 383 tests passed, 0 failed

**`npm run check:manual`** — `node scripts/build-manual.mjs --check` reports
`manual: up to date (12 chapters)`. Confirms the FRD-024 amendment required
no regeneration of `chapters.generated.ts`: FRD-024 is not in
`scripts/build-manual.mjs`'s curated `FROM_FRD` list (verified by reading
the script), so its lead prose is never compiled into the manual.

**No dangling references** — repo-wide grep on merged main for
`onOpenManual|SETTINGS_HELP|help-link` across `apps/gui/src` returns zero
matches.

**Manual stays reachable (sanity check, not re-verified from scratch)** —
`App.tsx` diff on merged main touches only the `onOpenManual` caller prop
(4 lines removed at the old `1653-1656`); F1 (`App.tsx:916-920`) and the
Help → Manual menu path (`apps/gui/src/main/index.ts:316-325` →
`App.tsx:558-562`) are untouched by the shipped diff.

**Settings nav** — `Settings.tsx` diff confirms the `?` button block,
`SETTINGS_HELP` map, and `onOpenManual` prop are fully removed; the nav now
renders only `SETTINGS_TABS.map(...)` (5 named tabs).

**Governing doc** — `docs/functional/frd/FRD-024-in-app-manual.md` R4 on
merged main reads: *"Contextual entry points: a '?' affordance on
gate-block messages deep-links to the relevant chapter. (A matching '?' on
Settings tabs was removed — GUI-074 — since it deep-linked into chapters
that were mostly unwritten stubs, and F1 / Help → Manual already provide
entry to the manual without it. The gate-block-message affordance below was
never implemented; see GUI-081, which will implement it or formally
withdraw this clause.)"* — accurate to shipped behaviour, R4 not left
half-true, GUI-081 referenced for the unimplemented clause. R3 and AC3
unchanged, as scoped (DOC-007 owns R3).

## Verdict

All verification criteria from the ticket body met:
- [x] Settings nav shows only named tabs.
- [x] F1 and Help → Manual still open the manual.
- [x] No unused props, imports, or map entries left behind; typecheck clean.

PASS.

## Closeout record

PR: https://github.com/collisionengineers/kanmer/pull/37
Merged: 2026-08-16T22:09:00Z (squash commit 43dcedbff75bec1ed1d5a18f1e702d843e07153d)
