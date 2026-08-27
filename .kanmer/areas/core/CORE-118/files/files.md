# Files — CORE-118

## Files the change touches

| File | Change | Risk |
| --- | --- | --- |
| `packages/core/src/plan.ts` (new) | ATX section parsing (moved from `execution-packet.ts`), `parsePlan` (expected-files table, do-not-modify list, acceptance checks, commands, stop condition, ordered steps in `### Step N` and numbered-list forms), `validatePlan` returning typed `{code, severity, message, section?, step?}` findings | Medium — the vocabulary every later surface depends on; keep it pure and total |
| `packages/core/src/plan.test.ts` (new) | Section/table/step parsing, both step forms, vague-sentence flagging and the "sentence resolves the exact decision/file/caller/error/test" exemption, risk-category detection, trivial-plan silence, severity separation | Medium |
| `packages/core/src/step-packet.ts` (new) | `compileStepPacket` — pure compilation of one parsed step into the versioned packet (packet version/id, project/ticket/batch/workspace/plan/step identity, allowed files+symbols, forbidden files, required/forbidden behaviour, negative cases, tests, commands, expected output, done condition, deviation stop, one-step stop condition, evidence layers) plus `STEP_PACKET_VERSION` and the one-step stop constant | Medium |
| `packages/core/src/step-packet.test.ts` (new) | Allowed-file confinement (step file not in `## Expected files` is a blocker), `"next"` selection from checklist state, out-of-range step, stale recorded evidence, deterministic packet id, evidence layering | Medium |
| `packages/core/src/index.ts` | export the two new modules | Low |
| `packages/mcp-server/src/execution-packet.ts` | import ATX helpers from `@kanmer/core` instead of the local copy; add the advisory `validation` block to every ready packet; add the step-scoped branch (compile or refuse) **after** all existing refusals; add group-context `version` via `contentVersion` | High — must not reorder or weaken any existing refusal, and must stay read-only |
| `packages/mcp-server/src/index.ts` | `get_execution_packet` optional `step` param + description; no new tool, roster stays 39 | Medium — keep `readOnlyHint: true`; no path-shaped field may enter the schema (FRD-029/MCP-054 smoke pin) |
| `packages/mcp-server/src/smoke.mjs` | step-mode checks: ready step packet confines allowed files and records tests/output/stop condition; unstructured plan refuses with named missing fields; refusal is byte-identical read-only; `"next"` selection; advisory `validation` present on the whole-ticket packet | Medium |
| `plugins/kanmer/skills/kanmer-plan/assets/plan-template.md` | additive `### Step N — <title>` sub-form documented under the existing `## Ordered steps`, and an `Evidence` line under Starting state | Medium — `verify-skill-prose.mjs:347-348` pins the twelve `##` headings, exactly one `## Stop condition`, and the "not a gate" advisory sentence |
| `plugins/kanmer/skills/kanmer-plan/SKILL.md`, `plugins/kanmer/skills/kanmer-execute/SKILL.md` | one added paragraph each: when to write step sub-sections, and how a constrained worker asks for `step` | Low — added sentences only; never rewrite a pinned one |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `get_execution_packet` row: new `step?` parameter, the appended refusal, the `validation` and `step` blocks | Low — everything below `## Field semantics` is invisible to `plugin:check`, so re-read it by hand |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | rebuilt bundle (`npm run plugin:build`, then `npm run plugin:check`) | Medium — core compiles into it; a stale bundle fails `verify` |
| `AGENTS.md` | §8 gotcha 19: step packets are advisory-vs-blocking, opt-in, and add no tool | Low |

## Ripple effects

- **Refusal precedence is a documented contract.** `tool-reference.md:25` and
  `docs/functional/frd/FRD-010-task-scoped-dispatch.md` both state the order;
  the new step-validation refusal is appended last and both documents gain that
  one clause.
- **`smoke.mjs:2038-2082` proves the packet is read-only** by byte-comparing the
  tree, the ticket file and `activity.jsonl`. The step-mode refusal must be
  inside that same proof, not merely beside it.
- **`extractAtxSection` moves packages.** `reconciliation.ts` imports
  `gitCommonDirectory`/`sameWorktreePath` from `execution-packet.ts` but not the
  ATX helpers, so the move has no second consumer to update; typecheck all
  workspaces anyway (`npm run typecheck`).
- **`plugin:check` compares bundle bytes and tool names.** Any core or
  mcp-server change requires `npm run plugin:build` from a checkout that owns
  its `@kanmer/core` resolution (a worktree with its own `npm install` does;
  AGENTS §8 gotcha 8).
- **`verify:skills`** re-runs after every skill/template edit; **`verify:docs`**
  only if a manual/glossary file is touched (none planned).
- **CORE-125 is live in `.worktrees/core-125`** on `store.ts`'s mutation paths.
  This ticket adds no `store.ts` change at all; if that stops being true, stop
  and report the overlap instead of editing.

## Out of scope (deliberately)

- FRD-033 acceptance 4 — controller detection of forbidden-file changes, stale
  document versions and plan deviation after a worker returns: [[CORE-127]].
- Any new MCP tool, any `store.ts` change, any board format bump or migration,
  any new frontmatter field.
- Making vague-language or risk-evidence findings *blocking* anywhere: the plan
  template's "not a gate" contract is pinned, and FRD-033 accepts flagging.
- Persisting a compiled packet to disk, or a dispatch/orchestration loop that
  consumes it — that is [[SKILL-036]].
- Changing `kanmer-execute`'s existing whole-ticket flow, the checklist
  document contract, or profile requirements.

## Context files (read before implementing)

| File | What it tells you |
| --- | --- |
| `docs/functional/frd/FRD-033-constrained-preparation-and-step-packets.md` | The behaviour paragraphs, acceptance 1–4 and both edge cases |
| `docs/product/prd/PRD-002-…md` requirement 6 | Why the packet exists at all |
| HZN-008 `context.md` | "The controller reconciles board, Git, GitHub, CI and workspace facts after every worker result; worker prose does not advance state" |
| `packages/mcp-server/src/execution-packet.ts:126-165` | The ATX extractor to move into core |
| `packages/mcp-server/src/execution-packet.ts:466-500` | Refusal ordering — non-ticket/legacy, spike (`:483`), missing requirements (`:486`), questions |
| `packages/mcp-server/src/execution-packet.ts:560-598` | Where the ready packet is assembled, and `sectionFromPlan` |
| `packages/mcp-server/src/index.ts:881-905` | Tool registration, identity/`revision` enrichment, `readOnlyHint` |
| `packages/mcp-server/src/smoke.mjs:2020-2160` | The packet fixture and the read-only byte-comparison to extend |
| `packages/core/src/store.ts:307-330, 1630-1700, 2133` | `getRevision`, `getDocWithVersion`/`listTicketDocsWithVersions`, `getGroupDoc` — read-only APIs this ticket consumes and must not change |
| `packages/core/src/io.ts:8-15` | `contentVersion` — the group-context version token |
| `plugins/kanmer/skills/kanmer-plan/assets/plan-template.md` | The twelve pinned headings and the advisory decision-verb blockquote |
| `scripts/verify-skill-prose.mjs:279-350, 488-565` | Exactly which plan/execute sentences are pinned |
| `packages/core/src/gates.test.ts`, `review-attestation.test.ts` | House pattern for a pure core module plus its vitest suite |
| AGENTS.md §7 (plugin/skill sync), §8 gotcha 8 and 15, §10 | Bundle rebuild rules, `revision` semantics, verification checklist |
