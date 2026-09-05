---
id: CORE-129
type: ticket
title: >-
  Validate proof documents for internal consistency so a stale result cannot
  outlive its own evidence
status: done
area: core
assignee: claude-code
profile: fix
stageEntered:
  preparing: '2026-08-31T17:48:20.688Z'
  review: '2026-09-05T13:44:47.422Z'
  verifying: '2026-09-05T14:47:13.751Z'
  done: '2026-09-05T15:02:42.929Z'
labels:
  - reliable-autonomy
  - 0.4.2
groups:
  - HZN-009
links:
  - MCP-057
  - CORE-147
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
  - docs/functional/frd/FRD-002-requirement-profiles.md
  - docs/functional/frd/FRD-006-typed-proof.md
  - docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md
commits:
  - 410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/329'
delivery_state: integrated
delivery_branch: main
delivery_sha: 410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2
delivery_recorded_at: '2026-09-05T15:02:45.876Z'
archived: false
created: '2026-08-27T23:52:07.334Z'
updated: '2026-09-05T15:04:00.265Z'
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

- [x] A fixture proof whose frontmatter says PASS while a later attempt says FAIL is reported inconsistent, and `enter-done` refuses it under strict board policy.
- [x] CORE-042's real free-prose proof is reported legacy/unvalidated before cutover and cannot authorise a new Done transition under strict policy; no prose heuristic rewrites its meaning.
- [x] A well-formed single-attempt PASS proof is unaffected.
- [x] A `receipts[]` list (from [[MCP-057]]) beside `attempts[]` is validated by the same parser — well-formed entries preserved, unknown fields preserved, a receipt whose `head_sha` disagrees with `merged_sha` reported invalid — and a proof without `receipts` is unaffected.

## Scope note 2026-09-05 ([[HZN-009]])

Scheduled for 0.4.2 as the typed-evidence foundation of the recovery release. The existing `plan/plan.md` and `files/files.md` reference a "v0.3.13" roster and a base of `4fda54b4`; before implementation, revalidate both against `main` at `c088be13` or later (CORE-127 and CORE-133 have merged) and record the exact base in a versioned plan correction. Implement after [[MCP-057]] so the `receipts[]` shape is known; do not change proof bytes during the census; the live board's strict cutover decision is taken at the 0.4.2 cut ([[CORE-141]]) and recorded either way.

## Outcome

Shipped as planned (plan version 3, after one review round of remediation — F-001 parser purity and F-002 waiver-semantics documentation). Merged via PR [#329](https://github.com/collisionengineers/kanmer/pull/329) (squash commit `410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2`) on 2026-09-05. Verified PASS at the exact merge SHA (first `schema: 2` proof record written on this board): the bound hosted `pr.yml` `verify` run (33972754959, job `verify` success) covered every obligation that is a subset of `npm run verify`, and the ticket's own decisive product check — a census of the live board's proof records, run against a disposable copy, never the live board — read `complete: true`, digest `proof-census-v1:444c89b9…`, counts `{ valid: 0, legacy: 319, invalid: 2 (GUI-133, GUI-135), absent: 105, total: 426 }`, identically across two audits and two dry runs in one process. `[[CORE-147]]` carries forward the two MCP-057 review deferrals (receipt literal-name coupling and `run_id` presence-only validation). The live board's strict cutover decision remains [[CORE-141]]'s at the 0.4.2 cut, per the ticket's own scope note; this ticket only makes that cutover safely performable. No other follow-up ticket required.
