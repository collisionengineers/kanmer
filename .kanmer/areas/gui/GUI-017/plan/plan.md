# Plan

## Fix the binding bug first, at the source

Derive the view shortcuts from `VIEW_LABELS` rather than a parallel array. The
bug exists because two lists had to agree and one was forgotten; deriving
removes the class, and this ticket must not document a stale table as truth.

## `shared/shortcuts.ts`

```ts
{ keys: "Ctrl+K", label: "Command palette", context: "Anywhere" }
```

Plain data. The generator reads it; a test asserts the chapter lists exactly it.

**What that test does and does not prove:** it proves the chapter matches the
table. It does not prove the handler matches the table — the handler stays an
`if/else` chain, and making it table-driven is a bigger rewrite than this ticket
should carry. Stated in the report rather than left implied.

## `scripts/build-manual.mjs`

Emits `chapters.generated.ts`. Three sources:

1. **Hand-written** getting-started and troubleshooting, from
   `docs/manual/*.md`, authored here.
2. **Curated FRDs** — a named list with user-facing titles, first prose section
   each. Not all 24: an FRD is written for an implementer, and a manual made of
   24 specs is one nobody reads.
3. **Shortcuts**, generated from the table.

The output is **committed**. The packaged app does not ship `/docs/`, and a
build that needs it would fail for anyone building from the plugin tarball.

## `Manual.tsx`

Sidebar of chapters, one rendered at a time via `renderMarkdown`, and a search
box filtering chapters by title and body with the matching line shown. In-page
search rather than a search engine: a dozen chapters do not need an index.

## Opening it

`F1` anywhere, and **Help ▸ Manual** via the existing menu→renderer channel.
`?` buttons on Settings tabs deep-link to a chapter by id.

## Offline

No network, no runtime file reads. Everything is bundled, which the CSP forces
and the packaged app requires.

## Verification

The chapter-matches-bindings test; a test that every deep-link target resolves
to a real chapter id (a dead `?` is worse than none); regenerate and confirm the
committed output is unchanged; typecheck, build, boot.
