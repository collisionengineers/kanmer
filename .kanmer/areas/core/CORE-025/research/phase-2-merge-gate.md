# Research — CORE-025 phase-2 merge gate

## Decision summary

Phase 2 extends the phase-1 evaluator rather than creating a second gate. The result remains one deterministic JSON verdict with one entry per check, while GitHub annotations and process exit code are projections of that verdict.

The enforcement split is intentional:

| Check | Initial severity | Reason |
|---|---:|---|
| `WRONG_STAGE` | fail | A PR is not merge-ready unless its ticket is in `review`. |
| `DEPENDENCY_BLOCKED` | fail | Merging around a live prerequisite invalidates the approved work order. |
| `NO_REVIEW_RECORD` | warn | Existing tickets need a compatibility period before attestations are universal. |
| `STALE_REVIEW` | warn | The record format must become routine before stale SHA enforcement can block all work. |
| `COMMITS_UNREACHABLE` | warn | Historical tickets may contain stale SHAs; phase 2 first makes the defect observable. |

No severity may be inferred from message wording. Store severity in the check definition/result so the CLI, tests, and future policy promotion use the same source.

## Ticket-stage rule

`WRONG_STAGE` compares the resolved ticket's status id with the board's semantic review stage. On this board that id is `review`; implementation should resolve it from the ordered board/stage model where practical rather than comparing a display label. Archived tickets do not become valid merely because their last status was review.

The check reports the actual stage and expected stage. It does not move the ticket, rewrite the board, or treat `verifying`/`done` as review-ready.

## Dependency direction

The relevant set is **items that block this ticket**, exposed as derived `blockedBy`. `blocks[]` on this ticket points in the opposite direction and must not be used. A blocker is live when the blocker item exists, is not archived, and is not in the final/done stage.

Dangling blocker references are data-integrity failures. The conservative result is a failing `DEPENDENCY_BLOCKED` entry naming the missing id, because silently ignoring a deleted or malformed prerequisite would weaken the merge boundary.

Evaluate all blockers and report all live ids in stable id order; do not stop at the first one.

## Review-attestation rule

The canonical record is `scratch/review.md`, written as a whole-file replacement. Parse YAML frontmatter with the repository's Markdown/frontmatter library. Do not use a regular expression for YAML.

Expected fields used here:

- `kind: review-attestation`
- `head_sha`
- `verdict`

`NO_REVIEW_RECORD` applies when the file is absent. A present but unreadable record, wrong `kind`, missing/invalid `head_sha`, or unusable frontmatter is not equivalent to absence: emit a stale/invalid review warning with a specific diagnostic so operators can repair the record.

`STALE_REVIEW` compares the normalized full PR head SHA with the record's full `head_sha`. Do not accept prefix matches. A `needs-changes` verdict must also remain non-passing in the verdict details; phase 2 should not claim the review is current and acceptable merely because the SHA matches.

## Commit-reachability rule

The pure evaluator cannot run Git. The CLI supplies reachability evidence for each unique ticket commit SHA after fetching the required refs. Keep Git subprocess behavior at the CLI boundary and pass a typed map/result into core.

The safety question is whether each recorded commit is an ancestor of the PR head (and therefore included in the proposed change), not merely whether the object exists somewhere in the repository. Use `git merge-base --is-ancestor <sha> <pr-head-sha>` after fetching the PR head and sufficient history. Distinguish:

- reachable: exit 0;
- not reachable: exit 1;
- indeterminate/tool error: other exit or missing object.

Both unreachable and indeterminate entries produce a warning in phase 2, but the result must retain the distinction. Empty `commits[]` is not fabricated as success: report a neutral/skipped detail because there is no recorded SHA to test.

## Complete verdict contract

The phase-1 checks remain present. Phase 2 appends its checks in a stable order and evaluates all applicable checks, so one run gives a complete repair list. Recommended order:

1. ticket resolution / `NO_TICKET`;
2. open questions;
3. `WRONG_STAGE`;
4. `DEPENDENCY_BLOCKED`;
5. `NO_REVIEW_RECORD` or review-record validation;
6. `STALE_REVIEW`;
7. `COMMITS_UNREACHABLE`.

A missing ticket prevents ticket-dependent checks; mark them `skipped` with a reason rather than emitting misleading secondary failures.

Exit semantics remain:

- `0`: evaluator ran and no failing check exists (warnings may exist);
- `1`: evaluator ran and one or more failing checks exist;
- `2`: gate could not be evaluated reliably, such as board fetch/read failure or Git setup failure that makes required inputs unavailable.

GitHub workflow commands go to stderr. JSON alone goes to stdout. Warning checks use `::warning::`; failing checks use `::error::`.

## Compatibility and promotion

Do not promote warning checks in this ticket. Future promotion should change policy data and tests, not fork evaluator logic. Preserve all machine-readable ids and result fields so branch protection sees one stable `kanmer-gate` check while policy evolves internally.

## Test strategy

Use disposable repositories/boards and table-driven evaluator fixtures. Include:

- exact review stage and every wrong stage;
- one done blocker, one archived blocker, multiple live blockers, and dangling blocker id;
- absent, malformed, wrong-kind, matching-SHA, stale-SHA, and `needs-changes` attestations;
- reachable, unreachable, missing-object, duplicate, and empty ticket commit lists;
- a combined fixture proving all findings are returned;
- stdout/stderr/exit-code assertions for warning-only, fail, and infrastructure-error runs.

## Non-goals

- No gate-profile redesign.
- No new ticket stage.
- No automatic board mutations.
- No review attestation writer; MCP-024 and the review skill own that.
- No warning-to-failure promotion in phase 2.
- No direct GitHub API logic in core.
