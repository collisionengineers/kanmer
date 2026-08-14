# toastKey hardcodes obsolete 5-doc list — mis-attributes v2 docs and every scratch write

- **Severity:** normal
- **PR:** #12 (Phase 5 — `toastKey` introduced in `6f16c4f` "Phase 5: behave like a native Windows app")
- **File:** `apps/gui/src/main/index.ts:306-325`
- **Source bug ids:** bug_003

## Follow-up verdict — partially validated

The hardcoded list is conclusively stale: v2 supplies additional defaults,
per-area document ids are arbitrary, and dispatch always writes a scratch file.
All three downstream key mismatches follow.

The proposed `parent !== name ? parent : name` replacement is incomplete. Kanmer
still watches format-1 paths such as `.kanmer/tickets/TICK-001.md`; there the
parent is `tickets`, so the heuristic would return the wrong key. The renderer's
similar `onDiskChange` heuristic has the same latent legacy-layout issue. The fix
must classify the storage layout, not merely compare two basenames.

## Summary

`toastKey` at `apps/gui/src/main/index.ts:306-316` still hardcodes the pre-v2 five-doc list `["research","impact","plan","checklist","proof"]`, so for every Phase-1 doc (`post-implementation-report`, `open-questions`), every per-area doc (e.g. the PR-review area's four-doc set), and every `scratch-*.md` (`dispatch.ts:157` writes `scratch-dispatch.md` on every completion) it returns the doc filename instead of climbing to the parent ticket folder.

Three concrete downstream failures:

1. `flushToasts` calls `store.getItem("<doc-name>")` → null → the toast falls back to generic wording.
2. The reveal payload becomes `{ projectId, id: "<doc-name>" }`, so clicking the notification calls `trySelect("post-implementation-report")` which selects no ticket.
3. Own-write suppression compares `ownWrites.get("<doc-name>")` but the `setDoc` IPC handler records `markOwnWrite(p, id)` with the ticket id (index.ts:604), so the GUI self-toasts on every GUI-authored write to a new-kind doc and on every dispatch scratch write.

The renderer's `onDiskChange` (`App.tsx:311-318`) already uses the correct doc-name-agnostic `parent !== id` heuristic (with a comment calling out the fix); main was not brought along.

## Detail

Current shape:

```ts
function toastKey(file: string): string | null {
  const base = basename(file);
  if (base === "board.yml") return "board";
  if (!base.endsWith(".md")) return null;
  const name = base.slice(0, -3);
  // Pipeline docs live inside the ticket's folder — attribute to the ticket.
  if (["research", "impact", "plan", "checklist", "proof"].includes(name)) {
    return basename(dirname(file));
  }
  return name;
}
```

Phase 1 of this stack (a) added two new default pipeline docs (`post-implementation-report.md`, `open-questions.md` — `packages/core/src/docs.ts` `DEFAULT_DOC_TYPES`), (b) made the whole doc set per-area configurable, and (c) introduced `scratch-*.md` files (`packages/core/src/paths.ts` `SCRATCH_PREFIX`; `store.appendScratch`, called from `apps/gui/src/main/dispatch.ts:157` on **every** dispatch completion). For any of those, `toastKey` drops through to `return name` — the doc filename — instead of the ticket id.

The renderer's equivalent was fixed (`App.tsx:311-318`):

```ts
// A doc file is areas/<area>/<ticketId>/<doc>.md — its parent folder is
// the ticket id and differs from the file's own basename. …
// This is doc-name agnostic (per-area configurable docs + scratch-*).
const parent = parts[parts.length - 2];
const isDoc = parent !== undefined && parent !== id;
if (isDoc) id = parent;
```

### Step-by-step proof (dispatch scratch)

1. User dispatches TICK-42 via the "Dispatch to agent" menu.
2. Agent completes; `dispatch.ts:157` calls `store.appendScratch("TICK-42", "dispatch", …)` which writes `.kanmer/areas/<area>/TICK-42/scratch-dispatch.md`.
3. Chokidar fires; the watcher calls `toastKey(".../TICK-42/scratch-dispatch.md")`. `name = "scratch-dispatch"`, not in the hardcoded list → returns `"scratch-dispatch"`.
4. `ownWrites.get("scratch-dispatch")` is `undefined` (nothing was ever recorded under a doc-name key).
5. `mainWindow.webContents.send(CH.agentChange, { projectId, key: "scratch-dispatch", event })` fires; if unfocused, `queueToast(projectId, "scratch-dispatch", …)` runs.
6. `flushToasts` → `store.getItem("scratch-dispatch")` → `null` → toast titled `scratch-dispatch updated` with an empty body; `reveal.id = "scratch-dispatch"`. Click reveals nothing.

The same trace applies to `set_ticket_doc(id, "post-implementation-report", …)` from the GUI Editor (via `CH.setDoc` at index.ts:595-606).

## Fix

Mirror the renderer's heuristic: take the parent folder as the ticket id whenever the changed `.md` file's basename differs from its parent folder name — a ticket file lives at `areas/<area>/<id>/<id>.md` (basename equals parent) while any pipeline doc, per-area doc, or scratch file lives at `areas/<area>/<id>/<other>.md`:

```ts
function toastKey(file: string): string | null {
  const base = basename(file);
  if (base === "board.yml") return "board";
  if (!base.endsWith(".md")) return null;
  const name = base.slice(0, -3);
  const parent = basename(dirname(file));
  return parent && parent !== name ? parent : name;
}
```

This closes all three regressions with one edit and restores parity with the renderer.

## Resolution plan

1. Add a pure path classifier in the GUI main layer (or export an equivalent from
   core) that recognizes paths relative to `.kanmer`:
   - `data/board.yml` → `board`;
   - `areas/<area>/<ticket>/<ticket>.md` → the ticket id, item event;
   - `areas/<area>/<ticket>/<other>.md` → the ticket id, document event;
   - `tickets|plans|research/<id>.md` → the filename id, legacy item event;
   - everything else → uninteresting/full refresh.
2. Use the same classifier in `main/index.ts::toastKey` and renderer
   `onDiskChange`, eliminating two divergent copies. Return structured
   `{key, isDocument, isItem}` metadata so unlink handling is not inferred again.
3. Keep own-write suppression keyed by the returned ticket id for every v2 doc
   and scratch write; preserve legacy item behavior and board behavior.
4. Add table-driven tests with Windows and POSIX separators for every path above,
   including configurable docs, `post-implementation-report`, `open-questions`,
   `scratch-dispatch`, malformed depths and format-1 files.
5. Add an integration assertion that an unfocused external doc change produces a
   ticket-addressed notification/reveal and a GUI-authored write is suppressed.

```diff
-const key = toastKey(file);
+const change = classifyKanmerPath(file);
+const key = change?.key ?? null;
```

Acceptance requires correct patching, toast text, reveal and own-write suppression
for both supported storage formats. The original four-line heuristic must not be
implemented as written.

## Remediation evidence

Remediated on PR #12 (`7160dd3`): one shared v1/v2 Kanmer path classifier is
used by both main-process attribution and the renderer, with seven focused tests. Final GUI suite: 73 passed.
