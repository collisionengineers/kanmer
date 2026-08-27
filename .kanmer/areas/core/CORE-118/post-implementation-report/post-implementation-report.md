# Post-implementation report — CORE-118

*The author's claim, written before merge. Proof is gathered after.*

## Summary

An approved plan can now be read, validated and compiled into one bounded,
versioned **step packet** that limits a constrained worker to a single ordered
step's files, symbols, tests, commands, expected output and stop condition. Two
new pure core modules do the work — `plan.ts` (parse + validate) and
`step-packet.ts` (compile) — and `get_execution_packet` gained a single optional
`step` parameter to expose them. **No new tool** (roster stays 39), no new
frontmatter field, no `store.ts` change, no board-format change and nothing
persisted: a packet is derived on read, so the live v0.3.12-served board is
unaffected. Without `step`, the response is exactly today's whole-ticket packet
plus three additive fields (`validation`, `groupContexts[].version`,
`ticket.revision` now produced inside the packet rather than bolted on in
`index.ts`). FRD-033 acceptance 4 — a controller detecting forbidden-file
changes, stale document versions and plan deviation after a worker returns — was
deliberately split into [[CORE-127]] to keep this one reviewable PR.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/plan.ts` | added | Pure plan reader/validator: ATX sections (moved here from the MCP package), the `## Expected files` table, `## Do not modify`, acceptance checks, commands, stop condition, `Evidence:` pins, and ordered steps in both the new `### Step N — <title>` sub-section form and the legacy numbered list. `validatePlan` returns typed `{code, severity, message, section?, step?, detail?}` findings. |
| `packages/core/src/plan.test.ts` | added | 30 cases: section reading, both step forms, fenced-block immunity, the vague-sentence exemption, risk categories, every structural blocker, and evidence currency. |
| `packages/core/src/step-packet.ts` | added | Pure `compileStepPacket` producing a `step-packet/1` record, plus `STEP_RETURN_STOP`, `checklistBoxes` and `nextStepIndex`. |
| `packages/core/src/step-packet.test.ts` | added | 15 cases: allowed-file/symbol confinement, exact tests/commands/output, identity and versions, evidence layering, deterministic `packetId`, and each refusal. |
| `packages/core/src/index.ts` | modified | Export the two new modules. |
| `packages/mcp-server/src/execution-packet.ts` | modified | Import the ATX helpers from `@kanmer/core` (local copies deleted); add the advisory `validation` block, `groupContexts[].version`, `ticket.revision`, and the step-scoped branch placed **after** every existing refusal. |
| `packages/mcp-server/src/index.ts` | modified | `get_execution_packet` gains `step?: number \| "next"`, passes the logical identity through, and no longer re-reads the revision. Description updated. |
| `packages/mcp-server/src/smoke.mjs` | modified | 14 new checks proving the compiled packet, `"next"` selection, each refusal, and that a step refusal leaves the board byte-identical. |
| `plugins/kanmer/skills/kanmer-plan/assets/plan-template.md` | modified | Documents the additive `### Step N` sub-form and the `Evidence:` pin line. |
| `plugins/kanmer/skills/kanmer-plan/SKILL.md` | modified | One added paragraph: when to write step sub-sections; `validation` is advisory. |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | modified | New "One bounded step at a time" subsection and one clause in "Work only the packet". |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | modified | `get_execution_packet` row (new `step?`, appended refusal, `validation`/`step` blocks) and a field-semantics entry naming every finding code and its severity rule. |
| `AGENTS.md` | modified | §8 gotcha 19. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | modified | Regenerated committed bundle (`npm run plugin:build`). |

## Governing docs

**Meets `docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md`**
(and PRD-002 requirement 6) for acceptance 1–3 and both edge cases:

- **AC1 — no unattended execution without evidence, plan, resolved questions,
  known workspace and executable/manual acceptance checks.** A step packet is
  only issued after every existing refusal passes (which already covers unmet
  `leave-preparing` requirements, unresolved questions and an unsafe/occupied
  workspace) *and* the plan supplies a compilable step, declared allowed files, a
  stop condition, and an acceptance check that is either executable (a named
  command/test) or explicitly `manual`. A ticket carrying `research/`/`files/`
  evidence must pin its versions and they must still match, or compilation
  refuses `PLAN_EVIDENCE_UNRECORDED` / `PLAN_EVIDENCE_STALE`.
- **AC2 — validation identifies vague language and missing risk-sensitive
  evidence.** `PLAN_VAGUE_INSTRUCTION` is sentence-scoped over Required changes,
  Constraints, Ordered steps and Acceptance checks, and exempts any sentence that
  names the exact decision, file, caller, error or test.
  `PLAN_RISK_EVIDENCE_MISSING` names each of the seven FRD-033 categories the
  plan actually touches but cites no evidence for.
- **AC3 — a packet limits the worker and records its tests, outputs and stop
  condition.** `allowedFiles` is the step's own list, intersected against the
  plan's `## Expected files` (an undeclared path is a blocker) and checked
  against `## Do not modify`; `tests`, `commands`, `expectedOutput`,
  `doneCondition`, `deviationStop` and a `stopCondition` ending the work after
  one step are carried verbatim.
- **Edge case — trivial edits accrue no invented deep-research debt.** Risk
  findings only fire for categories the plan's own declared files and required
  changes reveal, and the evidence pin is only required when the ticket already
  carries research/impact documents. A plan-only chore still gets its packet.
- **Edge case — a packet refusal leaves board stage, claim and workspace
  unchanged.** Compilation is pure and the whole call is read-only; `smoke.mjs`
  proves it by byte-comparing `.kanmer`, the ticket file and `activity.jsonl`
  across a step refusal.

**Not modified:** `FRD-010-task-scoped-dispatch.md` and
`FRD-022-mcp-server-surface.md` remain accurate — the packet is still read-only
with ordered refusals and the roster is still 39. No ADR was needed: this adds
no architectural decision beyond the FRD.

**Deliberate reading of "rejects or flags".** FRD-033 says validation "rejects
**or flags**" unresolved vague instructions, and AC2 says it "identifies" them.
The shipped plan template states the decision-verb warning "is not a gate or
regex score", and `scripts/verify-skill-prose.mjs:347-348` pins that sentence.
Vague language and risk-evidence gaps are therefore permanently **advisory**;
only structural gaps block, and only when `step` is supplied. This is the choice
a reviewer should weigh most.

## Risks / follow-ups

- **[[CORE-127]] carries FRD-033 acceptance 4** — controller detection of
  forbidden-file changes, stale document versions and plan deviation after a
  worker returns. Linked with `blocks` from this ticket. Without it, the packet
  states the boundary but nothing yet checks that the worker respected it.
- **Advisory noise on minimal plans.** A chore plan of one heading produces ~12
  `PLAN_SECTION_MISSING` advisories in its whole-ticket `validation` block.
  `ok` stays `true` and `blockers` stays `0`, and both the tool description and
  the skills say the report is advisory — but a reviewer should decide whether
  that verbosity is acceptable before [[SKILL-036]] starts surfacing it.
- **Heuristics, deliberately shallow.** Vague-marker and risk-category detection
  are fixed keyword tables, not language understanding. They are advisory
  precisely because they will produce both false positives and false negatives;
  do not promote them to blockers without redesigning them.
- **`extractAtxSection` moved packages.** It is no longer exported from
  `packages/mcp-server/src/execution-packet.ts`; `reconciliation.ts` imports only
  `gitCommonDirectory`/`sameWorktreePath` from there, so nothing else needed
  updating. `npm run typecheck` across all four workspaces confirms it.
- **Complexity-budget deviation.** The plan budgeted ~1,300 changed lines; the
  diff is ~2,015 insertions across 13 files (excluding the regenerated bundle).
  No extra acceptance criterion and no file outside the plan's Expected files
  was absorbed; the overage is JSDoc-heavy pure code plus the two test suites.
- **Known host quirk, not chased.** `npm run verify` exits 1 here solely on
  `scripts/antigravity-plugin-config.test.mjs` EBUSY ×2 (`test:scripts` 119
  pass / 2 fail). Every earlier step passed and every later step was run
  individually and passed. No test was weakened.

## Verification hand-off

On merged `main`, from a normal checkout (not a linked worktree):

1. `npm ci && npm run verify` — the authoritative rail. Expect 0. If
   `scripts/antigravity-plugin-config.test.mjs` fails with EBUSY, that is the
   recorded host quirk; the hosted run is authoritative.
2. `npm run test -w @kanmer/core` — expect 0 and 465 tests, including
   `src/plan.test.ts` (30) and `src/step-packet.test.ts` (15).
3. `node packages/mcp-server/src/smoke.mjs` — expect 0 and **320/320**, with the
   step-packet checks present: allowed-file confinement, exact tests/output/stop
   condition, packet identity and versions, both evidence layers, `"next"`
   selection before and after a checklist tick, and the four refusals
   (`PLAN_STEP_FILE_UNDECLARED`, `PLAN_STEP_NOT_FOUND`, `PLAN_STEPS_MISSING`,
   `PLAN_STEP_UNSTRUCTURED`, `PLAN_EVIDENCE_STALE`) plus the byte-identical
   board proof.
4. `npm run smoke:protocol` — expect 0 and 50/50, tool count 39.
5. `npm run plugin:check` — expect "39 tools match, bundle bytes match".
6. `npm run verify:skills` — expect 0.

No UI work, so no screenshots. No migration, no deployment step.
