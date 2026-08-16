# Post-implementation report

PR [#22](https://github.com/collisionengineers/kanmer/pull/22).

## File changes

| Path | Change |
|---|---|
| `packages/core/src/store.ts` | `addReference`, `removeReference` — copy + containment. |
| `packages/core/src/store.test.ts` | 5 tests: listing, collision, containment, removal, unknown ticket. |
| `shared/ipc.ts`, `preload/index.ts`, `lib/client.ts` | Four channels. |
| `main/index.ts` | Picker, `shell.openPath`, two store calls. |
| `components/Editor.tsx` | Attachments section, drop zone, `addReferences`. |
| `styles.css` | Drop-zone outline, list. |
| `plugins/.../kanmer-mcp.cjs` | Rebuilt — core changed. |

## Against the governing docs

**FRD-004 R2** — upload, drag-drop, list, open, remove-with-confirm.
**FRD-003 T5** — `reference/` remains gate-exempt, asserted in a test rather
than assumed.

## Departed from the ticket's wording, deliberately

It specifies "a new IPC file-copy channel". Main does not copy; core does. The
reason is in the PR — containment is core's rule and a second implementation is
how one of them drifts. Main keeps the picker and `shell.openPath`.

## For review

**`get_item` does not enumerate reference filenames.** The ticket's acceptance
is "confirm an agent's `get_item` enumerates it". It reports
`docs.reference = true` and nothing more; `get_doc_gates` is what returns the
names. So the acceptance is met in substance — an agent can find the files —
but not through the tool named.

I did not change `get_item`'s response shape. That is an MCP surface change with
its own release rail (`tool-reference.md`, `plugin:build`, `plugin:check`), and
making it inside a GUI ticket is how a surface drifts without its rail. It wants
its own ticket if agents should see attachment names there.

**Drag-and-drop is untested.** It reads `e.dataTransfer.files[i].path`, which
exists in Electron and not in a browser, so there is no way to exercise it
without a running app. The picker path shares everything below the UI and *is*
covered. If drop is broken, it is broken in the three lines that read `path`.

**No binary was round-tripped through the GUI.** The core tests copy a text file
named `.png`. A real image would exercise nothing different — `fs.copyFile` does
not care — but it has not literally been done.

## What kanmer-verify should run

The 5 core tests; the stdio end-to-end (`core writes → get_doc_gates
enumerates`); full rail including `plugin:check`; and, with a running app, drop
a real PNG on a ticket and confirm it appears, opens, and removes.
