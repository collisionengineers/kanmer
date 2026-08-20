# Plan — GUI-087

## Approach

Keep the authoritative core/MCP error messages unchanged and translate only failed move messages at the GUI boundary. Make the pure formatter testable, recognize the actual `cannot move from` gate prefix, and replace agent-only recovery instructions with the existing Ticket-tab/readiness-panel affordances. Update the manual to state the same human-facing behavior, then regenerate its bundled chapter artifact.

## Governing docs

- This `fix` ticket is intentionally marked `docs_todo: true`; no new product, functional, or architecture governing document is needed for a presentation-only defect repair.
- [[DOC-007]] governs the nearby manual intent and identifies this follow-up; it is not a code requirement to alter.

## Steps

1. Extract or export the pure gate-error formatter from `App.tsx` into a testable renderer location, preserving its use from the shared move-failure path.
2. Match current core gate-rejection shapes (the `cannot move from` prefix) and translate tool-call tails into concise human actions: use the ticket document tab and its readiness panel; preserve useful requirement/detail text and leave unrelated errors unchanged.
3. Add focused unit coverage with literal messages shaped like `packages/core/src/store.ts`: missing-document (including questions-resolved detail), multi-boundary jump, and non-gate pass-through. Assert the human result changes and contains neither `set_ticket_doc` nor `get_doc_gates`.
4. Revise `docs/manual/gates.md`'s wording note and any affected examples so it accurately describes the banner and Ticket-tab recovery route.
5. Run `npm run build:manual` to regenerate `chapters.generated.ts`; verify it is fresh, then run focused GUI/manual tests and the appropriate GUI typecheck.

## Verification

- Focused formatter tests pass against current core-shaped strings.
- The formatter’s output for both gate forms is human-facing and contains no MCP tool names.
- `npm run build:manual -- --check` reports the generated manual is current after regeneration.
- GUI test/typecheck commands selected from package scripts pass.

## Risks / questions

- Core text could change again. Literal core-shaped tests make such drift observable rather than silently returning raw text.
- Keep the UI copy short enough for the existing error banner; do not duplicate the readiness panel’s full diagnostic content.
- No user decision is needed: the ticket’s recommended GUI-local approach is the narrower, safer choice.
