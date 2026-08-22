# Checklist — CORE-025

## Preparation

- [x] Read CORE-024 implementation, tests, post-implementation report, and proof.
- [x] Confirm the canonical phase-1 evaluator/result/CLI files named in `files.md`.
- [x] Read MCP-024 record schema and SKILL-021 review behavior.
- [x] Confirm DOC-011's actual ADR/FRD paths before changing ticket refs.
- [x] Confirm the existing GitHub check/job name is exactly `kanmer-gate`.

## Result contract

- [x] Preserve every phase-1 check id and result field.
- [x] Add exact ids `WRONG_STAGE`, `DEPENDENCY_BLOCKED`, `NO_REVIEW_RECORD`, `STALE_REVIEW`, and `COMMITS_UNREACHABLE`.
- [x] Store severity explicitly.
- [x] Store outcome explicitly.
- [x] Add structured repair details without embedding policy in prose.
- [x] Fix deterministic check ordering.
- [x] Mark ticket-dependent checks skipped when ticket resolution fails.

## Stage check

- [x] Resolve semantic review-stage id from board configuration/model.
- [x] Pass only exact review status.
- [x] Fail archived tickets.
- [x] Fail backlog/preparing/implementing/verifying/done/off-board statuses.
- [x] Report expected and actual values.

## Dependency check

- [x] Read derived `blockedBy` for the target ticket.
- [x] Do not use target `blocks[]` as prerequisites.
- [x] Do not use `computeBlockedIds` in the opposite direction.
- [x] Resolve every blocker read-only.
- [x] Filter archived blockers.
- [x] Filter final-stage blockers.
- [x] Treat dangling blockers as failing integrity findings.
- [x] Sort and report all live/dangling ids.
- [x] Add reversed-edge regression test.

## Review evidence

- [x] Read canonical `scratch/review.md` through document/store APIs.
- [x] Represent absent separately from invalid.
- [x] Parse frontmatter with `gray-matter`/canonical parser.
- [x] Validate `kind: review-attestation`.
- [x] Validate full `head_sha`.
- [x] Preserve review verdict/details.
- [x] Warn `NO_REVIEW_RECORD` only for absence.
- [x] Surface malformed/wrong-kind/missing-SHA records actionably.
- [x] Compare lowercase full SHAs, never prefixes.
- [x] Warn `STALE_REVIEW` on mismatch.
- [x] Ensure `needs-changes` is never described as approval.

## Commit reachability

- [x] Normalize and deduplicate ticket commit SHAs.
- [x] Validate arguments before invoking Git.
- [x] Fetch/use exact PR head, not a merge pseudo-ref.
- [x] Invoke Git with argument arrays, not shell interpolation.
- [x] Use `merge-base --is-ancestor` semantics.
- [x] Map exit 0 reachable.
- [x] Map exit 1 unreachable.
- [x] Map missing object/other exit indeterminate with diagnostic.
- [x] Keep core free of subprocesses.
- [x] Treat inability to establish repository/PR inputs as exit 2.
- [x] Return neutral/skipped detail for empty commits.
- [x] Warn with separate unreachable and indeterminate arrays.

## Aggregation and CLI

- [x] Evaluate every applicable check.
- [x] Keep phase-1 checks before phase-2 checks.
- [x] Warning-only verdict remains overall pass.
- [x] Any error finding makes overall failure.
- [x] Write exactly one JSON object to stdout.
- [x] Write warning/error workflow annotations only to stderr.
- [x] Escape annotation control characters.
- [x] Preserve exits 0, 1, and 2 exactly.

## GitHub Actions

- [x] Extend existing `kanmer-gate` job only.
- [x] Retain read-only permissions.
- [x] Retain separate fetched board worktree.
- [x] Fetch PR head/base and sufficient history.
- [x] Pass exact event head SHA to CLI.
- [ ] Confirm board direct pushes do not trigger workflow.
- [x] Confirm warnings annotate but keep job green.
- [x] Confirm errors make job red.

## Tests

- [x] Test all workflow stages.
- [x] Test no/done/archived/live/multiple/dangling blockers.
- [x] Test dependency-direction regression.
- [x] Test absent review record.
- [x] Test malformed YAML.
- [x] Test wrong kind.
- [x] Test missing/invalid SHA.
- [x] Test matching and stale full SHA.
- [x] Test prefix-only mismatch.
- [x] Test `needs-changes` behavior.
- [x] Test empty and duplicate commit lists.
- [x] Test reachable commit.
- [x] Test unreachable commit.
- [x] Test unknown-object/indeterminate commit.
- [x] Test combined findings and stable order.
- [x] Test warning-only exit 0.
- [x] Test policy-failure exit 1.
- [x] Test infrastructure-failure exit 2.
- [x] Test stdout JSON-only and stderr annotations.

## Documentation and validation

- [x] Update/link the actual governing ADR/FRD deltas after DOC-011 exists.
- [x] Clear `docs_todo` only after valid refs are linked.
- [x] Document warning compatibility period without setting a promotion date.
- [x] Confirm no MCP tool-reference row/count change.
- [x] Run `npm test`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run build`.
- [x] Run `npm run verify`.
- [x] Run real disposable warning-only and failure scenarios.
- [x] Record commands/results in post-implementation report.
- [x] Run `git diff --check`.
- [x] Confirm no real board files were changed by test fixtures.
- [x] Stop before merge or CORE-035.

## Review remediation — PR #159 follow-up — 2026-08-22

- [x] Validate complete `scratch/review.md` attestation schema, including verdict, reviewer, independence, plan/ticket metadata, and finding dispositions.
- [x] Resolve abbreviated hexadecimal ticket commit ids and constrain reachability to the PR `base..head` ancestry range.
- [x] Fail closed when board item parsing returns warnings before evaluating dependency evidence.
- [x] Populate `outcome` on legacy phase-1 findings and add regression coverage.
- [x] Preserve exact hosted baseline failure evidence; hosted rerun is required for the new head.
