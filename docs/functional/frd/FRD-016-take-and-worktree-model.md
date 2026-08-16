---
status: approved
covers: shipped execution model (backfill)
---

# FRD-016 — Take & worktree execution model

What makes parallel agents safe: every taken ticket works in its own checkout.

- R1. `take_ticket` records `taken_at`, `branch`, `worktree` on the ticket; releasing clears them; `force` semantics exist for stale takes and are surfaced, never silent.
- R2. The execute skill's **first action** is creating `.worktrees/<ID>` + a branch and taking the ticket with them — one worktree per ticket means conflict-free parallelism (kanmer-auto's lanes depend on it).
- R3. `.worktrees/` is gitignored by setup; dispatch (FRD-010) spawns agents at the repo root and never pre-creates worktrees — the skill owns that.
- R4. Cards show a taken badge (who/where); the board's take/release verbs exist in the palette and context menu; stale takes are groom's business.
- R5. Closeout removes the worktree and branch **after** records (`commits`/`prs`/`deployment`) are written — record-keeping first, cleanup second.

**Acceptance (as-built):** take/release round-trip with frontmatter proof; two tickets executed in parallel touch disjoint worktrees; closeout leaves no `.worktrees/<ID>` behind.

Related: FRD-010 · FRD-023 (execute/closeout skills) · baseline architecture doc.

## Verified against code — Phase 0.2

- R1 — `taken_at`/`branch`/`worktree` on `ItemFrontmatterSchema` `core/types.ts:218-254`;
  `takeTicket` writes them and clears on release `core/store.ts:789-825`; `force` is an explicit
  input field `core/types.ts:348-358` and surfaced on the tool `mcp-server/src/index.ts:570`.
- R2 — the execute skill creates the worktree and branch first
  `plugins/kanmer/skills/kanmer-execute/SKILL.md:23-40`.
- R3 — `.worktrees/` gitignored by setup `apps/gui/src/main/kanmerGit.ts:79` and in this repo's own
  `.gitignore`; dispatch spawns at the source root and pre-creates nothing, with the rule stated in
  its docstring `apps/gui/src/main/dispatch.ts:71-72,107-112`.
- R4 — taken badge `Board.tsx:341-351`; take/release verbs in the palette `App.tsx` and the card
  menu `main/index.ts:467-528`.
- R5 — records before cleanup `plugins/kanmer/skills/kanmer-closeout/SKILL.md` and its
  `assets/closeout-checklist.md:15`.
