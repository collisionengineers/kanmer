---
id: CORE-129
type: ticket
title: >-
  Validate proof documents for internal consistency so a stale result cannot
  outlive its own evidence
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - reliable-autonomy
groups:
  - HZN-008
links: []
refs:
  - docs/functional/frd/FRD-034-durable-goal-control-and-independent-review.md
archived: false
created: '2026-08-27T23:52:07.334Z'
updated: '2026-08-27T23:52:07.334Z'
---

## What

Nothing checks that a proof document's machine-readable verdict agrees with its own contents. `result:` in the frontmatter is the only field the gate, the skills and `packages/mcp-server/src/reconciliation.ts` read, yet the body is free prose that anyone may append to — including later reruns that contradict the verdict.

## Why

[[CORE-042]] sat looking finished for five days because of exactly this. Its frontmatter says `result: PASS` (2026-08-22, bound to the correct merged SHA), but further down the same `proof.md` a later independent rerun dated 2026-08-23T14:04Z records `npm run verify` FAIL on five tests, leaves the installed updater cycle INCONCLUSIVE, and closes verbatim: "CORE-042 stays Verifying and is not moved or closed." A confirm-and-finish worker checking the frontmatter alone would have moved it to Done — one did exactly that to [[GUI-141]], whose proof body likewise records an unmet acceptance boundary, and the move had to be reverted.

[[CORE-123]] made the review-attestation checks hard errors in the merge gate. Proofs have no equivalent, even though the proof is what authorises the Verifying → Done move.

## Approach

- Extend the proof-record contract so every rerun is a typed entry in `attempts[]` — with its own `attempted_at`, `result` and exit code — rather than appended prose, and require the top-level `result` to be consistent with the latest attempt.
- Add a validator in `packages/core` (alongside `review-attestation.ts`) that reports a proof as `invalid` when the top-level `result` is PASS while a later attempt records FAIL/INCONCLUSIVE, or when the body contains an explicit later disposition that contradicts it.
- Surface it where it matters: `get_doc_gates`' `enter-done` requirement, the read-only `reconcile_ticket` inspector (which today classifies any non-PASS/FAIL proof as simply `invalid`), and `kanmer-verify`/`kanmer-closeout` prose so a human or agent reading the proof is told to read the whole document.
- Do not retroactively invalidate existing proofs; report, do not refuse, until a strict flag is turned on — the [[CORE-123]] `KANMER_GATE_STRICT` precedent.

## Verification

- [ ] A fixture proof whose frontmatter says PASS while a later attempt says FAIL is reported inconsistent, and `enter-done` refuses it under the strict flag.
- [ ] CORE-042's real proof is reported inconsistent by the validator.
- [ ] A well-formed single-attempt PASS proof is unaffected.
