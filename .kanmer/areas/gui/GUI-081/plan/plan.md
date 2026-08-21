# Plan — GUI-081: amend FRD-024 after withdrawing gate-block help

## Approach

Make a single, historical-but-normative amendment to FRD-024. Replace the stale R4 requirement with a concise withdrawal statement that accurately distinguishes the two clauses: GUI-074 removed the once-shipped Settings help control, while GUI-081 withdraws the separate gate-block control because it was never implemented. State the consequence—no contextual manual-help affordance—and retain the actual F1/Help entry points. Delete the acceptance criterion that asserted the never-built feature and renumber the remaining criteria.

This is safer than building a new GUI control (contrary to the owner decision) or simply deleting R4/AC3 without explanation (which would erase the product decision and make the absence look accidental).

## Governing docs

- `docs/functional/frd/FRD-024-in-app-manual.md` is the linked governing document and is intentionally amended under the owner decision recorded in this ticket.
- `docs/functional/frd/FRD-009-interrogative-workflow.md` is respected because the decision is explicit; there is no unresolved user-owned choice to silently resolve.

## Steps

1. Amend R4 to withdraw contextual manual-help affordances, naming GUI-074’s removed Settings control and GUI-081’s never-built gate-block control with their different histories; retain F1 and Help → Kanmer Manual as the shipped entry points.
2. Remove AC3, which asserted the never-built gate-block action, then renumber the remaining manual-theme and content-pipeline acceptance criteria.
3. Inspect the resulting FRD alongside `gateError.ts`, its tests, and `docs/manual/gates.md` to confirm the document describes only shipped behaviour and a clearly recorded withdrawal.
4. Add focused dependency-free coverage only if an existing FRD-contract test surface covers this document; otherwise use exact content assertions through repository search and diff review, keeping this narrow documentation amendment free of unrelated test infrastructure.
5. Run `npm run check:manual`, the relevant GUI gate-error test, `git diff --check`, and targeted searches for stale gate-block-help claims; report results in the PR and proof.

## Verification

- R4 says the gate-block help control was never built and has been withdrawn; it does not describe it as removed.
- FRD-024 retains real manual entry points and no longer mandates any contextual `?` control.
- There is no AC requiring a gate-block `?`; acceptance numbering is sequential.
- `npm run check:manual`, the targeted gate-error test, targeted searches, and `git diff --check` pass.

## Risks and mitigations

- **History becomes misleading:** explicitly use “removed” only for GUI-074’s Settings control and “never built / withdrawn” only for the gate-block clause.
- **Accidental product change:** restrict the diff to FRD-024 unless verification exposes a direct stale reference.
- **Hiding help regression:** name the existing F1/Help manual route and GUI-087’s friendly text path rather than claiming an unimplemented deep link.
