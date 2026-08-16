# Auto run — HZN-003

target: **closeout** (every ticket to `done`)
started: 2026-08-16
operator rule: complete every ticket; the only stop is an operator-only question.

## Resume procedure

Read this file before scoping anything. If any row is not `done`, adopt this table
rather than re-deriving a roster — re-scoping loses the lane partition and every
operator answer recorded on the tickets.

**Every ticket's settled decisions live in its own folder**, not here:
`scratch/scheduling.md` = orchestrator calls, `scratch/operator-answers.md` = the
operator's. A ticket agent reads those and does not re-open them.

## Board-wide policy set during this run

**`proof:visual` — agent-rendered evidence counts, on one condition.** Operator's
words: *"as long as the image is actually reviewed using vision."* Literally: open
the PNG with `Read`, see it, and describe in `proof.md` what it shows in words that
could not have come from the numbers. Numeric assertions stay as the regression
guard; the viewing is the proof. GUI-072 did this correctly — use it as the model.

**The main checkout is contended.** Several agents work in parallel worktrees and
the shared checkout moves underneath a long build. MCP-010's root build failed this
way. Recipe that worked: `npm install` inside the worktree so `@kanmer/core`
resolves to the branch's own core, then settle `plugin:check` in a dedicated clean
detached checkout of the merge commit with fresh `node_modules`.

## Done — 6

| ticket | PR | commit |
|---|---|---|
| GUI-074 | #37 | `43dcedb` |
| GUI-069 | #38 | `488797d` |
| GUI-072 | #39 | `ed52e39` |
| MCP-010 | #40 | `741ef81` |
| GUI-080 | #41 | `9ac20af` |
| *(GUI-067, GUI-078, SKILL-011, SKILL-012, SKILL-014 were done before this run)* | | |

## In flight — 7

GUI-070, SKILL-018, MCP-012, MCP-011, GUI-079, MCP-009, GUI-066.

## Queued, decisions recorded, waiting on a lane

| ticket | waiting on |
|---|---|
| GUI-071 | GUI-070 (same `App.tsx` tab `.map()`) |
| GUI-065 | GUI-070/GUI-071 (same `App.tsx`). Operator chose **jsdom + testing-library**, AGENTS.md §7 amended in the same PR |
| MCP-007 | SKILL-018 (same `check-plugin-sync.mjs`) |
| MCP-006 | MCP-012 (same `index.ts`) |
| SKILL-013 | SKILL-018 + MCP-012. Ships prose AND the `fix`-gains-`enter-review` gate in ONE PR (operator). Also owns pointing `connect.ts` at the canonical AGENTS block |
| MCP-013 | MCP-011 (same manifests) |
| GUI-083 | new this turn — see below |

## Still awaiting operator

- **CORE-023** — Q3: does the GUI surface ship in this ticket or a follow-up? (The
  GUI has no MCP client, so a `get_status` field does not reach it; adding IPC +
  renderer roughly doubles the ticket.) Q1/Q2/Q4 are answered.
- **DOC-007** — split into pipeline vs content? and is the proposed 20-chapter
  table of contents right? GUI-074 has merged, so its FRD-024 conflict is settled.
- **GUI-068** — cannot reach `done`: needs a real release cut, a human, screenshots.

## Left HZN-003 by operator decision

**MCP-005 and MCP-008 were dropped from the horizon.** MCP-005's premise did not
survive measurement — the lock comes from `command` (the Electron binary), not the
`.cjs`, so relocating the script fixes nothing; the real fix is relocating a
191.98 MB runtime. `stopMcpSessions()` holds the line meanwhile. Research stays on
both tickets.

## Filed during this run

In HZN-003: **SKILL-018** (`kanmer-report` YAML breaks Antigravity's parser, 11/12
skills load), **MCP-013** (marketplace root — `claude plugin marketplace add` fails
outright and `connect.ts:152` swallows it), **GUI-083** (`.agents/skills/` and
`.agents/mcp_config.json` are neither tracked nor ignored, so a full skills tree
sits untracked in this repo now).

Outside HZN-003: **GUI-081** (FRD-024 R4's gate-block "?" never implemented),
**GUI-082** (mis-scoped selector audit), **MCP-014** (grok to plugin),
**MCP-015** (Antigravity to plugin + dispatch).

## Two findings that outlived their tickets

**1. Connect writes a stale v2 AGENTS.md block — caught in the act.** During this
run an agent ran Connect against this repo and `git status` showed `M AGENTS.md`,
replacing the format-3 block with v2 text: seven stages, `impact.md`, and the
deleted `-import` skill. Source is `apps/gui/src/main/agentsBlock.ts:11-24`, which
`connect.ts:18` imports. Reverted; diff saved to the scratchpad as
`agents-md-v2-regression.patch`. **SKILL-013 owns the fix**, because it owns the
canonical block body. CORE-023 keeps detection and may cite this as its motivating
case. Three copies of the block exist: `scripts/agents-block.mjs`,
`kanmer-setup/SKILL.md`, and the stale `agentsBlock.ts`.

**2. Antigravity: Connect writes the right files and nothing ever reads them.**
Settled by adjudication after GUI-073 and MCP-009 contradicted each other — 10
runs, positive controls, corroborated by the probe server's own process log.
`.agents/skills/` and `.agents/mcp_config.json` ARE read, but only in a session
with a **bound workspace folder**. Bare `agy` binds to `default-cli-project`, whose
record is `"projectResources": {}` — no folder. `--new-project`, `--project <id>`,
and `--add-dir <path>` all bind; the last persists nothing. **Kanmer establishes no
binding today**, so the correct files are inert.

Three traps recorded for anyone probing a host CLI: workspace **trust is not the
gate**; a **git root does not auto-bind**; and **a workspace MCP server never
appears as a named tool** — it surfaces as `call_mcp_tool` / `list_resources` /
`read_resource`, so grepping a tool list for the server's own tool name is a false
negative even when it is connected. That last one produced MCP-009's wrong
conclusion and is going into ADR-0009 as a worked example: **verify the mechanism,
not a proxy for it.**
