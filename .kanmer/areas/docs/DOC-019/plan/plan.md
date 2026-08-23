# Plan

1. Read the canonical `kanmer-docs` generator and current board/doc configuration; reproduce the exact generated output in a disposable comparison.
2. Enumerate the stale mirror, README, and FRD statements from the audit and map each to current source, AGENTS guidance, or an approved FRD/ADR. Reject any change without a source-backed contradiction.
3. Regenerate `docs/contributing/doc-structure.md` through the supported path and update only the confirmed README/FRD prose.
4. Extend the existing documentation verification rail with a deterministic freshness assertion that compares generated output or a stable source-derived marker; keep it dependency-free.
5. Run the focused script/tests plus the repository documentation checks, inspect the diff for scope, and write the post-implementation report before Review.

## Risks and rollback

- A generator may intentionally preserve legacy compatibility text; compare against its current output before editing. If so, record the reason and narrow the ticket rather than deleting it.
- README release instructions must not invent credentials or bypass protected-main policy. Use the existing command names and handoff boundaries only.
- Rollback is a single revert of the documentation/check diff; no board data or release artifacts are changed.

## Review questions

- Is every changed sentence traceable to current source or an approved governing document?
- Is the generated mirror produced by the canonical path and protected against drift?
- Do instructions name the true current release flow without secrets or unsupported shortcuts?
