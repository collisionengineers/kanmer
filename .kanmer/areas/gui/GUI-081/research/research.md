# Research — GUI-081: withdraw FRD-024 gate-block help clause

## Question

Should Kanmer implement the never-built gate-block `?` help affordance, or should the FRD stop requiring it after the owner’s 2026-08-20 decision to withdraw the clause?

## Findings

- The ticket contains the owner decision: withdraw the R4 gate-help clause; [[GUI-087]] and the in-app manual carry help instead. This resolves the product choice before implementation.
- `FRD-024-in-app-manual.md` R4 currently still mandates a `?` on gate-block messages and says GUI-081 will implement or withdraw it. AC3 likewise requires the affordance to open the gates chapter.
- Repository search finds no implementation of a gate-block manual link or `Tickets, profiles & gates` deep link. The only relevant shipped behaviour is `friendlyGateError` in `apps/gui/src/renderer/src/lib/gateError.ts`, which rewrites gate refusals into human-facing guidance; GUI-087 already delivered that fix.
- GUI-074 removed the Settings `?` affordance and amended R4 only enough to preserve the unimplemented gate clause. Its outcome expressly records that no deep-linker remains. DOC-007 delivered a substantive manual, reachable through F1 and Help → Kanmer Manual.
- FRD-024 must remain historically honest: the Settings affordance was removed, while the gate-block affordance was never built. Saying both were “removed” would falsely describe shipped behaviour.
- The requested amendment is documentation-only. It must delete the untrue requirement and AC3, retain the actual F1/Help manual entry points, and renumber the remaining acceptance criteria without inventing a replacement contextual-help feature.

## Implications

Amend R4 into a precise withdrawal record: Kanmer has no contextual manual-help affordance; Settings help was removed by GUI-074 and the never-built gate-block help is withdrawn by GUI-081. Delete AC3 and renumber former AC4/AC5. Do not touch the renderer, manual chapters, or GUI-087’s friendly error behaviour.

## Sources

- `docs/functional/frd/FRD-024-in-app-manual.md`, read 2026-08-21.
- `apps/gui/src/renderer/src/lib/gateError.ts` and its tests, repository search 2026-08-21.
- [[GUI-074]] outcome and commit `43dcedb` amendment.
- [[GUI-087]] record and [[DOC-007]] outcome.

## Open questions

None. The owner decision in the ticket selects withdrawal; no user decision remains.
