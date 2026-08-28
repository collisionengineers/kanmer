---
kind: review-attestation
pr: "297"
head_sha: "924d7294c128f66c72dd1d8da6f01337cef9ab4b"
verdict: pass
reviewer: "claude-core118-independent-reviewer"
independent: true
plan_hash: "d9e2fefe3d3545d0"
ticket_updated: "2026-08-27T23:43:41.998Z"
board_sha: "190256ddcc63ac28eb368eb2c187529134841c2e"
threads_snapshot:
  - id: "PRRT_kwDOT2PEds6dA5X9"
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/execution-packet.ts"
    line: 622
    finding: "F-008"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dA5YB"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/plan.ts"
    line: 552
    finding: "F-004"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dA5YE"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/plan.ts"
    line: 328
    finding: "F-006"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dA5YH"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/plan.ts"
    line: 182
    finding: "F-003"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dA5YK"
    author: "chatgpt-codex-connector"
    path: "packages/mcp-server/src/execution-packet.ts"
    line: 638
    finding: "F-010"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dA5YP"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/plan.ts"
    line: 674
    finding: "F-007"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dA5YU"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/step-packet.ts"
    line: 202
    finding: "F-009"
    resolved: true
  - id: "PRRT_kwDOT2PEds6dA5YY"
    author: "chatgpt-codex-connector"
    path: "packages/core/src/step-packet.ts"
    line: 218
    finding: "F-005"
    resolved: true
findings:
  - id: "F-001"
    severity: note
    summary: "Advisory-only PLAN_VAGUE_INSTRUCTION / PLAN_RISK_EVIDENCE_MISSING satisfies FRD-033 acceptance 2; nothing must block."
    disposition: rejected-with-reason
    reason: >-
      FRD-033's behaviour text says validation "rejects **or flags**" and acceptance 2 says it
      "identifies" — both are satisfied by flagging. All seven named risk categories are
      implemented literally at plan.ts:459-467 and both codes are emitted on every packet, so the
      criterion is met on its plain text. The pinned plan-template sentence
      ("not a gate or regex score", scripts/verify-skill-prose.mjs:347-348, byte-unchanged in this
      PR) independently points the same way. No change required.
  - id: "F-002"
    severity: minor
    summary: "`## Do not modify` is exact-set membership, so the glob idiom the repo's own plans use (`apps/gui/**`) never fires PLAN_STEP_FILE_FORBIDDEN."
    disposition: deferred-to-ticket
    ticket: "CORE-127"
  - id: "F-003"
    severity: minor
    summary: "normalisePlanPath accepts absolute and parent-traversing paths, so `/etc/hosts` or `../other/x.ts` can reach allowedFiles with no blocker."
    disposition: deferred-to-ticket
    ticket: "CORE-127"
  - id: "F-004"
    severity: minor
    summary: "requireEvidencePin is satisfied by pin count, not a live match; a pin naming no live document degrades to advisory PLAN_EVIDENCE_UNKNOWN and never blocks."
    disposition: deferred-to-ticket
    ticket: "CORE-127"
  - id: "F-005"
    severity: minor
    summary: "compileStepPacket throws TypeError on select 0, -1 or NaN when called directly through the newly public @kanmer/core export."
    disposition: accepted-risk
    reason: >-
      The only production caller is get_execution_packet, whose schema is
      z.union([z.number().int().positive(), z.literal("next")]) at index.ts:891, so no reachable
      path can pass an invalid selector. Defensive hardening on a new export, not a live defect.
  - id: "F-006"
    severity: minor
    summary: "Step identity is purely positional: declared `Step N` values are discarded, and any `###` heading under `## Ordered steps` becomes a step, inflating step.total and shifting positional `next`."
    disposition: accepted-risk
    reason: >-
      Positional indexing is the documented contract (plan.ts:147, AGENTS.md gotcha 19) and it
      fails closed — selecting a non-step heading yields five PLAN_STEP_FIELD_MISSING blockers, so
      no unbounded packet is ever issued. Not required for FRD-033 acceptance 1-3.
  - id: "F-007"
    severity: minor
    summary: "acceptanceIsUsable (plan.ts:673-674) treats any backticked span as executable, so a plan naming only a symbol passes the blocking PLAN_ACCEPTANCE_MISSING check."
    disposition: accepted-risk
    reason: >-
      The failure direction is a false negative on a blocker FRD-033 does not require to block at
      all. Tightening it would promote an advisory-grade heuristic into blocking territory, which
      is the exact trade this ticket's second open question resolved against.
  - id: "F-008"
    severity: minor
    summary: "Documents are read at execution-packet.ts:591 and getRevision at :623, so a concurrent plan edit pairs stale plan bytes with a newer ticket revision."
    disposition: deferred-to-ticket
    ticket: "CORE-127"
  - id: "F-009"
    severity: note
    summary: "`step: \"next\"` advances on checklist state alone with no reconciliation of the previous packet — FRD-033 acceptance 4."
    disposition: deferred-to-ticket
    ticket: "CORE-127"
  - id: "F-010"
    severity: note
    summary: "A step packet compiles for an untaken ticket with workspace {branch: null, worktree: null}."
    disposition: rejected-with-reason
    reason: >-
      This is the established flow, not a regression: today's whole-ticket packet already returns
      claim.taken === null for a fresh ticket, and kanmer-execute creates the worktree and calls
      take_ticket from that packet. Refusing until a workspace is recorded would make the first
      step of every ticket unobtainable, contradicting this PR's "refusal precedence is extended,
      never reordered" constraint.
  - id: "F-011"
    severity: note
    summary: "PLAN_EVIDENCE_UNKNOWN is emitted (plan.ts:551) but is absent from the finding vocabulary listed in tool-reference.md:142-154."
    disposition: deferred-to-ticket
    ticket: "CORE-127"
  - id: "F-012"
    severity: note
    summary: "A one-heading chore plan produces 15 advisories (measured; the report estimated ~12) with ok: true and blockers: 0."
    disposition: accepted-risk
    reason: >-
      Acceptable, not a usability defect: every finding is truthful, correctly non-blocking, and
      carried in an additive field that no existing caller reads. The tool description and both
      skills state the report is advisory. Consumers that surface it (SKILL-036) should filter by
      severity rather than the vocabulary being trimmed.
  - id: "F-013"
    severity: note
    summary: "Complexity-budget deviation: ~2,015 insertions against a ~1,300-line budget."
    disposition: accepted-risk
    reason: >-
      The plan's own escape hatch was honoured — the deviation is reported in
      checklist/checklist.md and the post-implementation report rather than absorbed silently. No
      file outside the plan's Expected files table was touched (verified: 13 source files + the
      regenerated bundle, exactly the declared set) and no acceptance criterion beyond FRD-033 1-3
      was taken on.
---

# Review attestation — CORE-118 (PR #297)

Independent review of `924d7294c128f66c72dd1d8da6f01337cef9ab4b`, cut from
`origin/main` c6bbddd6. The author was `claude-code-core118`; this reviewer is a
separate agent role and did not write the change.

## Verdict

**Pass.** Every packet claim was checked against the diff and independently
re-run. No blocker and no major finding. Thirteen findings recorded, all note or
minor, every one dispositioned; all eight GitHub review threads replied to and
resolved.

## Independently re-run in `.worktrees/core-118`

| Command | Result |
|---|---|
| `npm run typecheck` | **0** — core, mcp-server, ui, gui |
| `npm test -w @kanmer/core` | **0** — 21 files, **465/465** (30 `plan.test.ts` + 15 `step-packet.test.ts` = 45 new) |
| `npm run build` | **0** |
| `node packages/mcp-server/src/smoke.mjs` | **0** — **320/320** (was 306) |
| `npm run smoke:protocol` | **0** — 50/50 |
| `npm run verify:skills` | **0** — all checks passed |
| `npm run plugin:check` | **0** — "39 tools match, bundle bytes match … isolated MCP handshake lists 39 tools" |

Host quirks: **none observed on this run.** The recorded antigravity EBUSY ×2,
core 5 s timeouts and http/tunnel spawn timeouts did not reproduce; core
completed in 68.9 s with no timeout. The full `npm run verify` rail was not
re-run locally because the hosted `verify` check is authoritative and is green at
this head.

## The severity judgement (F-001)

The implementer asked for this to be challenged, so it was tested against the
governing text rather than against the implementation's own reasoning.

FRD-033's behaviour section says validation "rejects **or flags** unresolved
vague instructions", and acceptance 2 says it "**identifies** unresolved vague
language and missing risk-sensitive evidence for state, migration, service,
runtime, public-contract, security and release work". Both readings are
disjunctive or observational; neither requires refusal. The implementation emits
`PLAN_VAGUE_INSTRUCTION` and `PLAN_RISK_EVIDENCE_MISSING` on **every** packet,
whole-ticket and step-scoped alike, and `PLAN_RISK_CATEGORIES`
(`packages/core/src/plan.ts:459-467`) enumerates exactly the seven categories the
criterion names. Acceptance 2 is met.

The pinned-prose argument is real and was verified rather than taken on trust:
`scripts/verify-skill-prose.mjs` is **byte-unchanged** in this diff, so the "not
a gate or regex score" sentence remains pinned and the check was not relaxed.

**Nothing must block.** Promoting either code would additionally be wrong on the
merits — both are fixed keyword tables (`plan.ts:424-444`, `:459-467`) with known
false positives and negatives, and a blocking regex score over human prose is
precisely what the shipped template warns against. Advisory-only is correct.

## Backward compatibility (proven, not asserted)

Two independent guarantees, both verified:

1. **Severity gating.** `validatePlan` computes
   `structural = options.step === undefined ? "advisory" : "blocker"`
   (`plan.ts:687`). Vague, risk and `PLAN_EVIDENCE_UNKNOWN` findings are
   hard-coded `"advisory"`. `stepFindings` receives that same `severity` and
   further narrows with `stepSeverity = chosen ? severity : "advisory"`
   (`plan.ts:609`), where `chosen` is unreachable when `selected` is undefined.
   Therefore with no `step`, `blockers === 0` for **every** input and `ok` is
   always `true`.
2. **Call gating.** The entire compile-and-refuse block is inside
   `if (step !== undefined)` (`execution-packet.ts:625-644`). Without `step`,
   `validation` is computed but never consulted for a refusal.

**Refusal order.** The base commit has 11 `return refuse(...)` sites; the head
has the same 11, in the same order, at the same relative positions
(`execution-packet.ts:486, 488, 493, 496, 501, 504, 508, 517, 526, 572, 581`
versus base `473, 475, 480, 483, 488, 491, 495, 504, 513, 559, 568`). Not one was
reordered, reworded or re-gated. The step refusal is appended at `:641`, strictly
after all of them, and returns the standard
`{ready:false, code:"GATE_BLOCKED", missing: []}` shape plus `validation`.

**Byte compatibility without `step`.** Exactly the three claimed additive fields:
`validation` and optional `step` appended at the end of the ready object;
`groupContexts[].version` inserted after `context`; and `ticket.revision`, which
moved from `index.ts` into `fullTicket` — at the same key position (immediately
after `body`), from the same source (`store.getRevision(id)?.revision ?? null`),
so the serialised packet is unchanged. `getRevision` is still only reached on the
ready path, since it sits at `:623`, after every refusal return; refusal payloads
are untouched.

## Acceptance 3 — does the packet actually bound the worker?

Partly by construction, partly by declaration, and the boundary is honest about
which.

`allowedFiles` is the selected step's own `Files` list, and it is **doubly
gated**: each entry must appear in `## Expected files` (`PLAN_STEP_FILE_UNDECLARED`,
`plan.ts:646-656`) and must not appear in `## Do not modify`
(`PLAN_STEP_FILE_FORBIDDEN`, `:657-666`) — both blockers when a step is selected.
`tests`, `commands`, `expectedOutput`, `doneCondition` and `deviationStop` are
carried verbatim from the step's labelled bullets, and `stopCondition` is the
plan's own stop condition concatenated with `STEP_RETURN_STOP`
(`step-packet.ts:244`). The smoke rail asserts exact values, not shapes —
`allowedFiles === ["src/queue.ts","src/queue.test.ts"]`,
`allowedSymbols === ["enqueue","QUEUE_MAX_RETRIES"]`, `expectedOutput`,
`doneCondition`, `deviationStop` and both stop-condition sentences
(`smoke.mjs:2803-2822`). This is more than echoing the plan: the plan text alone
does not tell a worker which of fourteen files it may touch this step, and the
undeclared-file blocker is a genuine cross-check the plan document cannot perform
on itself.

What the packet does **not** do is enforce the boundary at runtime — that is
FRD-033 acceptance 4, split into CORE-127 before implementation and recorded in
`open-questions`. The split is legitimate and the residual is disclosed in the
report.

**Path derivation robustness (F-002, F-003).** `normalisePlanPath`
(`plan.ts:181-183`) converts `\` to `/`, strips a leading `./`, strips a trailing
`/` and strips wrapping backticks. Probed empirically against the built core:

- **Windows separators** — handled.
- **Case** — comparison is case-sensitive, so `Src/Queue.ts` against a declared
  `src/queue.ts` yields `PLAN_STEP_FILE_UNDECLARED`. Fails **closed**; correct
  direction.
- **Globs** — not expanded. `apps/gui/**` in `## Do not modify` does not forbid
  `apps/gui/main.ts`; measured zero blockers. This matters because the glob idiom
  is what the repo's own plans use, including CORE-118's. Mitigated by the
  Expected-files gate, which a glob-forbidden file must also pass. → F-002.
- **Escapes** — `/etc/hosts` and `../other/x.ts` are accepted verbatim into
  `allowedFiles` with no blocker. → F-003.

Both are deferred to CORE-127, which must classify actual changed paths against a
packet and needs the same normalisation.

## `step: "next"` semantics

`nextStepIndex` (`step-packet.ts:144-160`) resolves in three modes and every
ambiguous case terminates:

- **Named mode** (preferred): if any checklist box names a step
  (`- [ ] Step 2 — …`), the first plan step whose named boxes are absent or
  partly unticked wins. A step with no box at all counts as unfinished.
- **Positional fallback**: when no box names a step, box *i* maps to step *i*.
- **No checklist**: step 1.
- **Plan with no steps** → `null` → refusal "The plan has no ordered steps".
- **Every step ticked** → `null` → refusal "Every ordered step is already
  ticked". Both refusals are pure returns that write nothing.

Positional fallback is the weak mode — a checklist with more boxes than steps and
no step names will mis-map — but it is documented as a fallback in AGENTS.md
gotcha 19 and only applies to checklists that ignore the shipped convention. The
smoke rail proves the named path end to end: `"next"` returns index 1, and after
`- [x] Step 1 …` is written it returns index 2 with `allowedFiles` changing to
that step's list (`smoke.mjs:2844-2864`).

## The `step-packet/1` rename

`scripts/verify-skill-prose.mjs` is **byte-unchanged** in this diff — `git diff`
against the base returns nothing — so the dangling-skill check was not relaxed to
accommodate the original literal. The token is consistent in all five places it
appears: `step-packet.ts:26`, `smoke.mjs:2825`, `tool-reference.md:154`,
`AGENTS.md:638` and the regenerated bundle at `kanmer-mcp.cjs:39626`. A
repository-wide search for `kanmer-step-packet` returns zero hits.

## `extractAtxSection` relocation

At the base commit the symbol had exactly two references, both inside
`execution-packet.ts` itself (its definition at `:133` and its single use at
`:457`) — it was exported but had no external importer, so no consumer was left
behind. At head it is defined at `plan.ts:58`, re-exported through
`packages/core/src/index.ts`, imported by `execution-packet.ts:14` and used at
`:462` by an unchanged `sectionFromPlan`. `EXECUTION_STOP_FALLBACK` and
`EXECUTION_COMMANDS_FALLBACK` (`:30-31`) are untouched and still reached by the
same fallback path. All four workspaces typecheck.

## Claim verification

| Claim | Verdict |
|---|---|
| Tool roster stays 39 | Confirmed — `plugin:check`, `smoke.mjs`, `smoke:protocol` |
| No `store.ts` change | Confirmed — zero matches in `git diff --name-only` |
| No new frontmatter / format bump / persisted artefact | Confirmed — `types.ts`, `gates.ts`, `profiles.ts` untouched |
| No dependency added | Confirmed — no `package.json` or `package-lock.json` in the diff |
| Bundle regenerated | Confirmed — `plugin:check` reports bundle bytes match |
| 45 new core tests | Confirmed — 30 + 15; assertions are behavioural, named for behaviour ("blocks a step file the plan forbids", "invents no research debt for a plan that touches no risk category") and comparing exact values, not shapes |
| No test weakened | Confirmed — `smoke.mjs` diff contains **zero** deleted lines; no existing `*.test.ts` appears in the diff at all |
| Smoke 306 → 320 | Confirmed — 320/320 |
| Files touched match the plan | Confirmed — 13 source files + the bundle, exactly the declared Expected-files set |

## Residual risk

The compiled packet **states** a boundary that nothing yet enforces; CORE-127
carries the enforcement half and CORE-118 `blocks` it. Within compilation, the
containment predicates are deliberately shallow — exact-set path membership
(F-002, F-003), pin-count evidence currency (F-004), and a permissive
executable-acceptance test (F-007) — so a plan can be written that compiles while
naming a path outside the repository or an evidence document that does not exist.
None of these regress existing behaviour, all are confined to the opt-in `step`
mode, and each is recorded above with a disposition. The advisory heuristics
should not be promoted to blockers without being redesigned first.
