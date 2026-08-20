# Open questions — CORE-025

## Resolved decisions

- **Which dependency direction blocks a ticket?** Use the target ticket's derived `blockedBy`; never inspect its outgoing `blocks[]` as prerequisites.
- **Do completed or archived blockers prevent merge?** No. Filter final-stage and archived items. A dangling blocker id fails conservatively and is reported explicitly.
- **Which stage is merge-ready?** Exactly the semantic `review` stage. `implementing`, `verifying`, and `done` do not pass this PR merge gate.
- **How is review YAML read?** With `gray-matter` (or the repository's canonical frontmatter parser), never a regex.
- **Is a SHA prefix sufficient?** No. Normalize and compare full PR-head and recorded SHA values.
- **What does a matching `needs-changes` attestation mean?** It remains an adverse review result. A matching SHA does not turn it into approval.
- **What does commit reachability mean?** Every recorded ticket commit must be an ancestor of the PR head. Object existence alone is insufficient.
- **Where does Git execute?** In the CLI boundary. Core receives typed reachability evidence and remains pure.
- **What happens when a commit object cannot be inspected?** Record an indeterminate reachability warning; infrastructure failure that prevents the gate obtaining required PR/repository inputs exits 2.
- **Are warning checks promoted now?** No. `NO_REVIEW_RECORD`, `STALE_REVIEW`, and `COMMITS_UNREACHABLE` remain warnings for this ticket.
- **Does phase 2 create another Actions job?** No. Extend stable job/check `kanmer-gate`.
- **Does the evaluator stop after the first failure?** No. Return every applicable check in deterministic order.
- **How are skipped checks represented when no ticket resolves?** As explicit `skipped` entries with a reason, not secondary false failures.
- **Can the gate repair state?** No. It is strictly read-only.

## Parked for later policy work

- `[parked]` Date/release for promoting the three warning checks to failures. Promotion requires operational evidence that SHA-bound records and commit recording are routine.
- `[parked]` Whether a future policy should require at least one ticket commit. Phase 2 only evaluates recorded entries.

No unresolved implementation questions remain.
