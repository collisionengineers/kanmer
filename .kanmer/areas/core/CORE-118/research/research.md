# Research — CORE-118: compile evidence-backed constrained plans into step packets

## Question

How does FRD-033 land on the surfaces that exist at `origin/main` f3060b06 —
`get_execution_packet` (whole-ticket, read-only, ordered refusals), the plan /
checklist document contract, `kanmer-plan`'s pinned templates and CORE-114's
document-inclusive `revision` — as **one reviewable PR**, without a new MCP
tool (roster stays 39), without a board format bump (the live board is served by
the installed v0.3.12 server), and without editing the `store.ts` mutation paths
that the concurrent CORE-125 lane owns?

## Findings

### The existing packet is whole-ticket, and every part of it is reusable

- `packages/mcp-server/src/execution-packet.ts` returns one packet for the whole
  ticket: `ticket`, `claim` (CORE-121 + CORE-115 lease + CORE-124 batch),
  `groupContexts`, `documents` (`plan`/`checklist`/`files` with content
  **versions**), `extraDocs` (path + version), `gates`, `warnings`,
  `stopCondition` and `commandsHint`. The last two are already derived by ATX
  section extraction from the plan — `extractAtxSection` (`:133`),
  `parseAtxSections` (`:142`), `sectionFromPlan` (`:454`), used at `:596-597`.
  That extractor is the seed of a real plan parser and is currently private to
  the MCP package; nothing outside `execution-packet.ts` imports it (grep: only
  internal call sites).
- Refusal order is fixed and documented in `references/tool-reference.md:25`:
  non-ticket/legacy → spike (`execution-packet.ts:483`) → unmet leave-preparing
  requirements (`:486`) → unresolved questions → incomplete/unsafe taken
  location → occupied by another actor. Each refusal is a normal
  `{ready:false, code:"GATE_BLOCKED", reason, missing}` value and the whole call
  is read-only — `smoke.mjs:2038-2082` snapshots the tree, the ticket file and
  `activity.jsonl` and asserts they are byte-identical after a packet call.
  FRD-033's edge case "a packet refusal leaves board stage, claim and workspace
  unchanged" is therefore **already true**; this ticket must keep it true for the
  new refusal and extend that snapshot assertion to it.
- `mcp-server/src/index.ts:881-905` already enriches the packet after the fact
  with the FRD-029 logical project identity and the ticket's document-inclusive
  `revision` (`store.getRevision`, `store.ts:311`). A step packet needs exactly
  that pair as its staleness anchor — no new store read.
- The registered `inputSchema` is `{ id, resume? }`. Adding an optional `step`
  is a parameter change, not a tool: `smoke.mjs:69` and
  `smoke-protocol.mjs:160` pin **39** tools and `plugin:check` compares tool
  *names*, not schemas. AGENTS.md §4/§5, `docs/manual/connect.md:145` and the
  tool reference state the count; none needs to change.

### Evidence versions already exist; only group context lacks one

- `store.listTicketDocsWithVersions(id)` (`store.ts:1684`) enumerates every
  ticket document with a `contentVersion` (sha256/16 of exact bytes,
  `io.ts:13`). That is the "ticket impact research" layer: `research/*`,
  `files/*`, `plan/*`, `checklist/*` with versions, already read by the packet.
- The "shared group research" layer is `store.getGroupDoc(id, "context.md")`
  (`store.ts:2133`) which returns **content only, no version**. `contentVersion`
  is exported from core, so the packet can hash the bytes it already read. This
  keeps the change out of `store.ts` entirely — which matters, because CORE-125
  is concurrently reworking the locking of `updateItem`/`moveItem`/`setDoc`.
  **No `store.ts` edit is needed for this ticket at all.**
- CORE-114's `revision` (`rev1:…`, `store.ts:307-330`, AGENTS §8 gotcha 15) is
  computed over the ticket file plus every pipeline document except
  `scratch/`/`reference/`. Recording it in the packet is what later lets a
  controller detect "the plan moved under this worker" ([[CORE-127]]).

### Vague-language detection must stay advisory — the repo has already decided that once

- `plugins/kanmer/skills/kanmer-plan/assets/plan-template.md` carries a
  blockquote: "`investigate`, `decide`, `choose`, and `determine` usually mean
  planner work remains. … **This is not a gate or regex score.**"
  `kanmer-plan/SKILL.md` step 5 repeats it ("This is not a hard gate").
- `scripts/verify-skill-prose.mjs:347-348` **pins both properties**: the template
  must keep exactly one `## Stop condition` heading and must match
  `/investigate.*decide.*choose.*determine[\s\S]*not a gate/i`, plus the twelve
  required `##` headings (Objective, Starting state, Governing docs, Required
  changes, Expected files, Do not modify, Constraints, Ordered steps, Acceptance
  checks, Commands, Failure and deviation rules, Stop condition).
- FRD-033 says validation "rejects **or flags**" unresolved vague instructions,
  and acceptance 2 says validation "**identifies**" vague language and missing
  risk-sensitive evidence. Flagging satisfies the FRD *and* the pinned prose.
  So: vague language and risk-evidence gaps are reported as **advisory**
  findings; only structural absence (no compilable step, no allowed files, no
  tests, no done condition, no acceptance check, stale recorded evidence) is a
  **blocker**, and blockers only refuse in the new step-scoped mode.

### The step-scoped mode is what makes the acceptance criteria implementable without breaking anything

- Acceptance 1 is about *unattended* execution. Today's whole-ticket packet is
  the attended hand-off `kanmer-execute` uses, and hundreds of existing plans in
  this repo's own board would fail a strict plan contract. Making the strict
  contract apply **only when a caller asks for a step** (`step: <n> | "next"`)
  is therefore both backward compatible and a literal reading of AC1: a worker
  cannot get a *bounded step packet* without current evidence, a concrete plan,
  resolved questions, a known workspace and executable/manual acceptance checks.
- The existing plan template's `## Ordered steps` is a numbered list — it cannot
  hold per-step preconditions, exact change, preserved behaviour, negative
  cases, tests, commands, done condition and deviation stop. An **additive**
  `### Step N — <title>` sub-heading form under the same `## Ordered steps`
  heading holds them as labelled bullets and keeps every pinned `##` heading
  intact. A plain numbered list still parses (title only) and simply cannot be
  compiled into a step packet — the refusal names the missing fields.
- Allowed files come from the intersection of the step's own `Files:` field and
  the plan's `## Expected files` table; forbidden files come from
  `## Do not modify`. A step naming a file the plan never declared is a blocker,
  which is exactly "a generated packet limits a worker to its allowed files".
- Acceptance 4 (a *controller* detecting forbidden-file changes, stale document
  versions and plan deviation after the worker returns) needs Git observation of
  the recorded workspace and belongs with the read-only `reconcile_ticket`
  inspector from CORE-122 (`packages/mcp-server/src/reconciliation.ts`), not
  with compilation. It is split into **[[CORE-127]]** (created, `blocks` edge
  from this ticket) so this PR stays reviewable.

### Trivial work must not accrue invented deep-research debt

- Profiles already do most of this: `chore` requires only `plan`, `fix` requires
  `files` + `plan`, `spike` is refused outright by the packet
  (`execution-packet.ts:483`). `smoke.mjs:2131-2143` asserts a plan-only chore
  still receives a ready packet. Risk-sensitive evidence findings must be
  derived from **what the plan actually touches** (declared file paths and
  required-change prose), never from a profile or a ticket field, and must stay
  advisory — otherwise a one-line chore inherits a research demand nobody asked
  for, which the FRD's first edge case forbids.

### Build, test and doc rails this must satisfy

- Core is vitest (`packages/core`, `--no-file-parallelism`); pure modules with
  `*.test.ts` beside them is the house pattern (`gates.test.ts`,
  `review-attestation.test.ts`, `reconciliation.test.ts`). The MCP wiring is
  covered by `packages/mcp-server/src/smoke.mjs` (the packet fixture block at
  `:2020-2160` is the one to extend), which is part of `npm run verify`.
- `plugins/kanmer/mcp/kanmer-mcp.cjs` is a committed build artifact and core
  compiles **into** it, so `npm run plugin:build` + `plugin:check` are required
  (AGENTS §8 gotcha 8). `plugin:check` refuses only when the checkout does not
  own its `@kanmer/core` resolution (`scripts/lib/plugin-checkout-guard.mjs`) —
  a worktree with its own `npm install` does, so the rebuild is legitimate there.
- `verify-skill-prose.mjs` pins the plan-template headings/prose listed above and
  pins several `kanmer-execute` sentences (from `:488`); any skill edit must be
  an **added** sentence, not a rewrite of a pinned one.
- No project-declared sources: `get_sources(area: core, labels: [reliable-autonomy])`
  → `declaredCount: 0`. Nothing fetched, nothing skipped.

## Implications

- **Two new pure core modules, no `store.ts` change.** `plan.ts` (ATX section
  parsing moved out of `execution-packet.ts`, expected-files table, do-not-modify
  list, ordered steps in both forms, plus `validatePlan` returning typed
  `{code, severity, message, …}` findings) and `step-packet.ts`
  (`compileStepPacket`: pure, takes the parsed plan plus already-read identity,
  workspace, version and evidence inputs).
- **One MCP parameter, not a tool.** `get_execution_packet` gains optional
  `step` (1-based index, or `"next"` = first unticked checklist box). Absent →
  today's packet plus an advisory `validation` block. Present → a `step` block
  carrying packet version/id, project + ticket + revision, batch/workspace, plan
  path/version, step identity, allowed files/symbols, forbidden files, required
  and forbidden behaviour, negative cases, tests, commands, expected output, done
  condition, deviation stop and a one-step stop condition; or a `GATE_BLOCKED`
  refusal appended **after** every existing refusal, carrying the blocking
  findings and leaving the board untouched.
- **Evidence is two labelled layers** in the packet: `evidence.group[]`
  (group id, `context.md`, `contentVersion`) and `evidence.ticket[]`
  (`research/*`, `files/*` paths with versions), plus the plan's own recorded
  evidence versions compared against the live ones — a mismatch is the blocker
  that implements "current required evidence".
- **Scope split recorded:** this ticket delivers FRD-033 acceptance 1–3;
  [[CORE-127]] delivers acceptance 4.
- **Surfaces touched:** core `plan.ts`/`step-packet.ts` (+ tests) / `index.ts`,
  `execution-packet.ts`, `mcp-server/index.ts`, `smoke.mjs`, the plan template
  and `kanmer-plan`/`kanmer-execute` prose (added sentences only),
  `tool-reference.md`, AGENTS §8, and the rebuilt plugin bundle.
