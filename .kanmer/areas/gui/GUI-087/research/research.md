# Research — GUI-087

## Question

Why do document-gate refusals in the GUI expose MCP tool names, and what is the smallest safe fix?

## Findings

- `App.tsx` calls `friendlyGateError(message)` after a failed board move, but the helper returns immediately unless the message contains `"document gate(s) unmet"`.
- The current core refusals in `packages/core/src/store.ts` instead begin `<id> cannot move from ...`. The missing-requirements form then tells agents to use `set_ticket_doc` and `get_doc_gates`; a direct jump across boundaries also ends with `get_doc_gates`.
- Therefore the helper is invoked but dead for every current gate shape. The red GUI banner displays MCP-oriented recovery text to a person who cannot invoke those tools.
- The core wording is intentionally useful to MCP agents, so changing it would widen scope and risk regressions in agent workflows. The local GUI adapter is the correct ownership boundary.
- The helper needs to recognize the real shared prefix, rewrite both the missing-requirements and multi-boundary tails into GUI actions, and leave non-gate errors intact. The questions-resolved detail should remain human-readable while replacing the tool-call instruction.
- There is no focused test for this formatter. To prevent another stale sentinel, make the formatter independently testable (prefer a small renderer lib module) and test it with strings shaped exactly like the current `store.ts` errors, including both refusal forms.
- `docs/manual/gates.md` currently tells readers that they will see `set_ticket_doc` and `get_doc_gates`. That wording must change with the GUI. `scripts/build-manual.mjs` generates the committed renderer artifact `apps/gui/src/renderer/src/manual/chapters.generated.ts`; regenerate it rather than hand-editing it.
- [[DOC-007]] identified this follow-up while writing the manual gates chapter. Its own work is done; it is only a historical/intent link.

## Implications

Keep core and MCP behavior unchanged. Implement the presentation rewrite and its unit tests in the GUI, update the user manual so it describes the new banner, regenerate the manual artifact, and run the focused renderer/manual tests plus the manual freshness check.

## Open questions

None.
