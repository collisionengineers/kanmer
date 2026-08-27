# Checklist — CORE-118

*One box per ordered plan step or acceptance check. Append progress notes rather
than rewriting.*

- [ ] [pre-review] Step 1 — `packages/core/src/plan.ts` exports `parseAtxSections`, `extractAtxSection`, `parsePlan` and `validatePlan`, with the ATX reader moved verbatim from `execution-packet.ts`.
- [ ] [pre-review] Step 1 — `plan.test.ts` covers both step forms, the resolved-sentence exemption, an unresolved vague sentence, a plan with no risk category, and a step file absent from `## Expected files`.
- [ ] [pre-review] Step 2 — `packages/core/src/step-packet.ts` exports `STEP_PACKET_VERSION`, `STEP_RETURN_STOP` and `compileStepPacket`, and both new modules are exported from `packages/core/src/index.ts`.
- [ ] [pre-review] Step 2 — `step-packet.test.ts` covers allowed-file confinement, a forbidden file, `"next"` selection, an out-of-range step, stale and unrecorded evidence, and a deterministic `packetId`.
- [ ] [pre-review] Step 3 — `get_execution_packet` accepts optional `step`, returns the compiled `step` block, and returns `ready:false, code:"GATE_BLOCKED"` with the blocking findings when compilation fails.
- [ ] [pre-review] Step 3 — with no `step` argument the response is unchanged apart from the additive `validation` block and group-context `version`; refusal order, reasons and `missing` values are byte-for-byte the same.
- [ ] [pre-review] Step 3 — the tool roster is still 39 and `get_execution_packet` is still `readOnlyHint: true`.
- [ ] [pre-review] Step 4 — `smoke.mjs` gains the structured-plan fixture and asserts allowed-file confinement, recorded tests/commands/expected output, evidence layers, `"next"` selection, `PLAN_STEP_FILE_UNDECLARED` and `PLAN_STEP_UNSTRUCTURED` refusals, and the advisory `validation` block.
- [ ] [pre-review] Step 4 — the existing byte-comparison read-only proof also covers a step-mode refusal (tree, ticket file and `activity.jsonl` unchanged).
- [ ] [pre-review] Step 5 — plan template, `kanmer-plan`, `kanmer-execute`, `tool-reference.md` and AGENTS.md §8 describe the shipped behaviour, with every pinned heading and sentence left intact.
- [ ] [pre-review] Step 6 — `plugins/kanmer/mcp/kanmer-mcp.cjs` is regenerated with `npm run plugin:build` from a checkout that owns its `@kanmer/core` resolution, and committed.
- [ ] [pre-review] Run `npm run test -w @kanmer/core` and record the exit code.
- [ ] [pre-review] Run `npm run typecheck` and record the exit code.
- [ ] [pre-review] Run `npm run build` and record the exit code.
- [ ] [pre-review] Run `node packages/mcp-server/src/smoke.mjs` and `npm run smoke:protocol` and record the exit codes.
- [ ] [pre-review] Run `npm run verify:skills` and `npm run plugin:check` and record the exit codes.
- [ ] [pre-review] Run `npm run verify` and record its exit code plus any known host quirk, without weakening a test.
- [ ] [pre-review] Re-read `tool-reference.md` and AGENTS.md §8 by hand — `plugin:check` sees tool names and bundle bytes only.
- [ ] [pre-review] No change to `packages/core/src/store.ts`, to any governing document, or to the tool count.
- [ ] [pre-review] Stop at the approved boundary: PR open with a `Kanmer: CORE-118` footer, report written, ticket in Review; do not merge or start another ticket.

`[pre-review]` and `[post-merge]` are plain-text labels for humans and skills. Current gates ignore these labels; use `get_doc_gates` for live gate behaviour.

## Progress notes

Append with `set_ticket_doc(doc: "checklist", append: true)`.
