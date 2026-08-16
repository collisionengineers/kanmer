# Checklist

- [ ] view shortcuts derived from `VIEW_LABELS` — Ctrl+N bug fixed
- [ ] `shared/shortcuts.ts` is the single binding table
- [ ] `build-manual.mjs` emits a bundled TS module
- [ ] generated output committed (the packaged build has no `/docs/`)
- [ ] hand-written getting-started + troubleshooting
- [ ] curated FRD chapters, not all 24
- [ ] shortcuts chapter generated from the table
- [ ] `Manual.tsx`: sidebar, chapter body, in-page search
- [ ] F1 opens it; Escape closes
- [ ] Help ▸ Manual menu item
- [ ] `?` deep links from Settings tabs
- [ ] test: chapter matches the binding table
- [ ] test: every deep-link target is a real chapter
- [ ] regenerating produces no diff
- [ ] no network, no runtime file reads
- [ ] `@kanmer/ui` barrel
