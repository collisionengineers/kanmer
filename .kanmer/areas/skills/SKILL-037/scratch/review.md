---
kind: review-attestation
pr: "290"
head_sha: "e3354556a9a40b11d5b4b849708306320162c7bc"
verdict: pass
reviewer: "claude-skill037-delta-reviewer"
independent: true
plan_hash: "48d3f75344326fca"
ticket_updated: "2026-08-27T16:59:39.441Z"
board_sha: "4ca6be058cf38ffd32959494476ecfc19c48ce7e"
expected_reviewers:
  - "claude-skill037-delta-reviewer"
threads_snapshot:
  - source: github-issue-comment
    id: "IC_kwDOT2PEds8AAAABRGWsOw"
    resolved: false
    finding: "F-004, F-005, F-006, F-003, F-008, F-009, F-010, F-011, F-012"
findings:
  - id: F-001
    severity: blocker
    summary: "Required check kanmer-gate red at e6c9e0ad because the remote board was stale (WRONG_STAGE); verify pending."
    disposition: fixed
    reason: "Board pushed; run 33095985476 at e3354556: kanmer-gate SUCCESS (16:59:24Z), verify SUCCESS (17:04:27Z)."
  - id: F-002
    severity: minor
    summary: "kanmer-verify routing table implementation row contradicted itself about landing on the merged PR."
    disposition: fixed
    reason: "e3354556: row now says the fix reuses the same ticket, branch and worktree but necessarily opens a new PR because the reviewed PR is merged; next review binds to the new PR."
  - id: F-003
    severity: minor
    summary: "Default class for an unclassified non-PASS proof stated inconsistently (transient vs inconclusive)."
    disposition: fixed
    reason: "e3354556: kanmer-verify transient row 'Never the default', inconclusive row 'Default for any non-PASS proof that names no class'; tool-reference proof section aligned; kanmer-auto already said inconclusive. Verified by grep across all three files."
  - id: F-004
    severity: note
    summary: "Textual conflict with CORE-123 in the kanmer-review attestation paragraph."
    disposition: fixed
    reason: "Resolved on rebase onto 5684174a: CORE-123's board_sha/get_status.boardSync/SYNC_REQUIRED sentence retained verbatim (SKILL.md lines 166-170), SKILL-037's 'always writes both' wording follows it."
  - id: F-005
    severity: note
    summary: "Prose claimed malformed board_sha/expected_reviewers/threads_snapshot invalidate the attestation while main's parser ignored them."
    disposition: fixed
    reason: "packages/core/src/review-attestation.ts on main (post CORE-123) validates all three when present (full SHA / non-empty strings / array) and treats them as optional when absent; the paragraph is now true against the live parser."
  - id: F-006
    severity: minor
    summary: "Closeout/verify accept WAIVED_BY_OPERATOR as a Done shape while reconciliation classifies non-PASS/FAIL proofs as invalid and AGENTS.md rule 20 says Done requires PASS (Codex P1 'Keep operator waivers out of Done')."
    disposition: accepted-risk
    reason: "Carried unchanged: WAIVED_BY_OPERATOR was already the documented human disposition on main before this PR; only closeout was aligned. Reconciliation/AGENTS.md rule alignment is a follow-up core/setup ticket outside this docs-only scope; the store's Done gate is structural so nothing is over-promised as enforcement."
  - id: F-007
    severity: note
    summary: "Check 18 negative fixture covers two of six sub-checks; duplicated '17' headers left alone."
    disposition: accepted-risk
    reason: "Positive run pins all six sub-checks and the negative fixture proves the check can fail; not required by the plan's acceptance checks."
  - id: F-008
    severity: minor
    summary: "kanmer-execute Finish step 2 records the PR in prs[] before step 3 pushes and runs gh pr create (Codex P1 'Create the PR before recording its reference'); the ordered list asks for a value that does not exist yet."
    disposition: accepted-risk
    reason: "Workflow step 6 (line 35-38) states report, traceability, push and PR open together and any agent must create the PR before it can cite it; this run did so. Remediation budget for this ticket is exhausted (review_round 1 of 1) and the defect is a step-order nit; controller should fold a step swap into the next skills ticket."
  - id: F-009
    severity: minor
    summary: "Codex P1 'Route verification failures one stage at a time': verifying → implementing / preparing routes skip stages."
    disposition: rejected-with-reason
    reason: "packages/core/src/store.ts backwardMoveEffects permits any backward move with a reason (only review → implementing has extra rules); the one-gated-boundary rule governs forward gated boundaries. The prose matches store behaviour and FRD-034 AC4."
  - id: F-010
    severity: minor
    summary: "Codex P1 'Distinguish verification remediation from review remediation': kanmer-execute keys the re-entry lane on claim.reviewRound >= 1, so a post-merge implementation-class return on a ticket that already used its needs-changes round would read as same-PR remediation and skip the new PR that kanmer-verify requires."
    disposition: accepted-risk
    reason: "Real but narrow: the verify routing table (implementation row) explicitly states the fix opens a new PR, and the ## Transitions reason quotes 'proof FAIL implementation', which the re-entry lane tells the worker to read. Budget exhausted for this ticket; a follow-up should key re-entry on the recorded transition/proof state rather than reviewRound alone."
  - id: F-011
    severity: minor
    summary: "Codex P1 'Rebase the retained branch before opening a remediation PR': after a squash merge the retained branch still has the pre-squash base, so a new PR from it would re-present the original diff."
    disposition: accepted-risk
    reason: "Out of the plan's bounded change list; the implementation row now says a new PR against the integration target is opened, and kanmer-execute's fresh lane already branches from origin/main. A one-sentence 'rebase onto the merged SHA first' belongs in the follow-up that also fixes F-010."
  - id: F-012
    severity: note
    summary: "Codex P1 'Keep renewing claims while long commands run': a single pre-command renew can still expire during a long rail, allowing a legal transfer."
    disposition: accepted-risk
    reason: "Claim window and heartbeat semantics belong to CORE-121's claim design, not this prose ticket; transfer requires an expired claim plus a scratch note, and the prose already says renew before any long command."
---

# Delta review — SKILL-037 / PR #290 at e3354556 (round 1)

Independent delta reviewer `claude-skill037-delta-reviewer` (author: `claude-code`). Scope per the review contract: prior findings F-001..F-007, changed lines since e6c9e0ad (rebased onto 5684174a, commits 99576700 + e3354556), the direct parser contract (`packages/core/src/review-attestation.ts`, `store.ts backwardMoveEffects`), and the relevant rails. Not a new full audit.

## Changed lines

- Range diff 99576700..e3354556: only `kanmer-verify/SKILL.md` routing table (three rows) and `tool-reference.md` proof paragraph — exactly F-002/F-003.
- `git diff --stat 5684174a..e3354556`: 8 files, +407/-61, the plan's Expected files only; identical with `--ignore-all-space`, so no line-ending churn.
- Rebase resolution in `kanmer-review/SKILL.md` keeps CORE-123's `board_sha` / `get_status.boardSync.localSha` / `SYNC_REQUIRED` sentence and matches the main parser (optional-when-absent, invalid-when-malformed).

## Acceptance checks (run independently in `.worktrees/skill-037` at e3354556)

- `npm run verify:skills` — exit 0, ALL CHECKS PASSED (check 18 green).
- `npm run verify:agents-block` — exit 0, 31/31.
- `node --test scripts/verify-skill-prose.test.mjs` — 13 pass, 0 fail.
- `npm run verify:docs` — PASS (manual up to date, 22 chapters).

## Required checks at e3354556 (run 33095985476)

`verify` SUCCESS, `kanmer-gate` SUCCESS (ran after the board push; no rerun needed). `regate` skipped (not required).

## Threads

GraphQL `reviewThreads` is empty; `reviews: []`. One Codex issue comment (bot, not an expected reviewer — evidence only) posted at 17:00:27Z against the old head e6c9e0ad with nine P1 items; each is mapped above (F-003/F-004/F-005 fixed, F-006 carried, F-008..F-012 new). None is a blocker or major against the contract as written; F-008/F-010/F-011 are worthwhile follow-ups for the next skills ticket since this ticket's remediation budget is spent.

## Residual risk

F-006..F-012 accepted as recorded; no open blocker/major. Board tip 4ca6be05 is pushed (local == origin/kanmer-board).
