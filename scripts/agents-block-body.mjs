// The canonical AGENTS.md managed block — the ONE body, imported by every
// surface that writes one. Pure data: no imports, no side effects, no
// `import.meta`, so it is safe to bundle into the Electron main (built as CJS)
// as well as to run directly under Node.
//
// It lives alone in its own module because it used to live in three places.
// `scripts/agents-block.mjs` (the writer kanmer-setup calls) and
// `apps/gui/src/main/agentsBlock.ts` (the GUI's Connect flow) both re-export from
// here, so those two can no longer disagree. They had: the GUI copy was still a
// v2 body — seven stages, `impact.md`, a skill that no longer exists — and
// Connect wrote it into real repositories, overwriting the current one
// (SKILL-013; detection is CORE-023).
//
// The third copy is the fenced block in
// `plugins/kanmer/skills/kanmer-setup/SKILL.md`, and it cannot import anything:
// it is prose shipped to plugin users who do not have this repo checked out.
// `scripts/verify-agents-block.mjs` asserts it matches this body byte for byte.

export const START =
  "<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->";
export const END = "<!-- kanmer:instructions:end -->";

/** The managed block's body — everything between the two markers. */
export const BLOCK_BODY = `# Kanmer operating instructions

This repo's work is tracked on a Kanmer board in \`.kanmer/\`. In a Git repo set up
through the GUI the board lives in its own worktree, \`.worktrees/kanmer\`, on the
board branch, and MCP is already rooted there — never create, switch or push that
branch yourself. Your own ticket worktree is a separate thing, recorded by
\`take_ticket\`.

- Start every session with \`get_status\`, then \`list_board\` / \`list_items\` to find your ticket.
- **Which documents a ticket needs depends on its profile, not on a fixed pipeline.** Call \`get_doc_gates <id>\` before every move. Not \`board.yml\` — requirements are injected at resolve time, so its \`profiles:\` block is not the effective set.
- Stages: backlog → preparing → implementing → review → verifying → done. **A move crosses at most one gated boundary**, so walk the stages one at a time; a jump is refused even when every document exists.
- **Gates constrain \`move_item\` and nothing else** — creation in any stage is ungated, and \`gh pr merge\` is outside the engine, so an unmet gate never stops a merge.
- An unticked \`- [ ]\` in \`open-questions/\` blocks a move: tick it, or move it below the literal \`## Parked (explicitly deferred)\` with a reason.
- Read the whole ticket folder before starting — documents are folders (\`research/\`, \`plan/\`, …), so there may be several files per type. If the ticket is in a group, read the group's \`context.md\` too: the constraint binding the batch is written once, there.
- Work each ticket on its own branch and worktree: worktree \`.worktrees/<id>\`, branch \`<id>-<slug>\`; \`take_ticket\` records both and moves the stage.
- Write pipeline documents with \`set_ticket_doc\`. Running notes go to \`append_scratch\` — scratch is the notepad and is never gated, and neither is anything under \`reference/\` or \`assets/\`.
- Proof is written on merged \`main\`, after review and the merge, not before.
- Archive, don't delete. Reference other items with [[ID]] wiki-links.
- Skills run in this order: kanmer-tickets → -research → -plan → -execute → -review → -verify → -closeout. How far a ticket walks it depends on its profile, so ask \`get_doc_gates\` rather than assuming every step. Off to the side: -auto (drives that order over many tickets), -docs (governing docs), -groom (fix the board), -report (read-only), -setup (reconcile after a Kanmer update).
- Each skill ends by naming what comes next — read that line before improvising a hand-off.`;
