# Plan — CORE-025: phase-2 `kanmer-gate`

## Objective

Extend the single phase-1 merge gate so it blocks PRs in the wrong workflow stage or with live prerequisites, while making missing/stale SHA-bound review and unreachable ticket commits visible as non-blocking warnings. Preserve one pure core evaluator, one CLI, one GitHub check name, and the existing 0/1/2 exit contract.

## Starting state

- CORE-024 supplies ticket resolution, `NO_TICKET`, `OPEN_QUESTIONS`, read-only board loading, JSON output, annotations, and exits 0/1/2.
- MCP-024 defines `scratch/review.md` frontmatter and SHA semantics.
- Ticket dependencies are stored as outgoing `blocks[]`; `blockedBy` is derived in the opposite direction.
- Git reachability is repository state and cannot be evaluated by the pure core package.
- Phase-2 record checks intentionally begin as warnings.

## Required changes

### 1. Freeze the expanded result model

1. Read the phase-1 evaluator and tests before changing any type or check id.
2. Retain every phase-1 check id and result field so existing consumers remain compatible.
3. Add the exact phase-2 ids:
   - `WRONG_STAGE`
   - `DEPENDENCY_BLOCKED`
   - `NO_REVIEW_RECORD`
   - `STALE_REVIEW`
   - `COMMITS_UNREACHABLE`
4. Represent check severity explicitly as `error` or `warning`; do not derive it from id/message.
5. Represent outcome explicitly as `pass`, `fail`, `warn`, or `skipped` (reuse equivalent existing names if phase 1 already established them).
6. Add structured details needed to repair a finding: expected/actual stage, blocker ids, review/head SHAs, malformed-record reason, and per-commit reachability state.
7. Preserve stable JSON serialization and deterministic check order.

### 2. Extend pure evaluator inputs

8. Define a review-evidence input that distinguishes:
   - file absent;
   - parsed valid record;
   - present but invalid/unreadable record.
9. Define commit evidence keyed by normalized unique ticket SHA with state `reachable`, `unreachable`, or `indeterminate` plus optional diagnostic.
10. Pass the current semantic review-stage id/final-stage id or resolved board metadata into the evaluator; do not hard-code a display label.
11. Pass derived blocker summaries (id, status, archived/existence) rather than asking core evaluation code to rediscover Git/MCP state.
12. Keep all new inputs optional only where phase-1 callers need a controlled compatibility path; tests must ensure the real CLI supplies them.

### 3. Implement `WRONG_STAGE`

13. If ticket resolution failed, emit this check as skipped.
14. If the resolved ticket is archived, fail with actual archived state.
15. Compare its status id with the resolved review-stage id.
16. Pass only for exact review stage.
17. Fail for backlog, preparing, implementing, verifying, done, unknown, or off-board status and report both values.

### 4. Implement `DEPENDENCY_BLOCKED`

18. Obtain the ticket's derived `blockedBy` relation through the store/link graph used by CORE-024.
19. Resolve every blocker item without mutating or initializing the board.
20. Exclude blockers that are archived.
21. Exclude blockers in the final semantic stage.
22. Treat missing/dangling blocker records as live integrity failures and retain their ids.
23. Sort live blocker ids deterministically.
24. Fail once when one or more live/dangling blockers remain, with all ids in details.
25. Pass when the derived set is empty after filtering.
26. Add a regression test proving outgoing `blocks[]` from the target are not mistaken for prerequisites and that `computeBlockedIds` is not used in the wrong direction.

### 5. Read and validate review attestation at the CLI boundary

27. Resolve the canonical document path through the store/document APIs for `scratch/review.md`; do not concatenate an unvalidated external path.
28. If absent, pass `{state: "absent"}` to core.
29. If present, parse YAML frontmatter with `gray-matter`/the canonical parser.
30. Validate `kind === "review-attestation"`.
31. Validate `head_sha` as a full hexadecimal Git object id accepted by repository conventions.
32. Retain `verdict`, reviewer metadata, plan hash, and diagnostic fields needed by future checks without changing the MCP-024 schema.
33. Convert malformed YAML, wrong kind, missing SHA, or invalid field type into `{state: "invalid", reason}`; do not crash or regex-scrape.

### 6. Implement review checks

34. Emit `NO_REVIEW_RECORD` as warning only when state is absent.
35. When state is invalid, emit a warning result with an actionable invalid-record diagnostic; do not falsely call it a clean absence.
36. Normalize the PR head SHA and attested `head_sha` to lowercase full values.
37. Emit `STALE_REVIEW` warning when the values differ.
38. Pass stale-review check when values match and the record is otherwise valid.
39. Preserve adverse `verdict: needs-changes` in result details and ensure the overall gate does not describe review as approved. If phase-1/compiled policy already has a review-verdict failure id, reuse it; otherwise add an error detail under the review check without inventing a sixth phase-2 id.
40. Never accept prefix equality.

### 7. Gather commit-reachability evidence

41. Normalize and de-duplicate `ticket.commits[]` while retaining original values for diagnostics.
42. Ensure the workflow checks out/fetches the PR head and enough history for ancestry queries; avoid relying on the default shallow depth.
43. At the CLI boundary, validate each SHA before invoking Git.
44. For each valid SHA, run `git merge-base --is-ancestor <ticket-sha> <pr-head-sha>` through an injectable helper.
45. Map exit 0 to `reachable`, exit 1 to `unreachable`, and other failures/missing objects to `indeterminate` with stderr diagnostic.
46. Bound command execution and never pass untrusted values through a shell string; use argument arrays.
47. A failure to obtain the PR head or initialize the repository comparison is an infrastructure error and exits 2.
48. Individual stale/missing historical commit objects remain `indeterminate` warning evidence in phase 2.

### 8. Implement `COMMITS_UNREACHABLE`

49. When `commits[]` is empty, return a neutral/skipped result stating no commits were recorded; do not fabricate evidence.
50. Pass when every unique recorded SHA is reachable.
51. Warn when any entry is unreachable or indeterminate.
52. Include separate sorted arrays for unreachable and indeterminate SHAs.
53. Do not promote the warning to an error in this ticket.

### 9. Aggregate verdict and annotations

54. Evaluate every applicable check rather than returning on first failure.
55. Preserve the phase-1 ordering first, then append phase-2 checks in the documented stable order.
56. Overall `pass` is false when at least one `error` check fails; warning-only verdicts remain merge-passable.
57. CLI writes exactly one JSON verdict to stdout and no prose before/after it.
58. Emit one `::error::` annotation per failing error result to stderr.
59. Emit one `::warning::` annotation per warning result to stderr.
60. Escape annotation control characters/newlines using one helper.
61. Exit 0 for pass or warning-only, 1 for policy failures, and 2 for board/Git/input conditions that prevent reliable evaluation.

### 10. GitHub Actions integration

62. Extend the existing `kanmer-gate` job from CORE-024; do not rename it or add `kanmer-gate-phase-2`.
63. Retain read-only permissions and the separate fetched `kanmer-board` worktree.
64. Fetch the PR head/base refs and sufficient history explicitly.
65. Pass the exact event PR head SHA and branch/base values to the CLI rather than inferring a merge pseudo-ref.
66. Keep direct `kanmer-board` pushes outside the PR workflow.
67. Confirm warning annotations do not fail the job and error findings do.

### 11. Tests

68. Extend core tests with every stage and exact review-stage pass.
69. Add blocker tests for no blockers, done, archived, live, multiple, dangling, and reversed-edge regression.
70. Add review tests for absent, malformed YAML, wrong kind, missing SHA, matching SHA, stale SHA, prefix-only SHA, and `needs-changes`.
71. Add reachability tests for empty, duplicate, reachable, unreachable, missing object, invalid SHA, and command error.
72. Add a combined fixture and assert every finding appears in deterministic order.
73. Assert warning-only overall success/exit 0.
74. Assert policy error exit 1.
75. Assert board/fetch/repository setup failure exit 2.
76. Assert JSON remains parseable and stdout contains no workflow commands.
77. Assert stderr annotations use warning/error severity correctly.
78. Run the expanded gate on a real disposable PR after CORE-024 is implemented.

### 12. Documentation and metadata

79. Align FRD-009 and ADR-0011 wording with the exact checks/severities where the compiled-workflow docs do not already cover it.
80. After DOC-011 lands ADR-0016/FRD deltas, link the actual governing paths to CORE-025 and set `docs_todo: false`; do not guess filenames before they exist.
81. Document the warning compatibility period and explicitly defer promotion.
82. Confirm no MCP tool-reference or plugin bundle update is required because this is CLI/core/GHA behavior, not an MCP tool-surface change.

## Expected files

Modify the canonical phase-1 files:

- `packages/core/src/merge-gate.ts`
- its existing core test file
- `packages/core/src/index.ts`
- `packages/mcp-server/src/check-pr.mjs`
- its existing CLI test file/helper where present
- `.github/workflows/pr.yml`
- package manifests/lockfile only if runtime dependency ownership or scripts change
- the applicable FRD/ADR files

Add only a focused test/helper file when phase 1 has no canonical location.

## Acceptance checks

- Exact two checks fail and exact three checks warn.
- Ticket must be in review.
- Only derived, live, non-final, non-archived blockers prevent merge.
- All live/dangling blocker ids are reported.
- Review frontmatter is parsed structurally and full SHAs are compared.
- Missing/invalid/stale review evidence is visible without crashing.
- Every recorded commit is checked as an ancestor of PR head.
- Unreachable and indeterminate commits are distinguished.
- Warning-only verdict exits 0; failure exits 1; inability to evaluate exits 2.
- JSON contains every applicable check in stable order.
- stdout is JSON-only; annotations are stderr-only.
- `kanmer-gate` remains the sole stable Actions check name.
- Core remains pure/read-only and no production board is mutated.

## Verification commands

Use the repository's canonical script names after CORE-024/CORE-031 land, including at minimum:

```bash
npm test
npm run typecheck
npm run build
npm run verify
```

Then exercise the CLI against disposable board/PR fixtures for warning-only, failure, and infrastructure-error cases. Record the exact commands and JSON/annotation excerpts in the post-implementation report.

## Failure and deviation rules

- Stop if CORE-024's evaluator/result contract differs materially; update this plan through Kanmer before inventing a second evaluator.
- Stop if MCP-024's record schema/path differs; consume the canonical schema rather than forking it.
- Do not use outgoing `blocks[]` or `computeBlockedIds` as `blockedBy`.
- Do not parse YAML or Git refs with ad-hoc regex/shell interpolation.
- Do not convert the three warnings to failures.
- Do not add stages, profiles, gated document types, a second job, or board mutations.
- Do not merge or start CORE-035.

## Stop condition

Stop when the existing `kanmer-gate` emits a complete deterministic phase-1+phase-2 verdict, fails exactly for wrong stage/live blockers, warns exactly for missing or stale review evidence and unreachable commits, proves correct dependency direction and Git ancestry through tests, preserves exits 0/1/2 and JSON/stdout boundaries, and is ready for independent review. Do not merge or begin CORE-035.
