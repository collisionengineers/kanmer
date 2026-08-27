# Post-implementation report — SKILL-037

PR: https://github.com/collisionengineers/kanmer/pull/290 (head `e6c9e0ad2cbb3f55ea287bcb25026096f2fe2f20`, branch `skill-037-review-remediation-contract`, worktree `.worktrees/skill-037`, base `origin/main` a8318ea6).

## Files changed and why

| File | Change |
|---|---|
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | Workflow re-ordered (gather → settle expected reviewers → consolidated/delta review → attestation → needs-changes return or pass/merge). New sections: "Expected reviewers and the settle rule" (`expected_reviewers` = independent subagent reviewer(s) named for the ticket; bots never expected, never a gate; timeout-absent listing; a later thread on the same head makes the attestation non-authoritative — replaced, never appended; `threads_snapshot` schema with mandatory `F-###` mapping), "Consolidated review, remediation batch, delta review" (`review_round`/`remediation_budget`, delta scope per FRD-034, merge-blocking criteria), "The sanctioned needs-changes return" (`prs[]` binding, `move_item review → implementing reason`, `REVIEW_RETURN_NEEDS_ATTESTATION` / `REMEDIATION_BUDGET_EXHAUSTED`, operator extension). Attestation frontmatter gains `board_sha`, `expected_reviewers`, `threads_snapshot` with CORE-123's `board_sha`/`SYNC_REQUIRED` sentence. Removed "leave the ticket in Review" and "becomes a linked PR Review ticket". Hand-off names execute (after a return) or verify. |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | Workflow steps 4–6 mention renew and the re-entry lane. Resumed-packet section: `take_ticket action: "renew"` after validation and before long commands (`CLAIM_NOT_OWNED` is a stop, not a force/transfer). New "Re-entry after a needs-changes return" subsection: work only open blocker/major findings, push to the recorded branch so the existing PR updates, never `gh pr create` a second PR, no history rewrite, report gains `## Remediation round <review_round>`, budget is the ticket's. Finish step 2 requires the PR in `prs[]`; step 3 scoped to the fresh lane. Pausing section: background-log rule. All check-16 sentences intact. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Workflow step 7 routes by class. Proof gains `failure_class: implementation \| plan \| transient \| inconclusive` (for FAIL/INCONCLUSIVE) with definitions and a routing table; the verifier writes the proof, the controller/operator makes the audited `move_item` with a reason; `PASS` or operator `WAIVED_BY_OPERATOR` are the only Done shapes; verifier never writes the waiver. Terminal-retirement text unchanged. Hand-off names execute/plan for routed failures. |
| `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | Verified-success shape accepts `WAIVED_BY_OPERATOR` with operator identity and reason in the proof body. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | §1.2: live foreign claim → drop/coordinate; expired foreign claim → scratch note (old controller, new controller, branch, worktree) then `take_ticket action: "transfer"`; `CLAIM_LIVE` means renewed; never `force`, never release a claim with a worktree. §3: workers renew claims; subagent workers read their own background logs; needs-changes and `failure_class` results are routed (`REMEDIATION_BUDGET_EXHAUSTED` is an operator-only question). Stop predicate 8 narrowed to a live claim. §9: force fallback replaced by transfer/wait. All check-13/14/16 sentences intact. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Attestation section documents the three optional keys and their validation; proof section documents `failure_class`. `get_status` row untouched (CORE-123). |
| `scripts/verify-skill-prose.mjs` | Check 18 pins the contract across the five skills (existing numbering already had two "17" headers; the new one is 18). |
| `scripts/verify-skill-prose.test.mjs` | Negative fixture: re-adding "leave the ticket in Review" and replacing "never open a second PR" fails check 18. |

Not changed, deliberately: `packages/*` (no schema change — the three attestation keys stay optional in the parser, `failure_class` is free YAML), `plugins/kanmer/mcp/kanmer-mcp.cjs` (skills are not packed into the bundle, so `plugin:build` is not needed), AGENTS.md (managed block rules 20/22 remain true; no regate prose touched), every CORE-123-owned file.

## Governing docs

- FRD-034 — **Meets** AC2 (attestation bound to exact head with structured findings and reviewer identity), AC3 (in-scope correction stays on the same ticket/PR with one delta review), AC4 (`failure_class` routes implementation/plan failures to Implementing/Preparing), AC5 (`review_round`/`remediation_budget` stop repeated audits; minor/note dispositions are residual risk). Not modified.
- HZN-008 context "Interim ownership and remediation rule" — formalised; "expected automated reviewer" narrowed to the independent reviewer(s) named for the ticket per the operator's ruling (bots are not part of the workflow).

## Golden scenarios (prose walkthrough)

(a) Author pushes head H. Reviewer gathers, reads `expected_reviewers` = [R1, R2]; R2 has not posted → reviewer records the wait in scratch and does not attest. R2 posts thread T on H → reviewer gathers again, `threads_snapshot` lists T mapped to F-002, writes the attestation. Later thread T2 appears on H → by the settle rule the attestation is non-authoritative; reviewer re-gathers and replaces it with T2 mapped to a finding. A `pass` written before T2 would have failed the "every thread on it is in `threads_snapshot`" merge condition on the pre-merge re-gather.

(b) Reviewer writes `needs-changes` on H with F-001 open, confirms PR #N is in `prs[]`, calls `move_item review → implementing reason: "needs-changes on H: F-001"`; store increments `review_round` to 1 and appends the transition. Execute resumes the packet (`claim.reviewRound` = 1), renews the claim, fixes F-001, pushes to the same branch (PR #N gets head H2), rewrites the report with `## Remediation round 1`, moves `implementing → review`. Reviewer's delta review covers F-001 + changed lines, writes `pass` on H2 with F-001 `fixed`, merges. `review_round` stays 1; a second return would refuse `REMEDIATION_BUDGET_EXHAUSTED`.

## Commands (cwd `.worktrees/skill-037`)

| Command | Exit | Result |
|---|---|---|
| `npm run verify:skills` | 0 | ALL CHECKS PASSED (18 sections; first run failed check 18 on a bold-marker regex, fixed in the check) |
| `npm run verify:agents-block` | 0 | 31/31 checks passed |
| `node --test scripts/verify-skill-prose.test.mjs` | 0 | all cases pass incl. the new negative fixture |
| `npm run plugin:check` | — | not run: refuses in a linked worktree by design (MCP-007) and no bundle input changed; hosted `verify` is authoritative |

## Risks and follow-ups

- Merge overlap with `core-123-merge-gate-board-sync` in the kanmer-review frontmatter paragraph; whichever lands second re-applies the other's sentence (CORE-123's `board_sha` sentence is already included here verbatim).
- The settle rule, delta scope and `failure_class` are procedure, not store-enforced (parked in open-questions for a later core ticket).
- `verify-skill-prose.mjs` already had two sections headed "17"; not renumbered here to keep the diff to this ticket's scope.

## For kanmer-verify

At the merge SHA in a detached worktree: `npm run verify:skills` (expect ALL CHECKS PASSED), `npm run verify:agents-block` (expect 31/31), `node --test scripts/verify-skill-prose.test.mjs` (expect exit 0). Hosted `npm run verify` covers `plugin:check`.
