# Plan — SKILL-021: bind execute, review, and verify to packets and exact SHAs

## Objective

Rewrite the three implementation-phase skills so a weak agent starts from one authoritative execution packet, review attests to the exact current PR head and all GitHub findings, and verification tests only the exact merged SHA in an isolated detached worktree.

## Starting state

- Execute separately assembles plan/checklist and assumes a universal preparation shape.
- Review appends prose without a head SHA/plan version, does not require a complete GitHub-thread disposition record, and can merge evidence tied to an earlier head.
- Verify updates or checks out mutable `main`, so evidence may describe a different commit and can disrupt the user’s checkout.
- MCP-023 and MCP-024 are blockers and define the new packet/record contracts.

## Governing docs

- **FRD-006:** exact-SHA proof and typed outcomes are consumed; content remains skill-enforced rather than a new hard gate until DOC-011 lands.
- **FRD-010:** execution packet becomes dispatch enablement; execute stops on refusal.
- **FRD-023 / ADR-0009:** skills call the tools and derive readiness; they do not restate profiles/gates.
- **EPIC-009 context:** satisfies bounded weak-agent execution and SHA-bound review/proof without new stages/leases/servers.
- **MASTERPLAN S-09 / Appendix A:** exact first call, compatibility sniff, worktree paths, review head query, record replacement, check handling, merge-SHA query, detached verification, no-main mutation, stop conditions.

## Required changes

### A. Preconditions and dependency check

1. Do not begin source edits until MCP-023 and MCP-024 are merged.
2. Read the shipped `get_execution_packet` tool description/output and the canonical record-schema section; use final field names exactly.
3. Run `get_status` against the implementation server and record whether `compat.expectedProject` is present, confirming the compatibility wording the skill must teach.
4. Inspect the three current skills and mark every instruction superseded by packet/SHA choreography; retain unrelated safety and phase responsibilities.

### B. Rewrite `kanmer-execute`

5. Keep the frontmatter name/description and intent boundary, but amend the description so readiness comes from `get_execution_packet`, not an assumed plan/checklist pair.
6. Replace the workflow/preconditions with this exact order:
   1. orientation/status call identifying board/server;
   2. `get_execution_packet <id>` as the first ticket-specific data call;
   3. if `ready:false`, quote `reason`/`missing`, stop, and perform no take/Git/write;
   4. retain packet project fingerprint and stop condition;
   5. before the first Kanmer write, inspect `get_status.compat.expectedProject`;
   6. when support is advertised, pass packet fingerprint as `expected_project` on every write; when absent, omit the field rather than sending it to 0.3.3;
   7. create actual branch/worktree;
   8. take ticket with exact branch/path;
   9. execute only packet checklist/plan scope;
   10. report/open PR/move Review;
   11. stop at packet stop condition.
7. State explicitly that packet refusal is not permission to run `kanmer-plan` inside execute; hand back to the named preparation phase/operator.
8. Preserve branch convention and exact implementation worktree `.worktrees/<id-lowercase>`; state only that path may be recorded, never `.worktrees/kanmer`.
9. Before creating the worktree, confirm the target path does not exist/does not identify the board path and the branch is not already in another worktree.
10. Preserve fetch/worktree creation from remote default branch, `.gitignore` check, and actual `take_ticket` call.
11. Use packet `documents.plan`, `documents.checklist`, `documents.files`, group contexts, gates, commands hint, and ticket body rather than re-fetching them unnecessarily. Additional docs are fetched only by listed path when needed.
12. Work checklist with version-aware whole-file updates for checkbox changes and append-only progress notes; on revision conflict re-read/reapply rather than overwrite.
13. Treat `stopCondition` as mandatory. If it conflicts with a generic skill paragraph, the ticket packet wins unless it requests an unsafe/forbidden action, which becomes a deviation report.
14. Preserve plan-deviation rule: stop, update shared plan/checklist through the planning process, do not redesign silently.
15. Preserve production caller/runtime dependency/schema-grant/test rules from templates/canon as applicable.
16. Preserve post-implementation report, traceability, push, PR footer, and one-stage move to Review.
17. State twice at load-bearing locations: execute never merges its PR; execute never starts the next ticket.
18. On pause, preserve explicit resume notes and release semantics without deleting the worktree.
19. Update the closing hand-off to review and the packet stop condition, with no implied merge.

### C. Rewrite `kanmer-review`

20. Keep review in the Review stage and preserve the board-worktree prohibition.
21. Replace the gather list with:
   - ticket and current `updated` timestamp;
   - plan content/version (`plan_hash`);
   - files, post-implementation report, refs/group context;
   - PR URL/number/state/title/headRefOid/reviewDecision/statusCheckRollup;
   - full diff;
   - reviews, issue comments, inline comments, and unresolved review-thread state;
   - current gate report.
22. Teach exact commands where stable:

   ```bash
   gh pr view <pr> --json url,state,title,headRefOid,reviewDecision,statusCheckRollup,reviews,comments
   gh pr diff <pr>
   ```

   State that unresolved thread resolution may require `gh api graphql`; do not claim issue comments prove it.
23. Read existing `scratch/review` and version before writing. If absent, use null/no expected version as tool semantics require.
24. Build the MCP-024 frontmatter exactly, taking:
   - `pr` from the actual PR;
   - `head_sha` from current `headRefOid`;
   - `plan_hash` from the plan document version;
   - `ticket_updated` from the ticket read;
   - reviewer identity and truthful `independent` boolean;
   - verdict and complete findings array.
25. Replace review storage instructions with `set_ticket_doc(doc:"scratch/review", content:<whole file>, expected_version:<read version>)`. Prohibit `append_scratch` for the attestation; scratch notes may use a different slug only for provisional working notes.
26. For each source finding (reviewer, GitHub review, inline thread, CI/status), assign stable finding ID/severity/summary/disposition. Do not omit findings merely because fixed during the same review.
27. Enforce disposition rules from MCP-024; rejected/accepted-risk needs reason, deferred needs ticket.
28. Verdict is `needs-changes` when any blocker/major is open, required check is red/cancelled/pending/missing, PR is conflicted/unmergeable, unresolved user question affects a fix, or governing acceptance is unmet.
29. Before any review fix, preserve the open-question rule. Review does not silently implement scope; changes go back to execute/current PR with plan alignment.
30. If reviewer is author, set `independent:false` and state it in the body. Do not present self-review as independent evidence.
31. After writing a pass attestation, immediately before merge re-query `headRefOid`, PR state, mergeability, review threads, and required checks.
32. If head differs, checks are not green/current, thread state changed, or new findings appeared, do not merge; replace verdict/record or rerun full review.
33. Once repository required checks exist, never merge with any required check missing, pending, red, cancelled, timed-out, or tied to a different head.
34. Require explicit user go-ahead or recorded standing delegation before `gh pr merge`; the skill does not introduce auto-merge.
35. After successful merge, capture merge result/URL, move exactly one stage to Verifying, and hand off to verify. If merge fails, leave ticket in Review and update record/scratch; do not move.
36. Remove obsolete instructions requiring four `pr-*` assets or a PR Review area if they conflict with current adopted model; do not delete asset files (SKILL-015 owns deletion).

### D. Rewrite `kanmer-verify`

37. Expand gather step: ticket, gates, plan/checklist, existing proof/version, PR reference, current Git worktree list.
38. Query PR using:

   ```bash
   gh pr view <pr> --json state,mergeCommit,url
   ```

39. Require `state == MERGED` and non-null `mergeCommit.oid`; otherwise stop, state verification is early, write only provisional scratch if useful, and do not create proof/move.
40. Record full `merged_sha` from `mergeCommit.oid`.
41. From repository root—not board worktree—run `git fetch origin` to ensure the object exists. Do not pull/reset/checkout main.
42. Choose deterministic path `.worktrees/verify-<id-lowercase>-<merged_sha>` as specified, or a documented collision-safe shortening only where platform path limits require it; full SHA remains detached target and proof value.
43. Refuse if path equals/aliases `.worktrees/kanmer` or an existing non-verification worktree. Reuse an existing exact-SHA verification worktree only after confirming detached HEAD equals the same full SHA and tree is clean; otherwise stop/report.
44. Create:

   ```bash
   git worktree add --detach .worktrees/verify-<id>-<merged_sha> <merged_sha>
   ```

45. Confirm inside the worktree:
   - `git rev-parse HEAD` exactly equals merged SHA;
   - `git symbolic-ref -q HEAD` fails/empty (detached);
   - worktree is clean before commands.
46. Run only commands/acceptance checks named in packet/plan/checklist plus required repository verification, from the detached worktree. Record cwd, timestamps, exact command, exit code, and result per attempt.
47. Preserve all failed/inconclusive attempts. A rerun adds a new attempt; it never erases or relabels the earlier result.
48. Read current proof/version before each whole-file replacement to avoid concurrent overwrite.
49. Write MCP-024 proof frontmatter exactly with full merged SHA, environment, verified time, top-level result, complete attempts. Use `set_ticket_doc(doc:"proof", expected_version:...)`; never append raw frontmatter fragments.
50. `FAIL` or `INCONCLUSIVE` stops: keep ticket Verifying, create/link remediation as needed, and do not exploit existence gate.
51. `NOT_APPLICABLE`/`WAIVED_BY_OPERATOR` handling follows the canonical schema and explicit operator authority; neither is silently treated as PASS by the skill unless governing acceptance explicitly permits Done and the operator waiver is recorded.
52. Only `PASS` after all required checks permits `move_item done`.
53. After proof write/move decision, remove the temporary verification worktree with `git worktree remove` only if clean and no command still uses it; run prune if appropriate. Record cleanup failure for closeout.
54. Never update any local `main` branch, feature branch, board worktree, or implementation worktree as a side effect.
55. Preserve final hand-off to closeout.

### E. Regression checks and verification

56. Update `verify-skill-prose.mjs` only with narrow rules if existing checks cannot prove the key changes:
   - execute contains `get_execution_packet`, `ready:false`, never merge, `.worktrees/<id>` and stop condition;
   - review contains `headRefOid`, `scratch/review`, `set_ticket_doc`, and does not teach `append_scratch ... review` as attestation;
   - verify contains `mergeCommit`, `worktree add --detach`, exact merged SHA, and no instruction to pull/update mutable main.
57. Do not encode full schemas/profile mappings in the verifier.
58. Run `npm run verify:skills`.
59. Run searches proving legacy unsafe text is gone:

   ```bash
   rg -n "append_scratch.*review|pull.*main|check out merged main|merge your own" plugins/kanmer/skills/kanmer-{execute,review,verify}/SKILL.md
   ```

   Interpret expected/no-match results correctly and inspect context for necessary negative wording.
60. Run positive searches for packet, compatibility, headRefOid, whole-file review, mergeCommit, detach, full SHA, PASS-only, and never-main-mutation.
61. Perform a dry source walkthrough with fixtures for:
   - packet refusal before Git;
   - old server omitting token;
   - correct server sending token;
   - execute PR and stop;
   - review current head then head changes;
   - red/pending check;
   - unresolved GitHub finding;
   - merged/unmerged verify;
   - failed then passed attempts retained;
   - main checkout unchanged.
62. CORE-035 owns the real end-to-end execution after dependencies; this PR must link it and state that source verification is not integration proof.
63. Confirm diff limited to three skill files plus verifier only if used; no plugin build/bundle/reference/schema/tool changes.
64. Open PR with `Kanmer: SKILL-021`.

## Expected files

Modify:
- `plugins/kanmer/skills/kanmer-execute/SKILL.md`
- `plugins/kanmer/skills/kanmer-review/SKILL.md`
- `plugins/kanmer/skills/kanmer-verify/SKILL.md`
- `scripts/verify-skill-prose.mjs` only if a targeted rail is added

## Acceptance checks

- Execute’s first ticket-specific read is packet; refusal causes zero Git/Kanmer writes.
- Token is capability-sniffed and never sent blindly to old servers.
- Execute uses only `.worktrees/<id>`, obeys packet stop condition, never merges/continues.
- Review record is whole-file, versioned, current-head/current-plan bound, and contains all finding dispositions.
- Head/check/thread changes invalidate pass; red/pending required checks block merge.
- Merge remains authorized and occurs only after current pass; successful merge moves one stage.
- Verify stops if unmerged, creates a detached exact merge-SHA worktree, never mutates main, retains all attempts, and moves Done only on PASS.
- `verify:skills` passes and no MCP bundle rebuild occurs.

## Verification commands

```bash
npm run verify:skills
rg -n "get_execution_packet|ready:false|expectedProject|Stop condition|never merge" plugins/kanmer/skills/kanmer-execute/SKILL.md
rg -n "headRefOid|scratch/review|set_ticket_doc|statusCheckRollup|unresolved" plugins/kanmer/skills/kanmer-review/SKILL.md
rg -n "mergeCommit|worktree add --detach|merged_sha|PASS|never.*main" plugins/kanmer/skills/kanmer-verify/SKILL.md
git diff --check
git status --short
```

## Risks / open questions

- **Schema drift:** duplicating record details could diverge. Mitigation: reference canonical tool reference and use exact final field names.
- **Older server break:** sending unknown token fails. Mitigation: mandatory compatibility sniff.
- **False current review:** head may change after record. Mitigation: immediate pre-merge re-query and rerun.
- **Thread blind spot:** standard `gh pr view` may not expose resolution. Mitigation: require actual thread query/GraphQL when needed.
- **Wrong verification commit:** mutable main or feature branch. Mitigation: merged PR query, detached full SHA assertions, no-main rule.
- **Existence-gate bypass:** FAIL proof technically exists. Mitigation: skill permits Done only on PASS.
- No unresolved question remains.

## Failure and deviation rules

- Do not edit around a packet refusal, use `force`, merge with stale/red evidence, or verify an unmerged/current-main state.
- Do not weaken checks, discard attempts, rewrite main, use the board worktree, or start another ticket.
- If GitHub cannot return thread resolution or merge SHA, stop and report exact missing data.
- Do not merge this ticket’s PR or begin CORE-035.

## Stop condition

Stop when all three skill files implement the exact packet/current-head/detached-merge-SHA choreography, targeted rails and fixture walkthroughs pass, source diff is bounded, and the PR is ready for independent review. Do not merge, execute another ticket, or claim the CORE-035 integration proof has occurred.
