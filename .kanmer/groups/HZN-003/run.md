# Auto run — HZN-003

target: **closeout** (every ticket to `done`)
started: 2026-08-16
operator rule: complete every ticket; the only stop is an operator-only question.

## Resume procedure

Read this file before scoping anything. If any row is not `done`, adopt this
table rather than re-deriving a roster — re-scoping loses the lane partition and
every operator answer recorded below.

**Every ticket's settled decisions live in its own folder**, not here:
`scratch/scheduling.md` = orchestrator calls, `scratch/operator-answers.md` =
the operator's. A ticket agent reads those two files and does not re-open them.

## Board-wide policy set during this run

**`proof:visual` — agent-rendered evidence counts, on one condition.** The
operator's words: *"Agent rendered evidence counts, as long as the image is
actually reviewed using vision."* Read literally: measuring geometry is a
measurement, not a visual review. The agent must open the PNG with the `Read`
tool, actually see it, and describe in `proof.md` what it shows in words that
could not have been written from the numbers alone. Numeric assertions stay as
the regression guard; the viewing is the proof.

## Roster — 23 open of 28 (5 done before this run)

Done before this run: GUI-067, GUI-078, SKILL-011, SKILL-012, SKILL-014.

| ticket   | prof | lane | state | note |
|----------|------|------|-------|------|
| MCP-010  | feat | A    | **in flight** | plan→closeout running. Root cause; blocks MCP-011 |
| GUI-069  | fix  | C    | **in flight** | plan→closeout running. Blocks GUI-070 |
| GUI-074  | chore| E    | **in flight** | plan→closeout running. Blocks DOC-007 |
| GUI-072  | fix  | —    | **in flight** | plan→closeout running. CSS-only, file-disjoint |
| GUI-080  | fix  | B    | **in flight** | plan→closeout running. Blocks GUI-079 |
| MCP-012  | feat | A    | ready, queued | answers recorded; waits for MCP-010 (same `index.ts`) |
| MCP-007  | fix  | A    | ready, queued | answers recorded; no file overlap with A's head |
| MCP-006  | feat | A    | ready, queued | `questions-resolved` already satisfied; `index.ts` — same lane |
| SKILL-018| fix  | —    | ready | NEW this run, see below |
| GUI-079  | fix  | B    | **awaiting operator** | 3 open (Q1 answered) |
| GUI-065  | fix  | —    | **awaiting operator** | devDependency question |
| GUI-066  | fix  | —    | **awaiting operator** | demote-release question (severity answered) |
| GUI-070  | fix  | C    | **awaiting operator** | PRD amendment + FRD status precedent |
| GUI-071  | fix  | C    | **awaiting operator** | do tab counts respond to filters |
| GUI-073  | fix  | B    | **awaiting operator** | premise refuted — see below |
| CORE-023 | feat | A    | **awaiting operator** | 4 open; `index.ts`, same lane as MCP-012 |
| SKILL-013| feat | —    | **awaiting operator** | 2 open; grew a second half |
| DOC-007  | feat | E    | **awaiting operator** | 4 open; split proposed |
| MCP-005  | feat | D    | **awaiting operator** | premise refuted — see below |
| MCP-008  | feat | D    | **awaiting operator** | blocked by MCP-005; needs a human acceptance test |
| MCP-009  | feat | B    | researching | still running |
| MCP-011  | fix  | A    | held | research deferred until MCP-010 lands, by design |
| GUI-068  | chore| —    | **parked** | needs a real release cut + a human + screenshots |

## Two tickets whose premise research refuted

- **MCP-005** — "ship the MCP server outside the install directory" **fixes
  nothing as written.** The lock comes from `command`, not the script:
  `serverInvocation` sets `command = process.execPath`, so the process sits in
  `$INSTDIR` whatever `args[0]` says. Proven on this machine — `.mcp.json`
  already points at a source-tree `.cjs` and GUI-064's probe still found the lock.
  The real work is relocating the **runtime**: minimal payload measured at
  `Kanmer.exe` + `icudtl.dat` + `v8_context_snapshot.bin` = **191.98 MB**.
- **GUI-073** — Antigravity's `dispatch: false` is **refuted**, not just its
  register-only label. `agy -p` piped correctly on 1.1.13. And the real gate on
  project MCP/skills is **project binding**, not trust. ADR-0009's "one write
  serves both opencode and Antigravity" was verified true.

## Filed during this run, deliberately not folded in

- **SKILL-018** (in HZN-003) — `kanmer-report/SKILL.md:3` has an unquoted `": "`
  in its YAML description; Antigravity's parser rejects it and loads **11 of 12**
  skills, silently. Found by running the real `agy` CLI, not by reading the file.
- **GUI-081** (outside HZN-003, so 0.3.3 scope stays fixed) — FRD-024 R4's
  gate-block "?" affordance was never implemented at all.

## Awaiting operator

- **GUI-068 — cannot reach `done` in this run.** Needs an update *from* 0.3.2 *to*
  a release that does not exist yet, a human-screenshotted refusal dialog, and
  respawn timing on a live install.
- **MCP-008 O6 — same shape.** "An `.mcpb` installs into Claude Desktop and
  connects to a chosen project root" is a human test on a real Claude Desktop
  install. It cannot be automated here or performed by an agent.
- The eleven rows marked *awaiting operator* above. Their questions are written
  verbatim in each ticket's `open-questions` document.
