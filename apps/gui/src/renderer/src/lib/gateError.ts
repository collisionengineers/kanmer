/** Translate core's agent-oriented gate recovery text for the GUI banner. */
export function friendlyGateError(message: string): string {
  if (!/\bcan(?:not|'t) move from\b/.test(message)) return message;

  if (message.includes("in one step:")) {
    return message.replace(
      /\. Call get_doc_gates for the full picture\.$/,
      ". Move one stage at a time; the readiness panel at the top of the Ticket tab shows the next allowed step.",
    );
  }

  return message
    .replace(
      "Write the missing document(s) with set_ticket_doc",
      "Open the ticket's document tabs to add the missing requirement",
    )
    .replace(
      ", or link a governing doc via refs / set docs_todo",
      ", or update the ticket's governing-document setting",
    )
    .replace(
      "Call get_doc_gates for the full picture.",
      "The readiness panel at the top of the Ticket tab shows the full picture.",
    )
    .replace(/\.md is missing/g, " is missing");
}
