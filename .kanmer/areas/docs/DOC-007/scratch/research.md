## Pipeline trace (read-only)

- `docs/manual/*.md` (2 files) + `docs/functional/frd/*.md` (9 curated) + `apps/gui/src/shared/shortcuts.ts`
  → `scripts/build-manual.mjs` → `apps/gui/src/renderer/src/manual/chapters.generated.ts` (committed)
  → `Manual.tsx` imports `MANUAL_CHAPTERS` → rendered via `renderMarkdown`.
- Reachability: F1 (App.tsx:916), Help → Manual (main/index.ts:322), Settings "?" (Settings.tsx:202).
  No command-palette entry.
- Exact root cause of the stubs: `leadProse()` trims, THEN strips the H1 with
  `/^#\s+.*\n+/` which requires a trailing newline `trim()` just removed. The H1
  survives, `body` is truthy, the `if (!body) throw` guard at :66 never fires.
- `check:manual` is in package.json only — no verify/release script calls it.
