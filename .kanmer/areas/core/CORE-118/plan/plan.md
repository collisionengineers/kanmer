# Plan — CORE-118: Compile evidence-backed constrained plans into step packets

## Objective

`get_execution_packet` can compile an approved plan into one **versioned,
bounded step packet** that confines a constrained worker to named files,
symbols, tests, commands, expected output and a one-step stop condition, and it
reports typed plan-validation findings on every packet. Nothing else about the
existing whole-ticket packet changes.

## Starting state

- Evidence: `research/research.md`@`fa8d786187d1289b`, `files/files.md`@`df0c82a346681374`,
  `open-questions/open-questions.md`@`860e59e61bce2b15`; governing doc
  `docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md`;
  shared group evidence `HZN-008/context.md`.
- `packages/mcp-server/src/execution-packet.ts` returns one whole-ticket packet
  with ordered, read-only refusals (spike at `:483`, unmet leave-preparing
  requirements at `:486`) and already extracts `## Stop condition` /
  `## Commands` from the plan through a private ATX section reader
  (`extractAtxSection` `:133`, `parseAtxSections` `:142`, `sectionFromPlan` `:454`).
- `packages/mcp-server/src/index.ts:881-905` registers the tool with
  `inputSchema { id, resume? }`, `readOnlyHint: true`, and enriches the response
  with the FRD-029 logical project identity and the CORE-114 document-inclusive
  `revision` (`store.getRevision`, `packages/core/src/store.ts:311`).
- Document version tokens already exist: `store.listTicketDocsWithVersions`
  (`store.ts:1684`) and `contentVersion` (`packages/core/src/io.ts:13`).
  `store.getGroupDoc` (`store.ts:2133`) returns content with no version.
- `smoke.mjs:2020-2160` is the packet fixture; `:2038-2082` proves the call is
  read-only by byte-comparing the tree, the ticket file and `activity.jsonl`.
- `scripts/verify-skill-prose.mjs:347-348` pins the plan template's twelve `##`
  headings, its single `## Stop condition`, and the "not a gate" advisory
  sentence about `investigate`/`decide`/`choose`/`determine`.
- Tool roster is 39 (`smoke.mjs:69`, `smoke-protocol.mjs:160`).

## Governing docs

- **Meets** `FRD-033` acceptance 1, 2 and 3, and both edge cases. Acceptance 4
  (controller-side detection of forbidden-file changes, stale document versions
  and plan deviation after a worker returns) is **out of scope by explicit
  split** into [[CORE-127]], recorded in `open-questions`.
- **Meets** `PRD-002` requirement 6 for the preparation-and-compilation half.
- `FRD-010-task-scoped-dispatch.md` and `FRD-022-mcp-server-surface.md` are
  **not modified**: the packet stays read-only with ordered refusals and the
  roster stays 39, so both remain accurate.
- No new ADR: this adds no architectural decision beyond the FRD, introduces no
  tool, no persisted record and no board format change.

## Required changes

1. Core gains a pure plan reader/validator, `packages/core/src/plan.ts`,
   exporting `parseAtxSections`, `extractAtxSection`, `parsePlan(markdown): ParsedPlan`
   and `validatePlan(plan, options?): PlanValidation`. `ParsedPlan` carries the
   ATX sections, the `## Expected files` table rows, the `## Do not modify`
   paths, the `## Acceptance checks` items, the `## Commands` items, the
   `## Stop condition`, evidence pins parsed from `## Starting state` lines of
   the form ``- Evidence: `<path>`@`<version>` `` and the ordered steps.
2. A step is parsed in two forms. The **structured** form is a `### Step N — <title>`
   sub-heading under `## Ordered steps` whose body is labelled bullets:
   `Preconditions`, `Files`, `Symbols`, `Change`, `Preserved behaviour`,
   `Forbidden`, `Negative cases`, `Tests`, `Commands`, `Expected output`,
   `Done when`, `Deviation stop` (label matching is case-insensitive and
   tolerates `**bold**`). The **legacy** form is a numbered list item, which
   yields a title-only step marked `structured: false`.
3. `validatePlan` returns `{ ok, blockers, advisories, findings[] }` where each
   finding is `{ code, severity, message, section?, step?, detail? }`.
   `severity` is `"blocker"` or `"advisory"`; `ok` is `blockers === 0`.
   - Advisory, always: `PLAN_SECTION_MISSING`, `PLAN_VAGUE_INSTRUCTION`,
     `PLAN_RISK_EVIDENCE_MISSING`, and `PLAN_STEP_FIELD_MISSING` for optional
     fields or for a step that is not the selected one.
   - Blocker, only when `options.step` selects a step:
     `PLAN_STEPS_MISSING`, `PLAN_STEP_NOT_FOUND`, `PLAN_STEP_UNSTRUCTURED`,
     `PLAN_STEP_FIELD_MISSING` (for the required fields `Files`, `Change`,
     `Tests`, `Commands`, `Done when` on the selected step),
     `PLAN_STEP_FILE_UNDECLARED`, `PLAN_STEP_FILE_FORBIDDEN`,
     `PLAN_ALLOWED_FILES_MISSING`, `PLAN_ACCEPTANCE_MISSING`,
     `PLAN_STOP_CONDITION_MISSING`, `PLAN_EVIDENCE_STALE`,
     `PLAN_EVIDENCE_UNRECORDED`.
   Without `options.step` no finding is ever a blocker, so today's whole-ticket
   packet cannot start refusing.
4. `PLAN_VAGUE_INSTRUCTION` is sentence-scoped over `## Required changes`,
   `## Constraints`, `## Ordered steps` and `## Acceptance checks`. A sentence
   containing a vague marker (`investigate`, `decide`, `choose`, `determine`,
   `figure out`, `explore`, `as appropriate`, `as needed`, `if necessary`,
   `somehow`, `TBD`, `TODO`, `etc.`, `and so on`, `maybe`, `probably`,
   `some kind of`) is flagged **unless the same sentence resolves it** — it
   contains a backticked span, a path-like token, an `UPPER_SNAKE` error code,
   or an `→`. This mirrors FRD-033's "unless the sentence resolves the exact
   decision, file, caller, error or test" and stays advisory, which is what the
   pinned plan-template prose requires.
5. `PLAN_RISK_EVIDENCE_MISSING` detects the seven FRD-033 risk categories
   (`state`, `migration`, `service`, `runtime`, `public-contract`, `security`,
   `release`) from the declared `## Expected files` paths plus the
   `## Required changes` prose, using one fixed keyword table per category. A
   detected category is covered when the plan's `## Starting state`,
   `## Governing docs` or `## Constraints` sections both cite evidence (a
   backticked source path, optionally with a `:line` anchor, or a `docs/` or
   `research/` path) and mention that category's keywords. An uncovered
   category is one advisory finding naming the category. A plan that triggers
   no category produces no finding at all — that is FRD-033's "trivial edits do
   not accrue invented deep-research debt".
6. Core gains `packages/core/src/step-packet.ts`, exporting
   `STEP_PACKET_VERSION = "kanmer-step-packet/1"`, `STEP_RETURN_STOP`, the
   `StepPacket` type and `compileStepPacket(input): StepPacketResult`, a pure
   function taking the parsed plan, plan path/version, logical project identity,
   ticket id + `revision`, batch id, workspace `{branch, worktree}`, the two
   evidence layers, the checklist markdown and `select: number | "next"`. It
   returns `{ ok: true, packet, validation }` or `{ ok: false, reason, validation }`.
   `"next"` resolves to the first step whose positional checklist box is
   unticked, or step 1 when there is no checklist; every box ticked is
   `ok: false`.
7. The compiled `StepPacket` carries `packetVersion`, a deterministic
   `packetId` (sha256/16 over its canonical JSON), `project`
   (`project_id`, `board_id`, `fingerprint`), `ticket` (`id`, `revision`),
   `batch`, `workspace`, `plan` (`path`, `version`), `step`
   (`index`, `total`, `id`, `title`), `allowedFiles`, `allowedSymbols`,
   `forbiddenFiles`, `preconditions`, `requiredBehaviour`, `preservedBehaviour`,
   `forbiddenBehaviour`, `negativeCases`, `tests`, `commands`, `expectedOutput`,
   `doneCondition`, `deviationStop`, `stopCondition` (the plan's stop condition
   followed by `STEP_RETURN_STOP`) and `evidence` (`group` and `ticket` layers,
   each entry a path plus a content version).
8. `allowedFiles` is the selected step's `Files` list; each entry must appear in
   the plan's `## Expected files` table (else `PLAN_STEP_FILE_UNDECLARED`) and
   must not appear in `## Do not modify` (else `PLAN_STEP_FILE_FORBIDDEN`).
   `forbiddenFiles` is the whole `## Do not modify` list.
9. `packages/mcp-server/src/execution-packet.ts` imports the ATX helpers from
   `@kanmer/core` and deletes its private copies; every ready packet gains an
   advisory `validation` block; every `groupContexts[]` entry gains
   `version: string | null` computed with `contentVersion`; `getExecutionPacket`
   accepts optional `logical` identity and optional `step`, and, when `step` is
   supplied, compiles after every existing refusal has passed — a failed
   compilation is a normal `{ready:false, code:"GATE_BLOCKED", missing: [], validation}`
   refusal that writes nothing.
10. `packages/mcp-server/src/index.ts` adds
    `step: z.union([z.number().int().positive(), z.literal("next")]).optional()`
    to `get_execution_packet` and passes both `step` and the already-resolved
    logical identity through. No tool is added, renamed or removed; the roster
    stays 39 and `readOnlyHint` stays `true`.
11. Documentation and prose follow the surface: the plan template documents the
    additive `### Step N` sub-form and the `Evidence` pin line without touching
    a pinned heading or the "not a gate" sentence; `kanmer-plan` and
    `kanmer-execute` each gain one added paragraph; `tool-reference.md`'s
    `get_execution_packet` row records the `step?` parameter, the appended
    refusal and the `validation` / `step` blocks; AGENTS.md gains §8 gotcha 19.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Add | `packages/core/src/plan.ts` | ATX sections, `parsePlan`, `validatePlan`, finding vocabulary |
| Add | `packages/core/src/plan.test.ts` | vitest suite for parsing and validation |
| Add | `packages/core/src/step-packet.ts` | `compileStepPacket`, `StepPacket`, `STEP_PACKET_VERSION`, `STEP_RETURN_STOP` |
| Add | `packages/core/src/step-packet.test.ts` | vitest suite for compilation, confinement, `"next"`, staleness |
| Modify | `packages/core/src/index.ts` | export the two new modules |
| Modify | `packages/mcp-server/src/execution-packet.ts` | validation block, group-context versions, step branch, ATX import |
| Modify | `packages/mcp-server/src/index.ts` | optional `step` parameter and logical identity pass-through |
| Modify | `packages/mcp-server/src/smoke.mjs` | step-mode fixture and assertions, extended read-only proof |
| Modify | `plugins/kanmer/skills/kanmer-plan/assets/plan-template.md` | additive step sub-form and evidence pin line |
| Modify | `plugins/kanmer/skills/kanmer-plan/SKILL.md` | one added paragraph on writing step sub-sections |
| Modify | `plugins/kanmer/skills/kanmer-execute/SKILL.md` | one added paragraph on requesting a step packet |
| Modify | `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `get_execution_packet` row and field semantics |
| Modify | `AGENTS.md` | §8 gotcha 19 |
| Modify | `plugins/kanmer/mcp/kanmer-mcp.cjs` | regenerated committed bundle (`plugin:build`) |

## Do not modify

- `packages/core/src/store.ts` — the concurrent CORE-125 lane owns its mutation
  paths. This ticket needs no change there; if that stops being true, stop and
  report the overlap instead of editing.
- `packages/core/src/gates.ts`, `packages/core/src/profiles.ts`,
  `packages/core/src/types.ts` — no new gate, profile requirement or
  frontmatter field.
- `apps/gui/**` — no GUI surface in this ticket.
- `.worktrees/kanmer` and any `.kanmer` file by hand — board writes go through
  the MCP tools only.
- `docs/functional/frd/**`, `docs/product/prd/**`, `docs/architecture/adr/**` —
  governing documents are not edited by this ticket.
- Existing assertions in `smoke.mjs`, `smoke-protocol.mjs` and every `*.test.ts`
  — extend them, never weaken or delete one.

## Constraints

- **Compatibility:** the live board is served by the installed v0.3.12 server.
  Nothing is persisted, no frontmatter key is added and no board format changes,
  so the board stays readable there. Response fields are additive only.
- **Tool roster stays 39.** `smoke.mjs:69`, `smoke-protocol.mjs:160`, AGENTS §4,
  `docs/manual/connect.md:145` and the tool reference all state the count and
  must remain true.
- **The packet stays read-only.** No refusal or ready path may write to disk,
  take a ticket, move a stage or create a worktree.
- **Refusal precedence is extended, never reordered.** Step-validation refusal
  is strictly last.
- **Pinned prose:** `scripts/verify-skill-prose.mjs:347-348` keeps the plan
  template's twelve `##` headings, one `## Stop condition`, and the "not a gate"
  advisory. Skill edits are added sentences, never rewrites of pinned ones.
- **Purity:** `plan.ts` and `step-packet.ts` import nothing but `node:crypto`;
  no filesystem, no Git, no store access.
- **Bundle:** core compiles into `plugins/kanmer/mcp/kanmer-mcp.cjs`, so the
  bundle is rebuilt from a checkout that owns its `@kanmer/core` resolution.

## Ordered steps

### Step 1 — Add the pure plan reader and validator to core

- Preconditions: `packages/core/src/plan.ts` does not exist; `extractAtxSection`
  still lives in `packages/mcp-server/src/execution-packet.ts:133`.
- Files: `packages/core/src/plan.ts`, `packages/core/src/plan.test.ts`
- Symbols: `AtxSection`, `parseAtxSections`, `extractAtxSection`, `PlanStep`,
  `PlanFileEntry`, `ParsedPlan`, `parsePlan`, `PlanFinding`, `PlanValidation`,
  `validatePlan`
- Change: implement Required changes 1–5 exactly. Move the ATX reader verbatim
  from `execution-packet.ts` (behaviour identical, including the
  same-or-higher-level stop rule and the trailing-`#` strip), then add table,
  list, step, evidence-pin parsing and the finding vocabulary.
- Preserved behaviour: `extractAtxSection` returns byte-identical results to the
  current MCP copy for every input, including `null` for an absent or empty
  section.
- Forbidden: no filesystem, Git or store import; no gate or profile change.
- Negative cases: a plan with no `## Ordered steps`; a numbered-list-only plan;
  a `### Step` with no labelled bullets; a vague sentence that *is* resolved by a
  backticked path (must not be flagged); a plan touching no risk category (must
  produce no risk finding); a step naming a file absent from `## Expected files`.
- Tests: `packages/core/src/plan.test.ts`
- Commands: `npm run test -w @kanmer/core`, `npm run typecheck -w @kanmer/core`
- Expected output: vitest reports the new file's suites passing and no existing
  core suite changes result.
- Done when: `parsePlan` and `validatePlan` are exported from `plan.ts`, the new
  suite passes, and no other file has changed.
- Deviation stop: if the ATX reader cannot move without changing behaviour, stop
  and report rather than adjusting the existing extraction semantics.

### Step 2 — Compile a parsed step into a versioned step packet

- Preconditions: Step 1 is complete and `packages/core/src/plan.ts` exports
  `ParsedPlan` and `validatePlan`.
- Files: `packages/core/src/step-packet.ts`, `packages/core/src/step-packet.test.ts`,
  `packages/core/src/index.ts`
- Symbols: `STEP_PACKET_VERSION`, `STEP_RETURN_STOP`, `StepPacket`,
  `StepPacketEvidence`, `StepPacketInput`, `StepPacketResult`, `compileStepPacket`
- Change: implement Required changes 6–8; export `./plan.js` and
  `./step-packet.js` from `packages/core/src/index.ts`.
- Preserved behaviour: `packages/core/src/index.ts` keeps every existing export
  in place and order; no existing core module changes.
- Forbidden: writing the packet anywhere, reading the filesystem, or adding a
  frontmatter field.
- Negative cases: `select` beyond the last step; `"next"` with every box ticked;
  a step file listed in `## Do not modify`; a plan pinning an evidence version
  that no longer matches the supplied live version; a plan pinning nothing while
  ticket-layer `research/`/`files/` evidence is supplied.
- Tests: `packages/core/src/step-packet.test.ts`
- Commands: `npm run test -w @kanmer/core`, `npm run typecheck -w @kanmer/core`
- Expected output: the compilation suite passes and `packetId` is stable across
  two calls with identical input and differs when any field changes.
- Done when: `compileStepPacket` is exported from `@kanmer/core` and both new
  suites pass.
- Deviation stop: if compilation turns out to need a store read, stop and report
  — that would cross into the CORE-125 lane's file.

### Step 3 — Wire the step-scoped mode into the MCP packet

- Preconditions: Steps 1 and 2 are complete and `npm run build:core` succeeds.
- Files: `packages/mcp-server/src/execution-packet.ts`, `packages/mcp-server/src/index.ts`
- Symbols: `ExecutionPacketReady`, `ExecutionPacketRefusal`,
  `ExecutionPacketGroupContext`, `getExecutionPacket`, the `get_execution_packet`
  registration
- Change: implement Required changes 9 and 10.
- Preserved behaviour: with no `step` argument the response is exactly today's
  packet plus the additive `validation` block and the additive group-context
  `version`; refusal order, reasons and `missing` values are unchanged; the tool
  keeps `readOnlyHint: true` and the roster stays 39.
- Forbidden: any write, take, move, dispatch or worktree creation; any
  path-shaped new field in the tool schema.
- Negative cases: `step` on a ticket that is already refused for a prior reason
  (the prior refusal must still win); `step` on a plan-only chore with no
  structured steps; `step: "next"` with no checklist document.
- Tests: `packages/mcp-server/src/smoke.mjs` (extended in Step 4)
- Commands: `npm run typecheck`, `npm run build`
- Expected output: typecheck passes for every workspace and both server builds
  emit without error.
- Done when: the tool accepts `step`, the compiled block appears on a ready
  packet, and a failed compilation returns `ready:false` with `code:"GATE_BLOCKED"`.
- Deviation stop: if preserving the exact existing refusal order requires
  changing an earlier refusal, stop and report instead.

### Step 4 — Prove the mode end to end in the MCP smoke rail

- Preconditions: Step 3 is complete and `npm run build` succeeds.
- Files: `packages/mcp-server/src/smoke.mjs`
- Symbols: the execution-packet fixture block
- Change: add a structured-plan fixture ticket (research, files, resolved
  open-questions, a three-step plan whose third step names an undeclared file,
  and a two-box checklist) and assert: a ready `step: 1` packet confines
  `allowedFiles` to the declared list and records tests, commands, expected
  output, evidence layers, `packetVersion` and a stop condition containing the
  one-step return sentence; `step: "next"` selects the first unticked box;
  `step: 3` refuses with `PLAN_STEP_FILE_UNDECLARED`; a step request against the
  existing unstructured plan refuses with `PLAN_STEP_UNSTRUCTURED`; the
  whole-ticket packet carries an advisory `validation` block; and the existing
  byte-comparison read-only proof also covers a step refusal.
- Preserved behaviour: every existing `check(...)` in the file keeps its exact
  condition and message; the tool-count check still reads 39.
- Forbidden: weakening or deleting an existing assertion.
- Negative cases: the refusal path must leave tree, ticket file and
  `activity.jsonl` byte-identical.
- Tests: `node packages/mcp-server/src/smoke.mjs`
- Commands: `node packages/mcp-server/src/smoke.mjs`, `npm run smoke:protocol`
- Expected output: the smoke run prints every check as a pass and exits 0.
- Done when: both smokes pass with the new checks present.
- Deviation stop: if an existing check fails, stop and report — do not adjust it.

### Step 5 — Update the templates, skills and contributor docs

- Preconditions: Step 4 passes, so the documented behaviour is the shipped one.
- Files: `plugins/kanmer/skills/kanmer-plan/assets/plan-template.md`,
  `plugins/kanmer/skills/kanmer-plan/SKILL.md`,
  `plugins/kanmer/skills/kanmer-execute/SKILL.md`,
  `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`,
  `AGENTS.md`
- Symbols: the `## Ordered steps` section of the template, the
  `get_execution_packet` reference row, AGENTS §8
- Change: implement Required change 11.
- Preserved behaviour: the template keeps its twelve `##` headings, exactly one
  `## Stop condition` and the "not a gate" advisory; every sentence pinned by
  `scripts/verify-skill-prose.mjs` is left byte-identical.
- Forbidden: editing any `docs/functional`, `docs/product` or
  `docs/architecture` file; rewriting a pinned sentence.
- Negative cases: a template edit that adds a second `## Stop condition` or
  drops a pinned heading must fail `verify:skills` — run it to confirm it does
  not.
- Tests: `scripts/verify-skill-prose.mjs`
- Commands: `npm run verify:skills`
- Expected output: every skill-prose check passes.
- Done when: the four skill/reference files and AGENTS.md describe the shipped
  behaviour and `verify:skills` passes.
- Deviation stop: if a pinned check fails, stop and report rather than relaxing
  the check.

### Step 6 — Rebuild the committed plugin bundle and run the verification rail

- Preconditions: Steps 1–5 are complete and the worktree has its own
  `node_modules` from `npm install`.
- Files: `plugins/kanmer/mcp/kanmer-mcp.cjs`
- Symbols: none — generated output
- Change: run `npm run plugin:build`, then `npm run plugin:check`, then the full
  `npm run verify` rail, and commit the regenerated bundle.
- Preserved behaviour: the bundle is generated, never hand-edited.
- Forbidden: hand-editing the bundle; running the build from a checkout that
  does not own its `@kanmer/core` resolution.
- Negative cases: a stale bundle must fail `plugin:check` — a passing check with
  an unmodified bundle byte-count is a signal to re-run the build.
- Tests: `scripts/check-plugin-sync.mjs`, the `verify` rail
- Commands: `npm run plugin:build`, `npm run plugin:check`, `npm run verify`
- Expected output: `plugin:check` reports no drift and `verify` exits 0, host
  quirks recorded rather than chased.
- Done when: the regenerated bundle is committed and the rail is green or its
  failures are recorded as known host quirks.
- Deviation stop: if `plugin:check` refuses because the checkout does not own
  core resolution, stop and report rather than committing an unverified bundle.

## Acceptance checks

- `npm run test -w @kanmer/core` proves `parsePlan`/`validatePlan` identify
  unresolved vague language, name the risk categories a plan triggers, and stay
  silent for a plan that triggers none (FRD-033 AC2 and edge case 1).
- `node packages/mcp-server/src/smoke.mjs` proves a generated packet confines a
  worker to its allowed files and symbols and records its exact tests, commands,
  expected output and stop condition (AC3).
- `node packages/mcp-server/src/smoke.mjs` proves a ticket without a compilable
  plan, current evidence or resolved questions cannot obtain a step packet
  (AC1), and that the refusal leaves the tree, ticket file and activity log
  byte-identical (edge case 2).
- `npm run smoke:protocol` and `node packages/mcp-server/src/smoke.mjs` prove the
  tool roster is still 39 and the packet is still `readOnlyHint: true`.
- `npm run typecheck` proves every workspace still type-checks with the moved
  ATX helper and the new core exports.
- `npm run verify:skills` proves the pinned plan-template and skill prose
  survived the documentation edits.
- `npm run plugin:check` proves the committed bundle contains this change.
- Manual: `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` and
  AGENTS.md §8 are re-read by hand, because `plugin:check` sees tool names and
  bundle bytes only.

## Commands

- `npm install` — once, in `.worktrees/core-118`, so the worktree owns its
  `@kanmer/core` resolution.
- `npm run test -w @kanmer/core` — core vitest (serial by design).
- `npm run typecheck` — every workspace.
- `npm run build` — core plus both server builds.
- `node packages/mcp-server/src/smoke.mjs` — stdio smoke against the built server.
- `npm run smoke:protocol` — raw JSON-RPC protocol smoke.
- `npm run verify:skills` — skill-prose pins.
- `npm run plugin:build` then `npm run plugin:check` — regenerate and certify the
  committed bundle.
- `npm run verify` — the authoritative rail; the hosted run is the authority.

## Complexity budget

Fourteen files, four of them new, roughly 1,300 changed lines including tests.
No new MCP tool, no new frontmatter field, no `store.ts` change, no board format
change, no persisted artefact. If the diff grows past that budget, stop and
report rather than absorbing more of FRD-033 into this PR.

## Rollback and deletion

The feature is opt-in: with no `step` argument the packet behaves exactly as it
does today, so reverting the PR is a clean revert with no data to migrate and no
board file to repair. Deleting `plan.ts`, `step-packet.ts`, the `step` parameter
and the `validation` block restores the previous surface exactly, provided the
ATX helper is restored to `execution-packet.ts` in the same change.

## Failure and deviation rules

Stop and report — do not redesign silently — on any of: a failing existing
assertion; a need to edit `packages/core/src/store.ts` or any governing document;
a change to the tool count; a required reordering of the existing refusal
sequence; a `verify:skills` pin that would have to be relaxed; a `plugin:check`
refusal about core resolution; or a diff that exceeds the complexity budget.
Record known host quirks (`scripts/antigravity-plugin-config.test.mjs` EBUSY,
`apps/gui` kanmerGit timeouts, core 5 s timeouts, `http.test.mjs` spawn
ETIMEDOUT, mcp `tunnels/readiness.test.mjs` timeout under load) rather than
chasing them; the hosted `verify` is authoritative.

## Stop condition

Stop when the PR is open with a standalone `Kanmer: CORE-118` footer, the
post-implementation report is written and the ticket is in Review. Do not
review, merge, verify, close out, release, or start another ticket.
