# The in-app manual — research

## The constraint that shapes everything

The renderer CSP is `default-src 'self'`. Nothing can be fetched at runtime — no
CDN, no remote docs, and no reading `/docs/` off disk from the renderer either,
since that is main's filesystem, not the renderer's.

So the manual has to be **generated into the bundle at build time**. A script
turns the repo's markdown into a TypeScript module the renderer imports, and
electron-vite bundles it like any other source. That also makes it work in the
packaged app, where `/docs/` is not shipped at all.

## A bug found while reading the bindings

`App.tsx`'s shortcut handler:

```ts
} else if (ctrl && e.key >= "1" && e.key <= "3") {
  const views: View[] = ["ticket", "standup", "archived"];
```

GUI-015 added a `backlog` view between Board and Standup. The tab strip renders
`VIEW_LABELS` in order — Board, Backlog, Standup, Archived — so **Ctrl+2 now
opens Standup while the second tab is Backlog**, and Archived has no shortcut at
all. I introduced that and did not catch it.

It matters here specifically: this ticket generates a shortcuts chapter *from*
the binding table. Generating from a wrong table would publish the bug as
documentation.

## The shortcuts SSOT

"A shortcuts-chapter-matches-bindings test" only means something if there is one
table both sides read. Today the bindings are an `if/else` chain and the labels
exist nowhere.

`shared/shortcuts.ts` becomes the table. The generator reads it for the chapter;
a test asserts the chapter lists exactly it. The handler still dispatches
imperatively — a fully table-driven handler would be a larger rewrite than this
ticket wants — so the test proves *the chapter matches the table*, not *the
table matches the handler*. That gap is real and worth stating rather than
implying the test closes it.

Where the table can drive behaviour cheaply, it should: the view shortcuts are
just `VIEW_LABELS` order, so deriving them from that removes the class of bug
found above rather than documenting around it.

## Chapters from the FRDs

24 FRDs. Dumping all of them is not a manual — an FRD is a spec written for an
implementer, full of requirement ids and file paths. A user manual needs the
handful that describe *what the app does*, and it needs their prose, not their
acceptance criteria.

The honest approach: generate from a **curated list** of FRDs with a
user-facing title each, take the document's first prose section, and link out to
the full FRD. Generating from all 24 would produce something nobody reads,
which is worse than a short manual.

## Deep links

The ticket wants `?` from Settings tabs and gate messages, "wiring 4.5's stub".
There is no stub — the Help menu has Check for Updates and a GitHub link, and
nothing references a manual. So the anchor mechanism is new, not wired.
