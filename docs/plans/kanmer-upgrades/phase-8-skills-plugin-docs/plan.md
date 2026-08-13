# Phase 8 — Skills, plugin, docs

**Goal:** rewrite the agent-facing guidance around the v2 ticket lifecycle, ship `kanmer-setup` (greenfield / brownfield / upgrade) including the AGENTS.md operating-instructions block, and keep the plugin bundle + docs in sync. Runs continuously alongside Phases 1–7; finalized last.

**Depends on:** tool surface from Phases 1–6.

## Items

### 8.1 `kanmer-workflow` rewrite — M
- **Where:** `plugins/kanmer/skills/kanmer-workflow/SKILL.md` + `assets/` + `references/tool-reference.md`.
- Ticket-centric lifecycle: `get_status` first (confirm root/format) → pick ticket → `take_ticket` (records taken_at/branch/worktree, moves stage) → write `research.md` + `impact.md` (the files-to-change survey) → write `plan.md` FROM them → derive `checklist.md` → work the checklist, appending progress via `set_ticket_doc append` → write `proof.md` (evidence: test output, screenshots, diffs) → move to done (proof gate enforces it) → `take_ticket action:release`.
- Templates in `assets/` for all five docs (`research-template.md`, `impact-template.md`, `plan-template.md`, `checklist-template.md`, `proof-template.md`); retire the plan/research item templates.
- Guidance: pass `expected_updated` when rewriting ticket bodies; prefer `set_ticket_doc append` for notes; archive don't delete.

### 8.2 `kanmer-onboard` → `kanmer-setup` (three modes) — M
- **Where:** rename `plugins/kanmer/skills/kanmer-onboard` → `kanmer-setup`; update both plugin manifests if they enumerate skills.
- Mode detection via `get_status` (format version, whether `.kanmer` existed):
  - **greenfield** — brand-new repo: propose areas from intended structure (always including PR Review), set prefixes, seed the board with `create_items`.
  - **brownfield** — in-progress repo, no kanmer: mine the codebase (structure, TODOs, FIXMEs) to propose areas + a starter backlog; bulk-create; link related tickets.
  - **upgrade** — kanmer present but old format/version: run the migration (dry-run → report → confirm → migrate), verify with `get_status`, summarize what moved.
- **AGENTS.md operating instructions (all three modes):** ensure the target repo's `AGENTS.md` begins with a managed block — the very first thing in the file:

  ```markdown
  <!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->
  # Kanmer operating instructions
  This repo's work is tracked on a Kanmer board in `.kanmer/`.
  - Start every session with `get_status`, then `list_board` / `list_items` to find your ticket.
  - Take a ticket before working: `take_ticket` records the time, branch, and worktree, and moves the stage.
  - Follow the doc pipeline in the ticket's folder: research.md + impact.md → plan.md → checklist.md → proof.md.
  - proof.md is required before a ticket can reach the final stage.
  - Add progress notes with `set_ticket_doc` (append) — don't rewrite whole documents to add a line.
  - Archive, don't delete. Reference other items with [[ID]] wiki-links.
  <!-- kanmer:instructions:end -->
  ```

  Rules: if `AGENTS.md` is missing, create it with the block + a stub heading for the repo's own content. If present, insert the block above everything else. Upgrade mode refreshes only the content **between the markers** (idempotent — never touches the rest of the file). If a `CLAUDE.md` exists that doesn't reference `AGENTS.md`, add a one-line pointer to it.

> **Amended by the PR #2 review remediation:** A8 — these were model instructions with nothing behind them. They are now implemented by `scripts/agents-block.mjs` (which the skill calls) and verified end-to-end by `scripts/verify-agents-block.mjs`.

### 8.3 `kanmer-standup` rewrite — S
- **Where:** `plugins/kanmer/skills/kanmer-standup/SKILL.md`.
- Facts over heuristics: `get_activity since:<yesterday>` for what actually happened (moves, takes, actor attribution); `list_items updated_since/sort:updated_desc` for the current picture; Blocked from derived `blocked`; Overdue from `due`; In flight shows branch/worktree from taken fields. Surface `list_items` warnings if present.

### 8.4 Release rail (every tool/behavior change in any phase)
1. Code + tests (`packages/core` vitest, `packages/mcp-server/src/smoke.mjs`).
2. Tool-reference row per new/changed tool — `scripts/check-plugin-sync.mjs` gates names (rows must sit above the `## Field semantics` heading); reflect param changes in the Key-params column even though only names are gated.
3. Affected SKILL.md updates.
4. `npm run build && npm run plugin:build` — the committed `plugins/kanmer/mcp/kanmer-mcp.cjs` compiles core in, so **even core-only fixes need a rebuild** — then `npm run plugin:check`.

### 8.5 Repo docs — S
- **AGENTS.md:** §4 data model → v2 (layout, doc pipeline, taken, proof gate, versioning); fix the stale `phases` mention in the §folder-layout block (~line 137); shrink §11 known-limitations as items land; note the exclusive-create decision (replaces the lockfile suggestion).
- **README.md:** v2 layout + doc pipeline for end users; fix the hardcoded `C:/Users/Alex/...` path in the manual-registration examples (~lines 141–148); document `kanmer-setup` modes and the AGENTS.md block.

> **Amended by the PR #2 review remediation:** A7 — the README was fixed but `examples/codex-config.toml` still carried the hardcoded `C:/Users/Alex/...` path on two lines. Now `<kanmer-repo>`, matching the README.

- **This roadmap:** check off phases as they land.

## Verification
- Fresh scratch repo, plugin installed: `kanmer-setup` greenfield creates the board, seeds tickets, and `AGENTS.md` starts with the managed block; running it again changes nothing (idempotent).
- Repo with an existing `AGENTS.md`: block lands at the very top, existing content untouched; upgrade mode refreshes only between markers.

> **Amended by the PR #2 review remediation:** A8 — these end-to-end cases were never run. `scripts/verify-agents-block.mjs` runs them (and four more, including the malformed-marker negative) on every invocation.

- v1 fixture repo: upgrade mode migrates and reports accurately.
- Full lifecycle driven by `kanmer-workflow` in Claude Code: take → research/impact → plan → checklist → proof → done, GUI mirroring live; `npm run plugin:check` green at the end of every phase.
