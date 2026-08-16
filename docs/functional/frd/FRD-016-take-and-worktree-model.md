---
status: draft
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
