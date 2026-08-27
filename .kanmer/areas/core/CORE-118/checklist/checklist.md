# Checklist — CORE-118

*One box per ordered plan step or acceptance check. Append progress notes rather
than rewriting.*

- [x] [pre-review] Step 1 — `packages/core/src/plan.ts` exports `parseAtxSections`, `extractAtxSection`, `parsePlan` and `validatePlan`, with the ATX reader moved verbatim from `execution-packet.ts`.
- [x] [pre-review] Step 1 — `plan.test.ts` covers both step forms, the resolved-sentence exemption, an unresolved vague sentence, a plan with no risk category, and a step file absent from `## Expected files`.
- [x] [pre-review] Step 2 — `packages/core/src/step-packet.ts` exports `STEP_PACKET_VERSION`, `STEP_RETURN_STOP` and `compileStepPacket`, and both new modules are exported from `packages/core/src/index.ts`.
- [x] [pre-review] Step 2 — `step-packet.test.ts` covers allowed-file confinement, a forbidden file, `"next"` selection, an out-of-range step, stale and unrecorded evidence, and a deterministic `packetId`.
- [x] [pre-review] Step 3 — `get_execution_packet` accepts optional `step`, returns the compiled `step` block, and returns `ready:false, code:"GATE_BLOCKED"` with the blocking findings when compilation fails.
- [x] [pre-review] Step 3 — with no `step` argument the response is unchanged apart from the additive `validation` block and group-context `version`; refusal order, reasons and `missing` values are byte-for-byte the same.
- [x] [pre-review] Step 3 — the tool roster is still 39 and `get_execution_packet` is still `readOnlyHint: true`.
- [x] [pre-review] Step 4 — `smoke.mjs` gains the structured-plan fixture and asserts allowed-file confinement, recorded tests/commands/expected output, evidence layers, `"next"` selection, `PLAN_STEP_FILE_UNDECLARED` and `PLAN_STEP_UNSTRUCTURED` refusals, and the advisory `validation` block.
- [x] [pre-review] Step 4 — the existing byte-comparison read-only proof also covers a step-mode refusal (tree, ticket file and `activity.jsonl` unchanged).
- [x] [pre-review] Step 5 — plan template, `kanmer-plan`, `kanmer-execute`, `tool-reference.md` and AGENTS.md §8 describe the shipped behaviour, with every pinned heading and sentence left intact.
- [x] [pre-review] Step 6 — `plugins/kanmer/mcp/kanmer-mcp.cjs` is regenerated with `npm run plugin:build` from a checkout that owns its `@kanmer/core` resolution, and committed.
- [x] [pre-review] Run `npm run test -w @kanmer/core` and record the exit code.
- [x] [pre-review] Run `npm run typecheck` and record the exit code.
- [x] [pre-review] Run `npm run build` and record the exit code.
- [x] [pre-review] Run `node packages/mcp-server/src/smoke.mjs` and `npm run smoke:protocol` and record the exit codes.
- [x] [pre-review] Run `npm run verify:skills` and `npm run plugin:check` and record the exit codes.
- [x] [pre-review] Run `npm run verify` and record its exit code plus any known host quirk, without weakening a test.
- [x] [pre-review] Re-read `tool-reference.md` and AGENTS.md §8 by hand — `plugin:check` sees tool names and bundle bytes only.
- [x] [pre-review] No change to `packages/core/src/store.ts`, to any governing document, or to the tool count.
- [ ] [pre-review] Stop at the approved boundary: PR open with a `Kanmer: CORE-118` footer, report written, ticket in Review; do not merge or start another ticket.

`[pre-review]` and `[post-merge]` are plain-text labels for humans and skills. Current gates ignore these labels; use `get_doc_gates` for live gate behaviour.

## Progress notes

- **Base moved during setup.** `git fetch origin` advanced `origin/main` from
  f3060b06 to **c6bbddd6** (CORE-125, PR #296) before the worktree was created,
  so this branch is cut from c6bbddd6 and the CORE-125 `store.ts` overlap the
  lane brief warned about no longer exists. This ticket changes no `store.ts`
  line regardless.
- **Command results** (all from `.worktrees/core-118`):
  - `npm install` → 0
  - `npm run build:core` → 0, `npm run build` → 0
  - `npm run typecheck` (all four workspaces) → 0
  - `npm run test -w @kanmer/core` → 0 — 21 files, **465 tests**, including the
    45 new `plan.test.ts` + `step-packet.test.ts` cases
  - `node packages/mcp-server/src/smoke.mjs` → 0 — **320/320** (was 306/306)
  - `npm run smoke:protocol` → 0 — 50/50; `npm run smoke:headless` → 0
  - `npm run verify:skills` → 0 — 67 checks
  - `npm run plugin:build` → 0; `npm run plugin:check` → 0 — "39 tools match,
    bundle bytes match … isolated MCP handshake lists 39 tools"
  - `npm run verify` → **1**, on the recorded host quirk only:
    `scripts/antigravity-plugin-config.test.mjs` EBUSY ×2 (`test:scripts`
    119 pass / 2 fail). Everything before it passed — `check:manual`, core
    465, GUI 520, `test:http` 124/0. Not chased, no test weakened; the hosted
    `verify` is authoritative.
- **Deviation — complexity budget.** The plan budgeted ~1,300 changed lines; the
  diff is ~2,015 insertions across 13 files (excluding the regenerated bundle).
  The overage is JSDoc-heavy pure code plus the two new vitest suites, not extra
  scope: no acceptance criterion beyond FRD-033 1–3 was absorbed, no file
  outside the plan's Expected files was touched.
- **Deviation — packet version literal.** `kanmer-step-packet/1` had to become
  `step-packet/1`: `scripts/verify-skill-prose.mjs` reads any `kanmer-<word>`
  token in a skill file as a skill reference, so documenting the original
  literal in `tool-reference.md` failed check 5 as a dangling skill
  `kanmer-ste`. Renaming the constant was the fix; the check was not relaxed.
- **Deviation — smoke snapshot scope.** The new read-only proof snapshots
  `<sandbox>/.kanmer` rather than the whole sandbox: by that point in the run
  the sandbox also holds the linked Git worktrees earlier checks create, and
  `treeSnapshot` cannot read them. The board is what must not move, and it is
  what is compared. The two pre-existing whole-sandbox snapshots are untouched.
