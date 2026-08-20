# Checklist — MCP-023

## Shared document API

- [ ] Add/reuse one store helper for sorted recursive ticket doc descriptors with versions.
- [ ] Add/reuse one batch read helper preserving request order and independent missing results.
- [ ] Validate paths through existing containment helpers.
- [ ] Return legacy/null explicitly and write nothing.
- [ ] Prove index paths, nested docs, missing docs, order, versions, malformed paths, and no-write behaviour.
- [ ] Confirm MCP-019 uses/will use these same helpers; no duplicate loop/API.

## Packet builder

- [ ] Add `execution-packet.ts` with explicit ready/refused types.
- [ ] Add exact ATX section parser and tests for case, closing hashes, nesting, boundary, empty/missing.
- [ ] Use MCP-022 project identity without recalculating differently.
- [ ] Read item and full GateReport once.
- [ ] Refuse missing/non-ticket/legacy first.
- [ ] Refuse spike second, before gate missing checks.
- [ ] Refuse unsatisfied non-question `leave-preparing` requirements third.
- [ ] Refuse unresolved questions fourth with `missing:["questions-resolved"]`.
- [ ] Refuse other/unknown actor occupancy fifth with `missing:[]`.
- [ ] Allow same-actor occupied ticket.
- [ ] Return normal `ready:false` data, not `isError`.

## Ready response

- [ ] Include project identity.
- [ ] Include exact ticket metadata/body and taken details.
- [ ] Include all group records in ticket order and full nullable `context.md`.
- [ ] Include fixed plan/checklist/files keys with exists/content/version.
- [ ] Include all other Markdown docs as sorted path/version listings only.
- [ ] Include full GateReport unchanged.
- [ ] Parse plan `Stop condition`; use exact safe fallback when absent/empty.
- [ ] Parse commands/verification section; use exact commands fallback.

## Tool and proof

- [ ] Register one read-only `get_execution_packet` tool with input `id`.
- [ ] Obtain caller through existing `actorName` logic.
- [ ] Ready feature smoke passes.
- [ ] Chore-with-plan-only smoke returns ready.
- [ ] Missing/non-ticket/legacy refusal cases pass.
- [ ] Spike dominance passes.
- [ ] Missing docs before unresolved questions passes.
- [ ] Dedicated unresolved-question refusal passes.
- [ ] Other actor refuses; same actor resumes.
- [ ] Stop/commands fallback cases pass.
- [ ] Fresh/default root and ticket/activity bytes remain unchanged.

## Docs/build/scope

- [ ] Add tool row above `## Field semantics` in the actual Kanmer ticket-tool reference.
- [ ] Update any explicit tool count by exactly one.
- [ ] Run core tests, typecheck, build, standard/protocol/discovery smokes.
- [ ] From normal main checkout run plugin build/check and commit generated bundle.
- [ ] Confirm no take/move/worktree/init/activity/extra document API or model summary was added.
- [ ] Open PR with `Kanmer: MCP-023`; name `get_execution_packet` as production caller.
- [ ] Keep `docs_todo` until DOC-011 links governing docs.
- [ ] Stop at review readiness; do not merge or begin SKILL-021/CORE-035.

## Progress notes

Record each refusal fixture/result in precedence order and the exact content-version values returned for plan/checklist/files/extras.
