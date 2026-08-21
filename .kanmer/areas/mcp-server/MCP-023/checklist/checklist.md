# Checklist — MCP-023

## Shared document API

- [x] Add/reuse one store helper for sorted recursive ticket doc descriptors with versions.
- [x] Add/reuse one batch read helper preserving request order and independent missing results.
- [x] Validate paths through existing containment helpers.
- [x] Return legacy/null explicitly and write nothing.
- [x] Prove index paths, nested docs, missing docs, order, versions, malformed paths, and no-write behaviour.
- [x] Confirm MCP-019 uses/will use these same helpers; no duplicate loop/API.

## Packet builder

- [x] Add `execution-packet.ts` with explicit ready/refused types.
- [x] Add exact ATX section parser and tests for case, closing hashes, nesting, boundary, empty/missing.
- [x] Use MCP-022 project identity without recalculating differently.
- [x] Read item and full GateReport once.
- [x] Refuse missing/non-ticket/legacy first.
- [x] Refuse spike second, before gate missing checks.
- [x] Refuse unsatisfied non-question `leave-preparing` requirements third.
- [x] Refuse unresolved questions fourth with `missing:["questions-resolved"]`.
- [x] Refuse other/unknown actor occupancy fifth with `missing:[]`.
- [x] Allow same-actor occupied ticket.
- [x] Return normal `ready:false` data, not `isError`.

## Ready response

- [x] Include project identity.
- [x] Include exact ticket metadata/body and taken details.
- [x] Include all group records in ticket order and full nullable `context.md`.
- [x] Include fixed plan/checklist/files keys with exists/content/version.
- [x] Include all other Markdown docs as sorted path/version listings only.
- [x] Include full GateReport unchanged.
- [x] Parse plan `Stop condition`; use exact safe fallback when absent/empty.
- [x] Parse commands/verification section; use exact commands fallback.

## Tool and proof

- [x] Register one read-only `get_execution_packet` tool with input `id`.
- [x] Obtain caller through existing `actorName` logic.
- [x] Ready feature smoke passes.
- [x] Chore-with-plan-only smoke returns ready.
- [x] Missing/non-ticket/legacy refusal cases pass.
- [x] Spike dominance passes.
- [x] Missing docs before unresolved questions passes.
- [x] Dedicated unresolved-question refusal passes.
- [x] Other actor refuses; same actor resumes.
- [x] Stop/commands fallback cases pass.
- [x] Fresh/default root and ticket/activity bytes remain unchanged.

## Docs/build/scope

- [x] Add tool row above `## Field semantics` in the actual Kanmer ticket-tool reference.
- [x] Update any explicit tool count by exactly one.
- [x] Run core tests, typecheck, build, standard/protocol/discovery smokes.
- [x] From normal main checkout run plugin build/check and commit generated bundle.
- [x] Confirm no take/move/worktree/init/activity/extra document API or model summary was added.
- [ ] Open PR with `Kanmer: MCP-023`; name `get_execution_packet` as production caller.
- [x] Keep `docs_todo` until DOC-011 links governing docs.
- [x] Stop at review readiness; do not merge or begin SKILL-021/CORE-035.

## Progress notes

Record each refusal fixture/result in precedence order and the exact content-version values returned for plan/checklist/files/extras.
