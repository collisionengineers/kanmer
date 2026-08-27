---
kind: review-attestation
pr: "290"
head_sha: "e6c9e0ad2cbb3f55ea287bcb25026096f2fe2f20"
verdict: needs-changes
reviewer: "claude-skill037-independent-reviewer"
independent: true
plan_hash: "48d3f75344326fca"
ticket_updated: "2026-08-27T16:50:23.509Z"
board_sha: "f7188a8113d686c1b19273eb4f10acc3072982d2"
expected_reviewers:
  - "claude-skill037-independent-reviewer"
threads_snapshot: []
findings:
  - id: F-001
    severity: blocker
    summary: "Required check kanmer-gate is red at e6c9e0ad (WRONG_STAGE: remote board b31296d8 synced 16:46Z still shows implementing; ticket moved to review 16:50Z) and required check verify is still pending. Environmental/stale-board, not a defect in the PR; needs a board push + re-gate and a replacement attestation."
    disposition: open
  - id: F-002
    severity: minor
    summary: "kanmer-verify routing table, implementation row: 'same branch, worktree and PR — the fix lands as a new PR only because the old one is already merged' contradicts itself (the PR is merged, so remediation cannot land on it). Reword to 'same branch and worktree; a new PR, since the reviewed one is already merged'."
    disposition: open
  - id: F-003
    severity: minor
    summary: "Default class for an unclassified non-PASS proof is stated inconsistently: kanmer-verify says transient is the 'Default for any non-PASS until classified', kanmer-auto says 'A proof without a class is inconclusive until the verifier classifies it'. Pick one (inconclusive is the safer default) and align both skills."
    disposition: open
  - id: F-004
    severity: note
    summary: "Textual conflict with origin/core-123-merge-gate-board-sync confined to one kanmer-review paragraph (lines ~167-180 after merge): SKILL-037 says expected_reviewers/threads_snapshot are always written, CORE-123 says they are optional/omit rather than guessing. tool-reference.md merges cleanly (CORE-123 edits only the get_status row). On rebase after #288 the SKILL-037 wording should win; the board_sha/SYNC_REQUIRED sentence is already identical."
    disposition: accepted-risk
    reason: "Controller has sequenced #288 first followed by a rebase + delta review of #290; the conflict is a single localised hunk with a known resolution."
  - id: F-005
    severity: note
    summary: "tool-reference.md and kanmer-review state that a present-but-malformed board_sha/expected_reviewers/threads_snapshot invalidates the attestation. That validation exists only on the CORE-123 branch; packages/core/src/review-attestation.ts on main ignores unknown keys entirely (so attestations carrying the keys stay valid on main, but malformed values are not rejected until #288 merges)."
    disposition: accepted-risk
    reason: "#288 is sequenced to merge before #290, after which the sentence is true; no window in which the prose is live against the main parser."
  - id: F-006
    severity: minor
    summary: "kanmer-closeout now accepts Done + WAIVED_BY_OPERATOR, and kanmer-verify says the waiver 'permits the final move', but packages/mcp-server/src/reconciliation.ts classifies any proof result other than PASS/FAIL as state 'invalid', and AGENTS.md managed rule 20 still says 'Done requires PASS'. The store's Done gate is structural (proof existence), so nothing is over-promised as enforcement, but a waived Done ticket will reconcile as an invalid proof."
    disposition: accepted-risk
    reason: "WAIVED_BY_OPERATOR was already documented as the human disposition in kanmer-verify and tool-reference on main before this PR; this PR only aligns closeout with it. Reconciliation/AGENTS.md rule 20 alignment belongs to a follow-up core/setup ticket, not this docs-only scope."
  - id: F-007
    severity: note
    summary: "Check 18 negative fixture exercises only two of the six sub-checks (review same-PR return, execute re-entry); the settle-rule, verify, closeout and auto sub-checks have no negative fixture. Check numbering leaves the pre-existing duplicated '17' headers alone, which is acceptable for this scope."
    disposition: accepted-risk
    reason: "The positive run pins all six sub-checks and the negative fixture proves the check can fail; fuller negative coverage is not required by the plan's acceptance checks."
---

# Review — SKILL-037 / PR #290 at e6c9e0ad (round 0, consolidated)

Independent reviewer `claude-skill037-independent-reviewer`; the implementer ran under client `claude-code`. Merge is on hold by controller sequencing regardless of verdict (#288 CORE-123 merges first; #290 then gets a rebase + delta review). This attestation was NOT followed by a `move_item review → implementing`: F-001 is an environmental gate state, not an in-scope defect, so the sanctioned return is not taken. Replace this record after the board is pushed and the checks re-run.

## What changed

Docs-only: `kanmer-review`, `kanmer-execute`, `kanmer-verify`, `kanmer-closeout`, `kanmer-auto` SKILL.md; `kanmer-tickets/references/tool-reference.md`; `scripts/verify-skill-prose.mjs` (check 18) and its test (one negative fixture). `git diff --stat origin/main..e6c9e0ad` touches exactly the plan's Expected files (8 files, +413/-58). No `packages/*`, bundle, workflow or AGENTS.md changes. Matches the post-implementation report.

## Acceptance checks (run independently in `.worktrees/skill-037`, clean tree at e6c9e0ad)

- `npm run verify:skills` — exit 0, ALL CHECKS PASSED (check 18 six sub-checks PASS).
- `npm run verify:agents-block` — exit 0, 31/31.
- `node --test scripts/verify-skill-prose.test.mjs` — 13 tests pass, 0 fail (includes the new negative fixture).
- Golden scenarios (a)/(b) walked through in the report and consistent with the new prose.

## Scrutiny points

1. Enforcement claims vs `packages/core/src/store.ts` `backwardMoveEffects`: the review skill's "store enforces" sentence (REVIEW_RETURN_NEEDS_ATTESTATION unless valid needs-changes attestation whose `pr` matches `prs[]`, or `operator:` reason; increments `review_round`; REMEDIATION_BUDGET_EXHAUSTED when round >= budget; `operator:` raises the budget) is exactly what the code does. Verifying → Implementing/Preparing is described as needing only a `reason` (correct: non-review backward moves return `{ reason }`). Transfer/renew semantics (CLAIM_LIVE, CLAIM_NOT_OWNED, branch/worktree/taken_at preserved) match `transferTicket`/`renewTicket`. The settle rule, delta scope, thread→F-id mapping and failure_class routing are correctly framed as procedure ("the parser does not enforce it"). No sentence over-promises enforcement. Minor wording defects: F-002, F-003.
2. Expected reviewers: defined as the independent subagent reviewer(s) named for the ticket; "Codex, GitHub code-review bots ... are **never** expected reviewers and never a gate ... their absence blocks nothing". Bot threads that exist are evidence only. No wording makes Codex a gate. Confirmed.
3. Attestation keys: `board_sha` (full SHA), `expected_reviewers` (non-empty strings), `threads_snapshot` (array) match `review-attestation.ts` on `origin/core-123-merge-gate-board-sync`; main's parser has none of them and ignores unknown keys (F-005). `git merge-tree` against CORE-123: one conflict hunk in the kanmer-review paragraph, tool-reference merges cleanly (F-004).
4. kanmer-verify failure_class routing: four classes defined, table routes transient/inconclusive (stay), implementation (→ implementing), plan (→ preparing); "Only PASS or an operator's WAIVED_BY_OPERATOR permits the final move" is consistent with closeout's Done shape "PASS, or WAIVED_BY_OPERATOR with operator identity and reason in the proof body" and with the verifier never writing the waiver. Reconciliation/AGENTS.md rule 20 residual: F-006.
5. kanmer-auto: expired foreign claim → scratch note then `take_ticket action: "transfer"`, live claim → drop/coordinate, stop predicate 8 narrowed to live claim, "Never pass `force`", §9 force-fallback replaced with transfer/wait, workers renew and "read that command's log itself ... never end its turn waiting for a notification". Confirmed.
6. Check 18 pins all required phrases, and the negative fixture makes it fail (F-007 for coverage breadth). Checks 13/14/16 sentences preserved — verified by the passing run of the unchanged checks.
7. Duplicated "17" header left alone: acceptable.

## Threads

PR #290 has no reviews, comments or review threads at e6c9e0ad (`reviews: []`, `comments: []`); `threads_snapshot` is truthfully empty. Expected reviewer set = this reviewer only; settled on this head.

## Checks at gather time

- `kanmer-gate` (required): FAIL — check-pr on remote board `b31296d8` (synced 16:46:30Z) reports WRONG_STAGE implementing/expected review and NO_REVIEW_RECORD; the ticket moved to review at 16:50:23Z, so the remote board is stale. Local board tip `f7188a8113d686c1b19273eb4f10acc3072982d2`. Controller is pushing the board; needs a re-gate.
- `verify` (required): pending/in progress at gather time.

## Residual risk

F-002/F-003 are wording nits to fold into the post-#288 rebase round; F-004..F-007 accepted as recorded. No blocker or major finding against the PR content itself.
