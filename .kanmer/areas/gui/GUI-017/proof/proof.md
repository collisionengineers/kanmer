# Proof

PR [#25](https://github.com/collisionengineers/kanmer/pull/25), merged
(`6e21ac2`). Verified on the merged base.

## Offline, which the CSP requires

`grep -cE "fetch\(|XMLHttpRequest|https?://"` over `Manual.tsx` and
`chapters.generated.ts` → **0** in both. Nothing is fetched; the chapters are a
compiled module.

## Generation is reproducible

`npm run check:manual` → **"up to date (12 chapters)"** on a clean tree, so the
committed artifact is byte-identical to a fresh generation. A stale file fails
the check rather than shipping quietly.

## The shortcuts chapter matches the table, both directions

8 tests. Every `SHORTCUTS` entry appears in the chapter with its keys, label and
context; and **every table row in the chapter maps back to a `SHORTCUTS` entry**,
so hand-editing the generated file is caught rather than tolerated.

**What it does not prove:** that `App.tsx`'s handler matches the table. The
handler is still an `if/else` chain. A binding added there and not to the table
would be undocumented and untested, and no test here would notice. Recorded in
`shortcuts.ts` itself.

## The view-shortcut bug is fixed at the source

```
App.tsx:915   const views = Object.keys(VIEW_LABELS) as View[];   // the shortcut
App.tsx:1041  {(Object.keys(VIEW_LABELS) as View[]).map(...)}      // the tab strip
```

Both read the same list, so they cannot disagree again. Previously the shortcut
used a hardcoded `["ticket","standup","archived"]` that GUI-015 left stale —
Ctrl+2 opened Standup while the second tab was Backlog, and Archived had no
shortcut. A test asserts the documented view shortcut names all four views.

## Rail

gui **176 → 184**, core 139, `check:manual`, typecheck, GUI build, boot exit 0.

## Not proven

**Nobody has opened it.** No renderer component test harness exists, so the
rail, the search box and the `?` buttons are verified by tests over the data and
by typecheck. Deep-link targets are asserted to be real chapter ids, which is
the failure that would look worst — a `?` opening the manual at nothing.

**Chapter prose is FRD prose.** It reads like a spec introduction because it is
one, harvested rather than written for a user. Honest and better than nothing.

**`check:manual` is not wired into any gate.** Nothing runs it automatically.
Same shape as `plugin:check` in a repo with no CI: a rail step that must be
remembered.
