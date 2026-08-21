# Post-implementation report — GUI-081

## Delivered

Amended the linked governing document `FRD-024-in-app-manual.md` to withdraw the never-built gate-block `?` help requirement under the explicit owner decision. R4 now records the actual product state: Kanmer has no contextual manual-help control; GUI-074 removed the Settings control, while the gate-block control was never built and is withdrawn by GUI-081. It retains the real F1/Help-menu manual route and notes GUI-087’s human-facing gate guidance.

Removed the false gate-block acceptance criterion and renumbered the remaining two criteria sequentially.

## Governing-doc alignment

This intentionally amends FRD-024, as authorized by the ticket’s owner decision. It preserves FRD-009’s question discipline: the decision is recorded, not inferred, and no new product choice was made during implementation.

## Files changed

| Path | Rationale |
|---|---|
| `docs/functional/frd/FRD-024-in-app-manual.md` | Corrects the stale requirement/AC while preserving accurate historical distinction and the actual shipped manual access routes. |

## Verification run on branch

- `npm run check:manual` — manual artifact current (19 chapters).
- `npm test -w @kanmer/gui -- gateError.test.ts` — 4 tests passed.
- Targeted search found no stale gate-block requirement claims; R4 contains `never built`, `withdrawn by GUI-081`, and the F1/Help access path.
- `git diff --check` — clean.

## Risks and follow-ups

No follow-up is required. The amendment does not add a GUI deep link or change the existing gate-error/message/manual behaviour. A future contextual-help feature would need a new product decision and ticket.

## Verify after merge

On merged main, rerun the manual check, targeted gate-error test, exact stale-claim search, and diff check; confirm the FRD has no acceptance criterion for a gate-block `?` and its remaining criteria are numbered 1–4.
