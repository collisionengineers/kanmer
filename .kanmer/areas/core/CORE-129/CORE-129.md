---
id: CORE-129
type: ticket
title: >-
  Validate proof documents for internal consistency so a stale result cannot
  outlive its own evidence
status: implementing
area: core
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-08-31T17:48:20.688Z'
taken_at: '2026-09-05T04:04:14.267Z'
branch: CORE-129-typed-proof-record
worktree: .worktrees/CORE-129
claim_expires_at: '2026-09-05T14:12:16.224Z'
claim_controller: claude-code
lease_id: adc83e1b-1f39-4636-a0f4-a4f96d78b093
lease_revision: 8
lease_workspace: 'worktree:c:\users\alex\documents\github\kanmer\.worktrees\core-129'
lease_phase: running-command
lease_heartbeat_at: '2026-09-05T13:42:16.224Z'
labels:
  - reliable-autonomy
  - 0.4.2
groups:
  - HZN-009
links:
  - MCP-057
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
  - docs/functional/frd/FRD-002-requirement-profiles.md
  - docs/functional/frd/FRD-006-typed-proof.md
  - docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md
commits:
  - 1aa725eed1ba21b209f9981d8ab7e8881abe9c02
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/329'
archived: false
created: '2026-08-27T23:52:07.334Z'
updated: '2026-09-05T13:42:16.224Z'
---

## What

Nothing checks that a proof document's machine-readable verdict agrees with its own contents. `result:` in the frontmatter is the only field the gate, the skills and `packages/mcp-server/src/reconciliation.ts` read, yet the body is free prose that anyone may append to — including later reruns that contradict the verdict.

## Why

[[CORE-042]] sat looking finished for five days because of exactly this. Its frontmatter says `result: PASS` (2026-08-22, bound to the correct merged SHA), but further down the same `proof.md` a later independent rerun dated 2026-08-23T14:04Z records `npm run verify` FAIL on five tests, leaves the installed updater cycle INCONCLUSIVE, and closes verbatim: "CORE-042 stays Verifying and is not moved or closed." A confirm-and-finish worker checking the frontmatter alone would have moved it to Done — one did exactly that to [[GUI-141]], whose proof body likewise records an unmet acceptance boundary, and the move had to be reverted.

[[CORE-123]] made the review-attestation checks hard errors in the merge gate. Proofs have no equivalent, even though the proof is what authorises the Verifying → Done move.

## Approach

- Extend the proof-record contract so every rerun is a typed entry in `attempts[]` — with its own `attempted_at`, `result` and exit code — rather than appended prose, and require the top-level `result` to be consistent with the latest authoritative attempt.
- Add one validator in `packages/core` (alongside `review-attestation.ts`) that reports a current typed proof as invalid when the top-level `result` disagrees with its latest authoritative attempt. Historical free prose is reported as legacy/unvalidated rather than heuristically converted into machine authority.
- Surface it where it matters: `get_doc_gates`' `enter-done` requirement, the read-only `reconcile_ticket` inspector (which today classifies any non-PASS/FAIL proof as simply `invalid`), and `kanmer-verify`/`kanmer-closeout` prose so a human or agent reading the proof is told to read the whole document.
- Do not retroactively rewrite or reopen existing proofs. Use a board-owned report/strict policy and the existing `migrate_board` dry run to census historical records before deliberately enabling strict Done authority.

## Verification

- [ ] A fixture proof whose frontmatter says PASS while a later attempt says FAIL is reported inconsistent, and `enter-done` refuses it under strict board policy.
- [ ] CORE-042's real free-prose proof is reported legacy/unvalidated before cutover and cannot authorise a new Done transition under strict policy; no prose heuristic rewrites its meaning.
- [ ] A well-formed single-attempt PASS proof is unaffected.
- [ ] A `receipts[]` list (from [[MCP-057]]) beside `attempts[]` is validated by the same parser — well-formed entries preserved, unknown fields preserved, a receipt whose `head_sha` disagrees with `merged_sha` reported invalid — and a proof without `receipts` is unaffected.

## Scope note 2026-09-05 ([[HZN-009]])

Scheduled for 0.4.2 as the typed-evidence foundation of the recovery release. The existing `plan/plan.md` and `files/files.md` reference a "v0.3.13" roster and a base of `4fda54b4`; before implementation, revalidate both against `main` at `c088be13` or later (CORE-127 and CORE-133 have merged) and record the exact base in a versioned plan correction. Implement after [[MCP-057]] so the `receipts[]` shape is known; do not change proof bytes during the census; the live board's strict cutover decision is taken at the 0.4.2 cut ([[CORE-141]]) and recorded either way.
