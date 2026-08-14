/**
 * The canonical "take this ticket and work it" instruction text. Shared by the
 * MCP `take-ticket` prompt and the GUI dispatch runner (Phase 7) so the two
 * never drift. The skills (Phase 8) own the surrounding workflow; this is just
 * the one-shot brief handed to an agent.
 */
export function takeTicketPromptText(id: string): string {
  return (
    `Take Kanmer ticket ${id} and work it: call get_item to read it, take_ticket ` +
    `(with the real branch and worktree you'll work on), then follow the document ` +
    `pipeline with get_ticket_doc/set_ticket_doc — research.md and impact.md first, ` +
    `write plan.md from them, derive checklist.md, work the checklist (append ` +
    `progress notes), write the post-implementation-report, and write proof.md with ` +
    `real evidence before moving the ticket to the final stage and releasing it. ` +
    `Call get_doc_gates to see which documents each stage transition requires.`
  );
}
