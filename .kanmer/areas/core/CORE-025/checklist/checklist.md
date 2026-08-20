# Checklist — CORE-025

## Preparation

- [ ] Read CORE-024 implementation, tests, post-implementation report, and proof.
- [ ] Confirm the canonical phase-1 evaluator/result/CLI files named in `files.md`.
- [ ] Read MCP-024 record schema and SKILL-021 review behavior.
- [ ] Confirm DOC-011's actual ADR/FRD paths before changing ticket refs.
- [ ] Confirm the existing GitHub check/job name is exactly `kanmer-gate`.

## Result contract

- [ ] Preserve every phase-1 check id and result field.
- [ ] Add exact ids `WRONG_STAGE`, `DEPENDENCY_BLOCKED`, `NO_REVIEW_RECORD`, `STALE_REVIEW`, and `COMMITS_UNREACHABLE`.
- [ ] Store severity explicitly.
- [ ] Store outcome explicitly.
- [ ] Add structured repair details without embedding policy in prose.
- [ ] Fix deterministic check ordering.
- [ ] Mark ticket-dependent checks skipped when ticket resolution fails.

## Stage check

- [ ] Resolve semantic review-stage id from board configuration/model.
- [ ] Pass only exact review status.
- [ ] Fail archived tickets.
- [ ] Fail backlog/preparing/implementing/verifying/done/off-board statuses.
- [ ] Report expected and actual values.

## Dependency check

- [ ] Read derived `blockedBy` for the target ticket.
- [ ] Do not use target `blocks[]` as prerequisites.
- [ ] Do not use `computeBlockedIds` in the opposite direction.
- [ ] Resolve every blocker read-only.
- [ ] Filter archived blockers.
- [ ] Filter final-stage blockers.
- [ ] Treat dangling blockers as failing integrity findings.
- [ ] Sort and report all live/dangling ids.
- [ ] Add reversed-edge regression test.

## Review evidence

- [ ] Read canonical `scratch/review.md` through document/store APIs.
- [ ] Represent absent separately from invalid.
- [ ] Parse frontmatter with `gray-matter`/canonical parser.
- [ ] Validate `kind: review-attestation`.
- [ ] Validate full `head_sha`.
- [ ] Preserve review verdict/details.
- [ ] Warn `NO_REVIEW_RECORD` only for absence.
- [ ] Surface malformed/wrong-kind/missing-SHA records actionably.
- [ ] Compare lowercase full SHAs, never prefixes.
- [ ] Warn `STALE_REVIEW` on mismatch.
- [ ] Ensure `needs-changes` is never described as approval.

## Commit reachability

- [ ] Normalize and deduplicate ticket commit SHAs.
- [ ] Validate arguments before invoking Git.
- [ ] Fetch/use exact PR head, not a merge pseudo-ref.
- [ ] Invoke Git with argument arrays, not shell interpolation.
- [ ] Use `merge-base --is-ancestor` semantics.
- [ ] Map exit 0 reachable.
- [ ] Map exit 1 unreachable.
- [ ] Map missing object/other exit indeterminate with diagnostic.
- [ ] Keep core free of subprocesses.
- [ ] Treat inability to establish repository/PR inputs as exit 2.
- [ ] Return neutral/skipped detail for empty commits.
- [ ] Warn with separate unreachable and indeterminate arrays.

## Aggregation and CLI

- [ ] Evaluate every applicable check.
- [ ] Keep phase-1 checks before phase-2 checks.
- [ ] Warning-only verdict remains overall pass.
- [ ] Any error finding makes overall failure.
- [ ] Write exactly one JSON object to stdout.
- [ ] Write warning/error workflow annotations only to stderr.
- [ ] Escape annotation control characters.
- [ ] Preserve exits 0, 1, and 2 exactly.

## GitHub Actions

- [ ] Extend existing `kanmer-gate` job only.
- [ ] Retain read-only permissions.
- [ ] Retain separate fetched board worktree.
- [ ] Fetch PR head/base and sufficient history.
- [ ] Pass exact event head SHA to CLI.
- [ ] Confirm board direct pushes do not trigger workflow.
- [ ] Confirm warnings annotate but keep job green.
- [ ] Confirm errors make job red.

## Tests

- [ ] Test all workflow stages.
- [ ] Test no/done/archived/live/multiple/dangling blockers.
- [ ] Test dependency-direction regression.
- [ ] Test absent review record.
- [ ] Test malformed YAML.
- [ ] Test wrong kind.
- [ ] Test missing/invalid SHA.
- [ ] Test matching and stale full SHA.
- [ ] Test prefix-only mismatch.
- [ ] Test `needs-changes` behavior.
- [ ] Test empty and duplicate commit lists.
- [ ] Test reachable commit.
- [ ] Test unreachable commit.
- [ ] Test unknown-object/indeterminate commit.
- [ ] Test combined findings and stable order.
- [ ] Test warning-only exit 0.
- [ ] Test policy-failure exit 1.
- [ ] Test infrastructure-failure exit 2.
- [ ] Test stdout JSON-only and stderr annotations.

## Documentation and validation

- [ ] Update/link the actual governing ADR/FRD deltas after DOC-011 exists.
- [ ] Clear `docs_todo` only after valid refs are linked.
- [ ] Document warning compatibility period without setting a promotion date.
- [ ] Confirm no MCP tool-reference row/count change.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `npm run verify`.
- [ ] Run real disposable warning-only and failure scenarios.
- [ ] Record commands/results in post-implementation report.
- [ ] Run `git diff --check`.
- [ ] Confirm no real board files were changed by test fixtures.
- [ ] Stop before merge or CORE-035.
