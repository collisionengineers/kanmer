# PR #2 — scope adherence review

| | |
|---|---|
| **PR** | [collisionengineers/kanmer#2 — Kanmer upgrades: format v2, MCP surface v2, GUI trust + Windows polish (Phases 1-8)](https://github.com/collisionengineers/kanmer/pull/2) |
| **Branch / base** | `kanmer-upgrades-phases-1-8` → `main` |
| **Reviewed commit** | `7706a2064a708c5b71a48f4195bc39c16978f445` (Phase 8, branch head) — working tree clean |
| **Lens** | **Scope adherence only.** Every deliverable named in `docs/plans/kanmer-upgrades/` (roadmap + 9 phase plans) checked against the shipped code, docs and skills. Correctness/security bugs are the other review's job; where I tripped over one I say so and defer. |
| **Method** | Full read of the roadmap + all phase plans + AGENTS.md + README before touching the diff; then per-phase deliverable checklist against source; then real command runs. `docs/plans/pr-2-review/` was not opened until after the findings below were fixed. |
| **Tooling note** | The brief asked for the TypeScript `LSP` tool. It is **not available in this environment** — `ToolSearch` with `select:LSP` returned "No matching deferred tools found", and a keyword search surfaced only browser/Azure/docs tools. Absence claims below are therefore proven by exhaustive `ripgrep` over the relevant tree plus reading every call site, and by runtime probes of the built server (see below), not by `findReferences`. |
| **Reviewer discipline** | Read-only. No source file was edited, nothing committed or pushed. `npm run build` and `npm run build -w @kanmer/gui` were run (they write only to git-ignored `dist/`/`out/`); `npm run plugin:build` was deliberately **not** run because it writes a tracked file. |

---

## Summary

**The PR delivers most of what it promised, and the headline verification claims are true.** I
re-ran every number in the PR body and all of them hold (§ Verification commands). The committed
plugin bundle is byte-identical to a fresh build at this commit — I checked, rather than assuming.
Phases 1, 2 and 5 are essentially fully delivered against their plans. Phase 4 is delivered except
for gaps the other review already owns.

Three things are true at once and the PR body only says the first:

1. The **core track (Phases 1–2)** is the strongest part of the PR. Every numbered item in both
   plans has code behind it, and the vitest suite tracks the plans' own verification lists closely.
2. **Phase 3's headline — "2026-07-28 modernization" — rests on a false premise.** The SDK it
   upgraded to (1.30.0) tops out at protocol `2025-11-25` and contains zero references to
   `2026-07-28`. The docs disclose one narrow gap (cacheable lists) and imply the rest landed.
3. **Phases 6 and 7 shipped their core halves and quietly dropped several of their GUI halves.**
   Manual card ordering has no GUI writer; the blocked/due card badges Phase 7's own goal statement
   names were never built. Both phases are marked "✅ done" in the roadmap and "DONE" in the
   implementation log, with no note of the omission.

The pattern worth naming: **where a deliverable spans core and GUI, the core half landed and the GUI
half sometimes didn't — and the completion log recorded the core half as the whole item.** That is
the same shape as the other review's "plan↔implementation contradictions", seen from the scope side.

None of my new findings is P1. The blocking issues in this PR are the other review's five P1s.

---

## Verification commands actually run

| Command | Result |
|---|---|
| `npm test` | **PASS — 53/53** (2 files: `frontmatter.test.ts` 4, `store.test.ts` 49). Matches the PR claim. |
| `npm run build` | **PASS** — core + server ESM + `dist/standalone/kanmer-mcp.cjs` (1.32 MB). |
| `node packages/mcp-server/src/smoke.mjs` | **PASS — 62/62 checks** against the dev build. |
| `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs` | **PASS — 62/62** against the committed bundle. Both halves of the PR's "62/62 … dev build **and** the committed plugin bundle" claim verified independently. |
| `npm run typecheck -w @kanmer/gui` | **PASS** — zero output, both `tsconfig.node.json` and `tsconfig.web.json`. |
| `npm run build -w @kanmer/gui` | **PASS** — main/preload/renderer all built. |
| `KANMER_SMOKE=1 KANMER_OPEN=<scratch> npx electron .` (from `apps/gui`) | **PASS — exit 0**, and it really did open the project: the scratch dir came back holding `.kanmer/{version.json,data/board.yml,areas/}`. |
| `npm run plugin:check` | **PASS — "plugin-sync OK — 20 tools match"**. |
| `md5sum packages/mcp-server/dist/standalone/kanmer-mcp.cjs plugins/kanmer/mcp/kanmer-mcp.cjs` | **Identical** — `5aab2d5ac68a5d0a487032eace90b5e9`, both 1 383 835 bytes. **The committed bundle is genuinely in sync with source at this commit.** (`git log` confirms the bundle and the last `packages/**/src` change were both made in `8902a07`.) |
| Runtime probe: connect a real MCP client to `dist/index.js` and dump the surface | `toolCount: 20`; names exactly the 20 in the docs; `serverCapabilities: {"prompts":{"listChanged":true},"resources":{"subscribe":true,"listChanged":true},"tools":{"listChanged":true}}`; `prompts: ["standup","take-ticket"]`; `resources` lists `kanmer://board`. Confirms Phase 3's resources/subscriptions/prompts items are live, not just registered-in-source. |
| `git show main:packages/mcp-server/src/index.ts \| grep -c 'registerTool('` | **11** — confirms the PR's "11 → 20 tools". |
| `node -e` ICO parse of `apps/gui/build/icon.ico` | 7 PNG entries: 16, 24, 32, 48, 64, 128, 256 px. Confirms Phase 5.1's "multi-size icon.ico (16–256px)". |
| `grep -ro '2026-07-28' node_modules/@modelcontextprotocol/sdk/dist/esm/ \| wc -l` | **0**. And `LATEST_PROTOCOL_VERSION = '2025-11-25'`, `SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25','2025-06-18','2025-03-26','2024-11-05','2024-10-07']`. Basis for finding **A4**. |

**Nothing I ran failed.** Every negative result below is a scope/documentation finding, not a broken
command.

---

## New findings — not covered by pr-2-comments.md

### A1 · Manual card ordering has no GUI writer — Phase 6.4's GUI half was never built (P2)

**Committed to.** `docs/plans/kanmer-upgrades/phase-6-data-model/plan.md:23-25`:

> ### 6.4 Manual ordering — M core, L with GUI
> - **Where:** `types.ts`, `frontmatter.ts`, `store.ts` sort + move, server `move_item`, **GUI `Board.tsx` drag**.
> - … **GUI drag-and-drop writes `position` (insertion point from drop target).** Makes "top of the todo column" meaningful for agents; plain YAML number stays hand-editable.

And it is a **locked roadmap decision**, `docs/plans/kanmer-upgrades/upgrades-plan.md:29`:

> - **Data model additions:** activity log, blocks/blocked-by, due dates, **manual card ordering**.

Phase 7 restates the GUI side at `phase-7-gui-evolution/plan.md:31-32`:

> ### 7.6 Optimistic drag — S
> - **Where:** `App.tsx` (~167). `setItems` **status/order swap** before `await moveItem` …

**What shipped.** The core half is complete and well tested (`store.ts:585-636`, `moveItem` +
`computeOrder`; MCP `move_item` exposes `position` at `packages/mcp-server/src/index.ts:477-483`).
The GUI half is absent at **every** layer of the chain:

- `apps/gui/src/renderer/src/components/Board.tsx:97-102` — the drop handler is column-scoped and
  discards any insertion point:
  ```tsx
  onDrop={(e) => {
    e.preventDefault();
    setDropTarget(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) onMove(id, { status: status.id });   // ← no position
  }}
  ```
  The drop zone is the whole `.cell`; there is no per-card drop target to derive an insertion point
  from.
- `apps/gui/src/shared/ipc.ts:121` — the contract itself cannot carry it:
  `moveItem(id: string, to: { status: string }): Promise<Item>;`
- `apps/gui/src/main/index.ts:423-426` — the handler is typed `to: { status: string }`.
- `apps/gui/src/renderer/src/App.tsx:268-280` — `onMove` swaps **status only**
  (`{ ...i, status: to.status }`), so even the optimistic update Phase 7.6 describes as a
  "status/order swap" is status-only.

**Evidence of absence.** `rg 'position|order'` across `apps/gui/src/renderer/src/**/*.{ts,tsx}`
returns only unrelated hits: `App.tsx:288-290` (a local `const order = board.statuses.map(...)` for
Ctrl+←/→), `Board.tsx:59-62` (area-group ordering), and a comment in `Standup.tsx:35`. No occurrence
of `MovePosition`, no `position:` argument, no `order` field written anywhere in the renderer, main,
preload or IPC contract.

**Consequence.** Cards *render* in `order` (core sorts `(order ?? +Infinity, id)` in
`store.ts:930-936`), so a human sees the ordering an agent set — but has no way to change it. Every
GUI drag also silently leaves the card's existing `order` intact, so dragging a card between columns
can land it in a position the user did not choose and cannot correct. The feature is agent-write /
human-read-only, which is the opposite of what "manual card ordering" reads as.

**Why this is a scope finding and not a nitpick.** It is silent. `phase-0-pr1-verify-merge/plan.md:88`
records Phase 6 as DONE listing only the core mechanics ("6.4 fractional `order` (sort …,
`move_item position: top|bottom|{after}` with lazy column materialisation + midpoint-exhaustion
rebalance, summary `order`)"); `:91` records 7.6 as "optimistic drag (instant **status** swap …)".
Neither mentions that the GUI cannot write `position`. `upgrades-plan.md:12-13` marks both phases
"✅ done". Nothing in AGENTS.md §11 or README lists it as a limitation — README:119 advertises
"Drag cards between stages (optimistically — they land instantly)" without saying ordering is
agent-only.

**Severity: P2.** No data loss, no crash — but a locked roadmap decision is half-delivered and the
completion record says otherwise. Either build the insertion-point drop target, or add one line to
AGENTS.md §11 and amend Phase 6.4.

---

### A2 · The blocked / due card badges Phase 7 names in its own goal statement do not exist (P2)

**Committed to.** `docs/plans/kanmer-upgrades/phase-7-gui-evolution/plan.md:3`:

> **Goal:** surface the v2 model in the GUI (doc tabs, **taken/blocked/due badges**, migration
> prompt), add the standup view and activity feed, and fix the performance ceiling.

Phase 6 defers them here explicitly — `phase-6-data-model/plan.md:17`: "**Card badge in Phase 7.**
Finally gives the standup's 'blocked' flag real data." — and `:21`: "**Overdue card badge in Phase 7**;
standup flags overdue items."

**What shipped.** `apps/gui/src/renderer/src/components/Board.tsx:209-232` is the whole card body.
It renders: the id, a **taken** chip (`item.taken_at` → `⛏ {branch}`), the priority, the title, the
labels and the assignee. There is no blocked indicator and no due/overdue indicator.

**Evidence of absence.** `rg 'blocked|overdue|due'` across `apps/gui/src/renderer/src/**/*.{ts,tsx}`
returns exactly 15 lines, all in two files and none in `Board.tsx`:

- `Editor.tsx:36,50,74,491-492` — the `due` **form input**;
- `Editor.tsx:580,591-592` — a read-only "Blocked by" link group in the links panel;
- `Standup.tsx:23-30,113,168,171-174` — the standup view's own blocked/overdue sections.

So the data reaches the renderer (`Item.due`, `Item.blocks` are on the items `App` already holds) —
it is simply never rendered on a card. The one card badge that does exist is the taken chip, i.e.
one of the three the goal statement names.

**Consequence.** The board — the app's primary surface — cannot show that a ticket is blocked or
overdue. A human has to open the Standup view or the Editor's links panel to find out. Phase 6's two
new data-model features are therefore invisible in the place they were designed to appear.

**Silence.** `phase-0-pr1-verify-merge/plan.md:91` logs Phase 7 as DONE and enumerates 7.1–7.9
individually; card badges appear in none of them, and the phase goal line's promise is not
mentioned. Nothing in AGENTS.md §11 or README records the omission. README:119 describes the card's
contents ("carry an area stripe, and show a ⛏ badge while an agent has them taken") without
claiming badges that don't exist — so the README is honest; the plan record is not.

**Severity: P2.** Two shipped data-model features have no presence on the primary UI surface, and
the phase's own goal statement is unmet without a note.

---

### A3 · `tool-reference.md` still documents the format-1 item model, contradicting itself and the code (P2)

**Committed to.** `docs/plans/kanmer-upgrades/phase-8-skills-plugin-docs/plan.md:9-10` puts
`references/tool-reference.md` inside the 8.1 rewrite; `:44` makes it a standing rail obligation
("Tool-reference row per new/changed tool … reflect param changes in the Key-params column").
`upgrades-plan.md:66` states the model change: "**Plan/research item types retire.**"

**What shipped.** `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:74-83` — the
last section of the file — is untouched format-1 content:

```markdown
## Item types

Each type lives in its own folder with its own id prefix (configurable):

| Type | Folder | Default prefix | Use for |
|---|---|---|---|
| `ticket` | `.kanmer/tickets/` | `TICK` | A unit of work that appears on the board |
| `plan` | `.kanmer/plans/` | `PLAN` | Coordinating several tickets toward one outcome |
| `research` | `.kanmer/research/` | `RES` | Findings that outlive the conversation |
```

Every row is wrong for a v2 board:

- `.kanmer/tickets/` is the legacy path. v2 tickets live at
  `areas/<area|_none>/<ID>/<ID>.md` (`packages/core/src/paths.ts:95-103`, `store.ts:487-490`).
- `plan` and `research` are **rejected at create time** on v2 —
  `packages/core/src/store.ts:442-448` throws
  *"This board stores plans inside ticket folders, not as standalone items. Create a ticket, then
  write the document with set_ticket_doc(doc: "plan")."*
- The same file contradicts itself 50 lines earlier, at `tool-reference.md:23`:
  *"On format-2 boards `plan`/`research` types are rejected: those live inside ticket folders via
  `set_ticket_doc`."* And so does the live tool description
  (`packages/mcp-server/src/index.ts:402`).

**Why the gate missed it.** `scripts/check-plugin-sync.mjs:32-35` deliberately truncates the document
at the `## Field semantics` heading before extracting names, precisely so field names aren't mistaken
for tools:

```js
const toolSection = refDoc.split(/^## Field semantics/m)[0];
```

Everything from `## Field semantics` down — including this stale `## Item types` section — is
structurally invisible to `plugin:check`. It passes (I ran it: "20 tools match") while the file
tells agents to use a retired item model.

**Consequence.** This is the file the workflow skill points agents at for ground truth
(`kanmer-workflow/SKILL.md:91-92`: *"For exact tool parameters and what each field means, read
`references/tool-reference.md`"*). An agent that reads the bottom of the file will believe
`.kanmer/tickets/` is where tickets live and that `create_item type:"plan"` is a legitimate call. The
error message is good enough that it will self-correct, so this is confusing rather than destructive.

**Severity: P2.** It is the agent-facing contract document, it is wrong, it contradicts itself, and
the repo's only sync gate cannot see the section it is wrong in.

---

### A4 · "2026-07-28 modernization" rests on a premise the installed SDK does not satisfy (P2)

**Committed to.** `docs/plans/kanmer-upgrades/phase-3-mcp-surface/plan.md:21-30`:

> ## MCP 2026-07-28 modernization
> - **SDK upgrade** — M. `@modelcontextprotocol/sdk` ^1.12.0 → latest (**2026-07-28 support**). Old
>   hosts keep working via version negotiation; **verify with `smoke.mjs` against both protocol versions**.
> - **Actor attribution** — S. Read client identity from per-request `_meta` (**2026-07-28**) with
>   `clientInfo` fallback (older hosts) …

and `:39`: *"Run smoke against dev build AND the plugin bundle (`KANMER_SERVER`), **and against an
older-protocol host config for back-compat**."*

**What shipped.** `packages/mcp-server/package.json:20` pins `"@modelcontextprotocol/sdk": "^1.30.0"`
and 1.30.0 is what is installed. That SDK does not implement the 2026-07-28 revision:

```
$ grep -ro '2026-07-28' node_modules/@modelcontextprotocol/sdk/dist/esm/ | wc -l
0
$ grep -n 'LATEST_PROTOCOL_VERSION\|SUPPORTED_PROTOCOL_VERSIONS' \
    node_modules/@modelcontextprotocol/sdk/dist/esm/types.js
2:export const LATEST_PROTOCOL_VERSION = '2025-11-25';
4:export const SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, '2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07'];
```

The highest protocol this server can ever negotiate is `2025-11-25`. Consequences for the individual
items:

- **Actor attribution's `_meta` branch is unreachable under any negotiable protocol.**
  `packages/mcp-server/src/index.ts:68-76` reads
  `meta["io.modelcontextprotocol/client"]?.name` then `meta["clientInfo"]?.name`, falling back to
  `server.server.getClientVersion()?.name`. `rg 'io.modelcontextprotocol' node_modules/@modelcontextprotocol/sdk/dist/esm/`
  finds only `io.modelcontextprotocol/related-task` — the client-identity key does not exist in this
  SDK, and no 2025-11-25 client will send it. In practice the actor always comes from the
  `getClientVersion()` fallback. (This is why the smoke check "get_activity records the mutations
  with the client as actor" passes — it is exercising the fallback, not the `_meta` path.) The code
  is harmless and forward-looking, but it is dead as shipped and nothing says so.
- **Elicitation (MRTR) is fine** — `elicitInput` exists from 2025-06-18, and
  `index.ts:84-102` guards on the capability. Delivered.
- **Resources + subscriptions, prompts** — delivered and verified live by my runtime probe.
- **Cacheable lists** — correctly declared not-done.

**The disclosure is narrower than the gap.** `AGENTS.md:347` says only:

> - `ttlMs`/`cacheScope` on `tools/list` (2026-07-28 cacheable lists) awaits SDK support — noted in
>   `mcp-server/src/index.ts` `main()`.

`upgrades-plan.md:9` marks Phase 3 "✅ done (**cacheable tools/list awaits SDK**)".
`phase-0-pr1-verify-merge/plan.md:79` says "**Not done:** `ttlMs`/`cacheScope` on tools/list — SDK
1.30 doesn't expose the 2026-07-28 cacheable-list fields yet". All three frame cacheable lists as
*the* outstanding item, which implies the rest of 2026-07-28 landed. It did not: the protocol
revision itself is unavailable. The commit message is `Phase 3: MCP surface v2 + 2026-07-28
modernization`.

**Verification gap in the same item.** The plan asked for a smoke run "against an older-protocol host
config for back-compat" and "against both protocol versions". `smoke.mjs` has no protocol-version
handling at all — `rg 'protocolVersion' packages/mcp-server/src/smoke.mjs` returns nothing; the
client is constructed once (`smoke.mjs:31`) with default negotiation. Nothing in the repo or the log
evidences a back-compat run.

**Severity: P2.** Behaviour is fine today; the *record* is wrong in a way that will mislead whoever
picks up the SDK upgrade next, and it leaves a dead code path presented as a shipped feature. The
honest amendment is one line in AGENTS.md §11 ("SDK 1.30 negotiates at most 2025-11-25; the
2026-07-28 `_meta` client-identity path is forward-compatible dead code until the SDK ships it") plus
a note in the roadmap's Phase 3 row.

---

### A5 · The Standup view does not match the skill it is specified against (P3)

**Committed to.** `phase-7-gui-evolution/plan.md:20`:

> - Derived from `items` + `get_activity`: In flight (taken, with branch), In review, Recently done
>   (activity says moved to last stage <48h), Up next (top of first stage by `order`), Blocked
>   (derived from `blocks`), Overdue. **Grouped by assignee/actor.** **Copy as Markdown** button —
>   **same shape the `kanmer-standup` skill emits, so human and agent standups match.**

and its verification, `:46`: *"Standup view matches the skill's markdown output for the same board
state."* The PR body repeats it: *"Standup view matching the skill's output (Copy as Markdown)"*.

**What shipped** — `apps/gui/src/renderer/src/components/Standup.tsx:132-176` returns exactly six
sections: In flight, In review, Up next, Recently done, Blocked, Overdue. Three divergences from the
skill (`plugins/kanmer/skills/kanmer-standup/SKILL.md:50-80`):

| | Skill | GUI |
|---|---|---|
| **Grouping by assignee/actor** | "grouped by actor when more than one was active" (`SKILL.md:74-75`) | Not implemented — flat lists. `assignee` surfaces only inside the In-review line (`Standup.tsx:151`). |
| **"What happened since yesterday"** | A named section (`SKILL.md:73-75`) | Absent. The activity log is read (`Standup.tsx:42-45`) but used only to compute `doneRecently`. |
| **"Flags"** | A named section — file warnings, off-board stages, stale items, tickets taken >3 days (`SKILL.md:77-79`) | Absent. The GUI has no access to warnings at all (`App.tsx:65` calls `listItems`, not `listItemsWithWarnings`) and there is no off-board-stage callout. |
| **"Recently done" window** | "the last 7 days" (`SKILL.md:63`) | 48 h — `Standup.tsx:20` `const RECENT_MS = 48 * 60 * 60 * 1000;` |

The 48 h window follows the Phase 7 plan text, so that one is the *skill* and the *plan* disagreeing
rather than the code being wrong — but it means the two outputs cannot match for the same board.

**Positive note, verified:** `Standup.tsx:22-31`'s comment claims parity with core's blocked rule and
it holds — `blockedIds()` (skip archived blockers, skip blockers in the last stage) is semantically
equivalent to `computeBlockedIds()` in `packages/core/src/links.ts:61-73`.

**Severity: P3.** The view is useful and the six buckets are right; the "matches the skill" claim in
the plan's verification section and in the PR body is what does not hold.

---

### A6 · Command palette ships four of the six verb classes the plan named (P3)

**Committed to.** `phase-7-gui-evolution/plan.md:40`:

> - **Where:** new `CommandPalette.tsx`, `App.tsx` (Ctrl+K). Fuzzy overlay: jump-to-item + verbs
>   (New ticket, **Move ▸**, **Take/Release**, Switch view, Theme, Settings) …

**What shipped.** `CommandPalette.tsx` is a generic renderer; the verbs come from
`App.tsx:399-420`, which supplies exactly ten commands: `new-ticket`, `view-board`, `view-standup`,
`view-archived`, `activity`, `settings`, `theme-dark`, `theme-light`, `theme-system`,
`open-project`. **No "Move ▸" and no "Take/Release".** Confirmed by reading
`CommandPalette.tsx:30-47` — the only other result class it builds is jump-to-item.

Release *is* reachable from the card context menu (`main/index.ts:362-364`), and Move from both the
context menu and Ctrl+←/→ — so no capability is lost, only the palette affordance.

`phase-0-pr1-verify-merge/plan.md:91` logs "7.9 Ctrl+K command palette (jump-to-item + verbs …)"
without saying which verbs.

**Severity: P3.** Cosmetic scope shortfall on an optional affordance; worth a one-line plan amendment
rather than code.

---

### A7 · `examples/codex-config.toml` still carries the author's hardcoded machine path (P3)

**Committed to.** `phase-8-skills-plugin-docs/plan.md:50`:

> - **README.md:** … **fix the hardcoded `C:/Users/Alex/...` path in the manual-registration
>   examples** (~lines 141–148); document `kanmer-setup` modes and the AGENTS.md block.

`phase-0-pr1-verify-merge/plan.md:94` records it as done: *"README rewritten (… `<kanmer-repo>`
placeholders replacing the hardcoded `C:/Users/Alex/...` paths …)"*.

**What shipped.** README was fixed (`README.md:172,179` now use `<kanmer-repo>`). The example file
the README sends readers to was not:

```
$ grep -rn 'C:/Users/Alex' --include=*.md --include=*.toml --include=*.json --include=*.ts . \
    | grep -v node_modules | grep -v docs/plans
./examples/codex-config.toml:24:args = ["C:/Users/Alex/Documents/GitHub/kanmer/packages/mcp-server/dist/index.js"]
./examples/codex-config.toml:32:#   "C:/Users/Alex/Documents/GitHub/kanmer/packages/mcp-server/dist/index.js",
```

`examples/codex-config.toml` does not appear in `git diff main...kanmer-upgrades-phases-1-8 --stat`
— it was never touched. And `README.md:167` now explicitly routes the reader there:

> **codex** — add to your project's `.codex/config.toml`, replacing `<kanmer-repo>` with wherever you
> cloned this repo (see [examples/codex-config.toml](examples/codex-config.toml)):

So the README fix points at the unfixed copy. The plan said "the manual-registration examples"
(plural); one of the two was fixed and the log claims both.

**Severity: P3.** Cosmetic, but it is a public-facing file in a repo intended for plugin
distribution, and the completion log asserts it was handled.

---

### A8 · Phase 8.2's AGENTS.md managed block is prose only — its central "idempotent" guarantee is unimplemented and unverified (P3)

**Committed to.** `phase-8-skills-plugin-docs/plan.md:36`:

> Rules: if `AGENTS.md` is missing, create it with the block + a stub heading … If present, insert
> the block above everything else. **Upgrade mode refreshes only the content between the markers
> (idempotent — never touches the rest of the file).** If a `CLAUDE.md` exists that doesn't reference
> `AGENTS.md`, add a one-line pointer to it.

Verification, `:54-55`:

> - Fresh scratch repo, plugin installed: `kanmer-setup` greenfield creates the board, seeds tickets,
>   and `AGENTS.md` starts with the managed block; **running it again changes nothing (idempotent)**.
> - Repo with an existing `AGENTS.md`: block lands at the very top, existing content untouched;
>   upgrade mode refreshes only between markers.

**What shipped.** `plugins/kanmer/skills/kanmer-setup/SKILL.md:74-107` states those four rules
faithfully — as **instructions to a model**. There is no tool, no core function and no test behind
them: `rg 'kanmer:instructions'` across the repo matches only the SKILL.md block itself. The
marker-block edit is performed by the agent with its own file-editing tools, so "idempotent",
"never touches the rest of the file" and "the very first thing in the file" are behaviours a model
is asked to produce, not properties the system enforces.

That is a legitimate design choice for a skill. The finding is that **it is presented as a verified
deliverable**: `phase-0-pr1-verify-merge/plan.md:94` records 8.2 as DONE "with the **AGENTS.md
managed block** (top-of-file, marker-delimited, **idempotent refresh**, CLAUDE.md pointer rule)", and
the PR body calls it "a marker-delimited, **idempotently-refreshed** Kanmer operating instructions
block". Nothing in the repo or the log evidences that the Phase 8 end-to-end verification (fresh
scratch repo, plugin installed, run twice) was ever performed — unlike Phases 1–3 and 6–7, whose log
entries carry concrete numbers.

**Severity: P3.** The skill text is good and the claim is plausible; it is simply unproven, and it is
the one Phase 8 deliverable with no mechanical backstop.

---

### A9 · Two plan-named test assertions were not written (P3)

Both are small, both are named in a plan's own Verification section, and both are absent from the
53-test suite:

1. **`phase-1-core-correctness/plan.md:49`** — *"no-op update leaves `updated` **and file mtime**
   unchanged"*. `store.test.ts:173-182` asserts `same.updated === t.updated` and the empty-patch case,
   but never stats the file. The implementation does return before writing (`store.ts:530-536`), so
   the property holds by construction — but the assertion the plan named, which is the one that would
   catch a regression that starts writing an identical file, does not exist.

2. **`phase-6-data-model/plan.md:33`** — *"Ordering: midpoint insertion between neighbors,
   unordered-after-ordered, **rebalance path**"*. `store.test.ts:578-602` covers materialisation,
   midpoint insertion, bottom placement, unordered-sorts-last and the bad-`after` error. It never
   drives the rebalance branch at `store.ts:630-635` (reached only when a midpoint stops separating
   its neighbours). That branch is the least-exercised code in the ordering feature and is unreachable
   without ~50 successive insertions between one pair.

**Severity: P3.** Coverage shortfalls against the plans' own checklists, on code that currently
behaves correctly.

---

## Findings that overlap the existing 9

I found no *new* correctness defect that duplicates one of the nine — the overlap is at the level of
shared root causes, and in two places my scope lens re-frames something they filed as context.

| My observation | Maps to | Re-scope / re-severity under the scope lens |
|---|---|---|
| `kanmer-setup` Upgrade mode cannot actually migrate: there is **no MCP migrate tool** (20 tools, none named `migrate`; `migrateToV2` is reachable only via `CH.migrate`, `main/index.ts:453-455`), so `SKILL.md:67-69` tells the agent to ask a human to click a GUI button. `phase-2-format-v2-storage/plan.md:68` and `upgrades-plan.md:68` both say the skill "drives the same function **for agent-only flows**". | Cross-cutting §"Two API-level absences", and the setup for **#2** | They treat it as the *precondition* for the stale-`formatCache` race. I'd additionally file it **as a Phase 8.2 deliverable gap in its own right**: a plugin user with no GUI installed — the plugin is distributed standalone and README:128-149 documents installing it alone — has **no path at all** to upgrade a v1 board. That is scope, not concurrency, and it survives any fix to #2. **P2 on its own merits.** |
| `npm run plugin:check` reads `packages/mcp-server/src/index.ts`, never the bundle (`check-plugin-sync.mjs:19,26`), so a forgotten `plugin:build` passes the gate — while `upgrades-plan.md:81` and AGENTS.md §7/§8-gotcha-8 present it as the thing that keeps the bundle current. | Cross-cutting §"verification story is thinner" | Same fact, and I'd keep their severity. **One thing I can add that they explicitly could not:** I checked, and **there is no drift today** — a fresh `npm run build` produces a bundle byte-identical to the committed one (md5 `5aab2d5a…`, 1 383 835 B). Their note "it passing proves nothing" is correct about the gate; the artifact itself is clean at `7706a20`. |
| Editor doc tabs have no baseline/conflict handling; the load effect skips while dirty and `saveDoc` writes unconditionally. I reached this from `phase-7-gui-evolution/plan.md:15`'s claim that "the Phase 4 baseline/conflict pattern applies per tab". | **#3**, and cross-cutting plan-contradiction #2 | Identical finding, and their tracing is deeper than mine (they establish the API-level absence across all three layers and correct the checklist-toggle scope). Nothing to add; I defer entirely. |
| I initially judged Phase 4.3's unwired "tab switch" gate to be harmless, reasoning that the Editor stays mounted across **view** switches so no edit is lost. | **#4** | **They are right and I was wrong.** The plan's "tab switch" is the Editor's *document* tabs, where `DocEditor` is `key`ed by `tab` (`Editor.tsx:432`) and unmounts on switch — real loss. Recording the correction rather than the observation. |
| `Settings.tsx` ↑/↓ reorder writes the whole board via `setBoard`, bypassing `reorderColumns()`; and `validateDraft()` mirrors core's checks by hand. | **#7** sibling path, **#1** sibling path | Same sites. From the scope side these are both instances of AGENTS.md §7's "Every board mutation from the GUI goes through `setBoard`" convention colliding with Phase 3's new granular verbs — a convention the PR added tools to obsolete but never revisited. Worth one line in AGENTS.md §7; no severity change. |
| `renderMarkdown`'s raw-HTML override (Phase 4.5) escapes the wiki anchors the same function generates. | **#5** | I read `markdown.ts:16-31` and ticked 4.5 as delivered against the plan text. Their runtime test (0 of 13 wiki-link cases produce a live anchor) shows the two halves of one plan bullet cancel each other. Their result stands; my scope tick was wrong and I withdraw it. |

---

## Adherence matrix

| Phase | Deliverables checked | Met | Missing / partial / divergent | Notes |
|---|:---:|:---:|---|---|
| **1 — core correctness** | 8 (1.1–1.8) | **8** | — | All eight have code and tests. `assertFieldAgainstBoard` (`store.ts:862-875`) honours the plan's exact rules incl. `area: ""` and empty-`areas` permissiveness; board-derived priority default at `:878-882`; `assertSafeId` + containment at `paths.ts:58-74`; no-op guard at `:530-536`; `writeFileExclusive` (temp + `fs.link`, `wx` fallback) at `io.ts:41-58`. Verification gap: mtime assertion (**A9**). |
| **2 — format v2 + migration** | 8 (2.1–2.8) | **8** | *Divergent, disclosed:* path helpers are `ticketDirIn/ticketFileIn/docFileIn(ticketDir, doc)` rather than the plan's `ticketDir(paths,id)/ticketFile/docFile` — logged at `phase-0…:70`. *Divergent, disclosed:* `getItem` does not gain `docs`/checklist (plan 2.5); `getTicketDocsInfo` does, and the MCP `get_item` merges it — logged at `phase-0…:72` and AGENTS.md §5. | Strongest phase. Migration test (`store.test.ts:708-756`) covers dry-run → run → body preservation → fold → orphan → prefixes → version.json → idempotent re-run. Note the other review's #1/#8/#9 all land inside `migrate.ts:151-186`. |
| **3 — MCP surface v2 + 2026-07-28** | 6 tools/groups + 6 modernization items + 1 companion fix | **11** | **A4** — the 2026-07-28 premise (SDK caps at 2025-11-25); `_meta` actor path dead; back-compat protocol smoke run not done. Cacheable lists correctly declared not-done. | Tool surface fully delivered: 20 tools verified live over stdio, with the plan's exact annotations. `connect.ts` per-project registration delivered (`-s project` + cwd; codex `kanmer-<folder>` names + stale user-scope cleanup). |
| **4 — GUI trust** | 8 (4.1–4.8) | **6** | 4.5 — the raw-HTML escape breaks the wiki anchors it should preserve (**other review #5**). 4.3 — "tab switch" leg unwired (**other review #4**). | Diff-based saves with `expectedUpdated`, live re-sync + Keep-mine/Take-theirs, save-time `getItem` recheck, Settings inline validation with no optimistic `setBoard`, empty/filtered-empty/opening/error states, QuickAdd blur-never-creates + per-area "+", `grid-template-rows: auto 1fr` — all present and matching the plan text. |
| **5 — Windows app** | 10 (5.1–5.10) | **10** | *Divergent, disclosed:* context menu has Release but no Take (needs a branch — logged at `phase-0…:85`). *Divergent:* theme "system" follows the OS via renderer `matchMedia` (`App.tsx:127-138`) instead of the plan's `nativeTheme.on("updated")` + IPC push — logged at `phase-0…:85`; behaviour equivalent. Toast batch window is 1.8 s, plan said 5 s. | Verified concretely: icon.ico is 7 PNG entries 16–256 px; AUMID set first in `whenReady`; single-instance; bounds persisted + display-intersection validated; menu hides Reload/DevTools when `app.isPackaged`; focus trap + `role=dialog`; cards `tabIndex`/`role=button`/aria-label-with-area; `aria-live` announcement; Archived view with 2-click permanent delete. `phase-0…:86` correctly records that installer/toast checks need the deferred `npm run dist` pass. Minor log error: it says "Ctrl+1–4 views" but there are 3 views and `App.tsx:370` handles `1`–`3`. |
| **6 — data model** | 4 (6.1–6.4) | **3.5** | **A1** — 6.4's GUI drag half missing. **A9** — rebalance path untested. | 6.1/6.2/6.3 fully delivered incl. the derived-blocked rule, `""`-clears-due, last-stage exemption, and a byte-noise test for old files (`store.test.ts:604-613`). |
| **7 — GUI evolution** | 9 (7.1–7.9) | **6.5** | **A2** — blocked/due card badges (phase goal line). **A5** — standup grouping + skill parity. **A6** — palette verbs. 7.2's per-tab conflict pattern (**other review #3**). | 7.1 migration banner + dry-run modal + one-click migrate, 7.2 doc tabs with presence dots / checklist n/m / live checkboxes, 7.4 bell + panel + in-app toasts, 7.5 scoped per-file refresh + `React.memo(Card)` + stable callbacks (and the real `watch.ts` per-file coalescing fix), 7.6 optimistic status swap, 7.7 resize + sticky foot, 7.8 ChipInput — all present. |
| **8 — skills, plugin, docs** | 5 (8.1–8.5) | **4** | **A3** — stale `## Item types` in tool-reference. **A7** — `examples/codex-config.toml` unfixed. **A8** — AGENTS.md block unverified/unenforced. Overlap: upgrade mode can't migrate agent-only. Minor: tool-reference `## Field semantics` (`:52-72`) never gained `due`, `order`, `blocks`, `taken_at`/`branch`/`worktree`, though AGENTS.md §9's own recipe requires it. | All five doc templates present; `kanmer-onboard` → `kanmer-setup` renamed with both manifests pointing at `./skills/` (no manifest edit needed — correct); standup skill genuinely rewritten on facts; AGENTS.md §4/§5/§11 and README rewritten for v2 with accurate 20-tool lists on both sides. |

**Undocumented extras:** none found. Everything in the diff traces to a plan bullet —
`apps/gui/scripts/make-icon.mjs` (implied by 5.1's "generate a placeholder mark", and documented in
AGENTS.md §2), the `.gitignore` `!apps/gui/build/` exception, `ChipInput.tsx` (7.8), the `watch.ts`
per-file coalescing change (required by 7.5, disclosed in the log and in AGENTS.md §2), and the SDK
bump (3).

---

## What the PR description claims vs what is verifiable

| Claim | Verdict | Evidence |
|---|---|---|
| "`npm test` — **53/53** (incl. v1 fixture compatibility + full migration round-trip)" | **HOLDS** | 53 passed. `store.test.ts:616-756` is the v1 fixture suite; `:708` is the migration round-trip. |
| "`smoke.mjs` — **62/62**, against both the dev build **and** the committed plugin bundle" | **HOLDS** | Ran both. 62/62 each. |
| "`typecheck -w @kanmer/gui`, `build -w @kanmer/gui`, `KANMER_SMOKE=1` boot — clean / exit 0" | **HOLDS** | All three run; typecheck silent, build clean, boot exit 0 and it created the v2 skeleton in the scratch project. |
| "`plugin:build && plugin:check` — 20 tools match" | **HOLDS**, with a caveat worth stating | `plugin:check` prints "20 tools match" and a live client confirms 20 tools. The caveat: `plugin:check` validates *source* against the reference doc, never the bundle. I closed that gap by hand — the committed bundle is byte-identical to a fresh build. |
| "11 → 20 tools" | **HOLDS** | `main` has 11 `registerTool(` calls; head has 20; the runtime list matches the documented names exactly. |
| "board/items as subscribable MCP resources, `standup` + `take-ticket` prompts" | **HOLDS** | Live probe: `resources: {subscribe: true, listChanged: true}`, `kanmer://board` listed, `prompts: ["standup","take-ticket"]`. |
| "**Modernization on SDK ^1.30: actor attribution from client identity**" | **HOLDS in the weak reading, not the strong one** | Actor attribution works — via the `clientInfo`/`getClientVersion()` fallback. The per-request `_meta` client-identity path the plan specified cannot fire on any protocol this SDK negotiates (**A4**). The PR body wisely omits "2026-07-28" here; the commit message does not. |
| "Known deferred items are recorded in AGENTS.md §11 (SDK cacheable-list support, GUI whole-board-save column stranding, TICK-fallback prefix race)" | **HOLDS for those three; the list is incomplete** | All three are at `AGENTS.md:345-347`. Not recorded anywhere: no GUI ordering writer (**A1**), no blocked/due card badges (**A2**), no agent-reachable migration, and the 2026-07-28 protocol ceiling (**A4**). |
| "Standup view matching the skill's output (Copy as Markdown)" | **DOES NOT HOLD** | Two of the skill's eight sections are absent, the recently-done window differs (48 h vs 7 d), and the assignee/actor grouping the plan required was not built (**A5**). |
| "`kanmer-setup` … which installs a marker-delimited, **idempotently-refreshed** Kanmer operating instructions block at the top of the target repo's AGENTS.md" | **UNVERIFIABLE** | The skill instructs a model to do this; no code, no tool, no test enforces or checks it, and no artifact shows the Phase 8 end-to-end run happened (**A8**). |
| "Installer/toast checks that need real hardware were left for a manual `npm run dist` pass" | **HOLDS — and is the right disclosure** | Matches `phase-0…:86`. Phase 5's verification section is entirely manual; deferring it explicitly is correct, not a gap. |

---

### One line for the author

The core is in better shape than the PR's own paperwork suggests, and the paperwork is in worse shape
than the code: the strongest single action is to stop marking phases "done" from the core half alone
— A1, A2 and A4 are all cases where the log recorded the part that shipped and the roadmap's ✅
carried the rest.
