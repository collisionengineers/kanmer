---
id: CORE-129
type: ticket
title: >-
  Validate proof documents for internal consistency so a stale result cannot
  outlive its own evidence
status: preparing
area: core
assignee: ''
profile: fix
stageEntered:
  preparing: '2026-08-31T17:48:20.688Z'
labels:
  - reliable-autonomy
groups: []
links: []
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
  - docs/functional/frd/FRD-002-requirement-profiles.md
  - docs/functional/frd/FRD-006-typed-proof.md
archived: false
created: '2026-08-27T23:52:07.334Z'
updated: '2026-08-31T22:52:58.527Z'
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
