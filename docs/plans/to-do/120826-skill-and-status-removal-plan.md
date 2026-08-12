\# Kanmer board simplification (single stage dimension) + cross-agent plugin



\## Context



Two scopes, ordered — Part A changes the data model, Part B ships the plugin whose skills must describe that model.



Part A — the board is overcomplicated. `phase` and `status` massively overlap (backlog≈todo, build≈in progress). Kanmer moves to one workflow dimension per ticket `status`, with default stages Todo → Planning → Implementing → Review → Verifying → Done. `phase` is removed everywhere. Areas (colour groups) and priorities are unchanged.



Part B — the plugin. Plugins are cross-agent codex has a near-identical standard (`.codex-pluginplugin.json`, `skillsnameSKILL.md`, bundled MCP config) to Claude Code's. One `pluginskanmer` folder carries both manifests, three skills (workflow + templates, standup, onboard), the bundled MCP server (existing self-contained `kanmer-mcp.cjs`), repo marketplace files for one-command install, and a sync-check script + AGENTS.md guidance so skills never drift from the tool surface.



\### Bundled-MCP questions (answered)



\- Does an agent connection show in the app No — by design there's no connection registry; the GUI watches files. Agent edits appear on the board in \~200ms, which is the product loop. No presence indicator exists or is needed.

\- Does external registration conflict with the plugin's server No — every tool call re-reads disk, writes are atomic temp+rename (\[io.ts](packagescoresrcio.ts)), ids reconcile against on-disk max (\[ids.ts](packagescoresrcids.ts)). Caveats to document only (1) having both plugin and manual registration lists the tools twice (harmless; README says pick one); (2) theoretical `counters.json` race if two agents create simultaneously (AGENTS.md §11 note).

\- Verdict bundling is fine and recommended. Plugin runs `node pluginmcpkanmer-mcp.cjs`; root resolution already defaults to cwd (\[root.ts](packagesmcp-serversrcroot.ts)) — correct per-project behaviour for plugin sessions. Only requirement Node ≥20.

\- Host nuance Claude reads `{mcpServers…}` + `${CLAUDE\_PLUGIN\_ROOT}`; codex reads a direct map + `${PLUGIN\_ROOT}` → ship two tiny MCP configs, each manifest pointing at its own (no shared `.mcp.json` at plugin root).



\---



\# PART A — Single stage dimension



\## A1. Core (`packagescore`)



\[types.ts](packagescoresrctypes.ts)

\- `BoardConfigSchema` remove `phases`. Keep `statuses` (min 1) as the single workflow dimension. zod's default object behaviour strips the legacy `phases` key when parsing old `board.yml` files — old boards load cleanly and lose `phases` on next save.

\- `ColumnKind` = `status  area  priority`.

\- `ItemFrontmatterSchema` remove `phase`. (`passthrough()` means legacy `phase` values in existing files survive round-trips harmlessly; nothing reads them.)

\- `ItemFilter`, `CreateItemInput`, `UpdateItemPatch` remove `phase`.



\[board.ts](packagescoresrcboard.ts) — `defaultBoardConfig()` statuses become

```yaml

statuses

&#x20; - { id todo,         name Todo }

&#x20; - { id planning,     name Planning }

&#x20; - { id implementing, name Implementing }

&#x20; - { id review,       name Review }

&#x20; - { id verifying,    name Verifying }

&#x20; - { id done,         name Done }

```

Remove `phases` from the default. Existing projects keep their own `statuses` list (their board.yml already has one) — no forced migration; items with statuses not in the list still render via the Board's existing `mergeColumns` fallback.



\[store.ts](packagescoresrcstore.ts) — `createItem` drops phase default; `moveItem(id, { status })`; `matchesFilter` drops phase; `columnList` drops the phase case.



\[frontmatter.ts](packagescoresrcfrontmatter.ts) — remove `phase` from `KEY\_ORDER`.



Tests — update `store.test.ts` (default statuses = six stages incl. `implementing`; drop phase assertions; keep areaarchiveprioritysetBoard coverage) and `frontmatter.test.ts` sample (no `phase`; add a legacy-file test frontmatter containing `phase build` still parses and round-trips via passthrough).



\## A2. MCP server (`packagesmcp-serversrcindex.ts`)



\- Rename `list\_phases` → `list\_board` (Return the board configuration statuses (the workflow stages), areas, priorities and id prefixes. Call this first to learn valid ids.). Tool count stays 11.

\- `list\_items` drop `phase` filter. `create\_item``update\_item` drop `phase` param. `move\_item` `status` only (Move a ticket to a workflow stage).

\- `add\_column` kinds `status  area  priority`.

\- `summarise()` drop phase.

\- smoke.mjs update tool name + drop phase assertions; add one created item defaults to first status (`todo`).



\## A3. GUI (`appsgui`)



\- \[Board.tsx](appsguisrcrenderersrccomponentsBoard.tsx) — remove swimlanes single kanban row, columns = statuses (`gridTemplateColumns repeat(n, minmax(230px,1fr))`, no lane columncorner). Within each column, existing area clustering + colour stripes stay. Drag between columns → `moveItem({status})`. Quick-add per column (`{typeticket, title, status}`).

\- \[Editor.tsx](appsguisrcrenderersrccomponentsEditor.tsx) — remove Phase select; Status select shows the six stages (plus `withCurrent` fallback).

\- \[Settings.tsx](appsguisrcrenderersrccomponentsSettings.tsx) — remove the Phases editor; grid becomes Statuses (Stages (columns))  Areas  Priorities. `pluralKey` drops phase.

\- \[ItemList.tsx](appsguisrcrenderersrccomponentsItemList.tsx) — phase chip → status chip.

\- \[App.tsx](appsguisrcrenderersrcApp.tsx)  \[ipc.ts](appsguisrcsharedipc.ts)  \[mainindex.ts](appsguisrcmainindex.ts)  preload — `moveItem(id, {status})` signature; remove phase from create paths. CSS delete `.lane-head``.lane-dot``.board-corner` rules.



\## A4. Docs



\- AGENTS.md §4 data model (single `status` dimension, six default stages, no `phase`), §5 tool list (`list\_board`), examples. README.md board description + example frontmatter. examplescodex-config.toml unchanged.

\- Reseed `sandbox` with the new model for screenshotstests.



\---



\# PART B — The plugin



\## B1. Folder structure (new)



```

kanmer

&#x20; .claude-pluginmarketplace.json      # Claude Code marketplace (repo-hosted)

&#x20; .agentspluginsmarketplace.json     # codex marketplace (repo-hosted)

&#x20; pluginskanmer

&#x20;   .claude-pluginplugin.json

&#x20;   .codex-pluginplugin.json

&#x20;   mcp

&#x20;     claude.mcp.json

&#x20;     codex.mcp.json

&#x20;     kanmer-mcp.cjs                   # committed artifact, copied by pluginbuild

&#x20;   skills

&#x20;     kanmer-workflow

&#x20;       SKILL.md

&#x20;       referencestool-reference.md

&#x20;       assetsticket-template.md

&#x20;       assetsplan-template.md

&#x20;       assetsresearch-template.md

&#x20;     kanmer-standupSKILL.md

&#x20;     kanmer-onboardSKILL.md

&#x20; scripts

&#x20;   build-plugin.mjs

&#x20;   check-plugin-sync.mjs

```



\## B2. Manifests \& MCP configs (exact)



`pluginskanmer.claude-pluginplugin.json`

```json

{

&#x20; name kanmer,

&#x20; version 0.1.0,

&#x20; description File-based kanban for AI agents track tickets, plans and research in a .kanmer folder shared live with the Kanmer desktop GUI.,

&#x20; author { name Kanmer contributors, url httpsgithub.comcollisionengineerskanmer },

&#x20; homepage httpsgithub.comcollisionengineerskanmer,

&#x20; repository httpsgithub.comcollisionengineerskanmer,

&#x20; license MIT,

&#x20; keywords \[kanban, tickets, mcp, project-management],

&#x20; skills .skills,

&#x20; mcpServers .mcpclaude.mcp.json

}

```



`pluginskanmer.codex-pluginplugin.json` — same fields plus

```json

&#x20; mcpServers .mcpcodex.mcp.json,

&#x20; interface {

&#x20;   displayName Kanmer,

&#x20;   shortDescription Kanban board shared between AI agents and humans,

&#x20;   developerName Kanmer contributors,

&#x20;   category Productivity

&#x20; }

```



`pluginskanmermcpclaude.mcp.json`

```json

{

&#x20; mcpServers {

&#x20;   kanmer { command node, args \[${CLAUDE\_PLUGIN\_ROOT}mcpkanmer-mcp.cjs] }

&#x20; }

}

```



`pluginskanmermcpcodex.mcp.json`

```json

{

&#x20; kanmer { command node, args \[${PLUGIN\_ROOT}mcpkanmer-mcp.cjs] }

}

```

(No `--root` — cwd fallback is the correct per-project behaviour. Verify `${PLUGIN\_ROOT}` interpolation in codex MCP config during testing; fall back to README `codex mcp add` instructions if unsupported.)



\## B3. Skill `kanmer-workflowSKILL.md` (exact)



```markdown

\---

name kanmer-workflow

description Track and organise work in Kanmer, the file-based kanban shared live with a human's board GUI. Use this whenever the user asks to plan work, track tasks, create or update tickets, manage a backlog, record research, break a feature into steps, or asks what's on the board  add a ticket for this — and also proactively when you start a multi-step piece of work in a project that contains a .kanmer folder, so the human can follow your progress on their board.

\---



\# Working with Kanmer



Kanmer stores tickets, plans and research notes as Markdown files in the

project's `.kanmer` folder. The human sees the same data on a live kanban

board (the Kanmer desktop app), so every item you create or move is instantly

visible to them — treat the board as your shared workspace, not a log.



All access goes through the `kanmer` MCP tools. Never edit `.kanmer` files

directly; the tools keep ids, timestamps and frontmatter consistent.



\## The working loop



1\. Orient first. Call `list\_board` once per session to learn the board's

&#x20;  stages (statuses), areas and priorities — ids vary per project. The default

&#x20;  stages are todo → planning → implementing → review → verifying → done.

&#x20;  Then `list\_items` to see current state before adding to it. Search with

&#x20;  `search\_items` before creating the item may already exist.

2\. One ticket per unit of work. When the user asks for a feature or fix

&#x20;  that takes more than one step, create a ticket (`create\_item` with

&#x20;  `type ticket`) before you start, using the structure in

&#x20;  `assetsticket-template.md`. Set `status`, `area` and `priority` from the

&#x20;  ids you got in step 1 — never invent ids.

3\. Move through the stages as you work. Use `move\_item` at each real

&#x20;  transition — `planning` while you design the approach, `implementing` when

&#x20;  you write code, `review` when it needs the user's eyes, `verifying` while

&#x20;  testschecks run, `done` when verified. The human watches these transitions

&#x20;  live; don't batch them at the end, and don't skip to done without verifying.

4\. Plans coordinate tickets. For multi-ticket efforts, create one plan

&#x20;  (`type plan`, see `assetsplan-template.md`) and link each ticket to it.

5\. Research feeds decisions. Findings worth keeping go in a research note

&#x20;  (`type research`, see `assetsresearch-template.md`), linked from the

&#x20;  ticket or plan that prompted it.

6\. Link, don't repeat. Use `link\_items` for structured relations and

&#x20;  `\[\[ID]]` wiki-links inside bodies for inline references. Both resolve into

&#x20;  a backlink graph (`get\_links`).

7\. Archive, don't delete. `update\_item` with `archived true` hides an

&#x20;  item from the board but keeps it recoverable. Reserve `delete\_item` for

&#x20;  items the user explicitly wants gone — it is permanent.



\## Conventions that keep the board useful



\- Titles are imperative and specific Wire retry logic into upload queue,

&#x20; not Fix bug.

\- Bodies say why and how to verify, not just what — the templates have

&#x20; the sections.

\- If the board's stages don't fit the work, ask the user before restructuring;

&#x20; `add\_column` changes the board for everything.

\- If the tools report the same item twice under two server names, the user has

&#x20; Kanmer registered both via this plugin and manually — mention it and suggest

&#x20; removing one registration.



For exact tool parameters, read `referencestool-reference.md`.

```



\## B4. `referencestool-reference.md` (exact)



```markdown

\# Kanmer MCP tool reference



Kept in sync with `packagesmcp-serversrcindex.ts` — run

`node scriptscheck-plugin-sync.mjs` after changing either side.



\## Read tools



&#x20;Tool  Purpose  Key params 

\---------

&#x20;`list\_board`  Board config stages (statuses), areas, priorities, id prefixes. Call first.  — 

&#x20;`list\_items`  Item summaries (no body). Archived excluded by default.  `type`, `status`, `area`, `label`, `include\_archived` 

&#x20;`get\_item`  Full frontmatter + Markdown body of one item.  `id` 

&#x20;`search\_items`  Full-text search over id, title, body, labels, assignee.  `query`, `type` 

&#x20;`get\_links`  Forward links + backlinks for an item, with titles.  `id` 



\## Write tools



&#x20;Tool  Purpose  Key params 

\---------

&#x20;`create\_item`  Create ticket  plan  research. Returns allocated id (e.g. TICK-007).  `type`, `title`, `status`, `area`, `priority`, `assignee`, `labels`, `links`, `body` 

&#x20;`update\_item`  Patch any frontmatter field andor body. `archived true` hides from board.  `id`, plus any create field, `archived` 

&#x20;`move\_item`  Move a ticket to a workflow stage.  `id`, `status` 

&#x20;`link\_items`  Addremove a structured relation source → target.  `source\_id`, `target\_id`, `action` (`add``remove`) 

&#x20;`add\_column`  Add a stage, area or priority to the board.  `id`, `name`, `kind`, `color` 



\## Destructive



&#x20;Tool  Purpose  Key params 

\---------

&#x20;`delete\_item`  Permanently delete an item file. Cannot be undone. Prefer archiving.  `id` 



\## Field semantics



\- `status` — the single workflow dimension; a column on the human's board.

&#x20; Default stages todo → planning → implementing → review → verifying → done.

\- `area` — colour-coded grouping (e.g. UI, API); clusters cards within columns.

\- `priority` — id into the board's configurable priority list.

\- `links` — array of item ids; combined with `\[\[ID]]` body wiki-links into a backlink graph.

\- Bodies are Markdown; `\[\[ID]]` references render as clickable links in the GUI.

```



\## B5. Templates (exact) — `kanmer-workflowassets`



`ticket-template.md`

```markdown

\# Ticket body template



Use this structure for `create\_item` bodies with `type ticket`. Keep

sections that apply; drop ones that don't. Frontmatter fields (title, status,

area, priority, labels, links) are tool parameters, not body content.



\---



\## What



One or two sentences the concrete change or outcome this ticket delivers.



\## Why



The problem or need driving it. Link context inline see \[\[PLAN-001]] or \[\[RES-003]].



\## Approach



\- Bullet steps or key decisions. Short — the ticket is a work item, not a design doc.



\## Verification



\- \[ ] How to check this is done (command, test, observable behaviour).



\## Notes



Anything discovered while working gotchas, follow-ups spun off, links to commitsPRs.

```



`plan-template.md`

```markdown

\# Plan body template



Use for `create\_item` bodies with `type plan`. A plan coordinates several

tickets toward one outcome; it is the map, tickets are the moves.



\---



\## Goal



The outcome in one paragraph, with the definition of done.



\## Context



Why now; constraints; relevant research \[\[RES-00X]].



\## Tickets



&#x20;Ticket  Covers  Depends on 

\---------

&#x20;\[\[TICK-00A]]  …  — 

&#x20;\[\[TICK-00B]]  …  \[\[TICK-00A]] 



(Create the tickets with `create\_item`, then fill this table with their real ids

and link each ticket back to this plan with `link\_items`.)



\## Risks  open questions



\- Things that could invalidate the plan, and who decides.



\## Status log



\- YYYY-MM-DD created; scope agreed with user.

```



`research-template.md`

```markdown

\# Research body template



Use for `create\_item` bodies with `type research`. A research note captures

findings that outlive the conversation — written so a reader who wasn't there

can trust and reuse them.



\---



\## Question



What this note answers, in one sentence.



\## Findings



\- Fact or measurement — with the source (URL, file path, command output).

\- Distinguish observed facts from inference; say which is which.



\## Recommendation



What the findings imply for the work the option to take, with the trade-off named.



\## Sources



\- Links, docs, files inspected, commands run.



\## Feeds into



\[\[PLAN-00X]]  \[\[TICK-00Y]] — link with `link\_items` after creating.

```



\## B6. Skill `kanmer-standupSKILL.md` (exact)



```markdown

\---

name kanmer-standup

description Summarise the current state of a project's Kanmer board — what's in progress, what's blocked or stale, what changed recently. Use whenever the user asks for a standup, status update, board summary, progress report, where are we, what's left, or wants to groomtriage the backlog in a project with a .kanmer folder.

\---



\# Kanmer standup  board report



Produce a status report from the live board, not from memory of the

conversation — the human (or other agents) may have changed items since.



\## Gather



1\. `list\_board` for the board's stagearea names (report human names, not ids).

2\. `list\_items` for all active items; note `updated` timestamps.

3\. For anything surprising (stale, blocked, unassigned), `get\_item` to read the body before commenting on it.



\## Report format



ALWAYS use this structure, in Markdown



\### Board project folder name



In flight — items in planning  implementing  verifying, each as

`ID title (stage, area, priority)` + one line of state; flag anything not

updated in 7+ days as stale.



In review — items awaiting a decision, and whose.



Up next — top of the todo column, highest priority first. 3–5 items max.



Recently done — done items updated in the last 7 days. Count + highlights.



Flags — anything needing the user stale in-flight items, tickets with no

area, plans whose tickets are all done (suggest closing), unlinked research.



Keep the whole report scannable — one line per item, no body quotes unless asked.



\## Grooming (only when asked)



If the user asks to groomtriage propose — don't apply — batch changes

(archive stale done items, set missing areaspriorities, reprioritise), then

execute the approved subset with `update\_item`  `move\_item`.

```



\## B7. Skill `kanmer-onboardSKILL.md` (exact)



```markdown

\---

name kanmer-onboard

description Set up Kanmer in a project for the first time — tailor the board's stages and areas to the codebase, and seed the backlog from existing TODOs, roadmaps or the user's head. Use when the user says set up kanmer, onboard this project, create a board for this repo, import my todos into kanmer, or asks to start tracking work in a project that has no .kanmer folder yet.

\---



\# Onboarding a project onto Kanmer



Goal leave the project with a board whose columns match how this team

actually works, and a seeded backlog worth looking at — not an empty default

board the user must configure themselves.



\## Steps



1\. Check state. Call `list\_board`. If `list\_items` shows the board already

&#x20;  has items, this is not a fresh onboard — switch to the normal workflow.

2\. Learn the project. Skim the repo before proposing structure README,

&#x20;  docs, existing TODOROADMAPBACKLOG files, issue templates, and the

&#x20;  top-level folder names (they usually reveal the natural areas — e.g.

&#x20;  `api`, `ui`, `infra`).

3\. Propose the board, then apply. Suggest to the user, in one short message

&#x20;  - Areas with colours, from the codebase's real seams (3–6, not more).

&#x20;  - Stage changes only if the defaults (todo → planning → implementing →

&#x20;    review → verifying → done) genuinely don't fit — most projects should

&#x20;    keep them, since tools and the GUI assume their semantics.

&#x20;  Apply the agreed set with `add\_column` (`kind area`  `status`).

4\. Seed the backlog. Convert what already exists into items

&#x20;  - TODOFIXME comments worth tracking → tickets (title from the comment,

&#x20;    body links the file path).

&#x20;  - Roadmapplan documents → one plan each, with their bullet points as

&#x20;    linked tickets where concrete enough.

&#x20;  - Open questions → research notes.

&#x20;  Use the templates from the `kanmer-workflow` skill's assets. Batch-create,

&#x20;  then show the user the list of created ids.

5\. Hand over. Tell the user the board is ready, mention the Kanmer GUI can

&#x20;  open this folder to see it live, and summarise N tickets, M plans, areas

&#x20;  created. Ask what to prioritise first and set those items' priorities.



\## Judgement calls



\- Seed selectively 10 good tickets beat 60 noise tickets. Skip trivial or

&#x20; stale TODOs; mention you skipped them.

\- Never delete or rewrite the user's existing TODO files — Kanmer items link

&#x20; to them, they don't replace them.

\- If the project already has an issue tracker convention (e.g. GitHub issue

&#x20; references), put those references in ticket bodies so items stay traceable.

```



\## B8. Scripts (exact)



`scriptsbuild-plugin.mjs`

```js

&#x20;Copy the standalone MCP bundle into the plugin. Run after `npm run build`.

import { copyFileSync, existsSync, mkdirSync } from nodefs;

import { dirname, join, resolve } from nodepath;

import { fileURLToPath } from nodeurl;



const root = resolve(dirname(fileURLToPath(import.meta.url)), ..);

const src = join(root, packagesmcp-serverdiststandalonekanmer-mcp.cjs);

const dest = join(root, pluginskanmermcpkanmer-mcp.cjs);



if (!existsSync(src)) {

&#x20; console.error(Standalone bundle missing — run `npm run build` first.);

&#x20; process.exit(1);

}

mkdirSync(dirname(dest), { recursive true });

copyFileSync(src, dest);

console.log(`plugin copied kanmer-mcp.cjs → ${dest}`);

```



`scriptscheck-plugin-sync.mjs`

```js

&#x20;Fail if the MCP tool names registered by the server drift from the ones

&#x20;documented in the plugin's tool reference. Part of the verification checklist.

import { readFileSync } from nodefs;

import { join, resolve, dirname } from nodepath;

import { fileURLToPath } from nodeurl;



const root = resolve(dirname(fileURLToPath(import.meta.url)), ..);

const serverSrc = readFileSync(join(root, packagesmcp-serversrcindex.ts), utf8);

const refDoc = readFileSync(

&#x20; join(root, pluginskanmerskillskanmer-workflowreferencestool-reference.md),

&#x20; utf8,

);



const registered = \[...serverSrc.matchAll(registerTool(s(\[^]+)g)].map((m) = m\[1]);

const documented = \[...refDoc.matchAll(s`(\[a-z\_]+)`sg)].map((m) = m\[1]);



const missing = registered.filter((t) = !documented.includes(t));

const stale = documented.filter((t) = !registered.includes(t));



if (missing.length  stale.length) {

&#x20; if (missing.length) console.error(`Undocumented tools ${missing.join(, )}`);

&#x20; if (stale.length) console.error(`Documented but unregistered ${stale.join(, )}`);

&#x20; console.error(Update pluginskanmerskillskanmer-workflowreferencestool-reference.md);

&#x20; process.exit(1);

}

console.log(`plugin-sync OK — ${registered.length} tools match`);

```



\## B9. Marketplaces (exact)



`.claude-pluginmarketplace.json` (repo root)

```json

{

&#x20; name kanmer,

&#x20; owner { name Kanmer contributors, url httpsgithub.comcollisionengineerskanmer },

&#x20; plugins \[

&#x20;   {

&#x20;     name kanmer,

&#x20;     source .pluginskanmer,

&#x20;     description File-based kanban for AI agents — tickets, plans and research shared live with the Kanmer desktop GUI.,

&#x20;     category productivity

&#x20;   }

&#x20; ]

}

```

(Validate with `claude plugin validate .`; full schema is in the saved docs dump `…tool-resultstoolu\_01TCrS1UThMqAK165QHKtsuJ.txt`.)



`.agentspluginsmarketplace.json` (repo root)

```json

{

&#x20; name kanmer-plugins,

&#x20; interface { displayName Kanmer },

&#x20; plugins \[

&#x20;   {

&#x20;     name kanmer,

&#x20;     source { source local, path .pluginskanmer },

&#x20;     policy { installation AVAILABLE, authentication ON\_INSTALL },

&#x20;     category Productivity

&#x20;   }

&#x20; ]

}

```



\## B10. Repo wiring



\- Root `package.json` scripts `pluginbuild npm run build \&\& node scriptsbuild-plugin.mjs`, `plugincheck node scriptscheck-plugin-sync.mjs`.

\- AGENTS.md §2 add `pluginskanmer` + `scripts`; §6 add both commands; §7 add sync rule — the plugin's skills describe the MCP tool surface whenever you addrenamechange a tool or its params, update `tool-reference.md` (and SKILL.md if the workflow changes), run `npm run pluginbuild` and `npm run plugincheck` (fails on drift); §9 extend the add-a-tool recipe with those steps; §10 add checklist item `npm run plugincheck`; §11 add counters race note.

\- README.md plugin install section (before Connect an agent)

&#x20; Claude Code — `claude plugin marketplace add collisionengineerskanmer` then `claude plugin install kanmer@kanmer`; codex — `codex plugin marketplace add collisionengineerskanmer` then install via `plugins`. Note use either the plugin or a manualGUI registration, not both (duplicate tools, harmless but confusing). Requires Node ≥20.



\---



\## Implementation order



1\. Part A core — typesboardstorefrontmatter + tests → `npm test` green.

2\. Part A server — rename + param removal → rebuild both bundles → smoke 19-ish19 green (updated assertions).

3\. Part A GUI — BoardEditorSettingsItemListAppIPC + CSS cleanup → typecheck, build, `KANMER\_SMOKE` boot, reseed sandbox, screenshot the new single-row board.

4\. Part A docs — AGENTS.md §4§5, README.

5\. Part B plugin — trees + files exactly as B2–B9; `npm run pluginbuild`; commit the cjs artifact.

6\. Part B wiring — scripts, AGENTS.md, README; `npm run plugincheck` → 11 tools match; `claude plugin validate .`.

7\. Skill test pass (lean) — 4 subagent prompts (a) add a ticket for fixing the login timeout in this project, (b) plan the reporting feature break it into tickets, (c) give me a standup (seeded sandbox), (d) set up kanmer for this repo and import the TODOs (fresh sandbox with TODO comments + ROADMAP.md). Check `list\_board` called first, template sections used, real ids linked, stages moved during work. One revision iteration with user review of outputs.

8\. Commit + push; optional real-install test from GitHub (`claude plugin marketplace add collisionengineerskanmer`) in a scratch project with the GUI open on the same folder — proves plugin + GUI coexistence live.



\## Verification



\- `npm test` — core suite green under the single-stage model (incl. legacy `phase` passthrough test).

\- `node packagesmcp-serversrcsmoke.mjs` — green; also against the plugin artifact `KANMER\_SERVER=pluginskanmermcpkanmer-mcp.cjs node packagesmcp-serversrcsmoke.mjs`.

\- `npm run typecheck -w @kanmergui`; GUI build; `KANMER\_SMOKE=1` boot exit 0; screenshot shows six-column board with area clusters.

\- `npm run plugincheck` → OK; `claude plugin validate .` → passes.

\- Real-install tools appear once, `create\_item` lands in the scratch project's `.kanmer`, card appears live in the GUI.

\- Duplicate-registration sanity both toolsets callable, no corruption; remove one.



\## Out of scope



\- npm-published server (`npx @kanmermcp-server`); OpenAIAnthropic directory submissions; GUI presence indicator (agent active); auto-migration that rewrites old boards' status ids (mergeColumns fallback + Settings rename covers it).

