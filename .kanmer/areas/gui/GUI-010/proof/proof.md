# Proof

PR [#22](https://github.com/collisionengineers/kanmer/pull/22), merged
(`6654e0f`). Verified on the merged base.

## The ticket's own acceptance, mechanised

> "Drop a mockup, then confirm an agent's `get_item` enumerates it."

Written through core (what the GUI does), read back through the **built MCP
server over stdio** (what an agent does) — two processes, real protocol frames:

```
core wrote: mockup.png
get_doc_gates references: ["mockup.png"]
get_item references: [] | docs.reference = true
```

**Met in substance, not by the named tool.** An agent can enumerate the file —
through `get_doc_gates`. `get_item` reports only that a reference exists. I did
not change `get_item`'s shape inside a GUI ticket; that is an MCP surface change
with its own release rail, and it wants its own ticket.

## Containment

Five core tests. The one that matters rejects `../escape.png`, `..`,
`sub/dir.png` and `.`, then asserts the reference list is still empty — a
rejection that wrote something anyway would pass a throw-only check.

Collision suffixing verified to `-3`, with the first file's bytes re-read to
confirm it was not overwritten.

Gate-exemption asserted directly: after adding a reference,
`docsInfo.docs.research` is still false. A file in `reference/` satisfies
nothing.

## Rail

- core **127 → 132**, gui 163
- `smoke.mjs` 120/120 · `smoke:protocol` 26/26
- typecheck, GUI build, boot smoke exit 0
- `plugin:build` + `plugin:check` — 29 tools, bundle bytes match (core changed,
  so the bundle had to move with it)

## Not proven

**Drag-and-drop has never run.** It reads `e.dataTransfer.files[i].path`, which
exists in Electron and not in a browser, so it cannot be exercised without a
running app. Everything below the UI is shared with the picker path and is
covered; if drop is broken it is broken in the three lines that read `path`.

**No real binary went through the GUI.** The tests copy a text file named
`.png`. `fs.copyFile` does not care, but it has not literally been done.

**Nobody has clicked any of it.** No renderer component test harness exists in
this repo, so the button, the drop highlight and the remove confirmation are
verified by typecheck and reading only.
