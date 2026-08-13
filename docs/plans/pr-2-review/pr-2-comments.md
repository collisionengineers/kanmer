# PR #2 — review comments

> **Status:** raw capture + impact tracing + **validation complete**. All nine claims were
> tested empirically and all nine stand — see [Verdict summary](#verdict-summary).
> Priorities are the review bot's own; verdicts and impact assessments are ours.

| | |
|---|---|
| **PR** | [collisionengineers/kanmer#2 — Kanmer upgrades: format v2, MCP surface v2, GUI trust + Windows polish (Phases 1-8)](https://github.com/collisionengineers/kanmer/pull/2) |
| **Branch** | `kanmer-upgrades-phases-1-8` → `main` |
| **State** | OPEN |
| **Reviewed commit** | [`7706a2064a`](https://github.com/collisionengineers/kanmer/commit/7706a2064a708c5b71a48f4195bc39c16978f445) (Phase 8 — also the current branch head, so line numbers are live) |
| **Review pass** | 1, by `chatgpt-codex-connector[bot]`, 2026-08-13T00:09:19Z |
| **Comments** | 9 inline · 0 top-level (issue) comments |
| **Fetched** | 2026-08-13 |

---

## Contents

| # | Pri | Area | File | Line | Issue | Status |
|:-:|:---:|------|------|:----:|-------|:------:|
| [1](#1--reject-duplicate-legacy-type-prefixes) | P1 | ids / migration | `packages/core/src/board.ts` | 59 | Reject duplicate legacy type prefixes | ☑ validated |
| [2](#2--refresh-cached-storage-format-after-external-migration) | P1 | store | `packages/core/src/store.ts` | 120 | Refresh cached storage format after external migration | ☑ validated |
| [3](#3--detect-concurrent-document-edits-before-saving) | P1 | GUI | `apps/gui/…/components/Editor.tsx` | 673 | Detect concurrent document edits before saving | ☑ validated |
| [4](#4--preserve-dirty-documents-when-switching-tabs) | P1 | GUI | `apps/gui/…/components/Editor.tsx` | 393 | Preserve dirty documents when switching tabs | ☑ validated |
| [5](#5--keep-generated-wiki-links-out-of-raw-html-escaping) | P1 | GUI | `apps/gui/…/lib/markdown.ts` | 17 | Keep generated wiki links out of raw-HTML escaping | ☑ validated |
| [6](#6--check-move-conflicts-before-materializing-column-order) | P2 | store | `packages/core/src/store.ts` | 592 | Check move conflicts before materializing column order | ☑ validated |
| [7](#7--enforce-the-proof-gate-when-reordering-statuses) | P2 | store | `packages/core/src/store.ts` | 285 | Enforce the proof gate when reordering statuses | ☑ validated |
| [8](#8--remove-folded-document-ids-from-structured-links) | P2 | migration | `packages/core/src/migrate.ts` | 171 | Remove folded document IDs from structured links | ☑ validated |
| [9](#9--make-migration-resumable-after-partial-execution) | P2 | migration | `packages/core/src/migrate.ts` | 154 | Make migration resumable after partial execution | ☑ validated |

---

## Verdict summary

Validation pass, 2026-08-13. Every claim was treated as unproven and attacked
empirically: throwaway node scripts drove `@kanmer/core` (built from
`7706a2064a`) against fixture boards in a scratch dir; the rendering claim was
settled by calling the real `marked@14.1.4` renderer; the two GUI-lifecycle
claims were settled by exact reading of React reconciliation + `grep`-verified
guard reachability. Repro scripts are throwaway and live outside the repo.

| # | Claim | Verdict | One-line reason |
|:-:|---|---|---|
| 1 | Reject duplicate legacy type prefixes | ☑ validated | `writeBoard` accepts `ticket: FOO` + `plan: FOO`; migrating then **destroyed the ticket** (2 items → 1, no error, no report note). |
| 2 | Refresh cached storage format after external migration | ☑ validated | Second `KanmerStore` still returns `1` post-migration; created a standalone plan **and a duplicate `TICK-001`** on a v2 board. |
| 3 | Detect concurrent document edits before saving | ☑ validated | `setDoc` has no version parameter at any layer; a whole-doc write silently discarded the agent's newer content. |
| 4 | Preserve dirty documents when switching tabs | ☑ validated | `DocEditor` is `key`ed by `tab`; `setTab` is the only thing the two tab buttons call and it never reaches `trySelect`. |
| 5 | Keep generated wiki links out of raw-HTML escaping | ☑ validated | **0 of 13** wiki-link cases produced a live anchor; removing the override restores them. Code spans are corrupted too. |
| 6 | Check move conflicts before materializing column order | ☑ validated | A rejected positioned move wrote `order` + bumped `updated` on **3/3 siblings** and appended **3** activity entries. |
| 7 | Enforce the proof gate when reordering statuses | ☑ validated | Reorder accepted; proofless ticket landed in the final stage — and **silently un-blocked** its downstream dependent. |
| 8 | Remove folded document IDs from structured links | ☑ validated | `TICK-001.links` stayed `["PLAN-001"]` after `PLAN-001` was folded away; `get_links` re-exposes it and it never self-heals. |
| 9 | Make migration resumable after partial execution | ☑ validated | `ENOENT` on every retry, forever; the obvious user workaround **silently loses the un-migrated tickets**. |

**All nine stand.** None was refuted and none was left unsettled — every one was
reproduced or proven from code that can be pointed at. Three turned out
**worse than filed** ([2](#2--refresh-cached-storage-format-after-external-migration),
[7](#7--enforce-the-proof-gate-when-reordering-statuses),
[9](#9--make-migration-resumable-after-partial-execution)) and two have a
**wider surface than the cited line** ([5](#5--keep-generated-wiki-links-out-of-raw-html-escaping),
[6](#6--check-move-conflicts-before-materializing-column-order)); those
escalations are recorded in each Impact section. `npm test` is green (53 tests)
at this commit, which is itself the finding: the whole suite is blind to all
nine.

**Themes.** Three of the five P1s are **cross-writer races** — MCP server vs. GUI vs. an
interrupted migration. That is the same class of problem Phase 4 set out to close,
reappearing one layer down: in pipeline-document saves and in the format cache.

---

## Cross-cutting findings from the tracing pass

These emerged from mapping all nine blast radii and belong to no single issue. **None of
them is a verdict** — each is a located fact about the repo.

**Four sibling paths reach a filed issue's end state without touching the filed code.** A
fix scoped to the line the bot cited would miss each of them:

| Filed issue | Sibling path that shares the end state |
|---|---|
| [4](#4--preserve-dirty-documents-when-switching-tabs) (tab switch discards edits) | Delete-while-open (`App.tsx:324-327`, `:542-546`) and open-project / open-recent (`App.tsx:75-91`, `:232`) all call `setSelectedId` **directly**, bypassing `trySelect` |
| [7](#7--enforce-the-proof-gate-when-reordering-statuses) (reorder bypasses proof gate) | GUI Settings ↑/↓ (`Settings.tsx:287-293`) → `setBoard` directly, never touching `reorderColumns()` |
| [1](#1--reject-duplicate-legacy-type-prefixes) (duplicate prefixes pass) | `Settings.tsx:370-401 validateDraft()`, the hand-maintained "mirror of core's write-side checks", has the **identical** `Map`-constructor blind spot |
| [3](#3--detect-concurrent-document-edits-before-saving) (doc save clobbers) | The checklist checkbox (`Editor.tsx:681-695`) reaches the same unconditional write **without `dirty` ever being true** |

**Three plan↔implementation contradictions.** The design docs assert behaviour the shipped
code does not implement:

- `phase-4-gui-trust/plan.md:19` — *"Route every deselection through one `trySelect(id)`
  gate — card click, editor Close, wiki-link navigate, **tab switch**"*. Tab switch was
  never wired. (Directly [issue 4](#4--preserve-dirty-documents-when-switching-tabs).)
- `phase-7-gui-evolution/plan.md:15` — *"docs are single-writer in practice; **the Phase 4
  baseline/conflict pattern applies per tab**"*. No per-tab baseline exists.
  (Directly [issue 3](#3--detect-concurrent-document-edits-before-saving).)
- `phase-2-format-v2-storage/plan.md:39` — *"`writeBoard` validates prefix uniqueness across
  areas + the `TICK` fallback and the plan/research legacy prefixes"*. The legacy-prefix half
  is not enforced. (Directly [issue 1](#1--reject-duplicate-legacy-type-prefixes).)

**The verification story is thinner than the PR summary implies.** Facts, not judgements:

- **`apps/gui` has zero test files.** GUI verification is typecheck + build +
  `KANMER_SMOKE=1` boot (`AGENTS.md:329-337`) — none of which exercise save logic,
  dirty-state, tab switching, or rendering. All three GUI findings sit in untested code.
- **`npm run plugin:check` cannot detect behavioural drift.** `check-plugin-sync.mjs:26-35`
  diffs *tool names* only. The committed bundle carries independent copies of the
  implicated logic for issues 1, 2, 6 and 7 (issue 3's `setDoc` too); it passing proves
  nothing about a fix having reached it.
- **`reorderColumns()` has no test at all**, and `smoke.mjs:285-301` covers
  `reorder_columns` only for `kind: "priority"` — never `"status"`, the proof-gated axis.
- **No test exercises `assertUniquePrefixes` throwing** for *any* collision class.

**Two API-level absences underlie several findings:**

- The **doc-write API has no version parameter at any layer** — not `store.setDoc`
  (`store.ts:722-727`), not MCP `set_ticket_doc` (`index.ts:536-541`), not the GUI IPC
  contract. There is nothing for a concurrency check to plug into, and pipeline docs carry
  no frontmatter to hold an `updated` field. This makes
  [issue 3](#3--detect-concurrent-document-edits-before-saving) a core-API question, not a
  GUI one.
- **Migration has no MCP tool.** `migrateToV2` is reachable only from the GUI
  (`main/index.ts:453-455`), yet `kanmer-setup`'s Upgrade mode
  (`plugins/kanmer/skills/kanmer-setup/SKILL.md:59-72`) scripts an agent to ask the user to
  click Migrate in the app and then re-verify with `get_status` — which is precisely the
  cross-process sequence [issue 2](#2--refresh-cached-storage-format-after-external-migration)
  describes. `upgrades-plan.md:68` claims the skill "does the same for agent-only flows".

**Suggested fix sequencing**, from the coupling the tracing found:

1. **[#2](#2--refresh-cached-storage-format-after-external-migration) + [#9](#9--make-migration-resumable-after-partial-execution) together** — both concern
   "the format marker can disagree with on-disk state", from opposite directions. A #2 fix
   that simply always re-reads `version.json` does **not** fix #9, whose failure mode is
   that `version.json` was never written.
2. **[#1](#1--reject-duplicate-legacy-type-prefixes) + [#7](#7--enforce-the-proof-gate-when-reordering-statuses)** — both are "board write validates shape but not
   cross-entity state" at the same `setBoard`/`writeBoard` chokepoint.
3. **[#1](#1--reject-duplicate-legacy-type-prefixes) + [#8](#8--remove-folded-document-ids-from-structured-links) + [#9](#9--make-migration-resumable-after-partial-execution)** — all three land in the same
   three-loop sequence in `migrateToV2` (`migrate.ts:151-186`).
4. **[#3](#3--detect-concurrent-document-edits-before-saving) + [#6](#6--check-move-conflicts-before-materializing-column-order)** — one "audit every store write path for
   `expectedUpdated` coverage" pass.

---

## How to read / contribute to this file

Every issue below uses the same five-part shape:

| Section | Who fills it | Contains |
|---|---|---|
| **Reported** | review bot | The comment verbatim. Do not edit. |
| **Code at that line** | fetched | The anchored excerpt from `7706a2064a`. Do not edit. |
| **Affected surface** | tracing pass | Everything in the repo the issue touches — call graph, tests, docs, bundled copies. Locating only; asserts nothing about whether the bug is real. |
| **Notes** | anyone | Coupling, overlap with other issues, open questions. |
| **Verdict** | validation pass | `open` → `validated` / `refuted` / `deferred`, plus the evidence. |

Status runs `☐ open` → `◐ traced` (blast radius mapped, truth of the claim still unknown)
→ `☑ validated` / `✗ refuted` / `◑ validated with corrections` (the defect is real but the
bot's description is materially wrong — severity, mechanism or scope) / `⊘ not reproducible`
(could not be settled; says what evidence would settle it). To pick one up: change its
**Status** in the Contents table and fill in **Verdict**. Keep the marker consistent between
the table and the issue body so the table stays a usable index.

**Tracing ≠ validation.** An **Affected surface** section says only "here is everything a
fix would touch". It never asserts the bug is real. Where a tracing pass observed a
coverage gap ("no test exercises X"), that is a located fact, not evidence for the claim.

The `Useful? React with 👍 / 👎.` footer on each bot comment has been stripped throughout.

---
---

# P1

---

## 1 · Reject duplicate legacy type prefixes

**`packages/core/src/board.ts:56-59`** · `assertUniquePrefixes()`

[▸ view comment](https://github.com/collisionengineers/kanmer/pull/2#discussion_r3771312538) ·
[▸ view code](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/packages/core/src/board.ts#L56-L59) ·
cites [AGENTS.md:181-183](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/AGENTS.md#L181-L183)

### Reported

> Reject collisions within `idPrefixes` instead of silently replacing the previous owner
> in `seen`.
>
> On a legacy board with `ticket: FOO` and `plan: FOO`, both types can have `FOO-001` in
> separate v1 directories; migrating an orphan plan then writes it to the same v2 ticket
> path and overwrites the original ticket.
>
> This validation currently catches only later area collisions, despite the repository
> invariant that all prefixes are unique.

### Code at that line

```ts
// assertUniquePrefixes()
for (const [owner, prefix] of Object.entries(board.idPrefixes).map(
  ([type, p]) => [`idPrefixes.${type}`, p] as const,
)) {
  seen.set(prefix, owner);   // ← overwrites instead of detecting a collision
}
```

### Affected surface

**Primary site** — `packages/core/src/board.ts:54-72`. `assertUniquePrefixes()` builds
`seen: Map<prefix, owner>` in two loops. The first (`board.ts:59`) inserts all three
`idPrefixes` entries with a bare `seen.set()` — **no pre-check**. The second walks
`board.areas` and *does* check `seen.get(prefix)` first. So area↔area and area↔idPrefixes
collisions throw; idPrefixes↔idPrefixes collisions never can.

**Call graph — one chokepoint, six ways in**

- `board.ts:94-98 writeBoard()` → `assertUniquePrefixes()` (`board.ts:96`), after
  `BoardConfigSchema.parse` (`board.ts:95`). The schema has no cross-field uniqueness rule
  (`types.ts:42-78`).
- `store.ts:172-174 setBoard()` → `writeBoard()`. All board mutation funnels through here
  (AGENTS.md §7, `AGENTS.md:291`). Callers:
  - `addColumn()` `store.ts:176-186` → MCP `add_column` (`mcp-server/src/index.ts:570-597`) — caller sets `prefix` directly
  - `updateColumn()` `store.ts:192-211` → MCP `update_column` (`index.ts:599-619`) — can repin an existing prefix
  - `removeColumn()` `store.ts:219-268` → MCP `remove_column` (`index.ts:620-644`)
  - `reorderColumns()` `store.ts:271-287` → MCP `reorder_columns` (`index.ts:646-659`) — shares the chokepoint with [issue 7](#7--enforce-the-proof-gate-when-reordering-statuses)
  - `init()` `store.ts:140-156` → first-run default (`board.ts:15-36`; defaults are distinct)
  - **`migrateToV2()` `migrate.ts:143`** → `store.setBoard(board)` — where the scenario becomes durable
- GUI: `App.tsx:246-248 saveBoard()` → `main/index.ts:407-411 ipcMain.handle(CH.setBoard)`
  → `setBoard()`, triggered by `Settings.tsx:44-62 save()`.
- `areaPrefix()` (`board.ts:42-46`) consumers: `board.ts:62`, `migrate.ts:78`, `store.ts:455`.

**Shared state & invariants**

- **v1 keeps per-type counters, v2 keys by prefix.** `ids.ts:45-101` (v1:
  `formatId`/`nextIdNumber`/`recordAllocatedId`) is keyed by *type*; `ids.ts:108-157` (v2:
  `maxOnDiskForPrefix`/`nextPrefixNumber`/`recordAllocatedPrefix`) is keyed by *prefix*.
  That asymmetry is the mechanism: two v1 types sharing a prefix collide on **nothing**
  because their counters are separate — until migration relocates both into
  `areas/<folder>/<id>/<id>.md` (`migrate.ts:123`, `:158-160`, `:176-177`), a path keyed
  purely by id string.
- **The read path never validates.** `readBoard`/`readBoardWithSource` (`board.ts:74-92`)
  parse with zod only. `assertUniquePrefixes` runs *only* inside `writeBoard`. Any
  `board.yml` reaching disk outside the store API — hand edit, git merge, an agent writing
  YAML directly — is never checked at all. Independent of this bug, but same surface.
- `ids.ts:7-11` carries a comment that the two counter keyspaces "never collide (types are
  lowercase words, prefixes uppercase alphanumerics)". That is about `counters.json` keys —
  a genuinely separate and correct concern from the *id-string* namespace at issue here.

**Bundled / generated copies** — two, both with the same blind spot:

- `plugins/kanmer/mcp/kanmer-mcp.cjs:37869-37900` — compiled copy of
  `assertUniquePrefixes`/`writeBoard`. Needs `npm run plugin:build` or installed plugins keep the old behaviour (AGENTS.md gotcha #8, `AGENTS.md:313`).
- `apps/gui/…/components/Settings.tsx:370-401 validateDraft()` — commented *"Mirror of
  core's write-side checks, so problems surface inline pre-save"*. It builds its map as
  `new Map(Object.entries(draft.idPrefixes).map(([t, p]) => [p, …]))` (`Settings.tsx:387-389`)
  — and the `Map` constructor silently keeps only the last entry for a duplicate key. **The
  hand-maintained mirror has the identical defect**, so the inline check and the backstop
  miss the same case. Field editor at `Settings.tsx:162-181`.

**Tests & fixtures**

- No `board.test.ts` exists; board coverage lives in `store.test.ts`.
- `store.test.ts:345-353` round-trips `idPrefixes.ticket = "BUG"` — no collision asserted.
- `store.test.ts:311-316`, `:715-716`, `:745` check `areas[0].prefix` values only.
- **No test anywhere exercises `assertUniquePrefixes` throwing** — not for area↔area,
  area↔idPrefixes, or idPrefixes↔idPrefixes.
- The v1 fixture (`store.test.ts:616-679`) uses distinct `TICK`/`PLAN`/`RES`, so neither it
  nor the migration round-trip (`store.test.ts:708-756`) reaches this path.

**Documentation**

- `AGENTS.md:181-183` (cited) — *"uniqueness — including against the `idPrefixes` values —
  is enforced on every board write."*
- `docs/plans/kanmer-upgrades/phase-2-format-v2-storage/plan.md:39` — *"`writeBoard`
  validates prefix uniqueness across areas + the `TICK` fallback and the plan/research
  legacy prefixes."* The design record asserts exactly the behaviour the bot says is absent.
- `docs/plans/kanmer-upgrades/upgrades-plan.md:64` — same assertion.
- `docs/plans/kanmer-upgrades/phase-4-gui-trust/plan.md:23` — the spec for the
  `Settings.tsx` mirror.
- `AGENTS.md:52` (layout table), `AGENTS.md:346` (§11 already documents the adjacent
  TICK-fallback race — natural home for a limitation note), `README.md:85-89`,
  `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:30-31` (documents the
  `prefix` param, silent on uniqueness).

### Notes

- **Only two ways to reach the duplicate through the product surface:** the GUI Settings
  "ID prefixes" fields (`Settings.tsx:162-181`) — the sole place any of the three checks
  runs — or hand-editing `board.yml`, which bypasses validation regardless. **No MCP tool
  sets `idPrefixes` at all** (zero matches in `mcp-server/src/index.ts`).
- The scenario needs a *v1* board (separate per-type counters make a duplicated `FOO-001`
  legal), and migration is where the two collapse onto one path. So despite being filed
  against `board.ts`, this lands in `migrate.ts` — the same three-loop sequence as
  [8](#8--remove-folded-document-ids-from-structured-links) and
  [9](#9--make-migration-resumable-after-partial-execution). Sequence the fixes together.
- Shares the `setBoard()` chokepoint with [issue 7](#7--enforce-the-proof-gate-when-reordering-statuses), different concern.

### Open questions

- Should the fix reject the *board write* that introduces the duplicate (failing
  `migrateToV2`'s own `setBoard` at `migrate.ts:143`), or guard the later allocation/move?
  Very different blast radii on migration.
- Should uniqueness also be checked on **read**, given `readBoardWithSource` never calls it
  — or is out-of-band `board.yml` editing out of scope?
- Given the renderer can only `import type` from core (`AGENTS.md:287`), should a fix
  extract one shared check used by both, rather than fixing two copies in parallel?

### Verdict

`☑ validated` — `writeBoard` accepts two `idPrefixes` entries sharing a value, and the
scenario the bot describes destroys a ticket end-to-end, silently.

**Evidence.** Two experiments against core built from `7706a2064a`.

*(a) The validation gap itself* — a control collision throws, the filed one does not:

```
(a) area "TICK" vs idPrefixes.ticket "TICK" → threw? true   (expect throw)
    Area "tick" would use id prefix "TICK", which idPrefixes.ticket already uses. …
(b) idPrefixes.ticket=FOO AND idPrefixes.plan=FOO → threw? false
    board.yml on disk:
      idPrefixes:
        ticket: FOO
        plan: FOO
        research: RES
```

```js
const dup = defaultBoardConfig();
dup.areas = [];
dup.idPrefixes = { ticket: "FOO", plan: "FOO", research: "RES" };
await writeBoard(paths, dup);   // resolves; board.yml written as-is
```

*(b) End-to-end data loss* — a v1 board with `ticket: FOO` / `plan: FOO`, a ticket
`FOO-001` and an **orphan** plan `FOO-001` (both legal on v1: `ids.ts` counters are
per-*type*), then `migrateToV2`:

```
format before: 1
items before: FOO-001(ticket) "THE REAL TICKET", FOO-001(plan) "An orphan plan"
migrateToV2 threw? false
report.ticketMoves       = [{"id":"FOO-001","to":"areas\_none\FOO-001"}]
report.convertedToTickets= [{"id":"FOO-001","label":"legacy-plan"}]
items after : FOO-001(ticket) "An orphan plan"
FOO-001 title now: "An orphan plan"  body: "Nobody links me."
>>> ORIGINAL TICKET DESTROYED? true  (item count 2 → 1)
```

The move loop renames the ticket to `areas/_none/FOO-001/FOO-001.md`
(`migrate.ts:151-155`); the conversion loop then `writeFileAtomic`s the orphan plan to
**the same path** (`migrate.ts:177-184`). No throw, no note, no report entry — the report
cheerfully lists both operations as successes.

*The GUI's pre-save mirror has the same blind spot*, confirmed separately:

```
Map size for 3 entries with a duplicate value: 2 -> [["FOO","the plan prefix"],["RES","the research prefix"]]
```

`Settings.tsx:387-389` builds `new Map(Object.entries(draft.idPrefixes).map(([t,p]) => [p, …]))`
— the `Map` constructor keeps only the last entry per duplicate key — and then
`validateDraft` only ever *reads* that map while walking `draft.areas`
(`Settings.tsx:390-399`). With no areas, nothing is checked at all.

**Reasoning.** `assertUniquePrefixes` (`board.ts:54-72`) builds `seen` in two loops. The
first (`board.ts:56-60`) does a bare `seen.set(prefix, owner)` with no `seen.get` pre-check;
the second (`board.ts:61-71`) *does* check first. So area↔area and area↔idPrefixes collisions
throw and idPrefixes↔idPrefixes collisions cannot. This is not a theoretical asymmetry —
experiment (b) turns it into destroyed user data. The bot's mechanism is correct in every
particular, including that it needs a v1 board and that migration is where the two ids
collapse onto one path.

**Reachability, stated honestly.** Repo-wide grep confirms **no MCP tool writes
`idPrefixes`** (zero matches in `mcp-server/src/index.ts`). The only two ways in are the GUI
Settings ID-prefix fields (`Settings.tsx:162-181`) and hand-editing `board.yml`. Defaults are
distinct (`TICK`/`PLAN`/`RES`), so this is not a default-path failure — it needs a user to
type a duplicate prefix. But that is precisely the input both guards exist to reject, and
*both* accept it.

**Impact if not fixed.** Silent, irreversible data loss — the strongest of the nine. A user
who set `plan: FOO` alongside `ticket: FOO` on a v1 board (or inherited a hand-edited
`board.yml`) loses a whole ticket — frontmatter, body, links, everything — the moment they
click "Migrate to v2". There is no error, the migration reports success, and the report
lists the destroyed ticket under `ticketMoves` as though it had been moved. Nothing warns
the user, nothing in the suite catches it (`npm test` is green), and the pre-migration state
is gone. Recovery requires git history or a backup of `.kanmer/`. Low frequency, maximal
severity, zero detectability.

**Fix sketch.** Add the missing pre-check to the first loop of `assertUniquePrefixes`
(`board.ts:56-60`) — a `seen.get(prefix)` guard identical to the second loop's, with a
message naming both owning types. **Go wider than the filed line, in two specific
directions.** (1) `migrateToV2` must not be able to overwrite a file it just wrote: the
conversion loop (`migrate.ts:174-186`) and the fold loop should refuse to write to a path
that already holds a *different* id's ticket, converting that into a report note or a hard
error rather than a clobber — that is the belt to `assertUniquePrefixes`' braces, and it also
covers hand-edited boards that never pass through `writeBoard` at all (`readBoard`
`board.ts:83-92` never validates). (2) Fix `Settings.tsx:387-389` in the same pass —
build the map with an explicit duplicate check instead of the `Map` constructor — or the
inline check keeps green-lighting exactly what the backstop now rejects, turning a silent
corruption into a confusing save failure. Given the renderer may only `import type` from core
(`AGENTS.md:287`), a genuinely shared checker isn't available without restructuring; two
correct copies plus a comment cross-referencing them is the pragmatic call. Sequence with
[#9](#9--make-migration-resumable-after-partial-execution) — both land in `migrate.ts:151-186`.

---

## 2 · Refresh cached storage format after external migration

**`packages/core/src/store.ts:116-120`** · `KanmerStore.detectFormat()`

[▸ view comment](https://github.com/collisionengineers/kanmer/pull/2#discussion_r3771312567) ·
[▸ view code](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/packages/core/src/store.ts#L116-L120) ·
cites [AGENTS.md:165-170](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/AGENTS.md#L165-L170)

### Reported

> Do not retain `formatCache` indefinitely across filesystem changes.
>
> In the normal upgrade flow, an already-running MCP server may cache format 1 during
> `get_status`, then the GUI migrates the shared board and stamps format 2; subsequent
> MCP writes still use the cached legacy format, recreate flat type directories, and
> even allow standalone plan/research creation on what is now a v2 board.
>
> The format marker must be re-read before writes or invalidated when `version.json`
> changes.

### Code at that line

```ts
async detectFormat(): Promise<1 | 2> {
  if (this.formatCache !== null) return this.formatCache;   // ← never invalidated
  const version = await readVersion(this.paths);
  if (version) {
    this.formatCache = version.format >= 2 ? 2 : 1;
```

### Affected surface

**Primary site** — `packages/core/src/store.ts:116-127`. `formatCache` (`store.ts:83`) is
private, in-process, per-instance. Its **only** clearer is `resetFormatCache()`
(`store.ts:130-132`), called from exactly one place in the repo: `migrate.ts:219`, at the
end of a successful real migration — on the *same instance that ran it*.

**Call graph — every `detectFormat()` call site**

| Site | What differs on 1 vs 2 |
|---|---|
| `store.ts:141` `init()` | v1 skeleton vs. v2 areas + stamp `version.json`. Reached by `ensureInit()` (`mcp-server/src/index.ts:47-51`, once per stdio process) and GUI `openProject()` (`main/index.ts:313`, fresh store each time — no staleness there) |
| `store.ts:441` `createItem()` | v2 rejects `type !== "ticket"` (`store.ts:442-448`) and allocates via `nextPrefixNumber`/`ticketFileIn`; v1 permits plan/research via `nextIdNumber`/`itemFile` (`store.ts:452-490`). Reached by MCP `create_item` (`index.ts:397-407`), `create_items` (`index.ts:409-435`), GUI `CH.createItem` (`main/index.ts:414-418`) |
| `mcp-server/src/index.ts:177` `get_status` | returns the raw value as `format` — **the only way an agent learns the format** |
| `main/index.ts:335` `openProject()` | returned as `OpenProjectResult.format` → `App.tsx` `setFormat` → drives the "Migrate to v2" banner (`App.tsx:475-490`) |
| `migrate.ts:65` | `migrateToV2()`'s early-return guard |
| tests | `store.test.ts:323, 686, 718, 726` — all single-instance |

Callees: `readVersion` (`version.ts:17-25`), `pathExists(this.paths.tickets)` fallback.

**Shared state & invariants**

- **Two long-lived instances coexist in the normal workflow.** The MCP server's
  module-level singleton (`mcp-server/src/index.ts:22`, lives the whole stdio connection)
  and the GUI's `store` module variable (`main/index.ts:49,312`, replaced only on
  `openProject`, *never* on migration). `migrateToV2` only ever runs through the GUI's
  store, so its `resetFormatCache()` cannot reach the MCP process.
- **Migration is GUI-only.** No MCP tool calls `migrateToV2` anywhere (confirmed by grep).
  The only entry is `CH.migrate` (`main/index.ts:453-455`) ← `App.tsx:484` (dry run) /
  `App.tsx:694` (real run).
- **The GUI has the same shape one layer up.** `App.tsx`'s `format` state is set in
  `openProject` (`App.tsx:82`) and hard-set to `2` after a same-window migration
  (`App.tsx:695`) — never re-derived. `onDiskChange` special-cases `version.json` to call
  `refresh()` (`App.tsx:158`), but `refresh()` (`App.tsx:61-73`) re-fetches only `board`
  and `items`, **never `format`**. Latent today because migration is single-actor.
- `version.json` writers are only `migrateToV2` (`migrate.ts:214-218`) and `init()` on a
  brand-new v2 project (`store.ts:149-151`, guarded against overwrite).
- **Nothing watches `version.json`.** `ensureSubscriptionWatcher()`
  (`mcp-server/src/index.ts:741-755`) fires only for subscribed MCP resources and filters
  on `board.yml`/`*.md` basenames (`index.ts:745,748`). No filesystem-watch callback
  anywhere calls `resetFormatCache()`.

**Bundled / generated copies** — `plugins/kanmer/mcp/kanmer-mcp.cjs` carries the identical
transpiled logic: `formatCache`/`detectFormat`/`resetFormatCache` at `38038-38074`,
`init()`'s version I/O at `38091-38092`, `createItem`'s branch at `~38337`, `get_status`'s
call at `~38908`. **`scripts/check-plugin-sync.mjs` only diffs tool *names*
(`check-plugin-sync.mjs:26-35`)** — `npm run plugin:check` passing proves nothing about
behavioural drift between the bundle and a fixed `store.ts`.

**Tests & fixtures**

- `store.test.ts:318-324` (stamps `version.json`), `:676-757` (v1 compatibility) — the
  migration assertions at `686`/`718`/`726` all run against the single `v1store` instance
  that itself performed the migration (`migrateToV2(v1store)`, `:724`) — precisely the case
  `resetFormatCache()` covers, and it passes.
- `mcp-server/src/smoke.mjs:72-80, 327-329` — one stdio process for the whole script;
  asserts fresh-project `format: 2`, never a pre-existing v1 board.
- **Gap:** no test in either suite builds two `KanmerStore`/server instances against one
  root, caches format on one, migrates via the other, and re-asserts on the first.

**Documentation**

- `AGENTS.md:165-170` (cited) — v1 boards keep working unmigrated; *"On format-2 boards,
  standalone `plan`/`research` items are rejected at create time."*
- `AGENTS.md:236` — *"**Init is lazy**: boot never calls `store.init()` … Write tools call
  `ensureInit()` first"* — why the cache can populate arbitrarily late in a session.
- `docs/plans/kanmer-upgrades/phase-2-format-v2-storage/plan.md:35` — *"Detection:
  `version.json` absent + legacy `tickets/` dir present → format 1 … **Store caches the
  detected format per instance.**"* The design note the code implements, with no
  invalidation ever specified.
- **`plugins/kanmer/skills/kanmer-setup/SKILL.md:59-72` (Upgrade mode) scripts the exact
  race**: step 3 *"The migration itself runs from the Kanmer app … ask the user to click
  **Migrate to v2** there"*; step 4 *"Verify with `get_status` (`format: 2`, counts
  intact)."*
- `docs/plans/kanmer-upgrades/upgrades-plan.md:68` — *"`kanmer-setup` upgrade mode does the
  same for agent-only flows"* — in tension with there being no MCP migrate tool.
- `mcp-server/src/index.ts:170-171` (`get_status` description) — promises a live value,
  silent on caching. `AGENTS.md:345` (§11) documents a same-shaped GUI-bypass limitation.
  `README.md:31,85`.

### Notes

- **Coupled to [issue 9](#9--make-migration-resumable-after-partial-execution)** — same
  `version.json`/format-detection surface, opposite triggers. #9's interrupted migration
  leaves partial v2 state with *no* `version.json`, so `detectFormat()` correctly reads 1.
  A #2 fix that just "always re-reads `version.json`" therefore does not fix #9 and must
  not assume `readVersion() → 2` is the only "already migrated" signal. **Design these two
  together rather than sequencing them independently.**
- The documented agent workflow (`kanmer-setup` Upgrade mode) is what puts a long-lived MCP
  server and a GUI migration on the same board in the same minute.

### Open questions

- Fix shape: unconditional re-read on every `detectFormat()` (simple, defeats the cache),
  or invalidate via a watch on `version.json`? The MCP server already owns a watcher
  primitive (`watchKanmer`/`ensureSubscriptionWatcher`) but it is scoped to resource-push
  and started lazily.
- Fold in the GUI's own `format`-state staleness (`refresh()` not re-fetching `format`), or
  track separately given its trigger is currently benign?

### Verdict

`☑ validated` — reproduced exactly as described, and the consequence is **worse than the
bot claims**: the stale store does not merely write in the wrong layout, it re-issues an id
that is already in use.

**Evidence.** Two `KanmerStore` instances against one root, mirroring the documented
`kanmer-setup` Upgrade flow (long-lived MCP server + GUI migration):

```
[mcp] get_status → detectFormat() = 1   (caches)
[gui] migrateToV2 done. version.json on disk = { "format": 2, "migratedFrom": 1, … }
[gui] detectFormat() = 2  (resetFormatCache ran on this instance)
[mcp] detectFormat() = 1   ← STALE, exactly as filed
[mcp] createItem(type:"plan") → CREATED PLAN-001
      file exists at .kanmer/plans/PLAN-001.md ? true
[mcp] init() recreated .kanmer/tickets/ ? true
[mcp] init() recreated .kanmer/plans/ ? true
[mcp] init() recreated .kanmer/research/ ? true
```

Every consequence the bot named — cached format 1, recreated flat type directories,
standalone plan creation on a v2 board — reproduces. Then the escalation:

```
[mcp] createItem → id "TICK-001"
    written to legacy tickets/TICK-001.md ? true
    migrated ticket still at areas/api/TICK-001/TICK-001.md ? true
>>> DUPLICATE ID ON DISK: true
fresh store listItems ids: TICK-001 "The original ticket" | TICK-001 "Brand new agent ticket"
warnings surfaced: []
getItem("TICK-001") resolves to: "The original ticket" (body: "ORIGINAL BODY.")
>>> the agent's new ticket is UNREACHABLE by id — getItem returns the other one.
[mcp] setDoc("TICK-001","plan",…) wrote into the ORIGINAL ticket's folder:
      "PLAN WRITTEN BY THE AGENT FOR ITS OWN NEW TICKET\n"
```

**Reasoning.** `formatCache` (`store.ts:83`) is per-instance and its only clearer,
`resetFormatCache()` (`store.ts:130-132`), is called from exactly one place — `migrate.ts:219`,
on the instance that ran the migration. Nothing watches `version.json`. The stale store then
takes `createItem`'s v1 branch (`store.ts:457`, `:467`), which allocates through
`nextIdNumber` — keyed by *type* and scanning `paths.tickets` (`ids.ts:55-65`). After
migration that directory is empty (and `init()` has just recreated it), so the counter reads
zero and re-issues `TICK-001`, a number already live under `areas/`. `listItemsWithWarnings`
(`store.ts:299-398`) scans both layouts and returns **both** items with **no warning** — the
duplicate-id check it does have (`store.ts:327-333`) only compares an id against its own
folder name, which both files pass. Because `locateItem` (`store.ts:400-421`) scans v2 first,
every subsequent `getItem`/`updateItem`/`setDoc` for that id resolves to the *original*
ticket: the agent's own follow-up writes land on someone else's ticket.

**Impact if not fixed.** This is the flow the shipped documentation actively scripts —
`kanmer-setup/SKILL.md:59-72` tells an agent to keep working, ask the user to click
"Migrate to v2" in the GUI, then re-verify with `get_status`. That puts a long-lived MCP
server and a GUI migration on one board in the same minute, by design. Consequences, in
ascending order: (1) `get_status` reports `format: 1` on a migrated board, so the agent
believes the upgrade failed and may re-run the whole upgrade routine; (2) the agent recreates
`tickets/`/`plans/`/`research/`, which *also* re-arms
[#9](#9--make-migration-resumable-after-partial-execution)'s v1 fallback on a board that
genuinely is v2; (3) standalone plan/research items appear on a board whose whole point is
that they live inside tickets; (4) **duplicate ids on disk with no warning**, where the newer
ticket is permanently unaddressable and the agent's `set_ticket_doc` calls silently overwrite
documents belonging to a different ticket. (4) is data loss disguised as success, and it
needs no crash or race window — just a server that called `get_status` before the user
clicked Migrate.

**Fix sketch.** Do **not** simply drop the cache — `detectFormat()` is called on every
`createItem` and the read is a `stat` + small JSON parse per call, which is affordable but
worth measuring. The tighter fix is to keep the cache and invalidate it on evidence:
re-`stat` `version.json` and compare mtime/inode before trusting the cached value, or have
the MCP server's existing watcher primitive (`watchKanmer`, already used by
`ensureSubscriptionWatcher` at `index.ts:741-755`) call `resetFormatCache()` on any
`version.json` event. The watcher route is cheap but the watcher is started lazily and only
for subscribed resources, so it would need unconditional start — the re-stat is the more
robust default. **Design this together with
[#9](#9--make-migration-resumable-after-partial-execution)**, per that issue's coupling note:
a fix that only ever re-reads `version.json` still gets the wrong answer for a half-migrated
board where `version.json` was never written. Cover the wider surface: `createItem`'s v1
counter should additionally refuse to hand back an id that `locateItem` can already resolve
— that is a one-line backstop that makes the duplicate-id escalation impossible regardless of
how the format was decided, and it also hardens the pre-existing TICK-fallback race already
documented at `AGENTS.md:346`. Fold in the GUI's own `format`-state staleness (`refresh()`
at `App.tsx:61-73` never re-fetches `format`, though `onDiskChange` calls it specifically for
`version.json` at `App.tsx:158`) — it is a two-line change in the same area and is latent
only because migration happens to be single-actor today. Re-run `npm run plugin:build`: the
bundle carries its own `formatCache`/`detectFormat` copy and `npm run plugin:check` only
diffs tool names (`check-plugin-sync.mjs:26-35`), so it cannot catch the drift.

---

## 3 · Detect concurrent document edits before saving

**`apps/gui/src/renderer/src/components/Editor.tsx:669-673`** · `DocEditor.saveDoc()`

[▸ view comment](https://github.com/collisionengineers/kanmer/pull/2#discussion_r3771312541) ·
[▸ view code](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/apps/gui/src/renderer/src/components/Editor.tsx#L669-L673) ·
cites [AGENTS.md:11-18](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/AGENTS.md#L11-L18)

### Reported

> Before replacing a pipeline document, re-read or version-check it against the content
> initially loaded.
>
> If an agent updates the same document while the user is editing, the watcher increments
> `changeSignal` but the load effect deliberately skips dirty editors; this unconditional
> `setDoc` then silently overwrites the agent's newer content.
>
> This is especially consequential because the GUI and MCP server are independent writers
> to the shared filesystem.

### Code at that line

```tsx
// DocEditor
const saveDoc = async (next: string) => {
  setSaving(true);
  try {
    await window.kanmer.setDoc(id, doc, next);   // ← no baseline check
    setContent(next.trim() ? `${next.trim()}\n` : next);
```

The load effect a few lines above is the other half of the gap:

```tsx
// Load — and re-sync on external changes while the user isn't editing.
useEffect(() => {
  if (dirty) return;                              // ← skips re-sync while dirty
  void window.kanmer.getDoc(id, doc).then(...);
}, [id, doc, changeSignal]);
```

### Affected surface

**Primary site** — `Editor.tsx:669-679` (`DocEditor.saveDoc`), with the companion gap at
`Editor.tsx:660-667` (load effect; `if (dirty) return;` at line 661).

**Data flow — the write chain has no version parameter at any hop**

`saveDoc` (`Editor.tsx:669-679`) → `window.kanmer.setDoc` → preload (`preload/index.ts:33`)
→ `CH.setDoc` (`shared/ipc.ts:41`, contract `:140`) → main handler (`main/index.ts:457-460`,
`markOwnWrite(id)` then `setDoc`) → **`KanmerStore.setDoc()` (`store.ts:722-746`) →
unconditional `writeFileAtomic` (`store.ts:742`)**.

`setDoc`'s signature is `(id, doc, content, { append? })` — **no `expectedUpdated`
equivalent exists anywhere in the chain**, unlike `updateItem` (`types.ts:182`, enforced at
`store.ts:522-529`). The MCP side is identical: `set_ticket_doc`'s `inputSchema`
(`mcp-server/src/index.ts:536-541`) has `id`/`doc`/`content`/`append?` and no version
field. **So this is not GUI-specific — the core doc-write API has no optimistic-concurrency
primitive to plug into, and agent-over-GUI overwrites are equally possible.**

Watcher path back: `writeFileAtomic` → chokidar (`watch.ts:23-51`, 120 ms debounce) →
`main/index.ts:317-329` → `CH.changed` sent **unconditionally** (line 318) → preload
(`preload/index.ts:36-40`) → `App.onDiskChange` (`App.tsx:144-187`) →
`setChangeSignal(n=>n+1)` (`App.tsx:146`) → prop-drilled `App.tsx:581` → `Editor.tsx:436` →
load-effect dep `[id, doc, changeSignal]` (`Editor.tsx:667`) — a no-op while `dirty`.

State ownership: `content`/`text`/`editing`/`saving` are local to `DocEditor`
(`Editor.tsx:648-651`) and destroyed on unmount. `docDirty` is owned by `Editor`
(`Editor.tsx:109`) via the `onDirty` prop (`:437`) from `dirty` (`:652`). `changeSignal` is
owned by `App` (`App.tsx:50`).

**The checklist checkbox is a second writer, and a worse one.** `toggleCheckbox()`
(`Editor.tsx:681-695`) recomputes lines from the last-loaded `content` and calls
`saveDoc(next)` (line 694) — same unconditional write. But `dirty` is `false` while merely
viewing the checklist (not in `editing` mode), so this path **isn't gated by the dirty-skip
at all**: a single checkbox click any time after the last load can clobber a newer on-disk
version using a stale snapshot as its base. One click, no visible editing state.

**Shared state & invariants — the Phase 4 mechanism, and why it doesn't port**

The item-level protection lives entirely in the outer `Editor`: a `baseline` ref
(`Editor.tsx:106`, *"the item as last read/written: saves diff against this, never against
the live prop"*), `dirtyKeys` (`:166-169`), a live re-sync effect (`:186-204`) that silently
adopts untouched fields and raises `conflict` (`:198-203`) only for fields the user touched
*and* that also changed on disk, a `save()` (`:230-270`) that re-`getItem`s immediately
before writing (`:237`) to close the watcher-debounce race and sends
`expectedUpdated: baseline.current.updated` (`:259`); banner UI at `:406-427`.

**It is not reusable as-is: it keys entirely off `item.updated`, and pipeline docs have no
frontmatter at all.** `setDoc` writes `` `${content.trim()}\n` `` with no header
(`store.ts:737`); `getDoc` just `readText`s (`store.ts:708-715`). There is no version field
to diff against. Porting needs an `fs.stat().mtime` capture + pre-write re-stat, a
content-hash baseline, or a metadata sidecar — none exist today.

Also: `getTicketDocsInfo()` (`store.ts:748-770`) → `docsInfo` (`Editor.tsx:108`, refetched
on every `changeSignal`, `:161-164`) carries no version marker either, so the tab's
dot/count badge can silently reflect newer on-disk state while the frozen `content` does
not — divergence with no visual indicator.

`markOwnWrite`/`ownWrites` (`main/index.ts:233-236, 457-460`) is keyed by **ticket id, not
doc name**: a GUI write to `checklist.md` suppresses the agent-change toast for a genuine
concurrent agent write to `research.md` on the same ticket within 2 s. Minor and adjacent —
`CH.changed` still fires unconditionally.

**Bundled / generated copies** — `plugins/kanmer/mcp/kanmer-mcp.cjs` bundles the same
`setDoc`/`set_ticket_doc`. Git history shows it was last rebuilt at `8902a07` (Phase 7),
*after* the last `store.ts`/`mcp-server` edits (`abaaff0`, Phase 6), so it currently mirrors
source faithfully — but any fix must be re-bundled (`AGENTS.md:313`) or installed plugins
keep the old path.

**Tests & fixtures** — `store.test.ts` covers `setDoc`/`getDoc`/`getTicketDocsInfo` for
write/append/checklist-parse correctness (`:413-419, 460, 473, 543, 565, 731`), but no test
writes the same doc twice with an intervening external change — there is nothing to test,
since no such parameter exists. **`apps/gui` has zero test files** (confirmed by glob); GUI
verification is typecheck + build + `KANMER_SMOKE=1` boot only (`AGENTS.md:329-337`).
`DocEditor.saveDoc`, `toggleCheckbox` and the load-effect dirty-skip are entirely untested.

**Documentation**

- `AGENTS.md:11-18` (cited) — the two-independent-writers / synchronise-through-files model.
- **`README.md:120`** — *"Saves are **diff-based** … concurrent agent edits re-sync live,
  and a same-field conflict offers Keep mine / Take theirs"* sits in the **same bullet** as
  *"**document tabs** (Ticket | Research | Impact | Plan | Checklist | Proof) — the
  checklist renders as live checkboxes"*, implying the protection covers doc tabs. It covers
  only the ticket-field form.
- **`docs/plans/kanmer-upgrades/phase-7-gui-evolution/plan.md:15`** — *"Doc saves are
  whole-doc (docs are single-writer in practice; **the Phase 4 baseline/conflict pattern
  applies per tab**)."* No such per-tab pattern exists in the shipped code, and
  "single-writer in practice" is precisely what the finding disputes.
- `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:28` — documents
  `set_ticket_doc` with no conflict/version semantics, consistent with the tool having none.

### Notes

- **Coupled to [issue 6](#6--check-move-conflicts-before-materializing-column-order)** —
  both are optimistic-concurrency gaps in the same multi-writer store (doc-write layer vs.
  item-move layer), same root pattern: a write path that doesn't gate on a freshness check
  before `writeFileAtomic`. Worth treating as one "audit every store write path for
  `expectedUpdated` coverage" effort.
- Touches [#2](#2--refresh-cached-storage-format-after-external-migration) only
  incidentally: `setDoc` requires `loc.kind === "v2"` (`store.ts:730-735`), so a stale
  format cache could compound doc-save failures on a just-migrated board — distinct failure
  mode.
- A fixer must decide up front whether the fix covers only the Save-button path or **also
  the checklist-toggle path**, which isn't gated by `dirty` at all and is the more silent
  case.

### Open questions

- Version marker for docs: mtime capture at load + re-stat before write (mirroring
  `Editor.tsx:236-256`'s `getItem` re-check), or a content hash? They have no frontmatter.
- Is the checklist-toggle overwrite in scope for the same fix, or a distinct sub-case?
- Should `ownWrites` become doc-granular (`${id}:${doc}`) once real conflict detection
  exists, so toast suppression can't mask a genuine concurrent edit to a sibling doc?

### Verdict

`☑ validated` — the doc-write chain has no concurrency primitive at any layer, and a
whole-doc save silently discarded a newer concurrent write. One correction, to the *tracing
pass* rather than the bot: the checklist-toggle path is **narrower** than traced, not wider.

**Evidence — the core half, reproduced.** Two stores against one root, following the exact
GUI sequence (agent writes → GUI loads → agent appends → GUI saves what it loaded):

```
GUI loaded : "# Research\n\nAGENT: findings A, B, C — 40 minutes of work.\n"
on disk now: "# Research\n\nAGENT: findings A, B, C — 40 minutes of work.\n\nAGENT: findings D and E too.\n"
after save : "# Research\n\nAGENT: findings A, B, C — 40 minutes of work.\n\nHUMAN: my note.\n"

>>> agent's newer content silently gone: true
>>> setDoc threw / warned / returned a conflict: no — return type is undefined
```

There is nothing for a check to plug into, confirmed against the built artifact:

```
KanmerStore.prototype.setDoc.length (declared params) = 3
updateItem accepts expectedUpdated?  true
setDoc    accepts expectedUpdated?   false
```

`store.ts:722-746` locates the ticket, builds `text`, and calls `writeFileAtomic(file, text)`
unconditionally. `updateItem` by contrast enforces `expectedUpdated` at `store.ts:522-529`.
The asymmetry is real and total: `set_ticket_doc`'s `inputSchema`
(`mcp-server/src/index.ts:536-541`) and the IPC contract (`shared/ipc.ts:41`, handler
`main/index.ts:457-460`) both carry only `id`/`doc`/`content`/`append?`.

**Evidence — the GUI half, by reading.** The dirty-skip is exactly as filed.
`DocEditor.saveDoc` (`Editor.tsx:669-679`) calls `window.kanmer.setDoc(id, doc, next)` with
no baseline. The load effect (`Editor.tsx:660-667`) opens `if (dirty) return;` and its deps
are `[id, doc, changeSignal]`. Watcher coverage is confirmed: `watchKanmer` watches the whole
`.kanmer` tree (`watch.ts:23`) with no path filter, `main/index.ts:318` sends `CH.changed`
**unconditionally** (the `ownWrites` check at `:321-322` gates only the *toast*), and
`App.onDiskChange` bumps `changeSignal` on line 146 before any branching. So the signal
always arrives and is always ignored while the editor is dirty.

**Reasoning.** Both halves are necessary and both are present: the renderer never re-reads
while dirty, and the core write has no way to detect that the file moved underneath it. The
bot's description is accurate in every particular. Note the effect closure does see a fresh
`dirty` — a `changeSignal` bump re-renders before the effect runs — so the skip is
deliberate and effective, which is precisely what makes the subsequent unconditional write
unsafe.

**Correction to the tracing pass (not to the bot).** The trace called the checklist toggle
"a worse one … a single checkbox click any time after the last load can clobber a newer
on-disk version". That overstates it. `toggleCheckbox` (`Editor.tsx:681-695`) only renders
when `editing` is false (`:742`), so `dirty` is false (`:652`), so the load effect does
**not** skip — `content` is re-fetched on every `changeSignal`. The clobber window is
therefore bounded by the 120 ms watcher debounce (`watch.ts:21`) plus one IPC round trip, not
unbounded. There *is* a genuine unbounded variant, though, and it is worth carrying into the
fix: because `dirty` is deliberately excluded from the effect's dep array
(`Editor.tsx:666-667`, with an `eslint-disable`), clicking **Cancel** (`Editor.tsx:727-730`)
clears `editing` without re-running the load, leaving `content` frozen at a pre-edit snapshot
until the *next* disk change. A checklist toggle after that path really does write from stale
state with no time bound.

**Impact if not fixed.** The headline case is a human losing an agent's work, not the
reverse: the user opens `research.md`, starts typing, an agent enriches the same file, and
Save replaces the agent's version wholesale with no banner, no conflict, no trace. The
ticket-field form next to it does protect against exactly this (baseline ref, live re-sync,
Keep mine / Take theirs — `Editor.tsx:106`, `:186-204`, `:406-427`), which makes the gap
worse than if nothing were protected: `README.md:120` puts "saves are diff-based … concurrent
agent edits re-sync live" in the *same bullet* as the document tabs, so users are told the
protection covers doc tabs when it covers only the form. `phase-7-gui-evolution/plan.md:15`
asserts "the Phase 4 baseline/conflict pattern applies per tab" — no such pattern exists.
Frequency is real: the pipeline documents are the surface agents write most, and the whole
product premise is a human and an agent on one dataset. Silent data loss, recoverable only
from git.

**Fix sketch.** This is a **core-API fix, not a GUI one** — start at `store.setDoc`. Docs
have no frontmatter to hold an `updated` field, so the version token has to come from the
file: capture `fs.stat().mtimeMs` (or a content hash — a hash is immune to coarse mtime
granularity and to `writeFileAtomic`'s rename semantics, and doc files are small) in `getDoc`,
return it alongside the content, and accept it back as an optional `expectedVersion` on
`setDoc`, re-checking immediately before `writeFileAtomic` and throwing the same
conflict-shaped error `updateItem` throws. Thread it through **all three** callers, not just
the GUI: `set_ticket_doc` (`mcp-server/src/index.ts:530-548`) needs it too, since agent-over-GUI
is equally possible and the trace confirmed the MCP side is identically unguarded. In the
renderer, hold the token beside `content` in `DocEditor` and surface a conflict banner
reusing the Phase 4 pattern. **Cover the checklist path in the same change** — it calls the
same `saveDoc` and its stale-`content` variant after Cancel is unbounded; also add `dirty` to
the load effect's deps (or re-load on the `editing → false` transition) so cancelling
re-syncs. Optional and cheap: make `ownWrites` doc-granular (`${id}:${doc}`,
`main/index.ts:233-236`) so toast suppression can't mask a genuine concurrent edit to a
sibling doc. Pair this with [#6](#6--check-move-conflicts-before-materializing-column-order)
as one "audit every store write path for freshness" pass, and re-run `npm run plugin:build`.
Note `apps/gui` has zero test files, so the core-side half is the only part that can be
regression-tested — which is another argument for putting the mechanism in core.

---

## 4 · Preserve dirty documents when switching tabs

**`apps/gui/src/renderer/src/components/Editor.tsx:389-393`** · doc-tab buttons

[▸ view comment](https://github.com/collisionengineers/kanmer/pull/2#discussion_r3771312543) ·
[▸ view code](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/apps/gui/src/renderer/src/components/Editor.tsx#L389-L393) ·
no AGENTS.md reference given

### Reported

> Guard document-tab changes while `docDirty` is true.
>
> For example, after editing `research.md`, clicking Plan immediately changes `tab`;
> because `DocEditor` is keyed by the selected tab, the research editor unmounts and its
> unsaved text is discarded without the existing navigation confirmation.

### Code at that line

```tsx
<button
  key={d.key}
  className={tab === d.key ? "tab active" : "tab"}
  onClick={() => setTab(d.key)}      // ← unguarded; DocEditor is keyed by tab
>
```

### Affected surface

**Primary site** — `Editor.tsx:389-393`, the `DOC_TABS.map(...)` button. `DocEditor` is
rendered with `key={`${item.id}:${tab}`}` (`Editor.tsx:432`), so any `tab` change destroys
the mounted instance and its local state (`Editor.tsx:648-651`). The **Ticket tab button
has the same gap in the other direction** (`Editor.tsx:382-387`): it unmounts `DocEditor`
via the `{tab !== "ticket" ? <DocEditor/> : <>…</>}` conditional (`Editor.tsx:430`) rather
than a key change — different mechanism, identical loss.

**Data flow** — `docDirty` owned by `Editor` (`Editor.tsx:109`), set via `onDirty`
(`:437`) from `DocEditor`'s effect (`:654-656`, where `dirty = editing && text !== content`,
`:652`), reset on unmount (`:657`). Feeds `Editor`'s combined
`dirty = dirtyKeys.length > 0 || docDirty` (`:170`) → `onDirtyChange` (`:172-174`) →
`App`'s `editorDirty` ref (`App.tsx:56`, set at `:584-586`).

The **only** consumer of `editorDirty.current` is `App.trySelect()` (`App.tsx:94-102`),
which sets `pendingNav` and shows the confirm modal (`App.tsx:625-646`). **`setTab`
(`Editor.tsx:384`, `:392`) never touches `selectedId`, so the guard never engages.** That
is the mechanism.

**Every way to leave a dirty document editor — and whether it is guarded**

| # | Path | Code | Guarded? |
|:-:|---|---|:-:|
| 1 | Switch doc tab (Research↔Impact↔Plan↔Checklist↔Proof) | `Editor.tsx:388-393` | **No — the filed bug** |
| 2 | Click "Ticket" tab while a doc tab is dirty | `Editor.tsx:382-387` | **No — same cause, outside the bot's line range** |
| 3 | Click a different card | `Board.tsx:191` → `App.tsx:516` → `trySelect` | Yes |
| 4 | Editor "Close" button | `Editor.tsx:375-377` → `App.tsx:582` | Yes |
| 5 | `[[wiki-link]]` in ticket-body preview | `Editor.tsx:289-298` → `trySelect` | Yes |
| 6 | `[[wiki-link]]` in the *doc* preview | `Editor.tsx:774-781` | Yes in principle — **unreachable while dirty** (preview only renders when `!editing`, `:770-790`; `dirty` requires `editing`) |
| 7 | Links-panel chip | `Editor.tsx:581-595` → `trySelect` | Yes — but only visible on the Ticket tab, moot here |
| 8 | Ctrl+K jump | `CommandPalette.tsx:43-44` → `App.tsx:717-720` | Yes |
| 9 | Escape | `App.tsx:345-350` (when no overlay open) | Yes |
| 10 | Toast click / native `reveal` | `App.tsx:609-621`, `:212-217` | Yes |
| 11 | Keyboard card move (Ctrl+←/→) | `Board.tsx:200-206` → `App.tsx:283-301` | n/a — editor stays mounted |
| 12 | Switch view (Ctrl+1/2/3) | `App.tsx:439-454`, `:370-374` | n/a — `Editor` renders outside the view conditional (`App.tsx:509-593`) |
| 13 | Archive open item via context menu | `App.tsx:320-321` | n/a — `selectedId` untouched |
| 14 | **Delete** open item via context menu | `App.tsx:324-327` — `setSelectedId` **directly** | **No — bypasses `trySelect`** |
| 15 | **Delete** from Archived view | `App.tsx:542-546` — same bypass | **No** |
| 16 | **Open a different project** (Ctrl+O / topbar) | `App.tsx:75-91`, `:83` unconditional `setSelectedId(null)`; via `pickAndOpen` `:219-226` | **No — discards dirty docs *and* dirty ticket fields** |
| 17 | **Open a Recent project** | same `openProject()` path via `onMenu` (`App.tsx:232`) | **No** |
| 18 | Native window close (X / Alt+F4) | `beforeunload` (`App.tsx:105-114`); `main/index.ts:130-133` only persists bounds | Nominally — **unverified in this Electron build** |
| 19 | "Migrate to v2" with a dirty doc open | `App.tsx:648-711` | n/a — unreachable: doc tabs need `docsInfo !== null` (`Editor.tsx:380`), which is `null` on v1 (`store.ts:750-751`) |

**Four unguarded exits beyond the filed one** (rows 14–17), all going through `App.tsx`
rather than `Editor.tsx`. The guard is implemented at the **item-selection** level, one
level above where the loss actually happens (**tab** level) — the structural reason it
doesn't already cover this.

**Shared state & invariants** — the Phase 4 baseline/conflict machinery (traced under
[issue 3](#3--detect-concurrent-document-edits-before-saving)) is *orthogonal*: it protects
content from being overwritten by a **disk** change; #4 is UI navigation discarding
**in-memory** edits. They share only the `dirty`/`docDirty` plumbing.

**Bundled / generated copies** — none; pure renderer state. In-file duplication: the
wiki-link click handler is implemented twice, not extracted (`Editor.tsx:289-298` vs.
`:774-781`).

**Tests & fixtures** — none. `apps/gui` has zero test files; the 19-row table above is
derived by reading code paths, unverified by automation.

**Documentation**

- **`docs/plans/kanmer-upgrades/phase-4-gui-trust/plan.md:19`** (item 4.3, Unsaved-changes
  guard) — *"Route every deselection through one `trySelect(id)` gate — card click, editor
  Close, wiki-link navigate, **tab switch** — with a small plain-CSS confirm ('Discard
  changes to TICK-012?')."* **The plan explicitly commits to guarding tab switches; the
  shipped code does not.** This is the strongest plan↔implementation contradiction found
  across all nine findings.
- `README.md:120` implies broad editor protection without addressing tab switches.
- The bot gave no AGENTS.md reference.

### Notes

- Rows 14–17 are **not** what the bot filed but are the same class: `trySelect` has several
  call sites that simply don't use it. A fixer should decide whether to fix the doc-tab case
  verbatim or honour the Phase 4 plan's broader "every deselection through one gate" intent.
- No coupling with the store-layer findings (#1, #2, #6–#9). Overlaps
  [#3](#3--detect-concurrent-document-edits-before-saving) only through shared `docDirty`
  plumbing — fixing one does not fix the other.

### Open questions

- Extend `trySelect`/`pendingNav` down to tab level, or add a smaller `DocEditor`-scoped
  confirm around `setTab`?
- Fold rows 14–17 into this fix or file separately — they live in `App.tsx`, not
  `Editor.tsx`, so possibly a different owner.
- Does Electron actually surface a `beforeunload` confirm in this configuration
  (`sandbox: false`, no `will-prevent-unload` handling)? No harness to check; historically
  version-dependent.

### Verdict

`☑ validated` — proven from code: the tab buttons are the only things that call `setTab`,
`setTab` never touches `selectedId`, and `selectedId` is the only thing the unsaved-changes
guard watches. No running UI is needed to settle this.

**Evidence.** Three grep sweeps establish the whole chain, with no gaps to interpret:

```
=== consumers of editorDirty ===
App.tsx:56:   const editorDirty = useRef(false);
App.tsx:96:     if (id !== current && editorDirty.current) {     ← trySelect
App.tsx:107:    if (editorDirty.current) {                        ← beforeunload
App.tsx:585:              editorDirty.current = d;                ← the setter
App.tsx:636:                  editorDirty.current = false;        ← the modal's Discard

=== consumers of pendingNav ===
App.tsx:57 (state) · App.tsx:625 (modal render) · App.tsx:637 (setSelectedId)

=== every setTab call ===
Editor.tsx:107: const [tab, setTab] = useState<"ticket" | TicketDoc>("ticket");
Editor.tsx:384:            onClick={() => setTab("ticket")}
Editor.tsx:392:              onClick={() => setTab(d.key)}
```

`editorDirty.current` has exactly two readers: `trySelect` (`App.tsx:94-102`), which fires
the confirm modal, and the `beforeunload` handler (`App.tsx:105-114`). `pendingNav` — the
modal's trigger — is set in exactly one place, inside `trySelect`. And `setTab` has exactly
two call sites, both `onClick` handlers, neither of which touches `selectedId` or `trySelect`.
The guard therefore cannot engage on a tab switch. That is the mechanism, established
without inference.

The loss itself follows from React's reconciliation contract, not from behaviour that needs
observing: `DocEditor` is rendered with `key={`${item.id}:${tab}`}` (`Editor.tsx:432`), and
its unsaved text lives in `useState` local to that component (`text` at `Editor.tsx:649`).
A `key` change at the same position unmounts the old instance and mounts a new one, so
`text` is discarded by definition. Step by step: `dirty = editing && text !== (content ?? "")`
(`:652`) → `onDirty(true)` (`:654-656`) → `docDirty` (`:109`) → `dirty` (`:170`) →
`onDirtyChange` (`:172-174`) → `editorDirty.current = true` (`App.tsx:585`). The user clicks
Plan → `setTab` → new key → old instance unmounts → its cleanup `() => onDirty(false)`
(`:657`) resets `docDirty` → the new instance mounts clean and loads `plan.md`. No modal,
no trace, and `editorDirty` is back to `false` before anything could have read it.

**The Ticket-tab button (`Editor.tsx:382-387`) loses the same text by a different route**:
`{tab !== "ticket" ? <DocEditor/> : <>…</>}` (`Editor.tsx:430`) unmounts `DocEditor` via the
conditional rather than a key change. Same loss, outside the bot's cited line range.

**Reasoning.** No part of this depends on Electron, on timing, or on anything observable only
at runtime. The one thing a running UI would add is confirmation that no *other* mechanism
intercepts the click — and the grep sweeps close that off directly: there is no other reader
of `editorDirty` and no other setter of `pendingNav`. Marking this `⊘` would be
over-cautious.

**Impact if not fixed.** Straightforward, high-frequency, silent loss of user-authored text.
Writing `research.md` and clicking Plan to check something before finishing is an obvious and
likely action — the doc tabs exist precisely to be moved between — and the text is gone with
no prompt, exactly where the app prompts you for the equivalent action one level up (clicking
another card *does* raise "Discard changes to TICK-012?"). That inconsistency makes it worse
than a uniformly unguarded editor: the user has been taught the app protects them.
`phase-4-gui-trust/plan.md:19` commits in writing to routing "**tab switch**" through
`trySelect` — the strongest plan↔implementation contradiction in the set. Not data loss on
disk; unrecoverable in-memory loss, which for a half-written research document is the same
thing to the person who typed it.

**Fix sketch.** Guard at the **tab** level, where the loss happens, rather than stretching
`trySelect` (which is about item selection) down a level. The smallest correct change is a
`tryTab(next)` inside `Editor` that checks `docDirty` and routes through a
`pendingTab` + confirm — reusing the existing modal markup from `App.tsx:625-646` — wired
into **both** `Editor.tsx:384` and `:392`, since the Ticket button loses the same text.
**Take the wider surface too, but as a separate follow-up rather than in this change**: rows
14–17 of the table above (delete-while-open `App.tsx:326`, archived-view delete `:544`,
open-project / open-recent `:83`) all call `setSelectedId` **directly** and bypass the guard
for dirty *ticket fields* as well as dirty docs. Those are `App.tsx`-local one-line
substitutions of `trySelect` for `setSelectedId` — genuinely trivial, but a different file
and a different failure story, and honouring the Phase 4 plan's "every deselection through
one gate" intent means auditing them as a set. Update `phase-4-gui-trust/plan.md:19` and
`README.md:120` to match whatever ships. Verification is limited to
`npm run typecheck -w @kanmer/gui` + `npm run build -w @kanmer/gui` + the `KANMER_SMOKE=1`
boot — `apps/gui` has no test files — so keep the change small and review it by reading.

---

## 5 · Keep generated wiki links out of raw-HTML escaping

**`apps/gui/src/renderer/src/lib/markdown.ts:16-17`** · `renderer.html` override

[▸ view comment](https://github.com/collisionengineers/kanmer/pull/2#discussion_r3771312545) ·
[▸ view code](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/apps/gui/src/renderer/src/lib/markdown.ts#L16-L17) ·
cites [AGENTS.md:221-224](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/AGENTS.md#L221-L224)

### Reported

> Do not pass the synthetic wiki-link anchors through the renderer that escapes every
> HTML token.
>
> `renderMarkdown` first replaces `[[API-001]]` with an `<a>` element, but `marked` then
> treats that generated element as HTML and this override escapes it, so previews display
> literal anchor markup instead of the clickable wiki links that form part of the
> repository's link model.

### Code at that line

```ts
// Item bodies are agent- and human-written Markdown, not trusted HTML: raw
// HTML blocks/inlines render as escaped text instead of live markup (this
// output goes through dangerouslySetInnerHTML; CSP is the backstop).
const renderer = new Renderer();
renderer.html = ({ text }) => escapeHtml(text);   // ← also hits our own [[wikilink]] anchors
```

### Affected surface

**Primary site** — `markdown.ts:16-17`. The whole file is 33 lines; the ordering is the
issue:

1. `WIKILINK_RE` (`markdown.ts:3`) — `/\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g` — matches on the
   **raw markdown string**, before `marked` sees anything.
2. `renderMarkdown(body, knownIds)` (`markdown.ts:24-32`) does `body.replace(WIKILINK_RE, …)`
   (line 25), splicing literal `` `<a href="kanmer:${id}" class="${cls}">${label}</a>` ``
   strings into the markdown text (`:29`; `cls` is `"wikilink"` or `"wikilink missing"` per
   `knownIds.has(id)`, `:28`). *Then* `marked.parse(withLinks, { async: false, renderer })`
   (`:31`) tokenizes that string — classifying the spliced `<a>` as an inline raw-HTML
   token, which routes through the override at `:17` and is escaped by `escapeHtml`
   (`:5-11`).
3. The override exists to defend against **externally-authored** HTML — its own comment
   (`markdown.ts:13-15`): *"Item bodies are agent- and human-written Markdown, not trusted
   HTML … CSP is the backstop."* **Nothing distinguishes HTML we generated from HTML the
   body author wrote** — both arrive as the same token type.

**Callers — exactly two**, both in `Editor.tsx`: the ticket-body preview (`:538`) and the
doc preview in `DocEditor` (`:782`), both via `dangerouslySetInnerHTML`. Repo-wide grep
finds no other importer.

`knownIds` is built once at `App.tsx:380` (`useMemo(() => new Set(items.map(i => i.id)))`)
and threaded through `Editor` props (`:15-18`, `:94`); its only purpose is the "missing"
class (`markdown.ts:28`).

Click handling (`Editor.tsx:289-298` and the duplicated inline handler at `:774-781`) checks
`target.tagName === "A"` and `href.startsWith("kanmer:")` then calls `onNavigate` →
`trySelect`. **Written correctly for real anchors** — it simply has nothing to bind to if
the anchor is escaped to text.

CSP: `apps/gui/src/renderer/index.html:6-9` —
`default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;`. No
`script-src` override, so it falls back to `default-src 'self'`, blocking inline scripts and
`javascript:`. That is the "backstop" the code comment means: `escapeHtml` is
defence-in-depth against markup injection, CSP against script execution.

Styling that only applies if anchors reach the DOM: `styles.css:433` (`.markdown a.wikilink`),
`:439` (`.markdown a.wikilink.missing`).

**Shared state & invariants — every other markdown / wiki-link surface**

| Surface | Renders markdown? | Wiki-links? |
|---|---|---|
| Card previews (`Board.tsx:158-235`) | No — `item.title` as plain text (`:222`) | No |
| Doc preview (`Editor.tsx:782`) | Yes — same `renderMarkdown` | Same bug surface |
| Checklist tab (`Editor.tsx:742-768`) | No — own regex parse to JSX `<label>`/`<input>`, no `dangerouslySetInnerHTML` | **Never linkified** — shows literal `[[ID]]`. Pre-existing non-feature, a `renderMarkdown` fix won't touch it |
| Standup (`Standup.tsx:118-124`, `:85-91`) | No — plain template strings | No. "Copy as Markdown" (`:52-59`, `:65-74`) generates but never re-parses |
| Activity / Archived / Palette | No (`ActivityPanel.tsx:37`, `ArchivedList.tsx:38`, `CommandPalette.tsx:42`) | No |

- **Autocomplete agrees by construction**: `Editor.tsx:300-334` matches
  `/\[\[([^\]\n]*)$/` before the caret (`:311`) and `insertSuggestion` (`:320-334`) splices
  `` `[[${chosen.id}]]` `` — the same literal shape `WIKILINK_RE` matches.
- **Core agrees on syntax**: `parseWikiLinks` (`links.ts:4-15`) uses
  `/\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g` — token-for-token identical to the GUI regex except
  the GUI also *captures* the alias (core only needs ids). Verified, not assumed. Consumed
  by `forwardLinks` (`links.ts:18-22`) and `store.deleteItem` (`store.ts:802`).
- `escapeHtml` is standalone; core has no HTML-escaping logic (it never renders HTML).

**Bundled / generated copies** — none. Repo-wide grep for `from "marked"` and `escapeHtml`
matches only `markdown.ts`. The plugin bundle is server-only with no rendering concern. The
sole duplication is the twice-written click handler noted above.

**Tests & fixtures** — no test file for `markdown.ts`; `apps/gui` has zero tests.
`store.test.ts:357-371` exercises `parseWikiLinks` *syntax* indirectly via the backlink
graph, but core never touches HTML, so it cannot catch a rendering regression.

**Documentation**

- `AGENTS.md:221-224` (cited) — *"Linking is two mechanisms resolved into one backlink
  graph: the `links:` frontmatter array **and inline `[[ID]]` wiki-links in the body**"* —
  which is what makes unclickable rendering a link-model regression, not a cosmetic one.
- `README.md:54` (same claim, user-facing), `README.md:120` (*"`[[ID]]` gets
  **autocomplete**"* — documents the feature that is correctly wired, silent on preview).
- `plugins/kanmer/skills/kanmer-workflow/SKILL.md:66` — *"`[[ID]]` inside prose works for
  inline references"* — agent-facing.
- **`docs/plans/kanmer-upgrades/phase-4-gui-trust/plan.md:27`** (item 4.5) — *"Bundle:
  disable raw-HTML passthrough in `renderMarkdown` (marked renderer override, zero deps) —
  CSP remains the backstop."* The plan entry that introduced the override, with **no mention
  of the wiki-link substitution happening earlier in the same function**.

### Notes

- The one finding where two goals this PR added collide head-on: **escape raw HTML** (Phase
  4 trust) vs. **render wiki links as anchors** (the link model). Any fix must preserve
  both — no path may reopen live rendering for body-authored HTML; only the two
  internally-generated anchor shapes should survive.
- Adjacent to [issue 8](#8--remove-folded-document-ids-from-structured-links): together the
  two define "is the link model self-consistent" (syntax agreement here, stale structured
  entries there), though mechanically unrelated.
- Checklist-tab wiki-links being permanently unlinked is a separate observation — a
  `renderMarkdown` fix won't reach that code path.

### Open questions

- Safelist the two known-synthetic anchor shapes, or restructure `renderMarkdown` to apply
  substitution to `marked`'s token stream / a custom inline extension instead of the raw
  string before tokenization?
- **Possible second defect on the same line:** since substitution runs before tokenization
  (`markdown.ts:25` precedes `:31`), the regex has no awareness of code-span or fence
  boundaries — does `` `[[API-001]]` `` inside backticks get converted to a live anchor?
  Worth checking in the validation pass.
- Is a `marked` custom tokenizer/extension for `[[…]]` the cleaner route, sidestepping the
  two-pass string-then-parse approach entirely?

### Verdict

`☑ validated` — settled definitively by calling the real renderer: **zero of thirteen**
wiki-link cases produce a clickable anchor. The open question is answered too, and the answer
is a second defect on the same line.

**Evidence.** `markdown.ts` is 33 lines and self-contained, so a byte-faithful copy was run
against the installed `marked@14.1.4` with `knownIds = {API-001, API-002}`:

```
marked version: 14.1.4

--- A. inline wikilink in a paragraph
    in : "See [[API-001]] for details."
    out: "<p>See &lt;a href=&quot;kanmer:API-001&quot; class=&quot;wikilink&quot;&gt;API-001&lt;/a&gt; for details.</p>\n"
    live anchor present: false

--- C. unknown id
    out: "<p>See &lt;a href=&quot;kanmer:NOPE-999&quot; class=&quot;wikilink missing&quot;&gt;NOPE-999&lt;/a&gt;.</p>\n"
    live anchor present: false
```

Paragraph, alias form, unknown id, standalone, list item, heading, blockquote, no-space
adjacency — **all thirteen cases printed `live anchor present: false`**. What the user sees in
the preview pane is the literal text `<a href="kanmer:API-001" class="wikilink">API-001</a>`.

*The override is the sole cause*, isolated by rendering the same input with and without it:

```
WITHOUT override: "<p>See <a href=\"kanmer:API-001\" class=\"wikilink\">API-001</a> for details.</p>\n"
WITH override   : "<p>See &lt;a href=&quot;kanmer:API-001&quot; class=&quot;wikilink&quot;&gt;API-001&lt;/a&gt; for details.</p>\n"
```

*The raw-HTML defence still works* — cases H and I confirm body-authored HTML stays escaped
(`Hello <img src=x onerror="alert(1)">` → `&lt;img …&gt;`), so the override is doing its job;
it simply cannot tell our markup from the author's.

**Answer to the open question — yes, and it is a real second defect.** Because substitution
(`markdown.ts:25`) runs before tokenization (`:31`), the regex has no awareness of code
boundaries:

```
--- E. wikilink inside a code span
    in : "Reference it as `[[API-001]]` in prose."
    out: "<p>Reference it as <code>&lt;a href=&quot;kanmer:API-001&quot; class=&quot;wikilink&quot;&gt;API-001&lt;/a&gt;</code> in prose.</p>\n"

--- F. wikilink inside a fenced block
    in : "```\n[[API-001]]\n```"
    out: "<pre><code>&lt;a href=&quot;kanmer:API-001&quot; class=&quot;wikilink&quot;&gt;API-001&lt;/a&gt;\n</code></pre>\n"
```

A user who writes `` `[[API-001]]` `` to *show* the syntax gets anchor markup rendered inside
the code span instead. Indented code blocks (case M) are affected identically. Today the two
defects mask each other — the anchor is escaped, so the code span merely shows the wrong
text; fix the escaping naively and case F starts emitting a live anchor inside a `<pre>`.
**Any fix must handle both or it will regress the second while fixing the first.**

**Reasoning.** The mechanism is exactly as the bot describes: `renderMarkdown` splices literal
`<a …>` strings into the markdown *string* (`markdown.ts:25-30`), `marked` then classifies
them as inline raw-HTML tokens, and `renderer.html` (`:17`) escapes them along with everything
else. Nothing distinguishes generated HTML from authored HTML because both arrive as the same
token type. There is no ambiguity left to resolve.

**Impact if not fixed.** Wiki-links are non-functional in both markdown previews — the ticket
body (`Editor.tsx:538`) and every document tab (`Editor.tsx:782`) — for every user, on every
board, 100% of the time. This is not a degradation, it is a feature that does not work at all.
`AGENTS.md:221-224` and `README.md:54` both state that inline `[[ID]]` wiki-links are one of
the two mechanisms resolving into the backlink graph, and the plugin skill tells agents
"`[[ID]]` inside prose works for inline references" (`kanmer-workflow/SKILL.md:66`) — so
agents are being instructed to write links that render as visible markup garbage. Worse than
non-functional, actually: instead of degrading to plain `[[API-001]]` text, the preview shows
a wall of raw anchor tags, which reads as a rendering bug to any user. Supporting machinery is
all correct and merely orphaned — the click handlers (`Editor.tsx:289-298`, `:774-781`) test
for real anchors, `styles.css:433,439` styles `.wikilink` / `.wikilink.missing`, autocomplete
(`Editor.tsx:300-334`) inserts the matching syntax, and core's `parseWikiLinks`
(`links.ts:5`) agrees on the grammar. Everything works except the one step that turns the
markup into a link. Highest-visibility, lowest-risk item in the set.

**Fix sketch.** Do **not** safelist the generated anchor shape in `renderer.html` — that
reopens a hole the moment a body author writes the same string, and it leaves the code-span
defect untouched. The right shape is to stop pre-substituting into the raw string and instead
register a **`marked` inline extension** (or custom tokenizer) for `[[id]]` / `[[id|alias]]`,
so `[[…]]` is recognised during tokenization and emitted as a proper link token by the
renderer. That is the route the open questions already gesture at, and it fixes both defects
at once by construction: code spans and fenced blocks are tokenized before inline extensions
run, so `` `[[API-001]]` `` stays literal for free, and no raw HTML is ever produced for the
`html` override to see — meaning the Phase 4 escaping stays exactly as strict as it is today.
Keep the scope **narrow**: `markdown.ts` is 33 lines with two callers and no bundled copies,
so nothing else needs to move. Two things deliberately stay out of scope — the checklist tab
(`Editor.tsx:742-768`) parses lines to JSX itself and never calls `renderMarkdown`, so it will
still show literal `[[ID]]`; and the twice-written click handler (`:289-298` vs `:774-781`) is
a tidy-up, not part of this. Since `apps/gui` has no tests, the honest verification is to
re-run the repro script against the new `renderMarkdown` — the thirteen cases above make a
ready-made checklist, and cases H/I are the non-regression guard for the escaping.

---
---

# P2

---

## 6 · Check move conflicts before materializing column order

**`packages/core/src/store.ts:589-592`** · `KanmerStore.moveItem()`

[▸ view comment](https://github.com/collisionengineers/kanmer/pull/2#discussion_r3771312560) ·
[▸ view code](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/packages/core/src/store.ts#L589-L592) ·
cites [AGENTS.md:11-18](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/AGENTS.md#L11-L18)

### Reported

> Validate `expectedUpdated` before calling `computeOrder`.
>
> When a stale caller requests a positioned move into a column containing unordered
> items, `computeOrder` first writes `order` and new `updated` timestamps to every item
> in that column; only afterward does `updateItem` reject the target as conflicted, so an
> operation reported as failed still mutates unrelated tickets and emits activity events
> in this multi-writer store.

### Code at that line

```ts
// moveItem()
const { position, ...patch } = to;
if (position === undefined) return this.updateItem(id, patch);
const order = await this.computeOrder(id, to.status, position);  // ← writes before the check
return this.updateItem(id, { ...patch, order });                 // ← conflict detected here
```

### Affected surface

**Primary site** — `store.ts:585-593`, `KanmerStore.moveItem()`. A plain status change
delegates straight to `updateItem`; a *positioned* move computes `order` via `computeOrder()`
first, and only the subsequent `updateItem` enforces `expectedUpdated` and the proof gate.

**What `computeOrder` actually writes** — `store.ts:600-636` (private). It reads the target
column and, if any item lacks `order`, calls `materialise()` (`store.ts:607-614`), which
**writes** `order` to each such item via `this.updateItem(item.id, { order: n })` — a real
disk write, an `updated` bump, and an activity append **per item**, with no `expectedUpdated`
guard, all before `moveItem` validates the caller's own `expectedUpdated`.

**Call graph — the reachable surface is one MCP tool**

1. MCP `move_item` — `mcp-server/src/index.ts:471-496` (handler `:493-495`). **The only
   call site anywhere in the repo — core, server, GUI, tests, bundle — that can pass
   `position`.**
2. GUI IPC `moveItem` — `shared/ipc.ts:121` types it as `moveItem(id, to: { status: string })`,
   with **no `position` field in the contract at all** → `main/index.ts:423-426`. Every GUI
   caller sends `{status}` only: drag-and-drop drop handler (`Board.tsx:97-102`),
   keyboard `moveRelative` (`App.tsx:283-296`), right-click "Move to" (`App.tsx:318`).
   *So the GUI cannot reproduce this today.* Note
   `docs/plans/kanmer-upgrades/phase-6-data-model/plan.md:25` ("GUI drag-and-drop writes
   `position`…") describes a design that did not ship that way.
3. Tests — `store.test.ts:578-602`, `smoke.mjs:417-424`; both use `position`, neither
   combines it with `expectedUpdated`.

`updateItem` (`store.ts:508-578`) performs the conflict check at `:522-529` — called once
per sibling inside `materialise()` (no `expectedUpdated`, always succeeds) and once for the
real target (with the caller's value — the only place the conflict can surface, after the
siblings have already written).

**Shared state & invariants**

- `appendActivity` (`activity.ts:36-56`) fires once per `materialise()` sibling plus once
  for the target, so a *failed* positioned move against N unordered siblings leaves N
  spurious `update`/`field:"order"` entries — visible via MCP `get_activity`
  (`mcp-server/src/index.ts:375-391`) and the GUI activity panel (`main/index.ts:462-464`).
- `byOrderThenId()` (`store.ts:931-936`) re-sorts every `listItems`/summary immediately, so
  the mutation is externally visible on the board even though the call reported failure.
- `expectedUpdated` (`types.ts:182`) is checked **only** in `updateItem`. Both tool
  descriptions imply all-or-nothing: `update_item` (`index.ts:442`) *"so a concurrent edit
  is rejected as a conflict instead of overwritten"*; `move_item`'s `expected_updated`
  (`index.ts:484-489`) *"Rejected as a conflict if the item changed since."*
- Second-order: `materialise()`'s writes can race with anything else touching the column
  concurrently, so another actor could now hit a *legitimate* conflict against the
  order-only write it just made.
- `assertProofGate` (`store.ts:828-843`) fires from `updateItem`'s status-change branch
  (`:543-546`) only on the target's final call, never on the order-only sibling patches.
  #6 and #7 share this downstream function but not a root cause.

**Bundled / generated copies** — `plugins/kanmer/mcp/kanmer-mcp.cjs`: `moveItem` at `38452`,
`computeOrder` at `38463` (called `38455`), `move_item` registration at `39164`. Identical
copy; needs `npm run plugin:build` after any fix.

**Tests & fixtures**

- `store.test.ts:578-602` — position-verb mechanics, no stale `expectedUpdated`.
- `store.test.ts:184-196` — stale `expectedUpdated`, but against `updateItem` directly.
- `smoke.mjs:417-424` — `position: "top"` on a 2-item column, no `expected_updated`.
- **Gap:** no test in either suite combines a stale `expectedUpdated` with `position` into a
  multi-item unordered column.

**Documentation**

- `AGENTS.md:11-18` (cited) — the two-independent-processes invariant.
- `mcp-server/src/index.ts:475-476` (`move_item` description) — *"Optional position places
  the item within the column … this maintains the manual order humans see"* — silent on the
  interaction with `expected_updated` or that other items get written. Duplicated verbatim
  for agents at `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:26`.
- `plugins/kanmer/skills/kanmer-workflow/SKILL.md:85` — *"Use `move_item position` … when
  the user asks for ordering"* — steers agents toward exactly the triggering call shape.
- `docs/plans/kanmer-upgrades/phase-6-data-model/plan.md:25` (ordering design) and
  `phase-1-core-correctness/plan.md:36-37` (`expectedUpdated` design) — the two features
  were never revisited together at design time.

### Notes

- Damage is confined to the *first* positioned move into a column still holding unordered
  items — the Phase 6 backfill, as the bot's own note says.
- **The GUI cannot trigger this at all** (no `position` in its IPC contract), so the entire
  reachable blast radius is the single MCP `move_item` tool. Useful for scoping a fix's test
  matrix.
- Coupled to [issue 3](#3--detect-concurrent-document-edits-before-saving): same root
  pattern — a write path that doesn't gate on a freshness check before writing.

### Open questions

- Validate `expectedUpdated` against the target *before* `computeOrder`, or make
  `materialise()`'s sibling writes conditional/deferred until the target write succeeds?
- Is the second-order case (a legitimate conflict *caused* by `materialise()`) in scope?

### Verdict

`☑ validated` — a move rejected as a conflict still wrote `order` and bumped `updated` on
**3 of 3** siblings and appended **3** activity entries. The scope is wider than filed: the
same happens when the move is rejected by the **proof gate**, not just by `expectedUpdated`.

**Evidence.** Four tickets on a fresh v2 board — three unordered in `planning`, one target in
`todo` — with the target mutated after its `updated` was captured, then moved with the stale
value:

```js
await store.moveItem(t.id, { status: "planning", position: "top", expectedUpdated: staleUpdated });
```

```
siblings before: [{"updated":"…55.203Z"},{"updated":"…55.213Z"},{"updated":"…55.221Z"}]
moveItem(stale expectedUpdated, position:"top") → REJECTED as conflict
siblings after : [{"order":10,"updated":"…56.357Z"},{"order":20,"updated":"…56.364Z"},{"order":30,"updated":"…56.369Z"}]
>>> siblings mutated by a FAILED move: 3/3 (TICK-001, TICK-002, TICK-003)
>>> activity entries appended by the failed move: 3
    [{"id":"TICK-001","op":"update","field":"order","to":10},
     {"id":"TICK-002","op":"update","field":"order","to":20},
     {"id":"TICK-003","op":"update","field":"order","to":30}]
target status unchanged? true (todo), order=undefined
```

Every element of the bot's claim is present: the operation reported failure, unrelated
tickets were mutated on disk, and activity events were emitted for them.

**Scope is wider than filed.** The bot frames this as an `expectedUpdated` ordering problem.
It is really "`computeOrder` writes before *any* of `updateItem`'s rejections run". The proof
gate produces the identical outcome with no `expectedUpdated` involved at all:

```
moveItem(T → final stage "done", position:"top") with no proof.md → REJECTED (proof gate)
orders before: {}
orders after : {"TICK-004":10,"TICK-005":20}
>>> siblings in the final stage written despite the rejected move: true
```

One rejection path is genuinely safe, and for a structural reason worth recording: an
unknown status is rejected by `assertFieldAgainstBoard`, but by then `computeOrder`'s column
query has already matched zero items (no item can carry a status the board doesn't define),
so `materialise()` has nothing to write. Verified — the unrelated `planning` column was
untouched.

**Reasoning.** `moveItem` (`store.ts:585-593`) calls `computeOrder` *before* the `updateItem`
that performs every validation. `computeOrder` → `materialise()` (`store.ts:607-614`) calls
`this.updateItem(item.id, { order: n })` per sibling — each a real `writeFileAtomic`, an
`updated` bump and an `appendActivity` — and passes no `expectedUpdated`, so each always
succeeds. Only afterwards does the caller's own `updateItem` reach the conflict check
(`store.ts:522-529`) or the proof gate (`:543-546`). The reachable surface is exactly one
MCP tool: `move_item` (`mcp-server/src/index.ts:471-496`) is the only call site in the repo
that can pass `position`, and it accepts `position` and `expected_updated` together in one
`inputSchema`. The GUI cannot trigger it — `shared/ipc.ts:121` types `moveItem(id, to: { status })`
with no `position` field.

**Impact if not fixed.** Bounded and recoverable, which is why P2 is right. Damage is confined
to the *first* positioned move into a column that still holds unordered items — after the
Phase 6 backfill has run for a column, `materialise()` never fires there again. The failure
mode is a broken all-or-nothing contract rather than lost data: the agent is told
`Conflict: … Re-read the item and re-apply your change`, having been promised
"Rejected as a conflict if the item changed since" (`index.ts:484-489`), yet N unrelated
tickets have already been rewritten. Concretely: (1) N spurious `update`/`field:"order"`
lines in `activity.jsonl`, visible in `get_activity` and the GUI activity panel, polluting
the standup/audit story that Phase 6 added the log for; (2) N `updated` bumps that can cause a
*legitimate* conflict for a different actor holding a now-stale `expectedUpdated` on one of
those siblings — a failure that propagates outward; (3) `byOrderThenId()` (`store.ts:931-936`)
re-sorts immediately, so the human's board visibly reorders on an operation that reported
failure. No content is lost and the ordering values written are the ones that would have been
written anyway, so this is "confusing but recoverable", not data loss.

**Fix sketch.** Validate before mutating: in `moveItem`, read the target once and run the
freshness check (and ideally the proof gate) **before** calling `computeOrder`. The tidy shape
is a small private `assertMoveAllowed(id, to)` that re-reads the item, compares
`expectedUpdated`, and calls `assertProofGate` when the status is changing — then
`computeOrder`, then the real `updateItem` which re-checks as it does today (cheap, and it
closes the window between the two reads). **Keep it narrow.** Do not try to make
`materialise()` transactional or defer the sibling writes: those writes are legitimate
backfill that must persist once the move proceeds, and staging them would mean a rollback
path in a filesystem store that deliberately has none. Do not chase the second-order case
(a legitimate conflict *caused* by `materialise()`) — it disappears once the pre-check
stops the common path from reaching `materialise()` at all, and pursuing it properly would
mean column-level locking, which the architecture rejects on purpose (`AGENTS.md:348-354`).
Test the gap the suite has: `store.test.ts:578-602` covers position mechanics and `:184-196`
covers stale `expectedUpdated`, but nothing combines them — add one case asserting the
siblings are untouched after a rejected positioned move, and one for the proof-gate variant.
Pair with [#3](#3--detect-concurrent-document-edits-before-saving) as one freshness-audit
pass, and re-run `npm run plugin:build` (the bundle carries its own `moveItem`/`computeOrder`).

---

## 7 · Enforce the proof gate when reordering statuses

**`packages/core/src/store.ts:283-285`** · `reorderColumns()`

[▸ view comment](https://github.com/collisionengineers/kanmer/pull/2#discussion_r3771312573) ·
[▸ view code](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/packages/core/src/store.ts#L283-L285) ·
cites [AGENTS.md:190-193](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/AGENTS.md#L190-L193)

### Reported

> Before making a different status the last column, verify that tickets already in that
> status have `proof.md`.
>
> Reordering can currently turn a stage such as `review` into the final stage without
> touching its tickets, bypassing `assertProofGate` and leaving proofless tickets in the
> board's proof-gated last stage.

### Code at that line

```ts
// reorderColumns()
const byId = new Map(list.map((c) => [c.id, c]));
list.splice(0, list.length, ...orderedIds.map((cid) => byId.get(cid)!));
await this.setBoard(board);   // ← no proof-gate revalidation for the new last stage
```

### Affected surface

**Primary site** — `store.ts:271-287`, `reorderColumns()`. Applies a caller-supplied
permutation to the status/area/priority list and saves the whole board via `setBoard()`,
with no per-item revalidation.

**Call graph**

- Direct caller: MCP `reorder_columns` (`mcp-server/src/index.ts:646-659`, handler `:658`).
  Repo-wide grep confirms it is the **only** caller of `KanmerStore.reorderColumns()`.
- `setBoard()` (`store.ts:172-174`) → `writeBoard()` (`board.ts:94-98`) → zod +
  `assertUniquePrefixes()` (`board.ts:54-72` — [issue 1](#1--reject-duplicate-legacy-type-prefixes)'s
  function) + atomic write. **None of this validates board↔item cross-consistency.**
- **A sibling GUI path reaches the identical end state without touching `reorderColumns()`
  at all:** `Settings.tsx:287-293` `move(i, dir)` swaps two adjacent entries in local state
  (wired to the ↑/↓ buttons, `Settings.tsx:325-340`, used for statuses too); the edited
  board saves via `App.tsx:246-248` → `CH.setBoard` (`main/index.ts:407-411`) →
  `requireStore().setBoard(board)` **directly**. The GUI's own pre-save `validateDraft()`
  (`Settings.tsx:371-401`) has **no** last-stage/proof-gate check — only name/prefix/
  uniqueness. A human dragging `review` to the bottom with ↑/↓ hits the same hazard through
  a structurally different path that a fix scoped to `reorderColumns()` would miss.
- `assertProofGate()` (`store.ts:828-843`, private) is **not** called from
  `reorderColumns()`. Its only two callers are `updateItem`'s status-change branch
  (`store.ts:543-546`, v2 tickets only) and `takeTicket()` (`store.ts:667-669`) — both
  require a **ticket** status change, neither reachable from a **board** mutation.
- The sibling that *does* stay consistent: `removeColumn()` (`store.ts:219-268`) with
  `migrateTo` rewrites every affected item via `this.updateItem(item.id, { status: … })`
  (`store.ts:252`), routing through the gated path. `addColumn()` (`:177-186`) and
  `updateColumn()` (`:192-211`) never change which column is last, so they're unexposed.

**Shared state & invariants**

- **"Last stage" is independently re-derived in five places**, all of which reflect a
  reorder immediately (a duplication fact, not itself a defect): `assertProofGate`
  (`store.ts:835`); the overdue filter in `listItemsWithWarnings` (`store.ts:391`);
  `blockedSet()` (`mcp-server/src/index.ts:139`, backing the `blocked` field on
  `list_items`/`get_item`/`search_items`); `computeBlockedIds`'s signature (`links.ts:61`);
  and `Standup.tsx:108`, which also carries its own re-implemented `blockedIds()`
  (`Standup.tsx:23-29`, *"Same live-blocker rule as core"*) because renderer code may only
  `import type` from `@kanmer/core`.
- `proof.md` is written only via `setDoc(id,"proof",…)` (`store.ts:722-746`), MCP
  `set_ticket_doc` (`mcp-server/src/index.ts:530-548`), or the GUI doc tabs.
  `assertProofGate` is its only *gating* reader; `getTicketDocsInfo` (`store.ts:749-770`)
  surfaces presence for display only.
- `board.yml`'s `statuses` order is the single source for both "first stage"
  (`createItem`'s default, `store.ts:474`) and "last stage". `reorderColumns()` and the GUI
  `move()` swap are the only two ways either boundary moves — neither validates item state.
- Shares the `setBoard`/`writeBoard` chokepoint with
  [issue 1](#1--reject-duplicate-legacy-type-prefixes).

**Bundled / generated copies** — `plugins/kanmer/mcp/kanmer-mcp.cjs`: `reorderColumns` at
`38191`, `assertProofGate` at `38668` (bundle-internal calls at `38418`/`38520`),
`reorder_columns` registration at `39313`.

**Tests & fixtures**

- **`store.test.ts` never calls `reorderColumns()` at all** (grep-confirmed). Board-mutation
  coverage is `addColumn` (`:306-309`, `:333-336`) and a `setBoard` round-trip (`:345-353`).
  The one proof-gate test (`:455-463`) exercises only the `moveItem`/`updateItem` path.
- `smoke.mjs:285-301` is the only `reorder_columns` coverage anywhere — and only for
  `kind: "priority"`, which has no proof-gate concept.
- **Gap:** zero coverage in either suite of reordering *statuses*, positive or negative.

**Documentation**

- `AGENTS.md:190-193` (cited) — *"The FIRST stage is where new items land; the LAST stage is
  proof-gated."* States the invariant as fixed geometry, silent on revalidation.
- `AGENTS.md:345` (§11) already documents the **identical shape of bug for a different
  tool** — *"the GUI Settings editor's whole-board save can still drop an in-use column"*.
- `mcp-server/src/index.ts:650-651` (`reorder_columns` description) — *"Note that the FIRST
  status is where new items land and the LAST status is the proof-gated final stage"* —
  states the invariant, not that reordering goes unchecked against it. Duplicated at
  `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:32`.
- **`plugins/kanmer/skills/kanmer-setup/SKILL.md:38-41`** — *"You can now apply stage
  changes yourself: `add_column` / `update_column` / `reorder_columns` … Still bias toward
  keeping the defaults — the proof gate lives on the LAST stage … so a restructure changes
  behaviour, not just labels."* Actively invites agents to call it on statuses, with a soft
  warning and no hard stop.
- `docs/plans/kanmer-upgrades/phase-2-format-v2-storage/plan.md:61-63` — the proof gate was
  designed scoped to the ticket-move path; board reorder was never in scope.

### Notes

- The gate is enforced on the ticket-move path (`assertProofGate` in `updateItem`), but the
  board-mutation path can move the goalposts instead of the ticket.
- **The GUI Settings ↑/↓ reorder path (`Settings.tsx:287-293`) is not among the nine filed
  findings but reproduces the identical end state via `setBoard` directly.** The validation
  pass should decide whether it is in scope for the same fix.
- Shares the `setBoard`/`writeBoard` chokepoint with
  [issue 1](#1--reject-duplicate-legacy-type-prefixes) — both are "board write validates
  shape but not cross-entity state" gaps in the same function, so a shared validation-surface
  fix could address both.

### Open questions

- Should a fix scoped to `reorderColumns()` also cover the GUI Settings ↑/↓ path?
- Does the fix walk `listItems()` for every item in the incoming-last status and check
  `proof.md` per item (mirroring `assertProofGate`), or change what "last stage" gates
  altogether (grandfather existing items, gate only future moves)?

### Verdict

`☑ validated` — reordering statuses put a proofless ticket in the proof-gated final stage,
with a consequence the bot did not claim: it **silently un-blocked a downstream ticket**.

**Evidence.** Board `todo → review → done`, one proofless ticket in `review`:

```
statuses: todo → review → done  (last = done)
(control) move TICK-001 review→done with no proof.md → BLOCKED by proof gate
reorderColumns(status, [todo,done,review]) → ACCEPTED
statuses now: todo → done → review  (last = review)
>>> TICK-001 is status="review" == final stage "review" with proof.md present? false
>>> proofless ticket now sits in the proof-gated final stage: true
moving a NEW ticket todo→review (now the last stage) → BLOCKED: TICK-002 cannot move to
    "review": proof.md is missing. …
```

The control confirms the gate works on the ticket-move path; the reorder walks straight past
it. The last line is the tell — the gate is live and correctly enforced for *new* arrivals,
while the ticket already sitting there is grandfathered in with no evidence.

**The consequence is behavioural, not cosmetic.** With a `blocks:` edge in play:

```
before reorder: statuses=todo>review>done last="done"  blockedIds=["TICK-002"]
after  reorder: statuses=todo>done>review last="review"  blockedIds=[]
>>> TICK-002 was blocked=true → now blocked=false
>>> reordering statuses SILENTLY UN-BLOCKED a downstream ticket: true
```

`computeBlockedIds` (`links.ts:61-73`) treats a blocker in the last stage as finished
(`links.ts:67`), so making `review` the last stage retroactively declares every in-review
blocker "done". That decoration reaches agents through `blocked` on
`list_items`/`get_item`/`search_items` (`mcp-server/src/index.ts:136-140`) and humans through
the standup view (`Standup.tsx:108`).

**The GUI reaches the identical end state without touching `reorderColumns()`.** Emulating
`Settings.tsx:287-293`'s ↑/↓ swap and saving the whole board:

```
setBoard with swapped statuses → ACCEPTED
statuses now: todo → done → review (last = review)
>>> TICK-001 sits in the final stage with no proof.md: true
```

**Reasoning.** `reorderColumns` (`store.ts:271-287`) validates only that `orderedIds` is a
permutation, then `setBoard` → `writeBoard`, which checks zod shape and prefix uniqueness and
nothing about items. `assertProofGate` (`store.ts:829-843`) has exactly two callers —
`updateItem`'s status-change branch (`:543-546`) and `takeTicket` (`:667-669`) — both
requiring a *ticket* status change, neither reachable from a *board* mutation. The gate is
enforced by moving the ticket to the goalposts; nothing stops you moving the goalposts to the
ticket. `removeColumn` is the sibling that does stay consistent (`store.ts:251-254` rewrites
every affected item through `updateItem`), which shows the codebase already knows the pattern.

**Impact if not fixed.** No data is lost or corrupted, which is why P2 is right — but the
board starts lying, and it lies to both audiences. A stage full of unverified work is
presented as the completed column; `AGENTS.md:190-193` states "the LAST stage is
proof-gated" as fixed geometry, and after a reorder that is false for every ticket already
there. The un-blocking is the sharper end: a downstream ticket that was correctly held stops
reporting `blocked`, so an agent following `kanmer-workflow` may pick up work whose
prerequisite was never actually finished. Reachability is real on both paths — the MCP tool is
actively recommended to agents (`kanmer-setup/SKILL.md:38-41` says "You can now apply stage
changes yourself: … `reorder_columns`", with only a soft warning), and the GUI ↑/↓ buttons are
ordinary UI a human uses to tidy their board. Frequency is low (people reorder stages rarely,
usually early) and the state is fully recoverable by reordering back or writing the missing
`proof.md`, so this is "confusing but recoverable". Note the *shape* of this bug is already
acknowledged for a neighbouring tool at `AGENTS.md:345` (the GUI whole-board save dropping an
in-use column), which is a reasonable precedent for how to handle it.

**Fix sketch.** Add a board↔item cross-consistency check on the write path, and **put it at
the `setBoard`/`writeBoard` chokepoint rather than in `reorderColumns()`** — a fix scoped to
the filed function leaves the GUI ↑/↓ path (`Settings.tsx:287-293` → `App.tsx:246-248` →
`main/index.ts:407-411` → `setBoard` directly) reproducing it verbatim, and that path is the
one a human is most likely to hit. Because `writeBoard` is a pure `board.ts` function with no
store access, the practical home is `KanmerStore.setBoard` (`store.ts:172-174`): when the last
status id changes, list items in the incoming last stage and check `proof.md` per ticket,
mirroring `assertProofGate`. Decide deliberately between **rejecting** the save (listing the
offending ticket ids, matching `removeColumn`'s in-use-column refusal at `store.ts:242-249`,
which is the established house style) and **grandfathering** existing occupants while gating
future moves. Rejecting is more consistent and easier to explain; grandfathering is friendlier
but means the invariant no longer holds board-wide, so `AGENTS.md:190-193` would need
rewording. Recommend rejecting, with the error naming the tickets so an agent can self-correct.
Whichever ships, mirror it in `Settings.tsx`'s `validateDraft()` (`:371-401`) so the GUI
surfaces it inline pre-save instead of failing at save time — the same two-copy consideration
as [#1](#1--reject-duplicate-legacy-type-prefixes), with which this shares the chokepoint.
Coverage is zero today (`store.test.ts` never calls `reorderColumns`; `smoke.mjs:285-301`
covers only `kind: "priority"`), so add both a positive and a negative status-reorder case
and a `smoke.mjs` check. Re-run `npm run plugin:build`.

---

## 8 · Remove folded document IDs from structured links

**`packages/core/src/migrate.ts:157-171`** · `migrateToV2()`, fold loop

[▸ view comment](https://github.com/collisionengineers/kanmer/pull/2#discussion_r3771312549) ·
[▸ view code](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/packages/core/src/migrate.ts#L157-L171) ·
cites [AGENTS.md:221-224](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/AGENTS.md#L221-L224)

### Reported

> When a legacy plan or research item is folded into a ticket document, also remove that
> item's ID from every surviving `links`/`blocks` array.
>
> The migration fixture itself has `TICK-001.links: [PLAN-001]`; after this deletion,
> `PLAN-001` no longer exists, but `get_links` and the GUI continue exposing a navigable
> structured relation to it, leaving the unified backlink graph permanently inconsistent.

### Code at that line

```ts
for (const f of folds) {
  const folder = ticketDest.get(f.ticket.id) ?? NO_AREA_DIR;
  const dir = ticketDirIn(paths, folder === NO_AREA_DIR ? "" : f.ticket.area ?? "", f.ticket.id);
  const target = path.join(dir, `${f.as}.md`);
  const content = `# ${f.doc.title}\n\n${f.doc.body.trim()}\n`;
  if (await pathExists(target)) {
    const existing = await readText(target);
    await writeFileAtomic(target, `${existing.trimEnd()}\n\n---\n\n${content}`);
    report.notes.push(
      `${f.ticket.id} already had a ${f.as}.md — "${f.doc.id}" was appended below a separator.`,
    );
  } else {
    await writeFileAtomic(target, content);
  }
  await fs.rm(legacyFile(f.doc), { force: true });   // ← id disappears; links to it don't
}
```

### Affected surface

**Primary site** — `migrate.ts:157-172`, the `folds` loop in `migrateToV2()`. Writes (or
appends) folded content into `<ticketDir>/plan.md` or `research.md` (`:160-170`), then
deletes the legacy source (`:171`). It never touches `links[]`/`blocks[]` on any *other*
item that referenced the now-deleted id.

**Call graph**

- **Migration has exactly one entry point in the whole repo**:
  `main/index.ts:453-455 ipcMain.handle(CH.migrate)` → `migrateToV2(requireStore(), {dryRun})`,
  reached from `App.tsx:484` (dry-run report) and `App.tsx:694` (real run). **No MCP tool**
  — grep for "migrate" in `mcp-server/src/index.ts` matches only `remove_column`'s unrelated
  `migrate_to` param (`:624-642`). Confirmed absent from `smoke.mjs` and from the plugin
  bundle.
- The vanished id is then read back through paths that do **not** filter for existence:
  - `buildLinkIndex()` (`links.ts:29-55`) → `forwardLinks()` (`links.ts:18-22`), which
    returns `item.links ?? []` **unfiltered**. Only `backlinks` (`:40-46`) and `blockedBy`
    (`:47-52`) are naturally safe — they're built by scanning *live* items outward rather
    than trusting a stored array.
  - `getLinkGraph()` (`links.ts:76-80`) → MCP `get_links` (`mcp-server/src/index.ts:349-373`),
    which annotates each id with a title lookup (`:360-364`); a dangling id resolves to
    `{ id: "PLAN-001", title: null }` (`titles.get(...) ?? null`, `:364`) — a silent ghost
    entry, not an error.
  - GUI: `getLinkGraph` also via `main/index.ts:443` → `Editor.tsx:158` → links panel
    (`Editor.tsx:576-595`, `LinkGroup` `:608-627`). Clicking a dangling chip → `onNavigate`
    → `App.tsx:583 trySelect` → `App.tsx:94-102` sets `selectedId` to a nonexistent id →
    `selected` resolves `null` (`App.tsx:381-384`) → the editor pane silently unmounts
    (`App.tsx:574`). A dead end with nothing surfaced — observed while tracing, not a
    claim in scope.
  - Raw pass-through: `getItem` (`store.ts:423-427`) and `listItems` (`store.ts:290-292`)
    return frontmatter verbatim, so the dangling id is visible through MCP `get_item` /
    `list_items` independently of `get_links`.
- **The one path that *is* existence-safe:** `computeBlockedIds()` (`links.ts:61-73`)
  explicitly filters — *"A blocker that no longer exists doesn't block anything"*
  (`links.ts:70-71`) — used by `blockedSet()` (`mcp-server/src/index.ts:136-140`) and
  re-implemented client-side at `Standup.tsx:23-30`. So the "is this blocked" decoration
  self-heals; **the raw `links`/`blocks` arrays do not.**

**Shared state & invariants**

- `AGENTS.md:222-224` — *"Linking is two mechanisms resolved into one backlink graph: the
  `links:` frontmatter array and inline `[[ID]]` wiki-links in the body; `blocks:` adds
  typed dependency edges on top."* `migrate.ts` writes that state, `links.ts` indexes it.
- **`deleteItem` already implements the analogous cleanup** (`store.ts:778-807`): after
  removing a file it iterates every remaining item and rewrites `links`/`blocks`
  (`:790-801`), returning `cleanedLinks`/`bodyReferencesRemain` (`types.ts:186-192`).
  **But it is not extractable** — it's a hand-rolled inline loop, not built on
  `buildLinkIndex`. (The design doc called for that reuse —
  `phase-1-core-correctness/plan.md:27-29`, *"reuse `buildLinkIndex` from `links.ts`"* —
  the shipped code doesn't.) So `migrate.ts` has no ready-made helper to call; a fix either
  duplicates the pattern or extracts a shared one first.
- `parseWikiLinks` (`links.ts:4-15`) is deliberately *not* rewritten by `deleteItem` either
  — body `[[wiki]]` mentions are left as prose by design (`bodyReferencesRemain`,
  `types.ts:192`). The same choice presumably applies to a migration fix.

**Bundled / generated copies**

- `plugins/kanmer/mcp/kanmer-mcp.cjs` bundles `getLinkGraph` (`38010`), `linkItems`
  (`38015`), `deleteItem` (`38621`) and the `get_links`/`link_items`/`delete_item` tools
  (`39061`/`39232`/`39327`) — a fix to `links.ts` or `deleteItem` needs
  `npm run plugin:build`.
- **`migrate.ts` is not in the bundle at all** (zero matches for `migrateToV2`/`foldedDocs`/
  `ticketMoves`), consistent with migration having no MCP surface. A fold-loop fix needs
  only a GUI rebuild.
- `Standup.tsx:23-30 blockedIds()` is an independent renderer-side re-implementation
  (renderer may only `import type` from core, `AGENTS.md:287`) — another place to keep
  consistent with whatever "does this id still exist" convention a fix sets.

**Tests & fixtures**

- **The bot's claim checks out.** `store.test.ts:616-679` (the v1 fixture) has
  `TICK-001.links: [PLAN-001]` at `store.test.ts:650`, and `PLAN-001`'s body references
  `[[TICK-001]]` (`:655-664`) — so the fold logic (`migrate.ts:97-117`) routes it into
  `folds` via `(t.links ?? []).includes(doc.id)`.
- `store.test.ts:708-756` (the migration round-trip) asserts `foldedDocs`, the resulting
  `plan.md` content (`:731-733`), version and board state — but **never asserts on
  `(await v1store.getItem("TICK-001"))?.links`** afterwards.
- The pattern exists in the suite for the sibling path: `store.test.ts:290-304` *does*
  assert `expect((await store.getItem(linker.id))?.links).not.toContain(target.id)` for
  `deleteItem` (`:302`) — just never applied to migration.
- No dedicated `migrate.test.ts` or `links.test.ts`; all coverage lives in `store.test.ts`.

**Documentation**

- `AGENTS.md:221-224` (cited) — the backlink-graph sentence; no migration exception noted.
- `AGENTS.md:165-169` — *"`migrate.ts` upgrades them (fold linked plans/research into ticket
  docs …)"* — silent on link cleanup either way.
- `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:38` — *"Frontmatter
  `links[]` in other items pointing at the deleted id are cleaned automatically
  (`cleanedLinks`)"*. That is `delete_item`'s documented guarantee; **nothing makes the same
  promise for migration**, so there's no doc claim to falsify — only a plausible expectation
  mismatch between two similar-sounding operations.
- `plugins/kanmer/skills/kanmer-setup/SKILL.md:62-66` (Upgrade mode) describes folding to
  the agent; `README.md:85-89` and `docs/plans/kanmer-upgrades/upgrades-plan.md:66` both say
  *"so nothing is lost"* — about content, not about the graph staying consistent.

### Notes

- The reviewer's claim that the repo's own fixture exhibits the case is **accurate as
  traced** (`store.test.ts:650`), so this is cheaply checkable against the existing
  round-trip test.
- Adjacent to [issue 5](#5--keep-generated-wiki-links-out-of-raw-html-escaping) — both
  concern link-model integrity end-to-end (rendering there, stale structured entries here),
  mechanically unrelated.
- Adjacent to [issue 9](#9--make-migration-resumable-after-partial-execution) (same
  function, adjacent loops): ticket-move (`:151-155`), fold (`:157-172`) and conversions
  (`:174-186`) all share the same unconditional-write shape. Fixes should be ordered
  against each other.

### Open questions

- Reuse `deleteItem`'s inline pattern by calling `store.updateItem` per affected item from
  inside `migrateToV2` (which already holds a `store` reference, `migrate.ts:61`), or
  extract a shared `cleanReferencesTo(items, deletedId)` used by both?
- Should cleanup cover `blocks[]` as well as `links[]`, mirroring `deleteItem`
  (`store.ts:795-797`)? The bot mentions both; the fixture only exercises `links`.
- Does `computeBlockedIds`'s self-healing (`links.ts:70-71`) already make a
  `blocks[]`-to-folded-id inert for board purposes, narrowing real impact to `get_links`'s
  raw field and direct frontmatter reads?

### Verdict

`☑ validated` — after `PLAN-001` is folded into `TICK-001`'s `plan.md` and deleted,
`TICK-001.links` still contains `PLAN-001`, and both `get_item` and `get_links` re-expose it.

**Evidence.** The repo's own v1 fixture shape (`store.test.ts:616-679`), migrated for real:

```
foldedDocs         = [{"source":"PLAN-001","intoTicket":"TICK-001","doc":"plan"}]
convertedToTickets = [{"id":"RES-001","label":"legacy-research"}]
TICK-001.links  = ["PLAN-001"]   <-- PLAN-001 no longer exists
TICK-001.blocks = ["RES-001"]  (RES-001 survived as a converted ticket)
getItem("PLAN-001") = null
getLinkGraph(store,"TICK-001") = {"id":"TICK-001","links":["PLAN-001"],"backlinks":[],
                                  "blocks":["RES-001"],"blockedBy":[]}
>>> dangling "PLAN-001" surfaces via get_links.links : true
>>> dangling "PLAN-001" surfaces via get_item.links  : true
```

`blocks[]` is affected too, confirmed with a fixture that blocks the folded id — and that
half **does** self-heal for board purposes, while the raw array does not:

```
after migration: links=["PLAN-001"] blocks=["PLAN-001"]
computeBlockedIds → []   (dangling blocker filtered = self-heals)
after an unrelated updateItem: links=["PLAN-001"] (still dangling? true)
```

The last line answers whether normal use cleans it up: it does not. `updateItem` writes only
the patched fields, so the stale entry survives every subsequent edit indefinitely.

**Reasoning.** The fold loop (`migrate.ts:157-172`) writes the document and `fs.rm`s the
legacy source at `:171`, but never touches `links[]`/`blocks[]` on any surviving item.
`forwardLinks` (`links.ts:18-22`) returns `item.links ?? []` **unfiltered**, so
`buildLinkIndex` → `getLinkGraph` → MCP `get_links` propagate the ghost; `getItem`/`listItems`
return frontmatter verbatim, so it is visible even without `get_links`. Only `backlinks` and
`blockedBy` are naturally safe, because they are built by scanning live items outward rather
than trusting a stored array. `computeBlockedIds` is the one path that filters explicitly
(`links.ts:70-71`), which narrows the *behavioural* damage — as the open question suspected —
to `get_links`' raw field and direct frontmatter reads.

**Impact if not fixed.** Cosmetic-to-confusing, never data loss — the mildest of the nine, and
P2 is if anything generous. The folded content is safe (it is in `plan.md`); what is left is a
pointer to nothing. Concretely: an agent calling `get_links` sees
`{ id: "PLAN-001", title: null }` (`mcp-server/src/index.ts:360-364` resolves the title to
`null` rather than erroring) and may waste a turn trying to `get_item` a ticket that does not
exist; a human sees a chip in the Editor's links panel (`Editor.tsx:576-595`) that, when
clicked, sets `selectedId` to a nonexistent id and makes the editor pane silently unmount
(`App.tsx:381-384`, `:574`) — a dead end with nothing surfaced. Blast radius is limited to
boards that actually migrated *and* had linked plan/research items, i.e. one-time and
proportional to how much legacy structure existed. It never worsens and never self-heals. The
mismatch that makes it worth fixing is one of consistency, not severity: `deleteItem` makes
exactly this cleanup its documented guarantee
(`kanmer-workflow/references/tool-reference.md:38`, "Frontmatter `links[]` in other items
pointing at the deleted id are cleaned automatically"), so two operations that both remove an
id behave differently for no reason a user could infer.

**Fix sketch.** In `migrateToV2`, after the fold loop, sweep the surviving items once and
strip every folded id from `links[]` and `blocks[]` — **cover `blocks[]` as well as
`links[]`**, mirroring `deleteItem` (`store.ts:790-801`); the fixture only exercises `links`
but the asymmetry would be arbitrary, and `blocks` is what feeds the dependency graph.
`migrateToV2` already holds a `store` reference (`migrate.ts:61`), so the mechanical route is
a loop calling `store.updateItem(item.id, { links, blocks })`. **Keep the scope narrow and do
*not* extract a shared helper as part of this fix.** The trace is right that `deleteItem`'s
cleanup is a hand-rolled inline loop rather than the `buildLinkIndex` reuse
`phase-1-core-correctness/plan.md:27-29` called for, but refactoring `deleteItem` to share
code with migration means touching the most heavily exercised destructive path in the store
(`store.test.ts:290-304`) to fix a cosmetic migration issue — bad trade. Duplicate the
pattern, leave a comment pointing at `store.ts:790-801`, and file the extraction separately.
Follow `deleteItem`'s precedent on bodies too: leave `[[wiki]]` mentions alone as prose
(`types.ts:192`), optionally reporting them in `MigrationReport.notes` the way
`bodyReferencesRemain` does. One caveat to sequence around: these `updateItem` calls run over
items the move/fold loops just relocated, so this sweep must sit **after** those loops and
after any resumability changes from
[#9](#9--make-migration-resumable-after-partial-execution) — same function, adjacent loops.
Test by extending the existing round-trip (`store.test.ts:708-756`) with the assertion the
suite already makes for the sibling path at `:302`:
`expect((await v1store.getItem("TICK-001"))?.links).not.toContain("PLAN-001")`. `migrate.ts`
is absent from the plugin bundle, so this needs only a GUI rebuild, not `plugin:build`.

---

## 9 · Make migration resumable after partial execution

**`packages/core/src/migrate.ts:151-154`** · `migrateToV2()`, ticket-move loop

[▸ view comment](https://github.com/collisionengineers/kanmer/pull/2#discussion_r3771312555) ·
[▸ view code](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/packages/core/src/migrate.ts#L151-L154) ·
cites [AGENTS.md:165-169](https://github.com/collisionengineers/kanmer/blob/7706a2064a708c5b71a48f4195bc39c16978f445/AGENTS.md#L165-L169)

### Reported

> Handle already-moved tickets before renaming their legacy files so migration can resume
> after interruption.
>
> If the process fails after one iteration here but before `version.json` is written, the
> next run still detects format 1, discovers that ticket in the v2 layout, and attempts
> to rename its now-missing legacy file, failing with `ENOENT` on every retry despite
> migration being documented as idempotent.

### Code at that line

```ts
for (const t of tickets) {
  const dir = ticketDirIn(paths, ticketDest.get(t.id) === NO_AREA_DIR ? "" : t.area ?? "", t.id);
  await fs.mkdir(dir, { recursive: true });
  await fs.rename(legacyFile(t), path.join(dir, `${t.id}.md`));   // ← ENOENT on resume
}
```

### Affected surface

**Primary site** — `migrate.ts:151-155`, the ticket-move loop. For every ticket
(`migrate.ts:71`) it unconditionally `fs.mkdir`s the destination then
`fs.rename(legacyFile(t), …)` (`:154`) — with no check that the legacy file still exists.

**Ordering of side effects inside `migrateToV2` — why a partial run can't recover**

1. `migrate.ts:65` — `if ((await store.detectFormat()) === 2) return emptyReport(…)`. The
   **only** short-circuit, and it cannot see a half-migrated state.
2. `migrate.ts:69-72` — `getBoard()` / `listItems({includeArchived:true})`. These read
   through the **dual-layout scan** (`store.ts:299-398`), so a ticket already moved to
   `areas/…` on a prior run is found there (v2 branch, `:305-352`) and one not yet moved in
   legacy `tickets/` (v1 branch, `:354-386`) — both land in the same `tickets` array
   *indistinguishably*.
3. `migrate.ts:142-143` — `fs.mkdir(paths.areasRoot)` then `store.setBoard(board)` (pins
   area prefixes). A second side effect also unguarded for "already done".
4. `migrate.ts:151-155` — the primary site: `ENOENT` for any ticket a prior run renamed away.
5. `writeVersion` (`migrate.ts:214-218`) and `store.resetFormatCache()` (`:219`) run
   **last**, after all moves/folds/conversions. Any failure in 3–4 (or the fold loop, or the
   conversions loop `:174-186`) leaves `version.json` absent.

`detectFormat()` (`store.ts:111-127`) then reads no `version.json` and falls back to
`pathExists(this.paths.tickets)` (`store.ts:121`). Since `migrate.ts:190-200` removes the
legacy dirs only when `fs.rmdir` succeeds (i.e. empty), a partial run leaves them present →
format reads `1`, exactly as the bot describes.

`locateItem()` (`store.ts:400-421`) is what makes an already-moved ticket discoverable
despite that: it always scans v2 `areas/*` first (`:405-415`), then v1 type dirs
(`:416-419`) — format-transparent by design (`AGENTS.md:166-167`, *"reads scan BOTH
layouts"*).

**Call graph** — identical to [issue 8](#8--remove-folded-document-ids-from-structured-links):
GUI-only, one entry (`main/index.ts:453-455` ← `App.tsx:484`/`:694`), no MCP tool, no CLI.
On failure the modal handler (`App.tsx:691-703`) sets `error` (`:699`) but does **not** call
`setFormat(2)` or `refresh()`; `migrating` resets (`:701`) and the user can simply click
"Migrate now" again, re-entering the same loop from scratch.

**Shared state & invariants**

- **Directly coupled to [issue 2](#2--refresh-cached-storage-format-after-external-migration).**
  `formatCache` (`store.ts:83`) is cleared only by `resetFormatCache()` (`store.ts:129-132`),
  called only at `migrate.ts:219` — the end of a *successful* run. Two boundaries:
  - *Same process*: if `migrateToV2` throws after step 1 cached `1` but before step 5, the
    instance keeps `formatCache = 1` — which is **consistent with disk** (no `version.json`),
    so this half isn't itself broken; it just means every retry re-derives `1` and re-enters
    the hazard.
  - *Cross-process (the sharper coupling)*: the MCP server holds its own long-lived
    `KanmerStore` with its own cache; the GUI's `resetFormatCache()` cannot reach it. A
    server that cached `format: 1` keeps operating in v1 mode — `init()`'s v1 branch
    (`store.ts:143-146`) recreates flat `tickets/`/`plans/`/`research/`, and `createItem`'s
    v1 branch (`store.ts:441-457`, `:467`) allocates via the **type**-keyed counter scanning
    `paths.tickets` (`ids.ts:55-65`, `paths.ts:42-44`) — which, for a ticket already moved
    out of `tickets/`, would under-count and risk reissuing a number already in use. Stated
    as a mechanism, not as something reproduced.
- `version.json` (`version.ts:4-29`) is written once, atomically, at the very end — it can
  never be half-written; its **absence** is what makes a half-migrated board read as v1.
- Legacy dirs (`paths.ts:33-35`) and `paths.areasRoot` (`paths.ts:32`) coexist during and
  after an interrupted run — by design when a human leaves stray files, by accident when the
  process is killed mid-loop.
- `counters.json` re-keying (`migrate.ts:202-212`) runs near the end from whatever is on
  disk at that point, so it self-heals within a completed run; not itself the hazard.

**Bundled / generated copies** — `migrate.ts` is **absent from the plugin bundle** (no
`migrateToV2`/`foldedDocs`/`ticketMoves` matches), consistent with having no MCP surface.
`detectFormat`/`formatCache` **is** bundled (every store method the tools call goes through
the same class), so an issue-2 fix flows through `npm run plugin:build`; a `migrate.ts` fix
needs only a GUI rebuild.

**Tests & fixtures**

- `store.test.ts:616-679` — the v1 fixture (shared with issue 8).
- `store.test.ts:708-756` — *"migrates v1 to v2: dry run, real run, idempotent re-run"*
  covers (a) dry run changes nothing (`:709-721`), (b) a real run succeeds (`:724-753`),
  (c) re-running **after a successful** migration is a no-op via the `detectFormat()===2`
  early return (`:754-755`).
- **Gap:** no test constructs an interrupted/partial migration — mocking `fs.rename` to
  throw after the first ticket, or hand-assembling a half-migrated tree (one ticket under
  `areas/`, another under `tickets/`, no `version.json`) and re-running. The existing
  "idempotent re-run" test proves idempotency only for a *completed* run.
- No test exercises cross-process `formatCache` staleness either.

**Documentation** — "idempotent" is promised in three places, none distinguishing
*across full runs* from *resumable mid-run*:

- `AGENTS.md:57` — `migrate.ts  # v1 → v2 migration (dry-run + real, idempotent)`.
- `migrate.ts:58` (JSDoc) — *"Idempotent: running it on a format-2 board is a no-op."*
  Technically accurate and **narrower than the word implies** — it covers only the
  post-completion case.
- `docs/plans/kanmer-upgrades/phase-2-format-v2-storage/plan.md:71` — *"v1 fixture board →
  dry-run report correct → migrate → v2 layout asserted … re-run is a no-op"* — confirms the
  test's scope was intentionally full-run idempotency, not interruption.
- `docs/plans/kanmer-upgrades/upgrades-plan.md:85` — same framing.
- `AGENTS.md:165-169` (cited) describes the dual-read that makes a half-migrated ticket
  discoverable, but says nothing about interruption. `README.md:85-89` and
  `plugins/kanmer/skills/kanmer-setup/SKILL.md:59-72` describe migration with **no guidance
  for "the GUI crashed mid-migration, now what"** — the skill explicitly defers the run to
  the GUI (`SKILL.md:67-69`).

### Notes

- The PR describes migration as idempotent, and it is — but only for a *completed* run (the
  `detectFormat() === 2` early return). A run interrupted mid-loop is exactly the case that
  early return cannot see.
- **Design with [issue 2](#2--refresh-cached-storage-format-after-external-migration).** Both
  are facets of "the format marker can disagree with actual on-disk state": #2 via an
  in-memory cache never invalidated across processes, #9 via a file-existence heuristic that
  can't distinguish "never migrated" from "migration interrupted". A #2 fix that makes
  `detectFormat()` always re-read `version.json` does **not** fix #9, whose failure mode is
  that `version.json` was never written.
- All three loops (moves `:151-155`, folds `:157-172`, conversions `:174-186`) share the
  same unconditional-write shape, and
  [issue 1](#1--reject-duplicate-legacy-type-prefixes)'s overwrite scenario lands in the
  same sequence (`migrate.ts:184`). A resumability fix should cover all three consistently.
- UX echo, noted for completeness: the failed-migration handler (`App.tsx:691-703`) doesn't
  distinguish "nothing happened" from "partially happened", so the user isn't warned the
  board may now be mixed v1/v2.

### Open questions

- Make each loop individually resumable (check-before-act per ticket/doc/orphan), or make
  the whole function transactional (stage and commit, or write a partial-progress marker
  before `version.json`)? Very different shapes, and they interact differently with issues
  1 and 8 touching the same loops.
- Does `detectFormat()`'s v1 fallback (`store.ts:121`) need to change at all, or is the fix
  entirely local to `migrateToV2` tolerating "already in v2 location"? The bot frames
  "still detects format 1" as a symptom, not necessarily the thing to change.
- Is cross-process interruption in scope, or strictly the single-process "GUI crashed, user
  retries" case? Migration has one entry point, but the consequences are visible to a
  running MCP server regardless.

### Verdict

`☑ validated` — an interrupted migration traps the board: `ENOENT` on every retry, forever.
Two findings beyond the filed claim — the trap is entered by a failure in *any* of the three
loops, and the obvious user workaround **silently destroys the un-migrated tickets**.

**Evidence.** A hand-assembled half-migrated tree — `TICK-001` under `areas/api/`, `TICK-002`
still in `tickets/`, no `version.json` — exactly what a crash between two `fs.rename` calls
leaves:

```
version.json present? false
detectFormat() = 1
listItems() sees: TICK-001, TICK-002  (dual-layout scan, indistinguishable)
retry #1: THREW ENOENT — ENOENT: no such file or directory, rename
          '…\.kanmer\tickets\TICK-001.md' -> '…\.kanmer\areas\api\TICK-001\TICK-001.md'
retry #2: THREW ENOENT — (identical)
retry #3: THREW ENOENT — (identical)
items after retries: TICK-001, TICK-002
version.json present now? false
```

Every element of the bot's claim holds: format still reads 1, the already-moved ticket is
rediscovered in the v2 layout, and the rename of its now-missing legacy file fails on every
attempt. The dry run the GUI shows first makes it worse — it reports work it cannot do:

```
dry run reports ticketMoves = [{"id":"TICK-001",…},{"id":"TICK-002",…}]  (claims it will move BOTH)
real run: THREW ENOENT
```

*Finding 1 — the trap is not specific to the move loop.* Reconstructing the state a **fold**
loop failure leaves (all tickets moved, legacy plan still present, no `version.json`):

```
reconstructed post-fold-failure state: detectFormat() = 1
retry → THREW ENOENT — …rename '…\tickets\TICK-001.md' -> …
>>> a failure in the FOLD loop (after the move loop) traps the board identically: true
```

So **any** error after the first successful rename — in the move loop, the fold loop
(`:157-172`) or the conversion loop (`:174-186`) — lands in the same trap. On Windows that
matters: `fs.rename` returning `EPERM`/`EBUSY` under Defender or OneDrive is an ordinary
occurrence, not just a crash scenario.

*Finding 2 — the obvious workaround is destructive.* A user told "still detects format 1"
naturally deletes the leftover legacy directories to make the board look migrated:

```
after deleting legacy dirs: detectFormat() = 2
migrateToV2 → alreadyV2=true (early return; nothing done)
version.json written? false
items now: TICK-001
>>> TICK-002 SILENTLY LOST by the obvious workaround: true
```

`detectFormat()` falls back to `pathExists(paths.tickets)` (`store.ts:121`), so removing the
directory flips the answer to 2, `migrateToV2` early-returns `alreadyV2` (`migrate.ts:65`),
and the un-migrated tickets inside are gone with no error. `version.json` is *still* never
written, so the board remains in a state whose format is inferred rather than declared.

**Reasoning.** The ordering of side effects is the whole story. `writeVersion` and
`resetFormatCache` run **last** (`migrate.ts:214-219`), after all three loops, so any earlier
failure leaves `version.json` absent. `detectFormat()` then reads no version file and falls
back to the legacy-directory heuristic, which a partial run leaves in place (the dirs are
removed only when `fs.rmdir` succeeds, i.e. when empty — `migrate.ts:190-200`). Meanwhile
`listItems` scans both layouts (`store.ts:299-398`) and `locateItem` checks `areas/*` first
(`:400-421`), so an already-moved ticket is found and re-planned for a move it has already
had. The `detectFormat() === 2` early return is the only idempotency mechanism and it is
structurally incapable of seeing a half-migrated board. The JSDoc claim at `migrate.ts:58`
("Idempotent: running it on a format-2 board is a no-op") is literally true and materially
narrower than `AGENTS.md:57`'s bare "idempotent".

**Impact if not fixed.** The worst *recovery* story of the nine. A user whose migration is
interrupted — crash, kill, power loss, or a single `EPERM` from antivirus mid-rename — has a
board that cannot be migrated by any action available in the product: "Migrate now" fails
identically every time (`App.tsx:691-703` just sets `error` and re-arms the button), there is
no MCP tool to try instead (migration is GUI-only, `main/index.ts:453-455`), and the error
text is a raw `ENOENT` naming a path that genuinely does not exist, which tells the user
nothing actionable. The board keeps working in the meantime — reads scan both layouts — so
this is not immediate data loss; it is a permanent, unexplained inability to complete an
upgrade the app keeps prompting for. It becomes data loss the moment the user tries the one
workaround the error suggests. Compounding: while stuck, the legacy directories persist, which
keeps every fresh `KanmerStore` detecting format 1 and re-arms
[#2](#2--refresh-cached-storage-format-after-external-migration)'s hazards; and `AGENTS.md`,
`README.md:85-89` and `kanmer-setup/SKILL.md:59-72` between them offer no guidance for "the
GUI crashed mid-migration, now what".

**Fix sketch.** Make each loop **check-before-act**, and cover all three consistently — the
evidence shows a fold-loop or conversion-loop failure traps the board just as thoroughly, so
a fix scoped to `migrate.ts:151-155` would leave two live paths in. Concretely: in the move
loop, skip the rename when the destination already holds the ticket (and only error if
*neither* source nor destination exists); in the fold loop, treat an absent legacy source as
already-folded rather than relying on `fs.rm`'s `force: true` to paper over it; in the
conversion loop, skip when the destination exists and already carries the label. Prefer this
to a transactional/staging design: staging a whole `.kanmer` tree doubles the failure surface
and contradicts the store's deliberate no-lockfile, crash-safe-by-construction posture
(`AGENTS.md:348-354`). **Design together with
[#2](#2--refresh-cached-storage-format-after-external-migration)**, which shares the
"format marker disagrees with disk" surface from the opposite direction: a #2 fix that always
re-reads `version.json` does *not* help here, because the file was never written. Leave
`detectFormat()`'s v1 fallback alone — "legacy dir present" is a reasonable heuristic and the
bot frames its answer as a symptom, not the thing to change; the fix belongs in `migrateToV2`
tolerating "already in v2 location". Two things worth adding beyond the mechanical fix, both
cheap: a `MigrationReport.notes` entry when a resume skips already-done work, so the user
learns the run was a resume; and a distinct error in `App.tsx:691-703` for "partially
migrated" so the user is warned the board is mixed and is *not* told to delete anything. The
sequencing note from [#1](#1--reject-duplicate-legacy-type-prefixes) applies — the
overwrite-on-collision guard lands in the same conversion loop (`migrate.ts:184`), and both
should be written as one pass over `migrate.ts:151-186` alongside
[#8](#8--remove-folded-document-ids-from-structured-links)'s link sweep. Test the gap: the
existing round-trip (`store.test.ts:708-756`) proves idempotency only for a *completed* run —
add a case that hand-assembles the half-migrated tree above and asserts the re-run completes
and stamps `version.json`. `migrate.ts` is absent from the plugin bundle, so a GUI rebuild
suffices.

---
---

# Appendix

## A · Review-summary body (verbatim)

The single submitted review
([id 4922206958](https://github.com/collisionengineers/kanmer/pull/2#pullrequestreview-4922206958),
`COMMENTED`, 2026-08-13T00:09:19Z) carried only boilerplate — no findings:

> ### 💡 Codex Review
>
> Here are some automated review suggestions for this pull request.
>
> **Reviewed commit:** `7706a2064a`
>
> <details><summary>ℹ️ About Codex in GitHub</summary>
> Your team has set up Codex to review pull requests in this repo. Reviews are triggered
> when you open a pull request for review, mark a draft as ready, or comment
> "@codex review". If Codex has suggestions, it will comment; otherwise it will react
> with 👍. Codex can also answer questions or update the PR. Try commenting
> "@codex address that feedback".
> </details>

## B · How this was fetched

```sh
gh api repos/collisionengineers/kanmer/pulls/2/reviews   --paginate   # 1 review (boilerplate)
gh api repos/collisionengineers/kanmer/pulls/2/comments  --paginate   # 9 inline comments
gh api repos/collisionengineers/kanmer/issues/2/comments --paginate   # 0 issue comments
```

Code excerpts are the anchored line ranges read from commit `7706a2064a` — the exact
revision the bot reviewed, which is also the current branch head, so the line numbers
above are still live.
