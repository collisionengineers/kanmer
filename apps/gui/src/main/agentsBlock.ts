// The kanmer AGENTS.md managed block, as pure functions the Connect flow can
// add, refresh and remove — and unit-test (audit B6, previously enforced by
// skill prose only). Mirrors scripts/agents-block.mjs (kanmer-setup's copy);
// Phase 8 reconciles the two on one canonical body.

export const START =
  "<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->";
export const END = "<!-- kanmer:instructions:end -->";

/** The managed block's body — kept in step with scripts/agents-block.mjs. */
export const BLOCK_BODY = `# Kanmer operating instructions

This repo's work is tracked on a Kanmer board in \`.kanmer/\`.

- Start every session with \`get_status\`, then \`list_board\` / \`list_items\` to find your ticket.
- Work each ticket on its own branch and worktree: worktree \`.worktrees/<id>\`, branch \`<id>-<slug>\`; \`take_ticket\` records both and moves the stage.
- Follow the doc pipeline in the ticket's folder: research.md + impact.md → plan.md → checklist.md → proof.md.
- proof.md is required before a ticket can reach the final stage.
- Add progress notes with \`set_ticket_doc\` (append: true) — don't rewrite whole documents to add a line.
- When the PR merges, close out: proof → final stage → outcome → remove worktree → delete branch → release last.
- Archive, don't delete. Reference other items with [[ID]] wiki-links.
- The kanmer plugin's skills cover each phase: kanmer-tickets (manage), -research, -plan, -execute, -review, -closeout, -auto, -standup, -retro, -groom, -import, -setup.`;

/**
 * Insert or refresh the managed block. Pure: takes the file's current text
 * (`null` when absent) and returns what it should have. Same four rules as
 * scripts/agents-block.mjs — block-at-byte-0 when new, replace-span-only when
 * present, throw on a malformed half-marked file.
 */
export function applyManagedBlock(
  existing: string | null,
  blockBody: string = BLOCK_BODY,
  opts: { stubHeading?: string } = {},
): string {
  const block = `${START}\n${blockBody}\n${END}`;
  if (existing === null || existing === undefined) {
    return `${block}\n\n${opts.stubHeading ?? "# Contributor guide"}\n`;
  }
  const startAt = existing.indexOf(START);
  const endAt = existing.indexOf(END);
  if (startAt === -1 && endAt === -1) return `${block}\n\n${existing}`;
  if (startAt === -1 || endAt === -1 || endAt < startAt) {
    throw new Error(
      "AGENTS.md has a malformed kanmer:instructions block — fix or remove the markers by hand.",
    );
  }
  return existing.slice(0, startAt) + block + existing.slice(endAt + END.length);
}

/**
 * Remove the managed block, restoring the surrounding text. When the block was
 * the whole file (block + stub heading) the result is `null` (delete the file).
 * A file with no markers is returned unchanged.
 */
export function removeManagedBlock(existing: string): string | null {
  const startAt = existing.indexOf(START);
  const endAt = existing.indexOf(END);
  if (startAt === -1 || endAt === -1 || endAt < startAt) return existing;
  const before = existing.slice(0, startAt);
  const after = existing.slice(endAt + END.length);
  const rest = (before + after).replace(/^\s+/, "").replace(/\s+$/, "");
  return rest.length === 0 ? null : `${(before + after).replace(/^\n+/, "").trimEnd()}\n`;
}
