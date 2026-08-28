# Files — CORE-131

*The surface area of the change, not the findings behind it. See
`research/research.md` for why each of these is what it is.*

## Where the change lands

| Path | Why |
|---|---|
| `packages/core/src/types.ts` | Extend `ReconciliationRecommendation` with `ticketId` and `revision` (the binding to the evidence it was computed from) and keep `advisory: true`; add `failureClass` to `ReconciliationEvidence["proof"]`; add the two new actions `ROUTE_VERIFICATION_FAILURE` and `RECOVER_EXPIRED_CLAIM`; add the `ReconciliationApplyInput`/`ReconciliationApplyResult` shapes. **Risk:** `ReconciliationEvidence` is consumed by `transferTicket`'s `recovery` via `leaseRecoverySummary`; widening `proof` must stay additive or `LeaseRecoveryEvidence` breaks. |
| `packages/core/src/reconciliation.ts` | The classifier gains the `failure_class` routes for a FAIL proof in Verifying (today it returns `FAILED_VERIFICATION_REQUIRES_DISPOSITION` and no recommendation) and an expired-claim recovery route. **Risk:** the refusal ordering documented at the top of `reconcileEvidence` is load-bearing — board worktree, release evidence, inconclusive, advisory warnings, stage routes. New routes go *inside* the stage section, never before the refusals. The `dirtyWorkspace || missingWorkspace || … return none()` line is what keeps AC4's "preserve dirty work" true for non-Review stages; the expired-claim route must be placed so it survives a dirty workspace (recovery is legal on dirty work) while cleanup never is. |
| `packages/core/src/store.ts` | New `applyReconciliation(id, input)` that dispatches to the existing verbs with `expectedRevision`, plus one durable transition line. **Risk:** must not re-derive its own status check outside the lock (PR #286's bug); must not add a second ownership model; `appendTransition` is private and v2-guarded. |
| `packages/core/src/index.ts` | Export the new types/entry point alongside the existing reconciliation exports. |
| `packages/mcp-server/src/reconciliation.ts` | `proofEvidence` decodes `failure_class`; `collectReconciliationEvidence` stamps the ticket `revision`; new boundary `applyReconciliation` that re-collects, re-classifies, compares and delegates. **Risk:** the bounded-subprocess constants and the `--git-common-dir` identity rule must be reused, not re-implemented. |
| `packages/mcp-server/src/index.ts` | Register `apply_reconciliation` (roster 39 → 40) through the `write(...)` wrapper. **Risk:** do not hand-add `expected_project` to the input schema — `registerTool` injects it for any `readOnlyHint: false` tool (`index.ts:555-558`). |
| `packages/core/src/reconciliation.test.ts` | Classifier tests for the new routes and for the unchanged refusal ordering. |
| `packages/mcp-server/src/reconciliation.test.mjs` | Boundary tests: drift refusal, revision conflict, the F-015 proof-only-changed case, each apply route from fixture evidence. |
| `packages/mcp-server/src/smoke.mjs` | `39 → 40`, add `apply_reconciliation` to the roster list at :72, add annotation and dry-run-unchanged assertions next to the existing CORE-122 block at :2938. |
| `packages/mcp-server/src/smoke-protocol.mjs` | `39 → 40` in both the message string and the predicate at :160-161. |
| `AGENTS.md` | §4 line 413 "registers **39 tools**" → 40; §8 item 19's parenthetical "(roster stays 39)" must be corrected so CORE-118's note does not contradict the new count; add the apply contract to §8. |
| `docs/manual/connect.md` | Line 145 "all 39 tools" → 40. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Regenerated from connect.md by `npm run build:manual`. Never hand-edited. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Add the `apply_reconciliation` row to the **write** tools table and update the `reconcile_ticket` row, which currently says "There is no apply surface". |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated bundle, re-committed. `scripts/check-plugin-sync.mjs:113` compares bytes, not just names. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/store.ts:1117-1180` (`leaseLockFile`, `withLeaseLock`) | The board write lock and, in its doc comment, exactly why it is re-entrant only within one `AsyncLocalStorage` context and why `updateItem → appendTransition → setDoc` would otherwise self-deadlock. It also states the rule this ticket must obey: nothing slow, networked or git-shaped goes inside it. |
| `packages/core/src/store.ts:940-1001` (`backwardMoveEffects`) | The trap. `review → implementing` is refused with `REVIEW_RETURN_NEEDS_ATTESTATION` unless a `needs-changes` attestation is bound to one of the ticket's `prs`, or the reason begins `operator:`; and with `REMEDIATION_BUDGET_EXHAUSTED` once `review_round >= remediation_budget`. Every other backward move needs only a non-empty reason. PR #286's move calls passed no reason at all. |
| `packages/core/src/store.ts:1003-1008` (`appendTransition`) | The durable audit sink: `- <iso> <line>` under `## Transitions` in `scratch/execution.md`, written through `setDoc(append: true)` so it re-enters the already-held lock. Private, and guarded by `loc.kind === "v2"`. |
| `packages/core/src/store.ts:1468-1550` (`transferTicket`) | Expired-claim recovery already exists. It preserves `taken_at`/`branch`/`worktree`, refuses `CLAIM_LIVE` without an `operator:` reason, refuses `RECOVERY_REFUSED` for board/foreign/branch-mismatched workspaces, takes `expectedRevision`, and records the re-read evidence in the transition line. Do not write a second recovery path. |
| `packages/core/src/store.ts:320-360` (`getRevision`, `revisionAt`, `assertRevision`) | The revision is computed over the ticket file **plus every pipeline document**, which is precisely why it — and not `updated` — closes F-015. The refusal wording begins `Conflict:` and that prefix is the classified `REVISION_CONFLICT`. |
| `packages/core/src/activity.ts:36-56` | Why the activity log is not the audit record: the whole body is wrapped in `catch { /* best-effort by design */ }` and it self-truncates to the last `MAX_LINES/2` entries. |
| `packages/mcp-server/src/reconciliation.ts:76-100` (`proofEvidence`) | The proof decoder that must learn `failure_class`. It already rejects an existence-only proof gate as non-PASS evidence — keep that. |
| `packages/mcp-server/src/reconciliation.ts:215-265` (`workspaceEvidence`) | Board-worktree detection happens here, at collection, by comparing the resolved candidate to `store.paths.projectRoot`; and repository identity is proven by physical `--git-common-dir` comparison, the same rule execution-packet resume uses. AC5 is satisfied by this function plus the classifier's first refusal — the apply path must not weaken either. |
| `packages/mcp-server/src/reconciliation.ts:326-338` (`leaseRecoverySummary`) | Converts the very `ReconciliationEvidence` this ticket collects into the `recovery` argument `transferTicket` wants. The adapter already exists. |
| `packages/mcp-server/src/index.ts:555-573` (`registerTool` override, `write`) | `expected_project` is injected into every `readOnlyHint: false` schema automatically, and `write` asserts it, stamps the activity actor from the calling client and calls `ensureInit()`. |
| `packages/mcp-server/src/errors.ts` | `failCoded`/`KanmerError` — how a structured, coded refusal is returned instead of a bare `throw new Error("Conflict: …")`. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md:115-152` | The normative `failure_class` definition and routing table. `implementation → implementing`, `plan → preparing`, `transient` and `inconclusive` stay in Verifying, and **a proof that names no class is `inconclusive`, never retryable**. Code must match this table verbatim; `scripts/verify-skill-prose.mjs:569` pins the prose. |
| `scripts/check-plugin-sync.mjs:86-115, 480-487` | Documented tools are the first cell of a tool-table row in `tool-reference.md`; an undocumented registered tool fails `plugin:check`, which also byte-compares the committed bundle and re-handshakes an isolated MCP server for its tool count. |
| `scripts/build-manual.mjs:21, 249` | `chapters.generated.ts` is generated from `docs/manual/*.md` and the build fails if it is stale. Edit the manual, then run `npm run build:manual`. |
| `.kanmer/groups/HZN-008/context.md` | Scope discipline (no follow-up tickets for non-blocker findings), the interim ownership/remediation rule (30-minute expiry, operator note for transfer, agents never use `force`), and the board-push rule (confirm local tip == `origin/kanmer-board` before trusting `kanmer-gate`). |
| `.kanmer/areas/core/CORE-113/scratch/review.md` | F-015 in the reviewer's own words, and the terminal stop that produced this ticket. F-016 (failing/pending required checks pre-empt the closed-unmerged rollback) is still open on the classifier and is explicitly out of scope here. |
| `docs/functional/frd/FRD-028-rescue-and-reconciliation.md` | The five acceptance criteria and the "never" list. AC1 is CORE-122's and must not regress; AC5's release half is satisfied by leaving `release.state` at `not-applicable`. |

## Ripple effects

- **Tool roster 39 → 40**, in the nine places tabulated in
  `research/research.md`. `smoke`, `smoke:protocol` and `plugin:check` each fail
  independently if one is missed; `verify:docs`/`build:manual` fails if the
  generated chapter is stale.
- **`ReconciliationRecommendation` gains fields.** `reconcile_ticket`'s JSON
  result changes shape (additively). `smoke.mjs:2953` asserts on the
  recommendation and will need the new fields tolerated or asserted.
  `tool-reference.md:26` describes the current shape in prose and must be updated.
- **`ReconciliationEvidence["proof"]` gains `failureClass`.**
  `leaseRecoverySummary` reads `evidence.proof.state` only, so `transferTicket`'s
  recorded evidence line is unaffected — verify that, do not assume it.
- **`scratch/execution.md` gains reconciliation transition lines.** Any consumer
  that parses `## Transitions` (the auto/goal skills read it as a run record)
  sees a new line shape; keep the existing `<verb> <from> → <to> …` grammar.
- **AGENTS.md §8 item 19** currently asserts the roster stays 39 as part of
  CORE-118's note. Correcting it is required, not optional.
- No GUI change: the GUI does not call `reconcile_ticket` and gains no button.
- No board-schema change: no new frontmatter field, no `migrate_board` step.

## Out of scope

- **F-016** (`GH-3867261023`): failing or pending required checks pre-empting the
  closed-unmerged Review rollback. It is a minor, dispositioned classifier
  defect on CORE-122 and, per HZN-008's Scope discipline section, does not
  warrant a follow-up ticket. Recorded here as known residual risk.
- **Release-attempt reconciliation.** `release.state` stays `not-applicable`;
  CORE-116/CORE-132 own persisted release attempts and channel leases. FRD-028's
  "superseded release attempt" and "concurrent release owners" states remain
  classifier-side only, exactly as CORE-122 left them.
- **Any workspace cleanup.** FRD-028 AC4's "cleanup only occurs for a terminal,
  clean, explicitly authorized target" is satisfied by
  `RELEASE_CLEAN_TERMINAL_CLAIM` releasing the *claim*. Removing a worktree or
  deleting a branch stays in `kanmer-closeout` and is not added to this tool.
- **Batch reconciliation / multi-ticket apply.** One ticket per call.
- **`.worktrees/kanmer`, `.worktrees/core-116`, `.worktrees/core-128`** are never
  read, written, created or removed.
- **A new stage, force-push, required-check bypass, `force` on any lease verb.**
- **Cherry-picking `core-113-rescue-reconciliation`.** It is reference only.
