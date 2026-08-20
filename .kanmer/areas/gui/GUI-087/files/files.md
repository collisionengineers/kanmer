# Files — GUI-087

## Where the change lands

- `apps/gui/src/renderer/src/App.tsx` — current move-failure handling and dead `friendlyGateError`; either correct it in place or move the pure formatter to a small renderer library module so it can be directly tested.
- `apps/gui/src/renderer/src/**` test location adjacent to the extracted formatter (if extracted) — test actual current core-shaped missing-requirement and multi-boundary refusal text, tool-name removal, and non-gate pass-through.
- `docs/manual/gates.md` — replace the stale note saying humans see MCP tool names with the new GUI-language behavior.
- `apps/gui/src/renderer/src/manual/chapters.generated.ts` — generated artifact; update only through `npm run build:manual`.

## Context files

- `packages/core/src/store.ts` — authoritative current gate-rejection strings; do not change it for this GUI-only fix.
- `apps/gui/src/renderer/src/components/Editor.tsx` — the Ticket tab/readiness panel named by the human recovery path.
- `scripts/build-manual.mjs` — generation and `--check` freshness contract.
- `apps/gui/src/renderer/src/manual/manual.test.ts` — existing generated-manual coverage.
- `docs/manual/gates.md` — canonical hand-authored manual chapter.
- [[DOC-007]] — source of the follow-up and related manual context.

## Ripple effects

- The banner applies to failed drag and keyboard/card-menu moves because they share `onMove`.
- Generated manual content is bundled into the packaged renderer, so source and generated artifact must stay synchronized.
- Core error strings are an implicit formatting input; unit tests must use their current shape so future wording drift is detected.

## Out of scope

- Rewording core/MCP errors for agents.
- Changing document-gate logic, profiles, or readiness-panel behavior.
- Broad manual redesign beyond the gates chapter.
