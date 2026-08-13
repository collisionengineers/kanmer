# PR #2 — remediation plan

> **Repo:** `C:\Users\Alex\Documents\GitHub\kanmer` · **Branch:** `kanmer-upgrades-phases-1-8` · **Base commit:** `7706a2064a`
> **Inputs:** [`pr-2-comments.md`](pr-2-comments.md) (nine validated defects), [`adherence-review.md`](adherence-review.md) (A1–A9), `AGENTS.md`.
> **Ends at:** "all §10 verification green, ready to commit." No merge/push/tag/release steps — the orchestrator owns those.

---

## Triage table

| id | title | severity | disposition | justification (one line) |
|---|---|---|---|---|
| **1** | Reject duplicate legacy type prefixes | P1 · silent data loss | **FIX NOW** | Validated end-to-end destruction of a ticket during migration with no error and a success report. |
| **2** | Refresh cached storage format after external migration | P1 · silent corruption | **FIX NOW** | Stale cache re-issues a live id → two `TICK-001` on disk, the newer permanently unaddressable, zero warnings. |
| **3** | Detect concurrent document edits before saving | P1 · silent data loss | **FIX NOW** | The doc-write chain has no concurrency primitive at any layer; a whole-doc save silently discarded a newer write. |
| **4** | Preserve dirty documents when switching tabs | P1 · in-memory loss | **FIX NOW** | High-frequency, silent loss of user-typed text; the plan committed in writing to guarding tab switches. |
| **5** | Keep generated wiki links out of raw-HTML escaping | P1 · feature dead | **FIX NOW** | 0 of 13 wiki-link cases render as anchors, 100 % of the time, plus a second defect (code spans) on the same line. |
| **6** | Check move conflicts before materializing column order | P2 · broken contract | **FIX NOW** | A rejected move still wrote `order` + `updated` on 3/3 siblings and appended 3 activity entries; fix is ~15 lines. |
| **7** | Enforce the proof gate when reordering statuses | P2 · board lies | **FIX NOW** | Reorder silently un-blocks downstream tickets via `computeBlockedIds`; agents act on the false `blocked: false`. |
| **8** | Remove folded document IDs from structured links | P2 · cosmetic | **FIX NOW** | Cheap (one sweep), lands in the same `migrate.ts` pass as #1/#9, and never self-heals; skipping it wastes the pass. |
| **9** | Make migration resumable after partial execution | P2 · trap + data loss | **FIX NOW** | `ENOENT` forever with no in-product recovery, and the obvious workaround silently destroys un-migrated tickets. |
| **A1** | No GUI writer for manual card ordering | P2 · scope gap | **FIX NOW** *(new Phase 5.7)* | A locked roadmap decision half-delivered; ordering is agent-write / human-read-only and a GUI drag leaves stale `order`. |
| **A2** | Blocked / overdue card badges never built | P2 · scope gap | **FIX NOW** *(new Phase 5.6)* | Two shipped data-model features are invisible on the app's primary surface; the data is already in the renderer. |
| **A3** | `tool-reference.md` documents the format-1 item model | P2 · agent contract wrong | **FIX NOW** *(§4.2, unchanged)* | Self-contradictory, and it is the document the workflow skill points agents at for ground truth. |
| **A4** | "2026-07-28 modernization" rests on a protocol the SDK lacks | P2 · false record + unrun verification | **FIX NOW** *(new Phase 4.3)* | Partly impossible by definition — see 4.3. The record gets corrected, the `_meta` path gets *proven live*, and the back-compat protocol run the plan named gets written and run. |
| **A5** | Standup view does not match the `kanmer-standup` skill | P3 · scope gap | **FIX NOW** *(new Phase 5.8)* | The whole point of the view is that human and agent standups match; two sections, the grouping and the window all diverge. |
| **A6** | Command palette ships 4 of 6 verb classes | P3 · cosmetic | **FIX NOW** *(new Phase 5.9)* | Move ▸ and Release are free (existing IPC); Take needs one new channel and a branch prompt. |
| **A7** | `examples/codex-config.toml` hardcoded machine path | P3 · public-facing | **FIX NOW** *(§7.2, unchanged)* | Two-line edit in a file the README explicitly routes readers to. |
| **A8** | Phase 8.2's AGENTS.md managed block is prose only | P3 · unverified claim | **FIX NOW** *(new Phase 6.3)* | Replaced with a real, deterministic script the skill calls — turning a model instruction into an enforced property. |
| **A9** | Two plan-named test assertions were never written | P3 · coverage | **FIX NOW** *(§6.1–6.2, unchanged)* | Both small, on already-correct code. |
| **(new)** | `createItem` is not proof-gated | contract hole | **FIX NOW** *(new Phase 1.3)* | Closes the hole 1.2 exposed; **changes `create_item`'s contract** and requires editing `store.test.ts:271`. |
| **(new)** | `App.tsx:484` dry-run migrate has no `.catch` | unhandled rejection | **FIX NOW** *(§5.4, unchanged)* | One line; without it the #1/#9 pre-flight blockers fail invisibly. |
| **(new)** | Open-project / Open-recent discard dirty editor state | silent loss | **FIX NOW** *(new Phase 5.10)* | Needs its own confirm mechanism — `pendingNav` cannot defer a root swap; specified in 5.10. |
| **(new)** | `beforeunload` confirm unverified in this Electron config | unknown | **DOCUMENT NOW** | No harness exists to settle it, and asserting it works would be dishonest. This is the one item that stays documented-only. |

**Still not built, and still recorded honestly** — these were never in the enumerated set and are *not* silently dropped:
- **No agent-reachable migration** (no MCP `migrate` tool; `migrateToV2` is GUI-only). Stays a §11 limitation and a filed follow-up.
- **Keyboard stage move (Ctrl+←/→) does not set position** — A1 gives drag-and-drop an insertion point; the keyboard path still moves the stage only. New §11 bullet.
- **The checklist tab never linkifies `[[ID]]`** and **`ownWrites` toast suppression is ticket-granular** — both out of scope by design in the approved §5.1/§3.2 sections; §11 bullets retained.

**Explicitly NOT changed, and why** — considered and rejected on purpose, not dropped:
`materialise()` staging/rollback (#6 — the store has no rollback by design, `AGENTS.md:348-354`); extracting a shared `cleanReferencesTo()` from `deleteItem` (#8 — touching the most-exercised destructive path to fix a cosmetic issue); `trySelect` for the two delete paths (`App.tsx:326`, `:544` — the item is *gone*, prompting "discard changes?" for it is wrong); the checklist tab's literal `[[ID]]` (#5); doc-granular `ownWrites` (#3 — toast cosmetics); `detectFormat()`'s `pathExists(tickets)` v1 fallback (#9).

---

## Amendments to the approved sections

These sections were approved as designed; the expanded scope forces these specific changes and no others.

- **AMEND §1.2** — extract `lastStageId(board)` into `board.ts` **first** (see 1.2a below) and use it in `assertProofGate` (`store.ts:835`), `assertFinalStageProven` (new), `createItem`'s new check (1.3) and `listItemsWithWarnings` (`:391`). Also add to §1.2's "Known interaction" paragraph: *"Phase 1.3 closes the `createItem` hole this paragraph describes, so the 'a board can hold proofless tickets in the last stage without any reorder' case now only arises on boards seeded before this change or by hand-edited files. The check must still tolerate it — do not assume it cannot happen."*
- **AMEND §3.1** — add a note: *"`assertMoveAllowed` now also runs on the GUI drag path once Phase 5.7 lands `position` in the IPC contract. That is the intent — row 7 of 5.7's manual drag matrix is #6's fix made visible in the UI."*
- **AMEND §5.1** — **delete** the paragraph beginning *"Conservative fallback if adding a dep is unwelcome…"*. The vitest harness is settled and approved. 5.1 should say: *"This harness is the home for every pure renderer module; 5.5 adds two more suites to it."*
- **AMEND §5.3** — add: *"`shared/ipc.ts`, `preload/index.ts` and `main/index.ts` are touched again by 5.4 (`getFormat`), 5.7 (`moveItem` gains `position`), 5.8 (`listItemsWithWarnings`) and 5.9 (`takeTicket`). **Do the whole channel/contract/preload/handler pass once**, at the start of 5.3, adding all five channels and both widened signatures together — otherwise you make four round-trips through three files and four chances to leave `CH`, `KanmerApi`, the preload wrapper and the handler out of step. The renderer-side consumers then land phase by phase."*
- **AMEND §5.4** — the `getFormat` channel moves into 5.3's single IPC pass; 5.4 keeps only the `refresh()` call site, the `validateDraft` loop, the `.catch` and the migrate-modal changes.
- **AMEND §7.1** — after `npm run plugin:build`, also run the bundle variant of the new protocol script: `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke-protocol.mjs`. The bundle carries `actorName` too.

### 1.2a — extract `lastStageId(board)` (do this before writing `assertFinalStageProven`)

"Last stage" is independently re-derived in five places (`assertProofGate` `store.ts:835`, the overdue filter `store.ts:391`, `blockedSet` `mcp-server/src/index.ts:139`, `computeBlockedIds`'s caller, `Standup.tsx:108`). 1.3 adds a sixth. Add to `packages/core/src/board.ts`:

```ts
/** The board's final stage — the proof-gated one. Undefined only on a board with no stages. */
export function lastStageId(board: BoardConfig): string | undefined {
  return board.statuses[board.statuses.length - 1]?.id;
}
```

Use it in the three core sites above. Export from `index.ts` (already `export *`). Leave `mcp-server`'s and the renderer's copies alone in this phase — the renderer cannot import a runtime value from core, and the MCP one is a one-liner in another package. Add one case to `board.test.ts`: `it("lastStageId returns the final status id, undefined for an empty board")`.

---

## Execution order and rationale

Seven phases. The order is driven by three couplings the review already worked out, plus the monorepo build order (core → mcp-server → gui):

1. **Phase 1 (core board writes)** first because #1's `assertUniquePrefixes` fix changes what `store.setBoard()` accepts, and `migrateToV2` calls `setBoard` at `migrate.ts:143`. Phase 2 is written against the post-fix behaviour. #1 and #7 share the `setBoard`/`writeBoard` chokepoint — one pass over one function.
2. **Phase 2 (migration + format)** as a single pass over `migrate.ts:139-186` and `store.detectFormat`. #1's migrate belt, #8's link sweep and #9's three resumable loops all rewrite the same three loops; #2 and #9 are two directions of "the format marker disagrees with disk" and must be designed together (a #2 fix that always re-reads `version.json` does *not* fix #9). Touch these loops once.
3. **Phase 3 (core write-path freshness)** — #6 and #3's core half are one "audit every write path for a freshness check before `writeFileAtomic`" pass, and both reuse the same conflict-error shape.
4. **Phase 4 (MCP surface)** — must follow Phase 3 because it threads #3's new `expectedVersion` through `set_ticket_doc`/`get_ticket_doc`, and it is where A3's tool-reference rewrite lands.
5. **Phase 5 (GUI)** last of the code phases: the renderer depends on the IPC contract, which depends on core. #5 is independent and could go anywhere, but grouping all renderer work keeps `npm run typecheck -w @kanmer/gui` / `build -w @kanmer/gui` to one late run.
6. **Phase 6 (tests the plans named)** — A9, deliberately after the behaviour changes so the rebalance test is written against final `computeOrder`.
7. **Phase 7 (docs + bundle + verification)** — the bundle rebuild *must* be last (it must capture every core/mcp change), and the docs must describe what actually shipped.

---

## Phase 1 — Core board-write validation (#1 board half, #7)

### 1.1 Reject `idPrefixes ↔ idPrefixes` collisions

**Files:** `packages/core/src/board.ts`

**Change:** In `assertUniquePrefixes()` (`board.ts:54-72`), replace the first loop (`:56-60`) — which does a bare `seen.set(prefix, owner)` with no pre-check — with the same shape the second loop already uses:

```ts
for (const [type, prefix] of Object.entries(board.idPrefixes)) {
  const owner = `idPrefixes.${type}`;
  const holder = seen.get(prefix);
  if (holder) throw new Error(
    `${owner} would use id prefix "${prefix}", which ${holder} already uses. ` +
    `Every prefix must be unique — ids are allocated per prefix, so two owners sharing one ` +
    `would collide on the same id path.`);
  seen.set(prefix, owner);
}
```

Keep the second loop (`:61-71`) exactly as-is. Update the function's JSDoc (`:48-53`) to say uniqueness is enforced *within* `idPrefixes` as well as across areas.

Edge cases: `Object.entries` order is `ticket, plan, research` (schema insertion order), so the error names the *later* type as the offender and the earlier as the holder — that is the same convention the area loop uses; do not try to sort it.

**Siblings in scope:** none in core — `writeBoard` (`board.ts:94-98`) is the single chokepoint and every board mutation funnels through it via `store.setBoard`.
**Out of scope:** validating on *read* (`readBoardWithSource`, `board.ts:83-92`) stays unvalidated — a hand-edited `board.yml` is covered by the migration belt in 2.1 instead, which is where the damage actually happens.

**Test:** new file `packages/core/src/board.test.ts`.
- `it("rejects two idPrefixes entries sharing a value")` — `defaultBoardConfig()`, set `idPrefixes = { ticket: "FOO", plan: "FOO", research: "RES" }`, `areas: []`; assert `writeBoard(paths, board)` rejects with `/idPrefixes\.plan.*"FOO".*idPrefixes\.ticket/`.
- `it("rejects an area prefix that collides with a type prefix")` — the existing (already-working) control case, so a future refactor can't lose it.
- `it("rejects two areas that derive the same prefix")` — e.g. `{id:"api"}` and `{id:"api-x", prefix:"API"}`.
- `it("accepts the default board")` — regression guard on the defaults staying distinct.

Use `fs.mkdtemp` + `resolvePaths` in `beforeEach`/`afterEach` mirroring `store.test.ts:12-20`.

**Verify:** `npm test` — 4 new tests pass, existing 53 unaffected (no fixture in the suite uses duplicate prefixes; `store.test.ts:616-679` uses distinct `TICK`/`PLAN`/`RES`).

---

### 1.2 Gate the final stage on every board write

**Files:** `packages/core/src/store.ts`

**Change:** Move the check to the `setBoard` chokepoint, **not** `reorderColumns` — a fix scoped to `reorderColumns()` (`store.ts:271-287`) leaves the GUI Settings ↑/↓ path (`Settings.tsx:287-293` → `App.tsx:246-248` → `main/index.ts` `CH.setBoard` → `setBoard` directly) reproducing it verbatim, and that is the path a human is most likely to hit.

Rewrite `setBoard` (`store.ts:172-174`):

```ts
async setBoard(board: BoardConfig): Promise<void> {
  const previous = await this.getBoard();                      // re-reads disk = true prior state
  const prevLast = previous.statuses[previous.statuses.length - 1]?.id;
  const nextLast = board.statuses[board.statuses.length - 1]?.id;
  if (nextLast !== undefined && nextLast !== prevLast) {
    await this.assertFinalStageProven(nextLast);
  }
  await writeBoard(this.paths, board);
}
```

Add the private helper next to `assertProofGate` (`store.ts:828-843`):

```ts
/** Refuse a board write that would make a stage final while proofless tickets sit in it. */
private async assertFinalStageProven(lastStageId: string): Promise<void> {
  const occupants = await this.listItems({ status: lastStageId });   // non-archived only
  const offenders: string[] = [];
  for (const item of occupants) {
    if (item.type !== "ticket") continue;
    const loc = await this.locateItem(item.id);
    if (!loc || loc.kind !== "v2") continue;    // legacy layout has no doc folder to gate on
    if (!(await pathExists(docFileIn(loc.dir, "proof")))) offenders.push(item.id);
  }
  if (offenders.length === 0) return;
  throw new Error(
    `Cannot make "${lastStageId}" the final stage: ${offenders.length} ticket(s) there have no ` +
    `proof.md (${offenders.slice(0, 5).join(", ")}${offenders.length > 5 ? ", …" : ""}). ` +
    `Write the evidence with set_ticket_doc(doc: "proof"), or move them out of that stage first.`);
}
```

Decisions already made — do not re-open:
- **Reject, do not grandfather.** Matches `removeColumn`'s in-use-column refusal (`store.ts:242-249`), which is the established house style, and keeps `AGENTS.md:190-193`'s "the LAST stage is proof-gated" literally true.
- **Non-archived only** (`listItems({status})`, no `includeArchived`). An archived ticket is off the board; requiring proof for archived history to reorder stages is noise.
- **Only when the last id actually changes.** This is what keeps `migrateToV2`'s `setBoard` at `migrate.ts:143` (statuses unchanged) and every `updateColumn` call a no-op, and it makes `addColumn("status", …)` cheap (the newly appended stage is always empty).
- `listItems({status})` not `listItems()` — filters before reading, so the scan cost is proportional to the final column, not the board.

**Siblings in scope:** `reorderColumns`, `addColumn`, `updateColumn`, `removeColumn` and the GUI whole-board save — all reach `setBoard`, all now covered by one check.
**Out of scope:** mirroring this in `Settings.tsx`'s `validateDraft()` (`:370-401`). **The renderer structurally cannot do it** — it has `items` but no `proof.md` presence (`getTicketDocsInfo` is per-id IPC), and renderer code may only `import type` from core (`AGENTS.md:287`). `Settings.save()` (`:44-62`) already catches the thrown error and renders it in the modal head, so the GUI surfaces it correctly at save time with no new code. Say this in the amended plan doc so the next reader doesn't try.

**Known interaction, verify don't assume:** `createItem` is *not* proof-gated (see `store.test.ts:271`, which creates a ticket directly into `done`), so a board can hold proofless tickets in the last stage without any reorder. On such a board, adding-then-removing a status will now fail. That is correct behaviour — it surfaces a real inconsistency — but it is a behaviour change. `smoke.mjs` is safe: the only ticket that reaches `done` is `TICK-002`, and it has `proof.md` written at `smoke.mjs:223` before the `add_column`/`remove_column status qa` sequence at `:302-310`. **Confirm by running, don't assume.** The un-gated `createItem` goes to §11 (DOCUMENT NOW) + a deferred issue.

**Test:** append to `packages/core/src/store.test.ts`, inside `describe("KanmerStore")`, after the existing proof-gate test at `:455-463`:
- `it("refuses a status reorder that would strand a proofless ticket in the final stage")` — create ticket in `review` (no proof), `await expect(store.reorderColumns("status", ["todo","planning","implementing","verifying","done","review"])).rejects.toThrow(/no proof\.md/)`; then assert `(await store.getBoard()).statuses.at(-1)?.id === "done"` (the board was **not** written).
- `it("allows a status reorder once every occupant of the new final stage has proof.md")` — same setup, `setDoc(id,"proof","evidence")`, reorder resolves, assert `statuses.at(-1)?.id === "review"`.
- `it("refuses the same thing through a whole-board setBoard, as the Settings editor does")` — build the board object by swapping `statuses` in place and calling `store.setBoard(board)` directly; assert the same rejection. **This is the sibling-path regression test** — without it the fix could silently regress back into `reorderColumns`.
- `it("reordering non-status columns never touches the proof gate")` — reorder `priorities` on a board with a proofless ticket in `done`; assert it resolves.

**Verify:** `npm test`; then `node packages/mcp-server/src/smoke.mjs` after the Phase 7 build — specifically watch the `add_column`/`remove_column` status checks around `smoke.mjs:302-315`.

Also add one `smoke.mjs` check (the tool has *zero* status-reorder coverage today; `:285-301` covers only `kind: "priority"`): after the proof-gate block at `:212-233`, insert a `reorder_columns` call with `kind: "status"` moving `review` to last while a proofless ticket sits in `review`, and `check("reorder_columns status is proof-gated", res.isError === true && textOf(res).includes("proof.md"))`. Then reorder back / leave the board as it was, so the rest of the script is unaffected.

---

### Phase 1.3 — Proof-gate item creation (**new**)

**Files:** `packages/core/src/store.ts`, `packages/core/src/store.test.ts`, `packages/mcp-server/src/index.ts` (description text only)

**Change:** `createItem` (`store.ts:429-506`) currently lets an agent place a ticket straight into the board's final stage with no `proof.md` — validated by `store.test.ts:271`. The gate only guards *moves* (`updateItem`'s status branch, `store.ts:543-546`), so 1.2's `assertFinalStageProven` can be tripped by a board that was seeded, not reordered.

Insert immediately after the existing format/type check (`store.ts:441-448`), before `const area = input.area ?? ""`:

```ts
// A ticket cannot be born in the final stage: proof.md is required there and the
// ticket's folder does not exist yet, so there is nothing that could satisfy it.
const last = lastStageId(board);
if (
  format === 2 &&
  type === "ticket" &&
  input.status !== undefined &&        // the default is statuses[0]; never affected
  board.statuses.length > 1 &&         // a one-stage board has no meaningful gate
  input.status === last
) {
  throw new Error(
    `Cannot create "${input.title}" directly in "${input.status}": that is the board's final ` +
    `stage, which requires proof.md. Create it in an earlier stage, write the evidence with ` +
    `set_ticket_doc(doc: "proof"), then move it.`);
}
```

Four guards, each load-bearing: `format === 2` (v1 boards have no doc folders); `type === "ticket"`; `input.status !== undefined` (a default create lands in `statuses[0]`, so the common path is untouched); `board.statuses.length > 1` (on a single-stage board first === last and every create would fail — the edge case that would otherwise brick such boards).

**This changes `create_item`'s contract.** Update the tool description at `mcp-server/src/index.ts` (`create_item`, `:397-407`, mirror in `create_items` `:409-435`) with one sentence: *"A ticket cannot be created directly in the board's final stage — that stage requires proof.md; create it earlier and move it."* Add the same sentence to the `create_item` row of `tool-reference.md` **in Phase 4.2's edit pass**, so that file is touched once.

`create_items` (bulk) routes through `createItem`, so an offending entry becomes a per-entry failure in the existing partial-success shape — no handler change, and `smoke.mjs`'s partial-failure check (`:234-252`) still passes. `migrateToV2` never calls `createItem`, so Phase 2 is unaffected.

**Exact test change — `store.test.ts:269-274`:** the existing `it("filters by status and label")` creates ticket B directly in `done` and will now throw. Replace with the real path:

```ts
it("filters by status and label", async () => {
  await store.createItem({ type: "ticket", title: "A", status: "todo", labels: ["x"] });
  const b = await store.createItem({ type: "ticket", title: "B", status: "verifying", labels: ["y"] });
  await store.setDoc(b.id, "proof", "Evidence.");
  await store.moveItem(b.id, { status: "done" });
  expect((await store.listItems({ status: "done" })).length).toBe(1);
  expect((await store.listItems({ label: "x" })).length).toBe(1);
});
```

(The alternative — retarget the filter to a non-final stage — weakens what the test covers; do not take it.)

**New tests**, next to the existing proof-gate test (`store.test.ts:455-463`):
- `it("refuses to create a ticket directly in the final stage")` — `rejects.toThrow(/final stage.*set_ticket_doc/s)`.
- `it("still allows creating into any non-final stage, and the default stage")`.
- `it("does not gate creation on a single-stage board")`.

**Verify:** `npm test`; then in Phase 7 grep `smoke.mjs` for any `create_item`/`create_items` call carrying a final-stage `status` — from the read at `7706a20` there is none, but **verify, do not assume**.

---

## Phase 2 — Migration + format detection (#9, #1 belt, #8, #2)

This whole phase rewrites `migrate.ts:139-186` once. Write it as a single edit pass, not three.

### 2.1 Pre-flight destination collision check (#1, migrate half)

**Files:** `packages/core/src/migrate.ts`

**Change:** Add a `blockers: string[]` field to `MigrationReport` (`migrate.ts:12-26`) and to `emptyReport()` (`:28-38`). Immediately after the report-shaping block ends (`migrate.ts:133`) and **before** the `if (dryRun) return report;` at `:139`, compute planned destination paths and refuse to proceed when two different source ids target the same file:

```ts
const claimedBy = new Map<string, string>();          // destFile -> source id
const claim = (destFile: string, sourceId: string) => {
  const holder = claimedBy.get(destFile);
  if (holder !== undefined && holder !== sourceId) {
    report.blockers.push(
      `"${sourceId}" and "${holder}" would both be written to ${destFile}. ` +
      `Two id prefixes on this board produce the same id — fix board.yml (idPrefixes / area ` +
      `prefixes must all be distinct) or rename one item, then migrate again.`);
    return false;
  }
  claimedBy.set(destFile, sourceId);
  return true;
};
```

Walk `tickets` (dest = `ticketDirIn(...)/<id>.md`, same computation as the move loop at `:152`) then `conversions` (dest computed as at `:176-177`) through `claim()`. This is the pair that produced the validated data loss: the move loop renames the ticket to `areas/_none/FOO-001/FOO-001.md` (`:151-155`) and the conversion loop `writeFileAtomic`s the orphan plan to **the same path** (`:177-184`).

Then, still before the dry-run return:

```ts
if (report.blockers.length > 0) {
  if (dryRun) return report;                       // the modal shows them; the button is disabled
  throw new Error(`Migration refused:\n- ${report.blockers.join("\n- ")}`);
}
```

Keep a **last line of defence** in the conversion loop as well: before `writeFileAtomic` at `:184`, `if (claimedBy.get(destFile) !== c.id) { report.notes.push(...); continue; }` — so no code path can ever overwrite a file this run already wrote, even if the pre-flight is later refactored.

**Why blockers and not a bare throw:** the dry run at `App.tsx:484` is what the user sees first. A dry run that reports a fatal collision is far better than a dry run that promises success and a real run that eats a ticket. **If this turns out bigger than scoped** (e.g. the type flow through `shared/ipc.ts` fights you), fall back to: no `blockers` field, throw from `migrateToV2` in both dry and real mode, and rely on the `.catch` added in 5.4. Say so in the commit message if you take the fallback.

**Siblings in scope:** the conversion loop's dest guard (above).
**Out of scope:** the fold loop's target (`:160`) — it writes `plan.md`/`research.md` inside a ticket folder, which no ticket file can collide with.

**Test:** new file `packages/core/src/migrate.test.ts` — `it("refuses to migrate a board whose id prefixes collide, without moving anything")`. Hand-build a v1 tree (copy the fixture shape from `store.test.ts:620-679`) with `idPrefixes: { ticket: FOO, plan: FOO, research: RES }`, a ticket `FOO-001` ("THE REAL TICKET") and an **orphan** plan `FOO-001`. Assert: the dry run returns `blockers.length === 1`; the real run rejects; `listItems()` still returns 2 items; `readText(tickets/FOO-001.md)` still contains "THE REAL TICKET".

**Verify:** `npm test`.

---

### 2.2 Make all three loops check-before-act (#9)

**Files:** `packages/core/src/migrate.ts`

**Change:** The trap is entered by a failure in *any* of the three loops (validated), so all three get the same treatment. Nothing here throws on "already done".

**Move loop (`:151-155`)** — replace the body:

```ts
for (const t of tickets) {
  const dir  = ticketDirIn(paths, ticketDest.get(t.id) === NO_AREA_DIR ? "" : t.area ?? "", t.id);
  const dest = path.join(dir, `${t.id}.md`);
  const src  = legacyFile(t);
  const destExists = await pathExists(dest);
  const srcExists  = await pathExists(src);
  if (destExists && srcExists) {
    report.notes.push(`${t.id} already exists at its v2 location; the legacy copy at ` +
      `${path.relative(paths.kanmer, src)} was left in place — compare and delete it by hand.`);
    resumed = true; continue;                 // never overwrite
  }
  if (destExists) { resumed = true; continue; }             // a prior run moved it
  if (!srcExists) {
    report.notes.push(`${t.id} has no file at either its legacy or its v2 location — skipped.`);
    continue;                                               // note, don't ENOENT
  }
  await fs.mkdir(dir, { recursive: true });
  await fs.rename(src, dest);
}
```

**Fold loop (`:157-172`)** — the resume hazard here is *content duplication*, not `ENOENT`: on a normal resume the folded doc is already deleted so it never re-enters `folds`, but a crash between `writeFileAtomic(target)` (`:164`/`:169`) and `fs.rm(legacyFile)` (`:171`) leaves both, and the re-run appends the same content below a separator. Guard inside the existing `if (await pathExists(target))` branch: if `existing.includes(content.trim())`, push a resume note, `fs.rm` the legacy source, and `continue` **without** re-appending.

**Conversion loop (`:174-186`)** — before writing, if `await pathExists(destFile)`, parse it (`parseItem(await readText(destFile))`) and if its `id === c.id` and its `labels` already include `label`, push a resume note, `fs.rm` the legacy source, and `continue`. (The cross-id case is already refused by 2.1's `claimedBy` guard.)

Add `let resumed = false;` above the loops and, after them, `if (resumed) report.notes.push("This run resumed a previously interrupted migration — already-migrated items were left as they were.")` so the user learns the run was a resume.

**Do not** change `detectFormat()`'s v1 fallback (`store.ts:121`) — "legacy dir present" is a reasonable heuristic and the bot framed its answer as a symptom. **Do not** introduce staging/transactions — that doubles the failure surface and contradicts the store's deliberate crash-safe-by-construction posture (`AGENTS.md:348-354`).

**Siblings in scope:** all three loops (a fix scoped to `migrate.ts:151-155` leaves two live trapping paths — proven).
**Out of scope:** the legacy-dir cleanup (`:190-200`) and the counters re-key (`:202-212`) are already tolerant of partial state.

**Test:** `packages/core/src/migrate.test.ts`:
- `it("resumes a migration interrupted between two ticket renames")` — hand-assemble the half-migrated tree from the verdict: `.kanmer/areas/api/TICK-001/TICK-001.md`, `.kanmer/tickets/TICK-002.md`, `.kanmer/data/board.yml`, **no** `version.json`. Assert `detectFormat() === 1` before; `migrateToV2(store)` resolves (no `ENOENT`); after it, `version.json` exists with `{format:2}`, `listItems()` returns both ids, both files live under `areas/`, and `report.notes` contains a resume note.
- `it("resumes a migration interrupted inside the fold loop without duplicating content")` — ticket moved to `areas/api/TICK-001/`, `plan.md` already written with the folded content, legacy `plans/PLAN-001.md` still present. Assert the resulting `plan.md` contains `"# Legacy plan"` exactly once (`text.split("# Legacy plan").length === 2`).
- `it("does not lose un-migrated tickets when the legacy dir is deleted by hand")` — **the destructive-workaround guard.** Assert the *preventive* half: after the resumable run completes, `.kanmer/tickets/` is gone and both tickets survive — i.e. the user never has a reason to reach for the workaround. Add a one-line comment in the test naming the workaround it exists to make unnecessary.

**Verify:** `npm test`.

---

### 2.3 Sweep folded ids out of `links[]` / `blocks[]` (#8)

**Files:** `packages/core/src/migrate.ts`

**Change:** Insert a sweep **after** the conversion loop (`:186`) and **before** the legacy-dir cleanup (`:188`) — it must run after the move/fold/conversion loops so `store.updateItem` resolves items at their final v2 paths.

```ts
const foldedIds = new Set(folds.map((f) => f.doc.id));
if (foldedIds.size > 0) {
  const cleaned: string[] = [];
  const bodyRefs: string[] = [];
  // Mirrors deleteItem's cleanup (store.ts:790-801) deliberately, rather than sharing code:
  // extracting a helper would mean refactoring the store's most-exercised destructive path.
  for (const item of await store.listItems({ includeArchived: true })) {
    const links  = (item.links  ?? []).filter((l) => !foldedIds.has(l));
    const blocks = (item.blocks ?? []).filter((b) => !foldedIds.has(b));
    const patch: UpdateItemPatch = {};
    if (links.length  !== (item.links  ?? []).length) patch.links  = links;
    if (blocks.length !== (item.blocks ?? []).length) patch.blocks = blocks;
    if (Object.keys(patch).length > 0) { await store.updateItem(item.id, patch); cleaned.push(item.id); }
    if (parseWikiLinks(item.body).some((id) => foldedIds.has(id))) bodyRefs.push(item.id);
  }
  if (cleaned.length)  report.notes.push(`Removed folded ids from links/blocks on: ${cleaned.join(", ")}.`);
  if (bodyRefs.length) report.notes.push(`[[wiki]] mentions of folded documents were left as prose in: ${bodyRefs.join(", ")}.`);
}
```

Cover **`blocks[]` as well as `links[]`** — the fixture only exercises `links`, but the asymmetry would be arbitrary and `blocks` is what feeds the dependency graph. Follow `deleteItem`'s precedent on bodies: leave `[[wiki]]` mentions as prose, report them (`types.ts:192`).

`parseWikiLinks` is already imported (`migrate.ts:6`); `UpdateItemPatch` needs adding to the type import at `:10`.

**Siblings in scope:** none — `conversions` survive as tickets, so their ids must **not** be stripped. Only `folds` produce a vanished id.
**Out of scope:** extracting `cleanReferencesTo()` shared with `deleteItem` — filed as a deferred tidy-up.

**Test:** extend the existing round-trip at `store.test.ts:708-756`, using the assertion the suite already makes for the sibling path at `:302`:

```ts
expect((await v1store.getItem("TICK-001"))?.links).not.toContain("PLAN-001");
```

Add it after the `planDoc` assertions at `:731-733`. Add one more in `migrate.test.ts`: `it("strips folded ids from blocks[] too")` — fixture where `TICK-001.blocks: [PLAN-001]`; assert `blocks` is empty after migration.

**Verify:** `npm test`.

---

### 2.4 Invalidate the format cache on evidence (#2)

**Files:** `packages/core/src/store.ts`, `packages/core/src/io.ts`

**Change:** Keep the cache; key it to `version.json`'s stat signature, and **do not cache at all when `version.json` is absent** — that absent case is exactly #9's half-migrated board, where the answer can change under you and the derivation is two cheap syscalls anyway.

Replace `formatCache: 1 | 2 | null` (`store.ts:83`) with `private formatCache: { format: 1 | 2; stamp: string } | null = null;` and rewrite `detectFormat()` (`:116-127`):

```ts
async detectFormat(): Promise<1 | 2> {
  // version.json is authoritative. Cache it, but re-stat first: a second process
  // (the GUI) can migrate the board underneath a long-lived MCP server, and the
  // GUI's resetFormatCache() cannot reach that server's instance.
  const st = await statOrNull(this.paths.versionFile);
  if (st === null) {
    this.formatCache = null;                       // half-migrated / v1 / fresh: never cache
    if (await pathExists(this.paths.tickets)) return 1;
    return 2;
  }
  const stamp = `${st.mtimeMs}:${st.size}`;
  if (this.formatCache && this.formatCache.stamp === stamp) return this.formatCache.format;
  const version = await readVersion(this.paths);
  const format: 1 | 2 = version && version.format >= 2 ? 2 : 1;
  this.formatCache = { format, stamp };
  return format;
}
```

Add `statOrNull` to `packages/core/src/io.ts` next to `pathExists` (`io.ts:9-16`): `fs.stat` in a try, `null` on throw. Keep `resetFormatCache()` (`:129-132`) and its call at `migrate.ts:219` — it is still correct and still cheap.

Cost: one `fs.stat` per `detectFormat()` call. `createItem` calls it once, `init()` once, `get_status` once. Do **not** wire the MCP watcher (`ensureSubscriptionWatcher`, `index.ts:741-755`) — it starts lazily and only for subscribed resources, so it would need an unconditional start; the re-stat is more robust and has no lifecycle.

**Change 2 — the id backstop (the wider surface the verdict calls for).** In `createItem`'s allocation loop (`store.ts:462-505`), after computing `const id = formatId(prefix, n);` (`:468`) and **before** building the item, add:

```ts
// Never hand back an id that already resolves somewhere on disk. Exclusive create
// only locks one path, so it cannot see the same id living in another layout or
// another area folder — which is how a stale format cache re-issued TICK-001.
if (await this.locateItem(id)) { lastTried = n; continue; }
```

Apply it for **both** formats: for format 2 it also hardens the pre-existing TICK-fallback race documented at `AGENTS.md:346`. Cost is one `readdir` of `areasRoot` plus a few `stat`s per create attempt — creates are rare.

**Siblings in scope:** the GUI's own `format` staleness — `refresh()` (`App.tsx:61-73`) never re-fetches `format` even though `onDiskChange` calls it specifically for `version.json` (`App.tsx:158`). Fixed in 5.4.
**Out of scope:** an MCP `migrate` tool (there is none — deferred).

**Test:** append to `store.test.ts` inside `describe("format v1 compatibility")`:
- `it("a second store instance sees the new format after another instance migrates")` — build the v1 fixture, `const a = new KanmerStore(v1root); const b = new KanmerStore(v1root);` → `await a.detectFormat()` (caches 1) → `await migrateToV2(b)` → `expect(await a.detectFormat()).toBe(2)`.
- `it("does not re-issue an id that already exists in the other layout")` — on the migrated board, force the v1 path by hand: create `.kanmer/tickets/` (empty) and stamp a `version.json` with `{format:1}`, then `createItem({type:"ticket",title:"New"})` and assert the returned id is **not** an id already returned by `listItems()`.

**Verify:** `npm test`.

---

## Phase 3 — Core write-path freshness (#6, #3 core half)

### 3.1 Validate a positioned move before materialising order (#6)

**Files:** `packages/core/src/store.ts`

**Change:** In `moveItem` (`:585-593`), run the rejections **before** `computeOrder`. Extract the conflict error so both call sites share one message.

```ts
private conflictError(id: string, current: Item, expectedUpdated: string): Error {
  const { body: _body, ...frontmatter } = current;
  return new Error(`Conflict: "${id}" changed since you read it (updated is now ${current.updated}, ` +
    `you expected ${expectedUpdated}). Re-read the item and re-apply your change. ` +
    `Current frontmatter: ${JSON.stringify(frontmatter)}`);
}
```

Use it at `updateItem:522-529` (text unchanged — do not alter the wording, `store.test.ts:188-190` and `smoke.mjs` match on `/Conflict/`) and in a new private:

```ts
/** Every rejection moveItem can suffer, run before computeOrder writes anything. */
private async assertMoveAllowed(id: string, status: string, expectedUpdated?: string): Promise<void> {
  const loc = await this.locateItem(id);
  if (!loc) throw new Error(`No item with id "${id}"`);
  const current = parseItem(await readText(loc.file));
  if (expectedUpdated !== undefined && current.updated !== expectedUpdated) {
    throw this.conflictError(id, current, expectedUpdated);
  }
  const board = await this.getBoard();
  assertFieldAgainstBoard(board, "status", status);
  if (status !== current.status && current.type === "ticket" && loc.kind === "v2") {
    await this.assertProofGate(loc.dir, board, id, status);
  }
}
```

and in `moveItem`, between `if (position === undefined) …` and `computeOrder`:
`await this.assertMoveAllowed(id, to.status, to.expectedUpdated);`

Leave the final `updateItem` re-check exactly as it is — it is cheap and it closes the window between the two reads.

**Siblings in scope:** the proof-gate rejection path (the scope escalation the verdict found — this is *not* only about `expectedUpdated`; an unproven move to the final stage produced the identical sibling damage).
**Out of scope:** making `materialise()` (`:607-614`) transactional or deferring its writes — those writes are legitimate backfill that must persist once the move proceeds, and staging them means a rollback path in a store that deliberately has none. Also out of scope: the second-order case (a legitimate conflict *caused* by `materialise`) — it disappears once the pre-check stops the common path reaching `materialise` at all.

**Test:** append to `store.test.ts` after the ordering test at `:578-602`:
- `it("a rejected positioned move leaves the target column's siblings untouched")` — create 3 unordered tickets in `planning` + 1 in `todo`; capture the 3 siblings' `updated`; mutate the target so `expectedUpdated` goes stale; `await expect(store.moveItem(t.id, {status:"planning", position:"top", expectedUpdated: stale})).rejects.toThrow(/Conflict/)`; then assert every sibling's `order === undefined` **and** its `updated` is unchanged, and that `(await store.getActivity()).filter(e => e.field === "order").length === 0`.
- `it("a proof-gated positioned move leaves the final stage's siblings untouched")` — the proof-gate variant with no `expectedUpdated` at all: two proven tickets in `done` (unordered), move a proofless one to `done` with `position:"top"`; assert rejection and that neither `done` occupant gained an `order`.

**Verify:** `npm test`; `smoke.mjs:417-424` (`position: "top"`) must still pass unchanged.

---

### 3.2 Optimistic concurrency for pipeline documents (#3, core)

**Files:** `packages/core/src/io.ts`, `packages/core/src/store.ts`, `packages/core/src/types.ts`

This is the largest fix in the pass. Put the mechanism **in core**, not the GUI: `apps/gui` has zero test files, the MCP side is identically unguarded, and agent-over-GUI is as possible as GUI-over-agent.

**Change:**

1. `io.ts` — add

```ts
import { createHash } from "node:crypto";
/** Version token for a document's exact bytes. Content-hashed, not mtime:
 *  immune to coarse mtime granularity and to writeFileAtomic's rename. */
export function contentVersion(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}
```

2. `store.ts` — add alongside `getDoc` (`:707-715`), leaving `getDoc`'s signature **unchanged** so no existing caller breaks:
   `async getDocWithVersion(id, doc): Promise<{ content: string | null; version: string | null }>`
   Same location logic as `getDoc`; `version = content === null ? null : contentVersion(content)`. On a legacy (`kind !== "v2"`) item both are `null`, matching `getDoc`.

3. `store.ts` — `setDoc` (`:722-746`): widen options to `{ append?: boolean; expectedVersion?: string | null }` and change the return type from `Promise<void>` to `Promise<{ version: string }>`.
   - Semantics of `expectedVersion`: `undefined` → no check (last-write-wins; exactly how `expectedUpdated` is opt-in on `updateItem`, `types.ts:182`). `null` → the caller expects the file **not to exist**. A string → the caller expects those exact bytes.
   - Check placement: after `locateItem` and the `kind === "v2"` guard, immediately before `writeFileAtomic` (`:742`), read the current file (or note its absence) and compare. Mismatch throws:
     `` `Conflict: ${doc}.md on "${id}" changed since you read it. Re-read it with get_ticket_doc and re-apply your change.` ``
   - Return `{ version: contentVersion(text) }` where `text` is exactly what was written (already `${content.trim()}\n`, or the appended form) — so the caller's token stays accurate across the normalisation.
   - Order matters: for `append: true`, the existing file is read once; reuse that read for both the version check and the append.

4. `types.ts` — no schema change needed; add a `SetDocOptions` interface if it improves the signature, otherwise inline.

**Siblings in scope:** MCP `set_ticket_doc` / `get_ticket_doc` (Phase 4) and the GUI (Phase 5) — this is the "thread it through all three callers" instruction, and skipping the MCP side leaves agent-over-agent unguarded.
**Out of scope:** doc-granular `ownWrites` (`main/index.ts:233-236`) — toast-suppression cosmetics; `getTicketDocsInfo` carrying a version marker.

**Test:** append to `store.test.ts` near the existing doc tests (`:413-419`, `:460`, `:473`):
- `it("setDoc rejects a stale expectedVersion and leaves the file alone")` — `setDoc(id,"research","A")` → capture `version` → `setDoc(id,"research","B")` (agent's newer write) → `await expect(store.setDoc(id,"research","C",{expectedVersion: staleVersion})).rejects.toThrow(/Conflict/)` → `expect(await store.getDoc(id,"research")).toContain("B")`.
- `it("setDoc accepts a fresh expectedVersion")` — round-trip `getDocWithVersion` → `setDoc(..., {expectedVersion: version})` resolves, and the returned `version` equals `(await store.getDocWithVersion(...)).version`.
- `it("expectedVersion: null means the document must not exist yet")` — succeeds on an absent doc; rejects once it exists.
- `it("append honours expectedVersion")` — stale token + `append: true` rejects and the file is unchanged.
- `it("setDoc without expectedVersion is still last-write-wins")` — the back-compat guard for every existing caller.

**Verify:** `npm test`.

---

## Phase 4 — MCP surface + tool reference (#3 wire-through, A3)

### 4.1 Expose the doc version on the two doc tools

**Files:** `packages/mcp-server/src/index.ts`

**Change:**
- `get_ticket_doc` (`index.ts:309-325`): call `store.getDocWithVersion(id, doc)` and return `ok({ id, doc, exists: content !== null, content, version })`. Extend the description with: *"`version` is a token for the document's current bytes — pass it back as `expected_version` on `set_ticket_doc` to be rejected instead of overwriting a concurrent edit."*
- `set_ticket_doc` (`index.ts:527-548`): add to `inputSchema`

```ts
expected_version: z.string().optional().describe(
  "Optimistic concurrency: the `version` you last read from get_ticket_doc. " +
  "Rejected as a conflict if the document changed since. Omit for last-write-wins."),
```

  Handler: `const { version } = await store.setDoc(id, doc, content, { append, expectedVersion: expected_version });` and return `ok({ id, doc, written: true, appended: append === true, version })`. Extend the description with the same one-sentence contract.

Tool **names** are unchanged, so `plugin:check`'s name diff stays green throughout.

**Siblings in scope:** none — `get_item` (`:290-307`) merges `getTicketDocsInfo` and carries no doc content.
**Out of scope:** adding a `migrate` MCP tool (deferred).

**Test:** `packages/mcp-server/src/smoke.mjs`, in the doc block around `:180-210`:

```js
check("get_ticket_doc returns a version token", typeof researchDoc.version === "string" && researchDoc.version.length > 0);
```

then a stale-version write:

```js
// write once more so the token goes stale, then try to save with the old one
const conflicted = await client.callTool({ name: "set_ticket_doc",
  arguments: { id: "TICK-002", doc: "research", content: "Clobber", expected_version: staleVersion } });
check("set_ticket_doc rejects a stale expected_version", conflicted.isError === true && textOf(conflicted).includes("Conflict"));
check("set_ticket_doc left the newer content in place", /* re-read includes the newer text */);
```

This raises the smoke count from 62; update any hardcoded expectation and report the new number in the commit message.

**Verify:** `npm run build && node packages/mcp-server/src/smoke.mjs`.

---

### 4.2 Fix the stale item-model section in the tool reference (A3)

**Files:** `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md`

**Change 1 — replace the whole `## Item types` section (lines 74-83)** with:

````markdown
## Item types

Format-2 boards store **tickets only**. A ticket is a folder:

    .kanmer/areas/<area|_none>/<ID>/<ID>.md      ← the ticket itself
                                   research.md impact.md plan.md
                                   checklist.md proof.md

| Type | Where it lives | Id prefix | Use for |
|---|---|---|---|
| `ticket` | `areas/<area\|_none>/<ID>/<ID>.md` | the area's `prefix`, else `idPrefixes.ticket` (`TICK`) | A unit of work that appears on the board |
| `plan` | **retired** — use `set_ticket_doc(doc: "plan")` | `PLAN` (legacy ids only) | Format-1 boards only |
| `research` | **retired** — use `set_ticket_doc(doc: "research")` | `RES` (legacy ids only) | Format-1 boards only |

`create_item` with `type: "plan"` or `"research"` is **rejected on format-2 boards** — those
live inside a ticket folder as documents. Unmigrated format-1 boards still accept them.
Call `get_status` to see which format a board uses.
````

This also removes the self-contradiction with `tool-reference.md:23` and with the live tool description at `mcp-server/src/index.ts:402`.

**Change 2 —** add the missing field bullets to `## Field semantics`: `due`, `order`, `blocks`, and `taken_at`/`branch`/`worktree`. One line each, matching the existing bullet style.

**Change 3 —** add `expected_version` to the `set_ticket_doc` row's Key-params column and note `version` on `get_ticket_doc`, per the standing rail obligation at `phase-8-skills-plugin-docs/plan.md:44`.

**Not fixed, deliberately:** `check-plugin-sync.mjs` truncates the document at `## Field semantics` (`:32-35`) precisely so field names aren't mistaken for tools, and any regex that made the prose below machine-checkable would be brittle enough to cause false failures. Record the limitation in `AGENTS.md` §7 instead.

**Verify:** `npm run plugin:check` must still print "20 tools match" — the truncation point is unchanged.

---

### Phase 4.3 — A4: correct the record, prove the `_meta` path, run the back-compat check (**new**)

**What is achievable and what is not, stated plainly.** The SDK genuinely caps at protocol `2025-11-25` (`SUPPORTED_PROTOCOL_VERSIONS` in `node_modules/@modelcontextprotocol/sdk/dist/esm/types.js`, zero occurrences of `2026-07-28`). **Nothing in this repo can make the 2026-07-28 revision exist**, and inventing support would be worse than the current overstatement. What *is* achievable:

1. **The `_meta` branch is not dead — it is un-sent-to.** `shared/protocol.js:321` sets `extra._meta = request.params?._meta`, so the server half of `actorName` (`mcp-server/src/index.ts:68-76`) is live on *any* protocol; it is only that no `2025-11-25` client emits `io.modelcontextprotocol/client`. The adherence review's "unreachable under any negotiable protocol" is too strong about the server. **This gets proven with a hand-written frame rather than asserted.** The branch **stays** — two property reads, and it is the forward path.
2. **The back-compat protocol run the plan named** (`phase-3-mcp-surface/plan.md:39`) **gets written and run.** The SDK `Client` hardcodes `LATEST_PROTOCOL_VERSION` in its `initialize` (`client/index.js:285`), so it cannot pin an older version — the check must speak raw JSON-RPC over stdio. ~80 lines, no SDK support needed.

**Files:** `packages/mcp-server/src/index.ts`, new `packages/mcp-server/src/smoke-protocol.mjs`, root `package.json`, `AGENTS.md`

**Change 1 — honest comment.** Rewrite `actorName`'s JSDoc (`index.ts:63-67`):

```
/**
 * Who is calling: the per-request `_meta` client identity, else the clientInfo
 * negotiated at initialize, else "agent".
 *
 * The `io.modelcontextprotocol/client` key is the 2026-07-28 spec's client-identity
 * carrier. SDK 1.30 negotiates at most protocol 2025-11-25 and no 2025-11-25 host
 * sends that key, so in practice today the actor comes from getClientVersion().
 * The branch is kept deliberately (it is the forward path, and the SDK does deliver
 * params._meta to handlers on every protocol) and is exercised by smoke-protocol.mjs.
 */
```

Also amend the `2026-07-28 note:` comment in `main()` to say the whole revision — not just cacheable lists — is unavailable in SDK 1.30.

**Change 2 — `packages/mcp-server/src/smoke-protocol.mjs`.** Same conventions as `smoke.mjs`: `KANMER_SERVER` / `KANMER_NODE` env overrides, `check(name, cond, detail)` accumulator, PASS/FAIL lines, `process.exit(failed ? 1 : 0)`. No SDK import — `child_process.spawn` plus a newline-delimited JSON-RPC reader.

```
for (const proto of ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]) {
  spawn(runner, [serverEntry, "--root", freshSandbox], { env: runnerEnv, stdio: ["pipe","pipe","pipe"] })
  send  {id:1, method:"initialize", params:{ protocolVersion: proto,
          capabilities:{}, clientInfo:{ name:"smoke-oldproto", version:"0.0.0" } }}
  check `initialize succeeds on ${proto}` — no error member, and
        SUPPORTED.includes(result.protocolVersion)          // server may echo or downgrade
  check `serverInfo names kanmer`
  notify {method:"notifications/initialized"}
  send  {id:2, method:"tools/list"} → check 20 tools
  send  {id:3, method:"tools/call", params:{name:"create_item", arguments:{title:"proto probe"}}}
  send  {id:4, method:"tools/call", params:{name:"get_activity", arguments:{}}}
  check `actor falls back to clientInfo on ${proto}` — every entry's actor === "smoke-oldproto"
  kill; rm sandbox
}
// Then, on the newest protocol only: the forward path.
send {id:5, method:"tools/call", params:{
       name:"create_item", arguments:{ title:"meta probe" },
       _meta:{ "io.modelcontextprotocol/client": { name:"future-host" } } }}
send {id:6, method:"tools/call", params:{ name:"get_activity", arguments:{} }}
check "per-request _meta client identity overrides clientInfo"
      — the newest entry's actor === "future-host"
```

Those last two checks are the point: they turn *"forward-looking but dead as shipped and nothing says so"* into *"forward-looking, documented as such, and covered by a check that fails the day the plumbing regresses."*

Reader note: the server writes `kanmer-mcp ready — root: …` to **stderr** and only protocol frames to stdout (`AGENTS.md` §7), so parse stdout strictly line-by-line and surface stderr only on failure.

**Change 3 — scripts.** Root `package.json`: `"smoke:protocol": "node packages/mcp-server/src/smoke-protocol.mjs"`. Add an `AGENTS.md` §6 row and a §10 step.

**Test:** the script *is* the test. **Verify:**

```
npm run build && node packages/mcp-server/src/smoke-protocol.mjs
KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke-protocol.mjs
```

Expected: every protocol version initializes, lists 20 tools, and attributes the actor from `clientInfo`; the `_meta` probe attributes `future-host`. **If the `_meta` probe fails**, that is a real finding — report it, do *not* delete the branch to make the check pass; it would mean the SDK does not forward `params._meta` for `tools/call` on this version, and the honest outcome is a §11 bullet saying so.

---

## Phase 5 — GUI (#5, #4, #3 renderer half, #1 mirror, format staleness)

### 5.1 Render wiki links as real links, without reopening raw HTML (#5)

**Files:** `apps/gui/src/renderer/src/lib/markdown.ts` (33 lines, two callers, no bundled copies)

**Change:** Stop pre-substituting into the raw string. Register a **`marked` inline extension** so `[[…]]` is recognised during *tokenization* and emitted as a proper anchor by the extension's renderer. This fixes both defects by construction: code spans and fenced blocks are tokenized before inline extensions see them, so `` `[[API-001]]` `` stays literal for free, and **no raw HTML is ever produced for the `html` override to see** — the Phase 4 escaping stays exactly as strict as today.

Shape (marked 14.1.4 is installed; `Marked` and `TokenizerAndRendererExtension` are exported):

```ts
import { Marked } from "marked";

const WIKILINK_RE = /^\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/;   // ANCHORED — inline extensions
                                                            // are called at the current offset

// renderMarkdown is synchronous end to end (async:false), so a module-scoped
// "current known ids" is safe — no two parses can interleave.
let currentKnownIds: Set<string> = new Set();

const wikiLink: TokenizerAndRendererExtension = {
  name: "wikilink",
  level: "inline",
  start(src) { return src.indexOf("[["); },
  tokenizer(src) {
    const m = WIKILINK_RE.exec(src);
    if (!m) return undefined;
    const id = m[1].trim();
    if (!id) return undefined;
    return { type: "wikilink", raw: m[0], id, label: (m[2] ?? m[1]).trim() };
  },
  renderer(token) {
    const cls = currentKnownIds.has(token.id) ? "wikilink" : "wikilink missing";
    // We generate this markup, so we escape it ourselves — id goes into an
    // attribute, label into text; neither may inject.
    return `<a href="kanmer:${escapeHtml(token.id)}" class="${cls}">${escapeHtml(token.label)}</a>`;
  },
};

const md = new Marked({
  extensions: [wikiLink],
  renderer: { html: ({ text }) => escapeHtml(text) },   // unchanged Phase 4.5 behaviour
});

export function renderMarkdown(body: string, knownIds: Set<string>): string {
  currentKnownIds = knownIds;
  return md.parse(body, { async: false }) as string;
}
```

Keep `escapeHtml` (`:5-11`) as-is. Use a dedicated `Marked` instance rather than `marked.use()` so no global renderer state is mutated. Keep the explanatory comment at `:13-15` and add one sentence saying wiki links are now tokens, not spliced HTML.

**Siblings in scope:** both callers (`Editor.tsx:538` ticket-body preview and `Editor.tsx:782` doc preview) — they need no change; the click handlers (`Editor.tsx:289-298`, `:774-781`) were always written for real anchors and simply had nothing to bind to.
**Out of scope, stated:** the checklist tab (`Editor.tsx:742-768`) parses lines to JSX itself and never calls `renderMarkdown`, so it will still show literal `[[ID]]` — documented. The twice-written click handler is a tidy-up, not part of this.

**Test — this needs a test harness `apps/gui` does not have.** Add one, scoped strictly to renderer-pure modules:
1. `apps/gui/package.json` — add `"vitest": "^2.1.0"` to `devDependencies` and `"test": "vitest run"` to `scripts`. Run `npm install` (updates `package-lock.json`). Vitest is already hoisted at the repo root, but declare it — workspace hoisting is not a contract.
2. New file `apps/gui/src/renderer/src/lib/markdown.test.ts`, importing `{ describe, expect, it } from "vitest"` (explicit imports, matching `store.test.ts:1`). Cases, drawn from the verdict's thirteen:
   - `it("renders an inline wiki link as a live anchor")` — contains `<a href="kanmer:API-001" class="wikilink">API-001</a>`.
   - `it("marks an unknown id as missing")` — `class="wikilink missing"`.
   - `it("honours the [[id|alias]] label")`.
   - `it("linkifies in headings, list items and blockquotes")`.
   - **`it("leaves a wiki link inside a code span literal")`** — `` renderMarkdown("Reference it as `[[API-001]]` in prose.", ids) `` contains `<code>[[API-001]]</code>` and **not** `href="kanmer:`. *This is the second-defect guard; without it a naive escaping fix regresses.*
   - **`it("leaves a wiki link inside a fenced block literal")`** — same assertion for a fenced block; assert no `<a ` appears inside the `<pre>`.
   - **`it("still escapes body-authored raw HTML")`** — `Hello <img src=x onerror="alert(1)">` renders as `&lt;img` with no live tag. *This is the non-regression guard for Phase 4.5.*
   - `it("escapes an alias containing markup")` — `[[API-001|<b>x</b>]]` must not emit a live `<b>`.
3. Root `package.json` — change `"test"` to `"npm run test -w @kanmer/core && npm run test -w @kanmer/gui"` so the merge gate can't forget it, and update `AGENTS.md` §6 and §10 item 1 accordingly.

**Conservative fallback if adding a dep is unwelcome:** skip steps 1 and 3, keep the test file out, and substitute the manual check — a throwaway node script that imports the built `renderMarkdown` and prints all thirteen cases from the verdict (`pr-2-comments.md:1220-1265`), pasted into the commit message. State in the commit which route you took. **Recommendation: add the harness** — it is one dep, one script and one file, and it is the only way any of the three GUI findings gets a regression test.

**Verify:** `npm run test -w @kanmer/gui`; `npm run typecheck -w @kanmer/gui`; `npm run build -w @kanmer/gui`; then the manual check — open a project, put `[[TICK-001]]` and `` `[[TICK-001]]` `` in a ticket body, preview: the first is a clickable blue link that navigates, the second is literal text in a code span.

---

### 5.2 Guard document-tab switches (#4)

**Files:** `apps/gui/src/renderer/src/components/Editor.tsx`

**Change:** Guard at the **tab** level, where the loss happens, rather than stretching `trySelect` (which is about *item* selection) down a level.

In `Editor` (state block around `:107-116`) add `const [pendingTab, setPendingTab] = useState<"ticket" | TicketDoc | null>(null);` and:

```ts
const tryTab = (next: "ticket" | TicketDoc) => {
  if (next !== tab && docDirty) setPendingTab(next);
  else setTab(next);
};
```

Wire **both** buttons — `Editor.tsx:384` (`onClick={() => setTab("ticket")}`) and `:392` (`onClick={() => setTab(d.key)}`) become `tryTab(...)`. The Ticket button loses the same text by a different route (`{tab !== "ticket" ? <DocEditor/> : …}` at `:430` unmounts via the conditional rather than a key change) — it is outside the bot's cited line range and **is in scope**.

Render a confirm modal after the existing `conflict` banner (`:406-427`), reusing `App.tsx:625-646`'s markup and CSS classes verbatim (`modal-backdrop` / `modal confirm` / `role="alertdialog"` / `confirm-actions`), text `Discard changes to {item.id} {tab}.md?`, buttons **Keep editing** (`setPendingTab(null)`) and **Discard** (`setDocDirty(false); setTab(pendingTab); setPendingTab(null);`). Setting `docDirty` false first avoids a window where the outer `dirty` (`:170`) is still true after the switch.

**Siblings in scope:** the Ticket tab button (`:382-387`).
**Out of scope, with reasons stated in the plan-doc amendment:** delete-while-open (`App.tsx:326`) and archived-view delete (`:544`) call `setSelectedId` directly **and should keep doing so** — the item has just been deleted; prompting "discard changes?" for a ticket that no longer exists would strand the user in a modal with nothing to save to. Open-project / open-recent (`App.tsx:83`, `:232`) *is* a genuine unguarded loss, but `trySelect`/`pendingNav` cannot stop it (the deferral only re-targets `selectedId`; the root, board and items are swapped regardless) — it needs a project-switch confirm of its own → deferred.

**Test:** none — `apps/gui` has no component-test harness and adding one (jsdom + Testing Library + React) is out of proportion. **Manual check that substitutes:** open a ticket, go to Research, type into the editor, click Plan → the confirm appears and "Keep editing" leaves the text intact; "Discard" switches and the text is gone. Repeat with the **Ticket** tab button. Then confirm the guard does *not* fire when not editing. Record the result in the commit message.

**Verify:** `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, plus the manual check above.

---

### 5.3 Version-check document saves in the renderer (#3, GUI half)

**Files:** `apps/gui/src/shared/ipc.ts`, `apps/gui/src/main/index.ts`, `apps/gui/src/preload/index.ts`, `apps/gui/src/renderer/src/components/Editor.tsx`

**Change:**
1. **IPC contract** (`shared/ipc.ts`, `KanmerApi` around `:138-142`):
   - `getDoc(id, doc): Promise<{ content: string | null; version: string | null }>` — one caller, so widening in place is cleaner than adding a channel.
   - `setDoc(id, doc, content, opts?: { append?: boolean; expectedVersion?: string | null }): Promise<{ version: string }>`.
2. **Main handlers** (`main/index.ts`, `CH.getDoc` / `CH.setDoc`): call `getDocWithVersion` and pass `expectedVersion` through to `store.setDoc`, returning its result. Keep `markOwnWrite(id)` where it is.
3. **Preload** (`preload/index.ts:33-35`): pass the new argument through; no logic.
4. **`DocEditor`** (`Editor.tsx:637-791`):
   - Add `const [version, setVersion] = useState<string | null>(null);` and `const [conflict, setConflict] = useState<string | null>(null);` next to `content` (`:648`).
   - Load effect (`:660-667`): destructure `{content, version}`, set both. **Add `dirty` to the dep array** → `[id, doc, changeSignal, dirty]`. This is what closes the unbounded Cancel window: `dirty` flips true→false on Cancel (`:727-730`) and after a save, re-running the load and re-syncing `content` + `version`. It cannot loop — after a load `dirty` is already `false` and does not change. Keep the `eslint-disable-next-line react-hooks/exhaustive-deps` comment.
   - `saveDoc` (`:669-679`): pass `{ expectedVersion: version }`, store the returned `version`, clear `conflict` on success, and wrap in try/catch — on rejection `setConflict(message)` and **do not** clear `editing` (the user's text must survive).
   - Render a banner above the editor when `conflict !== null`, reusing the existing `banner warn` class: the message plus a **"Reload from disk"** button (`setConflict(null); setEditing(false);` — the load effect then re-runs because `dirty` goes false) and an **"Overwrite anyway"** button (`setConflict(null); void saveDocForce(text)` — same call with `expectedVersion` omitted). Two buttons, no new modal.
   - `toggleCheckbox` (`:681-695`) needs **no change** — it calls the same `saveDoc`, so it is covered.

**Siblings in scope:** the checklist toggle (via `saveDoc`) and the Cancel-then-toggle stale path (via the `dirty` dep).
**Out of scope:** doc-granular `ownWrites`; a full Keep-mine/Take-theirs merge UI for documents (whole-doc text has no field granularity to merge).

**Conservative fallback if the `dirty` dep worries you:** instead of touching the dep array, add an explicit `void reload()` inside Cancel's `onClick` (`:727-730`). Same effect, zero dependency-graph risk. **What would settle which is right:** the manual check below.

**Test:** none automated (no GUI harness). **Manual check that substitutes** — this is the headline P1, so do it properly: open `research.md` in the GUI and click Edit; from a second process (`node -e` against `@kanmer/core`, or an MCP client) `setDoc` the same document; click Save in the GUI → the conflict banner appears and the agent's content is still on disk; click "Reload from disk" → the editor shows the agent's version. Then repeat without the intervening write → Save succeeds silently. Record both outcomes in the commit message.

**Verify:** `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, `KANMER_SMOKE=1` boot, plus the manual check.

---

### 5.4 Mirror the prefix check, re-fetch format, handle migration errors

**Files:** `apps/gui/src/renderer/src/components/Settings.tsx`, `apps/gui/src/renderer/src/App.tsx`, `apps/gui/src/shared/ipc.ts`, `apps/gui/src/main/index.ts`, `apps/gui/src/preload/index.ts`

**Change (four small, independent edits):**

1. **`validateDraft` prefix mirror (#1 sibling).** `Settings.tsx:387-389` builds `new Map(Object.entries(draft.idPrefixes).map(([t,p]) => [p, …]))` — the `Map` constructor silently keeps only the last entry per duplicate key, so the hand-maintained mirror has the *identical* blind spot as core did. Replace with an explicit loop:

```ts
const seen = new Map<string, string>();
for (const [t, p] of Object.entries(draft.idPrefixes)) {
  const holder = seen.get(p);
  if (holder) problems.push(`The ${t} id prefix "${p}" is already used by ${holder}.`);
  else seen.set(p, `the ${t} prefix`);
}
```

   then the existing area loop (`:390-399`) unchanged. Without this, the inline check keeps green-lighting exactly what core now rejects — turning a silent corruption into a confusing save failure. Add a comment cross-referencing `packages/core/src/board.ts assertUniquePrefixes()`.

2. **GUI format staleness (#2 sibling).** Add `getFormat(): Promise<1 | 2>` — `CH.getFormat` channel + `KanmerApi` entry (`shared/ipc.ts`), `ipcMain.handle(CH.getFormat, () => requireStore().detectFormat())` (`main/index.ts`), preload wrapper. Then in `App.refresh()` (`:61-73`) add `window.kanmer.getFormat()` to the `Promise.all` and `setFormat(f)`. `onDiskChange` already calls `refresh()` specifically for `version.json` (`App.tsx:158`), so the migration banner becomes self-correcting.

3. **Dry-run migrate has no error handling.** `App.tsx:484` is `void window.kanmer.migrate(true).then(setMigrateReport)` — a rejected IPC is an unhandled rejection with no modal and no message. Add `.catch(err => setError(err instanceof Error ? err.message : String(err)))`. Required for 2.1's blockers/throw to be visible at all.

4. **Migration modal shows blockers.** In the migrate modal (`App.tsx:648-711`), when `migrateReport.blockers.length > 0` render them in a `banner error` list and disable the "Migrate now" button. In the real-run catch (`:698-700`), prefix the error with *"The board may now be partially migrated — do not delete the legacy `tickets/`, `plans/` or `research/` folders; run Migrate again."* — that sentence is the direct antidote to the validated destructive workaround.

**Siblings in scope / out:** no `validateDraft` mirror for the proof gate (the renderer cannot see `proof.md`; core's rejection already surfaces via `Settings.save()`'s catch at `:55-59`).

**Test:** none automated. **Manual checks:** (a) Settings → set `ticket` and `plan` prefixes both to `FOO` → the inline error names both before any IPC. (b) On a v1 sandbox with colliding prefixes, click "Migrate to v2…" → the modal lists the blocker and "Migrate now" is disabled.

**Verify:** `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, `KANMER_SMOKE=1 KANMER_OPEN=<sandbox> npx electron .` from `apps/gui`.

---

### Phase 5.5 — Renderer pure-helper modules (**new**; 5.6–5.8 depend on it)

**Prefer extracting pure helpers over burying logic in JSX.** All of the A1/A2/A5 logic is DOM-free and therefore vitest-testable under the harness approved in 5.1. Extract it first, test it, then wire the components.

**Files:** `apps/gui/src/renderer/src/lib/board.ts` (extend), new `apps/gui/src/renderer/src/lib/standup.ts`, new `lib/board.test.ts`, new `lib/standup.test.ts`

**`lib/board.ts` additions:**

```ts
/** Live-blocker rule, mirroring core's computeBlockedIds (links.ts:61-73).
 *  Moved here from Standup.tsx:23-31 so the board badges and the standup share one copy —
 *  the renderer may only `import type` from @kanmer/core (AGENTS.md §7). */
export function blockedIds(items: Item[], lastStage: string | undefined): Set<string>

/** True when the item has a due date before `today` and is not in the final stage.
 *  Mirrors listItemsWithWarnings' overdue filter (store.ts:391). */
export function isOverdue(item: Item, todayIso: string, lastStage: string | undefined): boolean

/** The cards of one stage in the order the store returns them (already sorted by
 *  order-then-id, store.ts:397). Column-scoped, NOT area-scoped — `order` is a
 *  column-wide key, while the board renders cards grouped by area. */
export function columnCards(items: Item[], statusId: string): Item[]

/** Translate a drop onto a card edge into a core MovePosition.
 *  `edge: "after"`  → { after: cardId }
 *  `edge: "before"` → { after: <the card above cardId in the column> }, or "top" when it is first.
 *  The moving card is excluded from the neighbour search (core's computeOrder does the same,
 *  store.ts:606) so dragging a card one slot down behaves. */
export function positionForDrop(
  column: Item[], targetId: string, edge: "before" | "after", movingId: string
): MovePosition

/** The order value an optimistic update should give the moving card, so the board
 *  re-sorts to the dropped position before the write lands. Mirrors computeOrder's
 *  arithmetic (store.ts:600-636) without its persistence. */
export function optimisticOrder(
  column: Item[], position: MovePosition, movingId: string
): number | undefined
```

`Item` and `MovePosition` come from `@kanmer/core` as **type-only** imports.

**New `lib/standup.ts`** — the whole report shape as data:

```ts
export interface StandupLine { id: string | null; text: string }
export interface StandupGroup { label: string | null; lines: StandupLine[] }   // label null = flat
export interface StandupSection { title: string; groups: StandupGroup[] }
export interface StandupReport { boardName: string; sections: StandupSection[] }

export const RECENT_DONE_MS = 7 * 24 * 60 * 60 * 1000;   // matches kanmer-standup/SKILL.md:63
export const SINCE_YESTERDAY_MS = 24 * 60 * 60 * 1000;
export const STALE_MS = 7 * 24 * 60 * 60 * 1000;
export const TAKEN_STALE_MS = 3 * 24 * 60 * 60 * 1000;   // SKILL.md:79 "taken >3 days"

export function buildStandup(input: {
  boardName: string; board: BoardConfig; items: Item[];
  warnings: ItemWarning[]; activity: ActivityEntry[]; now: number;
}): StandupReport

export function standupMarkdown(report: StandupReport): string
```

`now` is injected, never `Date.now()` inside — that is what makes the whole thing testable.

`buildStandup` produces **the skill's eight sections in the skill's order** (`kanmer-standup/SKILL.md:50-80`):

| Section | Content | Grouping |
|---|---|---|
| In flight | tickets in `stages.slice(1,-1)` minus the review-like stage; `ID title (stage, area, priority)`, `⛏ branch (worktree)` when taken, `n/m` when a checklist exists, `— *stale*` when `updated` older than `STALE_MS` | by `assignee` when >1 distinct assignee ("unassigned" last), else flat |
| In review | `status === reviewLike`; `— waiting on <assignee>` / `— unassigned` | same rule |
| Up next | first stage, first 5 (already in manual order) | flat |
| Recently done | reached the last stage within `RECENT_DONE_MS` — prefer the activity log (`op:"update", field:"status", to:last`), fall back to `updated`; carry the actor when not `"gui"` | flat |
| Blocked | `blockedIds(...)` from `lib/board.ts` | flat |
| Overdue | `isOverdue(...)` from `lib/board.ts` | flat |
| **What happened since yesterday** *(new)* | activity within `SINCE_YESTERDAY_MS`, collapsed to one line per `(id, op[, field])` — created / moved `from → to` / taken / released / doc written | **by `actor` when >1 distinct actor**, else flat |
| **Flags** *(new)* | file warnings (from `listItemsWithWarnings`); items whose `status` is not on the board ("off-board stage"); stale items; tickets with no area; tickets taken longer than `TAKEN_STALE_MS` with no activity since `taken_at` | flat; `id: null` for file warnings with no id |

Empty sections and empty groups are dropped (`SKILL.md:47-48`).

`standupMarkdown` emits exactly the skill's shape — `### Board: <name>` heading first, bold section titles, `- ` bullets, italic group labels, omitted empty sections (`SKILL.md:50-81`).

**`lib/board.test.ts`:**
- `it("blockedIds ignores archived blockers and blockers in the last stage")` — three cases; this is the renderer's only copy of core's rule now, so guard it hard.
- `it("blockedIds ignores a blocker that no longer exists")` — mirrors `links.ts:70-71`.
- `it("isOverdue excludes items in the final stage and items with no due date")`.
- `it("columnCards returns only the stage's cards, in the given order")`.
- `it("positionForDrop maps the top edge of the first card to \"top\"")`.
- `it("positionForDrop maps a before-edge to { after: <previous card> }")`.
- **`it("positionForDrop skips the moving card when finding the previous neighbour")`** — drag card 2 onto card 3's before-edge; expect `{after: card1}`, **not** `{after: card2}` (itself). This is the off-by-one that makes "drag down one slot" a no-op.
- `it("optimisticOrder midpoints between the new neighbours")`, `it("optimisticOrder handles top, bottom and an empty column")`.

**`lib/standup.test.ts`** — fixed board + items + activity + warnings with an injected `now`:
- `it("emits the skill's eight sections in the skill's order")`.
- `it("omits empty sections")`.
- `it("groups In flight by assignee only when more than one is present")` — two cases.
- `it("groups What happened since yesterday by actor only when more than one was active")`.
- `it("uses a 7-day recently-done window, not 48 hours")` — 3 days ago appears, 9 days ago does not. *This pins the settled 48 h → 7 d decision.*
- `it("flags off-board stages, stale items, area-less tickets, long-taken tickets and file warnings")` — five flag lines.
- `it("standupMarkdown matches the skill's shape")` — assert it starts with `### Board: `, section titles are `**Bold**`, grouped sections carry `_actor_` labels, no empty section heading appears.

**Verify:** `npm run test -w @kanmer/gui`; `npm run typecheck -w @kanmer/gui`.

---

### Phase 5.6 — A2: blocked / overdue card badges (**new**)

**Files:** `apps/gui/src/renderer/src/App.tsx`, `components/Board.tsx`, `styles.css`

1. `App.tsx`, next to `knownIds` (`:380`):

```ts
const blocked = useMemo(() => blockedIds(items, lastStage), [items, lastStage]);
const today = useMemo(() => new Date().toISOString().slice(0, 10), [changeSignal]);
```

   where `lastStage = board.statuses[board.statuses.length - 1]?.id`. Pass `blocked` and `today` to `<Board>`.
2. `Board.tsx` — extend `BoardProps` with `blocked: Set<string>` and `today: string`. In the `group.cards.map` (`:129-139`), compute **primitives** per card:

```tsx
<Card … blocked={blocked.has(item.id)} overdue={isOverdue(item, today, lastStage)} />
```

   **Do not pass the `Set` into `Card`.** `Card` is `memo`ized (`Board.tsx:158`) and Phase 7.5's whole point was that one item patch re-renders one card; a fresh `Set` identity per render would defeat it for every card. **This is the single most important detail in this task.**
3. `Card` — add to `card-top` (`:209-221`), after the taken chip:

```tsx
{blocked && <span className="chip blocked" title="Blocked by an unfinished ticket">⛔ blocked</span>}
{overdue && <span className="chip overdue" title={`Due ${item.due}`}>⏰ {item.due}</span>}
```

   Extend the existing `aria-label` (`:187-189`) with `${blocked ? ", blocked" : ""}${overdue ? `, overdue ${item.due}` : ""}` so the badges are not sighted-only (Phase 5's accessibility work set that bar).
4. `styles.css` — `.chip.blocked { color: var(--danger); }` and `.chip.overdue { color: var(--warn); }` next to `.chip.taken`, using tokens that exist in **both** the dark block and `[data-theme=light]`.

**Out of scope:** the Archived view — archived items are excluded from the blocked rule by definition and a due date on an archived ticket is not actionable.

**Test:** predicates covered in 5.5. **Manual check:** create ticket A blocking B; B shows ⛔ and it clears when A reaches the final stage. Set a past `due` on C; C shows ⏰ and it clears when C reaches the final stage. With a 30-card board, confirm dragging one card does not re-render others (React DevTools "Highlight updates", or simply that drag stays smooth).

**Verify:** `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, plus the manual checks.

---

### Phase 5.7 — A1: the GUI manual-ordering writer (**new**)

**This touches drag-and-drop, the single most-used interaction in the app. Highest-regression-risk item in the plan.** Three properties make it recoverable: `position` is optional at every layer (a bug degrades to today's status-only move, it does not error); the whole-cell drop handler stays as the empty-space fallback; and the arithmetic lives in `positionForDrop`/`optimisticOrder`, unit-tested in 5.5.

**Files:** `apps/gui/src/shared/ipc.ts`, `main/index.ts`, `renderer/src/App.tsx`, `components/Board.tsx`, `styles.css`

1. **IPC contract** (`shared/ipc.ts:121`) — `moveItem(id: string, to: { status: string; position?: MovePosition }): Promise<Item>;` and add `MovePosition` to the type import block. *(Lands in 5.3's single IPC pass.)*
2. **Main** — widen the parameter type, pass `to` straight through to `store.moveItem`. `markOwnWrite(id)` stays. Note 3.1's `assertMoveAllowed` now runs on this path — a GUI drop into the final stage without `proof.md` is rejected *before* any sibling is written, and `App.onMove`'s catch (`:274-277`) already surfaces it and calls `refresh()` to roll the optimistic update back.
3. **`Board.tsx` — per-card drop targets.** Local state `const [dropHint, setDropHint] = useState<{ id: string; edge: "before" | "after" } | null>(null);`. On each `Card` wrapper:
   - `onDragOver` → `e.preventDefault(); e.stopPropagation();` then

```ts
const r = e.currentTarget.getBoundingClientRect();
setDropHint({ id: item.id, edge: e.clientY < r.top + r.height / 2 ? "before" : "after" });
setDropTarget(status.id);            // keep the column highlight
```

   - `onDrop` → `e.preventDefault(); e.stopPropagation();` (**stopping propagation is load-bearing** — it prevents the cell handler also firing and issuing a second, position-less move), then

```ts
const dragged = e.dataTransfer.getData("text/plain");
setDropHint(null); setDropTarget(null);
if (!dragged) return;
const column = columnCards(items, status.id);          // COLUMN-scoped, not group-scoped
onMove(dragged, { status: status.id, position: positionForDrop(column, item.id, edge, dragged) });
```

   - `onDragLeave` → clear `dropHint` only when it still points at this card.
   - Visual: append `" drop-before"` / `" drop-after"` to the card's className, with two `styles.css` rules drawing a 2 px accent line via `::before` / `::after`.
   - `Card` is `memo`ized — pass the hint as a **primitive** (`dropEdge: "before" | "after" | null`), never `dropHint` itself.
4. **The column-vs-area trap — put this in a code comment.** The board renders cards **grouped by area** (`groupByArea`, `Board.tsx:57-70`), but `order` is a **column-wide** key: `computeOrder` filters `i.status === status` with no area filter (`store.ts:606`). "Before the first card of the API group" is therefore *not* "top of the column" when the No-area group renders above it. Neighbours must always come from `columnCards(items, status.id)`, never `group.cards`. Getting this wrong makes drops land where the user did not aim, and **a single-area test board will not reveal it**.
5. **The cell fallback** (`Board.tsx:97-102`) stays, upgraded: a drop on empty column space now sends `{ status: status.id, position: "bottom" }` — which also fixes the "a GUI drag silently leaves the card's existing `order` intact" half of A1.
6. **`App.onMove`** (`:268-280`) — signature `(id, to: { status: string; position?: MovePosition })`, optimistic update swaps **order as well as status**:

```ts
setItems((prev) => {
  const target = prev.find((i) => i.id === id);
  if (!target) return prev;
  const order = to.position === undefined
    ? target.order
    : optimisticOrder(columnCards(prev, to.status), to.position, id);
  return prev.map((i) => (i.id === id ? { ...i, status: to.status, order } : i));
});
```

   The board re-sorts on render, so the card lands where dropped instantly; the awaited write plus the watcher reconcile the real fractional value. `moveRelative` (`:283-296`) passes no `position` and is unchanged.

**Out of scope, and now a §11 bullet:** keyboard stage move (Ctrl+←/→) still sets no position — giving the keyboard an insertion point needs a "move within column" mode, which is genuinely new UI.

**Manual drag matrix — run every row, record results in the commit message:**

| # | Action | Expected |
|---|---|---|
| 1 | Drag onto the **top half** of the first card in another column | lands first |
| 2 | Drag onto the **bottom half** of the last card | lands last |
| 3 | Drag onto the **middle** of a 5-card column | lands where the insertion line showed |
| 4 | Drag a card **down one slot** within its own column | moves one slot down, not nowhere (self-exclusion) |
| 5 | Drag onto **empty space** below the cards | lands at the bottom |
| 6 | Drag into a **multi-area** column, aiming at a card in the *lower* area group | lands next to that card, not at the column top |
| 7 | Drag into the **final stage** with no `proof.md` | rejected with the proof-gate error, card snaps back, and **no other card in that column changes position** (#6's fix, visible) |
| 8 | Reload after each of 1–6 | the order persisted |

**Verify:** `npm run test -w @kanmer/gui`, `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, the matrix, and `npm test` (core's ordering tests must be untouched).

**If the hint computation fights you:** ship steps 1, 2, 5 and 6 (contract + main + cell-fallback `"bottom"` + optimistic order) and drop the per-card edge targets, leaving drags column-scoped. Strictly smaller, still useful. Report it rather than shipping a drag that lands cards in the wrong place.

---

### Phase 5.8 — A5: Standup rewritten to the skill's shape (**new**)

**Files:** `apps/gui/src/shared/ipc.ts`, `main/index.ts`, `preload/index.ts`, `components/Standup.tsx`, `App.tsx`, `styles.css`

1. **Expose warnings over IPC.** New channel `CH.listItemsWithWarnings`; `KanmerApi.listItemsWithWarnings(filter?: ItemFilter): Promise<{ items: Item[]; warnings: ItemWarning[] }>`; handler `(_e, filter) => requireStore().listItemsWithWarnings(filter)`; preload wrapper; add `ItemWarning` to the type imports. *(Lands in 5.3's IPC pass.)* `App.tsx:65` deliberately calls plain `listItems` — leave that alone, it keeps the hot path unchanged.
2. **`Standup.tsx` becomes presentation over `StandupReport`.** Delete the local `blockedIds` (`:23-31`), `buildSections` (`:100-177`), `lineOf`, `recent` and `RECENT_MS`. Keep the two `useState`s, the copy button, the section/list JSX.
   - Props gain `projectName: string` so the report can emit `### Board: <name>`.
   - Fetch once per `changeSignal`:

```ts
useEffect(() => {
  const since = new Date(Date.now() - RECENT_DONE_MS).toISOString();   // 7 days, one fetch
  void Promise.all([
    window.kanmer.getActivity({ since }),
    window.kanmer.listItemsWithWarnings({ includeArchived: true }),
  ]).then(([a, w]) => { setActivity(a); setWarnings(w.warnings); });
}, [changeSignal]);
```

     One fetch covers both windows — `buildStandup` slices the 24 h set out of the same array. The current effect depends on `items` (`:45`), refetching on every item patch; keying on `changeSignal` is cheaper *and* more correct.
   - `const report = useMemo(() => buildStandup({ boardName, board, items, warnings, activity, now: Date.now() }), [...])`.
   - Render `report.sections` → `groups` → `lines`, group label as `<h4 className="standup-group">` when non-null. Keep the click-the-id-to-select affordance; lines with `id: null` render as plain text.
   - Copy button: `standupMarkdown(report)` instead of the inline `.map` at `:52-59`.
3. **The 48 h vs 7 d question is settled at 7 days**, matching `kanmer-standup/SKILL.md:63`, because the deliverable's stated purpose (`phase-7-gui-evolution/plan.md:20`) is *"so human and agent standups match"* — that makes the skill the spec and the plan's 48 h the error.
4. `styles.css` — one rule for `.standup-group`.

**Out of scope:** naming blockers from `get_links` (`SKILL.md:68`, "when it matters") — an N+1 IPC call per blocked item; the section lists the blocked items, which is the skill's minimum. Note it in the plan-doc amendment.

**Test:** all covered by `lib/standup.test.ts` — that is the payoff for extracting the module. **Manual check:** open Standup on a board with two assignees, two actors, a file warning (hand-write a malformed `.md` into a ticket folder), an off-board stage, an overdue item and a blocked item; confirm all eight sections appear with grouping, then Copy as Markdown and compare against `SKILL.md:50-81`.

**Verify:** `npm run test -w @kanmer/gui`, `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`.

---

### Phase 5.9 — A6: Move ▸ and Take/Release palette verbs (**new**)

**Files:** `apps/gui/src/shared/ipc.ts`, `main/index.ts`, `preload/index.ts`, `renderer/src/App.tsx`

The palette is a generic renderer over `PaletteCommand[]`; all three verbs are additions to `paletteCommands` (`App.tsx:399-420`). All three are **contextual on `selectedId`** — with no selection they do not appear, which is honest for a verb that needs a subject.

1. **Move ▸** — no new IPC (`onMove` exists). When `selected` is non-null, one command per status except the current:

```ts
...(selected
  ? board.statuses.filter((s) => s.id !== selected.status).map((s) => ({
      id: `move-${s.id}`,
      label: `Move ${selected.id} → ${s.name}`,
      run: () => void onMove(selected.id, { status: s.id }),
    }))
  : []),
```

   Substring scoring already filters them (`CommandPalette.tsx:32-34`). No `position` — a palette move is a stage change, matching the context menu.
2. **Release** — no new IPC (`window.kanmer.releaseTicket` exists, `App.tsx:319`). Emit only when `selected?.taken_at`.
3. **Take** — the only one needing new plumbing, because `take_ticket` requires a `branch` and there is no `CH.takeTicket` today.
   - `shared/ipc.ts`: `CH.takeTicket` + `takeTicket(id, input: { branch: string; worktree?: string; stage?: string; assignee?: string }): Promise<Item>`. *(5.3's IPC pass.)*
   - `main/index.ts`: `ipcMain.handle(CH.takeTicket, (_e, id, input) => { markOwnWrite(id); return requireStore().takeTicket(id, input); })`.
   - `App.tsx`: `pendingTake` state; the palette command (when `selected && !selected.taken_at`) sets it; render a small modal reusing `modal confirm` with one text input defaulting to `feat/${selected.id.toLowerCase()}`. On Take: `await window.kanmer.takeTicket(id, { branch })` then `refresh()`. Note in the hint text that the assignee defaults to the store's actor (`"gui"`) — that is the existing `KanmerStore` default (`store.ts:84`) and changing it is out of scope.

   `takeTicket` calls `assertProofGate` when the stage changes (`store.ts:667-669`), so it can be refused — surface the error, do not swallow it.

**Out of scope:** adding Take to the card context menu. One entry point for a new IPC call is enough surface for this pass.

**Manual check:** select a card, Ctrl+K, "move" → per-stage commands work; "take" → branch modal, `taken_at`/`branch` set, ⛏ chip appears; "release" → chip clears. Confirm none of the three appear with nothing selected.

**Verify:** `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, the manual check.

---

### Phase 5.10 — Project-switch dirty guard (**new**)

**Files:** `apps/gui/src/renderer/src/App.tsx`, new `components/ConfirmModal.tsx`

`trySelect`/`pendingNav` cannot defer this — the deferral only re-targets `selectedId`, while `openProject` (`:75-91`) replaces `root`, `board`, `items` and `settings` outright and does `setSelectedId(null)` at `:83` regardless.

1. Add `const [pendingProject, setPendingProject] = useState<{ kind: "pick" } | { kind: "path"; path: string } | null>(null);`
2. Split `pickAndOpen` (`:219-226`) into the *action* and the *request*:

```ts
const runOpen = useCallback(async (t) => {
  try {
    const p = t.kind === "pick" ? await window.kanmer.pickProject() : t.path;
    if (p) await openProject(p);
  } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
}, [openProject]);

const requestOpen = useCallback((t) => {
  if (editorDirty.current) setPendingProject(t);
  else void runOpen(t);
}, [runOpen]);
```

   The confirm runs **before** `pickProject()` opens the native dialog, so the user is never asked twice.
3. Route every user-initiated entry through `requestOpen`: topbar path button (`:470`), the palette's `open-project` command (`:417`), and the menu handler (`:229-234`, both `pick-project` and `open-project`). **Leave the boot restore effect (`:117-124`) calling `openProject` directly** — nothing can be dirty before first render, and routing it through the guard risks a modal on startup.
4. Render a third confirm: *"Discard unsaved changes to {selectedId} and open another project?"* — **Keep editing** / **Discard and open** (`editorDirty.current = false; const t = pendingProject; setPendingProject(null); void runOpen(t);`).

Three confirm modals now share the same markup (`pendingNav`, `pendingTab` from 5.2, `pendingProject`). **Extract `<ConfirmModal message actionLabel onConfirm onCancel />` into `components/ConfirmModal.tsx`** and use it in all three. 5.9's take modal needs an input — keep that one separate. This is the "prefer extraction" instruction applied to JSX; do it here, at the third occurrence, not earlier.

**Out of scope:** the two delete paths (`App.tsx:326`, `:544`) stay unguarded on purpose — the item is gone; there is nothing to save to.

**Manual check:** open a ticket, type into `research.md`, then (a) click the topbar project button, (b) Ctrl+K → "Open project…", (c) File → Open Recent — each shows the confirm before any dialog.

**Verify:** `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, `KANMER_SMOKE=1` boot, the manual check.

---

## Phase 6 — Verification the plans named but never performed (A9, A8)

### 6.1 No-op update leaves the file mtime unchanged

**Files:** `packages/core/src/store.test.ts`

**Change:** Extend `it("does not bump updated on a no-op patch")` (`:173-182`). The plan (`phase-1-core-correctness/plan.md:49`) named "`updated` **and file mtime** unchanged"; the test only checks `updated`. Add:

```ts
const file = path.join(root, ".kanmer", "areas", "_none", t.id, `${t.id}.md`);
const before = (await fs.stat(file)).mtimeMs;
await new Promise((r) => setTimeout(r, 20));        // beat coarse FS mtime granularity
await store.updateItem(t.id, { title: "A", body: "hello\n" });
await store.updateItem(t.id, {});
expect((await fs.stat(file)).mtimeMs).toBe(before);
```

**Verify:** `npm test`.

### 6.2 The order rebalance branch

**Files:** `packages/core/src/store.test.ts`

**Change:** `store.test.ts:578-602` never drives the rebalance branch at `store.ts:630-635` (reached only when a midpoint stops separating its neighbours). Do **not** write a 60-iteration insertion loop — force it directly with adjacent doubles:

```ts
it("rebalances when midpoints between two neighbours are exhausted", async () => {
  const a = await store.createItem({ type: "ticket", title: "A" });
  const b = await store.createItem({ type: "ticket", title: "B" });
  const c = await store.createItem({ type: "ticket", title: "C" });
  // Two adjacent doubles: (10 + 10.000000000000002) / 2 cannot land strictly between them.
  await store.updateItem(a.id, { order: 10 });
  await store.updateItem(b.id, { order: 10.000000000000002 });
  await store.moveItem(c.id, { status: "todo", position: { after: a.id } });
  const ids = (await store.listItems({ status: "todo" })).map((i) => i.id);
  expect(ids).toEqual([a.id, c.id, b.id]);
  // Rebalance rewrote the pathological values into the 10/20/30 ladder.
  expect((await store.getItem(a.id))?.order).toBe(10);
  expect((await store.getItem(b.id))?.order).toBe(20);
});
```

The `moveItem` here carries no `expectedUpdated` and no status change, so 3.1's pre-check is a no-op for it.

**Verify:** `npm test`.

---

### Phase 6.3 — A8: make the AGENTS.md managed block an enforced property (**new**)

**Files:** new `scripts/agents-block.mjs`, new `scripts/verify-agents-block.mjs`, `plugins/kanmer/skills/kanmer-setup/SKILL.md`, root `package.json`, `AGENTS.md`

Today the four rules at `kanmer-setup/SKILL.md:95-106` — top of file, never touch outside the markers, idempotent refresh, CLAUDE.md pointer — are **instructions to a model**, with no tool, function or test behind them (`rg 'kanmer:instructions'` matches only the SKILL.md block). Replace the instruction with an implementation the skill *calls*.

1. **`scripts/agents-block.mjs`** — dependency-free Node, one pure function plus a CLI:

```js
export const START = "<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->";
export const END   = "<!-- kanmer:instructions:end -->";

/** Insert or refresh the managed block. Pure: takes the file's current text
 *  (null when absent) and returns the text it should have. */
export function applyManagedBlock(existing, blockBody, opts = { stubHeading: null })
```

   Algorithm — exactly the four rules, no more:
   - Both markers present and `START` precedes `END` → replace *only* the span between them; everything outside is byte-identical, and the block stays wherever it already is (moving it would violate "never modify anything outside the markers").
   - Absent and `existing === null` → `${block}\n\n${stubHeading ?? "# Contributor guide"}\n`.
   - Absent and `existing !== null` → `${block}\n\n${existing}` — block first, existing content untouched.
   - Markers malformed (END before START, or only one present) → **throw**, do not guess. A half-marked file is a human's problem.

   CLI: `node scripts/agents-block.mjs <repoDir>` writes `<repoDir>/AGENTS.md` and, when `<repoDir>/CLAUDE.md` exists and does not already contain `AGENTS.md`, prepends `See [AGENTS.md](AGENTS.md) for how to work on this repo.\n\n`. The block body is the literal text from `kanmer-setup/SKILL.md:82-91` — keep them in step and say so in a comment on both sides.

2. **`scripts/verify-agents-block.mjs`** — the Phase 8 end-to-end check, in `smoke.mjs`'s established style (`check(name, cond, detail)`, PASS/FAIL lines, `process.exit(failed ? 1 : 0)`). Operates on an `fs.mkdtemp` sandbox removed in a `finally`. The five cases the plan named (`phase-8-skills-plugin-docs/plan.md:54-55`):
   - `AGENTS.md` missing → created, `text.startsWith(START)` true.
   - `AGENTS.md` present with content → block lands at byte 0, original content is a byte-exact suffix.
   - **Run twice → outputs byte-identical** (the "idempotent" claim, now mechanical).
   - Block present with a *stale* body → only the span between markers changed; bytes before `START` and after `END` identical.
   - `CLAUDE.md` present without a pointer → pointer added; running again does **not** add it twice.

   Plus one negative: `END` before `START` → the script throws and the file is unmodified.

3. **`kanmer-setup/SKILL.md`** — replace the "Rules" list (`:95-106`) with a pointer to the script: *"Run `node <plugin-root>/../../scripts/agents-block.mjs <repo>` — it owns the block and enforces all four rules. Only hand-edit if the script is unavailable, in which case the rules are: …"* (keep the rules text as the fallback — a plugin user may not have the repo checked out).

4. Root `package.json`: `"verify:agents-block": "node scripts/verify-agents-block.mjs"`. `AGENTS.md` §6 row and §10 step.

**Why a script rather than a core function or an MCP tool:** managing a *host repo's* `AGENTS.md` is outside `@kanmer/core`'s charter ("the only place that touches `.kanmer` files") and would bloat its public API; an MCP tool would give an agent write access to arbitrary repo files — a much larger security surface than a skill instruction. A standalone script matches `smoke.mjs`'s precedent and needs no new test-runner machinery.

**Test:** `verify-agents-block.mjs` **is** the test. **Verify:** `node scripts/verify-agents-block.mjs` → all checks pass, exit 0. Plus a one-off real-world run: point it at a scratch clone that already has an `AGENTS.md`, run twice, `git diff` shows one insertion the first time and nothing the second.

---

## Phase 7 — Docs, plugin bundle, verification

### 7.1 Rebuild the plugin bundle and make `plugin:check` a real sync check

**Files:** `scripts/check-plugin-sync.mjs`, `plugins/kanmer/mcp/kanmer-mcp.cjs`

The committed bundle (`AGENTS.md` gotcha #8, `:313`) carries independent compiled copies of every implicated store method — `assertUniquePrefixes`/`writeBoard`, `formatCache`/`detectFormat`/`resetFormatCache`, `createItem`, `moveItem`/`computeOrder`, `reorderColumns`, `assertProofGate`, `setDoc` — and `check-plugin-sync.mjs:26-35` diffs **tool names only**, so it cannot detect any of this drifting. (`migrate.ts` is absent from the bundle, so Phase 2's migration work needs no rebuild — but Phases 1, 3 and 4 all do.)

**Change to `scripts/check-plugin-sync.mjs`** — after the existing name diff, add a byte check:

```js
import { createHash } from "node:crypto";
const bundlePath = join(root, "plugins/kanmer/mcp/kanmer-mcp.cjs");
const distPath   = join(root, "packages/mcp-server/dist/standalone/kanmer-mcp.cjs");
if (!existsSync(distPath)) {
  console.error(`No standalone bundle at ${distPath} — run \`npm run build\` first ` +
    `(plugin:check now verifies the committed bundle's bytes, not just tool names).`);
  process.exit(1);
}
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
if (sha(bundlePath) !== sha(distPath)) {
  console.error("Committed plugin bundle differs from a fresh build — run `npm run plugin:build`.");
  process.exit(1);
}
console.log(`plugin-sync OK — ${registered.length} tools match, bundle bytes match`);
```

This changes `plugin:check`'s contract: it now requires a prior `npm run build`. That is consistent with `npm run plugin:build` already running `npm run build`, and with `AGENTS.md` §10 item 6 pairing the two. Update the AGENTS.md §6 table row, the §7 plugin-sync bullet and §10 item 6 to say so.

Caveat to record in a comment: this assumes tsup output is reproducible (it is at this commit — byte-verified md5 `5aab2d5a…`, 1 383 835 B). If a future toolchain bump breaks reproducibility, the failure message already tells the user to re-run `plugin:build`, which fixes it.

**Then run `npm run plugin:build`** — the only step that makes installed plugins pick up the Phase 1/3/4 fixes.

**Optional, skip if time-boxed:** scrape `KEY_ORDER` from `packages/core/src/frontmatter.ts:5-24` and assert every field appears as a `` - `field` `` bullet in the tool reference's `## Field semantics` section. Would have caught A3's class of drift; not required.

**Verify:** `npm run build && npm run plugin:build && npm run plugin:check` → "20 tools match, bundle bytes match"; then `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs` → all checks pass against the committed bundle, matching the dev-build count.

### 7.2 `examples/codex-config.toml` (A7)

**Files:** `examples/codex-config.toml`

**Change:** Replace `C:/Users/Alex/Documents/GitHub/kanmer` with `<kanmer-repo>` on **line 24** and **line 32**, matching the placeholder convention the README already uses (`README.md:167,172,179`). Add one sentence above the `[mcp_servers.kanmer]` block: *"Replace `<kanmer-repo>` with wherever you cloned this repo."*

**Verify:** `git grep -n "C:/Users/Alex" -- ':!docs/plans' ':!node_modules'` returns nothing.

---

## Documentation updates

### `AGENTS.md`

**§4 (line 182-183)** — replace *"and uniqueness — including against the `idPrefixes` values — is enforced on every board write."* with:
> and uniqueness — including *among* the `idPrefixes` values and against them — is enforced on every board write. The final stage's proof gate is re-checked whenever a board write changes which stage is last, and a ticket cannot be *created* directly in the final stage either.

**§5 (line 233)** — `getDoc/setDoc/getTicketDocsInfo` → `getDoc/getDocWithVersion/setDoc/getTicketDocsInfo`.

**§6 (Commands table)** — amend two rows and add three:
> | `npm test` | core **and GUI** vitest suites |
> | `npm run plugin:check` | fail if MCP tool names drift from the skill's tool reference **or if the committed plugin bundle differs from a fresh build (requires `npm run build` first)** |
> | `npm run smoke:protocol` | raw-JSON-RPC stdio check against every protocol version the SDK supports, plus the per-request `_meta` client-identity path |
> | `npm run verify:agents-block` | end-to-end check of the `kanmer-setup` AGENTS.md managed block (insert, refresh, idempotence, CLAUDE.md pointer) |
> | `node scripts/agents-block.mjs <repo>` | write/refresh that block in a target repo (what `kanmer-setup` calls) |

**§7 (Conventions)** — add four bullets:
> - **Document writes carry an optional version token.** `getDoc`/`get_ticket_doc` return a content hash; passing it back as `setDoc`'s `expectedVersion` / `set_ticket_doc`'s `expected_version` turns a concurrent overwrite into a conflict, exactly like `expectedUpdated` on `updateItem`. Omitting it is last-write-wins.
> - **Renderer logic that could be pure, is.** `renderer/src/lib/` holds the DOM-free modules — `markdown.ts`, `board.ts` (column lookups, the blocked/overdue rules, drop-position and optimistic-order arithmetic) and `standup.ts` (the whole standup report + its markdown). They are the only renderer code with vitest coverage, so put new logic there rather than in JSX.
> - **`board.ts`'s `blockedIds` is the renderer's only copy of core's live-blocker rule** (`links.ts computeBlockedIds`), consumed by both the card badges and the Standup view. Likewise `Settings.tsx validateDraft()` mirrors `board.ts assertUniquePrefixes()`. The renderer may only `import type` from core, so these cannot share code — change one, change the other.
> - **`plugin:check` sees tool names and bundle bytes only.** Everything below `## Field semantics` in `references/tool-reference.md` is deliberately invisible to it (`check-plugin-sync.mjs:32-35`) so field names aren't mistaken for tools — re-read that prose by hand whenever the data model changes.

**§8 (gotchas)** — add one:
> 9. **`order` is column-scoped, the board renders by area.** `computeOrder` filters on `status` only (`store.ts:606`), while `Board.tsx` groups cards by area inside each column. Any drag-and-drop neighbour computation must use `columnCards(items, statusId)`, never a group's cards — otherwise "drop above this card" silently means a different slot. `Card` is `memo`ized, so pass badge/hint state to it as primitives, never as a `Set` or object rebuilt each render.

**§10 (Verification checklist)** — item 1 becomes `npm test — core + GUI suites green.`; item 2 gains `…and node packages/mcp-server/src/smoke-protocol.mjs`; item 6 becomes `If the server changed: npm run build && npm run plugin:build && npm run plugin:check (the check now verifies the committed bundle's bytes), plus both smoke scripts with KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs.`; new item 8: `If the setup skill or its managed block changed: node scripts/verify-agents-block.mjs.`

**§11 (Known limitations)** — **drop these entirely** (the limitations no longer exist): the GUI-cannot-set-order bullet (A1), the no-blocked/overdue-badges bullet (A2), the standup-does-not-match-the-skill bullet (A5), the palette-verbs bullet (A6), the managed-block-unenforced bullet (A8), the project-switch bullet, and the `createItem`-not-proof-gated bullet.

**Keep unchanged:** the Windows-installer-only bullet; the no-CI bullet; the GUI whole-board-save column-stranding bullet (unfixed — #7 added a proof check, not an in-use-column check); the closed-`create_item`-race bullet; the duplicate-registration bullet.

**Amend the existing TICK-fallback bullet** — append: *"Narrowed: `createItem` now refuses an id that `locateItem` can already resolve, so only a genuine concurrent-create window remains."*

**Replace the SDK bullet** (`AGENTS.md:347`) with:
> - **The MCP SDK caps at protocol `2025-11-25`.** `@modelcontextprotocol/sdk@^1.30.0` contains no `2026-07-28` support, so `ttlMs`/`cacheScope` on `tools/list` are unavailable and no current host sends the spec's `io.modelcontextprotocol/client` identity key. The server *does* read it — `smoke-protocol.mjs` proves the branch is live by sending it in a hand-written frame — so actor attribution is forward-compatible today and falls back to `clientInfo`/`getClientVersion()` in practice. `smoke-protocol.mjs` also covers the back-compat run against `2025-11-25`, `2025-06-18`, `2025-03-26` and `2024-11-05`. Revisit `tools/list` caching when the SDK ships the revision.

**Add these new bullets** (the honest residue after fixing everything else):
> - **Migration has no agent-reachable entry point.** `migrateToV2` is reachable only from the GUI (`main/index.ts` `CH.migrate`); there is no MCP tool. `kanmer-setup`'s Upgrade mode therefore asks the user to click "Migrate to v2" in the app, and a plugin user with no GUI installed cannot upgrade a v1 board. Migration *is* now resumable and refuses colliding boards, so an interrupted run is recoverable — but only from the GUI.
> - **Keyboard stage moves (Ctrl+←/→) set no position.** Drag-and-drop now writes an insertion point; the keyboard path changes the stage and leaves the card's existing `order`, so it can land somewhere other than where the eye expects. Giving the keyboard an insertion point needs a "move within column" mode that does not exist.
> - **The `beforeunload` confirm on window close is unverified in this Electron configuration** (`sandbox: false`, no `will-prevent-unload` handling). Historically version-dependent; no harness exists to settle it. Every *in-app* way of leaving a dirty editor — card click, Close, wiki-link, tab switch, project switch, palette jump, Escape — is guarded.
> - **The checklist tab never linkifies `[[ID]]`.** It parses lines to JSX itself and never calls `renderMarkdown`.
> - **Agent-change toast suppression is ticket-granular, not doc-granular.** A GUI write to `checklist.md` suppresses the toast for a concurrent agent write to `research.md` on the same ticket within 2 s (`ownWrites` is keyed by id). Conflict *detection* is unaffected — only the toast.
> - **The Standup's Blocked section lists blocked items but does not name their blockers.** `kanmer-standup/SKILL.md:68` suggests naming them from `get_links` "when it matters"; doing so is an IPC call per blocked item, so the GUI lists the items only.
> - **The GUI takes tickets as actor `gui`.** The palette's Take verb writes `taken_at`/`branch` with the store's default actor, not a per-user identity — the board shows the ticket as taken by the app, not by a named human.

### `README.md`

- **Line 119** — replace *"Drag cards between stages (optimistically — they land instantly)"* with:
  > Drag cards between stages **and to a position within a stage** — an insertion line shows where the card will land, and it lands instantly (optimistically). Manual order is shared with agents (`move_item position`). Cards carry an area stripe, a ⛏ badge while an agent has them taken, and ⛔ / ⏰ badges when a ticket is blocked or overdue.
- **Line 120** — split the conflated claim:
  > Ticket-field saves are **diff-based** (only the fields you changed); concurrent agent edits re-sync live and a same-field conflict offers Keep mine / Take theirs. **Document saves are whole-document and version-checked** — if an agent changed the document while you were editing, the save is refused with a conflict banner offering Reload from disk or Overwrite anyway. Switching document tabs, closing, navigating or opening another project with unsaved text all prompt first.
- **Line 121 (Standup bullet)** — replace *"with **Copy as Markdown**, matching the agent skill's output"* with the accurate, now-true version: *"in flight, in review, up next, recently done (7 days), blocked, overdue, what happened since yesterday, and flags — grouped by assignee/actor where it helps, with **Copy as Markdown** emitting exactly the `kanmer-standup` skill's shape."*
- **The `Ctrl+K` line (~124)** — add *"(jump to an item, or move / take / release the selected one)"*.

### Plan docs — corrections, appended not rewritten

Add a `> **Amended by the PR #2 review remediation:** …` line under each, leaving the original text so the record of what was planned survives:

| File · line | Amendment |
|---|---|
| `phase-2-format-v2-storage/plan.md:35` | The per-instance format cache is now invalidated by re-stat'ing `version.json`, and never cached at all while `version.json` is absent (half-migrated boards). |
| `phase-2-format-v2-storage/plan.md:71` | "Re-run is a no-op" covered only *completed* runs; `migrateToV2` is now resumable mid-run and `migrate.test.ts` covers interruption in the move and fold loops. |
| `phase-3-mcp-surface/plan.md:21-30, :39` | A4: SDK 1.30 negotiates at most `2025-11-25`; the 2026-07-28 revision is unavailable, the `_meta` client-identity path is dead code, and the back-compat protocol smoke run was not done. |
| `phase-4-gui-trust/plan.md:19` | Tab switches are guarded by a tab-level `tryTab` inside `Editor`, not by routing through `trySelect`. Project switch remains unguarded; delete-while-open is deliberately unguarded (the item is gone). |
| `phase-4-gui-trust/plan.md:23` | `validateDraft` cannot mirror the last-stage proof check — the renderer has no `proof.md` visibility; core's rejection surfaces through `Settings.save()`'s catch. |
| `phase-4-gui-trust/plan.md:27` | 4.5's raw-HTML override escaped the wiki anchors the same function generated. `[[…]]` is now a `marked` inline extension, so no raw HTML is generated and the escaping stays as strict as specified. |
| `phase-6-data-model/plan.md:25` | A1: the GUI drag half was never built; the drop handler is column-scoped and the IPC contract carries no `position`. |
| `phase-6-data-model/plan.md:33` | A9: the rebalance path now has a test. |
| `phase-7-gui-evolution/plan.md:3` | A2: blocked/due card badges were not built. |
| `phase-7-gui-evolution/plan.md:15` | "The Phase 4 baseline/conflict pattern applies per tab" was not implemented; documents now use a content-hash version token instead (they have no frontmatter to hold `updated`). |
| `phase-7-gui-evolution/plan.md:20` | A5: the view diverges from the `kanmer-standup` skill on grouping, two sections and the recently-done window. |
| `phase-7-gui-evolution/plan.md:40` | A6: Move and Take/Release verbs are not in the palette. |
| `phase-8-skills-plugin-docs/plan.md:36, :54-55` | A8: the managed-block rules are model instructions; nothing enforces or verifies them. |
| `phase-8-skills-plugin-docs/plan.md:50` | A7: `examples/codex-config.toml` still carried the hardcoded path and has now been fixed. |
| `phase-0-pr1-verify-merge/plan.md` | Add a new `## Corrections (PR #2 review)` section at the end listing A1, A2, A4, A5, A6, A7, A8 as items the DONE entries recorded from the core half only. Do not edit the historical DONE lines. |
| `upgrades-plan.md:9, :12-13, :64, :66, :68, :85` | Append the caveats to the Phase 3, 6 and 7 rows (protocol ceiling, no GUI ordering writer, no badges, standup parity) and to the "does the same for agent-only flows" claim (there is no MCP migrate tool). |

### Deferred issues to file

Only two remain — everything else is fixed in this pass.

1. **Agent-reachable migration** — add an MCP `migrate_board` tool (dry-run + real, returning `MigrationReport` including `blockers`) so `kanmer-setup`'s Upgrade mode works for plugin-only users, and so `upgrades-plan.md:68`'s claim becomes true. The resumability and collision work in this PR is the prerequisite.
2. **Extract `cleanReferencesTo()`** — `deleteItem` (`store.ts:790-801`) and `migrateToV2`'s fold sweep duplicate the same links/blocks cleanup. `phase-1-core-correctness/plan.md:27-29` called for building it on `buildLinkIndex`; neither does. Extract once, with tests, outside a remediation pass.

---

## Final verification sequence

Run from the repo root unless noted. Stop at the first failure; do not proceed on red.

```
npm install                                                   # apps/gui vitest dep; updates package-lock.json
npm run build                                                 # core + mcp-server ESM + dist/standalone
npm test                                                      # core + GUI vitest suites          (§10.1)
node packages/mcp-server/src/smoke.mjs                        # stdio checks, dev build           (§10.2)
node packages/mcp-server/src/smoke-protocol.mjs               # 4 protocol versions + _meta probe (A4)
node scripts/verify-agents-block.mjs                          # managed-block end-to-end          (A8)
npm run plugin:build                                          # refresh the committed bundle      (§10.6)
KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs
KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke-protocol.mjs
npm run plugin:check                                          # names + bundle bytes              (§10.6)
npm run typecheck -w @kanmer/gui                              # both tsconfigs                    (§10.3)
npm run build -w @kanmer/gui                                  # main/preload/renderer             (§10.4)
```

then, from `apps/gui`:

```
KANMER_SMOKE=1 KANMER_OPEN=<a scratch project dir> npx electron .        # exit 0            (§10.5)
```

**Expected results:** core tests ≈ 53 + ~25 new, all green, plus a GUI suite of ~35. Both smoke scripts green against the dev build **and** the committed bundle. `verify-agents-block.mjs` green. `plugin:check` prints "20 tools match, bundle bytes match". Typecheck silent, GUI build clean, boot exits 0.

**Manual checks (§10.7) — nine, not five. Record each outcome in the relevant commit message:**
1. **#5** — `See [[TICK-001]]` renders as a clickable link that navigates; `` `[[TICK-001]]` `` is literal text in a code span; `<img src=x onerror="alert(1)">` still renders escaped.
2. **#4** — edit `research.md`, click Plan → confirm appears; "Keep editing" preserves the text, "Discard" switches. Same for the **Ticket** tab button. No confirm when not editing.
3. **#3** — GUI editing `research.md` while a second process writes it: Save shows the conflict banner, the agent's content survives, "Reload from disk" shows it.
4. **#2/#9** — on a v1 sandbox, migrate via the GUI and confirm an already-running agent's `get_status` reports `format: 2` on its next call.
5. **The AGENTS.md §10.7 round trip** — agent `create_item`/`move_item` live-updates the board; a GUI edit is visible to the agent's next `get_item`.
6. **A1 — the eight-row drag matrix in Phase 5.7.** Run every row. Run rows 1–6 on the *unmodified* app first so "regression" is measured against something observed.
7. **A2 — badges**: ⛔ appears/clears with the blocker; ⏰ appears/clears with the due date and final stage; a 30-card board still drags smoothly.
8. **A5 — Standup**: all eight sections with grouping on a board with two assignees and two actors; Copy as Markdown compared against `kanmer-standup/SKILL.md:50-81`.
9. **A6 + 5.10** — the three palette verbs (contextual on selection), and the three project-switch entry points each prompting before any dialog.

---

## Commit structure

Seventeen commits on `kanmer-upgrades-phases-1-8`. Each should build; from commit 3 onward each should pass `npm test`. Do **not** reorder: commit 10's IPC pass must precede every renderer consumer, 16 must follow every core/MCP change, and 17 must describe what actually shipped.

| # | Message | Contents |
|---|---|---|
| 1 | `fix(core): reject duplicate id prefixes and re-gate the final stage on board writes` | `lastStageId()` helper; `assertUniquePrefixes` pre-check; `setBoard` → `assertFinalStageProven`; `board.test.ts`; four `store.test.ts` cases; one `smoke.mjs` status-reorder check. **#1 (core), #7.** |
| 2 | `fix(core): refuse to create a ticket directly in the final stage` | `createItem` gate; `create_item`/`create_items` description text; `store.test.ts:269-274` rewritten; three new cases. **Contract change — say so in the body.** |
| 3 | `fix(core): make v1→v2 migration resumable and refuse colliding destinations` | `MigrationReport.blockers`; pre-flight claim map; check-before-act in all three loops; resume notes; `migrate.test.ts`. **#9, #1 (migration).** |
| 4 | `fix(core): strip folded document ids from links[] and blocks[]` | Post-conversion sweep; round-trip assertion. **#8.** |
| 5 | `fix(core): invalidate the format cache and never re-issue a live id` | Stat-stamped cache; `statOrNull`; `locateItem` backstop; two-instance test. **#2.** |
| 6 | `fix(core): validate a positioned move before materialising column order` | `assertMoveAllowed` + shared `conflictError`; two sibling-integrity tests. **#6.** |
| 7 | `feat(core,mcp): optimistic concurrency for ticket pipeline documents` | `contentVersion`; `getDocWithVersion`; `setDoc` `expectedVersion` + `{version}`; `get_ticket_doc.version`; `set_ticket_doc.expected_version`; smoke checks; five core tests. **#3 (core + MCP).** |
| 8 | `test(mcp): protocol back-compat and the per-request _meta actor path` | `smoke-protocol.mjs`; `actorName` JSDoc + `main()` note corrected; `smoke:protocol` script. **A4 (the achievable half).** |
| 9 | `fix(gui): render wiki links as tokens, not spliced HTML` | `markdown.ts` marked inline extension; vitest harness for `apps/gui`; `markdown.test.ts` (8 cases); root `npm test` runs both suites. **#5.** |
| 10 | `feat(gui): IPC contract for doc versions, format, warnings, position and take` | The single `shared/ipc.ts` + `preload` + `main` pass: widened `getDoc`/`setDoc`/`moveItem`, new `getFormat`/`listItemsWithWarnings`/`takeTicket`. No renderer consumers yet — **deliberately behaviour-neutral**, so the four consumers below don't fight over three files. |
| 11 | `fix(gui): guard tab switches and project switches, version doc saves` | `tryTab` + `ConfirmModal` extraction; `DocEditor` version token, conflict banner, `dirty`-dep reload; `pendingProject` + `requestOpen`; `validateDraft` duplicate-prefix loop; `refresh()` re-fetches format; `.catch` on the dry-run migrate; blockers + partial-migration message in the migrate modal. **#4, #3 (GUI), #1 (mirror), #2 (GUI), project-switch guard.** |
| 12 | `feat(gui): pure renderer helpers for blocked/overdue, drop position and the standup` | `lib/board.ts` additions; new `lib/standup.ts`; `lib/board.test.ts`; `lib/standup.test.ts`. No component changes — **tests-first for the three features below.** |
| 13 | `feat(gui): blocked and overdue card badges, and manual ordering by drag` | Card badges + aria; per-card drop targets + insertion line; cell fallback → `"bottom"`; `App.onMove` status+order optimistic swap; two `styles.css` rule pairs. **A2, A1.** Body must carry the eight-row drag matrix result. |
| 14 | `feat(gui): standup matching the skill, and Move/Take/Release in the palette` | `Standup.tsx` rewritten over `buildStandup`/`standupMarkdown`; warnings fetch; 7-day window; palette verbs + take modal. **A5, A6.** |
| 15 | `test(core): the two assertions the phase plans named` | No-op update mtime; order rebalance branch. **A9.** |
| 16 | `chore(plugin,scripts): rebuild the bundle, verify its bytes, own the AGENTS.md block` | `check-plugin-sync.mjs` sha256 check; `npm run plugin:build`; `tool-reference.md` `## Item types` rewrite + missing Field-semantics bullets + `expected_version` + the `create_item` final-stage sentence; `examples/codex-config.toml`; `scripts/agents-block.mjs` + `verify-agents-block.mjs` + `kanmer-setup/SKILL.md`. **A3, A7, A8.** |
| 17 | `docs: record what this pass fixed, and honestly what it did not` | AGENTS.md §4/§5/§6/§7/§8/§10/§11; README lines 119–124; the seventeen plan-doc amendments; `phase-0-…` Corrections section. |

Plus `docs: PR #2 review, verification and remediation plan` for the currently-untracked `docs/plans/pr-2-review/` — standalone or folded into 17.

Commit bodies must name the review ids (`#1`…`#9`, `A1`…`A9`) so `git log` maps back to this folder. **Commits 2, 13 and 14 must additionally record their manual-check results**, since those are the only verification they have.

Commit-message bodies should name the review item ids (`#1`…`#9`, `A1`…`A9`) so `git log` maps back to this folder.

---

## Handoff notes for the executing agent

**Conventions you must follow (`AGENTS.md` §7):**
- TypeScript strict everywhere; no `any` escapes. Run each package's `typecheck` script.
- **The renderer may only `import type` from `@kanmer/core`.** This is why `Settings.tsx validateDraft()` and `Standup.tsx blockedIds()` are hand-maintained mirrors and cannot be deduplicated — two correct copies plus a cross-reference comment is the intended answer, not a refactor.
- **All file writes go through `writeFileAtomic`** (`io.ts`); item creation goes through `writeFileExclusive`. Do not introduce a bare `fs.writeFile`.
- `updated` is stamped only on writes that actually change the file — the no-op guard at `store.ts:530-536` is load-bearing. Do not "simplify" it.
- **The MCP server must never write to stdout** except protocol frames. Logs go to `process.stderr`.
- JSDoc on exported functions; small focused modules; match the surrounding style.

**Gotchas (`AGENTS.md` §8) that bite in this pass:**
- **Gotcha 8 — `plugins/kanmer/mcp/kanmer-mcp.cjs` is a committed build artifact.** Skip `npm run plugin:build` and installed plugins silently keep the old, buggy server. `migrate.ts` is **not** in the bundle, so Phase 2 alone would not need it — but Phases 1, 3 and 4 do.
- **Gotcha 1 — ESM vs CJS is deliberate.** Do not "simplify" the standalone CJS bundle or the Electron main to ESM; gray-matter does a dynamic `require('fs')`.
- **Gotcha 7 — the watcher ignores `.tmp-*` files and debounces (120 ms).** Do not remove the ignore.
- Windows: `fs.rename` returning `EPERM`/`EBUSY` under Defender or OneDrive is ordinary — that is *why* #9's resumability matters, and why the migration tests must not assume renames always succeed.

**What NOT to touch:**
- `materialise()` (`store.ts:607-614`) — its writes are legitimate backfill.
- `deleteItem` (`store.ts:778-807`) — the extraction is deferred; duplicate the pattern in `migrate.ts` with a pointer comment.
- `detectFormat()`'s `pathExists(this.paths.tickets)` fallback branch's *meaning* — only its caching.
- `App.tsx:326` and `:544` (`setSelectedId` after a delete) — correct as written.
- The `Conflict:` error wording in `updateItem` — tests and smoke match on it.
- Anything in `docs/plans/pr-2-review/` — it is the input record; append nothing to it.
- Any phase plan's original text — **append** amendments, never rewrite history.

**If a fix turns out bigger than scoped:**
- Take the stated conservative option and **say so in the commit message** — do not silently expand or silently drop.
- Named fallbacks: `MigrationReport.blockers` → plain `throw` + the `.catch` in 5.4 (required either way). `apps/gui` vitest harness → the throwaway 13-case repro script pasted into the commit. `DocEditor`'s `dirty` dep → an explicit reload inside Cancel's `onClick`.
- If **#3** balloons in the renderer, land the core + MCP halves (commit 6) — they are testable and close agent-over-agent and agent-over-GUI — and reduce the GUI half to: pass the token, surface the rejection in the existing banner, no Overwrite button.
- If anything makes you **change a fix's shape** rather than its size, stop and report rather than improvising: #1/#2/#7/#9 each have a validated repro whose mechanism the design depends on.

**Two things to verify rather than assume:**
1. **`smoke.mjs`'s `add_column`/`remove_column status qa` sequence** (`:302-315`) after 1.2. It should stay green — the only ticket reaching `done` is `TICK-002`, proven at `:223` — but confirm by running.
2. **`store.test.ts:271`** creates a ticket directly into `done` with no proof. It has a fresh root per `beforeEach`, so 1.2 should not touch it. Confirm.

**Baseline to beat:** at `7706a2064a`, `npm test` is 53/53, `smoke.mjs` is 62/62 against both the dev build and the committed bundle, `plugin:check` says "20 tools match", the GUI typechecks/builds/boots clean, and the committed bundle is byte-identical to a fresh build (md5 `5aab2d5ac68a5d0a487032eace90b5e9`, 1 383 835 B). At the end: core tests ≈ 53 + ~25 new, a GUI suite of ~35, both smoke scripts green against dev build *and* bundle, `verify-agents-block.mjs` green, and `plugin:check` reporting matching names **and** matching bytes.

---

## Handoff notes — additions for the expanded scope

**New conventions the added scope imposes:**
- **Extract pure helpers; do not bury logic in JSX.** `renderer/src/lib/` is the only renderer code with tests. Every new rule (blocked, overdue, drop position, optimistic order, the entire standup report and its markdown) goes there, is exported, takes its inputs explicitly — **including `now`/`today`, never `Date.now()` internally** — and gets a vitest case before any component consumes it. Commits 12 → 13/14 encode that order; keep it.
- **Preserve `React.memo(Card)`.** Phase 7.5's performance work depends on cards receiving stable props. Pass badge state and drop hints to `Card` as **primitives** (`blocked: boolean`, `overdue: boolean`, `dropEdge: "before" | "after" | null`), never a `Set` or object rebuilt each render. A single `blocked={blockedSet}` prop would re-render every card on every board change and silently undo Phase 7.5.
- **`shared/ipc.ts` changes come in fours.** A channel needs an entry in `CH`, a method on `KanmerApi`, a wrapper in `preload/index.ts` and a handler in `main/index.ts`. Commit 10 does all five channels at once for exactly this reason — if you find yourself editing `shared/ipc.ts` in a later commit, stop and check whether commit 10 should have covered it.

**New gotchas:**
- **`order` is column-scoped; the board renders by area** (new AGENTS.md §8 gotcha 9). Neighbour computation for drops must use `columnCards(items, statusId)`. **A single-area test board will not reveal this** — test with at least two area groups in one column.
- **`e.stopPropagation()` on the card's `onDrop` is load-bearing.** Without it the cell's handler also fires and issues a second, position-less `moveItem`, producing two writes and a visible jump.
- **The SDK `Client` cannot pin a protocol version** (`client/index.js:285` hardcodes `LATEST_PROTOCOL_VERSION`). The back-compat run must speak raw JSON-RPC; do not try to make `smoke.mjs` do it.
- **The server logs to stderr, frames to stdout.** `smoke-protocol.mjs` must parse stdout strictly and only surface stderr on failure, or the "kanmer-mcp ready" line will look like a malformed frame.
- **`takeTicket` runs the proof gate** (`store.ts:667-669`), so the palette's Take can be refused on some boards. Surface the error; do not swallow it.

**New "verify rather than assume" items:**
1. **`smoke.mjs` creates.** Grep for any `create_item`/`create_items` call carrying a final-stage `status` before landing commit 2. From the read at `7706a20` there is none — confirm.
2. **`store.test.ts:271` is the only final-stage create in the suite.** Grep `status: "done"` across `packages/core/src/*.test.ts` before assuming one edit covers it.
3. **The `_meta` probe in `smoke-protocol.mjs`.** If it fails, that is a real finding about the SDK forwarding `params._meta`, **not** a reason to delete `actorName`'s branch. Report it and turn it into a §11 bullet.
4. **Existing drag behaviour before you change it.** Run rows 1–6 of the drag matrix on the *unmodified* app first and note what happens today, so "regression" is measured against something observed rather than remembered.
5. **`styles.css` theme tokens.** The new `.chip.blocked` / `.chip.overdue` / `.card.drop-before` / `.standup-group` rules must be checked in **both** the dark block and `[data-theme=light]`; the file keeps them in separate sections.

**New conservative fallbacks — take them and say so, do not silently expand or drop:**
- **A1 (highest risk).** If per-card edge detection misbehaves, ship the contract + main + `"bottom"` cell fallback + optimistic order and drop the per-card targets. Drags stay column-scoped but no longer leave stale `order`. Report it.
- **A6 Take.** If the branch modal balloons, ship Move ▸ and Release (both need no new IPC) and report Take as outstanding — Move and Release are the two the plan text named first.
- **A5 Flags.** If `listItemsWithWarnings` over IPC proves awkward, ship the section with the four warning classes that need no new channel (off-board stage, stale, no area, taken >3 days) and report file warnings as outstanding.
- **A8.** If `applyManagedBlock`'s malformed-marker case gets contentious, throwing is the correct conservative behaviour — never guess at a half-marked file.

**What is genuinely impossible, restated so nobody spends time on it:** the 2026-07-28 protocol revision does not exist in SDK 1.30. No amount of work in this repo adds `ttlMs`/`cacheScope` to `tools/list` or makes a `2025-11-25` host send `io.modelcontextprotocol/client`. A4's "fix" is: correct every place the repo asserts otherwise, prove the server half works with a hand-written frame, and run the back-compat check the plan promised. **If you find yourself editing `node_modules` or hand-rolling a protocol shim, you have gone wrong.**
