# Research — GUI-107

## Question

How can TicketCreate and Editor expose a safe inline requires editor for the custom profile while preserving the existing core profile vocabulary, validation, and storage model?

## Current behaviour

- @kanmer/core already models ticket requirements as optional requires: Record<string, string[]> on both CreateItemInput and UpdateItemPatch; the store validates the map against board profile vocabulary and applies it only when profile === "custom".
- The MCP/main IPC path already passes create/update input through to core, so no IPC channel or core schema change is needed.
- TicketCreate and Editor expose the five profile ids, including custom, but currently hold no requirements draft, render no inline editor, and omit requires from submitted input/patches.
- Editor already has a board-scoped getDocTypes call and gate data; ProjectClient.getDocModel() exposes the resolved doc types, boundaries, and proof types. Board deployment environments are available from BoardConfig.deployment.environments when deployment tracking is configured.
- Renderer code cannot import core runtime functions. renderer/src/lib/profileDraft.ts is the existing documented mirror for parseRequirement/validateProfileMap rules, including the required parse order (environment, proof suffix, named path), pseudo-types, and vocabulary-driven validation. GUI-007 owns the Settings profile editor; this ticket will not change its board-level semantics.

## Contract and UX decision

The inline control renders only while the selected ticket profile is custom. It presents one comma-separated requirement field per core stage boundary, using the resolved boundary/doc/proof/environment vocabulary. Empty fields remove that boundary from the outgoing map. The same draft helper and validation mirror serve create and edit forms so both forms produce the exact core shape and reject unknown boundary/type/suffix/environment values before calling IPC. Switching away from custom hides the editor but retains the draft in the form; the submitted requires map is omitted for non-custom profiles, matching core's custom-only interpretation.

## Relevant files

- apps/gui/src/renderer/src/components/TicketCreate.tsx: add custom requirement draft, vocabulary loading, inline fields, validation, and CreateItemInput.requires.
- apps/gui/src/renderer/src/components/Editor.tsx: add requirements to snapshot/diff/conflict handling, custom inline fields, validation, and UpdateItemPatch.requires.
- apps/gui/src/renderer/src/lib/profileDraft.ts: reuse its existing exported parser/validation functions without changing Settings profile semantics.
- apps/gui/src/renderer/src/components/Editor.test.tsx plus a focused TicketCreate test/helper: prove custom requirements are rendered, validated, and submitted; prove ordinary profiles do not expose the editor.
- packages/core/src/types.ts, packages/core/src/profiles.ts, apps/gui/src/shared/ipc.ts, and apps/gui/src/main/index.ts: read-only confirmation that the model and IPC transport already support this scope; no changes planned.

## Risks and boundaries

- A renderer-only validation mirror can drift from core. Reusing the existing profileDraft parser/validator and passing runtime vocabulary keeps this change on the established boundary; focused tests cover core's parse order and invalid values.
- Visual/manual interaction in a real Electron window is not available in this run and will be reported INCONCLUSIVE; deterministic component tests are the proof for this implementation.
- GUI-007 Settings profile editing and core profile vocabulary/gate resolution are explicit non-goals.
