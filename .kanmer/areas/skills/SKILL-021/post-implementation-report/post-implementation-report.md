# Post-implementation report — SKILL-021

*The report. Not the proof — this is the author's claim, written before merge; proof is evidence gathered after merge.*

## Summary

Rewrote the three implementation-phase skills so execution consumes the read-only get_execution_packet first, review records a versioned whole-file attestation bound to the current PR head and plan/ticket revisions, and verification tests only the exact GitHub merge SHA in a clean detached worktree. The implementation is limited to the packet's three scoped skill files; no MCP, core, GUI, schema, profile, tool-reference, or legacy review-asset changes were made.

## Changes

| File | Change | Why |
|---|---|---|
| plugins/kanmer/skills/kanmer-execute/SKILL.md | Replaced assumed plan/checklist preconditions with packet-first refusal, capability-sniffed project token handling, exact worktree/take choreography, packet stop condition, version-aware progress, report/PR/Review handoff, and explicit no-self-merge/no-next-ticket rules. | Prevent weak execution from reconstructing readiness, crossing project boundaries, or continuing beyond a bounded packet. |
| plugins/kanmer/skills/kanmer-review/SKILL.md | Replaced append-only review prose with current headRefOid/plan-version/ticket-timestamp gathering, GitHub check/comment/thread coverage, whole-file scratch/review replacement using the MCP-024 schema, dispositions, stale-evidence rejection, and authorized one-stage merge handoff. | Prevent review from describing an earlier moving branch or silently losing findings. |
| plugins/kanmer/skills/kanmer-verify/SKILL.md | Replaced mutable-main verification with merged-state/mergeCommit refusal, exact full-SHA detached verification worktree, clean/detached assertions, retained typed attempts, whole-file proof replacement, PASS-only Done move, and disposable-worktree cleanup. | Bind proof to what GitHub actually merged without mutating main, the board worktree, or the implementation worktree. |

Implementation commit: df56503baafe3ef5a2e3fa78e2d9d3376495af12.

## Governing docs

- ADR-0016 / MASTERPLAN S-09 and Appendix A: the phase choreography follows the compiled workflow: packet-first execution, compatibility sniff, exact worktree, current-head review, merged-SHA query, detached verification, one-stage moves, and no-main mutation.
- FRD-010: get_execution_packet is a read-only bounded execution/dispatch-enablement signal; refusal does not take, move, write, dispatch, or create a worktree.
- FRD-006: proof uses the canonical typed attempt/result vocabulary and remains evidence from the exact merged result; a structural proof file is not treated as a PASS by prose.
- FRD-023 / ADR-0009: skills remain procedural and derive readiness/evidence from tools and gates rather than copying profile requirement tables.
- EPIC-009: the change stays within bounded weak-agent execution and SHA-bound review/proof; it adds no stages, leases, servers, schemas, or automatic merge.
- MCP-023 / MCP-024: merged dependency contracts are consumed with final packet, compatibility, review-attestation, and proof-record field names. The canonical schema remains in the tool reference; this PR does not duplicate or change it.

## Risks / follow-ups

- Integration proof: CORE-035 owns a disposable-board end-to-end walk of the new paths; this author lane has not merged or self-exercised that flow. It remains INCONCLUSIVE/pending and is linked by the ticket's existing block relation.
- Live GitHub evidence: no independent review, required-check run, merge, or merged-SHA verification is claimed in this pre-merge report. Those are the independent review/verify stages and remain INCONCLUSIVE until exercised by their owners.
- Compatibility: the installed plugin server 0.3.3 status response omitted the project/compat capability block. The execute prose therefore teaches clients to omit expected_project when the capability is absent while retaining the newer advertised-token path.
- Test bootstrap: the first npm run test:scripts attempt exited 1 with ERR_MODULE_NOT_FOUND for packages/core/dist/index.js in the fresh worktree. npm run build:core exited 0; the exact rerun passed 80/80. The first failure is retained rather than erased.
- Legacy pr-* assets were not deleted; SKILL-015 owns that separate scope.

## Verification hand-off

On the merged PR's exact detached verification worktree, re-read the packet/checklist and run the named deterministic rails:

- npm run verify:skills — expected exit 0.
- The packet positive/negative contract searches and git diff --check — expected pass with only the three scoped skill files changed.
- npm run build:core before npm run test:scripts in a fresh checkout — expected 80/80; retain any bootstrap failure if the dist prerequisite is absent.
- Confirm the PR is MERGED and verify at its exact full mergeCommit in .worktrees/verify-skill-021-<merged_sha>; do not update mutable main or the board worktree.
- CORE-035 should perform the real packet-refusal, capability-compatibility, current-head/thread, red-check, unmerged-PR, failed-then-passed-attempt, and unchanged-main walkthrough. Any unavailable live GitHub/manual evidence remains INCONCLUSIVE.
