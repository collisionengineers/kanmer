# Phase 0 — Baseline: the current (undocumented) architecture

**Goal:** write down the architecture the v2 phases build on. After kanmer-upgrades Phase 8 shipped, the codebase kept moving — the single `kanmer-workflow` skill was split into a 12-skill roster with a worktree-per-ticket execution model, and an auto-update feature landed on a branch — **with no plan doc describing any of it**. This file is that missing baseline. It changes no code; it exists so Phases 1–8 have a written starting point and so the audit's loose ends are tracked in one place.

**Depends on:** nothing. **Feeds:** every later phase (they modify what's described here).

## The skill roster today (12 skills)

The load-bearing design property is **one skill per board transition** — an agent picks a skill by "what am I about to do to this ticket." Current roster (`plugins/kanmer/skills/`):

| Skill | Role |
|---|---|
| `kanmer-tickets` | Ticket CRUD + the tool reference (`references/tool-reference.md`) + ticket template. The router other skills point back to. |
| `kanmer-research` | `research.md` + `impact.md` phase. |
| `kanmer-plan` | `plan.md` + `checklist.md` phase. |
| `kanmer-execute` | Worktree/branch, work the checklist, `proof.md`, open the PR. |
| `kanmer-review` | Proof-vs-evidence review; turns PR feedback into PR-Review-area tickets. |
| `kanmer-closeout` | Post-merge: final stage, remove worktree/branch, release. |
| `kanmer-auto` | Clear an area via parallel subagents in conflict-free waves. |
| `kanmer-standup` | Fact-based board report from the activity log + summaries. |
| `kanmer-retro` | Look-back digest: shipped, cycle time, stalls. |
| `kanmer-groom` | Board-editing triage: dedupe, split, archive, fields. |
| `kanmer-import` | GitHub issues / PR comments → tickets, idempotent. |
| `kanmer-setup` | Greenfield / brownfield / upgrade setup + AGENTS.md managed block. |

## The worktree-per-ticket execution model

`kanmer-execute` creates `.worktrees/<id>` + a branch as its first action and records them on the ticket via `take_ticket` (frontmatter `branch`/`worktree`/`taken_at`). This is what makes parallel work conflict-free: each ticket lands in its own worktree, so `kanmer-auto` can run several tickets at once as long as they're in different areas/files. `.worktrees/` is gitignored by setup. **Phase 7 (dispatch) must respect this** — a background dispatch does *not* pre-create a worktree; it spawns the agent at the repo root and lets the skill own worktree creation.

## Other undocumented in-flight work

- **`origin/updater-implementation`** (unmerged): an electron-updater auto-update feature (GitHub Releases publish, MCP-session-aware restart gating). Not part of v2 scope, but noted so v2's GUI/packaging work (Phases 5–7, `electron-builder.yml`) doesn't collide with it.

## Loose ends carried forward (from [`../../implementation-audit.md`](../../implementation-audit.md))

These predate v2. The audit's outstanding findings are tracked here in one place; items marked with a phase are now explicitly closed by v2:

- **Silent data loss on project switch (audit A1)** — `openProject()` bypasses the `trySelect` unsaved-edit guard (`App.tsx:83`), so Ctrl+O / Open Recent mid-edit discards changes with no prompt. **Fixed in Phase 3** (routed through the dirty guard — not deferred to Phase 5).
- **Missing `blocked` card badge (audit A2)** — promised by kanmer-upgrades Phase 7; only the `taken` badge shipped. Data fully wired. **Added in Phase 3** alongside the new deployment/PR badges.
- **Column-removal stranding (audit A3/E19)** — the MCP `remove_column` refuses while items reference a column, but the GUI whole-board `setBoard` can still drop an in-use column; items fall back to `mergeColumns` on read and writes to the dropped id are rejected. **Fixed in Phase 4** (the Settings save path gains the same occupied-column protection).
- **Untested code paths (audit B4/B5)** — MRTR elicitation confirm/decline is never exercised (`smoke.mjs` never advertises the capability) and resources/`subscriptions/listen` has no notify assertions. **Covered in Phase 2's smoke rewrite.** The older-protocol back-compat check (B5's second half) remains open.
- **AGENTS.md managed block unverified (audit B6)** — writing it is skill prose only. **Becomes unit-testable in Phase 6** via the shared block-writer helper.
- **TICK-prefix double-alloc edge** — two concurrent creates sharing the fallback prefix in different undeclared areas could double-allocate a number (per-file exclusive-create lock). Accepted edge; not in v2 scope.
- **Deferred `ttlMs`/`cacheScope`** on `tools/list` — awaits SDK support.
- **Never-built:** npm-published server (`npx @kanmer/mcp-server`), marketplace directory submissions, a GUI agent-presence indicator (Phase 7's Dispatches drawer partially covers the last).

## What v2 changes about this baseline (forward pointers)

- The 12-skill roster becomes **13** — `kanmer-verify` (Verifying stage) and `kanmer-docs` (PRD/FRD/ADR governance) are added; `kanmer-standup` + `kanmer-retro` merge into `kanmer-report` (Phase 8).
- The fixed 5-doc pipeline becomes **per-area configurable with a hierarchy and hard gates** (Phase 1).
- The single proof gate generalizes but **keeps its before-`done` boundary** (verification evidence gathered on merged main); a new **`post-implementation-report` gate guards `review`** (the reviewers' brief), and a governing-doc (PRD/FRD/ADR) gate guards leaving `backlog` (Phase 1).
- `kanmer-execute`/`kanmer-closeout` start recording `commits`/`prs`/`deployment` on the ticket (Phases 1, 8).
