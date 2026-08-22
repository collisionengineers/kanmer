# Plan — GUI-107

## Outcome

TicketCreate and Editor will expose the same custom-profile inline requirements editor. A ticket-form user can enter a comma-separated list for each resolved stage boundary; the renderer validates the draft against the live document/proof/environment vocabulary; and create/update callbacks receive the existing core requires map. Non-custom profiles keep the current form and do not submit inline requirements.

## Design

1. Add a small renderer helper/component in the GUI scope that converts the core-shaped map to editable boundary strings and back, calls the existing profileDraft parser/validator mirror, and reports keyed validation errors. It will not change Settings profile editing or core validation.
2. Resolve vocabulary from ProjectClient.getDocModel() plus the selected board's deployment environments. Keep a safe empty/fixed-stage fallback only for loading/test resilience; production data comes from the resolved model. The model's boundaries, doc types, and proof types remain authoritative.
3. In TicketCreate, keep a local requires map, load vocabulary, render the custom-only editor, block submit on validation errors, and include requires (including an empty map) only when profile is custom.
4. In Editor, include requires in the snapshot, dirty/conflict comparison, live resync, and update patch. Render the same custom-only editor and send the validated map when the requires field is changed while custom. Ordinary ticket fields and concurrency behavior remain unchanged.
5. Add focused component/helper tests for visibility, valid callback payloads, invalid values, empty-boundary pruning, parser-order inputs, and non-custom behavior. Keep the existing profileDraft test suite green.

## Validation and safety

- Core remains the final authority and receives the same Record<string, string[]> map it already validates.
- Renderer validation rejects unknown boundaries, document/pseudo types, proof suffixes, and environments before IPC. No catch-all suppression is added; callback failures continue through existing form/editor error paths.
- No new dependency, IPC channel, core profile vocabulary, board profile semantics, or Settings UI change.
- Manual Electron visual interaction/screenshot is not available in this run and will be marked INCONCLUSIVE in the report.

## Verification

- Focused GUI tests covering the custom form/editor and helper.
- Full GUI Vitest suite and root test suite.
- Root all-workspace typecheck.
- GUI production build and git diff --check.
- Inspect final diff for GUI-107-only scope, update checklist/report, push a branch and open a PR, then stop at Review for independent review.

## Governing docs

- docs/functional/frd/FRD-002-requirement-profiles.md — existing inline custom requirements contract.
- GUI-007 and GUI-008 are linked context only; their Settings/editor history is not a source for additional scope.
