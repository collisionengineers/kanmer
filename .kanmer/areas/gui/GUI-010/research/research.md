# Reference files in the editor — research

## Half of this already exists

`getTicketDocsInfo` already returns `references` (`store.ts:1000`, via
`listReferences`), and `reference/` is already one of the three gate-exempt
folders. So the board can already *hold* reference files and report them; there
is simply no way to put one there from the GUI.

That also settles what "reference" means here: inputs to the work — a mockup, a
spec PDF, a log — which must never satisfy a gate. `GATE_EXEMPT_DIRS` enforces
that already, so the upload path needs no gate logic at all.

## What is missing

1. A way to get a file in — a picker and drag-drop.
2. A way to open one — `shell.openPath`.
3. A way to remove one, with confirmation.

## Where the copy belongs

The ticket says "a new IPC file-copy channel", which reads as: main does the
copy. But **path containment is core's rule**, not main's. Every other path in
this system is validated in core — `parseDocPath`, `groupDocPath`,
`assertSafeRepoPath` — and each rejects `..` and absolute escapes with the same
shape of error.

A main-process copy would either duplicate that validation (a fourth
duplication, unlisted) or skip it. Skipping it means a crafted filename escapes
the ticket folder.

So core gets `addReference` / `removeReference`, and main gets a thin channel
that shows a dialog and calls them. Main keeps what is genuinely main's — the
native picker and `shell.openPath`.

## Binary files

`setDoc` takes a string, so it cannot carry a PNG. The copy has to be a real
file copy at the fs level, which is another reason it belongs in core beside
the other fs work rather than being squeezed through the document API.

## Names collide

Two mockups both called `screenshot.png` is the ordinary case, not the edge
case. Overwriting silently loses the first; refusing is annoying. Suffixing
(`screenshot-2.png`) is what a user expects from every other file manager, so
that.

## Removal is deletion

Unlike a ticket, a reference file has no archive. Removing it is irreversible
and the file may be the only copy of a design someone dragged in. Confirm, and
name the file in the confirmation.

## Verification the ticket asks for

"Drop a mockup, then confirm an agent's `get_item` enumerates it." That is
end-to-end through a different process — the GUI writes, the MCP server reads —
and it is checkable without a human by writing through core and reading back
through the built server.
