# Files — SKILL-036

*The files document. Not the research — this is the **surface area** of the
change, not the findings behind it.*

The shape is SKILL-037's (`3267c7df`): skills prose plus enforcement in
`scripts/verify-skill-prose.mjs`. Nothing under `packages/`.

## Where the change lands

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | The controller contract itself. Broadened to the five FRD-034 scopes with a frozen roster and a named run host group; gains a preflight section (project identity, delivery policy, capability), wider overlap detection, the escalation boundary after a spent remediation budget, Phase 13 active-stage invariants, and the operating-evidence rules (sync-before-gate, thread resolution, hosted-CI discharge, scope discipline, absolute git paths, unique verifier log). **Risk: `verify-skill-prose.mjs` checks 13/14/18 assert literal strings and multi-line regexes against this exact file** — `"one explicit existing group"`, ``never runs `gh pr merge` ``, `read it back`, the five run statuses, the reconciliation-loop regex, the stop-predicate regex, the serial-fallback regex, the completion regex, the retry regex. Every edit must be additive around them, and the whole file re-read after editing. |
| `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md` | Gains the run's scope/authority/budget fields (`scope`, `scope_selector`, `authority`, `replan_used`) and a `Selection contract` line that says the roster is frozen. **Risk: check 13 asserts the five headings and eleven existing frontmatter fields verbatim** — additions only, no renames, no removals. |
| `plugins/kanmer/skills/kanmer-auto/assets/current-run-template.md` | Pointer gains the same scope identity so a resuming controller can tell which run it is adopting before opening the history record. Check 13 asserts `run_path: automation/runs/<run-id>.md` and the `## Resume instruction` heading. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | Two additions only: the reviewer must push/confirm the board before treating a gate result as current (the `SYNC_REQUIRED`/stale-board rule, expressed so it works on the installed v0.3.12 server), and resolving a GitHub thread is the same obligation as dispositioning it because `required_conversation_resolution` holds the PR at `BLOCKED`. **Risk: check 18's `remediationContract` includes two negative lookaheads on this file** (`!/leave the\s+ticket in Review, and do not merge/i`, `!/becomes a linked PR Review ticket/i`) — do not reintroduce either phrase. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Two additions: a red hosted run is discharged with a same-SHA re-run + diff-untouched confirmation + mechanism argument, retaining every attempt (it is `transient` only with that evidence); and the proof is read in full, never frontmatter-only, with a unique verifier log path. **Risk: check 16 and check 18 assert the retirement contract and the exact `failure_class` table rows** — the table must not gain a fifth class. |
| `scripts/verify-skill-prose.mjs` | New check block 19 asserting the SKILL-036 contract, exactly as check 18 does for SKILL-037. `EXPECTED_SKILLS` stays 12 (no new skill). |
| `scripts/verify-skill-prose.test.mjs` | Extend the existing harness so the new checks are exercised rather than only run. |
| `AGENTS.md` | One line: the skills-tree comment for `kanmer-auto/` currently reads "clear an area via parallel subagents in conflict-free waves", which is already stale and becomes actively wrong. **Risk: `verify:agents-block` owns the managed block between markers — this line is outside it; confirm before editing.** |

## Context files

| Path | What it tells the implementer |
|---|---|
| `scripts/verify-skill-prose.mjs` checks 13, 14, 16, 18 | The literal strings and regexes that make an innocuous rewording a CI failure. Read these *before* editing any SKILL.md, not after. |
| `packages/core/src/store.ts` ~line 1001 (`backwardMoveEffects`) | The real authority rule. Every backward move needs a reason; **only** `review → implementing` needs a `needs-changes` attestation bound to a `prs[]` entry or an `operator:` reason. `review_round` increments there and `round >= budget` throws `REMEDIATION_BUDGET_EXHAUSTED`, which only an `operator:` reason clears. Read-only — this ticket must not touch it. |
| `packages/core/src/review-attestation.ts` | Why `threads_snapshot` must be a YAML **array**; a mapping is rejected as invalid and the gate only warns, so the drift survives. |
| `AGENTS.md` rule 20 (delivery) | `resolveDelivery(board)` + `deliveryTargets(policy, item)` are the single source for the PR target and the verification target, and a hotfix is defined by a ticket's recorded `delivery_branch`, never by a branch name. Kanmer's own board has no `delivery:` block, so it resolves main-only — a hardcoded `main` passes here and is still wrong. |
| `AGENTS.md` rules 17–18 (leases, batches) | `leaseState()` is the only expiry rule; `transfer` is the reclaim and deletes nothing; a batch is frozen by its first member's take and `release` refuses `BATCH_ACTIVE` until every member is terminal. |
| `.kanmer/groups/HZN-008/context.md` | The binding constraints for this batch: the interim ownership rule, the corrected hosted-CI rule, `required_conversation_resolution`, board-sync-before-gate, and the Scope discipline section. |
| `.kanmer/groups/HZN-008/automation/runs/20260827T133106Z-claude-code.md` | The live ledger this contract is derived from — the concrete failure each new rule exists to prevent. Also the de facto proof that the template's five headings and ledger table survive two days of real use unchanged. |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | The re-entry lane the remediation route depends on: same branch, worktree and PR, `take_ticket action: "renew"`, never a second PR. Asserted by check 18; do not restate its rules in `kanmer-auto`. |
| `scripts/check-plugin-sync.mjs` | Refuses to run from a linked git worktree, and strictly parses every `SKILL.md` frontmatter. A frontmatter `description:` edit must stay valid YAML. |

## Ripple effects

- `npm run verify:skills` is the gate for every prose edit here; it must be run
  from the ticket worktree after each file change, not once at the end.
- `npm run verify:agents-block` covers the AGENTS.md managed block; the line
  being edited is outside it, so this is a confirmation run, not a target.
- `npm test`'s `test:scripts` rail runs `scripts/verify-skill-prose.test.mjs`,
  so the new checks must have a test that passes on Windows.
- No plugin bundle change (`plugins/kanmer/mcp/kanmer-mcp.cjs` untouched), so
  `plugin:check` is not owed and cannot run from the ticket worktree anyway.
- No MCP tool names change, so `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`
  is untouched.
- `npm run verify` is expected to exit 1 on the antigravity `EBUSY` pair; that
  is CORE-128's lane and is recorded, not fixed, here.

## Out of scope

- **A new `kanmer-goal` skill.** Deliberate: `EXPECTED_SKILLS` stays 12. See
  `research` — a second orchestrator forks the run-state pattern the ticket
  explicitly forbids forking.
- **`packages/core` and `packages/mcp-server`.** Being edited by the CORE-131
  lane. No new tool, field, error code or gate is required: every mechanism this
  contract composes already merged.
- **`scripts/antigravity-plugin-config.test.mjs`** and the Windows `EBUSY`/
  timeout flakes — CORE-128 owns them.
- **A fifth `failure_class`.** Phase 12's extra routing cases (stale review,
  unavailable service, owner-only decision) are expressed as *controller*
  routing over the four classes `kanmer-verify` already defines.
- **Changing the `review → implementing` authority.** CORE-121 owns it; adding a
  third authority is the named defect.
- **Merging, resolving GitHub review threads, filing follow-up tickets, and any
  work on a second ticket.**
- **`.worktrees/kanmer`, `.worktrees/core-128`, `.worktrees/core-131`, and every
  `verify-*` worktree.**
