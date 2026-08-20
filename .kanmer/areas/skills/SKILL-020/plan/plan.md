# Plan — SKILL-020: make kanmer-plan and kanmer-auto gates-first

## Objective

Remove the two universal-pipeline contradictions so planning and batch automation derive work from each ticket’s live gate report, while retaining all existing safety, question, scope, lane, and hand-off controls.

## Starting state

- `kanmer-plan` declares `get_doc_gates` authoritative but then requires research and files even when the resolved profile does not.
- `kanmer-auto` declares per-ticket gates authoritative but then starts every ticket with parallel research.
- `verify-skill-prose.mjs` detects profile mappings and structural invariants but does not explicitly guard these two known contradictory phrases.

## Governing docs

- **FRD-023 R1 / ADR-0009:** satisfied by deriving all per-ticket requirements from `get_doc_gates` and deleting prose that maps work to a universal pipeline. No governing-doc amendment is needed.
- **EPIC-009 context:** satisfied by making skills gates-first without adding stages, gates, roles, leases, or another workflow engine.
- **MASTERPLAN S-08:** implemented exactly: conditional research/files, approval-paragraph hand-off, gate-routed Wave 0, retained ~3 lane cap and board-worktree invariant, new prose rail, skill-only scope.

## Required changes

### A. `kanmer-plan`

1. Read the complete current skill and identify every sentence whose truth depends on research/files always existing.
2. Replace the opening “plan is written from research and files—never before them” rule with:
   - a plan is written from the inputs the live gate report requires;
   - existing research/files are used when present and relevant;
   - missing research/files are created only when required or when a specifically named material hole prevents a trustworthy plan.
3. Keep the existing warning that `get_doc_gates <id>` is the only authority and requirements must not be inferred from `board.yml`.
4. Rewrite workflow step 1 in this exact order:
   1. `get_item`;
   2. `get_links` and group context where applicable;
   3. `get_doc_gates`;
   4. inspect the requirements on the relevant next boundary;
   5. fetch required/existing inputs;
   6. when a non-required research/files document is considered, name the material hole and create it only if the hole is real;
   7. otherwise proceed directly to the required planning deliverable.
5. Define “material hole” narrowly in prose: unresolved evidence/decision or uncertainty about exact affected files/contracts that would make ordered implementation speculative. State that generic usefulness or completeness is insufficient.
6. Preserve the Preparing-stage explanation and one-gated-boundary rule.
7. Preserve plan/checklist construction, governing docs, ADR routing, scope split, open-question recording, and unresolved-question gate behaviour.
8. Rewrite the human-facing approval step so the default chat hand-off is a short paragraph containing:
   - intended outcome;
   - in/out of scope;
   - key decision/risk;
   - exact approval boundary.
   It must not paste the full plan unless requested.
9. Clarify that when no human approval is required by the request/context and no question remains, the structured hand-off may proceed to `kanmer-execute`; do not invent an approval gate in core.
10. Keep the closing successor paragraph valid for the skill-roster verifier.
11. Search the final skill for any remaining claim that research/files must exist regardless of the live gate report.

### B. `kanmer-auto`

12. Preserve Section 1 roster/scoping, including status/profile fields, group context, drop rules, target point, per-ticket gates, one-boundary rule, and user roster report.
13. Replace Section 2 heading with `## 2. Wave 0 — route every ticket from its live gates` (or wording with the same exact meaning).
14. Delete the instruction to spawn one research subagent per ticket.
15. Specify the new Wave 0 algorithm:
    1. call `get_doc_gates <id>` for each retained ticket;
    2. inspect current stage, reachable stages, and first unmet next-boundary requirement;
    3. group tickets by their next applicable phase/action rather than by assumed profile pipeline;
    4. dispatch only that phase using the existing phase skill;
    5. do not create optional documents merely to normalize the batch;
    6. after a phase completes, re-read gates before routing the next phase.
16. State that a ticket with no preparation phase currently required advances to its next applicable workflow action rather than receiving research.
17. Preserve the universal question rule: any user-only question parks and is reported distinctly at any phase.
18. Preserve Section 3 file-overlap partitioning and dependency ordering.
19. Preserve concurrency cap at approximately three lanes.
20. Preserve the `.worktrees/kanmer` invariant verbatim or equivalently strong.
21. Preserve per-ticket worktrees, phase-skill delegation, target-point stop, rebase after main changes, failure release/report behaviour, and sequential fallback.
22. Update any report wording that assumes all tickets had a research wave.
23. Do not add named-profile examples or a replacement profile/document matrix.
24. Keep the final hand-off/no-successor statement valid.

### C. Regression rail

25. In `scripts/verify-skill-prose.mjs`, add a named section/check for gates-first routing regressions.
26. Read the two target skill files through the script’s existing helpers; do not add another file walker.
27. Assert `kanmer-plan` does not contain:
   - the known “never before [research/files]” universal prerequisite;
   - “whether or not this ticket’s profile … gate[s] on them” or an equivalent exact legacy phrase.
28. Assert `kanmer-auto` does not contain the heading/claim “research everything in parallel”.
29. Assert both skills still contain `get_doc_gates`.
30. Assert auto still contains a recognizable board-worktree invariant and the approximate three-lane cap; reuse existing hard-rule checks where possible rather than duplicating them.
31. Make failure output identify skill path and prohibited/missing concept.
32. Do not encode any profile-to-document requirement or snapshot `board.yml`.
33. Update comments around the new check to explain it protects gate routing, not wording style.

### D. Verification and scope audit

34. Run targeted searches showing the legacy phrases are absent from both source skills.
35. Run `npm run verify:skills` and retain full exit/output.
36. Run `npm test -- scripts/verify-skill-prose.test.mjs` only if such a focused test exists; otherwise do not invent a test command.
37. Run `git diff --check`.
38. Inspect the diff and confirm only the three listed files changed.
39. Confirm no profile map, gate code, template, MCP bundle, tool reference, generated plugin file, package manifest, or lockfile changed.
40. Open the PR with `Kanmer: SKILL-020` and explain the two contradictory instructions removed and the new dynamic routing.

## Expected files

Modify only:
- `plugins/kanmer/skills/kanmer-plan/SKILL.md`
- `plugins/kanmer/skills/kanmer-auto/SKILL.md`
- `scripts/verify-skill-prose.mjs`

## Acceptance checks

- Planning reads live gates before deciding whether research/files are needed.
- Non-required research/files require a named material hole, not a generic quality preference.
- Auto Wave 0 routes each ticket to its next required phase; no universal research wave remains.
- No profile/document mapping is introduced.
- Approval hand-off is a short paragraph with an explicit boundary.
- ~3-lane cap, dependencies, questions, one-boundary rule, and `.worktrees/kanmer` invariant remain.
- New verifier fails when either legacy universal claim is reintroduced and passes on the corrected skills.
- `npm run verify:skills` is green.
- No plugin bundle rebuild occurs.

## Verification commands

```bash
rg -n "never before them|whether or not this ticket.s profile|research everything in parallel" plugins/kanmer/skills/kanmer-plan/SKILL.md plugins/kanmer/skills/kanmer-auto/SKILL.md
rg -n "get_doc_gates|\.worktrees/kanmer|~3 lanes|three lanes" plugins/kanmer/skills/kanmer-plan/SKILL.md plugins/kanmer/skills/kanmer-auto/SKILL.md
npm run verify:skills
git diff --check
git status --short
```

The first `rg` must return no legacy matches; record its exit code as expected no-match rather than misreporting it as a test failure.

## Risks / open questions

- **Quality regression:** over-correcting could stop needed research. Mitigation: retain the explicit material-hole escape, requiring the planner to name the uncertainty.
- **Another restatement:** examples could hard-code profiles again. Mitigation: no profile/document examples; verifier’s existing R1 check remains.
- **Safety deletion:** rewriting auto could accidentally remove worktree/lane/question rules. Mitigation: bounded edits and positive verifier/search assertions.
- **Fake approval gate:** prose must not claim core enforces approval. Mitigation: human hand-off guidance only.
- No unresolved question remains.

## Failure and deviation rules

- Do not solve a verifier failure by weakening the existing FRD-023 R1 check.
- Do not add a profile requirement table, a new skill, a new phase, or a new orchestration engine.
- If the skill wording cannot express dynamic routing without ambiguity, stop and report the exact ambiguous paragraph rather than retaining the universal default.
- Do not rebuild the plugin bundle, merge the PR, or begin another ticket.

## Stop condition

Stop when both skills route solely from live gate reports, optional research/files are justified only by a named material hole, auto retains all lane/worktree/question safety, the new regression rail proves the two legacy claims cannot return, `npm run verify:skills` passes, and the three-file PR is ready for independent review. Do not merge.
