# Plan — GUI-108

## Governing docs

- `docs/functional/frd/FRD-002-requirement-profiles.md` §S2/G4: get_doc_gates remains authoritative and the GUI names the blocked boundary and missing requirement.
- `docs/functional/frd/FRD-006-typed-proof.md` §R4: warnings remain distinct from hard blockers; this change only reports an actual rejected move.
- Existing GUI-009/GUI-023 history supplies the established readiness/editor interaction and the anchored recovery intent; no new governing document is required for this bounded presentation fix.

## Steps

1. Make the Board move callback carry the existing drop coordinates for both card and empty-column drops without changing the client contract.
2. Add a pure mapper for the current gate-rejection shape. Recognize one target boundary at a time, retain all missing requirements, map document-backed requirements to the existing editor document types, and return null for unrelated/ambiguous errors.
3. In the shared App move failure path, refresh the ticket, ask the existing `getGateStatus` channel for authoritative reasons, and show an anchored popover with the target stage, boundary, missing requirements, and Open-document action. Preserve rollback and the existing friendly fallback for non-gate errors.
4. Route the action through Editor's existing ticket document selection/create affordance. Do not add an MCP or renderer-side document writer.
5. Add focused deterministic tests for mapper branches, anchor forwarding, and initial missing-document selection; style the feedback in light/dark themes.
6. Run focused tests, full GUI tests, GUI typecheck/build with the branch's core resolution where the shared checkout is stale, manual freshness, and diff checks. Record failures exactly and leave visual packaged evidence INCONCLUSIVE.

## Risks and mitigations

- Core wording drift: tests use the current store-shaped gate messages and unrecognised text keeps the old error path.
- Missing document type mapping: the popover can still open the Ticket tab when a named requirement has no direct editor tab.
- Drop anchor outside the viewport: CSS clamps coordinates to keep the action visible.
- Existing shared checkout has a stale `@kanmer/core` resolution: retain the first standard-command failure and separately run branch-local source/build checks without altering shared dependencies.
