# PR #1 review comments

**PR:** [collisionengineers/kanmer#1 — Collapse phase/status into one stage dimension; add cross-agent plugin](https://github.com/collisionengineers/kanmer/pull/1)
**Branch:** `board-stages-and-plugin` → `main`
**Fetched:** 2026-08-12 · **Investigated:** 2026-08-12

All review feedback so far comes from the Codex bot, submitted in two review passes
(commits `2e2f7c4e07` and `98d9ec72ac`). Ten distinct inline comments; no duplicates
were found among them. Two review-summary bodies were dropped as boilerplate — they
contain no findings, only the "💡 Codex Review" wrapper repeated once per pass. There
are no top-level (issue) comments on the PR.

Priorities are the bot's own: **P1** = blocking/install-breaking, **P2** = correctness
or accuracy of guidance. Verdicts below are ours.

## Verdicts at a glance

| # | Priority | Verdict | Issue |
|---|---|---|---|
| 1 | P1 | **Validated** | `mcpServers` path is not a plugin-root `.mcp.json` |
| 2 | P1 → **P3** | **Refuted as filed** | `interface` metadata is optional, not install-blocking |
| 3 | P2 | **Validated** | Standup buckets hard-code stage ids |
| 4 | P2 | **Validated** | Workflow hard-codes stage ids; `move_item` never validates |
| 5 | P2 | **Validated** | Archived-only board reads as never-used |
| 6 | P2 | **Validated** | `add_column` cannot replace default stages |
| 7 | P2 | **Validated** | Plan/ticket links are written in both directions |
| 8 | P2 → **P1** | **Validated (worse than filed)** | Server initialises *any* workspace on startup |
| 9 | P2 | **Validated** | `update_item` silently drops `type` |
| 10 | P2 | **Validated** | `list_items` summary omits three fields |

Nine of ten stand. One (#2) is refuted. Two severities move: #8 up (it fires on both
hosts, not just Codex, and needs no user action), #2 down.

## How this was verified

Findings #4–#10 were reproduced against the **committed plugin bundle**
(`plugins/kanmer/mcp/kanmer-mcp.cjs`) — the exact artifact an install runs — driven over
stdio with no `--root` and `cwd` set to an empty throwaway directory, i.e. precisely how
`mcp/codex.mcp.json` launches it. All seven reproduced. Raw probe output is quoted under
each finding.

Finding #3 is an instruction-correctness issue with no runtime component; it was
verified by reading the skill against the pre-PR default board (`git show
fed2a9f:packages/core/src/board.ts`).

Findings #1 and #2 depend on Codex's plugin ingestion schema, which is not in this repo;
they were checked against the published Codex plugin documentation (linked in place).

**One fact underpins #3 and #4.** The pre-PR `defaultBoardConfig()` shipped
`todo / in-progress / review / done`. Every board created before this PR therefore has
`in-progress` and has *none* of `planning`, `implementing`, `verifying`. The reviewer's
"for example, a board retaining `in-progress`" is not a hypothetical — it is the old
default, so these two findings hit every existing board rather than an exotic
customised one.

---

## P1 — blocks Codex marketplace install

### 1. Point `mcpServers` at a supported Codex companion file

- **File:** `plugins/kanmer/.codex-plugin/plugin.json:14`
- **Link:** [discussion_r3766904204](https://github.com/collisionengineers/kanmer/pull/1#discussion_r3766904204)

> When users install this through the Codex marketplace, plugin ingestion accepts an
> inline server object or a string resolving to the plugin-root `.mcp.json`; this nested
> custom path fails validation with `mcpServers must resolve to .mcp.json`, followed by a
> missing-companion error. As a result, the advertised Codex plugin cannot be installed
> and its bundled server is never registered; move the configuration to the canonical
> companion file with the expected wrapper or inline the server definition.

**Verdict: VALIDATED** (structure), with one caveat noted below.

**Root cause.** `plugins/kanmer/.codex-plugin/plugin.json:14` sets
`"mcpServers": "./mcp/codex.mcp.json"`. Codex's manifest schema treats `mcpServers` as a
pointer to a `.mcp.json` **at the plugin root**, not an arbitrary relative path. Two
independent sources agree that only `plugin.json` belongs inside `.codex-plugin/`, while
`skills/`, `hooks/`, `.mcp.json` and `.app.json` sit at the plugin root:
[Package your plugin](https://developers.openai.com/plugins/build/plugins) —
"`mcpServers` – Path to `.mcp.json` file at plugin root"; and the
[Codex CLI plugin system writeup](https://codex.danielvaughan.com/2026/03/30/codex-cli-plugin-system/) —
"It does not support arbitrary relative paths — the configuration must resolve to a
dedicated `.mcp.json` manifest file."

This was a deliberate choice, not an oversight: the plan doc records "ship two tiny MCP
configs, each manifest pointing at its own (no shared `.mcp.json` at plugin root)". That
decision is the defect — it holds for Claude Code, which does accept a custom relative
path (`.claude-plugin/plugin.json:14` → `./mcp/claude.mcp.json` is fine), but not for
Codex.

**Caveat.** The exact error string `mcpServers must resolve to .mcp.json` could not be
confirmed against Codex source; the docs describe the constraint but quote no message.
The structural requirement is well-attested, the wording is not. This does not change
the fix.

**Wrapper shape.** Use the `{"mcpServers": {…}}` wrapper, not a bare server map — the
docs' bare-map example is a known docs bug
([openai/codex#22105](https://github.com/openai/codex/issues/22105): "plugin `.mcp.json`
example uses `mcp_servers` but Codex expects `mcpServers`").

**Files to change**

| File | Change |
|---|---|
| `plugins/kanmer/.mcp.json` | **new** — the Codex companion at plugin root |
| `plugins/kanmer/mcp/codex.mcp.json` | **delete** — superseded |
| `plugins/kanmer/.codex-plugin/plugin.json:14` | repoint `mcpServers` |
| `AGENTS.md:71,74` | layout tree still names `mcp/codex.mcp.json` |
| `docs/plans/to-do/120826-skill-and-status-removal-plan.md:167,239,275` | records the now-reversed "no shared `.mcp.json` at plugin root" decision |

**Steps**

1. Create `plugins/kanmer/.mcp.json`:
   ```json
   {
     "mcpServers": {
       "kanmer": {
         "command": "node",
         "args": ["${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"]
       }
     }
   }
   ```
   `${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs` stays correct — only the *config* file moves to
   the plugin root; the server bundle keeps living in `mcp/`.
2. In `plugins/kanmer/.codex-plugin/plugin.json:14`, change
   `"mcpServers": "./mcp/codex.mcp.json",` → `"mcpServers": "./.mcp.json",`.
3. Delete `plugins/kanmer/mcp/codex.mcp.json`.
4. Leave `plugins/kanmer/mcp/claude.mcp.json` and `.claude-plugin/plugin.json` alone.
   The two hosts expand different variables (`${CLAUDE_PLUGIN_ROOT}` vs `${PLUGIN_ROOT}`),
   so a single shared file cannot serve both — two files remains correct.
5. Update the `AGENTS.md` §2 tree: `.codex-plugin/plugin.json  # codex manifest → ../.mcp.json`,
   drop the `codex.mcp.json` line from under `mcp/`, and add `.mcp.json` at the plugin
   root with the comment `# codex companion ({"mcpServers":…} + ${PLUGIN_ROOT})`.
6. Verify end-to-end — this is the only real check, since the schema is external:
   `codex plugin marketplace add collisionengineers/kanmer`, install `kanmer`, then
   confirm the `kanmer` tools appear in the Codex session. Also confirm `${PLUGIN_ROOT}`
   is the variable Codex actually expands; if the server fails to spawn, that is the
   next suspect, not the file location.

### 2. Supply the required Codex interface metadata

- **File:** `plugins/kanmer/.codex-plugin/plugin.json:15-19`
- **Link:** [discussion_r3766904209](https://github.com/collisionengineers/kanmer/pull/1#discussion_r3766904209)

> For a Codex marketplace installation, the ingestion schema requires
> `interface.longDescription`, a non-empty `interface.capabilities` array, and
> `interface.defaultPrompt` (or `default_prompt`). This block omits all three, so
> validation rejects the new plugin before any skills or MCP tools can load.

**Verdict: REFUTED as filed.** The premise — that these three fields are required and
their absence fails validation — is not supported by the Codex plugin documentation.
Both sources describe the whole `interface` block as optional presentation metadata:
[Package your plugin](https://developers.openai.com/plugins/build/plugins) lists
`longDescription`, `capabilities` and `defaultPrompt` under "optional but commonly
included", and the
[plugin system reference](https://codex.danielvaughan.com/2026/03/30/codex-cli-plugin-system/)
states plainly that of the `interface` fields "**None are strictly required**", and that
Codex "will not complain about missing optional keys". The required set is `name`,
`version`, `description`, plus at least one component pointer (`skills`, `mcpServers`
or `apps`) — all four of which this manifest has.

The reviewer likely conflated the **directory submission form** (which does collect
starter prompts, capabilities and long copy from the publisher) with **manifest
validation at install time**. Those are different gates. Nothing here blocks install.

**Residual value (P3, optional).** Filling these in improves the marketplace listing —
`longDescription` and `defaultPrompt` are what a browsing user reads and clicks. Worth
doing before publishing, not before merging. If you take it: edit
`plugins/kanmer/.codex-plugin/plugin.json` only, adding `longDescription` (a paragraph),
`capabilities: ["Read", "Write"]`, and `defaultPrompt` (an array of starter prompts such
as "Set up Kanmer in this project" / "Give me a standup from the board"). Do not gate
the merge on it.

---

## P2 — hard-coded stage IDs vs. configured boards

### 3. Report configured stages instead of hard-coded IDs

- **File:** `plugins/kanmer/skills/kanmer-standup/SKILL.md:38-39` *(outdated — anchored to commit `2e2f7c4e07`)*
- **Link:** [discussion_r3766828943](https://github.com/collisionengineers/kanmer/pull/1#discussion_r3766828943)
- **Ref:** [AGENTS.md:L163-L167](https://github.com/collisionengineers/kanmer/blob/2e2f7c4e07a06fe262b9df01080bc9e3e4c3e9c3/AGENTS.md#L163-L167)

> On upgraded or customized boards, these buckets silently omit work because the skill
> hard-codes the new default IDs. For example, an existing board retaining `in-progress`
> will not include those items under **In flight**, even though `list_board` returned that
> configured stage. Build the report from the configured status list, with explicit
> handling for legacy/custom IDs, rather than assuming every board uses the six defaults.

**Verdict: VALIDATED.** Live line range is now `kanmer-standup/SKILL.md:42-57`.

**Root cause.** Step 1 of the skill tells the agent to call `list_board` — but only "for
the stage and area names, so you can report human-readable names". The report skeleton
that follows then names stage ids literally and never consults that list again:

- `SKILL.md:42` — "**In flight** — tickets in planning, implementing or verifying"
- `SKILL.md:47` — "**In review** — tickets in review"
- `SKILL.md:50` — "**Up next** — the tickets at the top of the todo column"
- `SKILL.md:53` — "**Recently done** — done items"

So the buckets are a closed set matching `defaultBoardConfig()`
(`packages/core/src/board.ts:12-19`) exactly. A ticket whose status is outside that set
belongs to no section, and since the skill also instructs omitting empty sections, it
vanishes with no trace in the report.

**Why this is not an edge case.** The pre-PR default board was
`todo / in-progress / review / done` (`git show fed2a9f:packages/core/src/board.ts`).
On any board created before this PR, everything actively being worked sits in
`in-progress` — which matches no bucket. The standup then reports "In review", "Up next"
and "Recently done" correctly while silently dropping *all* work in flight. AGENTS.md:163-167
explicitly promises those boards keep working without migration, so this is a broken
promise, not an unsupported configuration.

**Files to change**

| File | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-standup/SKILL.md:29-59` | derive buckets from `list_board`, add unknown-stage flag |

**Steps**

1. Rewrite the "Report format" preamble (`SKILL.md:31-38`) to state the mapping rule
   before the skeleton, in terms of positions in `board.statuses` rather than ids:
   - the **first** stage → **Up next**;
   - the **last** stage → **Recently done**;
   - a stage whose id or name reads as review/approval → **In review**;
   - **every remaining stage** → **In flight**;
   - a stage the board defines but that has no tickets contributes nothing (the
     omit-empty-sections rule already covers it).
2. Replace the literal id lists in the four section headings (`SKILL.md:42`, `:47`,
   `:50`, `:53`) with the role wording — e.g. "**In flight** — tickets in the working
   stages: everything between the first stage and the final stage, except the review
   stage, which has its own section below." Keep printing the configured `name`.
3. Add a rule for statuses that are on items but not on the board: these are the
   fallback columns the GUI renders via `mergeColumns`
   (`apps/gui/src/renderer/src/components/Board.tsx:16-20`). List them under **Flags**
   as "off-board stage" so the human sees the drift instead of losing the ticket. This
   also surfaces the misfiling caused by finding #4.
4. Add one sentence to the "Gather" step (`SKILL.md:14-15`): the stage list from
   `list_board` defines *which sections exist*, not just their display names — never
   assume the six defaults.
5. Verify against a legacy board: create a scratch project whose `board.yml` has the old
   `todo / in-progress / review / done` statuses, put a ticket in `in-progress`, run the
   standup skill, and confirm the ticket appears under **In flight**.

### 4. Move through stages returned by `list_board`

- **File:** `plugins/kanmer/skills/kanmer-workflow/SKILL.md:31-34`
- **Link:** [discussion_r3766828968](https://github.com/collisionengineers/kanmer/pull/1#discussion_r3766828968)
- **Ref:** [AGENTS.md:L163-L167](https://github.com/collisionengineers/kanmer/blob/2e2f7c4e07a06fe262b9df01080bc9e3e4c3e9c3/AGENTS.md#L163-L167)

> On legacy or customized boards, these hard-coded transition IDs can be absent even
> though the skill already fetched the valid statuses. Because `move_item` does not
> validate the target against `board.statuses`, following this loop writes values such as
> `planning` or `verifying` anyway, creating unexpected fallback columns and misfiling the
> ticket. Select the corresponding configured IDs from `list_board`, and ask when their
> meaning is ambiguous.

**Verdict: VALIDATED**, including the stated consequence. Reproduced:

```
board statuses = [todo, planning, implementing, review, verifying, done]
move_item(TICK-001, "in-progress") -> isError=false, stored status="in-progress"
```

**Root cause — two layers, and both need fixing.**

*Instruction layer.* `plugins/kanmer/skills/kanmer-workflow/SKILL.md:31-36` names the six
default ids as the transitions to call, and `:20` presents them as "Default stages"
without saying what to do when the board's stages differ. An agent that reads `list_board`
and then follows step 3 literally writes ids the board never defined.

*Enforcement layer.* Nothing rejects the write. `move_item`
(`packages/mcp-server/src/index.ts:199-212`) passes `status` straight to
`store.moveItem`, which is a one-line delegate to `updateItem`
(`packages/core/src/store.ts:149-151`), which merges the patch and writes
(`store.ts:135-146`). `status` is a bare `z.string()` in the tool schema
(`index.ts:207`) and a bare `z.string()` in the frontmatter schema
(`packages/core/src/types.ts:75`). No layer consults `board.statuses`. The same hole
exists on `create_item.status` and `update_item.status`.

The consequence the reviewer describes is exact: the GUI's `mergeColumns`
(`Board.tsx:16-20`) appends any unrecognised status as an extra column named after its
raw id, so a mistyped or defaulted stage silently grows a new column on the human's
board rather than erroring.

**Files to change**

| File | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-workflow/SKILL.md:18-23, 31-36` | stage transitions as roles, resolved against `list_board` |
| `packages/mcp-server/src/index.ts` | validate `status` in `move_item`, `create_item`, `update_item` |
| `packages/core/src/store.ts` | (alternative placement) validate in `moveItem`/`updateItem` |
| `packages/core/src/store.test.ts` | cover reject-unknown-status and accept-configured-status |
| `packages/mcp-server/src/smoke.mjs` | stdio check that a bogus status is rejected |
| `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:22` | document that `move_item` rejects unconfigured ids |
| `AGENTS.md:307` | limitation entry now applies only to *deleted* columns, not to new writes |

**Steps**

1. In `SKILL.md:31-36`, restate step 3 in terms of roles rather than ids: "move to the
   stage that matches what you are doing — designing, implementing, awaiting the user's
   eyes, verifying, finished — choosing the id from the `list_board` list you fetched in
   step 1. The six defaults below are what a fresh board has; older boards commonly have
   `in-progress` instead of `planning`/`implementing`. If no configured stage clearly
   matches, ask rather than inventing one."
2. In `SKILL.md:18-23`, relabel "Default stages:" as "Default stages **on a fresh
   board**:" so the list is not read as a guarantee.
3. In `packages/mcp-server/src/index.ts`, add a helper next to `summarise()`:
   ```ts
   /** Reject a status that the board does not define — a silent misfile otherwise. */
   async function assertStatus(status: string | undefined) {
     if (status === undefined) return;
     const { statuses } = await store.getBoard();
     if (!statuses.some((s) => s.id === status)) {
       throw new Error(
         `Unknown status "${status}". Valid stages: ${statuses.map((s) => s.id).join(", ")}`,
       );
     }
   }
   ```
   Call it at the top of the `move_item`, `create_item` and `update_item` handlers. The
   existing `guard()` wrapper turns the throw into an `isError` result naming the valid
   ids, which is what lets the agent self-correct.
4. Keep validation on the **write** path only. Reads must stay permissive so legacy
   files still load and `mergeColumns` still renders them — that fallback is deliberate
   (AGENTS.md:166-167).
5. Add a `store.test.ts` case: build a board with `todo/done`, assert
   `moveItem(id, {status: "planning"})` rejects and `moveItem(id, {status: "done"})`
   succeeds.
6. Add a `smoke.mjs` check mirroring the probe above: `move_item` to `"in-progress"` on
   a default board must come back `isError: true`.
7. Update `tool-reference.md:22` — `move_item` row gains "rejects a status that is not
   on the board; call `list_board` for valid ids".
8. Run `npm test`, `node packages/mcp-server/src/smoke.mjs`, then
   `npm run plugin:build && npm run plugin:check` — the bundled `kanmer-mcp.cjs` is a
   committed artifact (AGENTS.md gotcha 8) and installs run it, so skipping the rebuild
   ships the unvalidated server.

---

## P2 — onboarding skill

### 5. Include archived items when detecting prior use

- **File:** `plugins/kanmer/skills/kanmer-onboard/SKILL.md:14-18`
- **Link:** [discussion_r3766828953](https://github.com/collisionengineers/kanmer/pull/1#discussion_r3766828953)
- **Ref:** [AGENTS.md:L181-L184](https://github.com/collisionengineers/kanmer/blob/2e2f7c4e07a06fe262b9df01080bc9e3e4c3e9c3/AGENTS.md#L181-L184)

> When an established project currently has only archived items, the default `list_items`
> call returns an empty list, so this skill incorrectly treats the board as unused and
> seeds a new backlog on top of its existing history. Call `list_items` with
> `include_archived: true` for this freshness check, then switch to the normal workflow if
> either active or archived items exist.

**Verdict: VALIDATED.** Reproduced — after archiving the only ticket:

```
list_items()                        -> 0 items
list_items(include_archived:true)   -> 1 items
```

**Root cause.** `matchesFilter` drops archived items unless asked
(`packages/core/src/store.ts:181`: `if (!filter.includeArchived && item.archived) return false;`),
and `kanmer-onboard/SKILL.md:14-18` uses a bare `list_items` as its sole
has-this-project-been-used-before signal. A finished project whose board has been tidied
— every item archived rather than deleted — is indistinguishable from a virgin one.

**The deeper cause is #8.** The skill explains *why* it must use `list_items`: "The
server creates `.kanmer/` on first contact, so `list_board` succeeding tells you nothing".
That is only true because the server initialises unconditionally at startup. Fix #8 and
the presence of `.kanmer/` becomes a truthful signal again, at which point this check
gets simpler and stronger. Fix both; sequence #8 first if you are doing them together.

**Files to change**

| File | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-onboard/SKILL.md:14-18` | pass `include_archived: true`; restate the rationale once #8 lands |

**Steps**

1. Rewrite step 1 to: "**Check state.** Call `list_items` with `include_archived: true`.
   If it returns *anything* — active or archived — this project has been used before:
   stop and switch to the `kanmer-workflow` skill rather than seeding on top of real
   history. An archived-only board is a finished project, not a fresh one."
2. Keep the `list_board` call, but for its actual purpose — reading existing stages,
   areas and priorities before proposing changes — not as a freshness probe.
3. After #8 lands, replace the "the server creates `.kanmer/` on first contact"
   sentence: the folder's existence is then a real signal, and `list_items` returning
   an error or empty on a project with no `.kanmer/` is the fresh-onboard case.
4. Verify: create a project, add a ticket, archive it, then invoke the onboarding skill
   and confirm it declines to seed.

### 6. Avoid applying replacement stages with `add_column`

- **File:** `plugins/kanmer/skills/kanmer-onboard/SKILL.md:29-30`
- **Link:** [discussion_r3766828960](https://github.com/collisionengineers/kanmer/pull/1#discussion_r3766828960)

> When the user agrees that the default stages do not fit, following this instruction
> cannot produce the agreed board: `add_column` only appends a status and rejects
> duplicate IDs, so all six defaults remain alongside the proposed replacement stages.
> Either expose a whole-board/reorder/remove operation to the plugin or tell the user to
> replace stages through the GUI Settings editor instead of issuing one `add_column` call
> per agreed stage.

**Verdict: VALIDATED.** Reproduced:

```
add_column(todo)    -> Error: status "todo" already exists
add_column(triage)  -> appended
statuses now = [todo, planning, implementing, review, verifying, done, triage]
```

**Root cause.** `KanmerStore.addColumn` (`packages/core/src/store.ts:61-70`) is
append-only: it throws on a duplicate id and otherwise pushes onto the end of the array.
There is no remove, no reorder, and no rename. The whole-board replacement primitive
*does* exist — `store.setBoard` (`store.ts:56-58`) — but the MCP server registers no tool
that reaches it (`packages/mcp-server/src/index.ts` exposes `add_column` and nothing
else board-shaped), while the GUI does use it (`apps/gui/src/main/index.ts:92-95`,
driven by `Settings.tsx`). So the capability the skill assumes is real but is
human-surface-only.

The failure is worse than "does nothing": step 3 tells the agent to propose replacement
stages *and get user agreement first*. The agent secures a yes, issues the calls, gets
partial errors and a board with six defaults plus the new stages appended, and has
already told the user the board would be replaced.

**Files to change** — pick A now; B is a follow-up, not a merge blocker.

*Option A — align the instruction with the tools (recommended):*

| File | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-onboard/SKILL.md:26-30` | `add_column` for areas only; route stage changes to GUI Settings |
| `plugins/kanmer/skills/kanmer-workflow/SKILL.md:70-71` | same caveat where `add_column` is mentioned |
| `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:24` | note `add_column` is append-only and cannot remove/reorder/rename |

*Option B — add the missing capability:*

| File | Change |
|---|---|
| `packages/mcp-server/src/index.ts` | register `set_board` (or `remove_column` + `reorder_columns`) |
| `packages/core/src/store.ts` | back it — `setBoard` exists; add `removeColumn` if going granular |
| `packages/core/src/store.test.ts` | cover replacement and the strand-items case |
| `packages/mcp-server/src/smoke.mjs` | stdio check |
| `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md` | document the new tool |
| `AGENTS.md:204-206, 279` | tool list (currently "11 tools") and the add-a-tool recipe |
| `plugins/kanmer/skills/kanmer-onboard/SKILL.md` | then re-allow agent-applied stage replacement |

**Steps (Option A)**

1. Replace `SKILL.md:29-30` ("Apply the agreed set with one `add_column` call per column
   (`kind: "area"` / `"status"`)") with a split instruction:
   - **Areas** — apply directly, one `add_column` call each with `kind: "area"`.
   - **Stages** — say plainly that you cannot apply these: `add_column` only appends and
     cannot remove or reorder, so issuing it per stage would leave the defaults in place
     alongside the new ones. Ask the user to edit stages in the Kanmer app's Settings
     editor (the only surface with whole-board save), and list the exact stage set they
     agreed so they can copy it.
2. Amend `SKILL.md:26-28` so the "Stages only if the defaults genuinely don't fit"
   sentence carries the cost: changing stages is a manual GUI step, so bias harder
   toward keeping the defaults.
3. Add to `tool-reference.md:24`, on the `add_column` row: "Append-only. Rejects an id
   that already exists; cannot remove, rename or reorder — whole-board edits happen in
   the GUI Settings editor."
4. Mirror the caveat at `kanmer-workflow/SKILL.md:70-71`, which already warns that
   `add_column` changes the board for everyone.
5. Verify: run the onboarding skill against a project and confirm it proposes stages but
   routes their application to the GUI, applying only areas itself.

**If you take Option B**, note the known hazard first: deleting an in-use column does not
rewrite referencing items (AGENTS.md:307) — they fall back to an auto column. A
`set_board` tool must therefore either refuse to drop a stage that still has items, or
report exactly which items would be stranded and require confirmation. That interacts
directly with #4's validation: tightening writes while allowing stage removal would
otherwise let the board reach a state where existing items hold now-invalid statuses.

---

## P2 — links and MCP server activation

### 7. Avoid creating reciprocal plan-ticket links

- **File:** `plugins/kanmer/skills/kanmer-workflow/SKILL.md:39-41`
- **Link:** [discussion_r3766828979](https://github.com/collisionengineers/kanmer/pull/1#discussion_r3766828979)
- **Ref:** [AGENTS.md:L189](https://github.com/collisionengineers/kanmer/blob/2e2f7c4e07a06fe262b9df01080bc9e3e4c3e9c3/AGENTS.md#L189-L189)

> The plan template already places `[[TICK-*]]` references in the plan body, so
> additionally linking every ticket back to the plan creates both directions of the same
> relationship. `get_links` will consequently show each ticket as both a forward link and
> a backlink on the plan, contradicting the later "link once" rule and making the graph
> misleading. Keep one direction — either the plan's wiki-links or the tickets' structured
> links — not both.

**Verdict: VALIDATED.** Reproduced by following the skill and template literally:

```
get_links(PLAN-001) -> links=[TICK-002] backlinks=[TICK-002]
```

**Root cause.** The instruction to double-link is spread across **three** files, not the
one the comment cites — fixing only `SKILL.md` leaves the behaviour intact:

1. `SKILL.md:39-41` (step 4) — "Give each ticket `links: ["PLAN-00X"]` once the plan
   exists, or link it later with `link_items`."
2. `assets/plan-template.md:20-24` — the Tickets table holds `[[TICK-00A]]` wiki-links
   *and* the parenthetical instructs "link each ticket back to this plan with
   `link_items`". The template contradicts itself in four lines.
3. `assets/ticket-template.md:15` — "Link context inline: see [[PLAN-001]]", which adds
   a third path to the same reciprocal edge even if nobody calls `link_items`.

The mechanism is `forwardLinks` (`packages/core/src/links.ts:18-22`), which unions
frontmatter `links[]` with body `[[wiki]]` links, feeding `buildLinkIndex`
(`links.ts:28-42`). Plan→ticket comes from the plan body's wiki-link; ticket→plan comes
from the ticket's `links[]`; the index then lists the ticket under *both* `links` and
`backlinks` of the plan. Nothing is corrupt — the graph faithfully reports two edges,
because two edges were written.

And `SKILL.md:48-51` (step 6) states the correct rule — "**Link once, in one direction.**
Backlinks are derived, so linking A→B is enough" — which step 4 and the plan template
both violate. AGENTS.md:189 confirms the design intent: the two mechanisms resolve into
one backlink graph, so writing both directions is redundant by construction.

**Decision needed: which direction is canonical.** Recommend **plan → ticket**. The plan
template already produces it as a side effect of its Tickets table, a plan is the
natural index of its tickets, and `get_links` on any ticket surfaces its plan for free
as a backlink. That means the ticket-side link is the one to drop.

**Files to change**

| File | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-workflow/SKILL.md:37-42` | drop the ticket→plan instruction from step 4 |
| `plugins/kanmer/skills/kanmer-workflow/assets/plan-template.md:23-24` | drop "link each ticket back to this plan" |
| `plugins/kanmer/skills/kanmer-workflow/assets/ticket-template.md:15` | make the example a research/context link, not a plan link |

**Steps**

1. In `SKILL.md:37-42`, cut "Give each ticket `links: ["PLAN-00X"]` once the plan exists,
   or link it later with `link_items`." Replace with: "The plan's Tickets table carries
   the `[[TICK-00X]]` links, so the relation is already recorded — do **not** also add
   `links: ["PLAN-00X"]` to each ticket. `get_links` on a ticket shows its plan as a
   backlink." Keep the `update_item` whole-body-replacement warning that follows.
2. In `plan-template.md:23-24`, change the parenthetical to: "(Create the tickets with
   `create_item`, then fill this table with their real ids. The table's `[[…]]` links
   *are* the relation — don't also link the tickets back to this plan.)"
3. In `ticket-template.md:15`, change "Link context inline: see [[PLAN-001]] or
   [[RES-003]]" to reference research only — e.g. "Link context inline: see [[RES-003]]"
   — so the ticket template stops modelling the direction being retired.
4. Cross-check step 6 (`SKILL.md:48-51`) now reads consistently with step 4; it should
   need no edit, which is the signal the fix is complete.
5. Verify: create two tickets and a plan by following the skill, then `get_links` on the
   plan — each ticket must appear in `links` **only**, with `backlinks` empty of them.

### 8. Avoid initializing every workspace on plugin startup

- **File:** `plugins/kanmer/mcp/codex.mcp.json:4`
- **Link:** [discussion_r3766828985](https://github.com/collisionengineers/kanmer/pull/1#discussion_r3766828985)
- **Ref:** [AGENTS.md:L132-L138](https://github.com/collisionengineers/kanmer/blob/2e2f7c4e07a06fe262b9df01080bc9e3e4c3e9c3/AGENTS.md#L132-L138)

> When the installed plugin's MCP server is started in a workspace that has not opted into
> Kanmer, this configuration supplies no `--root`, so the server falls back to the client's
> current working directory and immediately calls `store.init()`. Merely opening such a
> workspace can therefore create and populate a new `.kanmer/` tree, dirtying unrelated
> repositories and making the workflow skill treat them as Kanmer projects. Defer
> initialization until an explicit onboarding/write operation, or otherwise scope
> activation to projects that already contain `.kanmer`.

**Verdict: VALIDATED — and broader than filed. Recommend raising to P1.** Reproduced
against the committed bundle in an empty directory, with only the MCP handshake and
**zero tool calls**:

```
.kanmer/ created with no tool call, no --root.
Contents: data, plans, research, tickets;  data/: board.yml
stderr: kanmer-mcp ready — root: …\probe-sandbox
```

**Root cause — a chain of three, all of which hold.**

1. `packages/mcp-server/src/index.ts:271` — `main()` calls `await store.init()`
   unconditionally, before the transport is even connected. It is not gated on a tool
   call, a write, or the folder already existing.
2. `packages/mcp-server/src/root.ts:19` — with no `--root` and no `KANMER_ROOT`, the root
   is `process.cwd()`, i.e. whatever workspace the host launched the server in.
3. `plugins/kanmer/mcp/codex.mcp.json:4` — passes no `--root`, leaving step 2's fallback
   in play.

`store.init()` (`packages/core/src/store.ts:37-45`) then creates four directories and
writes a default `board.yml`.

**Why P1 rather than P2.**

- **It is not Codex-only.** `plugins/kanmer/mcp/claude.mcp.json:5` passes no `--root`
  either, so the same thing happens under Claude Code. The comment's file anchor is the
  narrower symptom; the defect is in the server.
- **It needs no user action.** MCP hosts spawn stdio servers at session start, so
  installing the plugin is enough — every project you subsequently open gets a
  `.kanmer/` tree whether or not you ever mention Kanmer.
- **It is visible in version control.** `.gitignore` does not exclude `.kanmer/`, so
  `.kanmer/data/board.yml` shows up as an untracked file in every affected repo. (The
  three empty item folders are invisible to git, so `board.yml` is the whole footprint —
  small, but it lands in `git status` on repos that never opted in.)
- **It corrupts a downstream signal.** The `kanmer-workflow` skill activates
  proactively "in a project that contains a `.kanmer` folder", and the onboarding skill
  cannot use the folder's existence to detect prior use (finding #5). Both are
  consequences of this bug.

**Files to change**

| File | Change |
|---|---|
| `packages/mcp-server/src/index.ts:270-276` | drop `store.init()` from boot; init lazily on first write |
| `packages/core/src/store.ts` | (optional) add an `ensureInit()` used by the write paths |
| `packages/mcp-server/src/smoke.mjs` | assert a read-only session leaves no `.kanmer/` |
| `packages/core/src/store.test.ts` | cover read-before-init and write-creates-skeleton |
| `plugins/kanmer/skills/kanmer-onboard/SKILL.md:14-18` | the "server creates `.kanmer/` on first contact" claim becomes false |
| `plugins/kanmer/skills/kanmer-workflow/SKILL.md:3` | proactive-activation wording now means something precise |
| `AGENTS.md:199-206` | document lazy init in the mcp-server section |

**Steps**

1. Delete `await store.init();` from `main()` (`index.ts:271`). Keep the stderr ready
   line — it is the only startup signal and writes nothing to disk.
2. Make initialisation happen on first *write*. Add to `index.ts`, next to `guard()`:
   ```ts
   /** Create the .kanmer skeleton on demand — never merely because we booted. */
   let initialised = false;
   async function ensureInit() {
     if (initialised) return;
     await store.init();
     initialised = true;
   }
   ```
   `await ensureInit()` at the top of the `create_item`, `update_item`, `move_item`,
   `link_items`, `add_column` and `delete_item` handlers.
3. Confirm the read tools already degrade cleanly on a project with no `.kanmer/` —
   they do, and this is what makes the fix safe:
   - `readBoard` returns `defaultBoardConfig()` when `board.yml` is absent
     (`packages/core/src/board.ts:32-34`), so `list_board` still answers;
   - `listItems` catches the failed `readdir` per type folder and continues
     (`store.ts:79-83`), so `list_items` returns `[]`;
   - `getItem`/`get_links`/`search_items` build on those two.
4. Leave the GUI alone. `apps/gui/src/main/index.ts:66` calls `store.init()` inside
   `openProject` — a user explicitly choosing a folder *is* the opt-in, so that call is
   correct and must stay.
5. Update `kanmer-onboard/SKILL.md:14-18`: with lazy init, a missing `.kanmer/` is once
   again a truthful "never used" signal. Fold this in with finding #5's edit.
6. Add the smoke check: spawn the server in a temp cwd, run the handshake plus a
   `list_board` and a `list_items`, and assert no `.kanmer/` exists; then `create_item`
   and assert it now does.
7. Run `npm test`, `node packages/mcp-server/src/smoke.mjs`, then
   `npm run plugin:build && npm run plugin:check` to refresh the committed bundle —
   without the rebuild, installed plugins keep the eager-init server (AGENTS.md gotcha 8).
8. Consider also passing `--root "${PLUGIN_ROOT}"`-free explicit roots in both
   `mcp/*.mcp.json` files if a host ever spawns the server with an unexpected cwd; not
   required once init is lazy, but it makes the root unambiguous in logs.

---

## P2 — tool reference accuracy

### 9. Exclude unsupported create-only fields from `update_item`

- **File:** `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:21`
- **Link:** [discussion_r3766904221](https://github.com/collisionengineers/kanmer/pull/1#discussion_r3766904221)
- **Ref:** [AGENTS.md:L253-L257](https://github.com/collisionengineers/kanmer/blob/98d9ec72ac07d6824bb64c2a565f145db6c3af2d/AGENTS.md#L253-L257)

> When an agent follows this reference to change an item's `type`, the preceding row
> establishes `type` as a create field and this row says any create field is accepted, but
> the registered `update_item` schema has no `type` parameter. Zod strips that unknown
> argument, so a call containing `id` and `type` can report success and stamp `updated`
> without changing the item type; enumerate the supported patch fields or explicitly
> exclude `type`.

**Verdict: VALIDATED**, including the silent-success-plus-stamped-`updated` detail.
Reproduced:

```
update_item(TICK-001, type:"plan") -> isError=false
type before=ticket  after=ticket
updated stamp moved: true
```

**Root cause.** `tool-reference.md:20` lists `type` first among `create_item`'s
parameters; `:21` then describes `update_item`'s params as "`id`, plus any create field,
`archived?`". By composition that promises `type` is patchable. The registered schema
(`packages/mcp-server/src/index.ts:182-193`) lists `title`, `status`, `area`, `priority`,
`assignee`, `labels`, `links`, `body`, `archived` — no `type`. The MCP SDK builds a
`z.object` from that raw shape, and zod's default behaviour strips unknown keys rather
than rejecting them, so the argument is discarded before the handler runs.
`store.updateItem` (`store.ts:135-146`) then writes the unchanged item with a fresh
`updated: nowIso()`, so the call returns a success payload and a moved timestamp — the
agent has every reason to believe it worked.

**`type` should stay unpatchable.** It is not an oversight worth "fixing" by adding the
parameter: type determines the folder (`packages/core/src/paths.ts` → `typeDir`) and the
id prefix (`board.idPrefixes`), so a real type change means moving the file *and*
reallocating the id, invalidating every existing `[[TICK-001]]` reference. The reference
doc is what is wrong here, not the schema.

**Files to change**

| File | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:21` | enumerate the real patch fields |
| `packages/mcp-server/src/index.ts:180-181` | (optional) say `type` is immutable in the tool description |

**Steps**

1. Replace the `update_item` **Key params** cell (`tool-reference.md:21`) with the
   explicit list, mirroring the schema exactly:
   `id`, `title?`, `status?`, `area?`, `priority?`, `assignee?`, `labels?`, `links?`,
   `body?`, `archived?`.
2. In the same row's Purpose cell, add: "`type` cannot be changed — it determines the
   folder and id prefix. Create a new item and archive the old one instead."
3. Optionally extend the `update_item` description string at `index.ts:180-181` with the
   same sentence, so an agent that never reads the reference still sees it in the tool
   list.
4. Adopt the rule that fixes the class of bug rather than the instance: **the reference
   must enumerate parameters, never describe them by reference to another tool's set.**
   "Plus any create field" is what made this drift silently.
5. Note that `npm run plugin:check` cannot catch this — `check-plugin-sync.mjs:26-35`
   compares tool *names* only, not parameters. Worth a follow-up ticket to extend it to
   parameter names; without that, this row can rot again.

### 10. Do not claim `list_items` returns every frontmatter field

- **File:** `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:34`
- **Link:** [discussion_r3766904228](https://github.com/collisionengineers/kanmer/pull/1#discussion_r3766904228)
- **Ref:** [AGENTS.md:L253-L257](https://github.com/collisionengineers/kanmer/blob/98d9ec72ac07d6824bb64c2a565f145db6c3af2d/AGENTS.md#L253-L257)

> When an agent requests `include_archived: true` or needs relationship metadata, this
> claim implies that the summary identifies archived entries and includes their `links`,
> but `summarise()` omits `archived`, `links`, and `created` along with the body. The
> agent can therefore mistake a missing link for no link or cannot distinguish active from
> archived results; describe the response as containing only the explicitly listed summary
> fields and direct callers to `get_item` for the rest.

**Verdict: VALIDATED.** Reproduced:

```
summary keys = [id, type, title, status, area, priority, assignee, labels, updated]
missing from "every field except the body": [archived, links, created]
```

**Root cause.** `tool-reference.md:34` opens the section with "Every field except the
body:" and then lists nine fields. The list is accurate; the sentence introducing it is
not. `summarise()` (`packages/mcp-server/src/index.ts:32-44`) returns exactly those nine
and drops `archived`, `links` and `created`, which are all real frontmatter fields
(`packages/core/src/types.ts:69-84`). A reader who trusts the prose over the list
concludes the summary is complete.

**The `archived` omission is the one with teeth.** `list_items` accepts
`include_archived: true` (`index.ts:77`) but the response carries no way to tell which
returned items are archived — the caller asked to widen the set and got no marker for
what the widening added. The `links` omission is the reviewer's second scenario: an
agent scanning summaries for relationships sees no `links` key and may read that as "no
links" rather than "not reported here".

**Files to change**

| File | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:32-36` | correct the prose |
| `packages/mcp-server/src/index.ts:32-44` | add `archived` to `summarise()` |
| `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md:11` | `list_items` row gains the archived-marker note |
| `packages/mcp-server/src/smoke.mjs` | assert the summary key set |

**Steps**

1. Rewrite `tool-reference.md:32-36` to lead with the closed list rather than a claim of
   completeness: "**What a `list_items` summary contains** — exactly these fields:
   `id`, `type`, `title`, `status`, `area`, `priority`, `assignee`, `labels`, `updated`,
   `archived`. Everything else — `links`, `created`, and the Markdown body — requires
   `get_item`."
2. Add `archived: item.archived` to `summarise()` (`index.ts:32-44`). It is one line,
   costs nothing, and makes `include_archived: true` usable — without it that parameter
   returns an unlabelled mixture.
3. Leave `links` and `created` out. `links` needs the body's `[[wiki]]` links to be
   meaningful (`packages/core/src/links.ts:18-22`), so a frontmatter-only `links` array
   in a summary would be its own half-truth; `get_links` is the correct tool and should
   be named as such in the doc. `created` is rarely needed and `updated` already carries
   staleness.
4. Update the `list_items` row at `tool-reference.md:11` to mention that archived items
   are flagged by the `archived` field when `include_archived` is set.
5. Add a `smoke.mjs` assertion on the exact key set of a summary, so drift between
   `summarise()` and the doc fails a check rather than silently misleading agents — the
   same gap flagged in #9 step 5.
6. Run `npm run plugin:build && npm run plugin:check` after the `summarise()` change.

---

## Checklist

Ordered by suggested fix sequence: #8 first (it unblocks #5's clean fix), then the rest.

| # | Priority | Verdict | File(s) | Summary | Done |
|---|---|---|---|---|---|
| 8 | P2→**P1** | Validated | `mcp-server/src/index.ts` | Lazy-init instead of creating `.kanmer/` on startup | ☑ |
| 1 | P1 | Validated | `.codex-plugin/plugin.json`, new `.mcp.json` | `mcpServers` must resolve to a plugin-root `.mcp.json` | ☑ |
| 4 | P2 | Validated | `kanmer-workflow/SKILL.md`, `mcp-server/src/index.ts` | Resolve stages from `list_board`; validate `status` on write | ☑ |
| 3 | P2 | Validated | `kanmer-standup/SKILL.md` | Build report sections from configured stages | ☑ |
| 5 | P2 | Validated | `kanmer-onboard/SKILL.md` | Freshness check must pass `include_archived: true` | ☑ |
| 6 | P2 | Validated | `kanmer-onboard/SKILL.md` (+ optional new tool) | `add_column` can't replace default stages | ☑ (option A) |
| 7 | P2 | Validated | `kanmer-workflow/SKILL.md`, both templates | Keep plan→ticket links only, in all three files | ☑ |
| 9 | P2 | Validated | `references/tool-reference.md` | `update_item` doesn't accept `type` | ☑ |
| 10 | P2 | Validated | `references/tool-reference.md`, `mcp-server/src/index.ts` | Summary omits `archived`/`links`/`created` | ☑ |
| 2 | ~~P1~~ P3 | **Refuted** | — | `interface` metadata is optional; listing polish only | ☐ |

**Cross-cutting follow-ups surfaced by the investigation** (not raised by the reviewer):

- `check-plugin-sync.mjs` compares tool *names* only, so #9 and #10 — both parameter and
  response drift — were invisible to `npm run plugin:check`. Extending it to parameter
  and summary-key names would close the class.
- Every fix touching `packages/mcp-server/` requires `npm run plugin:build`; the
  committed `plugins/kanmer/mcp/kanmer-mcp.cjs` is what installs actually run.

## Implementation notes (2026-08-12)

All nine validated findings are fixed on `board-stages-and-plugin`. One
deliberate deviation from the suggested placement:

- **#4's status validation lives in `packages/core/src/store.ts`**
  (`assertKnownStatus`, called from `createItem`/`updateItem`), not as a
  separate `assertStatus` helper in `mcp-server/src/index.ts` as the finding's
  steps sketched. The finding itself flagged `store.ts` as an "alternative
  placement" and separately asked for a `store.test.ts` case exercising
  `moveItem` directly — that test only makes sense if the store itself
  validates. Putting it in `store.ts` also means the Electron GUI's direct
  `store.updateItem`/`moveItem` calls (`apps/gui/src/main/index.ts`) get the
  same guard for free, closing the hole everywhere the store is used, not just
  behind the MCP tool layer. `guard()` in `index.ts` already turns the thrown
  error into an `isError` result naming the valid ids, so no server-side
  wrapper was needed.
- Verified end-to-end: `npm test` (23/23), `node packages/mcp-server/src/smoke.mjs`
  (25/25, including two new checks for lazy-init and status rejection),
  `npm run build`, `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`,
  `npm run plugin:build && npm run plugin:check` all green.
- #2 (Codex `interface` metadata) stays unfixed — it was refuted, not
  validated; see its section above. Option B for #6 (a real `set_board`/
  `remove_column` tool) was intentionally not taken — the finding marked it a
  follow-up, not a merge blocker, and it has its own hazard (stranding items
  on a removed column) that needs its own design pass.
