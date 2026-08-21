# Post-implementation report — GUI-007

*Author report before independent review/merge. Proof belongs to kanmer-verify on merged main.*

## Summary

The GUI Profiles settings surface is complete and verified: it edits profile boundary requirements, area default profiles, and the proof-type vocabulary through a cloned whole-board draft; validation mirrors core's requirement grammar; invalid drafts cannot be saved; and the save warning reports the affected-ticket blast radius. The implementation was already present on the base branch in an older untraceable commit, so this lane audited that scope and adds the missing responsive profile-table affordance plus accessible invalid-field state.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/renderer/src/components/Settings.tsx` | Wrapped the profile matrix in a horizontally scrollable container and exposed `aria-invalid` on invalid requirement fields. | Keep all five boundary columns usable in narrow Settings windows and make inline validation available to assistive technology. |
| `apps/gui/src/renderer/src/styles.css` | Added profile-table layout, cell sizing, overflow, invalid-field, and inline-error styles. | Give the Profiles editor readable table structure and a clear error affordance without changing other Settings surfaces. |
| Existing base implementation (`lib/profileDraft.ts`, its tests, `Settings.tsx`, and `AGENTS.md` §7) | Audited and verified rather than duplicated. | The approved GUI-007 feature was already present on `origin/main`; the lane preserves it and limits the patch to the scoped editor polish. |

## Governing docs

- `docs/functional/frd/FRD-002-requirement-profiles.md` S2: profile boundary requirements and area defaults remain editable, validated against the explicit renderer vocabulary, with an explicit save and affected-ticket warning.
- `docs/functional/frd/FRD-006-typed-proof.md` R1: proof types remain an editable vocabulary and `proof:<type>` requirements validate against it.
- `AGENTS.md` §7: the existing third core↔renderer duplication is documented; `lib/profileDraft.ts` imports only `BoardConfig` as a type and keeps the parser split order `@` → `:` → `/`.

## Risks / follow-ups

- The renderer mirror is intentionally literal-vocabulary based because runtime core imports are forbidden in the renderer. Existing tests cover the grammar and split-order cases, but a cross-package parity test remains a follow-up risk.
- No real-user typing/save visual session was available in this lane; the existing boot smoke and deterministic GUI tests are PASS. A merged-main verifier may capture the Profiles tab in light/dark themes if a disposable GUI session is available.
- No GUI-010, GUI-015, GUI-016, GUI-017, provider registration, or unrelated provider work was included.

## Verification hand-off

On merged `main`, run:

- `npm test --workspace @kanmer/gui` — expected PASS, 349 tests across 37 files at this lane's base.
- `npm run typecheck` — expected exit 0.
- `npm run build --workspace @kanmer/gui` — expected exit 0.
- `KANMER_SMOKE=1 KANMER_OPEN=<fresh-project> npx electron . --user-data-dir=<fresh-user-data>` from `apps/gui` — expected exit 0; capture the Profiles tab only if a real UI session is available.
- `git diff --check` — expected exit 0.

Observed in this lane: focused `profileDraft.test.ts` 28/28; full GUI Vitest 349/349 across 37 files; root typecheck exit 0; GUI build exit 0; GUI boot smoke exit 0; diff-check exit 0.
